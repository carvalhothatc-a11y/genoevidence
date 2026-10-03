import { describe, expect, it } from "vitest";
import { interpretarDescricao } from "@/lib/ideia/parse";
import { avaliarCenario, ausentes, perguntasPendentes } from "@/lib/ideia/avaliar";
import { montarProcedimento } from "@/lib/ideia/procedimento";
import { compararCenarios } from "@/lib/ideia/comparar";
import { Cenario, setCampo } from "@/lib/ideia/schema";
import { clopperPearson, pct, preverResultado, qualidadeEvidencia, trechoSustentaNumeros, type FrequenciaPublicada, type ModeloPreditivo } from "@/lib/ideia/evidencia";

const COMPLETO =
  "Quero amplificar o gene GAPDH de cDNA de 6 amostras. Reação de 25 µL com MgCl2 1,5 mM, dNTPs 200 µM cada, primers 0,4 µM e 1,25 U de Taq. Desnaturação inicial a 95 °C por 3 min; 35 ciclos de desnaturação a 95 °C por 30 s, anelamento a 58 °C por 30 s e extensão a 72 °C por 45 s; extensão final de 5 min a 72 °C. Tm dos primers de 62 °C. Amplicon de 450 pb. Vou incluir controle negativo. Gel de agarose 1,5% com marcador. Espero ver uma banda de 450 pb.";
const ler = (t: string) => interpretarDescricao(t, { id: "c_teste1", via: "texto" });
const item = (c: Cenario, id: string) => avaliarCenario(c).itens.find((i) => i.id === id)!;

describe("interpretação da descrição", () => {
  it("extrai todos os parâmetros de uma descrição completa, com trecho de origem", () => {
    const { cenario: c, extracoes } = ler(COMPLETO);
    expect(c.tecnica).toBe("pcr");
    expect(c.alvo).toEqual({ gene: "GAPDH", ampliconPb: 450 });
    expect(c.polimerase).toBe("taq");
    expect(c.reacao).toMatchObject({ volumeUl: 25, mgcl2mM: 1.5, dntpsUM: 200, primerUM: 0.4, polimeraseU: 1.25, amostras: 6 });
    expect(c.programa).toEqual({
      desnatInicial: { tempC: 95, segundos: 180 },
      ciclos: 35,
      desnat: { tempC: 95, segundos: 30 },
      anel: { tempC: 58, segundos: 30 },
      ext: { tempC: 72, segundos: 45 },
      extFinal: { tempC: 72, segundos: 300 },
    });
    expect(c.primersTmC).toBe(62);
    expect(c.controles.negativo).toBe(true);
    expect(c.gel).toMatchObject({ agarosePct: 1.5, marcador: true });
    expect(c.esperado).toMatch(/banda de 450 pb/);
    for (const e of extracoes) expect(COMPLETO).toContain(e.trecho);
    expect(Cenario.safeParse(c).success).toBe(true);
  });

  it("normaliza unidades e sinaliza o que precisa ser conferido", () => {
    const r = ler("PCR com 30 ciclos de 94ºC/30 seg, 55C/30s, 72 graus/1 min. MgCl2 1,5 M e primer 200 nM. Amplicon de 1,2 kb.");
    expect(r.cenario.programa.desnat).toEqual({ tempC: 94, segundos: 30 });
    expect(r.cenario.programa.anel).toEqual({ tempC: 55, segundos: 30 });
    expect(r.cenario.programa.ext).toEqual({ tempC: 72, segundos: 60 });
    expect(r.extracoes.find((x) => x.campo === "programa.anel.tempC")!.confianca).toBe("conferir");
    expect(r.cenario.reacao.primerUM).toBeCloseTo(0.2);
    expect(r.cenario.alvo.ampliconPb).toBe(1200);
    // 1,5 M fica como escrito (1500 mM) e a correção só é SUGERIDA
    expect(r.cenario.reacao.mgcl2mM).toBe(1500);
    expect(r.sugestoes).toContainEqual(expect.objectContaining({ campo: "reacao.mgcl2mM", sugerido: 1.5 }));
  });

  it("não completa valores sem unidade e trata negações", () => {
    const r = ler("Vou fazer uma PCR para detectar o gene 16S, anelamento a 55, sem controle negativo.");
    expect(r.cenario.programa.anel.tempC).toBeNull();
    expect(r.sugestoes).toContainEqual(expect.objectContaining({ campo: "programa.anel.tempC", sugerido: 55 }));
    expect(r.cenario.controles.negativo).toBe(false);
  });

  it("converte °F, kb, milhar, pmol (com volume) e mantém o primeiro valor quando há conflito", () => {
    const r = ler("Desnaturação inicial a 203 °F por 2 min. Reação de 50 µL com 20 pmol de cada primer. Produto de 1.500 pb. Anelamento a 55 °C; anelamento a 60 °C.");
    expect(r.cenario.programa.desnatInicial.tempC).toBe(95);
    expect(r.cenario.alvo.ampliconPb).toBe(1500);
    expect(r.cenario.reacao.primerUM).toBeCloseTo(0.4);
    expect(r.cenario.programa.anel.tempC).toBe(55);
    expect(r.avisos.some((a) => /Dois valores/.test(a))).toBe(true);
  });

  it("técnicas sem módulo viram roteiro, sem cena de PCR", () => {
    const r = ler("Quero fazer qPCR com SYBR Green para o gene ACTB. Preparar a placa. Rodar 40 ciclos.");
    expect(r.cenario.tecnica).toBe("qpcr");
    expect(r.cenario.roteiro.length).toBe(3);
    expect(montarProcedimento(r.cenario)).toEqual([]);
    const av = avaliarCenario(r.cenario);
    expect(av.itens).toHaveLength(1);
    expect(av.itens[0].estado).toBe("fora_do_alcance");
  });
});

