import { normalizar } from "@/lib/ideia/parse";
import { SOURCES, type SourceRef } from "@/lib/sources/catalog";
import { ENTIDADE_NOME, interpretarRoteiro, reconstruirPasso, type Acao, type Entidade, type PassoVisual } from "@/lib/visual/roteiro";
import { ACOES_BIBLIOTECA, OBJETOS, OBJETO_DA_ENTIDADE, objetosPorTermos, type ObjetoId, type Papel } from "@/lib/cena/biblioteca";
import { chaveQuantidade, extrairQuantidades, formatarValor, type Quantidade } from "./quantidades";
import { chaveTrecho, type Correcoes, correcoesVazias } from "./correcoes";
import type { EntradaExperimento, MaterialRelatorio, MaterialTabela } from "./materiais";
import type { AcaoExp, Conflito, DadoObservado, Experimento, Fonte, Origem, Parametro, Participante, Pendencia } from "./schema";

/**
 * INTERPRETAÇÃO DOS MATERIAIS (regras locais, determinísticas). Relaciona:
 *  - texto/fala → ações e sua ordem (o que o pesquisador descreveu é o que a cena mostra);
 *  - foto → elementos confirmados (participantes);
 *  - relatório → parâmetros e, se o pesquisador escolher, etapas;
 *  - tabela → dados observados (valores, unidades, grupos, réplicas e ausentes preservados);
 *  - referências → fontes (cadastradas, não lidas).
 * Nada é completado por suposição: o que falta vira pendência; valores divergentes viram conflito.
 * Ação isolada continua isolada: nenhum protocolo é acrescentado.
 */

const AGENTES: ObjetoId[] = ["polimerase", "enzima_corte", "ligase", "cas9", "ribossomo", "anticorpo"];
const ACOES_TRANSFERENCIA: Acao[] = ["pipetar", "misturar"];

type EtapaBruta = { passo: PassoVisual; origem: Origem };

function etapasDoTexto(texto: string, via: "texto" | "voz"): EtapaBruta[] {
  if (!texto.trim()) return [];
  return interpretarRoteiro(texto).map((passo) => ({ passo, origem: { tipo: via, trecho: passo.texto.slice(0, 400) } }));
}

/** Limite de etapas vindas de um documento. Acima disso, avisamos em vez de cortar em silêncio. */
export const MAX_ETAPAS_RELATORIO = 24;

/**
 * Documento que parece um levantamento/revisão (muitas citações e “não informado”) e não um
 * procedimento. Nesse caso as frases descrevem o que OUTROS fizeram, não o que será feito.
 */
export function pareceLevantamento(texto: string): boolean {
  const t = texto.slice(0, 20_000);
  const citacoes = (t.match(/\(\s?[A-ZÀ-Ú][\p{L}'’-]+(?:\s+et al\.?|\s+(?:e|&|and)\s+[\p{L}'’-]+)?,?\s*(?:19|20)\d{2}\s?\)/gu) ?? []).length;
  const naoInformado = (t.match(/nao informad\w*|não informad\w*/gi) ?? []).length;
  const imperativos = (t.match(/\b(?:adicione|pese|dissolva|transfira|centrifugue|incube|misture|prepare|lave|seque|repita|colete|meça|meca|filtre|complete|descarte|ajuste)\b/gi) ?? []).length;
  return citacoes + naoInformado >= 6 && citacoes + naoInformado > imperativos;
}

function etapasDoRelatorio(r: MaterialRelatorio): EtapaBruta[] {
  if (r.estado !== "extraido" || !r.texto.trim()) return [];
  // só trechos com ação reconhecida (relatórios trazem muito texto que não é etapa)
  const todas = interpretarRoteiro(r.texto.slice(0, 20_000)).filter((p) => p.acao !== "generica");
  return todas
    .slice(0, MAX_ETAPAS_RELATORIO)
    .map((passo) => ({ passo, origem: { tipo: "relatorio", materialId: r.id, trecho: passo.texto.slice(0, 400) } }));
}

/** Quantas etapas reconhecidas ficaram de fora pelo limite (0 quando coube tudo). */
export function etapasCortadas(r: MaterialRelatorio): number {
  if (r.estado !== "extraido" || !r.texto.trim()) return 0;
  const n = interpretarRoteiro(r.texto.slice(0, 20_000)).filter((p) => p.acao !== "generica").length;
  return Math.max(0, n - MAX_ETAPAS_RELATORIO);
}

