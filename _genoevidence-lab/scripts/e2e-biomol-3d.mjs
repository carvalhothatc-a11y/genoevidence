// BioMol — DNA e RNA, Processos e Comparar estruturas.
// Uso: node scripts/e2e-biomol-3d.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Rode a partir da pasta da instância de teste. Conta fictícia; não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { contextoAutenticado } from "./_sessao.mjs";

const [base, credFile, shots] = process.argv.slice(2);
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await contextoAutenticado(browser, base, credFile, { contexto: { viewport: { width: 1440, height: 1100 }, acceptDownloads: true } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("console", (m) => m.type() === "error" && erros.push(`${new URL(p.url()).pathname}: ${m.text()}`));
p.on("pageerror", (e) => erros.push(`${new URL(p.url()).pathname}: ${e}`));
const pronto = (id) => p.locator(`[data-testid="${id}"][data-estado="pronto"]`).waitFor({ timeout: 90000 });
const fimDaLinha = async () => {
  const max = await p.getByTestId("linha-do-tempo").getAttribute("max");
  await p.getByTestId("linha-do-tempo").fill(max);
  await p.waitForTimeout(700);
};

try {
  // ------------------------------------------------ DNA e RNA
  await p.goto(`${base}/moleculas/acidos-nucleicos`);
  await pronto("visor-acido");
  await p.getByTestId("analise-acido").waitFor();
  ok(/12 pares de Watson-Crick/.test(await p.getByTestId("total-pares").innerText()), "1BNA: 12 pares de Watson-Crick medidos");
  const anti = await p.getByTestId("antiparalelismo").innerText();
  ok(/Em 10 de 10 pares/.test(anti), `antiparalelismo medido: ${anti.split("\n")[1]?.slice(0, 80)}`);
  await p.getByTestId("visor-acido").scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500); // a câmera termina de enquadrar
  const marcas = await p.locator('[data-testid="visor-acido"] svg text').allTextContents();
  ok(["5' · fita A", "3' · fita A", "5' · fita B", "3' · fita B"].every((m) => marcas.includes(m)), `marcas 5'/3' presas às pontas das duas fitas (${marcas.join(" | ")})`);
  await p.screenshot({ path: `${shots}/3d-1-dna.png` });
  await p.locator('[data-testid="lista-pares"] button').first().click();
  await p.waitForTimeout(1200);
  ok((await p.locator('[data-testid="lista-pares"] [aria-pressed="true"]').count()) === 1, "escolher um par o destaca");
  await p.locator('[data-estrutura-acido="1EHZ"]').click();
  await pronto("visor-acido");
  await p.getByTestId("analise-acido").waitFor();
  const paresTrna = Number((await p.getByTestId("total-pares").innerText()).match(/\d+/)?.[0]);
  ok(paresTrna >= 15 && paresTrna <= 25, `tRNA: ${paresTrna} pares de Watson-Crick nas hastes`);
  await p.screenshot({ path: `${shots}/3d-2-trna.png` });

  ok(await p.getByTestId("sem-sequencia-esquema").isVisible(), "sem sequência: o esquema pede uma");
  await p.goto(`${base}/moleculas/sequencias`);
  await p.getByTestId("usar-exemplo").click();
  await p.locator('[data-aba="/moleculas/acidos-nucleicos"]').click();
  await p.getByTestId("esquema-3d").waitFor();
  await p.waitForTimeout(1500);
  ok(/Esquema, não estrutura medida/.test(await p.getByTestId("aviso-esquema").innerText()), "o esquema diz que não é estrutura medida");
  await p.locator('[data-testid="fita-texto"] [data-pos="4"]').click();
  const base4 = await p.getByTestId("base-escolhida").innerText();
  ok(/Posição 4/.test(base4) && /pareia com/.test(base4), `escolher a base pela fita em texto: ${base4.slice(0, 70)}`);
  await p.getByTestId("esquema-3d").scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${shots}/3d-3-esquema.png`, fullPage: false });

  // ------------------------------------------------ Processos
  await p.locator('[data-aba="/moleculas/processos"]').click();
  await p.getByTestId("palco-processo").waitFor({ timeout: 30000 });
  const agora0 = await p.getByTestId("agora-processo").innerText();
  for (let i = 0; i < 6; i++) await p.getByTestId("passo-seguinte").click();
  await p.waitForTimeout(800);
  const agora1 = await p.getByTestId("agora-processo").innerText();
  ok(agora0 !== agora1 && /polimerase/.test(agora1), `passo a passo atualiza a explicação: ${agora1.slice(0, 80)}`);
  ok(/\(\d+\/30\)/.test(await p.getByTestId("nova-lider").locator("..").innerText()), "a fita nova contínua mostra quanto já foi feito");
  await p.screenshot({ path: `${shots}/3d-4-replicacao.png` });
  await p.getByTestId("tocar").click();
  await p.waitForTimeout(2500);
  await p.getByTestId("tocar").click();
  ok((await p.getByTestId("agora-processo").innerText()) !== agora1, "tocar faz a animação andar");
  await fimDaLinha();
  ok(await p.getByTestId("resultado-replicacao").isVisible(), "replicação termina em duas cópias (semiconservativa)");

  await p.locator('[data-testid="processo"] [data-valor="transcricao"]').click();
  await p.getByTestId("processo-fita").waitFor();
  ok(true, "a transcrição pergunta qual fita foi colada");
  await p.locator('[data-testid="processo-fita"] [data-valor="codificante"]').click();
  await p.getByTestId("palco-processo").waitFor();
  for (let i = 0; i < 10; i++) await p.getByTestId("passo-seguinte").click();
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${shots}/3d-5-transcricao.png` });
  await fimDaLinha();
  ok(/confere/.test(await p.getByTestId("resultado-transcricao").innerText()), "o RNA da animação confere com o calculado");

  await p.locator('[data-testid="processo"] [data-valor="traducao"]').click();
  await p.getByTestId("palco-processo").waitFor();
  for (let i = 0; i < 5; i++) await p.getByTestId("passo-seguinte").click();
  await p.getByTestId("linha-do-tempo").fill("4.3");
  await p.waitForTimeout(1500);
  ok(/Alongamento|Translocação/.test(await p.getByTestId("agora-processo").innerText()), "no alongamento, a explicação fala do tRNA/translocação");
  await p.screenshot({ path: `${shots}/3d-6-traducao.png` });
  await fimDaLinha();
  ok((await p.getByTestId("peptideo").innerText()).trim() === "MTTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN", "a cadeia montada é Met + crambina");
  ok(/igual/.test(await p.getByTestId("resultado-traducao").innerText()), "igual à tradução calculada");

  // ------------------------------------------------ Comparar
  await p.locator('[data-aba="/moleculas/comparar"]').click();
  await pronto("visor-comparar");
  await p.getByTestId("superpor").click();
  await p.getByTestId("rmsd").waitFor();
  const rmsd = Number((await p.getByTestId("rmsd").innerText()).match(/(\d+,\d+) Å/)?.[1].replace(",", "."));
  ok(rmsd > 0 && rmsd < 2, `lisozima galinha × humana: RMSD ${rmsd} Å`);
  ok(/sobre 1[23]\d pares de CA/.test(await p.getByTestId("rmsd").innerText()), "diz sobre quantos pares de Cα");
  ok(await p.getByTestId("grafico-desvios").isVisible(), "gráfico de desvio por par");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${shots}/3d-7-comparar.png`, fullPage: true });
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByTestId("superposicao-csv").click()]);
  const linhas = readFileSync(await dl.path(), "utf8").split("\r\n").filter(Boolean);
  ok(linhas.length >= 126 && /desvio_angstrom/.test(linhas[0]), `CSV com ${linhas.length - 1} pares e desvios`);
  await p.getByTestId("desfazer-superposicao").click();
  await p.getByTestId("desfazer-superposicao").waitFor({ state: "detached", timeout: 15000 });
  ok(/como depositadas/.test(await p.getByTestId("visor-comparar").innerText()), "volta às posições depositadas");

  // celular: sem rolagem horizontal em nenhuma aba nova
  const cel = await ctx.newPage();
  await cel.setViewportSize({ width: 390, height: 844 });
  for (const r of ["/moleculas/sequencias", "/moleculas/acidos-nucleicos", "/moleculas/processos", "/moleculas/comparar", "/moleculas"]) {
    await cel.goto(`${base}${r}`);
    await cel.waitForTimeout(2500);
    const [doc, win] = await cel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(doc <= win + 1, `celular ${r}: sem rolagem horizontal (${doc} vs ${win})`);
  }
  await cel.screenshot({ path: `${shots}/3d-8-celular.png`, fullPage: true });

  const csp = await p.evaluate(() => window.__csp);
  ok(csp.length === 0, `sem violação de CSP ${csp.join(" | ")}`);
  ok(erros.length === 0, `sem erro no console ${erros.slice(0, 3).join(" | ")}`);
} catch (e) {
  ok(false, `exceção: ${e.message.split("\n")[0]}`);
  await p.screenshot({ path: `${shots}/3d-erro.png` }).catch(() => {});
} finally {
  await browser.close();
}
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\nTudo certo.");
process.exit(falhas.length ? 1 : 0);
