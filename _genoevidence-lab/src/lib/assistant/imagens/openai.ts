import "server-only";

/**
 * Geração de imagem educativa pela API de imagens da OpenAI.
 *
 * Conferido na documentação em 2026-10-11:
 *   POST https://api.openai.com/v1/images/generations
 *   corpo:    { model, prompt, size, quality, output_format, n }
 *   resposta: { data: [{ b64_json, revised_prompt? }] }
 *   modelos:  gpt-image-2.5-flare (geração rápida) e gpt-image-2.5-sunburst (edição precisa)
 *   tamanhos: 1024x1024, 1536x1024, 1024x1536
 *   qualidade: low, medium, high, xhigh, max, auto
 *
 * Os modelos de imagem podem exigir a verificação da organização no console da OpenAI. Sem ela, a
 * própria API recusa — e o erro é repassado como está, sem inventar uma imagem no lugar.
 *
 * A chave fica só no servidor. Nenhuma imagem é guardada: ela volta no fluxo da resposta.
 */

export const IMAGEM_LIMITES = {
  maxPrompt: 1200,
  tempoMs: 120_000,
  /** Imagens por pessoa a cada 24 h. Cada uma é cobrada pela OpenAI. */
  porDia: 20,
} as const;

export const TAMANHOS = ["1024x1024", "1536x1024", "1024x1536"] as const;
export type Tamanho = (typeof TAMANHOS)[number];

export const QUALIDADES = ["low", "medium", "high"] as const;
export type Qualidade = (typeof QUALIDADES)[number];

const MODELO_PADRAO = "gpt-image-2.5-flare";

/** Estado REAL da integração de imagens (sem expor a chave). */
export function imagensStatus() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return {
    configured: Boolean(key),
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || MODELO_PADRAO,
    reason: key ? undefined : "A variável OPENAI_API_KEY não está definida no servidor.",
  };
}

export type ImagemGerada = {
  /** PNG em base64, como a API devolve. */
  b64: string;
  /** Texto que o modelo de fato usou, quando ele o reescreve. */
  promptUsado?: string;
  modelo: string;
  tamanho: Tamanho;
  qualidade: Qualidade;
};

export type ResultadoImagem = { ok: true; imagem: ImagemGerada } | { ok: false; motivo: string };

/**
 * Quando a OpenAI responde que a conta está sem crédito, guardamos isso por um tempo: não adianta
 * oferecer a ferramenta e falhar em toda pergunta. Some sozinho, para voltar a funcionar assim que
 * o crédito entrar, sem precisar reiniciar o servidor.
 */
const PAUSA_SEM_CREDITO_MS = 30 * 60_000;
let semCreditoAte = 0;

/** A geração está disponível agora? Falso também quando a conta ficou sem crédito há pouco. */
export function imagensDisponiveis(): { ok: boolean; motivo?: string } {
  if (!imagensStatus().configured) return { ok: false, motivo: "Chave da OpenAI não configurada neste servidor." };
  if (Date.now() < semCreditoAte) return { ok: false, motivo: "A conta da OpenAI ficou sem crédito. A geração volta sozinha assim que houver saldo." };
  return { ok: true };
}

type RespostaOpenAI = {
  data?: { b64_json?: string; revised_prompt?: string }[];
  error?: { message?: string; type?: string; code?: string };
};

/**
 * Gera UMA imagem. Devolve `ok: false` com o motivo quando falha — nunca um espaço reservado nem
 * uma imagem de outro lugar.
 */
export async function gerarImagem(prompt: string, opcoes?: { tamanho?: Tamanho; qualidade?: Qualidade }): Promise<ResultadoImagem> {
  const st = imagensStatus();
  if (!st.configured) return { ok: false, motivo: "A geração de imagens não está configurada neste servidor." };

  const texto = prompt.trim().slice(0, IMAGEM_LIMITES.maxPrompt);
  if (texto.length < 10) return { ok: false, motivo: "A descrição da imagem está curta demais." };
  const tamanho = opcoes?.tamanho && TAMANHOS.includes(opcoes.tamanho) ? opcoes.tamanho : "1024x1024";
  const qualidade = opcoes?.qualidade && QUALIDADES.includes(opcoes.qualidade) ? opcoes.qualidade : "medium";

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}` },
      body: JSON.stringify({ model: st.model, prompt: texto, size: tamanho, quality: qualidade, output_format: "png", n: 1 }),
      signal: AbortSignal.timeout(IMAGEM_LIMITES.tempoMs),
      cache: "no-store",
    });
  } catch (e) {
    const abortou = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, motivo: abortou ? "A geração passou do tempo limite." : "Não foi possível falar com a OpenAI agora." };
  }

  let corpo: RespostaOpenAI = {};
  try {
    corpo = (await res.json()) as RespostaOpenAI;
  } catch {
    return { ok: false, motivo: `A OpenAI devolveu uma resposta inesperada (${res.status}).` };
  }

  if (!res.ok) {
    if (res.status === 429 && /quota|billing|credit/i.test(corpo.error?.message ?? "")) semCreditoAte = Date.now() + PAUSA_SEM_CREDITO_MS;
    return { ok: false, motivo: mensagemDeErro(res.status, corpo.error) };
  }
  semCreditoAte = 0;

  const b64 = corpo.data?.[0]?.b64_json;
  if (!b64) return { ok: false, motivo: "A OpenAI respondeu, mas não veio imagem nenhuma." };
  return { ok: true, imagem: { b64, promptUsado: corpo.data?.[0]?.revised_prompt, modelo: st.model, tamanho, qualidade } };
}

/** Mensagem útil para quem usa, sem expor detalhes internos nem a chave. */
function mensagemDeErro(status: number, erro?: RespostaOpenAI["error"]): string {
  const msg = erro?.message ?? "";
  if (status === 401) return "A chave da OpenAI foi recusada. Avise a administração.";
  if (status === 403 && /verif/i.test(msg)) return "A OpenAI exige a verificação da organização para usar os modelos de imagem. Faça a verificação no console da OpenAI (Settings → Organization).";
  if (status === 403) return "A conta da OpenAI não tem permissão para gerar imagens com este modelo.";
  if (status === 429 && /quota|billing|credit/i.test(msg)) return "A conta da OpenAI está sem crédito ou atingiu o limite de gasto.";
  if (status === 429) return "Muitos pedidos à OpenAI em pouco tempo. Tente de novo em alguns instantes.";
  if (status === 400 && /model/i.test(msg)) return `O modelo de imagem configurado não foi aceito pela OpenAI${msg ? `: ${msg.slice(0, 160)}` : "."}`;
  if (status === 400) return `A OpenAI recusou o pedido${msg ? `: ${msg.slice(0, 200)}` : "."}`;
  if (status >= 500) return "O serviço de imagens da OpenAI está instável agora.";
  return `A OpenAI respondeu com erro (${status}).`;
}