describe("informações ausentes e perguntas", () => {
  it("pergunta só o que muda a avaliação", () => {
    const { cenario } = ler("PCR do gene X com anelamento a 58 °C e extensão a 72 °C por 1 min.");
    const campos = perguntasPendentes(cenario).map((p) => p.campo);
    expect(campos).toContain("primersTmC");
    expect(campos).toContain("controles.negativo");
    expect(campos).toContain("alvo.ampliconPb");
    expect(campos.length).toBeLessThanOrEqual(5);
    expect(ausentes(cenario).find((a) => a.campo === "primersTmC")?.critico).toBe(true);
  });
});

describe("avaliação fundamentada", () => {
  const base = ler(COMPLETO).cenario;
  it("classifica o cenário completo sem probabilidade e com fontes", () => {
    const av = avaliarCenario(base);
    expect(item(base, "anelamento").estado).toBe("compativel");
    expect(item(base, "mg").estado).toBe("compativel");
    expect(item(base, "desnat_inicial").estado).toBe("compativel");
    // 450 pb com Taq: a regra da referência indica ~60 s; 45 s fica abaixo dela
    expect(item(base, "extensao").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "programa.ext.segundos", 60), "extensao").estado).toBe("compativel");
    expect(av.conjunto.aviso).toMatch(/não significa garantia/);
    for (const i of av.itens) {
      expect(i.condicao.length).toBeGreaterThan(0);
      expect(i.incerto.length).toBeGreaterThan(0);
      expect(JSON.stringify(i)).not.toMatch(/\d+\s?%\s*de (chance|sucesso)/i);
    }
  });
  it("identifica problemas a partir das regras da referência", () => {
    expect(item(setCampo(base, "reacao.mgcl2mM", 1500), "mg").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "programa.anel.tempC", 50), "anelamento").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "programa.anel.tempC", 64), "anelamento").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "programa.ciclos", 40), "ciclos").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "programa.desnatInicial.segundos", 600), "desnat_inicial").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "controles.negativo", false), "controle_negativo").estado).toBe("possivel_problema");
    expect(item(setCampo(base, "primersTmC", null), "anelamento").estado).toBe("insuficiente");
  });
});

describe("procedimento animado", () => {
  it("segue a ordem do protocolo e só calcula com dados completos", () => {
    const c = ler(COMPLETO).cenario;
    const e = montarProcedimento(c);
    expect(e.map((x) => x.id)).toEqual(["preparo", "master_mix", "distribuicao", "centrifugacao", "carregar", "desnat_inicial", "ciclagem", "ext_final", "eletroforese", "analise"]);
    expect(e[0].subpassos.map((s) => s.part)).toEqual(["agua", "tampao", "dntps", "mgcl2", "primer-f", "primer-r", "molde", "polimerase"]);
    expect(e[1].calculo?.valor).toMatch(/^8 /); // 6 amostras + controle negativo = 7 × 1,1 → 8
    expect(e.find((x) => x.id === "ciclagem")!.nivel).toBe("simulacao");
    expect(e.find((x) => x.id === "ciclagem")!.subpassos.map((s) => s.fase)).toEqual(["desnaturacao", "anelamento", "extensao"]);
    const incompleto = setCampo(c, "programa.extFinal.segundos", null);
    expect(montarProcedimento(incompleto).find((x) => x.id === "ciclagem")!.calculo).toBeUndefined();
  });
});

