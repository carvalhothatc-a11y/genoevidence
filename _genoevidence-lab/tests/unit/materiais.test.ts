import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { lerXlsx, OfficeError, textoDocx } from "@/lib/materiais/office";
import { classificarReferencia } from "@/lib/experimento/materiais";

function xlsx(sheet: string, shared: string[]) {
  return zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="Resultados" sheetId="1" r:id="rId1"/><sheet name="Notas" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
    "xl/sharedStrings.xml": strToU8(`<sst>${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    "xl/worksheets/sheet2.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>obs</t></is></c></row></sheetData></worksheet>'),
  });
}

describe("XLSX", () => {
  it("lê cabeçalho, textos compartilhados, números, ausentes e fórmulas (valor salvo)", () => {
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
      <row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>22.5</v></c><c r="C2" t="inlineStr"><is><t>R&amp;D</t></is></c></row>
      <row r="3"><c r="A3" t="s"><v>4</v></c><c r="C3"><f>B2*2</f><v>45</v></c></row>
    </sheetData></worksheet>`;
    const p = lerXlsx(xlsx(sheet, ["Amostra", "Ct (ciclos)", "Nota", "A1", "A2"]));
    expect(p.abas).toEqual(["Resultados", "Notas"]);
    expect(p.colunas).toEqual(["Amostra", "Ct (ciclos)", "Nota"]);
    expect(p.linhas).toEqual([
      ["A1", "22.5", "R&D"],
      ["A2", null, "45"],
    ]);
    expect(p.totalLinhas).toBe(2);
    expect(p.avisos.join(" ")).toMatch(/fórmula/);
  });
  it("abre outra aba quando pedida e recusa o que não é planilha", () => {
    expect(lerXlsx(xlsx("<worksheet><sheetData/></worksheet>", []), "Notas").colunas).toEqual(["obs"]);
    expect(() => lerXlsx(strToU8("não é zip"))).toThrow(OfficeError);
  });
});

describe("DOCX", () => {
  it("extrai parágrafos com entidades e tabulações", () => {
    const doc = zipSync({
      "word/document.xml": strToU8('<w:document><w:body><w:p><w:r><w:t>Anelamento a 58 °C</w:t></w:r><w:r><w:tab/><w:t xml:space="preserve"> por 30 s</w:t></w:r></w:p><w:p><w:r><w:t>Tampão &amp; Mg</w:t></w:r></w:p></w:body></w:document>'),
    });
    expect(textoDocx(doc)).toBe("Anelamento a 58 °C\t por 30 s\nTampão & Mg");
  });
});

describe("referências", () => {
  it("diferencia DOI, link e texto bibliográfico", () => {
    expect(classificarReferencia("https://doi.org/10.3791/3998")).toMatchObject({ forma: "doi", valor: "10.3791/3998" });
    expect(classificarReferencia("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3846334/")).toMatchObject({ forma: "url", titulo: "www.ncbi.nlm.nih.gov" });
    expect(classificarReferencia("Lorenz TC. Polymerase chain reaction. J Vis Exp. 2012").forma).toBe("bibliografica");
  });
});
