/**
 * Tokens de gráfico para o fundo escuro do GenoLab (todas as páginas usam a identidade escura).
 * Passos escuros da paleta de referência da skill dataviz, validados com scripts/validate_palette.js
 * --mode dark --surface "#0f182b": faixa de luminosidade, croma, separação para daltonismo
 * (pior ΔE 9,4) e contraste ≥ 3:1. Todo gráfico mantém tabela equivalente.
 */
export const VIZ = {
  surface: "#0f182b",
  grid: "rgba(167, 178, 200, 0.14)",
  axis: "#a7b2c8",
  ink: "#eef2f9",
  muted: "#a7b2c8",
  series1: "#3987e5",
  series2: "#d95926",
  series3: "#199e70",
} as const;
