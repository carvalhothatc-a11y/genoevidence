// Caderno: ditar o registro por voz e enviar o dia para o próprio e-mail.
// Uso: node scripts/e2e-caderno-email.mjs <base> <arquivo-senha-demo> <pasta-de-capturas>
// NÃO envia e-mail de verdade: confere o estado honesto, o alternativo e o destinatário.
// Instância de demonstração apenas (contas fictícias). Não imprime credenciais.
import { chromium } from "@playwright/test";
import { contextoAutenticado } from "./_sessao.mjs";

const [base, credFile, shots] = process.argv.slice(2);
const falhas = [];
const ok = (c, m) => (console.log(`${c ? "✔" : "✖"} ${m}`), !c && falhas.push(m));

const browser = await chromium.launch();
const ctx = await contextoAutenticado(browser, base, credFile, {
  contexto: { viewport: { width: 1280, height: 950 }, permissions: [] },
});
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  // Reconhecedor de voz FALSO. O Chromium sem interface não traz reconhecimento, e o que
  // precisamos testar é o NOSSO código — que o texto ditado seja acrescentado, que apareça
  // "gravando", que o microfone não ligue sozinho — não o motor de fala do navegador.
  window.__falas = [];
  class ReconhecedorFalso {
    constructor() {
      window.__ultimoReconhecedor = this;
      this.lang = "";
      this.interimResults = false;
      this.continuous = false;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
    }
    start() {
      window.__microfoneLigado = true;
    }
    stop() {
      window.__microfoneLigado = false;
      this.onend?.();
    }
  }
  window.SpeechRecognition = ReconhecedorFalso;
  // Permite ao teste "falar": entrega um resultado final como o navegador faria.
  window.__falar = (texto) => {
    const r = window.__ultimoReconhecedor;
    r?.onresult?.({ resultIndex: 0, results: Object.assign([Object.assign([{ transcript: texto }], { isFinal: true })], { length: 1 }) });
  };
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));
let sondando = false; // ligado em volta das sondas que provocam 502/404 de propósito
p.on("console", (m) => {
  if (m.type() !== "error") return;
  const txt = m.text();
  if (sondando && /status of (404|502)/.test(txt)) return;
  erros.push(txt.slice(0, 140));
});

// 1. O botão de ditar aparece no formulário
{
  await p.goto(`${base}/caderno`);
  await p.getByTestId("caderno").waitFor({ timeout: 30000 });
  await p.getByTestId("registrar-dia").click();
  await p.getByTestId("form-caderno").waitFor();
  const ditar = p.getByTestId("ditar");
  await ditar.waitFor({ timeout: 15000 });
  const texto = await p.getByTestId("form-caderno").innerText();
  ok(/Falar em vez de escrever/.test(await ditar.innerText()), "oferece falar em vez de escrever");
  ok(/não guarda o áudio/i.test(texto), "diz que o GenoLab não guarda o áudio");
  ok(/Google/.test(texto), "avisa ANTES de gravar que no Chrome o áudio passa pelo Google");
  ok(/desliga sozinho em 2 minutos/.test(texto), "diz que o microfone desliga sozinho");
  ok(!/gravando/i.test(texto), "não está gravando antes de a pessoa clicar");
  ok((await p.evaluate(() => window.__microfoneLigado)) !== true, "o microfone NÃO foi ligado só por abrir o formulário");
  await p.screenshot({ path: `${shots}/caderno-email-1-ditado.png` });
}

// 1b. Ditar acrescenta ao que já está escrito, e nunca substitui
{
  await p.getByLabel("O que você fez").fill("Comecei o dia montando o gel.");
  await p.getByTestId("ditar").click();
  ok((await p.evaluate(() => window.__microfoneLigado)) === true, "o microfone liga SÓ quando a pessoa clica");
  ok(/gravando/i.test(await p.getByTestId("form-caderno").innerText()), "a tela mostra que está gravando");
  await p.evaluate(() => window.__falar("Depois corri as amostras e o marcador ficou fraco"));
  await p.getByTestId("ditar").click(); // parar
  await p.waitForTimeout(800);
  const campo = await p.getByLabel("O que você fez").inputValue();
  ok(/Comecei o dia montando o gel\./.test(campo), "o que estava escrito continua lá");
  ok(/marcador ficou fraco/.test(campo), "e o ditado foi acrescentado");
  ok((await p.evaluate(() => window.__microfoneLigado)) === false, "ao parar, o microfone desliga");
  await p.screenshot({ path: `${shots}/caderno-email-1b-ditado.png` });
}

