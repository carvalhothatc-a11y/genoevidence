import "server-only";
import { getRepository } from "@/lib/repo";
import { extrairArquivo } from "@/lib/materiais/extrair";
import { dividirEmTrechos, type Trecho } from "./trechos";
import type { FileRecord, Project } from "@/lib/domain/schemas";

/**
 * Os trechos citáveis de um projeto.
 *
 * Dividir um PDF de 40 páginas leva segundos, e ninguém espera isso a cada pergunta. Então o
 * resultado fica guardado por arquivo, com o SHA-256 do conteúdo na chave: se o arquivo for
 * substituído, o SHA muda e os trechos são refeitos. Não existe cache velho servindo trecho de um
 * documento que já não está lá.
 *
 * Tudo acontece no servidor do GenoLab. O conteúdo dos documentos não sai daqui nesta etapa.
 */

/** Formatos de onde dá para tirar texto corrido para citar. */
const CITAVEIS = new Set(["pdf", "documento", "texto"]);

type Guardado = { sha256: string; trechos: Trecho[] };

export type FonteDoProjeto = {
  arquivoId: string;
  nome: string;
  trechos: number;
  /** Por que um arquivo não entrou — dito na interface, em vez de sumir em silêncio. */
  motivo?: string;
};

export type IndiceDoProjeto = { trechos: Trecho[]; fontes: FonteDoProjeto[] };

/**
 * Lê (ou constrói) os trechos de todos os arquivos citáveis do projeto.
 * `project` já deve ter passado por authorizeProject — aqui não há decisão de acesso.
 */
export async function trechosDoProjeto(project: Project): Promise<IndiceDoProjeto> {
  const repo = getRepository();
  const trechos: Trecho[] = [];
  const fontes: FonteDoProjeto[] = [];

  for (const f of project.files as FileRecord[]) {
    if (!CITAVEIS.has(f.kind)) {
      // Tabela e imagem não viram trecho de texto; isso é dito, não escondido.
      fontes.push({ arquivoId: f.id, nome: f.name, trechos: 0, motivo: f.kind === "csv" || f.kind === "planilha" ? "Tabela: ainda não vira trecho citável." : f.kind === "imagem" ? "Imagem: não tem texto para citar." : "Formato sem texto para citar." });
      continue;
    }

    const guardado = await repo.getDerived<Guardado>(project.id, "fontes", f.id);
    if (guardado?.sha256 === f.sha256) {
      trechos.push(...guardado.trechos);
      fontes.push({ arquivoId: f.id, nome: f.name, trechos: guardado.trechos.length });
      continue;
    }

    const lido = await repo.readFile(project.id, f.id);
    if (!lido) {
      fontes.push({ arquivoId: f.id, nome: f.name, trechos: 0, motivo: "O arquivo não foi encontrado no projeto." });
      continue;
    }

    const extracao = await extrairArquivo(f.name, lido.bytes);
    if (extracao.tipo !== "relatorio" || extracao.estado !== "extraido") {
      const motivo = extracao.tipo === "relatorio" ? (extracao.aviso ?? "Não foi possível extrair o texto.") : "Formato sem texto corrido.";
      fontes.push({ arquivoId: f.id, nome: f.name, trechos: 0, motivo });
      continue;
    }

    // PDF: páginas separadas (dá para citar “página 7”). Outros: texto corrido.
    const novos = dividirEmTrechos({ arquivoId: f.id, arquivo: f.name, conteudo: extracao.porPagina ?? extracao.texto });
    await repo.putDerived(project.id, "fontes", f.id, { sha256: f.sha256, trechos: novos } satisfies Guardado);
    trechos.push(...novos);
    fontes.push({ arquivoId: f.id, nome: f.name, trechos: novos.length, motivo: extracao.aviso ?? undefined });
  }

  return { trechos, fontes };
}

/** Esquece os trechos de um arquivo (usado quando o arquivo é apagado do projeto). */
export async function esquecerTrechos(projectId: string, arquivoId: string): Promise<void> {
  await getRepository().deleteDerived(projectId, "fontes", arquivoId);
}
