// BioMol — visualizador 3D: carregar, identificar, representar, isolar, medir e exportar.
// Uso: node scripts/e2e-biomol-visor.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Rode a partir da pasta da instância de teste. Conta fictícia; não imprime credenciais.
// As medidas esperadas foram calculadas à parte, com numpy, nas coordenadas da 1CRN.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { contextoAutenticado } from "./_sessao.mjs";

const [base, credFile, shots] = process.argv.slice(2);
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await contextoAutenticado(browser, base, credFile, { contexto: { viewport: { width: 1440, height: 1000 }, acceptDownloads: true } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("console", (m) => m.type() === "error" && erros.push(m.text()));
p.on("pageerror", (e) => erros.push(String(e)));

const pronto = async () => {
  await p.locator('[data-testid="visor-molecular"][data-estado="pronto"]').waitFor({ timeout: 90000 });
  await p.waitForTimeout(800);
};
const residuo = async (n) => {
  await p.locator('[data-painel="cadeias"]').click();
  await p.locator(`[data-residuo="${n}"]`).first().click();
  await p.getByTestId("selecao").waitFor();
};
const usarAtomo = async (n) => p.locator(`[data-testid="atomos-residuo"] [data-atomo="${n}"]`).click();
const ultimaMedida = async () => Number(await p.locator("[data-valor-medida]").last().getAttribute("data-valor-medida"));

try {
  // 1. abre com o DNA, já com o visualizador novo
  await p.goto(`${base}/moleculas`);
  await pronto();
  ok((await p.getByTestId("visor").getAttribute("data-pdb")) === "1BNA", "abre com a 1BNA");
  ok(/estrutura experimental/.test(await p.getByTestId("visor").innerText()), "selo diz que é estrutura experimental");
  await p.locator('[data-painel="cadeias"]').click();
  const cad = await p.locator("[data-cadeia]").allInnerTexts();
  ok(cad.length === 2 && cad.every((c) => /DNA · 12/.test(c)), `duas fitas de DNA de 12 (${cad.join(" | ")})`);
  await p.locator('[data-residuo="5"]').first().click();
  const sel = await p.getByTestId("selecao").innerText();
  ok(/DA 5/.test(sel) && /cadeia A/.test(sel) && /desoxiadenosina/.test(sel), `selecionar pela sequência: ${sel.split("\n")[0]}`);
  await p.waitForTimeout(1200); // a câmera leva ~0,6 s até o nucleotídeo
  ok(await p.locator("svg text", { hasText: "DA 5 · A" }).isVisible(), "rótulo preso ao nucleotídeo no 3D");
  await p.screenshot({ path: `${shots}/visor-1-dna.png` });

  // 2. passar o mouse e clicar no 3D identifica o que está embaixo do cursor
  const caixa = await p.locator('[data-testid="visor-molecular"] canvas').boundingBox();
  let alvo = null;
  for (const [fx, fy] of [[0.45, 0.5], [0.55, 0.5], [0.5, 0.42], [0.5, 0.58], [0.4, 0.45], [0.6, 0.55]]) {
    await p.mouse.move(caixa.x + caixa.width * fx, caixa.y + caixa.height * fy);
    await p.waitForTimeout(500);
    const t = await p.getByTestId("passando").innerText().catch(() => "");
    if (/cadeia [AB]/.test(t)) {
      alvo = { fx, fy, t: t.trim() };
      break;
    }
  }
  ok(Boolean(alvo), `passar o mouse mostra o que está embaixo (${alvo?.t})`);
  if (alvo) {
    await p.mouse.click(caixa.x + caixa.width * alvo.fx, caixa.y + caixa.height * alvo.fy);
    await p.waitForTimeout(600);
    const titulo = (await p.getByTestId("selecao").innerText()).split("\n")[0].trim();
    ok(titulo === alvo.t, `clicar seleciona o mesmo resíduo (${titulo})`);
  }

  // 3. representações e cores
  for (const r of ["bastoes", "bola-bastao", "superficie", "esferas", "cartoon"]) {
    await p.locator(`[data-testid="representacao"] [data-valor="${r}"]`).click();
    await p.waitForTimeout(r === "superficie" ? 3000 : 900);
    if (r === "superficie") await p.screenshot({ path: `${shots}/visor-2-superficie.png` });
  }
  ok((await p.locator('[data-testid="representacao"] [aria-checked="true"]').getAttribute("data-valor")) === "cartoon", "troca de representação funciona e volta ao cartoon");
  await p.getByTestId("aparencia").locator("summary").click();
  await p.locator('[data-cor="residuo"]').click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${shots}/visor-3-por-base.png` });

  // 4. proteína: 1CRN, medidas com resposta conhecida
  await p.goto(`${base}/moleculas?pdb=1CRN&cadeia=A`);
  await pronto();
  ok((await p.getByTestId("visor").getAttribute("data-pdb")) === "1CRN", "abre a estrutura pedida no endereço");
  await residuo("3");
  ok(/Cys 3/.test(await p.getByTestId("selecao").innerText()), "Cys 3 selecionada");
  await usarAtomo("SG");
  await residuo("40");
  await usarAtomo("SG");
  await p.locator('[data-painel="medidas"]').click();
  await p.getByTestId("medir-distancia").click();
  const d = await ultimaMedida();
  ok(Math.abs(d - 2.004) < 0.001, `ponte dissulfeto SG3–SG40 = ${d} Å (numpy: 2,004)`);

  await residuo("10");
  for (const a of ["N", "CA", "C"]) await usarAtomo(a);
  await p.locator('[data-painel="medidas"]').click();
  await p.getByTestId("medir-angulo").click();
  const ang = await ultimaMedida();
  ok(Math.abs(ang - 111.248) < 0.001, `ângulo N–CA–C do resíduo 10 = ${ang}° (numpy: 111,248)`);

  await residuo("9");
  await usarAtomo("C");
  await residuo("10");
  for (const a of ["N", "CA", "C"]) await usarAtomo(a);
  await p.locator('[data-painel="medidas"]').click();
  await p.getByTestId("medir-diedro").click();
  const phi = await ultimaMedida();
  ok(Math.abs(phi - -63.193) < 0.001, `φ do resíduo 10 = ${phi}° (numpy: −63,193)`);
  await p.screenshot({ path: `${shots}/visor-4-medidas.png` });

  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByTestId("medidas-csv").click()]);
  const csv = readFileSync(await dl.path(), "utf8");
  ok(csv.split("\r\n").filter(Boolean).length === 4 && /distância,2\.004/.test(csv), "CSV das medidas com as 3 medidas");

  // 5. isolar um trecho e voltar
  await p.locator('[data-painel="cadeias"]').click();
  await p.getByTestId("regiao-de").fill("7");
  await p.getByTestId("regiao-ate").fill("19");
  await p.getByTestId("isolar-regiao").click();
  await p.getByTestId("mostrar-tudo").waitFor();
  ok(/7–19/.test(await p.getByTestId("mostrar-tudo").innerText()), "isola o trecho 7–19 (hélice)");
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${shots}/visor-5-isolado.png` });
  await p.getByTestId("mostrar-tudo").click();

  // 6. imagem
  const [img] = await Promise.all([p.waitForEvent("download"), p.getByTestId("capturar").click()]);
  const bytes = readFileSync(await img.path());
  ok(bytes.subarray(1, 4).toString() === "PNG" && bytes.length > 5000, `imagem PNG exportada (${img.suggestedFilename()}, ${bytes.length} bytes)`);

  // 7. arquivo do computador (não é enviado)
  let enviados = 0;
  p.on("request", (r) => r.method() !== "GET" && enviados++);
  await p.goto(`${base}/moleculas`);
  await pronto();
  const arquivo = new URL("../tests/fixtures/pdb/1CRN.pdb", import.meta.url).pathname;
  await p.locator('input[type="file"]').setInputFiles(arquivo);
  await pronto();
  ok((await p.getByTestId("visor").getAttribute("data-arquivo")) === "1CRN.pdb", "abre um .pdb do computador");
  ok(/arquivo do seu computador/.test(await p.getByTestId("visor").innerText()), "e diz que é arquivo local");
  ok(enviados === 0, "nada foi enviado ao servidor");

  const csp = await p.evaluate(() => window.__csp);
  ok(csp.length === 0, `sem violação de CSP ${csp.join(" | ")}`);
  const relevantes = erros.filter((e) => !/status of 404/.test(e));
  ok(relevantes.length === 0, `sem erro no console ${relevantes.slice(0, 3).join(" | ")}`);
} catch (e) {
  ok(false, `exceção: ${e.message}`);
  await p.screenshot({ path: `${shots}/visor-erro.png` }).catch(() => {});
} finally {
  await browser.close();
}
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\nTudo certo.");
process.exit(falhas.length ? 1 : 0);
