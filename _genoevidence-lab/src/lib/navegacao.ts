/**
 * Voltar para onde a pessoa estava. A última página do GenoLab fica no armazenamento local do
 * navegador (sem dados de pesquisa: só o caminho) e é apagada ao sair da conta.
 */
const CHAVE = "genolab:ultima-pagina";

/** Só caminhos internos; nunca as telas de acesso (evita voltar para o login). */
export function destinoSeguro(v: string | null | undefined): string | null {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  if (/^\/(entrar|cadastro|acesso)(\/|\?|$)/.test(v)) return null;
  return v.slice(0, 300);
}

export function lembrarPagina(caminho: string) {
  const d = destinoSeguro(caminho);
  if (!d) return;
  try {
    localStorage.setItem(CHAVE, d);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function ultimaPagina(): string | null {
  try {
    return destinoSeguro(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function esquecerPagina() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
