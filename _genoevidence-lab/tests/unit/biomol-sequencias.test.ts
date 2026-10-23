import { describe, expect, it } from "vitest";
import {
  anticodon,
  codigoGenetico,
  codonsDoQuadro,
  complemento,
  composicao,
  detectarTipo,
  encontrarOrfs,
  lerFasta,
  limpar,
  paresWatsonCrick,
  reversoComplemento,
  seisQuadros,
  TABELAS,
  transcrever,
  traduzirQuadro,
  validar,
} from "@/lib/biomol/sequencias";
import { TABELAS_NCBI } from "@/lib/biomol/tabelas-ncbi";
import { nomeDeArquivo, paraCsv, paraFasta, paraJson } from "@/lib/biomol/exportar";

/**
 * Casos de referência PUBLICADOS, não inventados para o teste:
 *  - Biopython Tutorial and Cookbook, cap. 3 (Sequence objects): complemento, reverso-complemento,
 *    transcrição e tradução nas tabelas 1 e 2;
 *  - NCBI, The Genetic Codes (gc.prt): códons de parada e de início de cada tabela.
 */
const BIO_SEQ = "GATCGATGGGCCTATATAGGATCGAAAATCGC";
const CODIFICANTE = "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG";
const MOLDE = "CTATCGGGCACCCTTTCAGCGGCCCATTACAATGGCCAT";
const MRNA = "AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG";

