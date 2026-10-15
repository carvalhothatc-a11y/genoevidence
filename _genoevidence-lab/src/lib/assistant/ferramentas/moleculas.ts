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

/**
 * Resultado de uma consulta a uma base pública. "vazio" (404/sem itens) é DIFERENTE de "ocupado"
 * ou "falhou": dizer "não encontrei" quando o serviço recusou o pedido seria mentir sobre a causa.
 */
type Resposta<T> = { estado: "ok"; dados: T } | { estado: "vazio" } | { estado: "ocupado" } | { estado: "falhou"; status?: number };

const ESPERA_MS = 400;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pegarJson<T>(url: string, init?: RequestInit, tentativas = 2): Promise<Resposta<T>> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, {
        ...init,
        headers: { Accept: "application/json", "User-Agent": AGENTE, ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(TEMPO_LIMITE),
        cache: "no-store",
      });
      if (r.ok) return { estado: "ok", dados: (await r.json()) as T };
      if (r.status === 404) return { estado: "vazio" };
      // PubChem e outros devolvem 503/429 quando estão sobrecarregados: esperamos e tentamos de novo
      if ((r.status === 503 || r.status === 429) && i + 1 < tentativas) {
        await dormir(ESPERA_MS * (i + 1));
        continue;
      }
      if (r.status === 503 || r.status === 429) return { estado: "ocupado" };
      return { estado: "falhou", status: r.status };
    } catch {
      if (i + 1 < tentativas) {
        await dormir(ESPERA_MS * (i + 1));
        continue;
      }
      return { estado: "falhou" };
    }
  }
  return { estado: "falhou" };
}

/** Motivo honesto, de acordo com o que a base respondeu. */
function motivoDe(r: Resposta<unknown>, base: string, termo: string): string {
  if (r.estado === "ocupado") return `O ${base} está recusando pedidos agora (muitas consultas). Tente de novo em alguns instantes.`;
  if (r.estado === "falhou") return `O ${base} não respondeu agora${r.status ? ` (erro ${r.status})` : ""}.`;
  return `Nada encontrado no ${base} para “${termo}”.`;
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
  const r0 = await pegarJson<UniProtResp>(url);
  if (r0.estado !== "ok") return { encontrado: false, motivo: motivoDe(r0, "UniProt", termo), consulta: termo };
  const d = r0.dados;
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
  const r0 = await pegarJson<RcsbBusca>("https://search.rcsb.org/rcsbsearch/v2/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (r0.estado === "vazio") return { encontrado: false, motivo: `Nenhuma estrutura no RCSB PDB para “${termo}”.`, consulta: termo };
  if (r0.estado !== "ok") return { encontrado: false, motivo: motivoDe(r0, "RCSB PDB", termo), consulta: termo };
  const ids = (r0.dados.result_set ?? []).filter((x) => /^[0-9][A-Za-z0-9]{3}$/.test(x));
  if (!ids.length) return { encontrado: false, motivo: `Nenhuma estrutura no RCSB PDB para “${termo}”.`, consulta: termo };
  const itens = await Promise.all(ids.map(detalharEstrutura));
  return { encontrado: true, itens: itens.filter((x): x is EstruturaPdb => Boolean(x)), consulta: termo };
}

/**
 * Estruturas que REALMENTE contêm a proteína, procuradas pelo acesso UniProt.
 *
 * Isto substitui a busca por texto quando já sabemos a proteína: procurar "p53" em texto livre traz
 * estruturas que só mencionam p53 no título (por exemplo a ASPP2, que não é p53). Aqui o critério é
 * a identidade da sequência depositada, então não há troca silenciosa por algo parecido.
 */
export async function estruturasDaProteina(acessoUniProt: string, limite = 5): Promise<ResultadoBusca<EstruturaPdb>> {
  const acesso = acessoUniProt.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,10}$/.test(acesso)) return { encontrado: false, motivo: "Acesso UniProt inválido.", consulta: acesso };
  const corpo = {
    query: {
      type: "terminal",
      service: "text",
      parameters: {
        attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession",
        operator: "exact_match",
        value: acesso,
      },
    },
    return_type: "entry",
    request_options: {
      paginate: { start: 0, rows: Math.min(limite, 10) },
      results_verbosity: "compact",
      // melhor resolução primeiro: a estrutura mais bem resolvida costuma ser a mais útil
      sort: [{ sort_by: "rcsb_entry_info.resolution_combined", direction: "asc" }],
    },
  };
  const r0 = await pegarJson<RcsbBusca>("https://search.rcsb.org/rcsbsearch/v2/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (r0.estado === "vazio") return { encontrado: false, motivo: `Nenhuma estrutura no RCSB PDB contém a proteína ${acesso}.`, consulta: acesso };
  if (r0.estado !== "ok") return { encontrado: false, motivo: motivoDe(r0, "RCSB PDB", acesso), consulta: acesso };
  const ids = (r0.dados.result_set ?? []).filter((x) => /^[0-9][A-Za-z0-9]{3}$/.test(x));
  if (!ids.length) return { encontrado: false, motivo: `Nenhuma estrutura no RCSB PDB contém a proteína ${acesso}.`, consulta: acesso };
  const itens = (await Promise.all(ids.map(detalharEstrutura))).filter((x): x is EstruturaPdb => Boolean(x));
  return { encontrado: true, itens, consulta: acesso };
}

