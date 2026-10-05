import type { TecnicaConteudo } from "./tipos";
import { QPCR } from "./qpcr";
import { WESTERN } from "./western";
import { CLONAGEM } from "./clonagem";
import { SANGER } from "./sanger";
import { RNASEQ } from "./rnaseq";
import { ELETROFORESE } from "./eletroforese";

/** Módulos de técnica renderizados por /modulos/[id]. O módulo de PCR tem página própria. */
export const TECNICAS: TecnicaConteudo[] = [ELETROFORESE, QPCR, WESTERN, CLONAGEM, SANGER, RNASEQ];

export const TECNICA_POR_ID = new Map(TECNICAS.map((t) => [t.id, t]));

export function obterTecnica(id: string): TecnicaConteudo | undefined {
  return TECNICA_POR_ID.get(id);
}
