import "server-only";
import { z } from "zod";
import { getRepository } from "@/lib/repo";
import { Cenario } from "./schema";
import { FrequenciaPublicada } from "./evidencia";

/** Ideias salvas num projeto: cada ideia guarda TODAS as versões de cada cenário (nada é sobrescrito). */
export const IdeiaSalva = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/),
  titulo: z.string().min(1).max(160),
  cenarios: z
    .array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/), versoes: z.array(Cenario).min(1).max(30) }))
    .min(1)
    .max(4),
  atualizadaEm: z.string(),
});
export type IdeiaSalva = z.infer<typeof IdeiaSalva>;

const Colecao = z.object({ ideias: z.array(IdeiaSalva).max(100) });
const Evidencias = z.object({ itens: z.array(FrequenciaPublicada).max(500) });

const DOC = "colecao";

export async function lerIdeias(projectId: string): Promise<IdeiaSalva[]> {
  const raw = await getRepository().getDerived<unknown>(projectId, "ideias", DOC);
  return raw ? Colecao.parse(raw).ideias : [];
}

export async function gravarIdeia(projectId: string, ideia: IdeiaSalva): Promise<void> {
  const atuais = await lerIdeias(projectId);
  const anterior = atuais.find((i) => i.id === ideia.id);
  if (anterior) {
    // Preserva versões anteriores: só acrescenta versões novas por cenário.
    for (const c of ideia.cenarios) {
      const velho = anterior.cenarios.find((x) => x.id === c.id);
      if (!velho) continue;
      const nums = new Set(c.versoes.map((v) => v.versao));
      for (const v of velho.versoes) if (!nums.has(v.versao)) c.versoes.push(v);
      c.versoes.sort((a, b) => a.versao - b.versao);
      c.versoes = c.versoes.slice(-30);
    }
  }
  const next = [ideia, ...atuais.filter((i) => i.id !== ideia.id)].slice(0, 100);
  await getRepository().putDerived(projectId, "ideias", DOC, Colecao.parse({ ideias: next }));
}

export async function lerEvidencias(projectId: string): Promise<FrequenciaPublicada[]> {
  const raw = await getRepository().getDerived<unknown>(projectId, "evidencias", DOC);
  return raw ? Evidencias.parse(raw).itens : [];
}

export async function gravarEvidencias(projectId: string, itens: FrequenciaPublicada[]): Promise<void> {
  await getRepository().putDerived(projectId, "evidencias", DOC, Evidencias.parse({ itens }));
}
