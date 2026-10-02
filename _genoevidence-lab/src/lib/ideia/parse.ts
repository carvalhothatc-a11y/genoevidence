import { cenarioVazio, setCampo, type Campo, type Cenario, type TecnicaId, type Valor } from "./schema";

/**
 * Conversão determinística da descrição (texto ou transcrição) em plano estruturado.
 * Regras locais, sem modelo de linguagem: reconhece números com unidades, normaliza para as
 * unidades canônicas e associa cada valor a um campo pelo contexto da frase. Tudo que é
 * reconhecido vem com o TRECHO de origem; nada é completado por suposição.
 */

export type Extracao = {
  campo: Campo;
  valor: Valor;
  /** Como estava escrito (ex.: "1,5 mM", "30 seg"). */
  original: string;
  /** Frase de onde o valor foi extraído. */
  trecho: string;
  /** Conversões ou interpretações feitas (ex.: "nM → µM", "ordem usual da ciclagem"). */
  nota?: string;
  /** "conferir" quando a associação ao campo dependeu de interpretação. */
  confianca: "alta" | "conferir";
};

/** Correção proposta ao pesquisador. NUNCA é aplicada automaticamente. */
export type Sugestao = { campo: Campo; atual: Valor; sugerido: Valor; motivo: string; trecho: string };

export type Interpretacao = { cenario: Cenario; extracoes: Extracao[]; sugestoes: Sugestao[]; avisos: string[] };

// ---------------------------------------------------------------- normalização com índices preservados

/** Minúsculas e sem acentos, com o MESMO comprimento do texto original (para recortar trechos). */
export function normalizar(texto: string): string {
  let out = "";
  for (const ch of texto) {
    const base = ch.normalize("NFD")[0] ?? ch;
    const lower = base.toLowerCase();
    out += lower.length === ch.length ? lower : ch.length === 1 ? (lower[0] ?? " ") : ch;
  }
  return out;
}

/** Converte "1,5" / "1.5" / "1.500" (milhar) em número. */
export function lerNumero(s: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return Number(s.replace(",", "."));
}

type Dimensao = "temp" | "tempo" | "conc" | "pmol" | "x" | "enzima" | "massa" | "volume" | "tamanho" | "pct" | "volts" | "vcm" | "ciclos" | "ambiguo";

type Medida = { valor: number; unidade: string; dim: Dimensao; nota?: string; ini: number; fim: number; original: string };