// 2. Salvar o dia
let registroId = "";
{
  await p.getByLabel("O que você fez").fill("Preparei o gel a 1,5% e corri as amostras. O marcador ficou fraco.");
  await p.getByTestId("salvar-caderno").click();
  await p.getByTestId("registro").first().waitFor({ timeout: 30000 });
  const r = await p.evaluate(async () => {
    const d = await (await fetch("/api/caderno")).json();
    return d.registros?.[0]?.id ?? "";
  });
  registroId = r;
  ok(Boolean(registroId), "o dia foi registrado");
}

// 3. Abrir o dia mostra as opções de envio, com o estado REAL do servidor
{
  await p.getByRole("button", { name: "Ver o dia" }).first().click();
  const bloco = p.getByTestId("enviar-email");
  await bloco.waitFor({ timeout: 30000 });
  await p.waitForTimeout(1500);

  const estado = await p.evaluate(async () => (await (await fetch("/api/caderno/estado-email")).json()));
  const texto = await bloco.innerText();

  if (estado.configurado) {
    ok((await p.getByTestId("enviar-agora").count()) > 0, "servidor configurado: oferece enviar de verdade");
    ok((await p.getByTestId("abrir-no-email").count()) === 0, "e não mostra o alternativo ao mesmo tempo");
  } else {
    ok((await p.getByTestId("abrir-no-email").count()) > 0, "servidor SEM envio: oferece abrir o próprio e-mail");
    ok((await p.getByTestId("enviar-agora").count()) === 0, "e NÃO mostra um botão que fingiria enviar");
    ok(/não está ligado neste servidor/.test(texto), `diz o estado real: ${texto.split("\n").find((l) => /servidor/.test(l))?.slice(0, 80)}`);
  }
  ok((await p.getByTestId("baixar-dia").count()) > 0, "dá para baixar o registro do dia");
  await p.screenshot({ path: `${shots}/caderno-email-2-opcoes.png` });
}

// 4. Sem envio configurado, a rota recusa dizendo o motivo — não falha em silêncio
{
  sondando = true;
  const r = await p.evaluate(async (id) => {
    const res = await fetch(`/api/caderno/${id}/enviar`, { method: "POST" });
    return { status: res.status, corpo: (await res.text()).slice(0, 220) };
  }, registroId);
  const estado = await p.evaluate(async () => (await (await fetch("/api/caderno/estado-email")).json()));
  if (estado.configurado) {
    ok([200, 502].includes(r.status), `com envio configurado, a rota responde (${r.status})`);
  } else {
    ok(r.status === 502 && /RESEND_API_KEY|não configurado/i.test(r.corpo), `recusa dizendo a causa: ${r.corpo.slice(0, 110)}`);
  }
}

// 5. O destinatário NUNCA vem do pedido — a rota ignora qualquer e-mail enviado no corpo
{
  const r = await p.evaluate(async (id) => {
    const res = await fetch(`/api/caderno/${id}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ para: "estranho@exemplo.com" }),
    });
    return { status: res.status, corpo: (await res.text()).slice(0, 200) };
  }, registroId);
  ok(!/estranho@exemplo\.com/.test(r.corpo), "um endereço de terceiro no pedido não vira destinatário");
}

// 6. Registro de outra pessoa não pode ser enviado
{
  const r = await p.evaluate(async () => {
    const res = await fetch("/api/caderno/r_naoexiste1234/enviar", { method: "POST" });
    return res.status;
  });
  ok(r === 404, `registro que não é seu não é enviado (${r})`);
  await p.waitForTimeout(300);
  sondando = false;
}

// 7. Sem sessão, nada
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const sts = await ap
    .evaluate(async ([b, id]) => {
      const a = await fetch(`${b}/api/caderno/estado-email`);
      const c = await fetch(`${b}/api/caderno/${id}/enviar`, { method: "POST" });
      return [a.status, c.status];
    }, [base, registroId])
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
