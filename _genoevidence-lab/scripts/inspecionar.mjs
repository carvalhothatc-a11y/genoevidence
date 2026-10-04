// Capturas de inspeção visual do fluxo principal (desktop e celular).
// Uso: node scripts/inspecionar.mjs [baseURL] [pastaSaida]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "test-results/inspecao";
const sizes = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "celular", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1, isMobile: s.isMobile, hasTouch: s.hasTouch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (n) => {
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${s.name}-${n}.png` });
  };
  await page.goto(`${base}/laboratorio/bancada`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  await shot("1-entrada");
  await page.getByRole("button", { name: "Entrar no laboratório" }).click();
  await shot("2-visao-geral");
  if (s.isMobile) {
    const sheet = page.getByTestId("painel-inferior");
    await sheet.getByRole("button", { name: /Bancadas/ }).click();
    await sheet.getByRole("button", { name: /Amplificação/ }).first().click();
  } else {
    await page.locator(".lab-hotspot", { hasText: "Amplificação" }).click();
  }
  await shot("3-bancada");
  if (s.isMobile) await page.getByTestId("painel-inferior").getByRole("button", { name: /^Termociclador/ }).first().click();
  else await page.locator(".lab-hotspot", { hasText: "Termociclador" }).click();
  await shot("4-equipamento");
  await page.getByRole("button", { name: "Abrir tampa" }).first().click();
  await page.getByRole("button", { name: "Posicionar tubos no bloco" }).first().click();
  await page.getByRole("button", { name: "Fechar tampa" }).first().click();
  await page.getByRole("button", { name: "Iniciar programa" }).first().click();
  await shot("5-programa");
  await page.getByRole("button", { name: "Processo molecular" }).first().click();
  await shot("6-molecular");
  await page.getByRole("button", { name: "← Voltar à bancada" }).click();
  await page.getByRole("button", { name: "Resultados" }).first().click();
  await shot("7-resultados");
  console.log(s.name, errors.length ? `erros: ${errors.join(" | ")}` : "sem erros de página");
  await ctx.close();
}
await browser.close();
