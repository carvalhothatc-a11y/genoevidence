import { lerNumero, normalizar } from "@/lib/ideia/parse";
import type { Grandeza } from "@/lib/cena/biblioteca";

/**
 * Extração determinística de grandezas (número + unidade) de qualquer trecho, com conversão para
 * uma unidade canônica e um NOME derivado do contexto (“Temperatura de anelamento”). Nada é
 * completado por suposição: sem unidade reconhecível, o número não vira parâmetro.
 */
export type Quantidade = {
  grandeza: Grandeza;
  valor: number;
  unidade: string;
  valorCanonico: number;
  unidadeCanonica: string;
  /** Contexto que deu nome ao parâmetro (anelamento, desnaturacao, mgcl2…), ou "" se genérico. */
  contexto: string;
  nome: string;
  original: string;
  ini: number;
  fim: number;
};

type Unidade = { re: RegExp; grandeza: Grandeza; unidade: string; canonica: string; fator: number; converter?: (v: number) => number };

// Ordem importa: mais específicas primeiro. Aplicadas ao texto normalizado logo após o número.
const UNIDADES: Unidade[] = [
  { re: /^(?:°|º)\s?f\b|^fahrenheit/, grandeza: "temperatura", unidade: "°F", canonica: "°C", fator: 1, converter: (v) => ((v - 32) * 5) / 9 },
  { re: /^(?:°|º|o)\s?c\b|^graus(?: celsius)?|^c\b/, grandeza: "temperatura", unidade: "°C", canonica: "°C", fator: 1 },
  { re: /^v\s?\/\s?cm/, grandeza: "tensao", unidade: "V/cm", canonica: "V/cm", fator: 1 },
  { re: /^(?:x|×)\s?g\b/, grandeza: "rotacao", unidade: "× g", canonica: "× g", fator: 1 },
  { re: /^rpm\b/, grandeza: "rotacao", unidade: "rpm", canonica: "rpm", fator: 1 },
  { re: /^(?:segundos?|seg\b|sec\b|s\b)/, grandeza: "tempo", unidade: "s", canonica: "s", fator: 1 },
  { re: /^(?:minutos?|min\b)/, grandeza: "tempo", unidade: "min", canonica: "s", fator: 60 },
  { re: /^(?:horas?|h\b)/, grandeza: "tempo", unidade: "h", canonica: "s", fator: 3600 },
  { re: /^ciclos?\b/, grandeza: "ciclos", unidade: "ciclos", canonica: "ciclos", fator: 1 },
  { re: /^(?:[uµμ]l\b|microlitros?)/, grandeza: "volume", unidade: "µL", canonica: "µL", fator: 1 },
  { re: /^(?:ml\b|mililitros?)/, grandeza: "volume", unidade: "mL", canonica: "µL", fator: 1000 },
  { re: /^ng\s?\/\s?[uµμ]l\b/, grandeza: "concentracao", unidade: "ng/µL", canonica: "ng/µL", fator: 1 },
  { re: /^[uµμ]g\s?\/\s?ml\b/, grandeza: "concentracao", unidade: "µg/mL", canonica: "ng/µL", fator: 1 },
  { re: /^mg\s?\/\s?ml\b/, grandeza: "concentracao", unidade: "mg/mL", canonica: "ng/µL", fator: 1000 },
  { re: /^(?:mm\b|milimolar)/, grandeza: "concentracao", unidade: "mM", canonica: "mM", fator: 1 },
  { re: /^(?:[uµμ]m\b|micromolar)/, grandeza: "concentracao", unidade: "µM", canonica: "mM", fator: 1e-3 },
  { re: /^(?:nm\b|nanomolar)/, grandeza: "concentracao", unidade: "nM", canonica: "mM", fator: 1e-6 },
  { re: /^(?:pg\b|picogramas?)/, grandeza: "massa", unidade: "pg", canonica: "ng", fator: 1e-3 },
  { re: /^(?:ng\b|nanogramas?)/, grandeza: "massa", unidade: "ng", canonica: "ng", fator: 1 },
  { re: /^(?:[uµμ]g\b|microgramas?)/, grandeza: "massa", unidade: "µg", canonica: "ng", fator: 1e3 },
  { re: /^(?:mg\b|miligramas?)/, grandeza: "massa", unidade: "mg", canonica: "ng", fator: 1e6 },
  { re: /^(?:kb\b|kpb\b|kbp\b)/, grandeza: "tamanho", unidade: "kb", canonica: "pb", fator: 1000 },
  { re: /^(?:pb\b|bp\b|pares de bases?)/, grandeza: "tamanho", unidade: "pb", canonica: "pb", fator: 1 },
  { re: /^(?:u\b|unidades?\b)/, grandeza: "unidades", unidade: "U", canonica: "U", fator: 1 },
  { re: /^%/, grandeza: "porcentagem", unidade: "%", canonica: "%", fator: 1 },
  { re: /^(?:v\b|volts?\b)/, grandeza: "tensao", unidade: "V", canonica: "V", fator: 1 },
  { re: /^m\b(?!\s?(?:de|do|da)\b)|^molar\b/, grandeza: "concentracao", unidade: "M", canonica: "mM", fator: 1000 },
];