function rotuloPara(objeto: ObjetoId, r: PassoVisual["rotulos"]): string {
  const base = OBJETOS[objeto].nome;
  if ((objeto === "dna" || objeto === "produto_pcr" || objeto === "plasmideo" || objeto === "rna") && r.gene) return `${base} (${r.gene})`;
  if ((objeto === "bacteria" || objeto === "celula") && r.organismo) return `${base} (${r.organismo})`;
  if (objeto === "enzima_corte" && r.enzima) return r.enzima;
  if (objeto === "antibiotico" && r.antibiotico) return r.antibiotico.charAt(0).toUpperCase() + r.antibiotico.slice(1);
  return base;
}

class Registro {
  lista: Participante[] = [];
  private n = 0;
  obter(objeto: ObjetoId, rotulo: string, origem: Origem, inferido = false): Participante {
    // mesmo objeto com o mesmo nome (ou nome genérico) é o mesmo participante
    let p = this.lista.find((x) => x.objeto === objeto && (x.rotulo === rotulo || x.rotulo === OBJETOS[objeto].nome || rotulo === OBJETOS[objeto].nome));
    if (p) {
      if (p.rotulo === OBJETOS[objeto].nome && rotulo !== OBJETOS[objeto].nome) p.rotulo = rotulo;
      if (!inferido) p.inferido = false;
      if (!p.origens.some((o) => o.tipo === origem.tipo && o.materialId === origem.materialId && o.trecho === origem.trecho) && p.origens.length < 12) p.origens.push(origem);
      return p;
    }
    p = { id: `p${++this.n}`, objeto, rotulo, origens: [origem], inferido };
    this.lista.push(p);
    return p;
  }
}

function participantesDaEtapa(e: EtapaBruta, reg: Registro, recipientesImagem: Participante[], equipamentosImagem: Participante[]): AcaoExp["participantes"] {
  const { passo, origem } = e;
  const out: AcaoExp["participantes"] = [];
  const add = (papel: Papel, p: Participante) => {
    if (!out.some((x) => x.participanteId === p.id)) out.push({ papel, participanteId: p.id });
  };
  const papelDe = (ent: Entidade): Papel => (passo.origem === ent ? "origem" : passo.destino === ent ? "destino" : AGENTES.includes(OBJETO_DA_ENTIDADE[ent]) ? "agente" : "material");
  for (const ent of passo.entidades) {
    const objeto = OBJETO_DA_ENTIDADE[ent];
    add(papelDe(ent), reg.obter(objeto, rotuloPara(objeto, passo.rotulos), origem));
  }
  // equipamentos e recipientes citados no trecho
  const termos = objetosPorTermos(normalizar(passo.texto)).filter((o) => !out.some((x) => reg.lista.find((p) => p.id === x.participanteId)?.objeto === o));
  for (const objeto of termos) add(OBJETOS[objeto].categoria === "equipamento" ? "equipamento" : OBJETOS[objeto].categoria === "recipiente" ? "recipiente" : "material", reg.obter(objeto, OBJETOS[objeto].nome, origem));
  // equipamento da ação: da foto, se houver o mesmo; senão representação padrão (marcada como inferida)
  const eqPadrao = ACOES_BIBLIOTECA[passo.acao].equipamento;
  const temEquip = out.some((x) => OBJETOS[reg.lista.find((p) => p.id === x.participanteId)!.objeto].categoria === "equipamento");
  if (eqPadrao && !temEquip) {
    const daFoto = equipamentosImagem.find((p) => p.objeto === eqPadrao);
    add("equipamento", daFoto ?? reg.obter(eqPadrao, OBJETOS[eqPadrao].nome, { tipo: "biblioteca", trecho: `representação padrão de “${ACOES_BIBLIOTECA[passo.acao].nome}”` }, true));
  }
  // recipiente de transferências: o citado, senão o da foto
  if (ACOES_TRANSFERENCIA.includes(passo.acao) && !out.some((x) => x.papel === "recipiente") && recipientesImagem[0]) add("recipiente", recipientesImagem[0]);
  return out;
}

const FASES_PROGRAMA: Acao[] = ["anelar", "desnaturar", "estender", "incubar", "generica"];
const ENT_PROGRAMA = new Set<Entidade>(["dna", "primer", "polimerase", "nucleotideos", "tubo", "produto_pcr"]);

