/**
 * Catálogo de referências usadas pelos MÓDULOS EDUCATIVOS embutidos (não pelos projetos do pesquisador).
 *
 * Cada entrada registra exatamente o que foi verificado, e como:
 *  - "metadados":           título/autores/DOI conferidos no PubMed. Conteúdo NÃO lido.
 *  - "resumo":              além dos metadados, o resumo (abstract) foi lido.
 *  - "texto_completo":      texto integral obtido do PubMed Central e lido; seções listadas em `sectionsRead`.
 *
 * Verificação realizada em 2026-10-02 via conector PubMed (MCP) durante o desenvolvimento.
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
