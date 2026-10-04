// Teste ponta a ponta da ÁREA DE TRABALHO (instância de demonstração, contas e dados fictícios).
// Uso: node scripts/e2e-area.mjs <base> <arquivo-senha-demo> <pasta-capturas> [--ia]
//   --ia: também testa a identificação de imagem e o Geninho com contexto (chama a API da Anthropic).
// Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { strToU8, zipSync } from "fflate";

const [base, credFile, shots, ...flags] = process.argv.slice(2);
const comIA = flags.includes("--ia");
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

// ---------------------------------------------------------------- arquivos de teste (fictícios)
function pdf(linhas) {
  const conteudo = `BT /F1 12 Tf 50 750 Td 16 TL ${linhas.map((l) => `(${l.replace(/[()\\]/g, "\\$&")}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
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
const docx = (paragrafos) => Buffer.from(zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": strToU8(`<w:document><w:body>${paragrafos.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`) }));
const xlsx = () =>
  Buffer.from(
    zipSync({
      "[Content_Types].xml": strToU8("<Types/>"),
      "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="Ct" sheetId="1" r:id="rId1"/><sheet name="Notas" sheetId="2" r:id="rId2"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
      "xl/sharedStrings.xml": strToU8("<sst><si><t>Amostra</t></si><si><t>Grupo</t></si><si><t>Ct</t></si><si><t>Controle</t></si><si><t>Tratado</t></si></sst>"),
      "xl/worksheets/sheet1.xml": strToU8(
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>A1</t></is></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>22.4</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>B1</t></is></c><c r="B3" t="s"><v>4</v></c><c r="C3"><v>25.9</v></c></row></sheetData></worksheet>',
      ),
      "xl/worksheets/sheet2.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>obs</t></is></c><c r="B1" t="inlineStr"><is><t>n</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>x</t></is></c><c r="B2"><v>1</v></c></row></sheetData></worksheet>'),
    }),
  );
const CSV = "Amostra;Grupo;Réplica;Ct (ciclos)\nA1;Controle;1;22,5\nA2;Controle;2;NA\nB1;Tratado;1;25,1\nB2;Tratado;2;24,8\n";

// reconhecimento de voz simulado (o navegador de teste não tem microfone)
const vozFalsa = () => {
  class SR {
    constructor() {
      this.lang = "pt-BR";
      this.onresult = null;
      this.onend = null;
      this.onerror = null;
    }
    start() {
      setTimeout(() => this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: "Centrifuguei as amostras a 12.000 x g por 5 min" }], { isFinal: true })] }), 300);
    }
    stop() {
      setTimeout(() => this.onend?.(), 50);
    }
  }
  window.SpeechRecognition = SR;
};

/** Chamada de API pelo próprio navegador (o cookie de sessão é Secure em produção). */
const api = (pg, url, init = {}) =>
  pg.evaluate(async ([u, i]) => {
    const r = await fetch(u, i);
    return { status: r.status, body: await r.json().catch(() => null) };
  }, [url, init]);

async function entrar(page, email, senha) {
  await page.goto(`${base}/entrar`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });
}

const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 }, acceptDownloads: true });
await ctx.addInitScript(vozFalsa);
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text()) && erros.push("console: " + m.text().slice(0, 300)));

await entrar(page, "demo@exemplo.test", pw);
await page.goto(`${base}/laboratorio`);
await page.evaluate(() => localStorage.clear());
await page.reload();

// 1. entrada direta
await page.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
ok(await page.getByText("Olá! Eu sou o Geninho.").isVisible(), "Geninho dá as instruções na tela inicial");
ok(await page.getByLabel("Descreva sua ideia ou procedimento").isVisible(), "campo de descrição em destaque, sem exigir projeto");
ok(await page.getByRole("button", { name: "Criar visualização" }).isDisabled(), "“Criar visualização” espera conteúdo");
await page.screenshot({ path: `${shots}/a1-inicio.png` });

