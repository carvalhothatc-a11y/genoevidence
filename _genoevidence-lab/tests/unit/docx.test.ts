import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { gerarDocx, type Bloco } from "@/lib/docx/gerar";

/**
 * Um .docx que compila mas o Word recusa não vale nada. O que estes testes garantem é a coisa que
 * já quebrou de verdade aqui: XML malformado (uma etiqueta fechada com o nome errado) passa pelo
 * TypeScript sem reclamar e só aparece quando alguém tenta abrir o arquivo.
 */

const abrir = (bytes: Uint8Array) => {
  const partes = unzipSync(bytes);
  return { partes, doc: strFromU8(partes["word/document.xml"]) };
};

/** Conferência de XML bem formado, sem dependência: casa cada etiqueta aberta com a fechada. */
function xmlBemFormado(xml: string): true | string {
  const pilha: string[] = [];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const [, fecha, nome, , autofecha] = m;
    if (autofecha) continue;
    if (fecha) {
      const topo = pilha.pop();
      if (topo !== nome) return `fechou </${nome}> mas o aberto era <${topo ?? "nada"}>`;
    } else pilha.push(nome);
  }
  return pilha.length ? `ficou sem fechar: <${pilha[pilha.length - 1]}>` : true;
}

const TODOS: Bloco[] = [
  { tipo: "titulo", texto: "Registro" },
  { tipo: "subtitulo", texto: "quinta, 22 de outubro de 2026" },
  { tipo: "aviso", texto: "Reescrito automaticamente." },
  { tipo: "secao", texto: "Procedimento" },
  { tipo: "paragrafo", texto: "Primeira linha.\nSegunda linha." },
  { tipo: "item", texto: "Um item" },
  { tipo: "separador" },
];

describe("gerar .docx", () => {
  it("o pacote tem as peças que o Word exige", () => {
    const { partes } = abrir(gerarDocx({ titulo: "t", blocos: TODOS }));
    for (const p of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "docProps/core.xml"])
      expect(Object.keys(partes), p).toContain(p);
  });

  it("TODO bloco gera XML bem formado — inclusive o separador, que já quebrou", () => {
    for (const b of TODOS) {
      const { doc } = abrir(gerarDocx({ titulo: "t", blocos: [b] }));
      expect(xmlBemFormado(doc), `bloco ${b.tipo}`).toBe(true);
    }
    const { doc } = abrir(gerarDocx({ titulo: "t", blocos: TODOS }));
    expect(xmlBemFormado(doc)).toBe(true);
  });

  it("as quebras de linha ficam DENTRO do run, senão o Word cola as linhas", () => {
    const { doc } = abrir(gerarDocx({ titulo: "t", blocos: [{ tipo: "paragrafo", texto: "a\nb" }] }));
    expect(doc).toMatch(/<w:r><w:br\/><w:t[^>]*>b<\/w:t><\/w:r>/);
    expect(doc).not.toMatch(/<\/w:r><w:br\/>/);
  });

  it("escapa o que a pessoa escreveu — nada de quebrar o arquivo por um < no texto", () => {
    const { doc } = abrir(gerarDocx({ titulo: "t", blocos: [{ tipo: "paragrafo", texto: 'a < b & c "d"' }] }));
    expect(xmlBemFormado(doc)).toBe(true);
    expect(doc).toContain("&lt;");
    expect(doc).toContain("&amp;");
  });

  it("acento e símbolo sobrevivem", () => {
    const { doc } = abrir(gerarDocx({ titulo: "t", blocos: [{ tipo: "paragrafo", texto: "anelamento a 58 °C — ótimo" }] }));
    expect(doc).toContain("58 °C — ótimo");
  });

  it("o título e o autor entram nas propriedades do arquivo", () => {
    const { partes } = abrir(gerarDocx({ titulo: "Meu registro", autor: "Fulana", blocos: TODOS }));
    const core = strFromU8(partes["docProps/core.xml"]);
    expect(core).toContain("Meu registro");
    expect(core).toContain("Fulana");
    expect(xmlBemFormado(core)).toBe(true);
  });

  it("documento vazio não quebra", () => {
    const { doc } = abrir(gerarDocx({ titulo: "t", blocos: [] }));
    expect(xmlBemFormado(doc)).toBe(true);
  });
});
