import { describe, expect, it } from "vitest";
import { extrairArquivo } from "@/lib/materiais/extrair";
import { dividirEmTrechos } from "@/lib/fontes/trechos";

/** PDF mínimo com uma página por lista de linhas (suficiente para a camada de texto do unpdf). */
function pdfDePaginas(paginas: string[][]): Uint8Array {
  const objs: string[] = [];
  const idPagina = (i: number) => 3 + i * 2;
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${paginas.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] /Count ${paginas.length} >>`);
  const fonte = 3 + paginas.length * 2;
  for (let i = 0; i < paginas.length; i++) {
    const texto = `BT /F1 12 Tf 50 750 Td 16 TL ${paginas[i].map((l) => `(${l.replace(/[()\\]/g, "\\$&")}) Tj T*`).join(" ")} ET`;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${idPagina(i) + 1} 0 R /Resources << /Font << /F1 ${fonte} 0 R >> >> >>`);
    objs.push(`<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`);
  }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  let out = "%PDF-1.4\n";
  const pos: number[] = [];
  objs.forEach((o, i) => {
    pos.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

describe("extração de PDF mantém as páginas separadas", () => {
  it("devolve o texto de cada página, na ordem", async () => {
    const bytes = pdfDePaginas([["Metodos: anelamento a 58 graus."], ["Resultados: banda unica no gel."], ["Discussao: o controle negativo."]]);
    const r = await extrairArquivo("artigo.pdf", bytes);
    expect(r.tipo).toBe("relatorio");
    if (r.tipo !== "relatorio") return;
    expect(r.estado).toBe("extraido");
    expect(r.paginas).toBe(3);
    expect(r.porPagina).toHaveLength(3);
    expect(r.porPagina![0]).toMatch(/anelamento/);
    expect(r.porPagina![1]).toMatch(/banda unica/);
    expect(r.porPagina![2]).toMatch(/controle negativo/);
    // nenhuma página contém o texto da outra
    expect(r.porPagina![0]).not.toMatch(/banda unica/);
  });

  it("o texto corrido continua existindo, com tudo", async () => {
    const r = await extrairArquivo("artigo.pdf", pdfDePaginas([["Primeira pagina."], ["Segunda pagina."]]));
    if (r.tipo !== "relatorio") return;
    expect(r.texto).toMatch(/Primeira pagina/);
    expect(r.texto).toMatch(/Segunda pagina/);
  });

  it("da extração ao trecho citável: a página chega até a citação", async () => {
    const r = await extrairArquivo("artigo.pdf", pdfDePaginas([["Metodos: anelamento a 58 graus Celsius no termociclador."], ["Resultados: banda unica observada no gel de agarose."]]));
    if (r.tipo !== "relatorio" || !r.porPagina) return;
    const trechos = dividirEmTrechos({ arquivoId: "f_1", arquivo: "artigo.pdf", conteudo: r.porPagina });
    const comBanda = trechos.find((t) => /banda unica/.test(t.texto));
    expect(comBanda, "o trecho com a banda existe").toBeTruthy();
    expect(comBanda!.pagina, "e sabe que veio da página 2").toBe(2);
  });

  it("DOCX não tem página e não inventa uma", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const docx = Buffer.from(
      zipSync({
        "[Content_Types].xml": strToU8("<Types/>"),
        "word/document.xml": strToU8("<w:document><w:body><w:p><w:r><w:t>Texto do documento sem paginacao definida.</w:t></w:r></w:p></w:body></w:document>"),
      }),
    );
    const r = await extrairArquivo("notas.docx", new Uint8Array(docx));
    if (r.tipo !== "relatorio") return;
    expect(r.porPagina).toBeUndefined();
    const trechos = dividirEmTrechos({ arquivoId: "f_2", arquivo: "notas.docx", conteudo: r.texto });
    expect(trechos[0]?.pagina).toBeNull();
  });
});
