import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O envio de e-mail, com o serviço simulado.
 *
 * Sem chave não dá para exercitar isso pela tela, mas o que precisa estar certo é o formato do
 * pedido e, principalmente, a MENSAGEM de cada falha: "não foi possível enviar" não ajuda ninguém
 * a descobrir que o serviço está em modo de teste.
 */
const chaveOriginal = process.env.RESEND_API_KEY;
const remetenteOriginal = process.env.EMAIL_REMETENTE;

async function carregar() {
  vi.resetModules();
  return import("@/lib/email/enviar");
}

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_REMETENTE;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (chaveOriginal === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = chaveOriginal;
  if (remetenteOriginal === undefined) delete process.env.EMAIL_REMETENTE;
  else process.env.EMAIL_REMETENTE = remetenteOriginal;
});

const resposta = (status: number, corpo: unknown) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => corpo } as unknown as Response);

describe("estado do envio de e-mail", () => {
  it("sem chave, diz que não está configurado e por quê", async () => {
    const { estadoEmail } = await carregar();
    const e = estadoEmail();
    expect(e.configurado).toBe(false);
    expect(e.motivo).toMatch(/RESEND_API_KEY/);
  });

  it("com o remetente de teste, avisa que só entrega para a dona da conta", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const { estadoEmail } = await carregar();
    const e = estadoEmail();
    expect(e.configurado).toBe(true);
    expect(e.soParaDonaDaConta).toBe(true);
    expect(e.motivo).toMatch(/só entrega para o e-mail da conta/i);
  });

  it("com domínio próprio, não há essa restrição", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_REMETENTE = "GenoLab <caderno@genoevidence.com>";
    const { estadoEmail } = await carregar();
    const e = estadoEmail();
    expect(e.soParaDonaDaConta).toBe(false);
    expect(e.motivo).toBeUndefined();
  });
});

describe("enviar", () => {
  it("sem chave, nem tenta — e devolve o motivo", async () => {
    const f = resposta(200, { id: "x" });
    vi.stubGlobal("fetch", f);
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("monta o pedido no formato do serviço", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const f = resposta(200, { id: "abc-123" });
    vi.stubGlobal("fetch", f);
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "pessoa@exemplo.test", assunto: "Caderno", texto: "corpo", html: "<p>corpo</p>" });
    expect(r).toEqual({ ok: true, id: "abc-123" });

    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_teste");
    const corpo = JSON.parse(init.body as string);
    expect(corpo.to).toEqual(["pessoa@exemplo.test"]);
    expect(corpo.subject).toBe("Caderno");
    expect(corpo.text).toBe("corpo");
    expect(corpo.html).toBe("<p>corpo</p>");
  });

  it("assunto gigante é cortado, não quebra o envio", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const f = resposta(200, { id: "x" });
    vi.stubGlobal("fetch", f);
    const { enviarEmail, LIMITE_ASSUNTO } = await carregar();
    await enviarEmail({ para: "a@b.test", assunto: "a".repeat(500), texto: "t" });
    const corpo = JSON.parse((f.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(corpo.subject.length).toBe(LIMITE_ASSUNTO);
  });

  it("modo de teste do serviço: a mensagem explica, em vez de dizer só “falhou”", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", resposta(403, { message: "You can only send testing emails to your own email address" }));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "outra@exemplo.test", assunto: "s", texto: "t" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toMatch(/modo de teste/i);
    expect(r.motivo).toMatch(/outra@exemplo\.test/);
    expect(r.motivo).toMatch(/verificar um domínio/i);
  });

  it("chave recusada é dita como chave recusada", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", resposta(401, { message: "Invalid API key" }));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok === false && r.motivo).toMatch(/chave do serviço de e-mail foi recusada/i);
  });

  it("limite atingido é diferente de erro", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", resposta(429, {}));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok === false && r.motivo).toMatch(/limite de envios/i);
  });

  it("serviço fora do ar é dito como instabilidade, não como culpa da pessoa", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", resposta(503, {}));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok === false && r.motivo).toMatch(/instável/i);
  });

  it("sem rede, diz que o servidor não alcançou o serviço", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok === false && r.motivo).toMatch(/não foi possível falar com o serviço/i);
  });

  it("resposta sem confirmação não é tratada como sucesso", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    vi.stubGlobal("fetch", resposta(200, {}));
    const { enviarEmail } = await carregar();
    const r = await enviarEmail({ para: "a@b.test", assunto: "s", texto: "t" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toMatch(/sem confirmar o envio/i);
  });
});
