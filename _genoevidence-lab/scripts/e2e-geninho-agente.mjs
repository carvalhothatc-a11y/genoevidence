// Geninho como agente: escolha de ferramentas, estados reais, moléculas certas e recusa honesta.
// Uso: node scripts/e2e-geninho-agente.mjs <base> <arquivo-senha-demo> [--web]
// Exige ANTHROPIC_API_KEY no servidor. Cada execução consome API (e, com --web, buscas cobradas).
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, credFile, ...flags] = process.argv.slice(2);
const comWeb = flags.includes("--web");
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch();
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();
await p.goto(base + "/entrar");
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(pw);
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });

/** Faz a pergunta e devolve o fluxo já separado em eventos e texto. */
async function perguntar(pergunta, web = false) {
  return p.evaluate(
    async ([q, usarWeb]) => {
      const res = await fetch("/api/geninho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }], ...(usarWeb ? { web: true } : {}) }),
      });
      if (!res.ok) return { erro: res.status, corpo: (await res.text()).slice(0, 200) };
      const rd = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      const eventos = [];
      let texto = "";
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!raw.trim()) continue;
          const ev = JSON.parse(raw);
          if (ev.t === "texto") texto += ev.v;
          else eventos.push(ev);
        }
      }
      return { eventos, texto };
    },
    [pergunta, web],
  );
}

const passos = (r) => r.eventos.filter((e) => e.t === "ferramenta");
const usou = (r, nome) => passos(r).some((e) => e.nome === nome);
const moleculas = (r) => r.eventos.filter((e) => e.t === "molecula").map((e) => e.payload);
const fontes = (r) => r.eventos.find((e) => e.t === "fontes")?.itens ?? [];

// 1. Gene citado: identifica a proteína antes da estrutura, e mostra só a estrutura escolhida
{
  const r = await perguntar("Quero ver a estrutura da proteína p53 humana ligada ao DNA. Qual código PDB e por quê?");
  if (r.erro) ok(false, `pergunta falhou (HTTP ${r.erro}: ${r.corpo})`);
  else {
    ok(usou(r, "identificar_proteina"), "identifica a proteína no UniProt antes de buscar estrutura");
    const prot = moleculas(r).find((m) => m.tipo === "proteina");
    ok(prot?.acesso === "P04637", `proteína certa: ${prot?.acesso} (${prot?.nome ?? "?"})`);
    ok(usou(r, "buscar_estrutura"), "busca a estrutura no RCSB PDB");
    const buscas = passos(r).filter((e) => e.nome === "buscar_estrutura" && e.estado === "ok");
    const porTexto = buscas.filter((e) => /candidata/.test(e.detalhe ?? ""));
    const estruturas = moleculas(r).filter((m) => m.tipo === "estrutura");
    ok(porTexto.length === 0 || estruturas.length < buscas.length, "busca por texto lista candidatas sem fixar cartão");
    ok(estruturas.every((e) => /p53|tumor suppressor/i.test(e.titulo)), `só estruturas de p53 viram cartão: ${estruturas.map((e) => e.pdbId).join(", ") || "(nenhuma)"}`);
    ok(fontes(r).length > 0, `fontes registradas: ${fontes(r).length}`);
  }
}

// 2. Composto: PubChem com identificador e fórmula reais
{
  const r = await perguntar("Mostre a estrutura do tiossulfato de sódio e diga a fórmula e a massa molar.");
  const c = moleculas(r).find((m) => m.tipo === "composto");
  ok(Boolean(c), "identifica o composto no PubChem");
  if (c) {
    ok(c.cid === 24477 || /Na2.*S2|S2.*Na2/.test(c.formula ?? ""), `composto certo: CID ${c.cid} · ${c.formula}`);
    ok(c.imagem2d === `/api/moleculas/imagem?cid=${c.cid}`, `o desenho 2D é servido pelo GenoLab (${c.imagem2d})`);
    const img = await p.evaluate(async (u) => { const r = await fetch(u); return { s: r.status, t: r.headers.get("content-type") }; }, c.imagem2d);
    ok(img.s === 200 && (img.t ?? "").startsWith("image/png"), `a imagem carrega de verdade (${img.s} ${img.t})`);
  }
}

// 3. Artigos: separa "encontrado" de "lido"
{
  const r = await perguntar("Quais artigos indexados tratam de optogenética com canalrodopsina? Liste 3.");
  ok(usou(r, "buscar_artigos"), "busca artigos no PubMed");
  const fs = fontes(r);
  ok(fs.length > 0 && fs.every((f) => f.leitura === "encontrada"), `artigos marcados como encontrados, não lidos (${fs.length})`);
  ok(/encontr|não li|sem ler/i.test(r.texto), "a resposta diz que apenas encontrou os artigos");
}

// 4. Nome ambíguo: pergunta em vez de escolher
{
  const r = await perguntar("Me mostre TP53.");
  ok(/gene|prote[íi]na/i.test(r.texto) && /\?/.test(r.texto), "pede esclarecimento entre gene e proteína");
  ok(moleculas(r).every((m) => m.tipo !== "estrutura"), "não abre estrutura antes de esclarecer");
}

// 5. Estrutura inexistente: recusa trocar por outra
{
  const r = await perguntar("Mostre a estrutura PDB 9ZZZ.");
  const vazio = passos(r).some((e) => e.nome === "buscar_estrutura" && e.estado === "vazio");
  ok(vazio, "a ferramenta devolve vazio para o código inexistente");
  ok(moleculas(r).length === 0, "nenhuma estrutura é mostrada no lugar");
  ok(/não (existe|encontr)|não há/i.test(r.texto), "a resposta diz que não encontrou");
}

// 6. Busca na web (opcional: consome buscas cobradas)
if (comWeb) {
  const r = await perguntar("Qual foi o Nobel de Medicina de 2026? Pesquise e cite a fonte oficial.", true);
  ok(usou(r, "web_search"), "usa a busca na internet quando autorizada");
  const buscas = passos(r).filter((e) => e.nome === "web_search" && e.estado !== "iniciou");
  ok(buscas.every((e) => /resultado|falhou|erro/.test(e.detalhe ?? "")), "cada busca informa o resultado real");
  ok(fontes(r).some((f) => f.origem === "Internet"), "registra as páginas como fonte");
  ok(passos(r).every((e) => e.nome !== "code_execution"), "o filtro interno da busca não vira passo na tela");
} else {
  console.log("· busca na web não exercitada (passe --web para incluir; consome buscas cobradas)");
}

// 7. Sem sessão não responde
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const st = await ap.evaluate(async (b) => (await fetch(b + "/api/geninho", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "oi" }] }) })).status, base).catch(() => 0);
  ok(st === 401 || st === 403 || st === 0, `sem sessão o Geninho não responde (${st})`);
  await anon.close();
}

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
