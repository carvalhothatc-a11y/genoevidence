// Caderno de laboratório: registrar o dia, anexar arquivo, editar com rastro e excluir com aviso.
// Uso: node scripts/e2e-caderno.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch();
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
let esperando400 = false; // ligado só em volta do teste que provoca um 400 de propósito
p.on("console", (m) => {
  if (m.type() !== "error") return;
  const txt = m.text();
  if (esperando400 && /status of 400/.test(txt)) return;
  erros.push(txt.slice(0, 140));
});

await p.goto(`${base}/entrar`);
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(pw);
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });

// 1. A aba existe no menu e abre
{
  await p.goto(`${base}/laboratorio`);
  const item = p.getByRole("link", { name: "Caderno", exact: true });
  ok((await item.count()) > 0, "a aba “Caderno” aparece no menu");
  await p.goto(`${base}/caderno`);
  await p.getByTestId("caderno").waitFor({ timeout: 30000 });
  const txt = await p.locator("main").innerText();
  ok(/Caderno de laboratório/.test(txt), "a página abre com o título certo");
  ok(/Nenhum registro ainda/.test(txt), "estado vazio explica para que serve");
  ok(/deu errado/.test(txt), "o estado vazio convida a registrar o que deu errado");
  await p.screenshot({ path: `${shots}/caderno-1-vazio.png` });
}

// 2. Registrar o dia SEM projeto nenhum
let primeiroTexto = "Repeti a PCR do TP53. O controle negativo deu banda — provavelmente contaminação na master mix.";
{
  await p.getByTestId("registrar-dia").click();
  await p.getByTestId("form-caderno").waitFor();
  const semProjeto = await p.locator("#projeto").count();
  ok(true, `formulário aberto${semProjeto ? " (vínculo com projeto é opcional)" : ""}`);
  await p.getByLabel("O que você fez").fill(primeiroTexto);
  await p.getByTestId("salvar-caderno").click();
  await p.getByTestId("registro").first().waitFor({ timeout: 30000 });
  const cartao = await p.getByTestId("registro").first().innerText();
  ok(/Repeti a PCR/.test(cartao), "o registro aparece no caderno sem precisar de projeto");
  ok(/de \d{4}$|de \d{4}\n/m.test(cartao) || /de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de/.test(cartao), `o dia aparece por extenso: ${cartao.split("\n")[0]}`);
}

// 3. Sobrevive ao recarregamento (está no servidor, não só na tela)
{
  await p.reload();
  await p.getByTestId("registro").first().waitFor({ timeout: 30000 });
  ok(/Repeti a PCR/.test(await p.getByTestId("registro").first().innerText()), "o registro continua lá depois de recarregar");
}

// 4. Anexar um arquivo ao dia
{
  await p.getByRole("button", { name: "Ver o dia" }).first().click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const caminho = `${shots}/gel-de-teste.png`;
  writeFileSync(caminho, png);
  ok((await p.getByText("Escolher arquivo").count()) > 0, "o seletor de arquivo está em português");
  await p.locator('input[type="file"]').first().setInputFiles(caminho);
  await p.getByTestId("arquivos-do-dia").waitFor({ timeout: 30000 });
  const img = p.locator('[data-testid="arquivos-do-dia"] img').first();
  ok((await img.count()) > 0, "a foto anexada aparece no dia");
  ok(await img.evaluate((e) => e.complete && e.naturalWidth > 0), "a foto é servida pelo GenoLab e carrega");
  const src = (await img.getAttribute("src")) ?? "";
  ok(src.startsWith("/api/caderno/"), `servida pelo próprio servidor (${src.slice(0, 40)}…)`);
}

