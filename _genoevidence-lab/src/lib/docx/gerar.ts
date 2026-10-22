import { strToU8, zipSync } from "fflate";

/**
 * Gerador de .docx (Word) sem dependência nova.
 *
 * Um .docx é um ZIP com XML dentro. O projeto já usa `fflate` para LER docx; aqui ele escreve.
 * Uma biblioteca de Word inteira traria dezenas de megabytes para o que cabe em um arquivo.
 *
 * O escopo é de propósito pequeno: título, seções, parágrafos, listas e um bloco de aviso. É o
 * suficiente para um registro de laboratório, e cada peça é previsível.
 */

export type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "secao"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "item"; texto: string }
  | { tipo: "aviso"; texto: string }
  | { tipo: "separador" };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto com quebras de linha preservadas dentro do mesmo parágrafo. */
function corrida(texto: string, extra = ""): string {
  // O <w:br/> precisa ficar DENTRO do <w:r>; fora dele o Word ignora e as linhas saem coladas.
  const partes = esc(texto).split("\n");
  return partes.map((p, i) => `<w:r>${extra}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${p}</w:t></w:r>`).join("");
}

function paragrafo(b: Bloco): string {
  switch (b.tipo) {
    case "titulo":
      return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="0F1730"/></w:rPr><w:t xml:space="preserve">${esc(b.texto)}</w:t></w:r></w:p>`;
    case "subtitulo":
      return `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:color w:val="6B7590"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(b.texto)}</w:t></w:r></w:p>`;
    case "secao":
      return `<w:p><w:pPr><w:spacing w:before="320" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F1730"/></w:rPr><w:t xml:space="preserve">${esc(b.texto)}</w:t></w:r></w:p>`;
    case "item":
      return `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:after="60"/></w:pPr><w:r><w:t xml:space="preserve">• </w:t></w:r>${corrida(b.texto)}</w:p>`;
    case "aviso":
      // Caixa com borda e fundo: é o aviso que não pode passar despercebido.
      return `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:color="D98A0B"/><w:left w:val="single" w:sz="6" w:color="D98A0B"/><w:bottom w:val="single" w:sz="6" w:color="D98A0B"/><w:right w:val="single" w:sz="6" w:color="D98A0B"/></w:pBdr><w:shd w:val="clear" w:fill="FEF4E2"/><w:spacing w:before="200" w:after="200"/><w:ind w:left="120" w:right="120"/></w:pPr>${corrida(b.texto, "<w:rPr><w:sz w:val="+'"20"'+"/></w:rPr>")}</w:p>`;
    case "separador":
      return `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:color="D5DAE5"/></w:pBdr><w:spacing w:before="280" w:after="120"/></w:pPr></w:p>`;
    default:
      return `<w:p><w:pPr><w:spacing w:after="140"/></w:pPr>${corrida(b.texto)}</w:p>`;
  }
}

const TIPOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

function propriedades(titulo: string, autor: string): string {
  const agora = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(titulo)}</dc:title><dc:creator>${esc(autor)}</dc:creator><cp:lastModifiedBy>${esc(autor)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified>
</cp:coreProperties>`;
}

/** Monta o .docx. Devolve os bytes prontos para baixar ou anexar num e-mail. */
export function gerarDocx(opcoes: { titulo: string; autor?: string; blocos: Bloco[] }): Uint8Array {
  const corpo = opcoes.blocos.map(paragrafo).join("");
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr>
</w:body></w:document>`;

  return zipSync(
    {
      "[Content_Types].xml": strToU8(TIPOS),
      "_rels/.rels": strToU8(RELS),
      "docProps/core.xml": strToU8(propriedades(opcoes.titulo, opcoes.autor ?? "GenoLab")),
      "word/document.xml": strToU8(documento),
    },
    { level: 6 },
  );
}