const UNIDADES: { re: RegExp; dim: Dimensao; unidade: string; fator: number; nota?: string; caseSensitive?: boolean }[] = [
  { re: /^(?:°|º|o)\s?c(?![a-z])|^graus(?: celsius)?|^c(?![a-z])/, dim: "temp", unidade: "°C", fator: 1 },
  { re: /^(?:°|º)\s?f(?![a-z])|^fahrenheit/, dim: "temp", unidade: "°F", fator: 1 },
  { re: /^v\s?\/\s?cm/, dim: "vcm", unidade: "V/cm", fator: 1 },
  { re: /^(?:segundos?|seg(?![a-z])|sec(?![a-z])|s(?![a-z]))/, dim: "tempo", unidade: "s", fator: 1 },
  { re: /^(?:minutos?|min(?![a-z]))/, dim: "tempo", unidade: "s", fator: 60 },
  { re: /^(?:horas?|h(?![a-z]))/, dim: "tempo", unidade: "s", fator: 3600 },
  { re: /^ciclos?(?![a-z])/, dim: "ciclos", unidade: "ciclos", fator: 1 },
  { re: /^(?:mm(?![a-z])|milimolar)/, dim: "conc", unidade: "mM", fator: 1e-3 },
  { re: /^(?:[uµμ]m(?![a-z])|micromolar)/, dim: "conc", unidade: "µM", fator: 1e-6 },
  { re: /^(?:nm(?![a-z])|nanomolar)/, dim: "conc", unidade: "nM", fator: 1e-9 },
  { re: /^pmol(?:es)?(?![a-z])/, dim: "pmol", unidade: "pmol", fator: 1 },
  { re: /^(?:[uµμ]l(?![a-z])|microlitros?)/, dim: "volume", unidade: "µL", fator: 1 },
  { re: /^(?:ml(?![a-z])|mililitros?)/, dim: "volume", unidade: "µL", fator: 1000, nota: "mL → µL" },
  { re: /^ng(?![a-z])/, dim: "massa", unidade: "ng", fator: 1 },
  { re: /^[uµμ]g(?![a-z])/, dim: "massa", unidade: "ng", fator: 1000, nota: "µg → ng" },
  { re: /^pg(?![a-z])/, dim: "massa", unidade: "ng", fator: 0.001, nota: "pg → ng" },
  { re: /^u\s?\/\s?[uµμ]l/, dim: "ambiguo", unidade: "U/µL", fator: 1 },
  { re: /^(?:unidades?|u(?![a-z]))/, dim: "enzima", unidade: "U", fator: 1 },
  { re: /^(?:pb|bp)(?![a-z])/, dim: "tamanho", unidade: "pb", fator: 1 },
  { re: /^(?:kb|kpb)(?![a-z])/, dim: "tamanho", unidade: "pb", fator: 1000, nota: "kb → pb" },
  { re: /^%/, dim: "pct", unidade: "%", fator: 1 },
  { re: /^(?:volts?|v(?![a-z]))/, dim: "volts", unidade: "V", fator: 1 },
  { re: /^x(?![a-z])/, dim: "x", unidade: "X", fator: 1 },
  { re: /^m(?![a-z])/, dim: "ambiguo", unidade: "m", fator: 1 },
  { re: /^molar(?![a-z])/, dim: "conc", unidade: "M", fator: 1 },
];

function medidas(texto: string, norm: string): Medida[] {
  const out: Medida[] = [];
  const re = /(?<![\w.,])(\d{1,3}(?:\.\d{3})+(?![\d,])|\d+(?:[.,]\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    const valor = lerNumero(m[1]);
    const after = norm.slice(m.index + m[1].length);
    const ws = /^\s*/.exec(after)![0].length;
    const rest = after.slice(ws);
    // "M" maiúsculo isolado = molar; "m" minúsculo isolado = ambíguo (minuto? molar?).
    const origRest = texto.slice(m.index + m[1].length + ws);
    let found: Medida | null = null;
    for (const u of UNIDADES) {
      const um = u.re.exec(rest);
      if (!um) continue;
      let { dim, unidade, fator, nota } = u;
      if (unidade === "m" && origRest.startsWith("M")) {
        dim = "conc";
        unidade = "M";
        fator = 1;
      }
      if (unidade === "mM" && origRest.startsWith("mm")) nota = "“mm” interpretado como mM (milimolar)";
      if (unidade === "µM" && origRest.startsWith("um")) nota = "“um” interpretado como µM (micromolar)";
      const fim = m.index + m[1].length + ws + um[0].length;
      found = { valor: valor * fator, unidade, dim, nota, ini: m.index, fim, original: texto.slice(m.index, fim) };
      if (dim === "conc") found.valor = valor * fator; // em mol/L; convertido por campo
      break;
    }
    out.push(found ?? { valor, unidade: "", dim: "ambiguo", ini: m.index, fim: m.index + m[1].length, original: m[1] });
  }
  return out;
}

// ---------------------------------------------------------------- orações e palavras-chave

type Oracao = { ini: number; fim: number };

function oracoes(norm: string): Oracao[] {
  const out: Oracao[] = [];
  let ini = 0;
  const re = /[;\n!?]|\.(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    if (m.index > ini) out.push({ ini, fim: m.index });
    ini = m.index + 1;
  }
  if (ini < norm.length) out.push({ ini, fim: norm.length });
  return out;
}

type Chave = { campo: string; ini: number; fim: number };

/** Marcadores de contexto (texto normalizado). A ordem importa: os mais específicos primeiro. */
const MARCADORES: { campo: string; re: RegExp }[] = [
  { campo: "extFinal", re: /extensao final|alongamento final|extensao de \d+ ?min(?:utos)? final|final de extensao/g },
  { campo: "desnatInicial", re: /desnaturacao inicial|desnaturacao previa|ativacao inicial|ativacao da (?:enzima|polimerase)|inicial(?:mente)? a/g },
  { campo: "desnat", re: /desnatura\w*|denatura\w*/g },
  { campo: "anel", re: /anela\w*|annealing|hibridiza\w*/g },
  { campo: "ext", re: /extensao|extender|estender|alongamento|elongacao|extension/g },
  { campo: "hold", re: /manter a|manutencao|hold|armazenar a|conservar a/g },
  { campo: "tm", re: /\btm\b|temperatura de (?:fusao|melting)/g },
  { campo: "mg", re: /mgcl\w*|magnesio|mg2\+|mg\+\+|mg ?2 ?\+/g },
  { campo: "dntp", re: /dntp\w*|nucleotideo\w*/g },
  { campo: "primer", re: /primers?|iniciador\w*|oligo\w*/g },
  { campo: "polimerase", re: /polimerase|\btaq\b|\bpfu\b|enzima/g },
  { campo: "molde", re: /molde|template|dna genomico|cdna|\bdna\b/g },
  { campo: "volume", re: /volume|reacao de|reacoes de|volume final|volume total/g },
  { campo: "amplicon", re: /amplicon\w*|produto|fragmento|alvo|banda/g },
  { campo: "marcador", re: /marcador|ladder|padrao de peso/g },
  { campo: "agarose", re: /agarose|\bgel\b/g },
  { campo: "fonte", re: /fonte|corrida|voltagem|tensao/g },
  { campo: "tampao", re: /tampao|buffer/g },
];

function chaves(norm: string): Chave[] {
  const out: Chave[] = [];
  const taken: [number, number][] = [];
  for (const { campo, re } of MARCADORES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm))) {
      const a = m.index;
      const b = a + m[0].length;
      if (taken.some(([x, y]) => a < y && b > x)) continue;
      taken.push([a, b]);
      out.push({ campo, ini: a, fim: b });
    }
  }
  return out.sort((x, y) => x.ini - y.ini);
}

