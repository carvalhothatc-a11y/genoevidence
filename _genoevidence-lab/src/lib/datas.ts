/**
 * Datas exibidas sempre no mesmo fuso (servidor e navegador iguais, evitando divergência de
 * renderização). Padrão: horário de Brasília; configurável por NEXT_PUBLIC_FUSO_HORARIO.
 */
export const FUSO = process.env.NEXT_PUBLIC_FUSO_HORARIO || "America/Sao_Paulo";

export function dataCurta(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export function dataHora(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
}