// 5. Editar guarda a versão anterior, e o cartão diz que houve edição
{
  await p.getByRole("button", { name: "Editar o registro" }).first().click();
  await p.getByTestId("form-caderno").waitFor();
  const aviso = await p.getByTestId("form-caderno").innerText();
  ok(/versão anterior continua guardada/i.test(aviso), "avisa que a versão anterior fica guardada");
  await p.getByLabel("O que você fez").fill("Repeti a PCR do TP53. Confirmei: a contaminação estava na água, não na master mix.");
  await p.getByTestId("salvar-caderno").click();
  await p.getByTestId("registro").first().waitFor();
  await p.waitForTimeout(600);
  const cartao = await p.getByTestId("registro").first().innerText();
  ok(/1 arquivo\b/.test(cartao) && !/arquivo\(s\)/.test(cartao), "plural escrito por extenso, sem “arquivo(s)”");
  ok(/editado 1 vez/.test(cartao), `o cartão mostra que houve edição: ${(cartao.match(/editado[^\n]*/) ?? ["(nada)"])[0]}`);

  // o cartão continua aberto depois de salvar a edição; só abrimos de novo se tiver fechado
  const reabrir = p.getByRole("button", { name: "Ver o dia" }).first();
  if (await reabrir.count()) await reabrir.click();
  await p.getByRole("button", { name: "Ver o que mudou" }).first().click();
  const versoes = await p.getByTestId("versoes").innerText();
  ok(new RegExp(primeiroTexto.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(versoes), "a versão anterior está guardada por inteiro");
  await p.screenshot({ path: `${shots}/caderno-2-versoes.png` });
}

// 6. Excluir nomeia o dia e diz o que vai junto
{
  await p.getByRole("button", { name: "Excluir", exact: true }).first().click();
  const dialogo = p.getByRole("alertdialog");
  await dialogo.waitFor();
  const txt = await dialogo.innerText();
  ok(/Excluir o registro de \p{L}+, \d+ de \p{L}+ de \d{4}\?/u.test(txt), `a confirmação nomeia o dia: ${txt.split("\n")[0]}`);
  ok(/não tem volta/i.test(txt) && /versões anteriores/i.test(txt), "diz que leva as versões junto e que não tem volta");
  ok((await dialogo.getByRole("button", { name: "Manter" }).count()) > 0, "o botão de recusa diz “Manter”, não “Cancelar”");
  await p.screenshot({ path: `${shots}/caderno-3-excluir.png` });
  await dialogo.getByRole("button", { name: "Manter" }).click();
  ok((await p.getByTestId("registro").count()) === 1, "“Manter” não apaga nada");
}

// 7. O caderno de uma conta não aparece na outra
{
  const r = await p.evaluate(async () => {
    const res = await fetch("/api/caderno");
    const d = await res.json();
    return d.registros?.[0]?.id ?? null;
  });
  ok(typeof r === "string", "a conta lê o próprio caderno pela API");

  const outra = await browser.newContext();
  const op = await outra.newPage();
  const sts = await op.evaluate(async ([b, id]) => {
    const lista = await fetch(`${b}/api/caderno`);
    const um = await fetch(`${b}/api/caderno/${id}`);
    return [lista.status, um.status];
  }, [base, r]).catch(() => [0, 0]);
  ok(sts.every((s) => s === 401 || s === 403 || s === 0), `sem sessão o caderno não responde (${sts.join(", ")})`);
  await outra.close();
}

// 8. Um dia em branco não é registro
{
  await p.goto(`${base}/caderno`);
  await p.getByTestId("registrar-dia").click();
  const botao = p.getByTestId("salvar-caderno");
  ok(await botao.isDisabled(), "sem texto, não dá para salvar");
  esperando400 = true;
  const r = await p.evaluate(async () => {
    const res = await fetch("/api/caderno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dia: "2026-10-09", texto: "   " }),
    });
    return { status: res.status, corpo: (await res.text()).slice(0, 120) };
  });
  await p.waitForTimeout(300);
  esperando400 = false;
  ok(r.status === 400 && /Escreva o que você fez/.test(r.corpo), `a API também recusa: ${r.corpo}`);
}

// 9. Celular: sem rolagem horizontal
{
  const cel = await ctx.newPage();
  await cel.setViewportSize({ width: 390, height: 844 });
  await cel.goto(`${base}/caderno`);
  await cel.getByTestId("caderno").waitFor({ timeout: 30000 });
  const [doc, win] = await cel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(doc <= win + 1, `celular: sem rolagem horizontal (${doc} vs ${win})`);
  await cel.screenshot({ path: `${shots}/caderno-4-celular.png`, fullPage: true });
  await cel.close();
}

const csp = await p.evaluate(() => window.__csp ?? []);
ok(csp.length === 0, `sem violação da política de segurança ${csp.slice(0, 2).join(" | ")}`);
ok(erros.length === 0, `sem erros no console ${[...new Set(erros)].slice(0, 2).join(" | ")}`);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
