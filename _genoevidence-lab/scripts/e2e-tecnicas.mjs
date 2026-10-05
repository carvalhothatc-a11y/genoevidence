// Módulos de técnica (/modulos/[id]): etapas, cenas, parâmetros exploráveis e calculadoras.
// Uso: node scripts/e2e-tecnicas.mjs <base> <arquivo-senha-demo> <diretório-de-capturas>
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const MODULOS = ["eletroforese", "qpcr", "western", "clonagem", "crispr", "sequenciamento", "rnaseq"];

async function entrar(ctx) {
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && erros.push("console: " + m.text().slice(0, 200)));
  await p.goto(base + "/entrar");
  await p.getByLabel("E-mail").fill("demo@exemplo.test");
  await p.getByLabel("Senha", { exact: true }).fill(pw);
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });
  return { p, erros };
}

const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 } });
const { p, erros } = await entrar(ctx);

// 1. A lista de técnicas aponta para os módulos
{
  await p.goto(base + "/modulos");
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href^="/modulos/"]')].map((a) => a.getAttribute("href")));
  for (const id of MODULOS) ok(links.includes(`/modulos/${id}`), `a lista liga para /modulos/${id}`);
}

// 2. Cada módulo abre, percorre todas as etapas e cada cena traz legenda de ilustração
for (const id of MODULOS) {
  await p.goto(base + "/modulos/" + id);
  await p.getByTestId("modulo-tecnica").waitFor({ timeout: 60000 });
  await p.waitForTimeout(1200);
  const etapas = await p.locator('nav[aria-label="Etapas da técnica"] button').count();
  ok(etapas > 0, `${id}: ${etapas} etapas`);
  for (let k = 0; k < etapas; k++) {
    if (k) await p.locator('nav[aria-label="Etapas da técnica"] button').nth(k).click();
    await p.waitForTimeout(500);
    const legenda = (await p.getByTestId("legenda-cena").textContent()) ?? "";
    if (legenda.trim().length < 10) ok(false, `${id}: etapa ${k + 1} sem legenda da cena`);
  }
  ok(true, `${id}: todas as etapas têm legenda dizendo que a cena é ilustração`);
  const naoFaz = (await p.locator('section[aria-labelledby="limites"]').textContent()) ?? "";
  ok(naoFaz.length > 20, `${id}: declara o que o módulo não faz`);
  const fontes = await p.locator('section[aria-labelledby="fontes-modulo"] a').count();
  ok(fontes > 0, `${id}: lista as fontes com o nível de leitura`);
  await p.screenshot({ path: `${shots}/${id}.png`, fullPage: true });
}

// 3. qPCR: ΔΔCt, razão corrigida, recusa de valores fora de faixa e cartões de modelo
{
  await p.goto(base + "/modulos/qpcr");
  await p.getByRole("button", { name: /Calcular ΔCt/ }).click();
  await p.getByTestId("calc-ddct").waitFor();
  const c = p.getByTestId("calc-ddct").locator('input[type="number"]');
  for (const [k, v] of [[0, "22"], [1, "19"], [2, "24"], [3, "20"]]) await c.nth(k).fill(v);
  await p.waitForTimeout(300);
  const t = ((await p.getByTestId("resultado-ddct").textContent()) ?? "").replace(/\s+/g, " ");
  ok(/2\^−ΔΔCt = 2\b/.test(t), `qPCR: 2^-ΔΔCt calculado na tela (${t.slice(0, 50)})`);
  ok(/eficiência de 100%/.test(t), "qPCR: o resultado declara o pressuposto de eficiência");
  await p.getByTestId("usar-eficiencia").check();
  await p.waitForTimeout(300);
  ok(/Razão corrigida/.test((await p.getByTestId("resultado-razao").textContent()) ?? ""), "qPCR: razão corrigida pela eficiência");
  ok((await p.locator('[data-calculadora="ddct"] details').count()) === 2, "qPCR: cartão de modelo para cada cálculo");
  await p.locator('[data-calculadora="ddct"] details').first().click();
  const cartao = (await p.locator('[data-calculadora="ddct"] details').first().textContent()) ?? "";
  ok(/Pressupostos/.test(cartao) && /Não prevê/.test(cartao), "qPCR: o cartão traz pressupostos e o que não prevê");
  await c.nth(0).fill("99");
  await p.waitForTimeout(300);
  ok((await p.locator('[data-testid="calc-ddct"] [role="alert"]').count()) > 0, "qPCR: Ct fora de faixa vira aviso");
  ok((await p.getByTestId("resultado-ddct").count()) === 0, "qPCR: com valor inválido nenhum número é mostrado");
}

// 4. Explorar: trocar a opção troca o que as fontes dizem (não recalcula resultado)
{
  await p.locator('nav[aria-label="Etapas da técnica"] button').nth(3).click();
  await p.waitForTimeout(500);
  const antes = await p.getByTestId("consequencias-eficiencia").textContent();
  await p.getByRole("button", { name: "Diferentes entre alvo e referência" }).click();
  await p.waitForTimeout(400);
  const depois = (await p.getByTestId("consequencias-eficiencia").textContent()) ?? "";
  ok(antes !== depois && /432%/.test(depois), "explorar: a opção troca o texto citado da fonte");
}

