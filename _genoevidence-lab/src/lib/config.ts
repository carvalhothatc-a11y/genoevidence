/** Configuração da plataforma. O nome é provisório e configurável por variável de ambiente. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "GenoLab";
export const APP_VERSION = "0.1.0";

/**
 * Bancada 3D: FORA DO AR por decisão da responsável (15/10/2026).
 *
 * O código inteiro continua no repositório — páginas, cena, equipamentos, testes. Só o acesso está
 * fechado: o item some do menu e as rotas respondem 404. Para religar, basta `NEXT_PUBLIC_BANCADA_3D=1`
 * no servidor, sem recompilar nada do código da bancada.
 *
 * É NEXT_PUBLIC_ porque a barra lateral roda no navegador e precisa ler o mesmo valor que o servidor.
 */
export const BANCADA_3D_ATIVA = process.env.NEXT_PUBLIC_BANCADA_3D === "1";

export const LIMITS = {
  /** Tamanho máximo de upload (padrão 20 MB). */
  maxUploadBytes: Number(process.env.LAB_MAX_UPLOAD_BYTES) || 20 * 1024 * 1024,
  maxCsvRows: 100_000,
  maxCsvColumns: 200,
  maxStructureBytes: 30 * 1024 * 1024,
  maxPdfPages: 400,
  maxPastedTextChars: 400_000,
  maxProjectsPerUser: 500,
} as const;

export const ACCEPTED_UPLOADS: Record<string, { kinds: string[]; extensions: string[] }> = {
  csv: { kinds: ["text/csv", "application/vnd.ms-excel", "text/plain"], extensions: [".csv", ".tsv", ".txt"] },
  pdf: { kinds: ["application/pdf"], extensions: [".pdf"] },
  estrutura: { kinds: ["chemical/x-pdb", "chemical/x-mmcif", "text/plain", "application/octet-stream"], extensions: [".pdb", ".ent", ".cif", ".mmcif"] },
  imagem: { kinds: ["image/png", "image/jpeg", "image/webp"], extensions: [".png", ".jpg", ".jpeg", ".webp"] },
  texto: { kinds: ["text/plain", "text/markdown"], extensions: [".txt", ".md"] },
};
