// Moléculas na área de trabalho: detecção, desambiguação, dado real e visualizador.
// Uso: node scripts/e2e-moleculas.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Consulta bases públicas (UniProt, RCSB PDB, PubChem). Sem chave, sem custo.
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 140)));

await p.goto(`${base}/entrar`);
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(pw);
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });

await p.goto(`${base}/laboratorio`);
await p.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
await p
  .getByLabel("Descreva sua ideia ou procedimento")
  .fill("Pesei 5 g de tiossulfato de sódio e dissolvi em 100 mL do extrato. Amplifiquei o gene TP53 por PCR e detectei a proteína p53 por western blot.");
await p.getByRole("button", { name: "Criar visualização" }).click();
await p.waitForTimeout(9000);

const painel = p.getByTestId("moleculas-citadas");
ok((await painel.count()) > 0, "o painel de moléculas aparece junto da cena");
const citadas = (await p.locator("[data-molecula]").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
ok(citadas.some((t) => /tiossulfato/.test(t)) && citadas.some((t) => /TP53/.test(t)), `reconhece reagente e gene: ${JSON.stringify(citadas)}`);
ok(!citadas.some((t) => /\b(PCR|DNA|mL)\b.*(gene|proteína)/.test(t)), "não transforma sigla de técnica em molécula");
await p.screenshot({ path: `${shots}/moleculas-1-painel.png` });

// 1. Composto: dado real do PubChem, com desenho servido pelo GenoLab
{
  await p.locator('[data-molecula*="tiossulfato"]').first().click();
  await p.waitForTimeout(7000);
  const txt = await painel.innerText();
  if (/recusando pedidos/.test(txt)) {
    ok(true, "PubChem ocupado: a interface diz a causa real em vez de “não encontrado”");
  } else {
    ok(/CID\s*24477/.test(txt), `composto certo: ${(txt.match(/CID[^\n]*/) ?? ["(nada)"])[0]}`);
    const img = p.locator('[data-testid="moleculas-citadas"] img').first();
    ok((await img.count()) > 0, "o desenho 2D aparece");
    const src = (await img.getAttribute("src")) ?? "";
    ok(src.startsWith("/api/moleculas/imagem"), `desenho servido pelo GenoLab (${src})`);
    ok(await img.evaluate((e) => e.complete && e.naturalWidth > 0), "a imagem carrega de verdade");
  }
}

// 2. Gene: resolve na proteína e avisa a diferença
let pdbEscolhido = null;
{
  await p.locator('[data-molecula="TP53"]').first().click();
  await p.waitForTimeout(9000);
  const txt = await painel.innerText();
  ok(/P04637/.test(txt), `gene resolvido na proteína certa: ${(txt.match(/UniProt[^\n]*/) ?? ["(nada)"])[0]}`);
  ok(/o que existe no banco de estruturas é a/i.test(txt), "avisa que a estrutura é da proteína, não do gene");

  const botoesPdb = p.locator('[data-testid="moleculas-citadas"] button').filter({ hasText: /^[0-9][A-Z0-9]{3}/ });
  const n = await botoesPdb.count();
  ok(n > 0, `${n} estrutura(s) oferecida(s)`);
  // TODAS precisam ser da proteína pedida: busca por texto traria mucina e CagA ao procurar "p53"
  const titulos = [];
  for (let i = 0; i < n; i++) titulos.push((await botoesPdb.nth(i).getAttribute("title")) ?? "");
  ok(
    titulos.every((t) => /p53/i.test(t)),
    `todas as estruturas são da proteína pedida: ${titulos.map((t) => t.slice(0, 32)).join(" | ") || "(nenhuma)"}`,
  );
  if (n > 0) {
    pdbEscolhido = (await botoesPdb.first().innerText()).trim().slice(0, 4);
    await botoesPdb.first().click();
    await p.waitForTimeout(14000);
  }
  await p.screenshot({ path: `${shots}/moleculas-2-gene.png` });
}

// 3. Visualizador dentro da área de trabalho, sem escapar do seu quadro
if (pdbEscolhido) {
  const visor = p.getByTestId("visor-molecula");
  ok((await visor.count()) > 0, `visualizador aberto para ${pdbEscolhido}`);
  const canvas = p.locator('[data-testid="visor-molecula"] canvas').first();
  ok((await canvas.count()) > 0, "Mol* desenhou a estrutura");
  const caixa = await canvas.boundingBox();
  const vp = p.viewportSize();
  ok(caixa !== null && caixa.height <= 320, `o visualizador fica no seu quadro (altura ${Math.round(caixa?.height ?? 0)}px, não a tela toda)`);
  ok(caixa !== null && caixa.width < vp.width, `não ocupa a largura inteira da página (${Math.round(caixa?.width ?? 0)} de ${vp.width}px)`);
  await p.screenshot({ path: `${shots}/moleculas-3-estrutura.png` });
}

// 4. Nome ambíguo: pergunta antes de escolher
{
  await p.goto(`${base}/laboratorio`);
  await p.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
  await p.getByLabel("Descreva sua ideia ou procedimento").fill("Analisei BRCA1 na amostra e guardei o resultado.");
  await p.getByRole("button", { name: /visualização/ }).click();
  await p.waitForTimeout(8000);
  const b = p.locator('[data-molecula="BRCA1"]').first();
  if ((await b.count()) > 0) {
    await b.click();
    await p.waitForTimeout(1500);
    const txt = await p.getByTestId("moleculas-citadas").innerText();
    ok(/pode ser o gene ou a proteína/i.test(txt), "termo ambíguo pergunta antes de escolher");
    ok(/o gene BRCA1/.test(txt) && /a proteína de BRCA1/.test(txt), "oferece as duas opções explicitamente");
    await p.screenshot({ path: `${shots}/moleculas-4-ambiguo.png` });
  } else ok(false, "BRCA1 não foi reconhecido");
}

// 5. Estrutura inexistente não é trocada por outra
{
  const r = await p.evaluate(async () => {
    const res = await fetch("/api/moleculas/resolver?termo=9ZZZ&tipo=pdb");
    return { status: res.status, corpo: await res.text() };
  });
  ok(r.status === 200 && /não existe/i.test(r.corpo), `código inexistente é recusado sem substituir: ${r.corpo.slice(0, 90)}`);
}

// 6. Sem sessão, nada sai
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const sts = await ap.evaluate(async (b) => {
    const a = await fetch(`${b}/api/moleculas/resolver?termo=TP53&tipo=gene`);
    const c = await fetch(`${b}/api/moleculas/estrutura?pdb=1TUP`);
    return [a.status, c.status];
  }, base).catch(() => [0, 0]);
  ok(sts.every((s) => s === 401 || s === 403 || s === 0), `sem sessão as rotas não respondem (${sts.join(", ")})`);
  await anon.close();
}

const csp = await p.evaluate(() => window.__csp ?? []);
ok(csp.length === 0, `sem violação da política de segurança ${csp.slice(0, 2).join(" | ")}`);
ok(erros.length === 0, `sem erros no console ${[...new Set(erros)].slice(0, 2).join(" | ")}`);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
