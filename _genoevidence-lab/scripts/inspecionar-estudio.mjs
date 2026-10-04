// Capturas do estúdio (instância de demonstração; credencial lida de arquivo, não impressa).
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const [base, credFile, shots, ...frases] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 940 }, acceptDownloads: true })).newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && erros.push(m.text()));
await page.goto(`${base}/entrar`);
await page.getByLabel("E-mail").fill("demo@exemplo.test");
await page.getByLabel("Senha", { exact: true }).fill(pw);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
await page.goto(`${base}/laboratorio/bancada`);
await page.waitForTimeout(5000);
const texto = frases.join(" ") || "Tirei o primer de um lado, acrescentei no DNA, foi no plasmídeo, e daí vou inserir no DNA da bactéria.";
await page.locator("#prompt-ideia").fill(texto);
await page.getByRole("button", { name: "Interpretar" }).click();
await page.waitForTimeout(4000);
const passos = await page.locator("[data-passo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-passo")));
for (let i = 0; i < passos.length; i++) {
  await page.locator(`[data-passo="${passos[i]}"]`).first().click();
  await page.getByRole("button", { name: /Continuar|Iniciar/ }).first().click().catch(() => {});
  await page.waitForTimeout(3300);
  await page.screenshot({ path: `${shots}/holo-${i + 1}-${passos[i]}.png` });
}
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Baixar imagem" }).click()]);
await dl.saveAs(`${shots}/holo-processo.png`);
console.log(passos.join(" → "));
console.log(erros.length ? "ERROS: " + erros.slice(0, 5).join(" | ") : "sem erros no console");
await browser.close();
