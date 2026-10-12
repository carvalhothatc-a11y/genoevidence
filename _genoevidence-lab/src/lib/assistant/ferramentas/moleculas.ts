import "server-only";

/**
 * Resolução de nomes moleculares em identificadores reais e busca de estruturas.
 *
 * Serviços públicos, sem chave, conferidos em 2026-10-05:
 *   UniProt  https://rest.uniprot.org        gene/proteína → acesso UniProt (separa gene de proteína)
 *   RCSB PDB https://search.rcsb.org         texto → códigos PDB;  https://data.rcsb.org  metadados
 *   PubChem  https://pubchem.ncbi.nlm.nih.gov/rest/pug   nome → CID, propriedades, PNG 2D e SDF 3D
 *
 * Regras:
 *  - nada é inventado: sem resultado, a função devolve `encontrado: false` com o motivo;
 *  - gene, proteína e composto são TIPOS DIFERENTES e nunca se substituem entre si;
 *  - uma estrutura parecida NUNCA entra no lugar da pedida sem dizer que é outra coisa.
 */

const TEMPO_LIMITE = 15_000;
const AGENTE = "GenoLab/0.1 (https://genoevidence.com; laboratorio virtual educativo)";

async function pegarJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", "User-Agent": AGENTE, ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- tipos

export type TipoMolecular = "gene" | "proteina" | "composto";

export type Proteina = {
  tipo: "proteina";
  acesso: string;
  nome: string;
  genes: string[];
  organismo: string;
  url: string;
};

export type Composto = {
  tipo: "composto";
  cid: number;
  nome: string;
  formula?: string;
  massa?: string;
  smiles?: string;
  /** Desenho 2D, servido pelo próprio GenoLab (a política de segurança só aceita imagens daqui). */
  imagem2d: string;
  /** Coordenadas 3D (SDF), quando o PubChem as tem. */
  sdf3d: string;
  url: string;
};

export type EstruturaPdb = {
  pdbId: string;
  titulo: string;
  metodo?: string;
  resolucao?: number;
  liberadaEm?: string;
  url: string;
  /** Arquivo mmCIF para o Mol*. */
  arquivo: string;
};

export type ResultadoBusca<T> = { encontrado: true; itens: T[]; consulta: string } | { encontrado: false; motivo: string; consulta: string };

// ---------------------------------------------------------------- proteína (UniProt)

type UniProtResp = {
  results?: {
    primaryAccession: string;
    uniProtkbId?: string;
    proteinDescription?: { recommendedName?: { fullName?: { value?: string } } };
    genes?: { geneName?: { value?: string } }[];
    organism?: { scientificName?: string };
  }[];
};

/**
 * Procura a proteína revisada (Swiss-Prot) de um gene ou nome de proteína.
 * `organismoId` é o taxon NCBI (9606 = humano); sem ele, a busca não se limita a uma espécie.
 */
export async function buscarProteina(nome: string, organismoId?: number, limite = 3): Promise<ResultadoBusca<Proteina>> {
  const termo = nome.trim().slice(0, 120);
  if (!termo) return { encontrado: false, motivo: "Nome vazio.", consulta: termo };
  const partes = [`(gene:${termo} OR protein_name:${termo})`, "reviewed:true"];
  if (organismoId) partes.push(`organism_id:${organismoId}`);
  const q = encodeURIComponent(partes.join(" AND "));
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${q}&fields=accession,id,protein_name,gene_names,organism_name&format=json&size=${limite}`;
  const d = await pegarJson<UniProtResp>(url);
  if (!d) return { encontrado: false, motivo: "O UniProt não respondeu agora.", consulta: termo };
  const itens = (d.results ?? []).map((r) => ({
    tipo: "proteina" as const,
    acesso: r.primaryAccession,
    nome: r.proteinDescription?.recommendedName?.fullName?.value ?? r.uniProtkbId ?? r.primaryAccession,
    genes: (r.genes ?? []).map((g) => g.geneName?.value).filter((x): x is string => Boolean(x)),
    organismo: r.organism?.scientificName ?? "organismo não informado",
    url: `https://www.uniprot.org/uniprotkb/${r.primaryAccession}`,
  }));
  if (!itens.length) return { encontrado: false, motivo: `Nenhuma proteína revisada encontrada para “${termo}”${organismoId ? " nesse organismo" : ""}.`, consulta: termo };
  return { encontrado: true, itens, consulta: termo };
}

// ---------------------------------------------------------------- estrutura (RCSB PDB)

type RcsbBusca = { result_set?: string[]; total_count?: number };
type RcsbEntrada = {
  struct?: { title?: string };
  rcsb_entry_info?: { experimental_method?: string; resolution_combined?: number[] };
  rcsb_accession_info?: { initial_release_date?: string };
};

