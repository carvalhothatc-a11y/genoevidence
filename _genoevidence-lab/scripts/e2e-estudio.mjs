// Teste ponta a ponta do estúdio (instância de demonstração, conta e dados fictícios). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { readFileSync, statSync } from "node:fs";
const [base, credFile, shots] = process.argv.slice(2);
const pw = readFileSync(credFile, "utf8").trim();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 940 }, acceptDownloads: true });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && erros.push("console: " + m.text()));
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && erros.push(m));
const descrever = async (texto) => {
  await page.locator("#prompt-ideia").fill(texto);
  await page.getByRole("button", { name: "Interpretar" }).click();
  await page.getByTestId("palco").waitFor();
};

await page.goto(`${base}/entrar`);
await page.getByLabel("E-mail").fill("demo@exemplo.test");
await page.getByLabel("Senha", { exact: true }).fill(pw);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
await page.goto(`${base}/projetos`);
if (!(await page.getByRole("link", { name: /exemplo/i }).count())) {
  await page.getByRole("button", { name: /Criar projeto de exemplo/ }).click();
  await page.waitForURL(/\/projetos\/p_/, { timeout: 60000 });
}

await page.goto(`${base}/laboratorio/bancada`);
await page.getByRole("paragraph").filter({ hasText: "Descreva o que você quer fazer." }).waitFor();
ok(await page.getByPlaceholder("Descreva sua ideia ou procedimento").isVisible(), "barra “Descreva sua ideia ou procedimento” com microfone e anexo");

// 1. descrição livre → visualização
await descrever("Tirei o primer de um lado, acrescentei no DNA, foi no plasmídeo, e daí vou inserir no DNA da bactéria.");
const passos = await page.locator("[data-passo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-passo")));
ok(JSON.stringify(passos) === JSON.stringify(["pipetar", "anelar", "inserir_vetor", "transformar"]), `etapas geradas: ${passos.join(" → ")}`);
ok((await page.locator('[data-testid="previsibilidade"] tbody tr').count()) === 4, "tabela de previsibilidade com uma linha por etapa");
const pcts = await page.locator("[data-pct]").evaluateAll((els) => els.map((e) => e.getAttribute("data-pct")));
ok(pcts.every((x) => x === "sem"), "nenhuma porcentagem sem fonte (todas “— %”)");
await page.locator('[data-passo="inserir_vetor"]').click();
await page.waitForTimeout(300);
ok((await page.getByTestId("palco").getAttribute("data-acao")) === "inserir_vetor", "clicar no processo leva o palco à inserção no plasmídeo");
ok((await page.locator('[data-testid="previsibilidade"] tr[aria-current="step"]').getAttribute("data-linha")) === "inserir_vetor", "a linha da tabela acompanha a etapa atual");
await page.locator('[data-passo="transformar"]').click();
ok(/cromossomo/.test(await page.getByTestId("detalhe-visual").innerText()), "ponto de atenção: plasmídeo × integração no cromossomo");
await page.screenshot({ path: `${shots}/e2e-1-visual.png` });
// imagem
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar imagem" }).click()]);
const destino = `${shots}/processo.png`;
await dl.saveAs(destino);
const buf = readFileSync(destino);
ok(buf.subarray(1, 4).toString() === "PNG" && statSync(destino).size > 20000, `imagem PNG gerada (${Math.round(statSync(destino).size / 1024)} KB)`);
// correção da interpretação
await page.locator('[data-testid="detalhe-visual"] select').selectOption("transfectar");
await page.waitForTimeout(300);
ok((await page.getByTestId("palco").getAttribute("data-acao")) === "transfectar", "a interpretação pode ser corrigida e a cena muda");

// busca opcional no PubMed (somente termos fixos)
await page.getByRole("button", { name: "Buscar referências no PubMed" }).click();
await page.getByText(/Encontradas por busca|Nada encontrado|PubMed não respondeu/).waitFor({ timeout: 20000 });
const links = await page.locator('[data-testid="detalhe-visual"] a[target="_blank"]').count();
ok(links > 0, `PubMed: ${links} artigo(s) encontrados, marcados como não lidos`);

