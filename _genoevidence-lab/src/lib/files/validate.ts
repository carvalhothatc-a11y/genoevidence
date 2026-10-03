import type { FileKind } from "@/lib/domain/schemas";
import { LIMITS } from "@/lib/config";

export type UploadCheck = { ok: true; kind: FileKind; mimeType: string } | { ok: false; error: string };

const EXT_KIND: Record<string, FileKind> = {
  ".csv": "csv",
  ".tsv": "csv",
  ".txt": "texto",
  ".md": "texto",
  ".pdf": "pdf",
  ".pdb": "estrutura",
  ".ent": "estrutura",
  ".cif": "estrutura",
  ".mmcif": "estrutura",
  ".png": "imagem",
  ".jpg": "imagem",
  ".jpeg": "imagem",
  ".webp": "imagem",
};

const MIME: Record<string, string> = {
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".pdb": "chemical/x-pdb",
  ".ent": "chemical/x-pdb",
  ".cif": "chemical/x-mmcif",
  ".mmcif": "chemical/x-mmcif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function extensionOf(name: string): string {
  const m = /\.[a-z0-9]+$/i.exec(name.trim());
  return m ? m[0].toLowerCase() : "";
}

function startsWith(bytes: Uint8Array, sig: number[]) {
  return sig.every((b, i) => bytes[i] === b);
}

function looksLikeText(bytes: Uint8Array) {
  const n = Math.min(bytes.length, 8192);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return false;
  return true;
}

/**
 * Valida tipo e conteúdo do arquivo pela extensão E pela assinatura dos bytes
 * (não confia apenas no tipo informado pelo navegador).
 */
export function checkUpload(name: string, bytes: Uint8Array, expected?: FileKind[]): UploadCheck {
  if (bytes.byteLength === 0) return { ok: false, error: "Arquivo vazio." };
  if (bytes.byteLength > LIMITS.maxUploadBytes)
    return { ok: false, error: `Arquivo acima do limite de ${Math.round(LIMITS.maxUploadBytes / 1024 / 1024)} MB.` };
  const ext = extensionOf(name);
  const kind = EXT_KIND[ext];
  if (!kind) return { ok: false, error: `Extensão “${ext || "(sem extensão)"}” não aceita.` };
  if (expected && !expected.includes(kind)) return { ok: false, error: `Tipo de arquivo não esperado aqui (${ext}).` };

  switch (kind) {
    case "pdf":
      if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { ok: false, error: "O conteúdo não é um PDF válido." };
      break;
    case "imagem": {
      const png = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
      const jpg = startsWith(bytes, [0xff, 0xd8, 0xff]);
      const webp = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (!png && !jpg && !webp) return { ok: false, error: "O conteúdo não é uma imagem PNG, JPEG ou WebP válida." };
      break;
    }
    case "csv":
    case "texto":
    case "estrutura":
      if (!looksLikeText(bytes)) return { ok: false, error: "O arquivo parece binário; esperava-se texto." };
      break;
  }
  if (kind === "estrutura" && bytes.byteLength > LIMITS.maxStructureBytes) return { ok: false, error: "Estrutura acima do limite de tamanho." };
  return { ok: true, kind, mimeType: MIME[ext] ?? "application/octet-stream" };
}