/** Campos de contexto aceitos por dimensão. */
const ACEITA: Record<string, string[]> = {
  temp: ["desnatInicial", "desnat", "anel", "ext", "extFinal", "hold", "tm"],
  tempo: ["desnatInicial", "desnat", "anel", "ext", "extFinal"],
  conc: ["mg", "dntp", "primer"],
  pmol: ["primer"],
  enzima: ["polimerase"],
  massa: ["molde"],
  volume: ["volume", "mg", "dntp", "primer", "polimerase", "molde", "tampao"],
  tamanho: ["amplicon", "marcador"],
  pct: ["agarose"],
  volts: ["fonte", "agarose"],
  vcm: ["fonte", "agarose"],
};

const ETAPA_CAMPO: Record<string, string> = { desnatInicial: "desnatInicial", desnat: "desnat", anel: "anel", ext: "ext", extFinal: "extFinal" };

// ---------------------------------------------------------------- técnica, objetivo e textos

const TECNICAS: { id: TecnicaId; re: RegExp }[] = [
  { id: "qpcr", re: /qpcr|pcr em tempo real|pcr quantitativa|tempo real|sybr|taqman|curva de melting|\bct\b|\bcq\b/ },
  { id: "rt_pcr", re: /rt-pcr|rt pcr|transcricao reversa|transcriptase reversa/ },
  { id: "western_blot", re: /western|imunoblot/ },
  { id: "crispr", re: /crispr|cas9|guia de rna|sgrna/ },
  { id: "elisa", re: /\belisa\b/ },
  { id: "sequenciamento", re: /sequenciamento|sanger|\bngs\b|illumina|nanopore/ },
  { id: "clonagem", re: /clonagem|clonar|ligacao em vetor|transformacao de bacterias|competentes/ },
  { id: "cultura_celular", re: /cultura de celulas|cultura celular|linhagem celular|passagem das celulas/ },
  { id: "pcr", re: /\bpcr\b|amplifica\w*|termociclador|\bprimers?\b|ciclagem|anelamento|desnaturacao/ },
];

