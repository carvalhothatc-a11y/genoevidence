import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Repository } from "@/lib/repo";
import { confirmImport } from "@/lib/expression/importService";
import { addStructure } from "@/lib/structures/service";

/**
 * Cria um projeto de EXEMPLO com dados sintéticos (separado dos projetos reais).
 * - CSV: valores fictícios (public/samples/expressao_exemplo_SINTETICO.csv).
 * - Estrutura: 1UBQ real, baixada do RCSB PDB (public/samples/1UBQ.cif, domínio público).
 */
export async function createExampleProject(repo: Repository, userId: string) {
  const project = await repo.createProject(
    userId,
    {
      title: "Exemplo — expressão gênica e estrutura (dados sintéticos)",
      objective: "Demonstrar importação, validação e visualização. Os valores de expressão são FICTÍCIOS.",
      organism: "Não se aplica (dados sintéticos)",
      technique: "Dados processados de expressão (TPM) + estrutura do PDB",
      description: "Projeto de demonstração criado pela plataforma. Os genes GENE_SINT_xx não existem.",
      groups: [
        { name: "controle", description: "grupo fictício" },
        { name: "tratamento", description: "grupo fictício" },
      ],
      conditions: "Fictícias.",
      unitsAndReplicates: "3 amostras por grupo; valores em TPM (sintéticos); um valor ausente proposital.",
      limitations: "Nenhuma conclusão biológica pode ser tirada destes valores.",
    },
    { synthetic: true },
  );
  const samples = path.join(process.cwd(), "public", "samples");
  const csv = new Uint8Array(await readFile(path.join(samples, "expressao_exemplo_SINTETICO.csv")));
  const file = await repo.putFile(userId, project.id, { name: "expressao_exemplo_SINTETICO.csv", mimeType: "text/csv", kind: "csv", bytes: csv, role: "Tabela de expressão (SINTÉTICA)" });
  if (file)
    await confirmImport(repo, userId, project.id, {
      fileId: file.id,
      delimiter: ",",
      mapping: { gene: "gene", sample: "amostra", group: "grupo", value: "valor", unit: "unidade" },
      valueType: "tpm",
      decimal: ".",
      name: "Expressão (exemplo sintético)",
      synthetic: true,
    });
  const cif = new Uint8Array(await readFile(path.join(samples, "1UBQ.cif")));
  await addStructure(repo, userId, project.id, { name: "1UBQ.cif", bytes: cif, source: { type: "exemplo", pdbId: "1UBQ", url: "https://files.rcsb.org/download/1UBQ.cif" } });
  return (await repo.getProject(userId, project.id))!;
}