/**
 * “30 ciclos de 95 °C por 30 s, anelamento a 58 °C… e 72 °C por 45 s” logo depois de uma
 * amplificação são o PROGRAMA dessa amplificação (parâmetros), não etapas novas.
 */
function fundirPrograma(brutas: EtapaBruta[]): EtapaBruta[] {
  const out: EtapaBruta[] = [];
  for (const e of brutas) {
    const ant = out[out.length - 1];
    const mesmaFonte = ant && ant.origem.tipo === e.origem.tipo && ant.origem.materialId === e.origem.materialId;
    const fase = FASES_PROGRAMA.includes(e.passo.acao) && e.passo.entidades.every((x) => ENT_PROGRAMA.has(x)) && extrairQuantidades(e.passo.texto).some((q) => q.grandeza === "temperatura" || q.grandeza === "tempo" || q.grandeza === "ciclos");
    if (ant && mesmaFonte && ant.passo.acao === "amplificar" && fase) {
      const texto = `${ant.passo.texto}; ${e.passo.texto}`.slice(0, 400);
      out[out.length - 1] = { passo: { ...ant.passo, texto, atencao: ant.passo.atencao }, origem: { ...ant.origem, trecho: texto } };
      continue;
    }
    out.push(e);
  }
  return out;
}

const OBJETIVO = /\b(quero|queremos|pretendo|pretendemos|objetivo|meu objetivo|o objetivo|vou (?:testar|verificar|avaliar|detectar|amplificar|clonar|expressar|medir|comparar)|para (?:verificar|detectar|avaliar|confirmar|amplificar|clonar|expressar|medir|comparar|identificar))\b/;

function objetivoDe(texto: string, via: "texto" | "voz"): Experimento["objetivo"] {
  const frases = texto.split(/(?<=[.!?])\s+|\n+/).map((f) => f.trim()).filter(Boolean);
  const f = frases.find((x) => OBJETIVO.test(normalizar(x)));
  return f ? { texto: f.slice(0, 500), origens: [{ tipo: via, trecho: f.slice(0, 400) }] } : null;
}

const AUSENTE = /^(?:|na|n\/a|nd|n\.d\.|-|—|null|nan|sem dado|ausente)$/i;

/** Número como enviado (vírgula ou ponto decimal); ausente → null; texto não numérico → undefined. */
export function numeroCelula(v: string | null): number | null | undefined {
  if (v === null) return null;
  const s = v.trim();
  if (AUSENTE.test(s)) return null;
  const t = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && /^-?[\d.]+(e-?\d+)?$/i.test(t) ? n : undefined;
}

function unidadeDoCabecalho(nome: string): string | null {
  const m = /[([]\s*([^()[\]]{1,20})\s*[)\]]\s*$/.exec(nome);
  return m ? m[1].trim() : null;
}

export function dadosDaTabela(t: MaterialTabela): DadoObservado[] {
  const iValores = t.papeis.map((p, i) => (p === "valor" ? i : -1)).filter((i) => i >= 0);
  const iGrupo = t.papeis.indexOf("grupo");
  const iAmostra = t.papeis.indexOf("amostra");
  const iReplica = t.papeis.indexOf("replica");
  const iUnidade = t.papeis.indexOf("unidade");
  const temTempo = t.papeis.includes("tempo");
  return iValores.slice(0, 6).map((iv, k) => {
    const grupos = new Map<string, { valores: (number | null)[]; replicas: string[] }>();
    let ausentes = 0;
    let unidadeCol: string | null = null;
    for (const linha of t.linhas) {
      const nomeGrupo = (iGrupo >= 0 ? linha[iGrupo] : iAmostra >= 0 ? linha[iAmostra] : null)?.trim() || (iGrupo >= 0 || iAmostra >= 0 ? "(sem grupo)" : "Todos");
      const v = numeroCelula(linha[iv] ?? null);
      const valor = v === undefined ? null : v;
      if (valor === null) ausentes++;
      if (!unidadeCol && iUnidade >= 0 && linha[iUnidade]) unidadeCol = linha[iUnidade]!.trim().slice(0, 24);
      const g = grupos.get(nomeGrupo) ?? { valores: [], replicas: [] };
      g.valores.push(valor);
      g.replicas.push(iReplica >= 0 ? (linha[iReplica] ?? "").slice(0, 40) : "");
      grupos.set(nomeGrupo, g);
    }
    const variavel = t.colunas[iv] ?? `Coluna ${iv + 1}`;
    return {
      id: `d_${t.id}_${k}`.slice(0, 64),
      materialId: t.id,
      titulo: `${t.nome}${t.aba ? ` · ${t.aba}` : ""} — ${variavel}`.slice(0, 160),
      variavel: variavel.slice(0, 80),
      unidade: t.unidade ?? unidadeDoCabecalho(variavel) ?? unidadeCol,
      grupos: [...grupos.entries()].slice(0, 200).map(([nome, g]) => ({ nome: nome.slice(0, 80), valores: g.valores, replicas: iReplica >= 0 ? g.replicas : undefined })),
      ausentes,
      temTempo,
      linhas: t.linhas.length,
    };
  });
}