// 2. técnica sem módulo também gera visual
await descrever("Vou usar CRISPR para nocautear o gene TP53 em células HEK293 e depois sequenciar.");
const p2 = await page.locator("[data-passo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-passo")));
ok(p2[0] === "editar_crispr" && p2.includes("sequenciar"), `CRISPR gera visual: ${p2.join(" → ")}`);
await page.screenshot({ path: `${shots}/e2e-2-crispr.png` });

// 3. PCR com parâmetros → conferir → bancada 3D sincronizada
await descrever(
  "Quero amplificar o gene GAPDH de cDNA de 6 amostras. Reação de 25 µL com MgCl2 1,5 mM, dNTPs 200 µM cada, primers 0,4 µM e 1,25 U de Taq. Desnaturação inicial a 95 °C por 3 min; 35 ciclos de desnaturação a 95 °C por 30 s, anelamento a 58 °C por 30 s e extensão a 72 °C por 60 s; extensão final de 5 min a 72 °C. Tm dos primers de 62 °C. Amplicon de 450 pb. Vou incluir controle negativo. Gel de agarose 1,5% com marcador.",
);
ok((await page.locator('[data-testid="previsibilidade"] [data-estado]').count()) > 0, "avaliação por regras da PCR aparece na tabela");
await page.getByRole("button", { name: /Conferir parâmetros da PCR/ }).click();
await page.getByText("Confira o plano antes de visualizar.").waitFor();
ok((await page.locator("#plano-programa-anel-tempC").inputValue()) === "58", "plano: anelamento 58 °C");
await page.locator("#ideia-projeto").selectOption({ index: 1 });
await page.getByRole("button", { name: "Confirmar plano e visualizar" }).click();
await page.locator("[data-etapa-atual]").waitFor();
await page.locator('[data-etapa="ciclagem"]').click();
await page.waitForTimeout(1500);
const etapa = await page.locator("[data-etapa-atual]").getAttribute("data-etapa-atual");
const foco = await page.locator("[data-foco]").first().getAttribute("data-foco");
ok(etapa === "ciclagem" && foco === "termociclador", `bancada 3D sincronizada (etapa ${etapa}, foco ${foco})`);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/e2e-3-bancada.png` });
await page.getByRole("button", { name: "Editar condição" }).click();
await page.locator("#ed-programa-anel-tempC").fill("50");
await page.locator("#ed-programa-anel-tempC").blur();
await page.getByRole("button", { name: /cria a versão 2/ }).click();
await page.getByTestId("o-que-mudou").waitFor();
ok(/58 °C → 50 °C/.test(await page.getByTestId("o-que-mudou").innerText()), "nova versão explica o que mudou (58 → 50 °C)");
await page.getByRole("button", { name: "Avaliação completa" }).click();
await page.getByTestId("previsoes").waitFor();
ok(await page.locator('[data-previsao="suspensa"]').isVisible(), "previsão quantitativa suspensa (sem modelo validado)");
await page.screenshot({ path: `${shots}/e2e-4-avaliacao.png` });
await page.getByRole("button", { name: "Fechar ✕" }).click();
await page.getByRole("button", { name: "Comparar" }).click();
await page.getByRole("button", { name: "Duplicar como Cenário B" }).click();
const idB = await page.locator("[id^='cmp-c_'][id$='-programa-ciclos']").last().getAttribute("id");
await page.locator(`#${idB}`).fill("40");
await page.locator(`#${idB}`).blur();
await page.getByRole("button", { name: /cria a versão 2/ }).last().click();
await page.getByTestId("comparacao").waitFor();
ok(/Duração do programa/.test(await page.getByTestId("comparacao").innerText()), "comparação A × B com diferença calculada");
await page.getByRole("button", { name: "Fechar ✕" }).click();
await page.getByRole("button", { name: "Salvar no projeto" }).click();
await page.getByText(/Salvo em/).waitFor();
ok(true, "cenários e versões salvos no projeto");

console.log(erros.length ? `FALHAS/ERROS: ${erros.join(" | ")}` : "tudo certo");
await browser.close();
