// BioMol — Sequências: do exemplo fictício até a busca de estrutura no PDB.
// Uso: node scripts/e2e-biomol-sequencias.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Rode a partir da pasta da instância de teste (a sessão fica salva ali). Conta fictícia; não imprime credenciais.
// Faz UMA busca real no RCSB PDB com a sequência da crambina (pública).
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { contextoAutenticado } from "./_sessao.mjs";

const [base, credFile, shots] = process.argv.slice(2);
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const browser = await chromium.launch();
const ctx = await contextoAutenticado(browser, base, credFile, { contexto: { viewport: { width: 1280, height: 950 }, acceptDownloads: true } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("console", (m) => m.type() === "error" && erros.push(m.text()));
p.on("pageerror", (e) => erros.push(String(e)));

try {
  await p.goto(`${base}/moleculas/sequencias`);
  await p.getByTestId("sequencias").waitFor({ timeout: 60000 });

  // abas da BioMol
  const abas = await p.locator("[data-aba]").allInnerTexts();
  ok(abas.length === 5, `cinco abas na BioMol (${abas.join(" · ")})`);
  ok((await p.locator('[data-aba="/moleculas/sequencias"]').getAttribute("aria-current")) === "page", "a aba Sequências aparece como a atual");

  // exemplo fictício
  await p.getByTestId("usar-exemplo").click();
  await p.locator("[data-seq]").first().waitFor();
  ok((await p.locator("[data-seq]").count()) === 2, "o exemplo traz duas sequências");
  ok(/fictício/i.test(await p.getByTestId("aviso-exemplo").innerText()), "o aviso de exemplo fictício aparece");
  ok((await p.locator('[data-testid="tipo"] [aria-checked="true"]').innerText()).trim() === "DNA", "o tipo detectado é DNA");

  // GC conferido contra a própria sequência
  const fasta = (await import("node:fs")).readFileSync(new URL("../src/lib/biomol/exemplos.ts", import.meta.url), "utf8");
  const dna = fasta.split(">exemplo_ficticio_crambina")[1].split("\n").slice(1, 4).join("").trim();
  const gcEsperado = ((100 * [...dna].filter((c) => c === "G" || c === "C").length) / dna.length).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const gcTela = await p.getByTestId("gc").innerText();
  ok(gcTela.includes(`${gcEsperado}%`), `GC na tela confere com a conta (${gcEsperado}%)`);
  await p.screenshot({ path: `${shots}/seq-1-resumo.png`, fullPage: true });

  // fitas
  await p.locator('[data-ferramenta="fitas"]').click();
  const dupla = await p.getByTestId("dupla-fita").innerText();
  ok(/5' ATGACC/.test(dupla) && /3' TACTGG/.test(dupla), "dupla fita com 5'→3' em cima e 3'→5' embaixo");
  await p.screenshot({ path: `${shots}/seq-2-fitas.png`, fullPage: true });
  await p.getByTestId("guardar-revcomp").click();
  ok((await p.locator("[data-seq]").count()) === 3, "o reverso-complemento vira uma sequência nova");
  await p.locator('[data-seq="exemplo_ficticio_crambina"]').click();

  // transcrição: pede a fita antes de mostrar o RNA
  await p.locator('[data-ferramenta="transcricao"]').click();
  ok(await p.getByText("Diga qual fita você colou").isVisible(), "a transcrição pede para dizer qual fita foi colada");
  await p.locator('[data-testid="fita-fornecida"] [data-valor="codificante"]').click();
  const mrna = await p.locator('[data-testid="seq-bloco"]').last().innerText();
  ok(/AUGACCACCU/.test(mrna.replace(/\s|\d/g, "")), "mRNA da fita codificante começa em AUGACCACCU");

  // tradução
  await p.locator('[data-ferramenta="traducao"]').click();
  const q1 = await p.locator('[data-quadro="1"]').innerText();
  ok(q1.replace(/\s/g, "").includes("MTTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN*"), "quadro +1 = Met + crambina + parada");
  ok((await p.locator("[data-quadro]").count()) === 6, "seis quadros de leitura");

  // ORFs
  await p.locator('[data-ferramenta="orfs"]').click();
  const linha1 = await p.locator('[data-testid="tabela-orfs"] tbody tr').first().innerText();
  ok(/direta.*\+1.*\b1\b.*144.*144.*47/s.test(linha1.replace(/\t/g, " ")), `ORF 1: direta, +1, 1–144, 144 nt, 47 aa (${linha1.replace(/\s+/g, " ")})`);
  ok(await p.getByTestId("mapa-orfs").isVisible(), "mapa das ORFs aparece");
  await p.screenshot({ path: `${shots}/seq-3-orfs.png`, fullPage: true });

  // procurar estrutura: só depois de confirmar o envio
  let pedidos = 0;
  p.on("request", (r) => r.url().includes("/api/moleculas/sequencia") && pedidos++);
  await p.getByText("Procurar estruturas parecidas no PDB…").click();
  ok(pedidos === 0, "abrir a busca não envia nada");
  const aviso = await p.locator('[role="dialog"]').innerText();
  ok(/RCSB PDB/.test(aviso) && /Só a sequência sai/.test(aviso), "o aviso diz para onde vai e o que sai");
  await p.getByTestId("confirmar-busca").click();
  await p.getByTestId("achados-sequencia").waitFor({ timeout: 60000 });
  ok(pedidos === 1, "um pedido só, depois de confirmar");
  const primeiro = await p.locator("[data-achado]").first().innerText();
  ok(/1CRN/.test(primeiro) && /100,0%/.test(primeiro), "o primeiro achado é a 1CRN, 100% idêntica no trecho alinhado");
  ok(/não é a estrutura da sua sequência/.test(await p.getByTestId("achados-sequencia").innerText()), "diz que a estrutura parecida não é a da sequência");
  const href = await p.locator("[data-abrir-3d]").first().getAttribute("href");
  ok(href === "/moleculas?pdb=1CRN&cadeia=A", `“Abrir em 3D” leva à estrutura e cadeia certas (${href})`);
  await p.screenshot({ path: `${shots}/seq-4-pdb.png`, fullPage: true });

  // alinhamento
  await p.locator('[data-ferramenta="alinhar"]').click();
  const valB = await p.getByTestId("alinhar-b").locator("option", { hasText: "variante" }).getAttribute("value");
  await p.getByTestId("alinhar-b").selectOption(valB);
  await p.getByTestId("alinhar").click();
  const ident = await p.getByTestId("identidade").innerText();
  ok(/%/.test(ident), `identidade calculada (${ident.replace(/\s+/g, " ")})`);
  const txt = await p.getByTestId("alinhamento-texto").innerText();
  ok(/---/.test(txt), "o códon a menos aparece como uma lacuna de 3 no alinhamento global");
  await p.screenshot({ path: `${shots}/seq-5-alinhamento.png`, fullPage: true });

  // exportar FASTA
  await p.locator('[data-ferramenta="exportar"]').click();
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByTestId("baixar-fasta").click()]);
  const conteudo = readFileSync(await dl.path(), "utf8");
  ok(conteudo.startsWith(">exemplo_ficticio_crambina") && conteudo.includes("ATGACCACC"), `FASTA baixado (${dl.suggestedFilename()})`);
  const [dlj] = await Promise.all([p.waitForEvent("download"), p.getByTestId("baixar-json").click()]);
  const j = JSON.parse(readFileSync(await dlj.path(), "utf8"));
  ok(j.exemplo_ficticio === true && j.orfs.itens.length >= 1, "JSON marca o exemplo como fictício e traz as ORFs");

  // sequência com T e U: não supõe, pede confirmação; e aponta o erro
  await p.getByTestId("seq-texto").fill(">mista\nATGCATGCAUGCATGC");
  await p.getByRole("button", { name: "Adicionar" }).click();
  ok(await p.getByText("Confirme o tipo acima para continuar").isVisible(), "T e U juntos: pede para confirmar o tipo");
  await p.locator('[data-testid="tipo"] [data-valor="dna"]').click();
  ok(/U é de RNA/.test(await p.getByTestId("seq-invalida").innerText()), "como DNA, aponta que U é de RNA");

  // persistência na aba
  await p.reload();
  await p.locator("[data-seq]").first().waitFor();
  ok((await p.locator("[data-seq]").count()) === 4, "as sequências continuam depois de recarregar (só nesta aba)");

  const csp = await p.evaluate(() => window.__csp);
  ok(csp.length === 0, `sem violação de CSP ${csp.join(" | ")}`);
  ok(erros.length === 0, `sem erro no console ${erros.slice(0, 3).join(" | ")}`);
} catch (e) {
  ok(false, `exceção: ${e.message}`);
  await p.screenshot({ path: `${shots}/seq-erro.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\nTudo certo.");
process.exit(falhas.length ? 1 : 0);