/** Contextos que nomeiam o parâmetro, procurados antes do número (mesma oração). */
const CONTEXTOS: { re: RegExp; chave: string; rotulo: string; grandezas?: Grandeza[] }[] = [
  { re: /desnatura\w*\s+inicia\w*|inicial\w*\s+(?:de\s+)?desnatura\w*/, chave: "desnaturacao_inicial", rotulo: "desnaturação inicial", grandezas: ["temperatura", "tempo"] },
  { re: /extensao\s+final|final\s+(?:de\s+)?extensao/, chave: "extensao_final", rotulo: "extensão final", grandezas: ["temperatura", "tempo"] },
  { re: /anela\w*|hibridiz\w*/, chave: "anelamento", rotulo: "anelamento", grandezas: ["temperatura", "tempo"] },
  { re: /desnatur\w*/, chave: "desnaturacao", rotulo: "desnaturação", grandezas: ["temperatura", "tempo"] },
  { re: /extensao|alongamento|estender/, chave: "extensao", rotulo: "extensão", grandezas: ["temperatura", "tempo"] },
  { re: /incuba\w*/, chave: "incubacao", rotulo: "incubação", grandezas: ["temperatura", "tempo"] },
  { re: /centrifug\w*|spin/, chave: "centrifugacao", rotulo: "centrifugação", grandezas: ["rotacao", "tempo", "temperatura"] },
  { re: /choque termico/, chave: "choque_termico", rotulo: "choque térmico", grandezas: ["temperatura", "tempo"] },
  { re: /corrida|eletrofor\w*|\bgel\b/, chave: "eletroforese", rotulo: "eletroforese", grandezas: ["tensao", "tempo"] },
  { re: /agarose/, chave: "agarose", rotulo: "agarose", grandezas: ["porcentagem"] },
  { re: /mgcl\s?2|magnesio|\bmg2\+?|\bmg\b/, chave: "mgcl2", rotulo: "MgCl₂", grandezas: ["concentracao"] },
  { re: /dntps?\b|nucleotideo\w*/, chave: "dntps", rotulo: "dNTPs", grandezas: ["concentracao"] },
  { re: /primers?\b|iniciador\w*|oligo\w*/, chave: "primers", rotulo: "primers", grandezas: ["concentracao", "volume"] },
  { re: /\btaq\b|polimerase|\bpfu\b|enzima/, chave: "enzima", rotulo: "enzima", grandezas: ["unidades", "volume"] },
  { re: /\bdna\b|molde|template|\bcdna\b/, chave: "dna", rotulo: "DNA molde", grandezas: ["massa", "volume", "concentracao"] },
  { re: /amplicon\w*|produto|fragmento|inserto/, chave: "fragmento", rotulo: "fragmento", grandezas: ["tamanho"] },
  { re: /reacao|volume final|volume total|mix/, chave: "reacao", rotulo: "reação", grandezas: ["volume"] },
  { re: /antibiotico|ampicilina|canamicina|cloranfenicol|tetraciclina/, chave: "antibiotico", rotulo: "antibiótico", grandezas: ["concentracao"] },
];

const NOME_GRANDEZA: Record<Grandeza, string> = {
  temperatura: "Temperatura",
  tempo: "Tempo",
  volume: "Volume",
  massa: "Quantidade",
  concentracao: "Concentração",
  ciclos: "Número de ciclos",
  rotacao: "Rotação",
  tensao: "Tensão",
  tamanho: "Tamanho",
  unidades: "Unidades",
  porcentagem: "Porcentagem",
};