function refsCatalogo(passos: PassoVisual[]): SourceRef[] {
  const out: SourceRef[] = [];
  for (const p of passos) for (const r of p.refs) if (!out.some((x) => x.id === r.id)) out.push(r);
  return out;
}

export function interpretarExperimento(entrada: EntradaExperimento, opts: { id: string; versao?: number; correcoes?: Correcoes; agora?: string }): Experimento {
  const corr = opts.correcoes ?? correcoesVazias();
  const relatorios = entrada.materiais.filter((m): m is MaterialRelatorio => m.tipo === "relatorio");
  const tabelas = entrada.materiais.filter((m): m is MaterialTabela => m.tipo === "tabela");
  const imagens = entrada.materiais.filter((m) => m.tipo === "imagem");
  const referencias = entrada.materiais.filter((m) => m.tipo === "referencia");

  // 1. etapas: a descrição define o que a cena mostra; o relatório entra por escolha explícita
  const doTexto = etapasDoTexto(entrada.texto, entrada.via);
  const doRelatorio = relatorios.flatMap(etapasDoRelatorio);
  let etapasDe = entrada.etapasDe;
  if (!doTexto.length && doRelatorio.length) etapasDe = "relatorio";
  if (etapasDe === "relatorio" && !doRelatorio.length) etapasDe = "descricao";
  let brutas = etapasDe === "descricao" ? doTexto : etapasDe === "relatorio" ? doRelatorio : [...doTexto, ...doRelatorio];
  brutas = brutas.filter((e) => !corr.removidas.includes(chaveTrecho(e.passo.texto)));
  brutas = fundirPrograma(brutas);
  brutas = brutas.map((e) => {
    const novo = corr.acoes[chaveTrecho(e.passo.texto)];
    return novo && novo !== e.passo.acao ? { ...e, passo: reconstruirPasso(e.passo, novo) } : e;
  });

  // 2. participantes da foto (só elementos confirmados)
  const reg = new Registro();
  const recipientesImagem: Participante[] = [];
  const equipamentosImagem: Participante[] = [];
  for (const img of imagens) {
    if (img.tipo !== "imagem") continue;
    for (const el of img.elementos.filter((x) => x.confirmado)) {
      const p = reg.obter(el.objeto, el.rotulo || OBJETOS[el.objeto].nome, { tipo: "imagem", materialId: img.id, trecho: (el.nota || `identificado na foto${el.origem === "ia" ? " (sugestão da IA confirmada)" : ""}`).slice(0, 400) });
      if (OBJETOS[el.objeto].categoria === "recipiente") recipientesImagem.push(p);
      if (OBJETOS[el.objeto].categoria === "equipamento") equipamentosImagem.push(p);
    }
  }

  // 3. ações
  const acoes: AcaoExp[] = brutas.slice(0, 40).map((e, i) => ({
    id: `a${i + 1}`,
    ordem: i + 1,
    tipo: e.passo.acao,
    titulo: e.passo.titulo,
    texto: e.passo.texto.slice(0, 400),
    participantes: participantesDaEtapa(e, reg, recipientesImagem, equipamentosImagem),
    origens: [e.origem],
    confianca: corr.acoes[chaveTrecho(e.passo.texto)] ? "alta" : e.passo.confianca,
    rotulos: e.passo.rotulos,
    integracao: e.passo.integracao,
  }));

  // nomes corrigidos pelo pesquisador
  for (const p of reg.lista) if (corr.participantes[p.objeto]) p.rotulo = corr.participantes[p.objeto]!;

  // 4. parâmetros (texto das etapas + relatórios), com conflitos entre valores divergentes
  const parametros: Parametro[] = [];
  const porChave = new Map<string, { q: Quantidade; origem: Origem; acaoId: string | null; acaoTipo: Acao | null }[]>();
  const registrar = (q: Quantidade, origem: Origem, acao: AcaoExp | null) => {
    const base = `${acao?.tipo ?? "geral"}|${chaveQuantidade(q)}`;
    // Conflito só entre materiais diferentes e para valores com contexto (“anelamento”).
    // Na mesma fonte, ou sem contexto, valores diferentes são parâmetros distintos (#2, #3…).
    const comparavel = q.contexto !== "";
    for (let k = 1; k <= 8; k++) {
      const chave = k === 1 ? base : `${base}#${k}`;
      const lista = porChave.get(chave) ?? [];
      if (lista.some((x) => Math.abs(x.q.valorCanonico - q.valorCanonico) < 1e-9 && (!comparavel || (x.origem.tipo === origem.tipo && x.origem.materialId === origem.materialId)))) return;
      const ocupado = lista.some((x) => !comparavel || (x.origem.tipo === origem.tipo && x.origem.materialId === origem.materialId));
      if (ocupado) continue;
      lista.push({ q, origem, acaoId: acao?.id ?? null, acaoTipo: acao?.tipo ?? null });
      porChave.set(chave, lista);
      return;
    }
  };
  const acaoPara = (q: Quantidade, preferida?: AcaoExp): AcaoExp | null => {
    if (preferida && ACOES_BIBLIOTECA[preferida.tipo].grandezas.includes(q.grandeza)) return preferida;
    const porContexto: Partial<Record<string, Acao[]>> = { anelamento: ["anelar", "amplificar"], desnaturacao: ["desnaturar", "amplificar"], desnaturacao_inicial: ["amplificar", "desnaturar"], extensao: ["estender", "amplificar"], extensao_final: ["amplificar", "estender"], centrifugacao: ["centrifugar"], eletroforese: ["eletroforese"], agarose: ["eletroforese"], incubacao: ["incubar", "cultivar"], choque_termico: ["transformar"] };
    const tipos = porContexto[q.contexto];
    if (tipos) for (const t of tipos) {
      const a = acoes.find((x) => x.tipo === t);
      if (a) return a;
    }
    return acoes.find((a) => ACOES_BIBLIOTECA[a.tipo].grandezas.includes(q.grandeza) && q.contexto !== "") ?? null;
  };
  for (const a of acoes) {
    const origem = a.origens[0];
    for (const q of extrairQuantidades(a.texto)) registrar(q, { ...origem, trecho: a.texto, local: q.original }, acaoPara(q, a));
  }
  for (const r of relatorios) {
    if (r.estado !== "extraido") continue;
    const frases = r.texto.slice(0, 20_000).split(/(?<=[.!?;])\s+|\n+/);
    for (const f of frases) for (const q of extrairQuantidades(f)) {
      const acao = acaoPara(q);
      if (!acao && !q.contexto) continue; // número solto sem contexto não vira parâmetro
      registrar(q, { tipo: "relatorio", materialId: r.id, trecho: f.trim().slice(0, 400), local: q.original }, acao);
    }
  }

  const conflitos: Conflito[] = [];
  let np = 0;
  for (const [chave, lista] of porChave) {
    const distintos = lista.filter((x, i) => lista.findIndex((y) => Math.abs(y.q.valorCanonico - x.q.valorCanonico) < 1e-9) === i);
    const primeiro = lista[0];
    let escolhido = primeiro;
    if (distintos.length > 1) {
      const idx = corr.conflitos[chave] ?? null;
      conflitos.push({
        id: `c${conflitos.length + 1}`,
        chave,
        nome: primeiro.q.nome,
        acaoId: primeiro.acaoId,
        valores: distintos.slice(0, 6).map((x) => ({ valor: x.q.valor, unidade: x.q.unidade, valorCanonico: x.q.valorCanonico, origem: x.origem })),
        escolhido: idx !== null && idx < distintos.length ? idx : null,
      });
      if (idx !== null && distintos[idx]) escolhido = distintos[idx];
    }
    const c = corr.parametros[chave];
    parametros.push({
      id: `q${++np}`,
      chave,
      acaoId: escolhido.acaoId,
      grandeza: escolhido.q.grandeza,
      nome: escolhido.q.nome,
      valor: c ? c.valor : escolhido.q.valor,
      unidade: c ? c.unidade : escolhido.q.unidade,
      valorCanonico: c ? c.valorCanonico : escolhido.q.valorCanonico,
      unidadeCanonica: escolhido.q.unidadeCanonica,
      origens: c ? [{ tipo: "usuario" as const, trecho: `corrigido para ${formatarValor(c.valor, c.unidade)}` }, ...lista.map((x) => x.origem)].slice(0, 8) : lista.map((x) => x.origem).slice(0, 8),
      conferido: c?.conferido ?? false,
    });
  }

  // 5. dados observados
  const dados = tabelas.flatMap(dadosDaTabela).slice(0, 20);

  // 6. fontes: estado real de cada material
  const fontes: Fonte[] = [];
  for (const m of entrada.materiais) {
    if (m.tipo === "imagem")
      fontes.push({ id: `f_${m.id}`.slice(0, 64), tipo: "arquivo", estado: m.analisadaEm ? "analisado" : "enviado", titulo: m.nome, materialId: m.id, observacao: m.analisadaEm ? "elementos sugeridos pela IA; só os confirmados entram na cena" : m.elementos.length ? "elementos marcados pelo pesquisador" : "sem elementos marcados" });
    if (m.tipo === "tabela") fontes.push({ id: `f_${m.id}`.slice(0, 64), tipo: "arquivo", estado: m.papeis.includes("valor") ? "analisado" : "enviado", titulo: m.nome, materialId: m.id, observacao: m.papeis.includes("valor") ? `${m.totalLinhas} linha(s) lidas` : "colunas ainda não mapeadas" });
    if (m.tipo === "relatorio") fontes.push({ id: `f_${m.id}`.slice(0, 64), tipo: "arquivo", estado: m.estado === "extraido" ? "analisado" : "indisponivel", titulo: m.nome, materialId: m.id, observacao: m.estado === "extraido" ? `texto extraído${m.paginas ? ` de ${m.paginas} página(s)` : ""}` : (m.aviso ?? "não foi possível extrair o texto") });
    if (m.tipo === "referencia") fontes.push({ id: `f_${m.id}`.slice(0, 64), tipo: "referencia", estado: "cadastrada", titulo: m.titulo, materialId: m.id, doi: m.forma === "doi" ? m.valor : undefined, url: m.forma === "url" ? m.valor : undefined, observacao: "referência cadastrada; o conteúdo não foi lido" });
  }
  for (const r of refsCatalogo(brutas.map((e) => e.passo))) {
    const s = SOURCES[r.id];
    if (s) fontes.push({ id: `cat_${r.id}`.slice(0, 64), tipo: "catalogo", estado: "catalogo", titulo: s.citation.slice(0, 300), doi: s.doi, observacao: `catálogo do GenoLab · ${r.locator}` });
  }

  // 7. pendências: só viram pergunta as que mudam a representação
  const ausentes: Pendencia[] = [];
  let nn = 0;

  // avisos sobre os próprios documentos enviados
  for (const m of entrada.materiais) {
    if (m.tipo !== "relatorio" || m.estado !== "extraido") continue;
    const cortadas = etapasCortadas(m);
    if (cortadas > 0)
      ausentes.push({
        id: `n${++nn}`,
        texto: `“${m.nome}”: o documento traz mais etapas do que a cena mostra. ${cortadas} etapa(s) reconhecida(s) ficaram de fora do limite de ${MAX_ETAPAS_RELATORIO}. Divida o documento ou descreva o trecho que interessa.`,
        impacto: "representacao",
        acaoId: null,
        base: "geral",
      });
    if (pareceLevantamento(m.texto))
      ausentes.push({
        id: `n${++nn}`,
        texto: `“${m.nome}” parece um levantamento de artigos, não um procedimento: as frases descrevem o que outros autores fizeram. A cena foi montada a partir delas mesmo assim — confira etapa por etapa, ou envie o protocolo que você vai executar.`,
        impacto: "representacao",
        acaoId: null,
        base: "geral",
      });
  }

  for (const [i, e] of brutas.slice(0, 40).entries()) {
    const acaoId = `a${i + 1}`;
    for (const at of e.passo.atencao) {
      const representacao = /integra|Etapa sem ação reconhecida|como o inserto entra/.test(at.texto);
      ausentes.push({ id: `n${++nn}`, texto: at.texto.slice(0, 400), impacto: representacao ? "representacao" : "avaliacao", acaoId, base: at.base });
    }
    for (const g of ACOES_BIBLIOTECA[e.passo.acao].criticas ?? []) {
      if (!parametros.some((p) => p.acaoId === acaoId && p.grandeza === g))
        ausentes.push({ id: `n${++nn}`, texto: `${e.passo.titulo}: ${g === "temperatura" ? "temperatura" : g === "tempo" ? "tempo" : g === "ciclos" ? "número de ciclos" : g === "porcentagem" ? "concentração do gel" : g === "rotacao" ? "rotação" : g} não informado(a). Necessário para avaliar; a ilustração continua possível.`, impacto: "avaliacao", acaoId, base: "geral" });
    }
  }
  const objetivo = corr.objetivo ? { texto: corr.objetivo, origens: [{ tipo: "usuario" as const, trecho: corr.objetivo.slice(0, 400) }] } : objetivoDe(entrada.texto, entrada.via);
  if (!objetivo && acoes.length) ausentes.push({ id: `n${++nn}`, texto: "O objetivo não foi descrito. Sem ele, a avaliação não sabe qual resultado procurar.", impacto: "avaliacao", acaoId: null, base: "geral" });

  return {
    id: opts.id,
    versao: opts.versao ?? 1,
    criadoEm: opts.agora ?? new Date().toISOString(),
    mudancas: [],
    objetivo,
    participantes: reg.lista,
    acoes,
    parametros,
    dados,
    fontes: fontes.slice(0, 60),
    ausentes: ausentes.slice(0, 60),
    conflitos,
    etapasDe,
  };
}

