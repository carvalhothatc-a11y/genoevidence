// Sessão compartilhada entre os roteiros de teste.
//
// O GenoLab limita a 8 entradas por conta a cada 15 minutos — proteção contra ataque de senha, que
// NÃO deve ser afrouxada. Rodar seis roteiros seguidos estoura esse limite e as falhas parecem
// regressão quando são só o limite. Então entramos uma vez e reaproveitamos a sessão.
//
// O arquivo de sessão vai para a pasta de dados de teste, com permissão restrita, e vale 1 hora.
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

const VALIDADE_MS = 60 * 60_000;

/**
 * Devolve um contexto já autenticado. Reaproveita a sessão guardada quando ela ainda funciona;
 * só entra de novo quando não há sessão válida.
 */
export async function contextoAutenticado(browser, base, credFile, opcoes = {}) {
  const arquivo = opcoes.arquivoSessao ?? ".sessao-teste.json";
  const pw = readFileSync(credFile, "utf8").trim();

  if (existsSync(arquivo) && Date.now() - statSync(arquivo).mtimeMs < VALIDADE_MS) {
    const ctx = await browser.newContext({ ...opcoes.contexto, storageState: arquivo });
    const p = await ctx.newPage();
    const r = await p.goto(`${base}/projetos`);
    const serve = r?.status() === 200 && !new URL(p.url()).pathname.startsWith("/entrar");
    await p.close();
    if (serve) return ctx;
    await ctx.close(); // sessão velha: cai para a entrada normal
  }

  const ctx = await browser.newContext(opcoes.contexto);
  const p = await ctx.newPage();
  await p.goto(`${base}/entrar`);
  await p.getByLabel("E-mail").fill(opcoes.email ?? "demo@exemplo.test");
  await p.getByLabel("Senha", { exact: true }).fill(pw);
  await p.getByRole("button", { name: "Entrar" }).click();
  // Não usamos waitForURL: a entrada redireciona pelo CLIENTE, e o waitForURL espera o evento de
  // carga, que nesse caso não acontece — dá tempo esgotado mesmo com o login bem-sucedido.
  const limite = Date.now() + 60000;
  while (Date.now() < limite && new URL(p.url()).pathname.startsWith("/entrar")) await p.waitForTimeout(250);
  if (new URL(p.url()).pathname.startsWith("/entrar")) {
    const aviso = await p.locator('[role="alert"]').first().innerText().catch(() => "");
    throw new Error(`Não foi possível entrar${aviso ? `: ${aviso.replace(/\s+/g, " ").slice(0, 120)}` : "."}`);
  }
  await p.close();

  await ctx.storageState({ path: arquivo });
  chmodSync(arquivo, 0o600); // contém o cookie de sessão: não fica legível por outros
  return ctx;
}
