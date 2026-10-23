import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { buscarPorSequencia, MINIMO_SEQUENCIA } from "@/lib/assistant/ferramentas/moleculas";
import { z } from "@/lib/zod";

export const dynamic = "force-dynamic";

const Corpo = z.object({
  proteina: z
    .string()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase().replace(/\*+$/, ""))
    .pipe(
      z
        .string()
        .min(MINIMO_SEQUENCIA, `O RCSB só procura sequências com pelo menos ${MINIMO_SEQUENCIA} aminoácidos.`)
        .max(5000, "Sequência longa demais para esta busca (até 5.000 aminoácidos).")
        .regex(/^[ACDEFGHIKLMNPQRSTVWYBZJXUO]+$/, "Só letras de aminoácido (paradas “*” no meio não são aceitas)."),
    ),
});

/**
 * Procura no RCSB PDB estruturas experimentais de proteínas com sequência PARECIDA.
 *
 * Só roda quando a pessoa clica, depois de a tela avisar que a sequência sai do GenoLab e vai para
 * um serviço público. O que sai é só a sequência de aminoácidos — nem nome, nem projeto, nem DNA.
 * Nada é guardado aqui.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`mol-sequencia:${user.id}`, 20, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas buscas em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }
  const c = Corpo.safeParse(await readJsonBody(req, 20_000));
  if (!c.success) throw new ApiError(400, c.error.issues[0]?.message ?? "Sequência inválida.");
  return json(await buscarPorSequencia(c.data.proteina));
});
