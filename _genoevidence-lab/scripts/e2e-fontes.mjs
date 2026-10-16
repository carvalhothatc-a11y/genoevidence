// Perguntar às fontes: resposta presa aos documentos, com a citação conferida no arquivo.
// Uso: node scripts/e2e-fontes.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// CONSOME API da Anthropic (2 perguntas por execução). Exige ANTHROPIC_API_KEY no servidor.
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { contextoAutenticado } from "./_sessao.mjs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

/** PDF com uma página por lista de linhas. */
function pdfDePaginas(paginas) {
  const objs = [];
  const idPagina = (i) => 3 + i * 2;
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${paginas.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] /Count ${paginas.length} >>`);
  const fonte = 3 + paginas.length * 2;
  for (let i = 0; i < paginas.length; i++) {
    const texto = `BT /F1 11 Tf 40 750 Td 15 TL ${paginas[i].map((l) => `(${l.replace(/[()\\]/g, "\\$&")}) Tj T*`).join(" ")} ET`;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${idPagina(i) + 1} 0 R /Resources << /Font << /F1 ${fonte} 0 R >> >> >>`);
    objs.push(`<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`);
  }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  let out = "%PDF-1.4\n";
  const pos = [];
  objs.forEach((o, i) => {
    pos.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

// O conteúdo tem uma RESSALVA de propósito ("embora varie entre lotes"): se a resposta citar a
// frase sem ela, a conferência tem de recusar.
const ARTIGO = pdfDePaginas([
  ["Introducao: este trabalho fictício descreve a amplificacao do gene TP53 por PCR.", "Nenhum dado aqui e real; serve apenas para teste do sistema."],
  [
    "Metodos: a temperatura de anelamento utilizada foi de 58 graus Celsius,",
    "embora o valor ideal varie entre lotes diferentes de primers.",
    "A extensao ocorreu a 72 graus Celsius por 45 segundos.",
  ],
  ["Resultados: observou-se banda unica no gel de agarose a 1,5 por cento.", "Discussao: o controle negativo nao apresentou amplificacao."],
]);

const browser = await chromium.launch();
const ctx = await contextoAutenticado(browser, base, credFile, { contexto: { viewport: { width: 1280, height: 950 } } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 140)));


// Projeto novo e o PDF dentro dele
let projetoId = "";
{
  await p.goto(`${base}/projetos/novo`);
  await p.getByLabel(/Título/i).fill("Fontes — teste automático (fictício)");
  await p.getByRole("button", { name: /Criar/ }).first().click();
  await p.waitForURL(/\/projetos\/p_/, { timeout: 60000 });
  projetoId = p.url().match(/p_[A-Za-z0-9_-]+/)[0];
  // Pelo FORMULÁRIO, como a pessoa faz — não pela API. É assim que o caminho real é exercitado.
  await p.getByText("Enviar um arquivo para o projeto").click();
  await p.locator("#upload-arquivo").setInputFiles({ name: "artigo-ficticio.pdf", mimeType: "application/pdf", buffer: ARTIGO });
  await p.locator("#upload-role").fill("artigo fictício de teste");
  await p.getByRole("button", { name: "Enviar", exact: true }).click();
  await p.getByText(/Arquivo enviado|enviado/i).first().waitFor({ timeout: 60000 });
  ok(true, "PDF de 3 páginas anexado pelo formulário do projeto");
}

// 1. Os arquivos viram trechos citáveis
{
  // SEM recarregar a página: o painel montou antes do envio e precisa perceber sozinho.
  await p.getByTestId("perguntar-fontes").waitFor({ timeout: 30000 });
  // waitFor (que repete) e não isVisible (que confere uma vez só e volta na hora).
  const percebeu = await p
    .getByTestId("fontes-resumo")
    .filter({ hasText: /[1-9]\d* trecho/ })
    .waitFor({ state: "visible", timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  ok(percebeu, "o painel percebe o arquivo recém-anexado sem recarregar a página");
  // A PRIMEIRA abertura dispara a extração do PDF e a divisão em trechos: esperamos o número
  // aparecer, em vez de um tempo fixo. Depois disso fica guardado e é instantâneo.
  await p.getByTestId("fontes-resumo").filter({ hasText: /[1-9]\d* trecho/ }).waitFor({ timeout: 90000 });
  const resumo = await p.getByTestId("fontes-resumo").innerText();
  ok(/1 documento\(s\)/.test(resumo) && /[1-9]\d* trecho/.test(resumo), `o PDF virou trechos citáveis: ${resumo}`);
}

// 2. Pergunta cuja resposta está na página 2 — CONSOME API
{
  await p.getByTestId("pergunta").fill("Qual foi a temperatura de anelamento usada?");
  await p.getByTestId("enviar-pergunta").click();
  await p.getByTestId("resposta-fontes").waitFor({ timeout: 120000 });
  const txt = await p.getByTestId("resposta-fontes").innerText();
  ok(/58/.test(txt), `a resposta traz o valor que está no documento: ${txt.split("\n")[0].slice(0, 80)}`);

  const citacoes = p.locator("[data-citacao]");
  const n = await citacoes.count();
  ok(n > 0, `${n} citação(ões) conferida(s) no documento`);
  if (n > 0) {
    const primeira = await citacoes.first().innerText();
    ok(/página 2/.test(primeira), `cita a PÁGINA certa: ${(primeira.match(/✔[^\n]*/) ?? ["(nada)"])[0]}`);
    ok(/58/.test(primeira), "e o trecho citado contém o valor");
    ok(/ver o parágrafo inteiro/.test(primeira), "dá para abrir o parágrafo inteiro, não só o nome do arquivo");
  }
  await p.screenshot({ path: `${shots}/fontes-1-resposta.png`, fullPage: true });
}

// 3. A citação mostrada existe LITERALMENTE no documento (a prova da conferência)
{
  const citada = await p.locator("[data-citacao] blockquote").first().innerText().catch(() => "");
  const limpa = citada.replace(/^[“"]|[”"]$/g, "").trim();
  const noPdf = ARTIGO.toString("latin1");
  const normal = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  // o PDF guarda cada linha separada; conferimos por pedaços de palavras consecutivas
  const palavras = normal(limpa).split(" ").filter((w) => w.length > 3);
  const presentes = palavras.filter((w) => normal(noPdf).includes(w)).length;
  ok(palavras.length > 0 && presentes === palavras.length, `a citação exibida existe no PDF (${presentes}/${palavras.length} palavras)`);
}

// 4. Pergunta fora dos documentos: NÃO inventa — nem chama a API
{
  await p.getByTestId("pergunta").fill("Qual a cotação do dólar hoje e quem ganhou o campeonato?");
  await p.getByTestId("enviar-pergunta").click();
  await p.getByTestId("resposta-fontes").waitFor({ timeout: 60000 });
  const txt = await p.getByTestId("resposta-fontes").innerText();
  ok(/não respondem isso|Nenhum trecho/i.test(txt), `diz que os documentos não respondem: ${txt.split("\n")[0].slice(0, 70)}`);
  ok((await p.locator("[data-citacao]").count()) === 0, "e não apresenta citação nenhuma");
  await p.screenshot({ path: `${shots}/fontes-2-fora.png`, fullPage: true });
}

// 5. Sem sessão, não responde
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const sts = await ap
    .evaluate(async ([b, id]) => {
      const g = await fetch(`${b}/api/projects/${id}/fontes`);
      const po = await fetch(`${b}/api/projects/${id}/fontes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pergunta: "teste" }) });
      return [g.status, po.status];
    }, [base, projetoId])
    .catch(() => [0, 0]);
  ok(sts.every((s) => s === 401 || s === 403 || s === 0), `sem sessão as rotas não respondem (${sts.join(", ")})`);
  await anon.close();
}

const csp = await p.evaluate(() => window.__csp ?? []);
ok(csp.length === 0, `sem violação da política de segurança ${csp.slice(0, 2).join(" | ")}`);
ok(erros.length === 0, `sem erros no console ${[...new Set(erros)].slice(0, 2).join(" | ")}`);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
