import "server-only";
import { ApiError } from "@/lib/api";
import { StructureRecord } from "@/lib/domain/schemas";
import { checkUpload } from "@/lib/files/validate";
import { newId, nowIso } from "@/lib/ids";
import type { Repository } from "@/lib/repo";
import type { Actor } from "@/lib/repo/types";
import { parseStructure, StructureParseError } from "./parse";

const PDB_ID = /^[0-9][A-Za-z0-9]{3}$/;

/** Busca uma estrutura pública no RCSB PDB. Envia apenas o identificador informado pelo usuário. */
export async function fetchFromRcsb(pdbId: string): Promise<{ bytes: Uint8Array; url: string }> {
  if (!PDB_ID.test(pdbId)) throw new ApiError(400, "Identificador PDB inválido (formato esperado: 4 caracteres, ex.: 1UBQ).");
  const url = `https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ApiError(502, "Não foi possível acessar o RCSB PDB agora. Tente novamente ou envie o arquivo.");
  }
  if (res.status === 404) throw new ApiError(404, `A estrutura ${pdbId.toUpperCase()} não foi encontrada no RCSB PDB.`);
  if (!res.ok) throw new ApiError(502, `O RCSB PDB respondeu com erro (${res.status}).`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), url };
}

export async function addStructure(
  repo: Repository,
  projectId: string,
  actor: Actor,
  input: { name: string; bytes: Uint8Array; source: StructureRecord["source"] },
) {
  const check = checkUpload(input.name, input.bytes, ["estrutura"]);
  if (!check.ok) throw new ApiError(422, check.error);
  let parsed;
  try {
    parsed = parseStructure(input.name, new TextDecoder().decode(input.bytes));
  } catch (err) {
    if (err instanceof StructureParseError) throw new ApiError(422, err.message);
    throw new ApiError(422, "Não foi possível ler o arquivo de estrutura.");
  }
  const file = await repo.putFile(projectId, actor, {
    name: input.name,
    mimeType: check.mimeType,
    kind: "estrutura",
    bytes: input.bytes,
    role: "Estrutura molecular",
    externalSource: input.source.type === "rcsb" && input.source.url ? { name: "RCSB PDB", url: input.source.url, retrievedAt: input.source.retrievedAt ?? nowIso() } : undefined,
  });
  if (!file) throw new ApiError(404, "Projeto não encontrado.");
  const record = StructureRecord.parse({
    id: newId("e_"),
    fileId: file.id,
    format: parsed.format,
    source: input.source,
    summary: parsed.summary,
    highlights: [],
    addedAt: nowIso(),
  });
  await repo.mutateProject(projectId, actor, (draft) => {
    draft.structures.push(record);
    return [
      {
        actor: "pesquisador",
        action: "estrutura_adicionada",
        detail: `${record.summary.idCode ?? input.name}: ${record.summary.chains.length} cadeia(s); ${record.summary.method ?? "método não informado"}; classificação: ${record.summary.classification}.`,
        entity: { type: "estrutura", id: record.id },
      },
    ];
  });
  return record;
}
