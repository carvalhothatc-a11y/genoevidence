import { describe, expect, it } from "vitest";
import { assuntoDoDia, corpoDoDia, htmlDoDia } from "@/lib/caderno/email";
import type { Registro } from "@/lib/caderno/tipos";

const base: Registro = {
  id: "r_abcdefgh1234",
  dia: "2026-10-09",
  texto: "Repeti a PCR do TP53.\n\nO controle negativo deu banda — provavelmente contaminação.",
  criadoEm: "2026-10-09T18:00:00.000Z",
  atualizadoEm: "2026-10-09T18:00:00.000Z",
  arquivos: [],
  versoes: [],
};

describe("o registro do dia virando e-mail", () => {
  it("o assunto diz o dia por extenso", () => {
    expect(assuntoDoDia(base)).toBe("Caderno de laboratório — sexta, 9 de outubro de 2026");
  });

  it("o corpo traz o texto INTEIRO, sem resumir nem reescrever", () => {
    const c = corpoDoDia(base);
    expect(c).toContain("Repeti a PCR do TP53.");
    expect(c).toContain("O controle negativo deu banda — provavelmente contaminação.");
    // as quebras de parágrafo do original são preservadas
    expect(c).toContain("Repeti a PCR do TP53.\n\nO controle negativo");
  });

  it("lista os arquivos mas diz que eles NÃO vão anexados", () => {
    const c = corpoDoDia({
      ...base,
      arquivos: [
        { id: "a_1", nome: "gel.png", mime: "image/png", tamanho: 10, sha256: "x", enviadoEm: "2026-10-09T18:00:00.000Z" },
        { id: "a_2", nome: "tabela.csv", mime: "text/csv", tamanho: 20, sha256: "y", legenda: "contagens", enviadoEm: "2026-10-09T18:00:00.000Z" },
      ],
    });
    expect(c).toContain("gel.png");
    expect(c).toContain("tabela.csv — contagens");
    expect(c).toMatch(/não vão anexados/);
  });

  it("sem arquivo, não fala de arquivo nenhum", () => {
    expect(corpoDoDia(base)).not.toMatch(/Arquivos do dia/);
  });

  it("avisa quando o registro foi editado, para o e-mail não parecer a versão única", () => {
    const c = corpoDoDia({ ...base, versoes: [{ dia: "2026-10-09", texto: "antes", substituidaEm: "2026-10-09T19:00:00.000Z" }] });
    expect(c).toMatch(/editado 1 vez/);
    const d = corpoDoDia({
      ...base,
      versoes: [
        { dia: "2026-10-09", texto: "a", substituidaEm: "2026-10-09T19:00:00.000Z" },
        { dia: "2026-10-09", texto: "b", substituidaEm: "2026-10-09T20:00:00.000Z" },
      ],
    });
    expect(d).toMatch(/editado 2 vezes/);
  });

  it("inclui o projeto quando houver", () => {
    expect(corpoDoDia(base, { projeto: "Expressão de TP53" })).toContain("Projeto: Expressão de TP53");
    expect(corpoDoDia(base)).not.toMatch(/Projeto:/);
  });

  it("diz que foi enviado a pedido da pessoa", () => {
    expect(corpoDoDia(base)).toMatch(/a pedido seu/);
  });

  it("o HTML escapa o que a pessoa escreveu — nada de injeção pelo caderno", () => {
    const h = htmlDoDia({ ...base, texto: 'Usei <script>alert("x")</script> e a & no meio' });
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
    expect(h).toContain("&amp;");
  });

  it("o HTML tem o mesmo conteúdo do texto", () => {
    const h = htmlDoDia(base);
    expect(h).toContain("Repeti a PCR do TP53.");
    expect(h).toMatch(/^<div /);
  });
});
