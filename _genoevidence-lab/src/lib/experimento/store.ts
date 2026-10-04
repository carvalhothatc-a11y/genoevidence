import "server-only";
import { z } from "@/lib/zod";
import { getRepository } from "@/lib/repo";
import { Correcoes } from "./correcoes";
import { EntradaExperimento } from "./materiais";
import { Experimento } from "./schema";

/**
 * Experimentos salvos num projeto: a entrada (texto e materiais extraídos), as correções do
 * pesquisador e TODAS as versões da descrição estruturada (nada é sobrescrito).
 */
export const ExperimentoSalvo = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/),
  titulo: z.string().min(1).max(160),
  entrada: EntradaExperimento,
  correcoes: Correcoes,
  versoes: z.array(Experimento).min(1).max(30),
  /** Arquivos originais guardados no projeto, por material. */
  arquivos: z.record(z.string().max(64), z.string().max(64)).default({}),
  atualizadoEm: z.string(),
});
export type ExperimentoSalvo = z.infer<typeof ExperimentoSalvo>;

const Colecao = z.object({ itens: z.array(ExperimentoSalvo).max(100) });
const DOC = "colecao";

export async function lerExperimentos(projectId: string): Promise<ExperimentoSalvo[]> {
  const raw = await getRepository().getDerived<unknown>(projectId, "experimentos", DOC);
  return raw ? Colecao.parse(raw).itens : [];
}

export async function gravarExperimento(projectId: string, exp: ExperimentoSalvo): Promise<ExperimentoSalvo> {
  const atuais = await lerExperimentos(projectId);
  const anterior = atuais.find((x) => x.id === exp.id);
  if (anterior) {
    // preserva versões anteriores: só acrescenta as novas
    const nums = new Set(exp.versoes.map((v) => v.versao));
    for (const v of anterior.versoes) if (!nums.has(v.versao)) exp.versoes.push(v);
    exp.versoes.sort((a, b) => a.versao - b.versao);
    exp.versoes = exp.versoes.slice(-30);
    exp.arquivos = { ...anterior.arquivos, ...exp.arquivos };
  }
  const next = [exp, ...atuais.filter((x) => x.id !== exp.id)].slice(0, 100);
  await getRepository().putDerived(projectId, "experimentos", DOC, Colecao.parse({ itens: next }));
  return exp;
}

export async function excluirExperimento(projectId: string, id: string): Promise<boolean> {
  const atuais = await lerExperimentos(projectId);
  if (!atuais.some((x) => x.id === id)) return false;
  await getRepository().putDerived(projectId, "experimentos", DOC, Colecao.parse({ itens: atuais.filter((x) => x.id !== id) }));
  return true;
}
