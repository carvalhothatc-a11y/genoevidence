/**
 * Formatos de saída: FASTA, CSV e JSON. Texto puro, gerado no navegador.
 */

export function paraFasta(registros: { nome: string; descricao?: string; seq: string }[], largura = 60): string {
  return registros
    .map((r) => {
      const cab = `>${r.nome.replace(/\s+/g, "_") || "sequencia"}${r.descricao ? ` ${r.descricao.replace(/[\r\n]+/g, " ")}` : ""}`;
      const linhas: string[] = [];
      for (let k = 0; k < r.seq.length; k += largura) linhas.push(r.seq.slice(k, k + largura));
      return [cab, ...linhas].join("\n");
    })
    .join("\n")
    .concat("\n");
}

type Celula = string | number | boolean | null | undefined;

/**
 * CSV (RFC 4180, separado por vírgula). Texto que começa com =, +, - ou @ e não é número ganha um
 * apóstrofo na frente: sem isso, uma planilha pode executar o conteúdo como fórmula.
 */
export function paraCsv(colunas: string[], linhas: Record<string, Celula>[]): string {
  const celula = (v: Celula) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
    let s = String(v);
    if (s.length > 1 && /^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [colunas.map(celula).join(","), ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(","))].join("\r\n") + "\r\n";
}

export function paraJson(dados: unknown): string {
  return JSON.stringify(dados, null, 2) + "\n";
}

/** Nome de arquivo seguro a partir de um texto livre. */
export function nomeDeArquivo(base: string, extensao: string): string {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${limpo || "genolab"}.${extensao}`;
}
