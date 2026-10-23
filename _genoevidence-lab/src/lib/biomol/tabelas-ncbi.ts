/**
 * Códigos genéticos do NCBI, GERADOS a partir do arquivo oficial gc.prt (versão 4.6),
 * https://ftp.ncbi.nlm.nih.gov/entrez/misc/data/gc.prt — baixado em 2026-10-23, sha256 2aecbdd09ecc5e0d….
 *
 * Não edite à mão. A ordem dos 64 códons é a do NCBI: primeira base TCAG, segunda TCAG, terceira TCAG
 * (TTT, TTC, TTA, TTG, TCT, …). `aa` traz o aminoácido de cada códon ("*" = parada); `inicios` marca
 * com "M" os códons que a tabela aceita como início (e com "*" as paradas).
 */
export type TabelaNcbi = { id: number; nome: string; aa: string; inicios: string };

export const TABELAS_NCBI: readonly TabelaNcbi[] = [
  { id: 1, nome: "Standard", aa: "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "---M------**--*----M---------------M----------------------------" },
  { id: 2, nome: "Vertebrate Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG", inicios: "----------**--------------------MMMM----------**---M------------" },
  { id: 3, nome: "Yeast Mitochondrial", aa: "FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**----------------------MM---------------M------------" },
  { id: 4, nome: "Mold Mitochondrial; Protozoan Mitochondrial; Coelenterate Mitochondrial; Mycoplasma; Spiroplasma", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--MM------**-------M------------MMMM---------------M------------" },
  { id: 5, nome: "Invertebrate Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG", inicios: "---M------**--------------------MMMM---------------M------------" },
  { id: 6, nome: "Ciliate Nuclear; Dasycladacean Nuclear; Hexamita Nuclear", aa: "FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--------------*--------------------M----------------------------" },
  { id: 9, nome: "Echinoderm Mitochondrial; Flatworm Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG", inicios: "----------**-----------------------M---------------M------------" },
  { id: 10, nome: "Euplotid Nuclear", aa: "FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**-----------------------M----------------------------" },
  { id: 11, nome: "Bacterial, Archaeal and Plant Plastid", aa: "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "---M------**--*----M------------MMMM---------------M------------" },
  { id: 12, nome: "Alternative Yeast Nuclear", aa: "FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**--*----M---------------M----------------------------" },
  { id: 13, nome: "Ascidian Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG", inicios: "---M------**----------------------MM---------------M------------" },
  { id: 14, nome: "Alternative Flatworm Mitochondrial", aa: "FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG", inicios: "-----------*-----------------------M----------------------------" },
  { id: 15, nome: "Blepharisma Macronuclear", aa: "FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------*---*--------------------M----------------------------" },
  { id: 16, nome: "Chlorophycean Mitochondrial", aa: "FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------*---*--------------------M----------------------------" },
  { id: 21, nome: "Trematode Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG", inicios: "----------**-----------------------M---------------M------------" },
  { id: 22, nome: "Scenedesmus obliquus Mitochondrial", aa: "FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "------*---*---*--------------------M----------------------------" },
  { id: 23, nome: "Thraustochytrium Mitochondrial", aa: "FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--*-------**--*-----------------M--M---------------M------------" },
  { id: 24, nome: "Rhabdopleuridae Mitochondrial", aa: "FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG", inicios: "---M------**-------M---------------M---------------M------------" },
  { id: 25, nome: "Candidate Division SR1 and Gracilibacteria", aa: "FFLLSSSSYY**CCGWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "---M------**-----------------------M---------------M------------" },
  { id: 26, nome: "Pachysolen tannophilus Nuclear", aa: "FFLLSSSSYY**CC*WLLLAPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**--*----M---------------M----------------------------" },
  { id: 27, nome: "Karyorelict Nuclear", aa: "FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--------------*--------------------M----------------------------" },
  { id: 28, nome: "Condylostoma Nuclear", aa: "FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**--*--------------------M----------------------------" },
  { id: 29, nome: "Mesodinium Nuclear", aa: "FFLLSSSSYYYYCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--------------*--------------------M----------------------------" },
  { id: 30, nome: "Peritrich Nuclear", aa: "FFLLSSSSYYEECC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "--------------*--------------------M----------------------------" },
  { id: 31, nome: "Blastocrithidia Nuclear", aa: "FFLLSSSSYYEECCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "----------**-----------------------M----------------------------" },
  { id: 32, nome: "Balanophoraceae Plastid", aa: "FFLLSSSSYY*WCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", inicios: "---M------*---*----M------------MMMM---------------M------------" },
  { id: 33, nome: "Cephalodiscidae Mitochondrial", aa: "FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG", inicios: "---M-------*-------M---------------M---------------M------------" },
];