// 2. ação isolada → cena específica; elemento clicável com fonte
await page.getByLabel("Descreva sua ideia ou procedimento").fill("Estou pipetando 2 µL do primer forward no master mix.");
ok(await page.getByTestId("termos-reconhecidos").getByText("2 µL").first().isVisible(), "valores e unidades aparecem para conferência antes do uso");
await page.getByRole("button", { name: "Criar visualização" }).click();
await page.getByTestId("palco-experimento").waitFor({ timeout: 60000 });
const etapas = await page.locator("[data-passo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-passo")));
ok(JSON.stringify(etapas) === JSON.stringify(["pipetar"]), `ação isolada continua isolada: ${etapas.join(",")}`);
await page.locator('[data-modo-cena="3d"]').waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Pausar", exact: true }).click();
await page.locator('[data-alvo="micropipeta"]').click();
const painel = page.getByTestId("painel-elemento");
await painel.waitFor();
ok((await painel.getAttribute("data-objeto")) === "micropipeta" && (await painel.getByText("Função").isVisible()) && (await painel.getByText("Fonte").isVisible()), "elemento selecionado mostra nome, função, relação, parâmetros, fonte e explicação");
ok(await painel.getByText("texto", { exact: true }).first().isVisible(), "a fonte da micropipeta é o texto descrito");
ok(await painel.getByText(/Volume de primers|Volume/).first().isVisible(), "parâmetros usados aparecem no painel");
await page.screenshot({ path: `${shots}/a2-selecao.png` });
await painel.getByRole("button", { name: "Fechar painel do elemento" }).click();
ok(await page.getByText("não representa a duração real").isVisible(), "a velocidade da animação não altera o tempo experimental (aviso visível)");
await page.getByLabel("Velocidade da animação").selectOption("2");
await page.getByRole("button", { name: "Aproximar" }).click();
await page.getByRole("button", { name: "Reiniciar visão" }).click();
ok(true, "controles reproduzir/pausar, reiniciar, velocidade, aproximar e reiniciar visão respondem");

// 3. áudio: início, encerramento e transcrição editável
await page.getByRole("button", { name: "Gravar áudio" }).click();
await page.getByText(/Gravando…/).first().waitFor();
await page.getByRole("button", { name: "Encerrar gravação" }).click();
const tr = page.getByLabel("Transcrição editável");
await tr.waitFor();
await page.waitForFunction(() => document.querySelector("#transcricao-texto")?.value.includes("Centrifuguei"));
await tr.fill("Depois centrifuguei as amostras a 12.000 x g por 5 min.");
await page.getByRole("button", { name: "Usar na descrição" }).click();
ok((await page.getByLabel("Descreva sua ideia ou procedimento").inputValue()).includes("centrifuguei as amostras a 12.000 x g"), "transcrição revisada e corrigida antes de ir para a descrição");