/** Metadados de um código PDB. Devolve null quando o código não existe. */
export async function detalharEstrutura(pdbId: string): Promise<EstruturaPdb | null> {
  const id = pdbId.trim().toUpperCase();
  if (!/^[0-9][A-Za-z0-9]{3}$/.test(id)) return null;
  const r0 = await pegarJson<RcsbEntrada>(`https://data.rcsb.org/rest/v1/core/entry/${id}`);
  if (r0.estado !== "ok") return null;
  const d = r0.dados;
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

/**
 * Composto por CID, sem passar pela busca por nome. Usado pelas referências da cena, onde o CID já
 * foi conferido no PubChem — assim o nome escrito no código nunca decide qual molécula aparece.
 */
export async function compostoPorCid(cid: number): Promise<ResultadoBusca<Composto>> {
  if (!Number.isInteger(cid) || cid <= 0) return { encontrado: false, motivo: "CID inválido.", consulta: String(cid) };
  const props = await pegarJson<PubChemProps>(`${PUG}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,SMILES,ConnectivitySMILES/JSON`, undefined, 3);
  if (props.estado === "vazio") return { encontrado: false, motivo: `O PubChem não tem o composto CID ${cid}.`, consulta: String(cid) };
  if (props.estado !== "ok") return { encontrado: false, motivo: motivoDe(props, "PubChem", String(cid)), consulta: String(cid) };
  const pr = (props.dados.PropertyTable?.Properties ?? [])[0];
  if (!pr) return { encontrado: false, motivo: `O PubChem não tem o composto CID ${cid}.`, consulta: String(cid) };
  return {
    encontrado: true,
    consulta: String(cid),
    itens: [
      {
        tipo: "composto",
        cid,
        nome: pr.IUPACName ?? `CID ${cid}`,
        formula: pr.MolecularFormula,
        massa: pr.MolecularWeight,
        smiles: pr.SMILES ?? pr.ConnectivitySMILES,
        imagem2d: `/api/moleculas/imagem?cid=${cid}`,
        sdf3d: `${PUG}/compound/cid/${cid}/record/SDF?record_type=3d`,
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      },
    ],
  };
}

/** Nome de composto → CID, propriedades, desenho 2D e, quando existir, coordenadas 3D. */
export async function buscarComposto(nome: string, limite = 1): Promise<ResultadoBusca<Composto>> {
  const termo = nome.trim().slice(0, 120);
  if (!termo) return { encontrado: false, motivo: "Nome vazio.", consulta: termo };
  const r0 = await pegarJson<PubChemCids>(`${PUG}/compound/name/${encodeURIComponent(termo)}/cids/JSON`, undefined, 3);
  if (r0.estado === "vazio") return { encontrado: false, motivo: `Nenhum composto no PubChem com o nome “${termo}”.`, consulta: termo };
  if (r0.estado !== "ok") return { encontrado: false, motivo: motivoDe(r0, "PubChem", termo), consulta: termo };
  const lista = (r0.dados.IdentifierList?.CID ?? []).slice(0, Math.min(limite, 5));
  if (!lista.length) return { encontrado: false, motivo: `Nenhum composto no PubChem com o nome “${termo}”.`, consulta: termo };
  // O PubChem renomeou CanonicalSMILES para ConnectivitySMILES; pedimos os dois nomes.
  const props = await pegarJson<PubChemProps>(`${PUG}/compound/cid/${lista.join(",")}/property/MolecularFormula,MolecularWeight,IUPACName,SMILES,ConnectivitySMILES/JSON`, undefined, 3);
  const porCid = new Map((props.estado === "ok" ? (props.dados.PropertyTable?.Properties ?? []) : []).map((p) => [p.CID, p]));
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
