import { describe, expect, it } from "vitest";
import { duracaoReplicacao, duracaoTranscricao, estadoReplicacao, estadoTranscricao, resultadoReplicacao, roteiroTraducao } from "@/lib/biomol/processos";
import { codigoGenetico, complemento, encontrarOrfs, paresWatsonCrick, transcrever, traduzirQuadro } from "@/lib/biomol/sequencias";
import { CRAMBINA, EXEMPLO_FASTA } from "@/lib/biomol/exemplos";
import { lerFasta } from "@/lib/biomol/sequencias";

/**
 * O que a animação mostra tem de bater com o que as operações calculam. Estes testes percorrem o
 * roteiro de cada processo do começo ao fim e conferem direção, ordem e resultado.
 */
const [EX] = lerFasta(EXEMPLO_FASTA).registros;
const SEQ = "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG";

describe("replicação", () => {
  const n = SEQ.length;
  const F = 8;
  const fim = duracaoReplicacao(n, F);

  it("no começo nada aberto nem sintetizado; no fim tudo pronto e ligado", () => {
    const a = estadoReplicacao(n, 0, F);
    expect(a.aberto).toBe(0);
    expect(a.lider.some(Boolean) || a.atrasada.some(Boolean)).toBe(false);
    const z = estadoReplicacao(n, fim, F);
    expect(z.aberto).toBe(n);
    expect(z.lider.every(Boolean)).toBe(true);
    expect(z.atrasada.every(Boolean)).toBe(true);
    expect(z.ligados).toBe(true);
  });

  it("nada é sintetizado antes de a forquilha abrir aquele trecho", () => {
    for (let t = 0; t <= fim; t += 0.5) {
      const e = estadoReplicacao(n, t, F);
      e.lider.forEach((x, i) => x && expect(i).toBeLessThan(e.aberto));
      e.atrasada.forEach((x, i) => x && expect(i).toBeLessThan(e.aberto));
    }
  });

  it("fita líder: contínua, cresce no sentido da forquilha (sem buracos)", () => {
    for (let t = 0; t <= fim; t++) {
      const l = estadoReplicacao(n, t, F).lider;
      const k = l.indexOf(false);
      if (k >= 0) expect(l.slice(k).some(Boolean)).toBe(false);
    }
  });

  it("fita atrasada: em fragmentos, cada um crescendo no sentido CONTRÁRIO ao da forquilha", () => {
    let antes = estadoReplicacao(n, 0, F);
    for (let t = 1; t <= fim; t++) {
      const agora = estadoReplicacao(n, t, F);
      const novos = agora.atrasada.map((x, i) => (x && !antes.atrasada[i] ? i : -1)).filter((i) => i >= 0);
      // dentro de cada fragmento, a posição nova fica à ESQUERDA das já feitas
      for (const i of novos) {
        const j = agora.fragmento[i];
        const feitasDoFragmento = antes.atrasada.map((x, k) => (x && antes.fragmento[k] === j ? k : -1)).filter((k) => k >= 0);
        if (feitasDoFragmento.length) expect(i).toBeLessThan(Math.min(...feitasDoFragmento));
      }
      antes = agora;
    }
    const fim2 = estadoReplicacao(n, fim, F);
    expect(new Set(fim2.fragmento).size).toBe(Math.ceil(n / F));
  });

  it("resultado semiconservativo: cada filha tem uma fita velha e uma nova, complementares", () => {
    const r = resultadoReplicacao(SEQ);
    expect(paresWatsonCrick(r.filha1.velha, r.filha1.nova).naoPareados).toBe(0);
    expect(paresWatsonCrick(r.filha2.nova, r.filha2.velha).naoPareados).toBe(0);
    expect(r.filha1.velha).toBe(SEQ);
    expect(r.filha2.nova).toBe(SEQ);
    expect(r.filha2.velha).toBe(complemento(SEQ, "dna"));
  });
});

