import "server-only";
import { decodeText, parseCsv, CsvError } from "@/lib/expression/csv";
import { extensionOf } from "@/lib/files/validate";
import { isZip, lerXlsx, MAX_COLUNAS, MAX_LINHAS, OfficeError, textoDocx } from "./office";

/**
 * Extração de conteúdo dos materiais enviados para interpretação. Roda no servidor do GenoLab e
 * NÃO guarda o arquivo (o original só é armazenado quando o pesquisador salva no projeto).
 * O conteúdo é tratado como dado: nada do arquivo é executado nem altera permissões.
 */
export type ExtracaoRelatorio = { tipo: "relatorio"; formato: "pdf" | "docx" | "texto"; estado: "extraido" | "sem_texto" | "falhou"; texto: string; paginas: number | null; aviso: string | null };
export type ExtracaoTabela = { tipo: "tabela"; formato: "csv" | "xlsx"; abas: string[]; aba: string | null; colunas: string[]; linhas: (string | null)[][]; totalLinhas: number; avisos: string[] };
export type Extracao = ExtracaoRelatorio | ExtracaoTabela;

export class ExtracaoErro extends Error {}

const MAX_TEXTO = 60_000;
const TEMPO_PDF_MS = 20_000;

function limitarTexto(t: string): { texto: string; aviso: string | null } {
  const limpo = t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return limpo.length > MAX_TEXTO ? { texto: limpo.slice(0, MAX_TEXTO), aviso: `Texto longo: foram usados os primeiros ${MAX_TEXTO.toLocaleString("pt-BR")} caracteres.` } : { texto: limpo, aviso: null };
}

async function textoPdf(bytes: Uint8Array): Promise<ExtracaoRelatorio> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const tarefa = (async () => {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    return extractText(pdf, { mergePages: true });
  })();
  const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new ExtracaoErro("A leitura do PDF demorou demais.")), TEMPO_PDF_MS));
  try {
    const { totalPages, text } = await Promise.race([tarefa, limite]);
    const { texto, aviso } = limitarTexto(text);
    if (texto.replace(/\s/g, "").length < 20) return { tipo: "relatorio", formato: "pdf", estado: "sem_texto", texto: "", paginas: totalPages, aviso: "PDF sem camada de texto (provavelmente imagem digitalizada). O conteúdo não pôde ser extraído." };
    return { tipo: "relatorio", formato: "pdf", estado: "extraido", texto, paginas: totalPages, aviso };
  } catch (e) {
    const msg = e instanceof ExtracaoErro ? e.message : /password|encrypt/i.test(String(e)) ? "PDF protegido por senha." : "Não foi possível ler o PDF (arquivo corrompido ou em formato não suportado).";
    return { tipo: "relatorio", formato: "pdf", estado: "falhou", texto: "", paginas: null, aviso: msg };
  }
}

export async function extrairArquivo(nome: string, bytes: Uint8Array, opts: { aba?: string | null } = {}): Promise<Extracao> {
  if (!bytes.byteLength) throw new ExtracaoErro("Arquivo vazio.");
  const ext = extensionOf(nome);
  switch (ext) {
    case ".pdf":
      if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new ExtracaoErro("O conteúdo não é um PDF válido.");
      return textoPdf(bytes);
    case ".docx": {
      if (!isZip(bytes)) throw new ExtracaoErro("O conteúdo não é um DOCX válido.");
      try {
        const { texto, aviso } = limitarTexto(textoDocx(bytes));
        return texto ? { tipo: "relatorio", formato: "docx", estado: "extraido", texto, paginas: null, aviso } : { tipo: "relatorio", formato: "docx", estado: "sem_texto", texto: "", paginas: null, aviso: "O documento não tem texto." };
      } catch (e) {
        return { tipo: "relatorio", formato: "docx", estado: "falhou", texto: "", paginas: null, aviso: e instanceof OfficeError ? e.message : "Não foi possível ler o DOCX." };
      }
    }
    case ".txt":
    case ".md": {
      if (bytes.subarray(0, 8192).includes(0)) throw new ExtracaoErro("O arquivo parece binário; esperava-se texto.");
      const { texto, aviso } = limitarTexto(decodeText(bytes).text);
      return { tipo: "relatorio", formato: "texto", estado: texto ? "extraido" : "sem_texto", texto, paginas: null, aviso };
    }
    case ".xlsx": {
      if (!isZip(bytes)) throw new ExtracaoErro("O conteúdo não é um XLSX válido.");
      try {
        const p = lerXlsx(bytes, opts.aba);
        return { tipo: "tabela", formato: "xlsx", abas: p.abas, aba: p.aba, colunas: p.colunas, linhas: p.linhas, totalLinhas: p.totalLinhas, avisos: p.avisos };
      } catch (e) {
        throw new ExtracaoErro(e instanceof OfficeError ? e.message : "Não foi possível ler a planilha.");
      }
    }
    case ".csv":
    case ".tsv": {
      try {
        const c = parseCsv(bytes);
        const colunas = c.header.slice(0, MAX_COLUNAS);
        const avisos: string[] = [];
        if (c.encodingWarning) avisos.push(c.encodingWarning);
        if (c.truncated) avisos.push("Arquivo longo: foram lidas as primeiras linhas permitidas.");
        if (c.malformedRows.length) avisos.push(`${c.malformedRows.length} linha(s) com número de campos diferente do cabeçalho (ex.: linha ${c.malformedRows[0]}).`);
        if (c.suggestedDecimal === ",") avisos.push("Os números usam vírgula decimal; foram mantidos como enviados.");
        return {
          tipo: "tabela",
          formato: "csv",
          abas: [],
          aba: null,
          colunas,
          linhas: c.rows.slice(0, MAX_LINHAS).map((r) => colunas.map((h) => (r[h]?.trim() ? r[h].slice(0, 200) : null))),
          totalLinhas: c.rows.length,
          avisos,
        };
      } catch (e) {
        throw new ExtracaoErro(e instanceof CsvError ? e.message : "Não foi possível ler o CSV.");
      }
    }
    default:
      throw new ExtracaoErro(`Formato “${ext || "sem extensão"}” não aceito aqui. Use PDF, DOCX, TXT, CSV ou XLSX.`);
  }
}
