/**
 * Tokens de gráfico (paleta de referência validada com scripts/validate_palette.js da skill dataviz:
 * slots 1–3 passam todos os pares em modo claro; o slot 3 (aqua) fica abaixo de 3:1 de contraste,
 * por isso todo gráfico tem tabela equivalente).
 */
export const VIZ = {
  surface: "#ffffff",
  grid: "#e6e8e3",
  axis: "#4a5650",
  ink: "#17201c",
  muted: "#4a5650",
  series1: "#2a78d6",
  series2: "#eb6834",
  series3: "#1baf7a",
} as const;
