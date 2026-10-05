import { describe, expect, it } from "vitest";
import { ddct, razaoCorrigida, formatarRazao, validarCt, validarEficiencia } from "@/lib/models/qpcr";
import { tpm, EXEMPLO_FICTICIO } from "@/lib/models/rnaseq";
import { volumeParaMassa } from "@/lib/models/proteina";
import { bandPosition, ILLUSTRATIVE_LADDER_BP } from "@/lib/models/pcr";
import { frequenciaEdicao, VERSOES_RECOMENDADAS } from "@/lib/models/edicao";
import { TECNICAS, obterTecnica } from "@/lib/modules/tecnicas";
import { passoDaEtapa } from "@/lib/modules/tecnicas/cena";
import { SOURCES } from "@/lib/sources/catalog";
import { TECHNIQUES } from "@/lib/modules/registry";
import { ACAO_TITULO } from "@/lib/visual/roteiro";

describe("qPCR: ΔCt, ΔΔCt e razão", () => {
  it("segue as definições: ΔCt é alvo menos referência e ΔΔCt é a diferença entre as amostras", () => {
    const r = ddct({ alvo: 22, referencia: 19 }, { alvo: 24, referencia: 20 });
    expect(r.dctAmostra).toBe(3);
    expect(r.dctReferencia).toBe(4);
    expect(r.ddct).toBe(-1);
    expect(r.mudanca).toBeCloseTo(2, 10);
  });

  it("a amostra comparada com ela mesma dá 1", () => {
    const p = { alvo: 21.3, referencia: 18.1 };
    expect(ddct(p, p).mudanca).toBeCloseTo(1, 10);
  });

  it("com eficiência de 100% nos dois genes, a razão corrigida coincide com 2^-ΔΔCt", () => {
    const a = { alvo: 22.4, referencia: 19.1 };
    const b = { alvo: 24.2, referencia: 19.6 };
    expect(razaoCorrigida(a, b, 1, 1)).toBeCloseTo(ddct(a, b).mudanca, 10);
  });

  it("com eficiências menores, a razão se afasta de 2^-ΔΔCt (a hipótese de 100% distorce)", () => {
    const a = { alvo: 22, referencia: 19 };
    const b = { alvo: 26, referencia: 19 };
    const dd = ddct(a, b).mudanca;
    const corr = razaoCorrigida(a, b, 0.8, 0.8);
    expect(corr).not.toBeCloseTo(dd, 2);
    expect(corr).toBeLessThan(dd);
  });

  it("recusa Ct e eficiência fora de faixa, em vez de devolver número silenciosamente", () => {
    expect(validarCt(80)).toMatch(/Ct fora/);
    expect(validarCt(22)).toBeNull();
    expect(validarEficiencia(3)).toMatch(/Eficiência fora/);
    expect(validarEficiencia(0.9)).toBeNull();
    expect(() => ddct({ alvo: 99, referencia: 19 }, { alvo: 22, referencia: 19 })).toThrow(RangeError);
    expect(() => razaoCorrigida({ alvo: 22, referencia: 19 }, { alvo: 22, referencia: 19 }, 5, 1)).toThrow(RangeError);
  });

  it("formata sem notação científica na faixa usual e com vírgula decimal", () => {
    expect(formatarRazao(2)).toBe("2");
    expect(formatarRazao(0.1234)).toBe("0,123");
  });
});

describe("RNA-seq: TPM", () => {
  it("soma 10⁶ dentro do conjunto informado", () => {
    const soma = tpm(EXEMPLO_FICTICIO).reduce((a, b) => a + b.tpm, 0);
    expect(soma).toBeCloseTo(1e6, 3);
  });

  it("corrige o comprimento: mesma contagem em gene 4× mais longo dá 1/4 do TPM", () => {
    const r = tpm([
      { id: "curto", leituras: 1000, comprimentoPb: 1000 },
      { id: "longo", leituras: 1000, comprimentoPb: 4000 },
    ]);
    expect(r[0].tpm / r[1].tpm).toBeCloseTo(4, 10);
  });

  it("não depende da profundidade: dobrar todas as contagens não muda o TPM", () => {
    const a = tpm(EXEMPLO_FICTICIO);
    const b = tpm(EXEMPLO_FICTICIO.map((g) => ({ ...g, leituras: g.leituras * 2 })));
    a.forEach((x, i) => expect(x.tpm).toBeCloseTo(b[i].tpm, 6));
  });

  it("gene sem leitura fica com TPM zero e valores inválidos são recusados", () => {
    expect(tpm(EXEMPLO_FICTICIO).find((g) => g.leituras === 0)?.tpm).toBe(0);
    expect(() => tpm([{ id: "x", leituras: 10, comprimentoPb: 0 }])).toThrow(RangeError);
    expect(() => tpm([{ id: "x", leituras: 0, comprimentoPb: 100 }])).toThrow(/zero/);
    expect(() => tpm([])).toThrow(RangeError);
  });
});

