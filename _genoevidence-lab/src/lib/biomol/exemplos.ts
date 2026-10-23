/**
 * Exemplos da área BioMol. São FICTÍCIOS e dizem isso onde aparecem.
 *
 * O DNA abaixo foi montado para o exemplo: é uma "tradução reversa" da crambina — proteína pública,
 * de estrutura conhecida (PDB 1CRN) — com códons escolhidos aqui, mais um ATG de início e um TAA de
 * parada. Esse gene não existe na natureza com esta sequência. A vantagem de usar uma proteína real
 * por trás é que o caminho inteiro (DNA → RNA → proteína → procurar estrutura) leva a um resultado
 * que dá para conferir: a busca no PDB acha a 1CRN.
 *
 * A variante tem três trocas de aminoácido e um códon a menos, para o alinhamento ter o que mostrar.
 */

/** Sequência da crambina no PDB 1CRN (entidade 1), conferida em https://www.rcsb.org/fasta/entry/1CRN. */
export const CRAMBINA = "TTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN";

export const EXEMPLO_FASTA = `>exemplo_ficticio_crambina DNA fictício que codifica a crambina (códons escolhidos para o exemplo)
ATGACCACCTGCTGCCCCAGCATCGTGGCCCGCAGCAACTTCAACGTGTGCCGCCTGCCCGGCACC
CCCGAGGCCATCTGCGCCACCTACACCGGCTGCATCATCATCCCCGGCGCCACCTGCCCCGGCGAC
TACGCCAACTAA
>exemplo_ficticio_variante variante fictícia: 3 trocas e 1 códon a menos
ATGACCACCTGCTGCCCCAGCATCGTGGCCAAGAGCAACTTCAACGTGTGCCGCCTGCCCGGCACC
CCCGAGGCCCTGTGCGCCACCTACACCTGCATCATCATCCCCGGCGCCACCTGCAGCGGCGACTAC
GCCAACTAA
`;

export const AVISO_EXEMPLO =
  "Exemplo fictício: o DNA foi montado para esta demonstração (os códons foram escolhidos aqui). Ele codifica a crambina, uma proteína pública de estrutura conhecida (PDB 1CRN), mas este gene não existe na natureza com esta sequência.";