/** O que mudou entre duas versões (para destacar na tela). */
export function diferencas(antes: Experimento, depois: Experimento): string[] {
  const out: string[] = [];
  const nomeAcao = (a: AcaoExp) => `“${a.titulo}”`;
  const ta = antes.acoes.map((a) => `${a.tipo}|${chaveTrecho(a.texto)}`);
  const tb = depois.acoes.map((a) => `${a.tipo}|${chaveTrecho(a.texto)}`);
  for (const a of depois.acoes) if (!ta.includes(`${a.tipo}|${chaveTrecho(a.texto)}`)) {
    const mesmaFrase = antes.acoes.find((x) => chaveTrecho(x.texto) === chaveTrecho(a.texto));
    out.push(mesmaFrase ? `Etapa ${a.ordem}: ${nomeAcao(mesmaFrase)} → ${nomeAcao(a)}` : `Etapa nova: ${nomeAcao(a)}`);
  }
  for (const a of antes.acoes) if (!tb.includes(`${a.tipo}|${chaveTrecho(a.texto)}`) && !depois.acoes.some((x) => chaveTrecho(x.texto) === chaveTrecho(a.texto))) out.push(`Etapa removida: ${nomeAcao(a)}`);
  const pk = (p: Parametro) => `${p.nome}|${depois.acoes.find((a) => a.id === p.acaoId)?.tipo ?? antes.acoes.find((a) => a.id === p.acaoId)?.tipo ?? ""}`;
  for (const p of depois.parametros) {
    const v = antes.parametros.find((x) => pk(x) === pk(p));
    if (!v) out.push(`Parâmetro novo: ${p.nome} = ${formatarValor(p.valor, p.unidade)}`);
    else if (Math.abs(v.valorCanonico - p.valorCanonico) > 1e-9) out.push(`${p.nome}: ${formatarValor(v.valor, v.unidade)} → ${formatarValor(p.valor, p.unidade)}`);
  }
  for (const p of antes.parametros) if (!depois.parametros.some((x) => pk(x) === pk(p))) out.push(`Parâmetro removido: ${p.nome}`);
  for (const p of depois.participantes) if (!p.inferido && !antes.participantes.some((x) => x.objeto === p.objeto && x.rotulo === p.rotulo)) out.push(`Elemento novo: ${p.rotulo}`);
  if ((antes.objetivo?.texto ?? "") !== (depois.objetivo?.texto ?? "")) out.push("Objetivo alterado");
  if (antes.dados.length !== depois.dados.length) out.push(`Dados observados: ${antes.dados.length} → ${depois.dados.length} conjunto(s)`);
  return out.slice(0, 40);
}

/** Nome legível da entidade do roteiro (reexportado para a interface). */
export const nomeEntidade = (e: Entidade) => ENTIDADE_NOME[e];