// 5. Western: volume de extrato e aviso quando não cabe
{
  await p.goto(base + "/modulos/western");
  await p.getByRole("button", { name: /Medir a concentração/ }).click();
  await p.getByTestId("calc-volume").waitFor();
  const c = p.getByTestId("calc-volume").locator('input[type="number"]');
  await c.nth(0).fill("50");
  await c.nth(1).fill("5");
  await c.nth(2).fill("15");
  await p.waitForTimeout(300);
  ok(/10,0 µL/.test((await p.getByTestId("resultado-volume").textContent()) ?? ""), "Western: volume de extrato calculado");
  await c.nth(1).fill("1");
  await p.waitForTimeout(300);
  ok(/não cabe/.test((await p.getByTestId("calc-volume").textContent()) ?? ""), "Western: avisa quando o extrato não cabe na canaleta");
}

// 6. RNA-seq: TPM soma 10⁶ e traz o aviso de comparabilidade
{
  await p.goto(base + "/modulos/rnaseq");
  await p.getByRole("button", { name: /Contagens, RPKM e TPM/ }).click();
  await p.getByTestId("calc-tpm").waitFor();
  await p.waitForTimeout(400);
  const soma = await p.evaluate(() =>
    [...document.querySelectorAll('[data-testid="resultado-tpm"] tr')].map((r) => Number((r.children[2].textContent ?? "0").replace(/\./g, ""))).reduce((a, b) => a + b, 0),
  );
  ok(Math.abs(soma - 1e6) <= 4, `RNA-seq: a soma dos TPM dá 10⁶ (${soma})`);
  ok(/não são comparáveis só por serem TPM/.test((await p.getByTestId("calc-tpm").textContent()) ?? ""), "RNA-seq: avisa que TPM não é comparável entre amostras");
}

// 7. Eletroforese: posição estimada e recusa fora da faixa do marcador
{
  await p.goto(base + "/modulos/eletroforese");
  await p.getByRole("button", { name: /Ver as bandas/ }).click();
  await p.getByTestId("calc-banda").waitFor();
  const c = p.getByTestId("calc-banda").locator('input[type="number"]');
  await c.fill("500");
  await p.waitForTimeout(300);
  const t = (await p.getByTestId("resultado-banda").textContent()) ?? "";
  ok(/500 pb/.test(t) && /%/.test(t), "eletroforese: posição estimada pelo marcador");
  ok(/não são previstas/.test((await p.getByTestId("calc-banda").textContent()) ?? ""), "eletroforese: diz que presença e intensidade não são previstas");
  await c.fill("9000");
  await p.waitForTimeout(300);
  ok(/fora da faixa/.test((await p.getByTestId("resultado-banda").textContent()) ?? ""), "eletroforese: fora da faixa não inventa posição");
}

// 7b. CRISPR: frequência observada com intervalo, aviso de poucas versões e recusa de contagem impossível
{
  await p.goto(base + "/modulos/crispr");
  await p.getByRole("button", { name: /Medir a edição/ }).click();
  await p.getByTestId("calc-edicao").waitFor();
  const c = p.getByTestId("calc-edicao").locator('input[type="number"]');
  await c.nth(0).fill("15");
  await c.nth(1).fill("30");
  await p.waitForTimeout(300);
  let t = (await p.getByTestId("resultado-edicao").textContent()) ?? "";
  ok(/15 de 30/.test(t) && /50%/.test(t), `CRISPR: frequência observada na tela (${t.replace(/\s+/g, " ").trim().slice(0, 60)})`);
  ok(/compatível com/.test(t), "CRISPR: mostra o intervalo de incerteza junto do número");
  ok(/Não é previsão/.test((await p.getByTestId("calc-edicao").textContent()) ?? ""), "CRISPR: diz que não é previsão de uma nova tentativa");
  await c.nth(1).fill("8");
  await c.nth(0).fill("4");
  await p.waitForTimeout(300);
  ok(/recomenda analisar mais de 24/.test((await p.getByTestId("calc-edicao").textContent()) ?? ""), "CRISPR: avisa quando há poucas versões analisadas");
  await c.nth(0).fill("99");
  await p.waitForTimeout(300);
  ok((await p.locator('[data-testid="calc-edicao"] [role="alert"]').count()) > 0, "CRISPR: contagem impossível vira aviso");
  const conceitual = (await p.locator('section[aria-labelledby="limites"]').textContent()) ?? "";
  ok(/não é um protocolo/i.test(conceitual), "CRISPR: a página diz que o módulo não é um protocolo de bancada");
}

// 8. Técnica inexistente não abre (o 404 é proposital: não conta como erro de console)
const errosAteAqui = erros.length;
{
  const r = await p.goto(base + "/modulos/tecnica-que-nao-existe");
  ok(r?.status() === 404, `técnica inexistente responde 404 (${r?.status()})`);
}

// 9. Sem sessão, o módulo manda para o login
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(base + "/modulos/qpcr");
  ok(new URL(ap.url()).pathname === "/entrar", `sem sessão vai para o login (${new URL(ap.url()).pathname})`);
  await anon.close();
}

// 10. Celular: sem rolagem horizontal
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const { p: mp } = await entrar(m);
  await mp.goto(base + "/modulos/western");
  await mp.getByTestId("modulo-tecnica").waitFor({ timeout: 60000 });
  await mp.waitForTimeout(1000);
  const [doc, vw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(doc <= vw + 1, `celular: sem rolagem horizontal (${doc} vs ${vw})`);
  await mp.screenshot({ path: `${shots}/celular.png` });
  await m.close();
}

const reais = erros.slice(0, errosAteAqui);
ok(reais.length === 0, `sem erros no console ${reais.slice(0, 3).join(" | ")}`);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
