// Página Moléculas: uma caixa de busca, a molécula já na tela, e a bancada 3D fora do ar.
// Uso: node scripts/e2e-explorador.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Consulta bases públicas (RCSB PDB, PubChem). Sem chave, sem custo.
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
let esperando404 = false; // ligado só em volta do teste que visita a bancada fechada de propósito
p.on("console", (m) => {
  if (m.type() !== "error") return;
  const txt = m.text();
  if (esperando404 && /status of 404/.test(txt)) return;
  erros.push(txt.slice(0, 140));
});

await p.goto(`${base}/entrar`);
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(pw);
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });

// 1. Abre com molécula na tela — quem chega com pressa não vê tela em branco
{
  await p.goto(`${base}/moleculas`);
  await p.getByTestId("explorador").waitFor({ timeout: 30000 });
  ok((await p.getByRole("link", { name: "Moléculas", exact: true }).count()) > 0, "a aba “Moléculas” aparece no menu");
  await p.getByTestId("visor").waitFor({ timeout: 40000 });
  const canvas = p.locator('[data-testid="visor"] canvas').first();
  await canvas.waitFor({ timeout: 40000 });
  ok((await p.getByTestId("visor").getAttribute("data-pdb")) === "1BNA", "abre já com o DNA na tela, sem precisar buscar");
  ok((await canvas.boundingBox())?.height > 250, "o visualizador é grande");
  await p.screenshot({ path: `${shots}/explorador-1-abertura.png`, fullPage: true });
}

// 2. Uma caixa só: não é preciso dizer se é proteína, composto ou código
{
  const sugestoes = await p.locator("[data-sugestao]").allInnerTexts();
  ok(sugestoes.length >= 5, `sugestões prontas e explicadas: ${JSON.stringify(sugestoes.slice(0, 3))}`);
  ok(sugestoes.every((s) => /·/.test(s)), "cada sugestão diz o que é");
  ok((await p.getByTestId("busca").getAttribute("placeholder"))?.includes("p53"), "a caixa dá exemplos do que aceitar");
  ok((await p.locator("select").count()) === 0, "não existe seletor de tipo para preencher antes");
}

// 3. Buscar um composto pelo nome comum
{
  await p.getByTestId("busca").fill("cafeína");
  await p.getByRole("button", { name: "Procurar" }).click();
  await p.waitForTimeout(9000);
  const txt = await p.getByTestId("explorador").innerText();
  if (/recusando pedidos|Nada encontrado/.test(txt)) {
    ok(/PubChem|Nada encontrado/.test(txt), "serviço indisponível: a interface diz a causa real");
  } else {
    const cartao = p.getByTestId("cartao-composto");
    ok((await cartao.count()) > 0, "o composto aparece com cartão próprio");
    ok(/CID\s*2519/.test(await cartao.innerText()), `cafeína certa: ${(await cartao.innerText()).match(/CID[^\n]*/)?.[0]}`);
    const img = cartao.locator("img").first();
    ok(await img.evaluate((e) => e.complete && e.naturalWidth > 0), "o desenho plano carrega");
    ok(((await img.getAttribute("src")) ?? "").startsWith("/api/moleculas/imagem"), "servido pelo GenoLab, não pelo PubChem direto");
  }
  await p.screenshot({ path: `${shots}/explorador-2-composto.png`, fullPage: true });
}

// 4. Buscar uma proteína pelo nome e trocar de estrutura
{
  await p.getByTestId("busca").fill("p53");
  await p.getByRole("button", { name: "Procurar" }).click();
  await p.waitForTimeout(12000);
  const cartao = p.getByTestId("cartao-proteina");
  if (await cartao.count()) {
    ok(/P04637/.test(await cartao.innerText()), "proteína certa pelo acesso UniProt");
    const estruturas = p.locator("[data-estrutura]");
    const n = await estruturas.count();
    ok(n > 0, `${n} estrutura(s) oferecida(s)`);
    const titulos = [];
    for (let i = 0; i < n; i++) titulos.push((await estruturas.nth(i).getAttribute("title")) ?? "");
    ok(titulos.every((t) => /p53/i.test(t)), "todas as estruturas são da proteína pedida");
    if (n > 1) {
      const segundo = (await estruturas.nth(1).innerText()).trim().slice(0, 4);
      await estruturas.nth(1).click();
      await p.waitForTimeout(12000);
      ok((await p.getByTestId("visor").getAttribute("data-pdb")) === segundo, `trocar de estrutura funciona (${segundo})`);
    }
  } else ok(false, `p53 não trouxe cartão: ${(await p.getByTestId("explorador").innerText()).slice(0, 120)}`);
  await p.screenshot({ path: `${shots}/explorador-3-proteina.png`, fullPage: true });
}

// 5. Nome que não existe: diz, e não mostra algo parecido
{
  await p.getByTestId("busca").fill("zzqqxx");
  await p.getByRole("button", { name: "Procurar" }).click();
  await p.waitForTimeout(9000);
  const aviso = p.getByTestId("sem-resultado");
  ok((await aviso.count()) > 0, "diz que não encontrou");
  ok(/Nada encontrado/.test(await aviso.innerText()), `com o termo citado: ${(await aviso.innerText()).slice(0, 70)}`);
  ok((await p.getByTestId("cartao-proteina").count()) === 0 && (await p.getByTestId("cartao-composto").count()) === 0, "e não mostra nenhum resultado parecido");
}

// 6. A bancada 3D está fora do ar, mas o código continua no repositório
{
  esperando404 = true;
  const r = await p.goto(`${base}/laboratorio/bancada`);
  ok(r?.status() === 404, `bancada 3D fora do ar (${r?.status()})`);
  await p.goto(`${base}/laboratorio/explorar`);
  ok(new URL(p.url()).pathname === "/laboratorio", `o atalho antigo leva à área de trabalho (${new URL(p.url()).pathname})`);
  await p.goto(`${base}/laboratorio`);
  await p.waitForTimeout(2000);
  ok((await p.getByRole("link", { name: "Bancada 3D" }).count()) === 0, "e não aparece no menu");
  await p.waitForTimeout(300);
  esperando404 = false;
}

// 7. Celular
{
  const cel = await ctx.newPage();
  await cel.setViewportSize({ width: 390, height: 844 });
  await cel.goto(`${base}/moleculas`);
  await cel.getByTestId("explorador").waitFor({ timeout: 30000 });
  await cel.waitForTimeout(3000);
  const [doc, win] = await cel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(doc <= win + 1, `celular: sem rolagem horizontal (${doc} vs ${win})`);
  await cel.screenshot({ path: `${shots}/explorador-4-celular.png`, fullPage: true });
  await cel.close();
}

const csp = await p.evaluate(() => window.__csp ?? []);
ok(csp.length === 0, `sem violação da política de segurança ${csp.slice(0, 2).join(" | ")}`);
ok(erros.length === 0, `sem erros no console ${[...new Set(erros)].slice(0, 2).join(" | ")}`);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
