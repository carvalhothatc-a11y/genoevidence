import { describe, expect, it } from "vitest";
import { diaDeHoje, diaPorExtenso, EntradaRegistro, MAX_TEXTO, vezesEditado } from "@/lib/caderno/tipos";

describe("caderno: o dia", () => {
  it("usa o calendário local, não UTC", () => {
    // 1º de janeiro às 00:30 no fuso local ainda é dia 1, mesmo que em UTC já seja outro dia.
    expect(diaDeHoje(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    expect(diaDeHoje(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("escreve a data por extenso sem pular um dia", () => {
    // Interpretada como UTC, "2026-10-09" viraria 8 de outubro em fuso negativo.
    expect(diaPorExtenso("2026-10-09")).toBe("sexta, 9 de outubro de 2026");
    expect(diaPorExtenso("2026-03-01")).toBe("domingo, 1 de março de 2026");
  });

  it("data inválida continua como veio, sem inventar um dia", () => {
    expect(diaPorExtenso("ontem")).toBe("ontem");
  });
});

describe("caderno: o que a interface envia", () => {
  it("exige texto: um dia em branco não é registro", () => {
    const r = EntradaRegistro.safeParse({ dia: "2026-10-09", texto: "   " });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].message).toBe("Escreva o que você fez.");
  });

  it("recusa dia fora do formato", () => {
    expect(EntradaRegistro.safeParse({ dia: "09/10/2026", texto: "fiz a PCR" }).success).toBe(false);
  });

  it("aceita registro sem projeto nenhum", () => {
    const r = EntradaRegistro.safeParse({ dia: "2026-10-09", texto: "Repeti a PCR do TP53." });
    expect(r.success).toBe(true);
    expect(r.success && r.data.projetoId).toBeUndefined();
  });

  it("tira espaços das pontas, mas preserva as quebras de linha do meio", () => {
    const r = EntradaRegistro.safeParse({ dia: "2026-10-09", texto: "  linha 1\n\nlinha 2  " });
    expect(r.success && r.data.texto).toBe("linha 1\n\nlinha 2");
  });

  it("texto gigante é recusado em vez de cortado em silêncio", () => {
    expect(EntradaRegistro.safeParse({ dia: "2026-10-09", texto: "a".repeat(MAX_TEXTO + 1) }).success).toBe(false);
  });
});

describe("caderno: rastro de edição", () => {
  it("sem edição, nenhuma versão", () => {
    expect(vezesEditado({ versoes: [] })).toBe(0);
  });

  it("cada edição guardada conta como uma vez", () => {
    expect(vezesEditado({ versoes: [{ dia: "2026-10-09", texto: "a", substituidaEm: "2026-10-09T10:00:00Z" }] })).toBe(1);
  });
});
