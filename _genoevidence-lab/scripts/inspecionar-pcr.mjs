// Capturas do módulo de PCR (desktop e celular). Uso: node scripts/inspecionar-pcr.mjs
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3000";
const out = "test-results/inspecao";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const s of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "celular", width: 390, height: 844, isMobile: true, hasTouch: true },
]) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, isMobile: s.isMobile, hasTouch: s.hasTouch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (n) => {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/pcr-${s.name}-${n}.png` });
  };
  await page.goto(`${base}/modulos/pcr?etapa=termociclador`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  await shot("1-etapa");
  await page.getByRole("tab", { name: "Molecular" }).click();
  await shot("2-molecular");
  await page.getByRole("tab", { name: "Resultados" }).click();
  await shot("3-resultados");
  console.log(s.name, errors.length ? `erros: ${errors.join(" | ")}` : "sem erros de página");
  await ctx.close();
}
await browser.close();