describe("Western: volume de extrato", () => {
  it("usa massa dividida por concentração e completa com água", () => {
    const r = volumeParaMassa(50, 5, 15, 5);
    expect(r.volumeExtratoUl).toBe(10);
    expect(r.aguaUl).toBe(0);
    expect(r.cabe).toBe(true);
  });

  it("avisa quando o extrato não cabe na canaleta", () => {
    const r = volumeParaMassa(50, 1, 15, 5);
    expect(r.volumeExtratoUl).toBe(50);
    expect(r.cabe).toBe(false);
    expect(r.aguaUl).toBeNull();
  });

  it("recusa massa ou concentração não positivas", () => {
    expect(() => volumeParaMassa(0, 2)).toThrow(RangeError);
    expect(() => volumeParaMassa(50, 0)).toThrow(RangeError);
  });
});

describe("Eletroforese: posição ilustrativa da banda", () => {
  it("fragmento maior fica mais perto do poço que um menor", () => {
    expect(bandPosition(2000)!).toBeLessThan(bandPosition(300)!);
  });

  it("fora da faixa do marcador não desenha posição", () => {
    const maior = Math.max(...ILLUSTRATIVE_LADDER_BP);
    expect(bandPosition(maior + 1)).toBeNull();
    expect(bandPosition(50)).toBeNull();
  });
});

describe("CRISPR: frequência observada de edição", () => {
  it("é a proporção simples das versões analisadas", () => {
    const r = frequenciaEdicao(15, 30);
    expect(r.proporcao).toBe(0.5);
    expect(r.poucasVersoes).toBe(false);
  });

  it("o intervalo exato contém a proporção observada e fica dentro de 0 e 1", () => {
    const r = frequenciaEdicao(7, 30);
    expect(r.ic95[0]).toBeLessThanOrEqual(r.proporcao);
    expect(r.ic95[1]).toBeGreaterThanOrEqual(r.proporcao);
    expect(r.ic95[0]).toBeGreaterThanOrEqual(0);
    expect(r.ic95[1]).toBeLessThanOrEqual(1);
  });

  it("menos observações dão intervalo mais largo, mesmo com a mesma proporção", () => {
    const poucas = frequenciaEdicao(2, 8);
    const muitas = frequenciaEdicao(20, 80);
    expect(poucas.proporcao).toBeCloseTo(muitas.proporcao, 10);
    const larg = (x: ReturnType<typeof frequenciaEdicao>) => x.ic95[1] - x.ic95[0];
    expect(larg(poucas)).toBeGreaterThan(larg(muitas));
  });

  it("zero modificadas não vira certeza de zero: o limite superior é maior que zero", () => {
    const r = frequenciaEdicao(0, 10);
    expect(r.proporcao).toBe(0);
    expect(r.ic95[0]).toBe(0);
    expect(r.ic95[1]).toBeGreaterThan(0);
  });

  it("avisa quando há menos versões que o recomendado pela referência", () => {
    expect(frequenciaEdicao(5, VERSOES_RECOMENDADAS).poucasVersoes).toBe(true);
    expect(frequenciaEdicao(5, VERSOES_RECOMENDADAS + 1).poucasVersoes).toBe(false);
  });

  it("recusa contagens impossíveis", () => {
    expect(() => frequenciaEdicao(5, 0)).toThrow(RangeError);
    expect(() => frequenciaEdicao(11, 10)).toThrow(RangeError);
    expect(() => frequenciaEdicao(-1, 10)).toThrow(RangeError);
    expect(() => frequenciaEdicao(1.5, 10)).toThrow(RangeError);
  });
});

