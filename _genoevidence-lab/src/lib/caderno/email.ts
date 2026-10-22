import { diaPorExtenso, type Registro } from "./tipos";

/**
 * O registro do dia em texto, para e-mail e para download.
 *
 * O corpo é o que a pessoa escreveu, inteiro e sem reescrita. O GenoLab não resume nem "melhora" o
 * registro: um caderno de laboratório vale pelo que foi escrito na hora, e um resumo automático
 * apagaria justamente a hesitação e a ressalva que fazem o registro ter valor depois.
 */

export function assuntoDoDia(r: Registro): string {
  return `Caderno de laboratório — ${diaPorExtenso(r.dia)}`;
}

export function corpoDoDia(r: Registro, opcoes: { projeto?: string; enderecoDoLab?: string } = {}): string {
  const linhas: string[] = [diaPorExtenso(r.dia), ""];
  if (opcoes.projeto) linhas.push(`Projeto: ${opcoes.projeto}`, "");
  linhas.push(r.texto, "");

  if (r.arquivos.length) {
    linhas.push(`Arquivos do dia (${r.arquivos.length}), guardados no GenoLab:`);
    for (const a of r.arquivos) linhas.push(`  • ${a.nome}${a.legenda ? ` — ${a.legenda}` : ""}`);
    linhas.push("");
    // Os arquivos NÃO viajam no e-mail: ficam no servidor, onde o acesso é conferido.
    linhas.push("Os arquivos não vão anexados: eles ficam no seu caderno, no GenoLab.", "");
  }

  if (r.versoes.length) {
    linhas.push(`Este registro foi editado ${r.versoes.length === 1 ? "1 vez" : `${r.versoes.length} vezes`}; as versões anteriores estão guardadas no GenoLab.`, "");
  }

  linhas.push("—", `Enviado pelo GenoLab a pedido seu.${opcoes.enderecoDoLab ? ` ${opcoes.enderecoDoLab}` : ""}`);
  return linhas.join("\n");
}

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Versão em HTML, simples de propósito: texto legível em qualquer leitor de e-mail. */
export function htmlDoDia(r: Registro, opcoes: { projeto?: string; enderecoDoLab?: string } = {}): string {
  const corpo = escapar(corpoDoDia(r, opcoes))
    .split("\n")
    .map((l) => (l === "—" ? "<hr style=\"border:none;border-top:1px solid #d5dae5;margin:24px 0\">" : l ? `<p style="margin:0 0 10px">${l}</p>` : ""))
    .join("");
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#0f1730;max-width:620px">${corpo}</div>`;
}
