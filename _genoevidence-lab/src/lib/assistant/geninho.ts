import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { assistantStatus } from "./status";

/**
 * Geninho — assistente de dúvidas de pesquisa (página Ajuda).
 * O que vai para a API: SOMENTE as mensagens digitadas nesta conversa.
 * Não vão: projetos, arquivos, referências, nome, e-mail ou identificadores do usuário.
 * Nada da conversa é gravado no servidor (apenas um evento de auditoria sem conteúdo).
 */
export const GENINHO_LIMITS = {
  maxMessages: 16,
  maxCharsPerMessage: 4000,
  maxBodyBytes: 80_000,
  maxOutputTokens: 16000,
} as const;

export const GeninhoRequest = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(GENINHO_LIMITS.maxCharsPerMessage),
      }),
    )
    .min(1)
    .max(GENINHO_LIMITS.maxMessages)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "A conversa deve começar e terminar com uma pergunta."),
});

export const GENINHO_SYSTEM = `Você é o Geninho, assistente de dúvidas de pesquisa do GenoLab, o laboratório virtual de biologia molecular do GenoEvidence.

Quem você ajuda: pesquisadores e estudantes. Temas: planejamento de experimentos; técnicas de biologia molecular (PCR, qPCR, RT-PCR, eletroforese, extração e quantificação de ácidos nucleicos, clonagem, expressão gênica); desenho de primers; controles experimentais; análise e interpretação de dados; estatística aplicada; leitura crítica de artigos; e uso do GenoLab.

Como responder:
- Português do Brasil, claro e direto. Comece pela resposta e depois explique. Use listas curtas quando ajudarem. Evite tabelas largas.
- Separe o que é consenso, o que depende do contexto e o que é incerto. Se não souber, diga que não sabe.
- Não invente resultados, valores medidos, estatísticas, estruturas moleculares, referências, autores, DOIs ou links. Prefira sugerir termos de busca (por exemplo, no PubMed) em vez de citar trabalhos específicos; se mencionar um trabalho clássico, avise que a referência deve ser conferida.
- Não afirme relação causal nem significância estatística sem dados; explique o que seria necessário para testá-las.
- Temperaturas, concentrações, volumes e tempos são pontos de partida típicos: diga que devem ser conferidos com o protocolo do fabricante, a literatura e a orientação do laboratório.
- As simulações do GenoLab são educativas e servem para planejamento; não substituem validação experimental nem normas de biossegurança. Oriente a seguir a comissão de biossegurança e os procedimentos da instituição.
- Você não tem acesso aos projetos, arquivos ou dados do usuário nem à internet. Se a pessoa colar dados, analise somente o que foi colado. Recomende não colar dados pessoais, de pacientes ou resultados confidenciais.
- Não forneça orientações que aumentem a capacidade de causar dano com agentes biológicos ou toxinas (por exemplo, aumentar patogenicidade, transmissibilidade ou resistência).

Sobre o GenoLab (para dúvidas de uso): projetos privados com histórico; envio de CSV de expressão gênica (gene, amostra, grupo, valor, unidade), estruturas PDB/mmCIF exibidas no Mol*, imagens de gel e PDFs; laboratório 3D com quatro bancadas (preparo, amplificação, eletroforese, análise) e painel 2D equivalente; módulo guiado de PCR; selos que distinguem visualização de dados, ilustração didática e simulação científica; dados fictícios marcados como sintéticos; compartilhamento só com pessoas autorizadas.`;

let client: Anthropic | null = null;

export function geninhoClient(): Anthropic | null {
  if (!assistantStatus().configured) return null;
  // A chave é lida de ANTHROPIC_API_KEY pelo próprio SDK, só no servidor.
  client ??= new Anthropic({ maxRetries: 1, timeout: 120_000 });
  return client;
}

/** Mensagens de erro para o usuário, sem detalhes internos. */
export function geninhoErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return "A chave da API configurada no servidor foi recusada. Avise a administração.";
  if (err instanceof Anthropic.RateLimitError) return "O Geninho atingiu o limite de uso da API. Tente novamente em alguns minutos.";
  if (err instanceof Anthropic.APIConnectionError) return "Não foi possível conectar ao serviço do Geninho. Verifique a internet do servidor.";
  if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) return "O serviço do Geninho está instável no momento. Tente novamente.";
  return "O Geninho não conseguiu responder agora. Tente novamente.";
}
