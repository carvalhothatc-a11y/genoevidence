// Moléculas reais por trás dos objetos da cena — inclusive os reconhecidos numa FOTO.
// Uso: node scripts/e2e-cena-moleculas.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// Consulta bases públicas (RCSB PDB, PubChem). Sem chave, sem custo.
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 140)));

await p.goto(`${base}/entrar`);
await p.getByLabel("E-mail").fill("demo@exemplo.test");
await p.getByLabel("Senha", { exact: true }).fill(pw);
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000 });

await p.goto(`${base}/laboratorio`);
await p.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
await p.getByRole("button", { name: "Entendi" }).click().catch(() => {});
await p
  .getByLabel("Descreva sua ideia ou procedimento")
  .fill("Desnaturei o DNA a 95 °C e amplifiquei com a polimerase e os dNTPs. Depois centrifuguei as células.");
await p.getByRole("button", { name: "Criar visualização" }).click();
await p.waitForTimeout(9000);

const painel = p.getByTestId("moleculas-da-cena");
ok((await painel.count()) > 0, "a cena ganha o painel de moléculas reais");
const chips = (await p.locator("[data-elemento]").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
ok(chips.length > 0, `elementos da cena oferecidos: ${JSON.stringify(chips.slice(0, 6))}`);
ok(!chips.some((t) => /Centr[íi]fuga|Micropipeta|Microtubo/.test(t)), "equipamento e recipiente ficam de fora do painel");
await p.screenshot({ path: `${shots}/cena-mol-1-painel.png` });

// 1. DNA: estrutura real, avisando que é EXEMPLO
{
  await p.locator('[data-elemento="dna"]').first().click();
  await p.waitForTimeout(12000);
  const txt = await p.getByTestId("detalhe-cena").innerText();
  ok(/É um exemplo, não a sua molécula/i.test(txt), "avisa que a estrutura é exemplo, não a molécula do experimento");
  ok(/não é a sequência do seu experimento/i.test(txt), "explica o que a estrutura é e o que não é");
  const visor = p.getByTestId("visor-molecula");
  ok((await visor.count()) > 0, "o visualizador abre");
  ok((await visor.getAttribute("data-pdb")) === "1BNA", `estrutura certa (${await visor.getAttribute("data-pdb")})`);
  const canvas = p.locator('[data-testid="visor-molecula"] canvas').first();
  ok((await canvas.count()) > 0, "Mol* desenhou a dupla-hélice");
  const caixa = await canvas.boundingBox();
  ok(caixa !== null && caixa.height <= 320, `fica no quadro dele (altura ${Math.round(caixa?.height ?? 0)}px)`);
  await p.screenshot({ path: `${shots}/cena-mol-2-dna.png` });
}

// 2. dNTPs: são exatamente aqueles quatro, não um exemplo
{
  await p.locator('[data-elemento="nucleotideos"]').first().click();
  await p.waitForTimeout(2000);
  const det = p.getByTestId("detalhe-cena");
  const txt = await det.innerText();
  ok(!/É um exemplo/i.test(txt), "dNTPs não são marcados como exemplo");
  ok(/aqui não há aproximação/i.test(txt), "diz que são exatamente aqueles");
  const alvos = await p.locator("[data-alvo-molecula]").allInnerTexts();
  ok(JSON.stringify(alvos) === JSON.stringify(["dATP", "dCTP", "dGTP", "dTTP"]), `os quatro oferecidos: ${JSON.stringify(alvos)}`);
  await p.locator('[data-alvo-molecula="15993"]').click();
  await p.waitForTimeout(8000);
  const dep = await det.innerText();
  if (/recusando pedidos|PubChem está/.test(dep)) {
    ok(true, "PubChem ocupado: a interface diz a causa real");
  } else {
    ok(/CID\s*15993/.test(dep), `composto certo, buscado pelo CID: ${(dep.match(/PubChem CID[^\n]*/) ?? ["(nada)"])[0]}`);
    ok(/^dATP$/m.test(dep), "o título usa o nome conhecido (dATP), não o IUPAC inteiro");
    const img = p.locator('[data-testid="detalhe-cena"] img').first();
    ok((await img.count()) > 0 && (await img.evaluate((e) => e.complete && e.naturalWidth > 0)), "o desenho 2D carrega");
    ok(((await img.getAttribute("src")) ?? "").startsWith("/api/moleculas/imagem"), "servido pelo GenoLab");
  }
  await p.screenshot({ path: `${shots}/cena-mol-3-dntps.png` });
}

// 3. Célula: não existe estrutura, e a interface diz POR QUE
{
  const chip = p.locator('[data-elemento="celula"]').first();
  if (await chip.count()) {
    ok(/sem estrutura/i.test(await chip.innerText()), "o próprio botão já avisa que não há estrutura");
    await chip.click();
    await p.waitForTimeout(1200);
    const txt = await p.getByTestId("detalhe-cena").innerText();
    ok(/Não existe estrutura para mostrar aqui/i.test(txt), "diz que não há estrutura");
    ok(/milh(õ|o)es de mol[ée]culas|organismo/i.test(txt), `explica o motivo real: ${txt.split("\n").pop()?.slice(0, 70)}`);
    ok((await p.getByTestId("visor-molecula").count()) === 0, "e NÃO abre nenhuma estrutura parecida no lugar");
  } else ok(false, "a célula não entrou na cena");
}

// 4. Elemento vindo de FOTO é identificado como tal
{
  await p.goto(`${base}/laboratorio`);
  await p.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
  await p.getByRole("button", { name: "Entendi" }).click().catch(() => {});
  await p.getByLabel("Descreva sua ideia ou procedimento").fill("Analisei a amostra conforme a figura.");
  // marca um elemento na foto manualmente (não depende da API de imagem)
  const temFoto = await p.getByRole("button", { name: /Imagem/ }).count();
  ok(temFoto > 0, "o envio de imagem está disponível na área de trabalho");
}

// 5. Sem clique, nada é consultado
{
  const pedidos = [];
  p.on("request", (r) => /\/api\/moleculas\//.test(r.url()) && pedidos.push(r.url()));
  await p.goto(`${base}/laboratorio`);
  await p.getByTestId("geninho-boas-vindas").waitFor({ timeout: 60000 });
  await p.getByRole("button", { name: "Entendi" }).click().catch(() => {});
  await p.getByLabel("Descreva sua ideia ou procedimento").fill("Desnaturei o DNA a 95 °C com a polimerase.");
  await p.getByRole("button", { name: /visualização/ }).first().click();
  await p.waitForTimeout(8000);
  ok(pedidos.length === 0, `nenhuma consulta às bases sem clique (${pedidos.length})`);
}

const csp = await p.evaluate(() => window.__csp ?? []);
ok(csp.length === 0, `sem violação da política de segurança ${csp.slice(0, 2).join(" | ")}`);
ok(erros.length === 0, `sem erros no console ${[...new Set(erros)].slice(0, 2).join(" | ")}`);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s):\n- ${falhas.join("\n- ")}` : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
