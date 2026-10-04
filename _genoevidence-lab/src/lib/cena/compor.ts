import { descreverCena, POSSIBILIDADES, reconstruirPasso, type Entidade, type PassoVisual, type Possibilidade } from "@/lib/visual/roteiro";
import type { AcaoExp, Experimento, Origem, Parametro, Participante } from "@/lib/experimento/schema";
import { formatarValor } from "@/lib/experimento/quantidades";
import { OBJETOS, OBJETO_DA_ENTIDADE, type ObjetoId, type Papel } from "./biblioteca";

/**
 * COMPOSIÇÃO DA CENA: descrição estruturada → etapas animáveis. Cada elemento mostrado guarda o
 * participante e as origens que o justificam; o que não tem forma 3D aparece como rótulo e é
 * listado como limitação. Nenhum código é gerado: a cena é só dados validados.
 */
export type ElementoCena = {
  participanteId: string;
  objeto: ObjetoId;
  rotulo: string;
  papel: Papel;
  origens: Origem[];
  inferido: boolean;
  forma3d: boolean;
};

export type EtapaCena = {
  id: string;
  ordem: number;
  acao: AcaoExp["tipo"];
  titulo: string;
  texto: string;
  elementos: ElementoCena[];
  parametros: Parametro[];
  /** Duração experimental informada (não é a duração da animação). */
  tempoExperimental: string | null;
  mostra: string;
  /** Passo compatível com as coreografias 3D/2D existentes. */
  passo: PassoVisual;
  possibilidades: Possibilidade[];
  limitacoes: string[];
  origens: Origem[];
};

export type CenaSpec = { experimentoId: string; versao: number; etapas: EtapaCena[]; limitacoes: string[] };

const ENTIDADE_DO_OBJETO: Partial<Record<ObjetoId, Entidade>> = Object.fromEntries(Object.entries(OBJETO_DA_ENTIDADE).map(([e, o]) => [o, e as Entidade]));

export function comporCena(exp: Experimento): CenaSpec {
  const porId = new Map<string, Participante>(exp.participantes.map((p) => [p.id, p]));
  const limitacoesGerais: string[] = [];
  const etapas: EtapaCena[] = exp.acoes.map((a) => {
    const elementos: ElementoCena[] = a.participantes
      .map(({ papel, participanteId }) => {
        const p = porId.get(participanteId);
        if (!p) return null;
        return { participanteId, objeto: p.objeto, rotulo: p.rotulo, papel, origens: p.origens, inferido: p.inferido, forma3d: OBJETOS[p.objeto].forma3d };
      })
      .filter((x): x is ElementoCena => x !== null);
    const parametros = exp.parametros.filter((q) => q.acaoId === a.id);
    const tempos = parametros.filter((q) => q.grandeza === "tempo");
    const ent = (papel: Papel) => {
      const el = elementos.find((x) => x.papel === papel);
      return el ? (ENTIDADE_DO_OBJETO[el.objeto] ?? null) : null;
    };
    const entidades = elementos.map((e) => ENTIDADE_DO_OBJETO[e.objeto]).filter((x): x is Entidade => Boolean(x));
    const base: PassoVisual = {
      id: a.id,
      ordem: a.ordem,
      texto: a.texto,
      acao: a.tipo,
      titulo: a.titulo,
      entidades: [...new Set(entidades)].slice(0, 5),
      origem: ent("origem"),
      destino: ent("destino"),
      rotulos: a.rotulos,
      integracao: a.integracao,
      confianca: a.confianca,
      mostra: descreverCena(a.tipo, ent("origem"), ent("destino"), a.rotulos, a.integracao),
      refs: [],
      atencao: [],
      variaveis: [],
    };
    const passo = { ...reconstruirPasso(base, a.tipo), confianca: a.confianca };
    const limitacoes: string[] = [];
    if (a.tipo === "generica") limitacoes.push("Ação sem representação específica: a cena mostra os materiais citados, com o texto original.");
    for (const el of elementos) if (!el.forma3d) limitacoes.push(`${el.rotulo}: sem forma 3D na biblioteca; aparece como rótulo.`);
    const temperatura = parametros.find((q) => q.grandeza === "temperatura");
    const volume = parametros.find((q) => q.grandeza === "volume");
    const ciclos = parametros.find((q) => q.grandeza === "ciclos");
    const rotulosCena: PassoVisual["rotulos"] = {
      ...passo.rotulos,
      ...(temperatura && !passo.rotulos.temperatura ? { temperatura: formatarValor(temperatura.valor, temperatura.unidade) } : {}),
      ...(volume ? { volume: formatarValor(volume.valor, volume.unidade) } : {}),
      ...(ciclos ? { ciclos: formatarValor(ciclos.valor, ciclos.unidade) } : {}),
    };
    return {
      id: a.id,
      ordem: a.ordem,
      acao: a.tipo,
      titulo: a.titulo,
      texto: a.texto,
      elementos,
      parametros,
      tempoExperimental: tempos.length ? tempos.map((q) => `${formatarValor(q.valor, q.unidade)}${tempos.length > 1 ? ` (${q.nome.replace(/^Tempo de /, "")})` : ""}`).join(" · ") : null,
      mostra: passo.mostra,
      passo: { ...passo, rotulos: rotulosCena },
      possibilidades: POSSIBILIDADES[a.tipo] ?? [],
      limitacoes,
      origens: a.origens,
    };
  });
  if (!etapas.length) limitacoesGerais.push("Nenhuma ação descrita ainda.");
  return { experimentoId: exp.id, versao: exp.versao, etapas, limitacoes: limitacoesGerais };
}

/** Elemento da etapa que corresponde a um objeto selecionado na cena. */
export function elementoDoObjeto(etapa: EtapaCena | undefined, objeto: ObjetoId): ElementoCena | null {
  return etapa?.elementos.find((e) => e.objeto === objeto) ?? null;
}
