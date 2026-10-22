import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { documentoDoDia, nomeDoArquivo, numerosInventados, type Reescrita } from "@/lib/caderno/relatorio";
import type { Registro } from "@/lib/caderno/tipos";

const base: Registro = {
  id: "r_abcdefgh1234",
  dia: "2026-10-22",
  texto: "repeti a pcr do tp53 a 58 graus, o controle negativo deu banda, provavelmente contaminação na master mix",
  criadoEm: "2026-10-22T18:00:00.000Z",
  atualizadoEm: "2026-10-22T18:00:00.000Z",
  arquivos: [],
  versoes: [],
};

const texto = (bytes: Uint8Array) => strFromU8(unzipSync(bytes)["word/document.xml"]);

const reescrito: Reescrita = {
  estado: "reescrito",
  titulo: "Amplificação de TP53 por PCR",
  secoes: [
    { titulo: "Procedimento", paragrafos: ["Repetiu-se a amplificação do gene TP53 por PCR a 58 °C."] },
    { titulo: "Observações", paragrafos: ["O controle negativo apresentou banda, possivelmente por contaminação da master mix."] },
  ],
};

describe("o documento do dia", () => {
  it("quando reescrito, traz o texto formal E o original no fim", () => {
    const d = texto(documentoDoDia(base, reescrito));
    expect(d).toContain("Repetiu-se a amplificação");
    expect(d).toContain("Anexo — a anotação como você escreveu");
    expect(d).toContain("repeti a pcr do tp53");
  });

  it("avisa EM DESTAQUE que foi reescrito, para ninguém confundir com o registro", () => {
    const d = texto(documentoDoDia(base, reescrito));
    expect(d).toMatch(/reescrito automaticamente/i);
    expect(d).toMatch(/confira se a reescrita manteve o que você quis dizer/i);
    // o aviso usa o bloco com borda e fundo
    expect(d).toContain("FEF4E2");
  });

  it("sem reescrita, o texto sai como foi escrito e o motivo aparece", () => {
    const d = texto(documentoDoDia(base, { estado: "fiel", motivo: "O assistente não está configurado." }));
    expect(d).toContain("repeti a pcr do tp53");
    expect(d).toMatch(/exatamente como você escreveu/i);
    expect(d).toContain("O assistente não está configurado.");
    // sem reescrita não existe anexo: o texto aparece uma vez só
    expect(d).not.toContain("Anexo —");
  });

  it("lista os arquivos e diz que não vão no documento", () => {
    const d = texto(
      documentoDoDia(
        { ...base, arquivos: [{ id: "a_1", nome: "gel.png", mime: "image/png", tamanho: 1, sha256: "x", enviadoEm: base.criadoEm }] },
        reescrito,
      ),
    );
    expect(d).toContain("gel.png");
    expect(d).toMatch(/não vão neste documento/i);
  });

  it("avisa quando o registro foi editado", () => {
    const d = texto(documentoDoDia({ ...base, versoes: [{ dia: base.dia, texto: "antes", substituidaEm: base.criadoEm }] }, reescrito));
    expect(d).toMatch(/editado 1 vez/);
  });

  it("o nome do arquivo tem a data, para não virar “registro (3).docx”", () => {
    expect(nomeDoArquivo(base)).toBe("registro-2026-10-22.docx");
  });

  it("o cabeçalho traz o dia por extenso e quem escreveu", () => {
    const d = texto(documentoDoDia(base, reescrito, { autor: "Thaisa Carvalho", projeto: "TCC" }));
    expect(d).toContain("quinta, 22 de outubro de 2026");
    expect(d).toContain("Thaisa Carvalho");
    expect(d).toContain("Projeto: TCC");
  });
});

describe("a trava contra número inventado", () => {
  it("deixa passar quando os números são os mesmos", () => {
    expect(numerosInventados("anelamento a 58 graus por 30 segundos", "Realizou-se o anelamento a 58 °C por 30 s.")).toEqual([]);
  });

  it("pega um valor que o modelo acrescentou", () => {
    expect(numerosInventados("corri o gel e deu banda", "Corrida em gel de agarose a 1,5% por 45 minutos.")).toEqual(["1.5", "45"]);
  });

  it("vírgula e ponto são o mesmo número", () => {
    expect(numerosInventados("gel a 1,5%", "Gel a 1.5%.")).toEqual([]);
  });

  it("tirar um número não é problema — inventar é", () => {
    expect(numerosInventados("58 graus e 30 segundos", "Realizou-se o anelamento a 58 °C.")).toEqual([]);
  });

  it("texto sem número nenhum passa", () => {
    expect(numerosInventados("repeti a pcr", "Repetiu-se a reação em cadeia da polimerase.")).toEqual([]);
  });
});