describe("comparação de cenários", () => {
  it("mostra alterações, etapas afetadas, consequências e diferenças calculadas", () => {
    const a = ler(COMPLETO).cenario;
    const b = setCampo(setCampo(a, "programa.anel.tempC", 50), "programa.ciclos", 40);
    const cmp = compararCenarios(a, b);
    expect(cmp.alterados.map((d) => d.campo).sort()).toEqual(["programa.anel.tempC", "programa.ciclos"]);
    expect(cmp.etapasAfetadas).toEqual(["ciclagem"]);
    const anel = cmp.consequencias.find((m) => m.id === "anelamento")!;
    expect([anel.antes?.estado, anel.depois?.estado]).toEqual(["compativel", "possivel_problema"]);
    expect(anel.comFonte).toBe(true);
    expect(cmp.calculadas.map((d) => d.titulo)).toContain("Duração do programa (sem rampas)");
    expect(cmp.desconhecidas.join(" ")).toMatch(/rendimento/);
  });
});

describe("previsões quantitativas rastreáveis", () => {
  it("intervalo exato de Clopper–Pearson confere com valores conhecidos", () => {
    const [a0, b0] = clopperPearson(0, 10);
    expect(a0).toBe(0);
    expect(b0).toBeCloseTo(0.3085, 3);
    const [a5, b5] = clopperPearson(5, 10);
    expect(a5).toBeCloseTo(0.1871, 3);
    expect(b5).toBeCloseTo(0.8129, 3);
    const [a10, b10] = clopperPearson(10, 10);
    expect(a10).toBeCloseTo(0.6915, 3);
    expect(b10).toBe(1);
    expect(() => clopperPearson(11, 10)).toThrow();
  });
  it("percentuais sem precisão desnecessária", () => {
    expect(pct(0.4567)).toBe("46%");
    expect(pct(0.004)).toBe("<1%");
    expect(pct(0.996)).toBe(">99%");
  });
  it("sem modelo validado, a previsão é suspensa; fora do domínio, também", () => {
    const c = ler(COMPLETO).cenario;
    expect(preverResultado("banda_unica_tamanho_esperado", c).status).toBe("suspensa");
    const fake: ModeloPreditivo = {
      id: "teste",
      versao: "0",
      resultadoId: "banda_unica_tamanho_esperado",
      metodo: "teste",
      pressupostos: [],
      dominio: (x) => ({ suportado: (x.programa.ciclos ?? 0) <= 30, motivo: "ciclos acima de 30" }),
      prever: () => ({ p: 0.5, intervalo: [0.4, 0.6] }),
      validacao: { estrategia: "-", nIndependente: 0, calibracao: "-" },
      referencias: [],
    };
    const r = preverResultado("banda_unica_tamanho_esperado", c, [fake]);
    expect(r.status).toBe("suspensa");
    expect(r.status === "suspensa" && r.motivo).toMatch(/fora das condições/);
  });
  it("confere o trecho e acusa amostra duplicada", () => {
    const c = ler(COMPLETO).cenario;
    const f: FrequenciaPublicada = {
      id: "fq_teste1",
      resultadoId: "banda_unica_tamanho_esperado",
      sucessos: 18,
      total: 24,
      unidadeContagem: "pares de primers",
      contexto: "exemplo de teste",
      condicoes: { polimerase: "taq", ampliconMinPb: 100, ampliconMaxPb: 300, ciclosMin: 30, ciclosMax: 35, tipoMolde: null },
      fonte: { referenciaId: null, citacao: "Fonte fictícia de teste", localizador: "Tabela 2", trecho: "18 of 24 primer pairs produced a single band" },
      grupoAmostral: "g1",
      origem: "pesquisador",
      conferidaPor: null,
      registradaEm: "2026-10-02T00:00:00Z",
    };
    expect(trechoSustentaNumeros(f)).toBe(true);
    expect(trechoSustentaNumeros({ ...f, fonte: { ...f.fonte, trecho: "most primer pairs worked" } })).toBe(false);
    const q = qualidadeEvidencia(f, c, [f, { ...f, id: "fq_teste2" }]);
    expect(q.alertas.join(" ")).toMatch(/mesmo grupo amostral/);
    expect(q.compatibilidade).toMatch(/diferente/); // amplicon 450 fora de 100–300
  });
});
