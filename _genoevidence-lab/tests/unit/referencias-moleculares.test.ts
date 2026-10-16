import { describe, expect, it } from "vitest";
import { OBJETO_IDS, type ObjetoId } from "@/lib/cena/biblioteca";
import { quantosTemEstrutura, referenciaDoObjeto } from "@/lib/cena/referencias-moleculares";

describe("referência molecular de um objeto da cena", () => {
  it("equipamento e recipiente não entram no painel", () => {
    for (const id of ["micropipeta", "termociclador", "centrifuga", "microtubo", "placa_petri", "proveta"] as ObjetoId[])
      expect(referenciaDoObjeto(id), id).toBeNull();
  });

  it("todo objeto do vocabulário tem resposta — nenhum cai no vazio", () => {
    for (const id of OBJETO_IDS) {
      const r = referenciaDoObjeto(id);
      expect(r === null || r.estado === "tem" || r.estado === "sem", id).toBe(true);
    }
  });

  it("DNA traz uma estrutura real, marcada como EXEMPLO", () => {
    const r = referenciaDoObjeto("dna");
    expect(r?.estado).toBe("tem");
    if (r?.estado !== "tem") return;
    expect(r.alvos[0]).toEqual({ tipo: "estrutura", pdb: "1BNA", titulo: "Dodecâmero de B-DNA (Drew–Dickerson)" });
    expect(r.exemplo).toBe(true);
    expect(r.nota).toMatch(/não é a sequência do seu experimento/i);
  });

  it("toda referência marcada como exemplo diz que não é a molécula do experimento", () => {
    for (const id of OBJETO_IDS) {
      const r = referenciaDoObjeto(id);
      if (r?.estado !== "tem" || !r.exemplo) continue;
      expect(r.nota.length, id).toBeGreaterThan(40);
    }
  });

  it("os dNTPs NÃO são exemplo: são exatamente aqueles quatro", () => {
    const r = referenciaDoObjeto("nucleotideos");
    expect(r?.estado).toBe("tem");
    if (r?.estado !== "tem") return;
    expect(r.exemplo).toBe(false);
    expect(r.alvos.map((a) => (a.tipo === "composto" ? a.nome : ""))).toEqual(["dATP", "dCTP", "dGTP", "dTTP"]);
    expect(r.alvos.every((a) => a.tipo === "composto" && a.cid > 0)).toBe(true);
  });

  it("célula, bactéria e vírus dizem POR QUE não há estrutura", () => {
    for (const id of ["celula", "bacteria", "virus"] as ObjetoId[]) {
      const r = referenciaDoObjeto(id);
      expect(r?.estado, id).toBe("sem");
      if (r?.estado !== "sem") continue;
      expect(r.motivo.length, id).toBeGreaterThan(30);
    }
  });

  it("o que é específico do experimento não ganha estrutura emprestada", () => {
    // primer, produto da PCR e plasmídeo são a sequência de quem fez — não existe estrutura deles
    for (const id of ["primer", "produto_pcr", "plasmideo", "precipitado", "amostra"] as ObjetoId[])
      expect(referenciaDoObjeto(id)?.estado, id).toBe("sem");
  });

  it("termo genérico manda escrever o nome em vez de chutar", () => {
    for (const id of ["proteina", "antibiotico", "acido", "solvente", "sal_precursor"] as ObjetoId[]) {
      const r = referenciaDoObjeto(id);
      expect(r?.estado, id).toBe("sem");
      if (r?.estado !== "sem") continue;
      expect(r.motivo, id).toMatch(/escreva|nome/i);
    }
  });

  it("nenhum código de estrutura inventado: todos têm 4 caracteres no formato do PDB", () => {
    for (const id of OBJETO_IDS) {
      const r = referenciaDoObjeto(id);
      if (r?.estado !== "tem") continue;
      for (const a of r.alvos) if (a.tipo === "estrutura") expect(a.pdb, `${id}: ${a.pdb}`).toMatch(/^[0-9][A-Z0-9]{3}$/);
    }
  });

  it("conta quantos elementos da cena têm molécula real", () => {
    expect(quantosTemEstrutura(["dna", "polimerase", "celula", "microtubo"])).toBe(2);
    expect(quantosTemEstrutura([])).toBe(0);
  });
});
