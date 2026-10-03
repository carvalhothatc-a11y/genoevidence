// Teste de fumaça do controle de acesso (instância isolada). Credenciais de teste geradas aqui; nada é impresso.
import { chromium } from "@playwright/test";
import { randomBytes } from "node:crypto";
const base = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
const senha = () => randomBytes(12).toString("base64url");
async function cadastrar(page, nome, email, pw) {
  await page.goto(`${base}/cadastro`);
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pw);
  await page.getByLabel("Confirmar senha").fill(pw);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Solicitar acesso" }).click();
  await page.getByText("Cadastro recebido").waitFor();
}
async function entrar(page, email, pw) {
  await page.goto(`${base}/entrar`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
}
const check = (ok, msg) => console.log(`${ok ? "✔" : "✖"} ${msg}`) || (!ok && errors.push(msg));

const A = await browser.newContext(); const a = await A.newPage();
a.on("pageerror", (e) => errors.push("pageerror A: " + e.message));
const pwA = senha();
await cadastrar(a, "Admin Teste", "admin@exemplo.test", pwA);
await entrar(a, "admin@exemplo.test", pwA);
check(a.url().includes("/laboratorio"), "administração inicial entra direto (autorizada)");
await a.goto(`${base}/projetos`);
await a.getByRole("button", { name: /Criar projeto de exemplo/ }).click();
await a.waitForURL(/\/projetos\/p_/, { timeout: 60000 });
const projUrl = a.url(); const pid = projUrl.split("/").pop();
check(Boolean(pid), "projeto de exemplo criado e aberto");
await a.getByRole("link", { name: /Expressão \(exemplo sintético\)/ }).click();
await a.waitForURL(/dados/); check(true, "página de dados abre");
await a.goto(projUrl); await a.getByRole("link", { name: /1UBQ/ }).click(); await a.waitForURL(/estruturas/);
check(true, "página de estrutura abre");

const B = await browser.newContext(); const b = await B.newPage();
b.on("pageerror", (e) => errors.push("pageerror B: " + e.message));
const pwB = senha(); const emailB = `pesq+${randomBytes(3).toString("hex")}@exemplo.test`;
await cadastrar(b, "Pesquisadora B", emailB, pwB);
await entrar(b, emailB, pwB);
check(b.url().includes("/acesso/pendente"), "conta nova cai em 'acesso pendente'");
let r = await b.request.get(`${base}/api/projects`); check(r.status() === 403, `pendente na API → ${r.status()} (esperado 403)`);
r = await b.request.get(`${base}/api/projects/${pid}`); check(r.status() === 403, `pendente lendo projeto alheio → ${r.status()} (esperado 403)`);
await b.goto(`${base}/projetos/${pid}`); check(b.url().includes("/acesso/pendente"), "pendente é redirecionada ao abrir URL de projeto");

const C = await browser.newContext(); const c = await C.newPage();
r = await c.request.get(`${base}/api/projects`); check(r.status() === 401, `sem sessão na API → ${r.status()} (esperado 401)`);
await c.goto(`${base}/projetos/${pid}`); check(c.url().includes("/entrar"), "sem sessão é levada ao login");

await a.goto(`${base}/admin`);
await a.getByRole("button", { name: "Autorizar" }).first().click();
await a.getByText(/autorizado\./).waitFor();
await b.goto(`${base}/projetos`);
check(b.url().includes("/projetos"), "após aprovação, B entra na área de projetos");
r = await b.request.get(`${base}/api/projects/${pid}`); check(r.status() === 404, `B lendo projeto de A → ${r.status()} (esperado 404)`);
r = await b.request.get(`${base}/api/projects/${pid}/files/x_inexistente1`); check(r.status() === 404, `B baixando arquivo de A → ${r.status()} (esperado 404)`);
await b.goto(`${base}/projetos/${pid}`); check((await b.title()).includes("404") || (await b.content()).includes("could not be found") || (await b.content()).includes("404"), "B abrindo URL do projeto de A → 404");
r = await b.request.delete(`${base}/api/projects/${pid}`, { headers: { Origin: base } }); check(r.status() === 404, `B excluindo projeto de A → ${r.status()} (esperado 404)`);
r = await a.request.post(`${base}/api/projects`, { headers: { Origin: "https://malicioso.example", "Content-Type": "application/json" }, data: { title: "csrf" } });
check(r.status() === 403, `POST com origem estranha → ${r.status()} (esperado 403)`);
console.log(errors.length ? `FALHAS/ERROS: ${errors.join(" | ")}` : "tudo certo");
await browser.close();