/** Códigos PDB para um texto livre (nome da proteína, do complexo ou do gene). */
export async function buscarEstruturas(texto: string, limite = 5): Promise<ResultadoBusca<EstruturaPdb>> {
  const termo = texto.trim().slice(0, 200);
  if (!termo) return { encontrado: false, motivo: "Consulta vazia.", consulta: termo };
  const corpo = {
    query: { type: "terminal", service: "full_text", parameters: { value: termo } },
    return_type: "entry",
    request_options: { paginate: { start: 0, rows: Math.min(limite, 10) }, results_verbosity: "compact" },
  };
  const d = await pegarJson<RcsbBusca>("https://search.rcsb.org/rcsbsearch/v2/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!d) return { encontrado: false, motivo: "O RCSB PDB não respondeu agora.", consulta: termo };
  const ids = (d.result_set ?? []).filter((x) => /^[0-9][A-Za-z0-9]{3}$/.test(x));
  if (!ids.length) return { encontrado: false, motivo: `Nenhuma estrutura no RCSB PDB para “${termo}”.`, consulta: termo };
  const itens = await Promise.all(ids.map(detalharEstrutura));
  return { encontrado: true, itens: itens.filter((x): x is EstruturaPdb => Boolean(x)), consulta: termo };
}

/** Metadados de um código PDB. Devolve null quando o código não existe. */
export async function detalharEstrutura(pdbId: string): Promise<EstruturaPdb | null> {
  const id = pdbId.trim().toUpperCase();
  if (!/^[0-9][A-Za-z0-9]{3}$/.test(id)) return null;
  const d = await pegarJson<RcsbEntrada>(`https://data.rcsb.org/rest/v1/core/entry/${id}`);
  if (!d) return null;
  return {
    pdbId: id,
    titulo: d.struct?.title ?? id,
    metodo: d.rcsb_entry_info?.experimental_method,
    resolucao: d.rcsb_entry_info?.resolution_combined?.[0],
    liberadaEm: d.rcsb_accession_info?.initial_release_date?.slice(0, 10),
    url: `https://www.rcsb.org/structure/${id}`,
    arquivo: `https://files.rcsb.org/download/${id}.cif`,
  };
}

// ---------------------------------------------------------------- composto (PubChem)

type PubChemCids = { IdentifierList?: { CID?: number[] } };
type PubChemProps = {
  PropertyTable?: {
    Properties?: { CID: number; MolecularFormula?: string; MolecularWeight?: string; IUPACName?: string; SMILES?: string; ConnectivitySMILES?: string }[];
  };
};

const PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

/** Nome de composto → CID, propriedades, desenho 2D e, quando existir, coordenadas 3D. */
export async function buscarComposto(nome: string, limite = 1): Promise<ResultadoBusca<Composto>> {
  const termo = nome.trim().slice(0, 120);
  if (!termo) return { encontrado: false, motivo: "Nome vazio.", consulta: termo };
  const cids = await pegarJson<PubChemCids>(`${PUG}/compound/name/${encodeURIComponent(termo)}/cids/JSON`);
  const lista = (cids?.IdentifierList?.CID ?? []).slice(0, Math.min(limite, 5));
  if (!lista.length) return { encontrado: false, motivo: `Nenhum composto no PubChem com o nome “${termo}”.`, consulta: termo };
  // O PubChem renomeou CanonicalSMILES para ConnectivitySMILES; pedimos os dois nomes.
  const props = await pegarJson<PubChemProps>(`${PUG}/compound/cid/${lista.join(",")}/property/MolecularFormula,MolecularWeight,IUPACName,SMILES,ConnectivitySMILES/JSON`);
  const porCid = new Map((props?.PropertyTable?.Properties ?? []).map((p) => [p.CID, p]));
  const itens: Composto[] = lista.map((cid) => {
    const p = porCid.get(cid);
    return {
      tipo: "composto",
      cid,
      nome: p?.IUPACName ?? termo,
      formula: p?.MolecularFormula,
      massa: p?.MolecularWeight,
      smiles: p?.SMILES ?? p?.ConnectivitySMILES,
      imagem2d: `/api/moleculas/imagem?cid=${cid}`,
      sdf3d: `${PUG}/compound/cid/${cid}/record/SDF?record_type=3d`,
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    };
  });
  return { encontrado: true, itens, consulta: termo };
}

// ---------------------------------------------------------------- desambiguação

export type Ambiguidade = { termo: string; pergunta: string; opcoes: { tipo: TipoMolecular; descricao: string }[] };

/**
 * Um símbolo de gene em maiúsculas (TP53, BRCA1) pode significar o gene OU a proteína que ele
 * codifica — coisas visuais diferentes. Quando o texto não deixa claro, perguntamos em vez de
 * escolher por conta própria.
 */
export function precisaEsclarecer(termo: string, contexto: string): Ambiguidade | null {
  const t = termo.trim();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(t)) return null;
  const c = contexto.toLowerCase();
  const diz = (re: RegExp) => re.test(c);
  if (diz(/\bprote[ií]na\b|\bprotein\b|\bp\d{2}\b|western|anticorpo/)) return null;
  if (diz(/\bgene\b|\bmrna\b|\bcdna\b|transcri|amplific|primer|express[ãa]o/)) return null;
  return {
    termo: t,
    pergunta: `“${t}” aparece sem dizer se é o gene ou a proteína. São objetos diferentes e a imagem muda.`,
    opcoes: [
      { tipo: "gene", descricao: `o gene ${t} (sequência de DNA)` },
      { tipo: "proteina", descricao: `a proteína codificada por ${t}` },
    ],
  };
}
