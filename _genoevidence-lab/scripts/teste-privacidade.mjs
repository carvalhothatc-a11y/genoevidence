// Política de privacidade, aceite no cadastro, exclusão de conta pela administração e CSP sem violações.
// Uso: node scripts/teste-privacidade.mjs <base> <arquivo-senha-admin-demo> <diretório-de-dados>
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const [base, credFile, dataDir] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

async function contexto() {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && /Content Security Policy|Refused to/.test(m.text()) && erros.push("csp: " + m.text().slice(0, 200)));
  return { ctx, page, erros };
}
const violacoes = (page) => page.evaluate(() => window.__csp ?? []);

// 1. Visitante: política pública, cabeçalho CSP com nonce, cadastro com aceite
{
  const { ctx, page, erros } = await contexto();
  const res = await page.goto(`${base}/privacidade`);
  const csp = res.headers()["content-security-policy"] ?? "";
  ok(res.status() === 200, "/privacidade abre sem login");
  ok(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/.test(csp) && csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'self'"), "cabeçalho CSP com nonce, strict-dynamic, object-src none");
  const nonces = await page.locator("script[nonce]").count();
  ok(nonces > 0, `scripts do Next carregam com nonce (${nonces})`);
  ok(await page.getByRole("heading", { name: "Política de privacidade", level: 1 }).isVisible(), "título da política");
  ok(await page.getByText(/transferência internacional de dados/).isVisible(), "seção de transferência internacional");
  const res2 = await page.goto(`${base}/privacidade`);
  const n2 = /'nonce-([^']+)'/.exec(res2.headers()["content-security-policy"] ?? "")?.[1];
  ok(n2 && !csp.includes(n2), "nonce muda a cada requisição");

  await page.goto(`${base}/cadastro`);
  ok(await page.getByRole("link", { name: "Política de privacidade" }).first().isVisible(), "cadastro tem link para a política");
  const email = `teste-${randomBytes(4).toString("hex")}@exemplo.test`;
  await page.getByLabel("Nome completo").fill("Pessoa Fictícia de Teste");
  await page.getByLabel("E-mail").fill(email);
  const senha = randomBytes(12).toString("base64url");
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByLabel("Confirmar senha").fill(senha);
  await page.getByRole("button", { name: "Solicitar acesso" }).click();
  ok(await page.getByText("É preciso concordar para continuar.").isVisible(), "sem aceite, o cadastro é recusado");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Solicitar acesso" }).click();
  await page.getByText("Cadastro recebido.", { exact: false }).first().waitFor();
  const conta = readdirSync(path.join(dataDir, "auth", "users"))
    .map((f) => JSON.parse(readFileSync(path.join(dataDir, "auth", "users", f), "utf8")))
    .find((a) => a.email === email);
  ok(conta && /^\d{4}-\d{2}-\d{2}$/.test(conta.privacyVersion) && conta.privacyAcceptedAt, "versão da política e data do aceite gravadas na conta");
  ok((await violacoes(page)).length === 0 && erros.length === 0, `páginas públicas sem violação de CSP ${erros.concat(await violacoes(page)).join(" | ")}`);
  await ctx.close();
  globalThis.contaTeste = conta;
}

// 2. Administração: excluir a conta de teste; páginas pesadas (laboratório 3D, Mol*) sem violação de CSP
{
  const { ctx, page, erros } = await contexto();
  await page.goto(`${base}/entrar`);
  await page.getByLabel("E-mail").fill("demo@exemplo.test");
  await page.getByLabel("Senha", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });

  await page.goto(`${base}/admin`);
  const linha = page.getByRole("row").filter({ hasText: globalThis.contaTeste.email });
  await linha.getByRole("button", { name: "Excluir conta" }).click();
  await linha.getByRole("button", { name: "Confirmar exclusão" }).click();
  await page.getByText(/Conta de Pessoa Fictícia de Teste excluída/).waitFor();
  ok(!existsSync(path.join(dataDir, "auth", "users", `${globalThis.contaTeste.id}.json`)), "conta excluída pela administração (arquivo removido)");
  ok((await page.getByRole("row").filter({ hasText: globalThis.contaTeste.email }).count()) === 0, "conta some da lista");

  const todas = [];
  await page.goto(`${base}/laboratorio/bancada`);
  await page.locator("canvas").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  todas.push(...(await violacoes(page)));
  // área de trabalho: cena 3D gerada a partir da descrição
  await page.goto(`${base}/laboratorio`);
  await page.getByLabel("Descreva sua ideia ou procedimento").fill("Centrifuguei as amostras a 12.000 x g por 5 min.");
  await page.getByRole("button", { name: /Criar visualização|Atualizar visualização/ }).first().click();
  await page.locator('[data-modo-cena="3d"] canvas').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  todas.push(...(await violacoes(page)));
  await page.goto(`${base}/projetos`);
  await page.getByRole("link", { name: /exemplo/i }).first().click();
  await page.waitForURL(/\/projetos\/p_/);
  const estrutura = page.locator('a[href*="/estruturas/"]').first();
  if (await estrutura.count()) {
    await estrutura.click();
    await page.locator("canvas").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(3000);
    todas.push(...(await violacoes(page)));
    ok(true, "visualizador de estruturas (Mol*) carregou");
  }
  await page.goto(`${base}/ajuda`);
  ok(await page.getByRole("link", { name: "Política de privacidade" }).isVisible(), "Ajuda aponta para a política");
  const v = todas.concat(await violacoes(page));
  ok(v.length === 0 && erros.length === 0, `páginas autenticadas sem violação de CSP ${erros.concat(v).join(" | ")}`);
  await ctx.close();
}

await browser.close();
console.log(falhas.length ? `FALHAS: ${falhas.join(" | ")}` : "tudo certo");
process.exit(falhas.length ? 1 : 0);