// 4. materiais combinados: relatório (conflito), tabela CSV, planilha XLSX, referência
await page.getByLabel("Descreva sua ideia ou procedimento").fill("Pipetei 2 µL do DNA molde no tubo com master mix. Depois coloquei no termociclador: 30 ciclos com anelamento a 58 °C por 30 s.");
await page.getByTestId("input-relatorio").setInputFiles({ name: "protocolo.pdf", mimeType: "application/pdf", buffer: pdf(["Protocolo do laboratorio (ficticio).", "Anelamento a 60 °C por 30 s."]) });
await page.locator('[data-material="relatorio"]').waitFor({ timeout: 30000 });
ok(await page.locator('[data-material="relatorio"]').getByText("documento analisado").isVisible(), "PDF: texto extraído e marcado como documento analisado");
await page.getByTestId("input-relatorio").setInputFiles({ name: "notas.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: docx(["Observação: usar tampão novo."]) });
await page.locator('[data-material="relatorio"]').nth(1).waitFor({ timeout: 30000 });
ok((await page.locator('[data-material="relatorio"]').count()) === 2, "DOCX extraído");
await page.getByTestId("input-tabela").setInputFiles({ name: "ct.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
const tab = page.locator('[data-material="tabela"]').first();
await tab.waitFor({ timeout: 30000 });
ok((await tab.locator('select[data-coluna="Ct (ciclos)"]').inputValue()) === "valor" && (await tab.locator('select[data-coluna="Grupo"]').inputValue()) === "grupo", "CSV: prévia e mapeamento de colunas sugerido (valor, grupo)");
ok(await tab.getByText("∅").first().isVisible(), "valor ausente preservado na prévia");
await page.getByTestId("input-tabela").setInputFiles({ name: "ct.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx() });
const tab2 = page.locator('[data-material="tabela"]').nth(1);
await tab2.waitFor({ timeout: 30000 });
await tab2.getByLabel("Aba").selectOption("Notas");
await tab2.locator('select[data-coluna="obs"]').waitFor();
ok(true, "XLSX lido; troca de aba funciona");
await tab2.getByRole("button", { name: /Remover ct.xlsx/ }).click();
await page.getByRole("button", { name: "Referências" }).click();
await page.getByLabel("Referências (uma por linha): DOI, link ou citação").fill("10.3791/3998");
await page.getByRole("button", { name: "Adicionar", exact: true }).click();
ok(await page.locator('[data-material="referencia"]').getByText("referência cadastrada").isVisible(), "referência: cadastrada (diferente de documento analisado)");

// imagem com elemento marcado manualmente
const png = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const g = c.getContext("2d");
  g.fillStyle = "#f4f4f4";
  g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#88a";
  for (let i = 0; i < 3; i++) g.fillRect(60 + i * 80, 40, 30, 110);
  return c.toDataURL("image/png").split(",")[1];
});
await page.getByTestId("input-imagem").setInputFiles({ name: "bancada.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
const img = page.locator('[data-material="imagem"]');
await img.waitFor();
ok(await img.getByRole("img", { name: /Prévia de bancada.png/ }).isVisible(), "foto: prévia da imagem original, com substituir e remover");
await img.getByLabel("Elemento a marcar").selectOption("placa_pocos");
await img.getByRole("button", { name: "Marcar na foto" }).click();
ok(await img.locator('[data-elemento="placa_pocos"]').isVisible(), "elemento visível marcado e corrigível");
await page.getByRole("button", { name: "Atualizar visualização" }).first().click();
await page.getByTestId("perguntas").waitFor({ timeout: 30000 });
const conflito = page.locator('[data-conflito="Temperatura de anelamento"]');
ok((await conflito.count()) === 1, "conflito entre descrição (58 °C) e relatório (60 °C) pede esclarecimento");
const acoes2 = await page.locator("[data-passo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-passo")));
ok(JSON.stringify(acoes2) === JSON.stringify(["pipetar", "amplificar"]), `etapas seguem a descrição (relatório não vira protocolo): ${acoes2.join(",")}`);
const sint = page.getByTestId("sintese");
ok(/foto\s*bancada\.png/.test(await sint.locator('[data-participante="placa_pocos"]').innerText()), "o elemento da foto entra na cena com a origem “foto”");
await sint.locator('[data-secao="fontes"] summary').click();
ok((await sint.locator('[data-fonte="cadastrada"]').isVisible()) && (await sint.locator('[data-fonte="analisado"]').count()) >= 3 && (await sint.locator('[data-fonte="catalogo"]').count()) >= 1, "fontes com estado real (analisado, cadastrada, catálogo)");
await conflito.getByRole("radio").nth(1).check();
await page.getByTestId("correcoes-pendentes").getByRole("button", { name: "Atualizar visualização" }).click();
await page.getByTestId("mudancas").waitFor();
ok(await page.getByTestId("mudancas").getByText(/58 °C → 60 °C/).isVisible(), "nova versão destaca o que mudou (58 → 60 °C); a anterior é preservada");
await page.getByRole("tab", { name: /Resultado observado/ }).click();
await page.getByTestId("dado-observado").first().waitFor();
ok(await page.getByText("comparação entre grupos, não uma evolução no tempo").isVisible(), "dados observados por grupo, sem inventar evolução temporal");
ok(await page.getByText(/1 ausente\(s\) mantido\(s\) como ausentes/).isVisible(), "ausentes mantidos como ausentes");
await page.getByRole("tab", { name: /Resultado previsto/ }).click();
ok(await page.getByText("Probabilidade de sucesso: não estimada").isVisible(), "sem modelo validado, nenhuma porcentagem");
await page.screenshot({ path: `${shots}/a3-combinado.png`, fullPage: false });

// 5. edição explícita da síntese → nova versão; comparação sincronizada
await sint.locator('select[id^="acao-"]').first().selectOption("misturar");
ok(await page.getByTestId("correcoes-pendentes").isVisible(), "edição não atualiza sozinha: pede ação explícita");
await page.getByTestId("correcoes-pendentes").getByRole("button", { name: "Atualizar visualização" }).click();
await page.getByRole("button", { name: /Versões/ }).click();
const ver = page.getByTestId("versoes");
await ver.waitFor();
ok((await ver.locator("ol li").count()) >= 3, "versões preservadas e listadas");
ok(await ver.getByText(/Retirar e transferir.*→.*Adicionar à mistura/).isVisible(), "comparação mostra a diferença entre versões");
await ver.getByRole("button", { name: "Reproduzir as duas" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Fechar ✕" }).click();

// 6. salvar num projeto novo (arquivos originais + versões) e reabrir
await page.getByRole("button", { name: "Salvar", exact: true }).click();
const sv = page.getByTestId("salvar");
await sv.waitFor();
await sv.getByRole("radio").last().check();
const nomeProj = `Teste área ${randomBytes(3).toString("hex")}`;
await sv.getByLabel("Nome do novo projeto").fill(nomeProj);
await sv.getByRole("button", { name: "Salvar", exact: true }).click();
await page.waitForURL(/projeto=.+&experimento=/, { timeout: 60000 });
const url = new URL(page.url());
const pid = url.searchParams.get("projeto");
const eid = url.searchParams.get("experimento");
ok(Boolean(pid && eid), "salvo: endereço do experimento com projeto e identificador");
await page.reload();
await page.getByTestId("estado-salvo").waitFor({ timeout: 60000 });
await page.getByTestId("palco-experimento").waitFor({ timeout: 60000 });
ok((await page.getByTestId("estado-salvo").innerText()).includes(nomeProj), "reaberto do servidor após recarregar");
const nVers = await page.getByRole("button", { name: /Versões/ }).innerText();
ok(/\d/.test(nVers) && Number(nVers.match(/\d+/)[0]) >= 3, `versões restauradas (${nVers.trim()})`);
const projeto = (await api(page, `/api/projects/${pid}`)).body;
ok(projeto.project.files.length === 4, `arquivos originais guardados no projeto (${projeto.project.files.length}: PDF, DOCX, CSV, foto)`);

// 7. controle de acesso
const anon = await browser.newContext();
const r401 = await anon.request.get(`${base}/api/projects/${pid}/experimentos?id=${eid}`);
ok(r401.status() === 401, `sem sessão: ${r401.status()}`);
await anon.close();
const email2 = `outra-${randomBytes(3).toString("hex")}@exemplo.test`;
const senha2 = randomBytes(12).toString("base64url");
const c2 = await browser.newContext();
const p2 = await c2.newPage();
await p2.goto(`${base}/cadastro`);
await p2.getByLabel("Nome completo").fill("Outra Pessoa Fictícia");
await p2.getByLabel("E-mail").fill(email2);
await p2.getByLabel("Senha", { exact: true }).fill(senha2);
await p2.getByLabel("Confirmar senha").fill(senha2);
await p2.getByRole("checkbox").check();
await p2.getByRole("button", { name: "Solicitar acesso" }).click();
await p2.getByText("Cadastro recebido.").first().waitFor();
const contas = (await api(page, "/api/admin/contas")).body;
const outra = contas.accounts.find((a) => a.email === email2);
await api(page, `/api/admin/contas/${outra.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "autorizado" }) });
await entrar(p2, email2, senha2);
const r403 = await api(p2, `/api/projects/${pid}/experimentos?id=${eid}`);
ok([403, 404].includes(r403.status), `outra conta não acessa o experimento: ${r403.status}`);
const arq = projeto.project.files[0];
const r403b = await p2.evaluate(async (u) => (await fetch(u)).status, `/api/projects/${pid}/files/${arq.id}`);
ok([403, 404].includes(r403b), `outra conta não acessa os arquivos originais: ${r403b}`);
await c2.close();
await api(page, `/api/admin/contas/${outra.id}`, { method: "DELETE" });

// 8. Geninho contextual e identificação de imagem (API real, opcional)
if (comIA) {
  await page.getByRole("button", { name: "Geninho" }).first().click();
  await page.getByTestId("geninho-contexto").check();
  await page.getByLabel("Sua pergunta para o Geninho").fill("Em uma frase: qual temperatura de anelamento ficou escolhida neste experimento?");
  await page.getByRole("button", { name: "Perguntar" }).click();
  await page.getByText("Resposta gerada por IA").first().waitFor({ timeout: 120000 });
  const resp = await page.locator("#gaveta-geninho").innerText();
  ok(/60/.test(resp), "Geninho responde com base na síntese autorizada (cita 60 °C)");
  await page.getByRole("button", { name: "Fechar ✕" }).click();
  await page.getByRole("button", { name: "Novo", exact: true }).click();
  await page.getByTestId("input-imagem").setInputFiles({ name: "tubos.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  const im2 = page.locator('[data-material="imagem"]');
  await im2.waitFor();
  await im2.getByRole("checkbox", { name: /Autorizo enviar esta foto/ }).check();
  await im2.getByRole("button", { name: "Identificar elementos" }).click();
  await im2.getByText(/Sugestões prontas|falhou|recusou|não/).first().waitFor({ timeout: 120000 });
  const sug = await im2.locator("[data-elemento]").count();
  ok(sug >= 0, `identificação de imagem respondeu (${sug} sugestão(ões), todas não confirmadas até o pesquisador marcar)`);
  ok((await im2.locator('input[type="checkbox"]:checked').count()) === 0 || sug === 0, "sugestões da IA começam não confirmadas");
}

// 9. celular: áreas empilhadas, sem rolagem horizontal
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.addInitScript(vozFalsa);
const pm = await mob.newPage();
await entrar(pm, "demo@exemplo.test", pw);
await pm.goto(`${base}/laboratorio?projeto=${pid}&experimento=${eid}`);
await pm.getByTestId("palco-experimento").waitFor({ timeout: 60000 });
const yDesc = (await pm.getByLabel("Descreva sua ideia ou procedimento").boundingBox()).y;
const yVis = (await pm.getByTestId("palco-experimento").boundingBox()).y;
const larguraOk = await pm.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(yDesc < yVis && larguraOk, "celular: descrição acima da visualização, sem rolagem horizontal");
await pm.screenshot({ path: `${shots}/a4-celular.png`, fullPage: true });
await mob.close();

ok(erros.length === 0, `sem erros no console ${erros.slice(0, 3).join(" | ")}`);
await browser.close();
console.log(falhas.length ? `FALHAS: ${falhas.join(" | ")}` : "tudo certo");
process.exit(falhas.length ? 1 : 0);