describe("transcrição", () => {
  const { rna } = transcrever(SEQ, "codificante");

  it("o RNA revelado é sempre um começo do mRNA calculado, e no fim é ele inteiro", () => {
    for (let t = 0; t <= duracaoTranscricao(rna.length); t++) {
      const e = estadoTranscricao(rna, t);
      expect(rna.startsWith(e.rna)).toBe(true);
    }
    const z = estadoTranscricao(rna, duracaoTranscricao(rna.length));
    expect(z.rna).toBe(rna);
    expect(z.terminou).toBe(true);
    expect(z.hibrido).toBe(0);
  });

  it("a bolha acompanha a polimerase e tem no máximo 12 pares; o híbrido, no máximo 8", () => {
    for (let t = 0; t < rna.length; t++) {
      const e = estadoTranscricao(rna, t);
      expect(e.bolha[1] - e.bolha[0]).toBeLessThanOrEqual(12);
      expect(e.pos).toBeGreaterThanOrEqual(e.bolha[0]);
      expect(e.pos).toBeLessThanOrEqual(e.bolha[1]);
      expect(e.hibrido).toBeLessThanOrEqual(8);
    }
  });
});

describe("tradução", () => {
  const cod = codigoGenetico(1);

  it("Biopython: AUGGCCAUUGUAAUGGGCCGCUGA… → MAIVMGR e para no UGA", () => {
    const r = roteiroTraducao(transcrever(SEQ, "codificante").rna, cod);
    expect(r.inicio).toBe(0);
    expect(r.proteina).toBe("MAIVMGR");
    expect(r.parada).toEqual({ pos: 21, codon: "UGA" });
  });

  it("cada passo tem o anticódon complementar e antiparalelo ao códon", () => {
    const r = roteiroTraducao(transcrever(SEQ, "codificante").rna, cod);
    for (const p of r.passos) {
      const anti3a5 = [...p.anticodon].reverse().join("");
      expect(paresWatsonCrick(p.codon, anti3a5).naoPareados).toBe(0);
    }
    expect(r.passos[0]).toMatchObject({ codon: "AUG", anticodon: "CAU", aa: "M" });
  });

  it("começa no primeiro AUG (varredura), não na primeira base", () => {
    const r = roteiroTraducao("GGCAUGUUUUAA", cod);
    expect(r.inicio).toBe(3);
    expect(r.proteina).toBe("MF");
  });

  it("sem AUG: não traduz e diz isso (inicio −1)", () => {
    expect(roteiroTraducao("GGGCCCUUU", cod)).toMatchObject({ inicio: -1, proteina: "" });
  });

  it("o exemplo fictício: a tradução passo a passo dá a mesma proteína da ORF (Met + crambina)", () => {
    const mrna = transcrever(EX.seq, "codificante").rna;
    const r = roteiroTraducao(mrna, cod);
    expect(r.proteina).toBe("M" + CRAMBINA);
    expect(r.proteina).toBe(encontrarOrfs(EX.seq, cod)[0].proteina);
    expect(r.proteina + "*").toBe(traduzirQuadro(EX.seq, 1, cod).proteina);
  });
});

describe("tradução no tempo", async () => {
  const { estadoTraducao, duracaoTraducao } = await import("@/lib/biomol/processos");
  const r = roteiroTraducao(transcrever(SEQ, "codificante").rna, codigoGenetico(1));

  it("a cadeia cresce de um em um, sempre como começo da proteína, e termina inteira e liberada", () => {
    let antes = "";
    for (let t = 0; t <= duracaoTraducao(r); t += 0.05) {
      const e = estadoTraducao(r, t);
      expect(r.proteina.startsWith(e.peptideo)).toBe(true);
      expect(e.peptideo.length - antes.length).toBeLessThanOrEqual(1);
      expect(e.peptideo.length).toBeGreaterThanOrEqual(antes.length);
      antes = e.peptideo;
    }
    const z = estadoTraducao(r, duracaoTraducao(r));
    expect(z.peptideo).toBe("MAIVMGR");
    expect(z.liberado).toBe(true);
  });

  it("fases na ordem: varredura → início → alongamento → terminação → fim", () => {
    const fases: string[] = [];
    for (let t = 0; t <= duracaoTraducao(r) + 0.5; t += 0.1) {
      const f = estadoTraducao(r, t).fase;
      if (fases[fases.length - 1] !== f) fases.push(f);
    }
    expect(fases).toEqual(["varredura", "inicio", "alongamento", "terminacao", "fim"]);
  });

  it("o sítio A recebe o códon seguinte ao do sítio P", () => {
    for (let t = 2; t < 2 + r.passos.length - 1; t += 0.1) {
      const e = estadoTraducao(r, t);
      if (e.a >= 0) expect(e.a).toBe(e.p + 1);
    }
  });
});
