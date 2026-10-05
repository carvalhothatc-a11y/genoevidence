/**
 * Catálogo de referências usadas pelos MÓDULOS EDUCATIVOS embutidos (não pelos projetos do pesquisador).
 *
 * Cada entrada registra exatamente o que foi verificado, e como:
 *  - "metadados":           título/autores/DOI conferidos no PubMed. Conteúdo NÃO lido.
 *  - "resumo":              além dos metadados, o resumo (abstract) foi lido.
 *  - "texto_completo":      texto integral obtido do PubMed Central e lido; seções listadas em `sectionsRead`.
 *
 * Verificação realizada em 2026-10-02 (módulo de PCR) e 2026-10-04 (demais técnicas) via conector PubMed (MCP).
 * Observação: o texto completo obtido do PMC vem sem paginação e com alguns símbolos perdidos
 * (ex.: expoentes e subscritos). Esses pontos estão registrados em `extractionCaveats`.
 */

export type VerificationLevel = "metadados" | "resumo" | "texto_completo" | "nao_verificado";

export type CatalogSource = {
  id: string;
  shortCitation: string;
  citation: string;
  year: number;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  url: string;
  verification: VerificationLevel;
  verifiedAt?: string;
  verifiedVia?: string;
  sectionsRead?: string[];
  extractionCaveats?: string[];
  scope: string;
};

const VERIFIED_AT = "2026-10-02";
const VIA = "PubMed / PubMed Central (conector MCP)";
const VERIFIED_AT_TECNICAS = "2026-10-04";