describe("conteúdo dos módulos de técnica", () => {
  it("todo módulo tem etapas, fontes, limitações e autoria", () => {
    for (const t of TECNICAS) {
      expect(t.etapas.length, t.id).toBeGreaterThan(0);
      expect(t.fontes.length, t.id).toBeGreaterThan(0);
      expect(t.naoFaz.length, t.id).toBeGreaterThan(0);
      expect(t.autoria, t.id).toBeTruthy();
    }
  });

  it("toda citação aponta para uma fonte do catálogo", () => {
    const ids = new Set(Object.keys(SOURCES));
    for (const t of TECNICAS) {
      const refs = [
        ...t.fontes,
        ...t.modelos.flatMap((m) => m.refs ?? []),
        ...t.problemas.flatMap((p) => p.causas.flatMap((c) => c.refs)),
        ...t.etapas.flatMap((e) => [
          ...e.acontece.flatMap((c) => c.refs),
          ...e.porque.flatMap((c) => c.refs),
          ...e.observar.flatMap((c) => c.refs),
          ...e.controles.flatMap((c) => c.refs),
          ...e.materiais.flatMap((m) => m.refs),
          ...(e.parametros ?? []).flatMap((p) => p.opcoes.flatMap((o) => o.consequencias.flatMap((c) => c.refs))),
        ]),
      ];
      for (const r of refs) expect(ids.has(r.id), `${t.id}: fonte ${r.id}`).toBe(true);
    }
  });

  it("afirmação de referência sempre traz pelo menos uma fonte; sem fonte vira 'sem_fonte' com nota", () => {
    for (const t of TECNICAS) {
      for (const e of t.etapas) {
        const claims = [...e.acontece, ...e.porque, ...e.observar, ...e.controles];
        for (const c of claims) {
          if (c.basis === "referencia") expect(c.refs.length, `${t.id}/${e.id}`).toBeGreaterThan(0);
          if (c.basis === "sem_fonte") expect(c.note, `${t.id}/${e.id}`).toBeTruthy();
        }
      }
    }
  });

  it("o módulo de CRISPR é conceitual: não vira protocolo de bancada", () => {
    const t = obterTecnica("crispr")!;
    const textos = [
      ...t.limitacoes,
      ...t.naoFaz,
      ...t.etapas.flatMap((e) => [...e.acontece, ...e.porque, ...e.observar, ...e.controles].map((c) => c.text)),
    ].join(" ");
    expect(t.status).toBe("parcial");
    expect(textos).toMatch(/não é um protocolo|não traz reagentes/i);
    expect(t.naoFaz.join(" ")).toMatch(/Prever se a edição vai funcionar/);
  });

  it("nenhuma afirmação promete porcentagem de sucesso", () => {
    for (const t of TECNICAS) {
      const textos = t.etapas.flatMap((e) => [...e.acontece, ...e.porque, ...e.observar, ...e.controles].map((c) => c.text));
      for (const texto of textos) expect(texto, t.id).not.toMatch(/(chance|probabilidade|taxa) de (sucesso|funcionar)/i);
    }
  });

  it("todo modelo declara pressupostos, limites e o que não prevê", () => {
    for (const t of TECNICAS) {
      for (const m of t.modelos) {
        expect(m.assumptions.length, `${t.id}/${m.id}`).toBeGreaterThan(0);
        expect(m.limitations.length, `${t.id}/${m.id}`).toBeGreaterThan(0);
        expect(m.doesNotPredict.length, `${t.id}/${m.id}`).toBeGreaterThan(0);
        expect(m.implementation, `${t.id}/${m.id}`).toMatch(/^src\//);
      }
    }
  });

  it("toda calculadora citada por uma etapa tem cartão de modelo no mesmo módulo", () => {
    for (const t of TECNICAS) {
      for (const e of t.etapas) {
        if (!e.calculadora) continue;
        const temCartao = t.modelos.some((m) => m.id === e.calculadora || (e.calculadora === "ddct" && m.id === "razao_corrigida"));
        expect(temCartao, `${t.id}/${e.id}`).toBe(true);
      }
    }
  });

  it("a cena de cada etapa usa uma ação conhecida e tem legenda que avisa que é ilustração", () => {
    for (const t of TECNICAS) {
      t.etapas.forEach((e, i) => {
        expect(ACAO_TITULO[e.cena.acao], `${t.id}/${e.id}`).toBeTruthy();
        expect(e.cena.legenda.length, `${t.id}/${e.id}`).toBeGreaterThan(10);
        const p = passoDaEtapa(e, i + 1);
        expect(p.id).toBe(e.id);
        expect(p.mostra).toBe(e.cena.legenda);
        expect(p.refs).toEqual([]);
      });
    }
  });

  it("ids são únicos e a lista de técnicas concorda com o índice", () => {
    const ids = TECNICAS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(obterTecnica(id)?.id).toBe(id);
    expect(obterTecnica("inexistente")).toBeUndefined();
  });

  it("cada módulo aparece no registro de técnicas com o mesmo estado e um endereço válido", () => {
    for (const t of TECNICAS) {
      const entrada = TECHNIQUES.find((x) => x.id === t.id);
      expect(entrada, t.id).toBeTruthy();
      expect(entrada!.status, t.id).toBe(t.status);
      expect(entrada!.href, t.id).toBe(`/modulos/${t.id}`);
    }
  });

  it("técnicas sem módulo continuam marcadas como não implementadas", () => {
    const comModulo = new Set(TECNICAS.map((t) => t.id));
    for (const e of TECHNIQUES) {
      if (comModulo.has(e.id) || e.href?.startsWith("/modulos/pcr") || e.href === "/projetos") continue;
      expect(e.status, e.id).toBe("nao_implementado");
    }
  });
});