export const TECNICA_NOME: Record<TecnicaId, string> = {
  pcr: "PCR convencional (ponto final)",
  qpcr: "PCR quantitativa em tempo real (qPCR)",
  rt_pcr: "RT-PCR",
  western_blot: "Western blot",
  crispr: "Edição gênica por CRISPR",
  clonagem: "Clonagem molecular",
  elisa: "ELISA",
  sequenciamento: "Sequenciamento",
  cultura_celular: "Cultura celular",
  desconhecida: "Não identificada",
};

function frases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- interpretação

export function interpretarDescricao(texto: string, opts: { id: string; via: Cenario["entrada"]["via"] }): Interpretacao {
  const norm = normalizar(texto);
  let c = cenarioVazio(opts.id, texto, opts.via);
  const extracoes: Extracao[] = [];
  const sugestoes: Sugestao[] = [];
  const avisos: string[] = [];

  // Técnica (a primeira regra que casar, das mais específicas para a PCR convencional).
  const tec = TECNICAS.find((t) => t.re.test(norm));
  c.tecnica = tec?.id ?? "desconhecida";
  if (tec && tec.id !== "pcr" && /\bpcr\b/.test(norm) && tec.id === "rt_pcr" && /qpcr|tempo real/.test(norm)) c.tecnica = "qpcr";

  const trechoDe = (ini: number, fim: number) => {
    const o = oracoes(norm).find((x) => ini >= x.ini && fim <= x.fim + 1);
    return (o ? texto.slice(o.ini, o.fim) : texto.slice(Math.max(0, ini - 40), fim + 40)).trim().slice(0, 240);
  };
  const add = (campo: Campo, valor: Valor, med: { original: string; ini: number; fim: number }, nota?: string, confianca: Extracao["confianca"] = "alta") => {
    const anterior = extracoes.find((x) => x.campo === campo && x.valor !== null);
    if (anterior) {
      // Mesmo campo citado de novo: mantém o primeiro valor; avisa se divergir.
      if (anterior.valor !== valor) avisos.push(`Dois valores para “${campo}”: ${anterior.original} e ${med.original}. Mantido o primeiro; confira no plano.`);
      return;
    }
    c = setCampo(c, campo, valor);
    extracoes.push({ campo, valor, original: med.original, trecho: trechoDe(med.ini, med.fim), nota, confianca });
  };

  const ms = medidas(texto, norm);
  const ks = chaves(norm);
  const ors = oracoes(norm);
  const usada = new Set<Medida>();

  // Ciclos: "35 ciclos" ou "35x" (fora de contexto de tampão).
  for (const m of ms) {
    if (m.dim === "ciclos" || (m.dim === "x" && m.valor >= 15 && Number.isInteger(m.valor) && !/tampao|buffer/.test(norm.slice(Math.max(0, m.ini - 30), m.fim + 30)))) {
      add("programa.ciclos", Math.round(m.valor), m, m.dim === "x" ? "“x” interpretado como número de ciclos" : undefined, m.dim === "x" ? "conferir" : "alta");
      usada.add(m);
    } else if (m.dim === "x") usada.add(m); // concentração de tampão (1X, 10X): não usada no plano
  }

  for (const o of ors) {
    const mo = ms.filter((m) => m.ini >= o.ini && m.fim <= o.fim + 1 && !usada.has(m));
    const ko = ks.filter((k) => k.ini >= o.ini && k.fim <= o.fim + 1);
    const reivindicada = new Map<string, Set<Chave>>();
    const livre = (dim: string, k: Chave) => !reivindicada.get(dim)?.has(k);
    const reivindicar = (dim: string, k: Chave) => {
      if (!reivindicada.has(dim)) reivindicada.set(dim, new Set());
      reivindicada.get(dim)!.add(k);
    };

    /** Escolhe o marcador de contexto: o anterior mais próximo e livre; senão, o seguinte (até 30 caracteres). */
    const contexto = (m: Medida, dim: string): Chave | null => {
      const ok = ACEITA[dim] ?? [];
      const antes = ko.filter((k) => k.fim <= m.ini && ok.includes(k.campo) && livre(dim, k));
      // não atravessar outra medida da mesma dimensão
      const semIntermediaria = antes.filter((k) => !mo.some((x) => x !== m && x.dim === m.dim && x.ini > k.fim && x.fim <= m.ini));
      const prev = semIntermediaria[semIntermediaria.length - 1];
      if (prev && m.ini - prev.fim <= 60) return prev;
      const next = ko.find((k) => k.ini >= m.fim && k.ini - m.fim <= 30 && ok.includes(k.campo) && livre(dim, k));
      return next ?? null;
    };

    // 1) temperaturas
    const temps = mo.filter((m) => m.dim === "temp");
    const semEtapa: Medida[] = [];
    const etapaDaTemp = new Map<Medida, string>();
    for (const m of temps) {
      let tempC = m.valor;
      let nota = m.nota;
      if (m.unidade === "°F") {
        tempC = Math.round(((m.valor - 32) * 5) / 9);
        nota = `°F convertido para °C (${m.valor} °F = ${tempC} °C)`;
      }
      const k = contexto(m, "temp");
      if (!k) {
        semEtapa.push(m);
        continue;
      }
      reivindicar("temp", k);
      if (k.campo === "hold") {
        usada.add(m);
        continue;
      }
      if (k.campo === "tm") {
        add("primersTmC", tempC, m, nota);
      } else {
        etapaDaTemp.set(m, k.campo);
        add(`programa.${ETAPA_CAMPO[k.campo]}.tempC` as Campo, tempC, m, nota);
        if (m.unidade === "°F") sugestoes.push({ campo: `programa.${ETAPA_CAMPO[k.campo]}.tempC` as Campo, atual: tempC, sugerido: m.valor, motivo: `Foi escrito ${m.original}. Em PCR as temperaturas costumam ser dadas em °C; você quis dizer ${m.valor} °C?`, trecho: trechoDe(m.ini, m.fim) });
      }
      usada.add(m);
    }
    // Ciclagem sem nomes de etapas: três temperaturas em sequência → desnaturação, anelamento, extensão.
    if (semEtapa.length) {
      const ciclo = /ciclo/.test(norm.slice(o.ini, o.fim));
      const ordem = ["desnat", "anel", "ext"];
      const livres = ordem.filter((e) => !extracoes.some((x) => x.campo === `programa.${e}.tempC`));
      if (ciclo && semEtapa.length === 3 && livres.length === 3) {
        semEtapa.forEach((m, i) => {
          etapaDaTemp.set(m, ordem[i]);
          add(`programa.${ordem[i]}.tempC` as Campo, m.valor, m, "Associado pela ordem usual do ciclo (desnaturação, anelamento, extensão)", "conferir");
          usada.add(m);
        });
      } else {
        for (const m of semEtapa) {
          avisos.push(`Temperatura sem etapa identificada: “${m.original}” em “${trechoDe(m.ini, m.fim)}”. Indique a etapa no plano.`);
          usada.add(m);
        }
      }
    }

    // 2) tempos: herdam a etapa da temperatura imediatamente anterior, senão usam o marcador de contexto.
    for (const m of mo.filter((x) => x.dim === "tempo")) {
      const tempAntes = temps.filter((t) => t.fim <= m.ini && m.ini - t.fim <= 16 && etapaDaTemp.has(t)).pop();
      const k = tempAntes ? null : contexto(m, "tempo");
      const etapa = tempAntes ? etapaDaTemp.get(tempAntes)! : k?.campo;
      if (!etapa || !ETAPA_CAMPO[etapa]) {
        avisos.push(`Tempo sem etapa identificada: “${m.original}”. Indique a etapa no plano.`);
        usada.add(m);
        continue;
      }
      if (k) reivindicar("tempo", k);
      add(`programa.${ETAPA_CAMPO[etapa]}.segundos` as Campo, Math.round(m.valor), m, m.unidade !== "s" || m.original.match(/min|h/) ? `convertido para segundos` : m.nota);
      usada.add(m);
    }

    // 3) demais medidas
    for (const m of mo.filter((x) => !usada.has(x))) {
      if (m.dim === "ambiguo") {
        if (m.unidade === "m") avisos.push(`Unidade ambígua em “${m.original}”: “m” pode ser minuto ou molar. Corrija no plano.`);
        else if (m.unidade === "U/µL") avisos.push(`“${m.original}” é a concentração de estoque da enzima; o plano usa unidades por reação (U).`);
        else {
          // número sem unidade junto de uma etapa: só sugestão
          const k = contexto(m, "temp");
          if (k && ETAPA_CAMPO[k.campo] && m.valor >= 30 && m.valor <= 100)
            sugestoes.push({ campo: `programa.${ETAPA_CAMPO[k.campo]}.tempC` as Campo, atual: null, sugerido: m.valor, motivo: `“${m.original}” foi escrito sem unidade. É ${m.valor} °C?`, trecho: trechoDe(m.ini, m.fim) });
        }
        continue;
      }
      const k = contexto(m, m.dim);
      if (!k) {
        if (m.dim === "tamanho") add("alvo.ampliconPb", Math.round(m.valor), m, m.nota, "conferir");
        else if (m.dim === "pct" && /agarose|gel/.test(norm)) add("gel.agarosePct", m.valor, m, m.nota, "conferir");
        else if (m.dim === "volts") add("gel.voltsTotal", m.valor, m, m.nota, "conferir");
        else if (m.dim === "vcm") add("gel.vPorCm", m.valor, m, m.nota, "conferir");
        else avisos.push(`Valor sem contexto reconhecido: “${m.original}” em “${trechoDe(m.ini, m.fim)}”.`);
        continue;
      }
      reivindicar(m.dim, k);
      switch (m.dim) {
        case "conc": {
          const mol = m.valor; // mol/L
          if (k.campo === "mg") {
            const mM = +(mol * 1e3).toPrecision(6);
            add("reacao.mgcl2mM", mM, m, m.unidade !== "mM" ? `${m.unidade} → mM` : m.nota);
            if (m.unidade === "M") sugestoes.push({ campo: "reacao.mgcl2mM", atual: mM, sugerido: +(mM / 1000).toPrecision(6), motivo: `Foi escrito ${m.original} (${mM} mM), muito acima da faixa citada para a reação (0,5–5,0 mM). Você quis dizer ${m.original.replace(/\s?M$/, " mM")}?`, trecho: trechoDe(m.ini, m.fim) });
          } else if (k.campo === "dntp") {
            const uM = +(mol * 1e6).toPrecision(6);
            add("reacao.dntpsUM", uM, m, m.unidade !== "µM" ? `${m.unidade} → µM` : m.nota);
            if (uM > 5000) sugestoes.push({ campo: "reacao.dntpsUM", atual: uM, sugerido: +(uM / 1000).toPrecision(6), motivo: `${m.original} equivale a ${uM} µM, muito acima dos valores citados (50–200 µM de cada). Confira a unidade.`, trecho: trechoDe(m.ini, m.fim) });
          } else if (k.campo === "primer") {
            const uM = +(mol * 1e6).toPrecision(6);
            add("reacao.primerUM", uM, m, m.unidade !== "µM" ? `${m.unidade} → µM` : m.nota);
            if (uM > 50) sugestoes.push({ campo: "reacao.primerUM", atual: uM, sugerido: +(uM / 1000).toPrecision(6), motivo: `${m.original} equivale a ${uM} µM de primer na reação, um valor incomum. Confira se não é a concentração do estoque ou se a unidade é nM.`, trecho: trechoDe(m.ini, m.fim) });
          }
          break;
        }
        case "pmol":
          extracoes.push({ campo: "reacao.primerUM", valor: null, original: m.original, trecho: trechoDe(m.ini, m.fim), nota: `Quantidade total (${m.valor} pmol). A concentração final é calculada quando o volume da reação for conhecido.`, confianca: "conferir" });
          (c as Cenario & { _pmol?: number })._pmol = m.valor;
          break;
        case "enzima":
          add("reacao.polimeraseU", m.valor, m);
          break;
        case "massa":
          add("reacao.moldeNg", +m.valor.toPrecision(6), m, m.nota);
          break;
        case "volume":
          if (k.campo === "volume") add("reacao.volumeUl", m.valor, m, m.nota);
          else avisos.push(`“${m.original}” é um volume pipetado de reagente; a concentração final depende do estoque e não foi calculada.`);
          break;
        case "tamanho":
          if (k.campo === "amplicon") add("alvo.ampliconPb", Math.round(m.valor), m, m.nota);
          break;
        case "pct":
          add("gel.agarosePct", m.valor, m);
          break;
        case "volts":
          add("gel.voltsTotal", m.valor, m);
          break;
        case "vcm":
          add("gel.vPorCm", m.valor, m);
          break;
      }
    }
  }

  // pmol de primer → µM, somente se o volume foi informado (cálculo explícito).
  const pmol = (c as Cenario & { _pmol?: number })._pmol;
  delete (c as Cenario & { _pmol?: number })._pmol;
  if (pmol !== undefined && c.reacao.primerUM === null && c.reacao.volumeUl) {
    const uM = +(pmol / c.reacao.volumeUl).toPrecision(3);
    c = setCampo(c, "reacao.primerUM", uM);
    const ex = extracoes.find((x) => x.campo === "reacao.primerUM" && x.valor === null);
    if (ex) Object.assign(ex, { valor: uM, nota: `${pmol} pmol em ${c.reacao.volumeUl} µL = ${uM} µM (pmol ÷ µL)` });
  }

  // Polimerase
  if (/\btaq\b/.test(norm)) c.polimerase = "taq";
  else if (/\bpfu\b/.test(norm)) c.polimerase = "pfu";
  else if (/phusion|\bq5\b|\bkod\b|alta fidelidade|hot ?start/.test(norm)) c.polimerase = "outra";

  // Controles e marcador (com negação explícita)
  const negar = (alvo: string) => new RegExp(`(?:sem|nao (?:vou |vamos )?(?:usar|incluir|fazer|colocar)(?: o| um)?) ${alvo}`).test(norm);
  if (negar("controle negativo")) c.controles.negativo = false;
  else if (/controle negativo|\bntc\b|controle sem molde|reacao sem molde|branco da reacao/.test(norm)) c.controles.negativo = true;
  if (negar("controle positivo")) c.controles.positivo = false;
  else if (/controle positivo/.test(norm)) c.controles.positivo = true;
  if (negar("marcador")) c.gel.marcador = false;
  else if (/marcador|ladder|padrao de peso/.test(norm)) c.gel.marcador = true;

  // Amostras
  const am = /(\d+)\s+amostras/.exec(norm);
  if (am) c.reacao.amostras = Math.min(96, Number(am[1]));

  // Gene/alvo (preserva a grafia original)
  const gm = /\bgene\s+(?:da |do |de )?([a-z0-9-]{2,20})/i.exec(norm);
  if (gm) c.alvo.gene = texto.slice(gm.index + gm[0].length - gm[1].length, gm.index + gm[0].length);

  // Objetivo e resultado esperado: frases inteiras, como escritas.
  const fs = frases(texto);
  c.objetivo = fs.find((f) => /quero|objetivo|pretendo|gostaria|preciso|para (?:detectar|amplificar|verificar|confirmar|identificar)/.test(normalizar(f)))?.slice(0, 500) ?? null;
  c.esperado = fs.find((f) => /espero|esperado|espera-se|deve aparecer|devo ver|devemos ver|deveria ver/.test(normalizar(f)))?.slice(0, 500) ?? null;

  // Roteiro para técnicas sem módulo: as frases descritas, na ordem.
  if (c.tecnica !== "pcr") c.roteiro = fs.slice(0, 40).map((f) => f.slice(0, 300));

  return { cenario: c, extracoes, sugestoes, avisos };
}
