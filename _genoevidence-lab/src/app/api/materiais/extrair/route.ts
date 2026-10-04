import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { LIMITS } from "@/lib/config";
import { ExtracaoErro, extrairArquivo } from "@/lib/materiais/extrair";
import { contentLengthOk } from "@/lib/security";

/**
 * Extrai o conteúdo de um relatório (PDF, DOCX, TXT) ou de uma tabela (CSV, XLSX) para a
 * interpretação. Processado no servidor do GenoLab, sem armazenar o arquivo e sem enviá-lo a
 * serviços externos.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`extrair:${user.id}`, 40, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(e.status, e.message);
    throw e;
  }
  const size = contentLengthOk(req, LIMITS.maxUploadBytes + 64 * 1024);
  if (size === "grande") throw new ApiError(413, `Arquivo acima do limite de ${Math.round(LIMITS.maxUploadBytes / 1024 / 1024)} MB.`);
  if (size === "ausente") throw new ApiError(411, "Tamanho do envio não informado.");
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido (esperado multipart/form-data).");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  if (file.size > LIMITS.maxUploadBytes) throw new ApiError(413, "Arquivo acima do limite.");
  const aba = (form.get("aba") as string | null)?.slice(0, 80) || null;
  try {
    const extracao = await extrairArquivo(file.name.slice(0, 200), new Uint8Array(await file.arrayBuffer()), { aba });
    return json({ extracao });
  } catch (e) {
    if (e instanceof ExtracaoErro) throw new ApiError(422, e.message);
    throw e;
  }
});
