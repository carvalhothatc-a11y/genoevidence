import { describe, expect, it } from "vitest";
import { moleculasCitadas } from "@/lib/cena/moleculas";

const termos = (t: string) => moleculasCitadas(t).map((m) => `${m.tipo}:${m.termo}`);

describe("moléculas citadas numa etapa", () => {
  it("reconhece o reagente e traduz o nome para a busca", () => {
    const m = moleculasCitadas("Pese 5 g de tiossulfato de sódio e dissolva em 100 mL.");
    expect(m).toHaveLength(1);
    expect(m[0].tipo).toBe("composto");
    expect(m[0].termo).toBe("tiossulfato de sódio");
    expect(m[0].consulta).toBe("sodium thiosulfate");
    expect(m[0].ambiguo).toBe(false);
  });

  it("separa gene de proteína pelo contexto da frase", () => {
    expect(termos("Amplifiquei o gene TP53 por PCR.")).toContain("gene:TP53");
    expect(termos("Detectei a proteína BRCA1 por western blot.")).toContain("proteina:BRCA1");
  });

  it("sem contexto, marca como ambíguo em vez de escolher", () => {
    const m = moleculasCitadas("Analisei TP53 na amostra.");
    const tp53 = m.find((x) => x.termo === "TP53");
    expect(tp53).toBeTruthy();
    expect(tp53!.ambiguo).toBe(true);
  });

  it("com contexto, não marca como ambíguo", () => {
    const m = moleculasCitadas("Amplifiquei o gene TP53 por PCR.");
    expect(m.find((x) => x.termo === "TP53")!.ambiguo).toBe(false);
  });

  it("não confunde siglas de técnica e de tampão com gene", () => {
    const t = termos("Corri o gel em TAE, revelei com UV e analisei por PCR. Usei SDS, EDTA e PBS.");
    expect(t.filter((x) => x.startsWith("gene:"))).toHaveLength(0);
  });

  it("não confunde unidades e métodos com gene", () => {
    const t = termos("Centrifuguei a 10000 RPM, medi o pH, analisei por TEM, XRD e FTIR, e reportei em TPM.");
    expect(t.filter((x) => x.startsWith("gene:"))).toHaveLength(0);
  });

  it("fórmula escrita com dígitos normais também não vira gene", () => {
    const t = termos("Preparei (NH4)2SO4 e CaCl2 em H2O, com Na2S2O3.");
    expect(t.filter((x) => x.startsWith("gene:")), t.join(",")).toHaveLength(0);
    expect(t).toContain("composto:sulfato de amônio");
    expect(t).toContain("composto:cloreto de cálcio");
  });

  it("reconhece proteínas escritas em minúscula", () => {
    expect(termos("Detectei p53 e GAPDH como controle.")).toContain("proteina:p53");
  });

  it("não repete a mesma molécula citada duas vezes", () => {
    const m = moleculasCitadas("Adicionei tiossulfato de sódio; depois mais tiossulfato de sódio.");
    expect(m).toHaveLength(1);
  });

  it("junta vários reagentes da mesma frase", () => {
    const t = termos("Dissolvi CaCl₂ e (NH₄)₂SO₄, e acidifiquei com HCl.");
    expect(t).toContain("composto:cloreto de cálcio");
    expect(t).toContain("composto:sulfato de amônio");
    expect(t).toContain("composto:ácido clorídrico");
  });

  it("limita quantas aparecem, para a interface não lotar", () => {
    const texto = "Usei tiossulfato de sódio, CaCl₂, (NH₄)₂SO₄, HCl, ácido cítrico, etanol, EDTA, DTT e ampicilina.";
    expect(moleculasCitadas(texto).length).toBeLessThanOrEqual(6);
    expect(moleculasCitadas(texto, 3)).toHaveLength(3);
  });

  it("frase sem molécula nenhuma não devolve nada", () => {
    expect(moleculasCitadas("Deixei a mistura sob agitação por 20 minutos.")).toEqual([]);
    expect(moleculasCitadas("")).toEqual([]);
  });

  it("a mesma frase devolve sempre a mesma lista, na mesma ordem", () => {
    const f = "Amplifiquei o gene TP53 e dissolvi tiossulfato de sódio.";
    expect(moleculasCitadas(f)).toEqual(moleculasCitadas(f));
  });
});
