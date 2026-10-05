import { ACAO_TITULO, descreverCena, type PassoVisual } from "@/lib/visual/roteiro";
import type { CenaEtapa, EtapaTecnica } from "./tipos";

/**
 * Converte a cena declarada de uma etapa num PassoVisual, para reaproveitar as mesmas cenas 3D e 2D
 * da área de trabalho. A cena é ILUSTRAÇÃO DIDÁTICA: não é resultado nem previsão.
 */
export function passoDaEtapa(etapa: EtapaTecnica, ordem: number): PassoVisual {
  const c: CenaEtapa = etapa.cena;
  return {
    id: etapa.id,
    ordem,
    texto: etapa.resumo,
    acao: c.acao,
    titulo: ACAO_TITULO[c.acao],
    entidades: c.entidades,
    origem: c.origem ?? null,
    destino: c.destino ?? null,
    rotulos: c.rotulos ?? {},
    integracao: false,
    confianca: "alta",
    mostra: c.legenda || descreverCena(c.acao, c.origem ?? null, c.destino ?? null, c.rotulos ?? {}, false),
    refs: [],
    atencao: [],
    variaveis: [],
  };
}