function nomear(g: Grandeza, ctx: { chave: string; rotulo: string } | null): string {
  if (!ctx) return NOME_GRANDEZA[g];
  if (g === "concentracao") return `Concentração de ${ctx.rotulo}`;
  if (g === "massa") return `Quantidade de ${ctx.rotulo}`;
  if (g === "porcentagem" && ctx.chave === "agarose") return "Concentração de agarose";
  if (g === "tamanho") return `Tamanho do ${ctx.rotulo}`;
  if (g === "unidades") return `Unidades de ${ctx.rotulo}`;
  if (g === "volume") return ctx.chave === "reacao" ? "Volume da reação" : `Volume de ${ctx.rotulo}`;
  if (g === "ciclos") return NOME_GRANDEZA.ciclos;
  return `${NOME_GRANDEZA[g]} de ${ctx.rotulo}`;
}

const NUM = /(?<![\w.,])(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s?/g;

export function extrairQuantidades(texto: string): Quantidade[] {
  const n = normalizar(texto);
  const out: Quantidade[] = [];
  // cada ocorrência de contexto nomeia só UM valor de cada grandeza (“anelamento a 58 °C … e 72 °C”)
  const usados = new Map<number, Set<Grandeza>>();
  NUM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM.exec(n))) {
    const ini = m.index;
    const resto = n.slice(m.index + m[0].length, m.index + m[0].length + 24);
    const u = UNIDADES.find((x) => x.re.test(resto));
    if (!u) continue;
    const um = u.re.exec(resto)!;
    // “55C” só vale como temperatura quando colado ao número
    if (u.unidade === "°C" && /^c\b/.test(resto) && /\s$/.test(m[0])) continue;
    // letra única colada em maiúscula é nome, não unidade (“16S”)
    const uPos = m.index + m[0].length;
    if (um[0].length === 1 && /[sh]/.test(um[0]) && /[SH]/.test(texto.charAt(uPos))) continue;
    const valor = lerNumero(m[1]);
    if (!Number.isFinite(valor)) continue;
    const fim = m.index + m[0].length + um[0].length;
    // contexto: mesma oração, até 60 caracteres antes (o mais próximo vence)
    const antes = n.slice(Math.max(0, ini - 60), ini);
    const oracao = antes.split(/[.;:\n]/).pop() ?? antes;
    let melhor: { chave: string; rotulo: string; pos: number } | null = null;
    for (const c of CONTEXTOS) {
      if (c.grandezas && !c.grandezas.includes(u.grandeza)) continue;
      const g = new RegExp(c.re.source, "g");
      let cm: RegExpExecArray | null;
      while ((cm = g.exec(oracao))) if (!melhor || cm.index > melhor.pos || (cm.index === melhor.pos && c.chave.length > melhor.chave.length)) melhor = { chave: c.chave, rotulo: c.rotulo, pos: cm.index };
    }
    if (melhor) {
      const abs = Math.max(0, ini - 60) + (antes.length - oracao.length) + melhor.pos;
      const g = usados.get(abs) ?? new Set<Grandeza>();
      if (g.has(u.grandeza)) melhor = null;
      else usados.set(abs, g.add(u.grandeza));
    }
    // reagente citado logo DEPOIS (“1,5 mM de MgCl2”, “200 µM de cada dNTP”)
    if (!melhor && (u.grandeza === "concentracao" || u.grandeza === "massa" || u.grandeza === "volume" || u.grandeza === "unidades")) {
      const depois = n.slice(fim, fim + 30);
      for (const c of CONTEXTOS) {
        if (c.grandezas && !c.grandezas.includes(u.grandeza)) continue;
        const dm = c.re.exec(depois);
        if (dm && dm.index < 22) {
          melhor = { chave: c.chave, rotulo: c.rotulo, pos: 0 };
          break;
        }
      }
    }
    const canonico = u.converter ? u.converter(valor) : valor * u.fator;
    out.push({
      grandeza: u.grandeza,
      valor,
      unidade: u.unidade,
      valorCanonico: Math.round(canonico * 1e6) / 1e6,
      unidadeCanonica: u.canonica,
      contexto: melhor?.chave ?? "",
      nome: nomear(u.grandeza, melhor),
      original: texto.slice(ini, fim).trim(),
      ini,
      fim,
    });
    NUM.lastIndex = fim;
  }
  return out;
}

/** Chave de comparação entre materiais: mesma grandeza no mesmo contexto. */
export const chaveQuantidade = (q: Pick<Quantidade, "grandeza" | "contexto">) => `${q.grandeza}:${q.contexto || "geral"}`;

export function formatarValor(v: number, unidade: string): string {
  const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000).replace(".", ",");
  return unidade === "ciclos" ? `${s} ciclos` : `${s} ${unidade}`;
}