export const SOURCES: Record<string, CatalogSource> = {
  lorenz2012: {
    id: "lorenz2012",
    shortCitation: "Lorenz, 2012",
    citation:
      "Lorenz TC. Polymerase chain reaction: basic protocol plus troubleshooting and optimization strategies. J Vis Exp. 2012;(63):e3998.",
    year: 2012,
    doi: "10.3791/3998",
    pmid: "22664923",
    pmcid: "PMC4846334",
    url: "https://doi.org/10.3791/3998",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    sectionsRead: [
      "Protocolo §1 Designing Primers",
      "§2 Materials and Reagents",
      "§3 Setting up a Reaction Mixture",
      "§4 Basic PCR Protocol (+ Notas)",
      "§5 Calculating Melting Temperature",
      "§6 Setting Up Thermal Cycling Conditions",
      "§7 Important Considerations When Troubleshooting PCR",
      "§8 Manipulating PCR Reagents",
      "§12 Modifications to Cycling Conditions",
      "§13 Representative Results",
      "Tabelas 1–2; legendas das figuras (numeração das figuras não preservada no texto obtido); Discussão",
    ],
    extractionCaveats: [
      "Expoentes perdidos na extração: a faixa ótima de moléculas-molde (§8) aparece como '10 a 10 moléculas'; o valor não é utilizado.",
      "Fórmulas de Tm (§5, §12) chegaram incompletas; nenhuma fórmula foi implementada a partir delas.",
      "Divergência interna: §8 cita 50 µM de cada dNTP como concentração usual; a Tabela 1 usa 200 µM.",
    ],
    scope: "Protocolo básico de PCR convencional, funções dos reagentes, ciclagem e solução de problemas.",
  },
  lee2012: {
    id: "lee2012",
    shortCitation: "Lee et al., 2012",
    citation:
      "Lee PY, Costumbrado J, Hsu CY, Kim YH. Agarose gel electrophoresis for the separation of DNA fragments. J Vis Exp. 2012;(62):3923.",
    year: 2012,
    doi: "10.3791/3923",
    pmid: "22546956",
    pmcid: "PMC4846332",
    url: "https://doi.org/10.3791/3923",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    sectionsRead: [
      "Resumo",
      "Protocolo §1 Preparation of the Gel",
      "§2 Setting up of Gel Apparatus and Separation of DNA Fragments",
      "§3 Observing Separated DNA fragments",
      "§4 Representative Results",
      "Discussão",
    ],
    scope: "Preparo de gel de agarose, montagem da cuba, migração e estimativa de tamanho de fragmentos.",
  },
  saiki1988: {
    id: "saiki1988",
    shortCitation: "Saiki et al., 1988",
    citation:
      "Saiki RK, Gelfand DH, Stoffel S, Scharf SJ, Higuchi R, Horn GT, Mullis KB, Erlich HA. Primer-directed enzymatic amplification of DNA with a thermostable DNA polymerase. Science. 1988;239(4839):487-491.",
    year: 1988,
    doi: "10.1126/science.2448875",
    pmid: "2448875",
    url: "https://doi.org/10.1126/science.2448875",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Uso da DNA polimerase termoestável de Thermus aquaticus na PCR.",
  },
  chien1976: {
    id: "chien1976",
    shortCitation: "Chien et al., 1976",
    citation:
      "Chien A, Edgar DB, Trela JM. Deoxyribonucleic acid polymerase from the extreme thermophile Thermus aquaticus. J Bacteriol. 1976;127(3):1550-1557.",
    year: 1976,
    doi: "10.1128/jb.127.3.1550-1557.1976",
    pmid: "8432",
    pmcid: "PMC232952",
    url: "https://doi.org/10.1128/jb.127.3.1550-1557.1976",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Caracterização da DNA polimerase de T. aquaticus (temperatura ótima, cofator divalente, dNTPs).",
  },
  mullis1987: {
    id: "mullis1987",
    shortCitation: "Mullis & Faloona, 1987",
    citation:
      "Mullis KB, Faloona FA. Specific synthesis of DNA in vitro via a polymerase-catalyzed chain reaction. Methods Enzymol. 1987;155:335-350.",
    year: 1987,
    doi: "10.1016/0076-6879(87)55023-6",
    pmid: "3431465",
    url: "https://doi.org/10.1016/0076-6879(87)55023-6",
    verification: "metadados",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Referência histórica do método. Conteúdo não analisado (resumo indisponível no PubMed).",
  },
  kwok1989: {
    id: "kwok1989",
    shortCitation: "Kwok & Higuchi, 1989",
    citation: "Kwok S, Higuchi R. Avoiding false positives with PCR. Nature. 1989;339(6221):237-238.",
    year: 1989,
    doi: "10.1038/339237a0",
    pmid: "2716852",
    url: "https://doi.org/10.1038/339237a0",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Contaminação e falsos positivos em PCR. Apenas o resumo foi lido.",
  },
  bustin2009: {
    id: "bustin2009",
    shortCitation: "Bustin et al., 2009 (MIQE)",
    citation:
      "Bustin SA, Benes V, Garson JA, et al. The MIQE guidelines: minimum information for publication of quantitative real-time PCR experiments. Clin Chem. 2009;55(4):611-622.",
    year: 2009,
    doi: "10.1373/clinchem.2008.112797",
    pmid: "19246619",
    url: "https://doi.org/10.1373/clinchem.2008.112797",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Informação mínima para relatar experimentos de qPCR.",
  },
  livak2001: {
    id: "livak2001",
    shortCitation: "Livak & Schmittgen, 2001",
    citation:
      "Livak KJ, Schmittgen TD. Analysis of relative gene expression data using real-time quantitative PCR and the 2(-Delta Delta C(T)) Method. Methods. 2001;25(4):402-408.",
    year: 2001,
    doi: "10.1006/meth.2001.1262",
    pmid: "11846609",
    url: "https://doi.org/10.1006/meth.2001.1262",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Quantificação relativa (2^-ΔΔCt) versus absoluta em qPCR.",
  },
  wagner2012: {
    id: "wagner2012",
    shortCitation: "Wagner et al., 2012",
    citation:
      "Wagner GP, Kin K, Lynch VJ. Measurement of mRNA abundance using RNA-seq data: RPKM measure is inconsistent among samples. Theory Biosci. 2012;131(4):281-285.",
    year: 2012,
    doi: "10.1007/s12064-012-0162-3",
    pmid: "22872506",
    url: "https://doi.org/10.1007/s12064-012-0162-3",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Diferenças entre RPKM e TPM como medidas de abundância de RNA.",
  },
  love2014: {
    id: "love2014",
    shortCitation: "Love et al., 2014 (DESeq2)",
    citation:
      "Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biol. 2014;15(12):550.",
    year: 2014,
    doi: "10.1186/s13059-014-0550-8",
    pmid: "25516281",
    pmcid: "PMC4302049",
    url: "https://doi.org/10.1186/s13059-014-0550-8",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Análise diferencial de contagens de RNA-seq; poucas réplicas e dispersão.",
  },
  berman2000: {
    id: "berman2000",
    shortCitation: "Berman et al., 2000 (PDB)",
    citation:
      "Berman HM, Westbrook J, Feng Z, Gilliland G, Bhat TN, Weissig H, Shindyalov IN, Bourne PE. The Protein Data Bank. Nucleic Acids Res. 2000;28(1):235-242.",
    year: 2000,
    doi: "10.1093/nar/28.1.235",
    pmid: "10592235",
    pmcid: "PMC102472",
    url: "https://doi.org/10.1093/nar/28.1.235",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Protein Data Bank como arquivo mundial de estruturas macromoleculares.",
  },
  sehnal2021: {
    id: "sehnal2021",
    shortCitation: "Sehnal et al., 2021 (Mol*)",
    citation:
      "Sehnal D, Bittrich S, Deshpande M, et al. Mol* Viewer: modern web app for 3D visualization and analysis of large biomolecular structures. Nucleic Acids Res. 2021;49(W1):W431-W437.",
    year: 2021,
    doi: "10.1093/nar/gkab314",
    pmid: "33956157",
    pmcid: "PMC8262734",
    url: "https://doi.org/10.1093/nar/gkab314",
    verification: "resumo",
    verifiedAt: VERIFIED_AT,
    verifiedVia: VIA,
    scope: "Visualizador molecular usado nesta plataforma.",
  },

  // ------------------------------------------------ módulos de técnicas (verificação em 2026-10-04)
  higuchi1993: {
    id: "higuchi1993",
    shortCitation: "Higuchi et al., 1993",
    citation:
      "Higuchi R, Fockler C, Dollinger G, Watson R. Kinetic PCR analysis: real-time monitoring of DNA amplification reactions. Biotechnology (N Y). 1993;11(9):1026-1030.",
    year: 1993,
    doi: "10.1038/nbt0993-1026",
    pmid: "7764001",
    url: "https://doi.org/10.1038/nbt0993-1026",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Origem da PCR em tempo real: quanto menos ciclos até a fluorescência detectável, maior o número inicial de cópias.",
  },
  bustin2000: {
    id: "bustin2000",
    shortCitation: "Bustin, 2000",
    citation:
      "Bustin SA. Absolute quantification of mRNA using real-time reverse transcription polymerase chain reaction assays. J Mol Endocrinol. 2000;25(2):169-193.",
    year: 2000,
    doi: "10.1677/jme.0.0250169",
    pmid: "11013345",
    url: "https://doi.org/10.1677/jme.0.0250169",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "RT-PCR em tempo real: sensibilidade, problemas de reprodutibilidade e necessidade de validação.",
  },
  pfaffl2001: {
    id: "pfaffl2001",
    shortCitation: "Pfaffl, 2001",
    citation: "Pfaffl MW. A new mathematical model for relative quantification in real-time RT-PCR. Nucleic Acids Res. 2001;29(9):e45.",
    year: 2001,
    doi: "10.1093/nar/29.9.e45",
    pmid: "11328886",
    pmcid: "PMC55695",
    url: "https://doi.org/10.1093/nar/29.9.e45",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    extractionCaveats: ["O texto completo veio vazio do PubMed Central (duas tentativas). A equação publicada no artigo NÃO foi lida; só o resumo."],
    scope: "Razão de expressão relativa calculada a partir das eficiências e da diferença de ciclos entre amostra e controle.",
  },
  rao2013: {
    id: "rao2013",
    shortCitation: "Rao et al., 2013",
    citation:
      "Rao X, Huang X, Zhou Z, Lin X. An improvement of the 2^(-delta delta CT) method for quantitative real-time polymerase chain reaction data analysis. Biostat Bioinforma Biomath. 2013;3(3):71-85.",
    year: 2013,
    pmid: "25558171",
    pmcid: "PMC4280562",
    url: "https://pubmed.ncbi.nlm.nih.gov/25558171/",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    sectionsRead: ["Background", "Results", "Discussion", "Conclusions", "Methods"],
    extractionCaveats: [
      "As equações chegaram fragmentadas (símbolos e subscritos perdidos); as definições de ΔCt e ΔΔCt foram reconstruídas a partir do texto que as descreve.",
      "Sem DOI registrado no PubMed para este artigo.",
    ],
    scope: "Definições de ΔCt e ΔΔCt, pressuposto de eficiência de 100% do método 2^-ΔΔCt e efeito de eficiências diferentes.",
  },
  towbin1979: {
    id: "towbin1979",
    shortCitation: "Towbin et al., 1979",
    citation:
      "Towbin H, Staehelin T, Gordon J. Electrophoretic transfer of proteins from polyacrylamide gels to nitrocellulose sheets: procedure and some applications. Proc Natl Acad Sci U S A. 1979;76(9):4350-4354.",
    year: 1979,
    doi: "10.1073/pnas.76.9.4350",
    pmid: "388439",
    pmcid: "PMC411572",
    url: "https://doi.org/10.1073/pnas.76.9.4350",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Transferência eletroforética de proteínas para nitrocelulose, bloqueio e detecção com anticorpo primário e secundário.",
  },
  mahmood2012: {
    id: "mahmood2012",
    shortCitation: "Mahmood & Yang, 2012",
    citation: "Mahmood T, Yang PC. Western blot: technique, theory, and trouble shooting. N Am J Med Sci. 2012;4(9):429-434.",
    year: 2012,
    doi: "10.4103/1947-2714.100998",
    pmid: "23050259",
    pmcid: "PMC3456489",
    url: "https://doi.org/10.4103/1947-2714.100998",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    sectionsRead: [
      "Technique (lise, preparo da amostra, gel, eletroforese, eletrotransferência, bloqueio e anticorpos)",
      "Theory (preparo, eletroforese, blotting, lavagem/bloqueio, quantificação)",
      "Troubleshooting",
    ],
    extractionCaveats: [
      "O artigo chama o gel de “agarose”, mas descreve acrilamida/poliacrilamida; o GenoLab não reproduz o termo “agarose” para o Western.",
      "O artigo sugere β-actina como controle negativo (“null cell line”); essa afirmação não foi usada.",
      "As tensões citadas para gel de empilhamento e de separação aparecem invertidas entre o texto e a legenda da figura; os valores não foram usados.",
    ],
    scope: "Protocolo de Western blot, teoria de cada etapa, caráter semiquantitativo e solução de problemas.",
  },
  laemmli1970: {
    id: "laemmli1970",
    shortCitation: "Laemmli, 1970",
    citation: "Laemmli UK. Cleavage of structural proteins during the assembly of the head of bacteriophage T4. Nature. 1970;227(5259):680-685.",
    year: 1970,
    doi: "10.1038/227680a0",
    pmid: "5432063",
    url: "https://doi.org/10.1038/227680a0",
    verification: "metadados",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Referência histórica da eletroforese de proteínas em gel. Conteúdo não analisado (resumo indisponível no PubMed).",
  },
  cohen1973: {
    id: "cohen1973",
    shortCitation: "Cohen et al., 1973",
    citation:
      "Cohen SN, Chang AC, Boyer HW, Helling RB. Construction of biologically functional bacterial plasmids in vitro. Proc Natl Acad Sci U S A. 1973;70(11):3240-3244.",
    year: 1973,
    doi: "10.1073/pnas.70.11.3240",
    pmid: "4594039",
    pmcid: "PMC427208",
    url: "https://doi.org/10.1073/pnas.70.11.3240",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "União in vitro de fragmentos gerados por endonucleases de restrição e introdução do plasmídeo em E. coli por transformação.",
  },
  froger2007: {
    id: "froger2007",
    shortCitation: "Froger & Hall, 2007",
    citation: "Froger A, Hall JE. Transformation of plasmid DNA into E. coli using the heat shock method. J Vis Exp. 2007;(6):253.",
    year: 2007,
    doi: "10.3791/253",
    pmid: "18997900",
    pmcid: "PMC2557105",
    url: "https://doi.org/10.3791/253",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Transformação por choque térmico: gelo, 42 °C por 45 s, gelo, meio SOC, 37 °C por 30 min e semeadura em duas quantidades.",
  },
  jinek2012: {
    id: "jinek2012",
    shortCitation: "Jinek et al., 2012",
    citation:
      "Jinek M, Chylinski K, Fonfara I, Hauer M, Doudna JA, Charpentier E. A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity. Science. 2012;337(6096):816-821.",
    year: 2012,
    doi: "10.1126/science.1225829",
    pmid: "22745249",
    pmcid: "PMC6286148",
    url: "https://doi.org/10.1126/science.1225829",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Cas9 guiada por RNA corta as duas fitas do DNA (domínios HNH e RuvC); RNA guia único (quimera).",
  },
  ran2013: {
    id: "ran2013",
    shortCitation: "Ran et al., 2013",
    citation: "Ran FA, Hsu PD, Wright J, Agarwala V, Scott DA, Zhang F. Genome engineering using the CRISPR-Cas9 system. Nat Protoc. 2013;8(11):2281-2308.",
    year: 2013,
    doi: "10.1038/nprot.2013.143",
    pmid: "24157548",
    pmcid: "PMC3969860",
    url: "https://doi.org/10.1038/nprot.2013.143",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    sectionsRead: [
      "Introduction (edição por nucleases; NHEJ e HDR; Cas9; comparação; limitações)",
      "Experimental design (escolha do alvo; construção do sgRNA; molde de reparo; isolamento clonal; testes funcionais)",
      "Procedure — trechos disponíveis (Passo 5B x–xii; Passos 97–108; 116–123); Timing; Anticipated results",
    ],
    extractionCaveats: [
      "Vários passos do procedimento (ex.: 6–96 e 109–115) vieram incompletos na extração; só os trechos listados foram usados.",
      "Tabelas e figuras não vieram no texto obtido.",
    ],
    scope: "Desenho do guia (20 nt + PAM NGG), reparo por NHEJ/HDR, nickase, avaliação da edição e linhas clonais.",
  },
  sanger1977: {
    id: "sanger1977",
    shortCitation: "Sanger et al., 1977",
    citation: "Sanger F, Nicklen S, Coulson AR. DNA sequencing with chain-terminating inhibitors. Proc Natl Acad Sci U S A. 1977;74(12):5463-5467.",
    year: 1977,
    doi: "10.1073/pnas.74.12.5463",
    pmid: "271968",
    pmcid: "PMC431765",
    url: "https://doi.org/10.1073/pnas.74.12.5463",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Sequenciamento com análogos didesoxi que terminam a síntese pela DNA polimerase.",
  },
  conesa2016: {
    id: "conesa2016",
    shortCitation: "Conesa et al., 2016",
    citation:
      "Conesa A, Madrigal P, Tarazona S, et al. A survey of best practices for RNA-seq data analysis. Genome Biol. 2016;17:13.",
    year: 2016,
    doi: "10.1186/s13059-016-0881-8",
    pmid: "26813401",
    pmcid: "PMC4728800",
    url: "https://doi.org/10.1186/s13059-016-0881-8",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "Etapas da análise de RNA-seq (desenho, controle de qualidade, alinhamento, quantificação, expressão diferencial) e ausência de um pipeline único.",
  },
  mortazavi2008: {
    id: "mortazavi2008",
    shortCitation: "Mortazavi et al., 2008",
    citation: "Mortazavi A, Williams BA, McCue K, Schaeffer L, Wold B. Mapping and quantifying mammalian transcriptomes by RNA-Seq. Nat Methods. 2008;5(7):621-628.",
    year: 2008,
    doi: "10.1038/nmeth.1226",
    pmid: "18516045",
    url: "https://doi.org/10.1038/nmeth.1226",
    verification: "resumo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    scope: "RNA-Seq como medida digital da presença e prevalência de transcritos.",
  },
  zhao2020: {
    id: "zhao2020",
    shortCitation: "Zhao et al., 2020",
    citation: "Zhao S, Ye Z, Stanton R. Misuse of RPKM or TPM normalization when comparing across samples and sequencing protocols. RNA. 2020;26(8):903-909.",
    year: 2020,
    doi: "10.1261/rna.074922.120",
    pmid: "32284352",
    pmcid: "PMC7373998",
    url: "https://doi.org/10.1261/rna.074922.120",
    verification: "texto_completo",
    verifiedAt: VERIFIED_AT_TECNICAS,
    verifiedVia: VIA,
    sectionsRead: [
      "Introduction",
      "Measures of expression: RPKM/FPKM and TPM",
      "Sample preparation protocol can greatly affect expression values",
      "Caution on RPKM and TPM comparison across samples with varying mRNA levels",
      "Discussions and conclusions",
    ],
    extractionCaveats: ["A fórmula de conversão RPKM→TPM não veio na extração; o cálculo do GenoLab é derivado das definições descritas no texto (ver o cartão do modelo)."],
    scope: "Definição de TPM e por que valores de TPM não são diretamente comparáveis entre amostras ou protocolos diferentes.",
  },
};

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  metadados: "Metadados conferidos (conteúdo não lido)",
  resumo: "Resumo lido",
  texto_completo: "Texto completo lido",
  nao_verificado: "Não verificado",
};

export function getSource(id: string): CatalogSource | undefined {
  return SOURCES[id];
}

/** Uma citação com localizador (seção/tabela/figura). */
export type SourceRef = { id: string; locator?: string };

/** Afirmação didática com fundamento explícito. */
export type Claim = {
  text: string;
  basis: "referencia" | "modelo" | "ilustracao" | "imprevisivel" | "sem_fonte";
  refs: SourceRef[];
  note?: string;
};