describe("leitura de FASTA", () => {
  it("vários registros, com descrição, comentário e sequência em várias linhas", () => {
    const r = lerFasta(">gene1 uma descrição\nACGT\nacgt\n;comentário antigo\n>gene2\nTTTT\n");
    expect(r.registros).toEqual([
      { nome: "gene1", descricao: "uma descrição", seq: "ACGTACGT" },
      { nome: "gene2", descricao: undefined, seq: "TTTT" },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it("sequência solta, sem cabeçalho, vira um registro só", () => {
    expect(lerFasta("acg tta\n gcc").registros).toEqual([{ nome: "Sequência 1", seq: "ACGTTAGCC" }]);
  });

  it("texto antes do primeiro “>” é avisado, não engolido em silêncio", () => {
    const r = lerFasta("lixo\n>a\nACGT");
    expect(r.registros).toHaveLength(1);
    expect(r.avisos[0]).toMatch(/antes do primeiro cabeçalho/);
  });

  it("registro sem sequência é avisado", () => {
    const r = lerFasta(">vazio\n>cheio\nAC");
    expect(r.registros.map((x) => x.nome)).toEqual(["cheio"]);
    expect(r.avisos[0]).toMatch(/vazio/);
  });

  it("formato GenBank: números de posição e espaços saem, e são contados", () => {
    const l = limpar("     1 atgcc gggtt\n    11 aa");
    expect(l.seq).toBe("ATGCCGGGTTAA");
    expect(l.digitos).toBe(3);
    expect(l.espacos).toBeGreaterThan(0);
  });
});

describe("tipo e validação", () => {
  it("DNA claro, RNA claro, proteína clara", () => {
    expect(detectarTipo(BIO_SEQ)).toMatchObject({ tipo: "dna", clara: true });
    expect(detectarTipo(MRNA)).toMatchObject({ tipo: "rna", clara: true });
    expect(detectarTipo("MAIVMGRWKGAR")).toMatchObject({ tipo: "proteina", clara: true });
  });

  it("sequência curta só de ACGT não é afirmada como DNA (também é peptídeo)", () => {
    expect(detectarTipo("ACGT")).toMatchObject({ tipo: "dna", clara: false });
  });

  it("T e U juntos: pede para conferir", () => {
    expect(detectarTipo("ACGTUACGTUACGTU").clara).toBe(false);
  });

  it("aponta a posição do caractere inválido, sem apagar", () => {
    const v = validar("ACGXT", "dna");
    expect(v.valida).toBe(false);
    expect(v.invalidos).toEqual([{ posicao: 4, caractere: "X" }]);
  });

  it("mensagens específicas para U em DNA, T em RNA e lacunas", () => {
    expect(validar("ACGU", "dna").mensagem).toMatch(/U é de RNA/);
    expect(validar("ACGT", "rna").mensagem).toMatch(/T é de DNA/);
    expect(validar("AC-GT", "dna").mensagem).toMatch(/lacunas/);
  });

  it("códigos de ambiguidade são válidos e contados", () => {
    const v = validar("ACGTNRY", "dna");
    expect(v.valida).toBe(true);
    expect(v.ambiguos).toBe(3);
  });

  it("proteína: parada no fim é normal; no meio, é contada", () => {
    expect(validar("MKV*", "proteina").paradasInternas).toBe(0);
    expect(validar("MK*V*", "proteina").paradasInternas).toBe(1);
  });

  it("sequência vazia é inválida", () => {
    expect(validar("", "dna").valida).toBe(false);
  });
});

describe("composição e GC", () => {
  it("GC de casos triviais", () => {
    expect(composicao("GGCC", "dna").gc?.porcentagem).toBe(100);
    expect(composicao("ATAT", "dna").gc?.porcentagem).toBe(0);
    expect(composicao("ACGT", "dna").gc?.porcentagem).toBe(50);
  });

  it("N fica de fora do GC (e é contado); S conta como GC e W como AT", () => {
    const c = composicao("ACGTN", "dna").gc!;
    expect(c.porcentagem).toBe(50);
    expect(c.excluidos).toBe(1);
    expect(composicao("SSWW", "dna").gc?.porcentagem).toBe(50);
  });

  it("só N: GC desconhecido é null, não zero", () => {
    expect(composicao("NNNN", "dna").gc?.porcentagem).toBeNull();
  });

  it("GC da sequência do tutorial do Biopython: 15 de 32", () => {
    // gc_fraction("GATCGATGGGCCTATATAGGATCGAAAATCGC") = 0.46875
    expect(composicao(BIO_SEQ, "dna").gc?.porcentagem).toBeCloseTo(46.875, 10);
  });

  it("contagem por letra", () => {
    expect(composicao("AAC", "dna").contagem).toEqual({ A: 2, C: 1 });
    expect(composicao("MKM", "proteina")).toEqual({ comprimento: 3, contagem: { M: 2, K: 1 } });
  });
});

describe("fitas: complemento e orientação", () => {
  it("complemento e reverso-complemento (Biopython Tutorial, cap. 3)", () => {
    expect(complemento(BIO_SEQ, "dna")).toBe("CTAGCTACCCGGATATATCCTAGCTTTTAGCG");
    expect(reversoComplemento(BIO_SEQ, "dna")).toBe("GCGATTTTCGATCCTATATAGGCCCATCGATC");
  });

  it("reverso-complemento duas vezes devolve a original", () => {
    expect(reversoComplemento(reversoComplemento(BIO_SEQ, "dna"), "dna")).toBe(BIO_SEQ);
  });

  it("o complemento pareia base a base com a original (antiparalela, lida 3'→5')", () => {
    const p = paresWatsonCrick(BIO_SEQ, complemento(BIO_SEQ, "dna"));
    expect(p.naoPareados).toBe(0);
    expect(p.gc + p.at).toBe(BIO_SEQ.length);
    expect(p.gc).toBe(15);
  });

  it("RNA: A pareia com U", () => {
    expect(complemento("AUGC", "rna")).toBe("UACG");
  });

  it("IUPAC: R↔Y, K↔M, B↔V, D↔H; S e W são autocomplementares", () => {
    expect(complemento("RYKMBVDHSWN", "dna")).toBe("YRMKVBHDSWN");
  });

  it("caractere sem complemento é erro, não é pulado", () => {
    expect(() => complemento("ACXG", "dna")).toThrow(/X/);
  });
});

describe("transcrição", () => {
  it("da fita codificante (Biopython Tutorial)", () => {
    const t = transcrever(CODIFICANTE, "codificante");
    expect(t.rna).toBe(MRNA);
    expect(t.molde).toBe(MOLDE);
  });

  it("da fita molde dá o MESMO mRNA", () => {
    const t = transcrever(MOLDE, "molde");
    expect(t.rna).toBe(MRNA);
    expect(t.codificante).toBe(CODIFICANTE);
  });

  it("o mRNA é complementar e antiparalelo à molde", () => {
    const t = transcrever(CODIFICANTE, "codificante");
    // molde 5'→3' invertida = molde 3'→5', que pareia com o mRNA 5'→3'
    const p = paresWatsonCrick(t.rna, [...t.molde].reverse().join("").replace(/T/g, "U"));
    expect(p.naoPareados).toBe(0);
  });
});

describe("código genético (NCBI gc.prt)", () => {
  it("27 tabelas, cada uma com 64 códons", () => {
    expect(TABELAS_NCBI).toHaveLength(27);
    for (const t of TABELAS_NCBI) {
      expect(t.aa).toHaveLength(64);
      expect(t.inicios).toHaveLength(64);
    }
    expect(TABELAS.find((t) => t.id === 1)?.nome).toBe("Padrão");
  });

  it("tabela 1: paradas TAA, TAG, TGA; inícios TTG, CTG, ATG; 20 aminoácidos", () => {
    const c = codigoGenetico(1);
    expect(c.paradas.sort()).toEqual(["TAA", "TAG", "TGA"]);
    expect(c.inicios.sort()).toEqual(["ATG", "CTG", "TTG"]);
    expect(new Set(TABELAS_NCBI[0].aa.replace(/\*/g, "")).size).toBe(20);
  });

  it("tabela 2 (mitocôndria de vertebrados): AGA e AGG param, TGA é Trp, ATA é Met", () => {
    const c = codigoGenetico(2);
    expect(c.paradas.sort()).toEqual(["AGA", "AGG", "TAA", "TAG"]);
    expect(c.aminoacido("TGA")).toBe("W");
    expect(c.aminoacido("ATA")).toBe("M");
  });

  it("tabela 11 (bactérias): sete códons de início", () => {
    expect(codigoGenetico(11).inicios.sort()).toEqual(["ATA", "ATC", "ATG", "ATT", "CTG", "GTG", "TTG"]);
  });

  it("tabelas com parada que depende do contexto (27, 28, 31) são sinalizadas", () => {
    expect(codigoGenetico(27).paradasAmbiguas).toEqual(["TGA"]);
    expect(codigoGenetico(28).paradasAmbiguas.sort()).toEqual(["TAA", "TAG", "TGA"]);
    expect(codigoGenetico(1).paradasAmbiguas).toEqual([]);
  });

  it("ambiguidade: traduz quando todas as possibilidades dão o mesmo aminoácido", () => {
    const c = codigoGenetico(1);
    expect(c.aminoacido("GCN")).toBe("A");
    expect(c.aminoacido("TAR")).toBe("*");
    expect(c.aminoacido("ATH")).toBe("I");
    expect(c.aminoacido("ATN")).toBe("X"); // ATG é Met
    expect(c.aminoacido("AUG")).toBe("M"); // aceita RNA
  });

  it("tabela inexistente é erro", () => {
    expect(() => codigoGenetico(7)).toThrow(/não existe/);
  });

  it("anticódon do AUG é CAU (5'→3')", () => {
    expect(anticodon("AUG")).toBe("CAU");
    expect(anticodon("UUU")).toBe("AAA");
  });
});

describe("tradução e quadros de leitura", () => {
  it("Biopython Tutorial: tabela 1 → MAIVMGR*KGAR*; tabela 2 → MAIVMGRWKGAR*", () => {
    expect(traduzirQuadro(CODIFICANTE, 1, codigoGenetico(1)).proteina).toBe("MAIVMGR*KGAR*");
    expect(traduzirQuadro(CODIFICANTE, 1, codigoGenetico(2)).proteina).toBe("MAIVMGRWKGAR*");
    expect(traduzirQuadro(MRNA, 1, codigoGenetico(1)).proteina).toBe("MAIVMGR*KGAR*");
  });

  it("os seis quadros, com a convenção do NCBI para os reversos", () => {
    const q = seisQuadros("ATGAAATAG", codigoGenetico(1));
    expect(q.map((x) => [x.quadro, x.proteina])).toEqual([
      [1, "MK*"],
      [2, "*N"],
      [3, "EI"],
      [-1, "LFH"],
      [-2, "YF"],
      [-3, "IS"],
    ]);
  });

  it("posições dos códons do quadro −1 apontam para a fita dada", () => {
    const c = codonsDoQuadro("ATGAAATAG", -1, codigoGenetico(1));
    expect(c[0]).toEqual({ inicio: 7, fim: 9, codon: "CTA", aa: "L" });
    expect(c[2]).toEqual({ inicio: 1, fim: 3, codon: "CAT", aa: "H" });
  });

  it("a sobra (bases que não formam códon) é informada", () => {
    expect(traduzirQuadro("ATGAA", 1, codigoGenetico(1)).sobra).toBe(2);
    expect(traduzirQuadro("ATGAA", 2, codigoGenetico(1)).sobra).toBe(1);
  });
});

describe("ORFs", () => {
  const cod = codigoGenetico(1);
  const ORF = "ATG" + "GCT".repeat(30) + "TAA"; // 96 nt
  const SEQ = "CC" + ORF + "GG";

  it("acha a ORF, com posição, quadro e proteína", () => {
    const orfs = encontrarOrfs(SEQ, cod);
    expect(orfs).toHaveLength(1);
    expect(orfs[0]).toMatchObject({ quadro: 3, fita: "+", inicio: 3, fim: 98, nt: 96, proteina: "M" + "A".repeat(30), codonParada: "TAA", completa: true });
  });

  it("na fita reversa, as posições continuam na fita dada", () => {
    const rc = reversoComplemento(SEQ, "dna");
    const orfs = encontrarOrfs(rc, cod);
    expect(orfs).toHaveLength(1);
    expect(orfs[0]).toMatchObject({ fita: "-", inicio: 3, fim: 98, nt: 96, proteina: "M" + "A".repeat(30) });
  });

  it("respeita o comprimento mínimo", () => {
    expect(encontrarOrfs(SEQ, cod, { minimoNt: 97 })).toHaveLength(0);
    expect(encontrarOrfs(SEQ, cod, { minimoNt: 96 })).toHaveLength(1);
  });

  it("sem parada até o fim: só entra se pedir, e marcada como incompleta", () => {
    const sem = "ATG" + "GCT".repeat(30);
    expect(encontrarOrfs(sem, cod)).toHaveLength(0);
    const o = encontrarOrfs(sem, cod, { incluirIncompletas: true });
    expect(o[0]).toMatchObject({ completa: false, nt: 93, codonParada: undefined });
  });

  it("ATG interno não gera uma segunda ORF (aninhada)", () => {
    const aninhada = "ATG" + "GCT".repeat(10) + "ATG" + "GCT".repeat(25) + "TAA";
    const o = encontrarOrfs(aninhada, cod, { minimoNt: 30 });
    expect(o.filter((x) => x.fita === "+")).toHaveLength(1);
  });

  it("início alternativo (GTG, tabela 11) só com a opção; e vira M na proteína, como no NCBI", () => {
    const gtg = "GTG" + "GCT".repeat(30) + "TAA";
    expect(encontrarOrfs(gtg, codigoGenetico(11)).filter((o) => o.fita === "+")).toHaveLength(0);
    const o = encontrarOrfs(gtg, codigoGenetico(11), { inicios: "tabela" }).filter((x) => x.fita === "+");
    expect(o[0].proteina.startsWith("MA")).toBe(true);
    expect(o[0].codonInicio).toBe("GTG");
  });
});

describe("exportar", () => {
  it("FASTA em linhas de 60", () => {
    const f = paraFasta([{ nome: "meu gene", descricao: "teste", seq: "A".repeat(61) }]);
    expect(f).toBe(">meu_gene teste\n" + "A".repeat(60) + "\nA\n");
  });

  it("CSV escapa aspas, vírgulas e protege contra fórmula de planilha", () => {
    const csv = paraCsv(["a", "b", "c"], [{ a: 'x,"y"', b: "=SOMA(1)", c: -3 }, { a: "-", b: "+1", c: null }]);
    expect(csv).toBe('a,b,c\r\n"x,""y""",\'=SOMA(1),-3\r\n-,+1,\r\n');
  });

  it("JSON legível e nome de arquivo sem acento nem espaço", () => {
    expect(JSON.parse(paraJson({ a: 1 }))).toEqual({ a: 1 });
    expect(nomeDeArquivo("Proteína do gene X", "fasta")).toBe("Proteina-do-gene-X.fasta");
  });
});

describe("exemplo fictício", () => {
  it("o DNA traduz para Met + crambina (PDB 1CRN) + parada, e tem uma ORF só na fita direta", async () => {
    const { CRAMBINA, EXEMPLO_FASTA } = await import("@/lib/biomol/exemplos");
    const [ex, variante] = lerFasta(EXEMPLO_FASTA).registros;
    expect(ex.nome).toMatch(/ficticio/);
    expect(variante.nome).toMatch(/ficticio/);
    expect(traduzirQuadro(ex.seq, 1, codigoGenetico(1)).proteina).toBe("M" + CRAMBINA + "*");
    const orfs = encontrarOrfs(ex.seq, codigoGenetico(1));
    expect(orfs[0]).toMatchObject({ fita: "+", quadro: 1, inicio: 1, fim: ex.seq.length, proteina: "M" + CRAMBINA });
    // a variante: 3 trocas e 1 aminoácido a menos
    const pv = traduzirQuadro(variante.seq, 1, codigoGenetico(1)).proteina;
    expect(pv.length).toBe(CRAMBINA.length + 1);
    expect(pv.endsWith("*")).toBe(true);
  });
});
