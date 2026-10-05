// Envio de arquivos ao projeto: aceita documento, planilha, PDF e imagem; recusa o que não é aceito.
// Uso: node scripts/e2e-arquivos-projeto.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const [base, cred, out] = process.argv.slice(2);
const DL = process.env.DOCS_TESTE ?? "";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await ctx.newPage();
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));
await p.goto(base + "/entrar");
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(readFileSync(cred, "utf8").trim());
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });
await p.goto(base + "/projetos");
const link = p.getByRole("link", { name: /exemplo/i }).first();
if (!(await link.count())) { await p.getByRole("button", { name: /Criar projeto de exemplo/ }).click(); await p.waitForTimeout(3000); }
await p.getByRole("link", { name: /exemplo/i }).first().click();
await p.waitForTimeout(2500);
await p.locator("summary", { hasText: /Enviar um arquivo para o projeto/ }).click();
await p.waitForTimeout(600);
const aceita = await p.locator("#upload-arquivo").getAttribute("accept");
ok(/docx/.test(aceita) && /pdf/.test(aceita) && /xlsx/.test(aceita) && /png/.test(aceita), `o campo aceita documento, planilha, PDF e imagem (${aceita})`);
const DOCS = DL ? [["protocolo.docx", "Protocolo de síntese de nanopartículas"], ["tabela artigos enxofre.docx", "Levantamento de artigos"]] : [];
if (!DOCS.length) console.log("· DOCS_TESTE não definido: envio de documentos não exercitado nesta execução.");
for (const [arq, papel] of DOCS) {
  await p.setInputFiles("#upload-arquivo", DL + arq);
  await p.fill("#upload-role", papel);
  await p.getByRole("button", { name: "Enviar" }).click();
  await p.waitForTimeout(3500);
  const t = (await p.locator("form", { has: p.locator("#upload-arquivo") }).innerText()).replace(/\s+/g, " ");
  ok(t.includes("preservado no projeto"), `“${arq}” foi aceito: ${(t.match(/Arquivo[^.]{0,80}preservado no projeto/) ?? [t.slice(0, 90)])[0]}`);
}
await p.reload();
await p.waitForTimeout(2000);
const corpo = await p.locator("body").innerText();
if (DOCS.length) {
  ok(corpo.includes("protocolo.docx"), "o documento aparece na lista de arquivos do projeto");
  ok(/Protocolo de síntese/.test(corpo), "o papel descrito pela pessoa aparece junto do arquivo");
}
await p.screenshot({ path: `${out}/projeto-arquivos.png`, fullPage: true });
// arquivo não suportado é recusado pela API
const r = await p.evaluate(async () => {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3])], "virus.exe", { type: "application/octet-stream" }));
  const id = location.pathname.split("/").pop();
  const res = await fetch(`/api/projects/${id}/files`, { method: "POST", body: fd });
  return { status: res.status, body: (await res.text()).slice(0, 120) };
});
ok(r.status >= 400, `arquivo de tipo não permitido é recusado (${r.status}: ${r.body.slice(0, 70)})`);
await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
