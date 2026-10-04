import { describe, expect, it } from "vitest";
import { extrairQuantidades } from "@/lib/experimento/quantidades";
import { diferencas, interpretarExperimento } from "@/lib/experimento/interpretar";
import { comporCena } from "@/lib/cena/compor";
import { correcoesVazias } from "@/lib/experimento/correcoes";
import type { EntradaExperimento, Material } from "@/lib/experimento/materiais";

const entrada = (texto: string, materiais: Material[] = [], etapasDe: EntradaExperimento["etapasDe"] = "descricao"): EntradaExperimento => ({ texto, via: "texto", materiais, etapasDe });
const AGORA = "2026-10-03T12:00:00.000Z";

describe("grandezas com unidade", () => {
  it("reconhece temperatura e tempo colados e converte para a unidade canônica", () => {
    const q = extrairQuantidades("anelamento 55C/30s e extensão de 2 min");
    expect(q.map((x) => [x.grandeza, x.valor, x.unidade])).toEqual([
      ["temperatura", 55, "°C"],
      ["tempo", 30, "s"],
      ["tempo", 2, "min"],
    ]);
    expect(q[0].nome).toBe("Temperatura de anelamento");
    expect(q[2].valorCanonico).toBe(120);
  });
  it("não confunde nomes com unidades e nomeia reagentes pelo contexto", () => {
    expect(extrairQuantidades("detectar o gene 16S")).toEqual([]);
    const q = extrairQuantidades("1,5 mM de MgCl2 e centrifugar a 12.000 x g");
    expect(q[0]).toMatchObject({ grandeza: "concentracao", valor: 1.5, nome: "Concentração de MgCl₂" });
    expect(q[1]).toMatchObject({ grandeza: "rotacao", valor: 12000, unidade: "× g" });
  });
});

describe("interpretação dos materiais", () => {
  it("ação isolada continua isolada (nenhum protocolo acrescentado)", () => {
    const e = interpretarExperimento(entrada("Estou pipetando o primer forward no master mix"), { id: "exp1", agora: AGORA });
    expect(e.acoes).toHaveLength(1);
    expect(e.acoes[0].tipo).toBe("pipetar");
    const objetos = e.acoes[0].participantes.map((x) => e.participantes.find((p) => p.id === x.participanteId)!.objeto);
    expect(objetos).toContain("primer");
    expect(objetos).toContain("micropipeta");
  });

  it("relaciona texto e relatório e registra conflito sem escolher sozinho", () => {
    const rel: Material = { id: "rel1", tipo: "relatorio", nome: "protocolo.pdf", formato: "pdf", estado: "extraido", texto: "Programa: anelamento a 60 °C por 30 s.", paginas: 1, aviso: null, arquivoId: null };
    const e = interpretarExperimento(entrada("Pipetei 2 µL do DNA molde no master mix. Depois coloquei no termociclador com anelamento a 58 °C por 30 s, 30 ciclos.", [rel]), { id: "exp2", agora: AGORA });
    expect(e.acoes.map((a) => a.tipo)).toEqual(["pipetar", "amplificar"]);
    const volume = e.parametros.find((p) => p.grandeza === "volume");
    expect(volume).toMatchObject({ valor: 2, unidade: "µL", acaoId: "a1" });
    const conflito = e.conflitos.find((c) => c.nome === "Temperatura de anelamento");
    expect(conflito?.valores.map((v) => v.valor)).toEqual([58, 60]);
    expect(conflito?.escolhido).toBeNull();
    expect(conflito?.valores[1].origem).toMatchObject({ tipo: "relatorio", materialId: "rel1" });
    // o tempo igual nas duas fontes não é conflito
    expect(e.conflitos.some((c) => c.nome === "Tempo de anelamento")).toBe(false);
    // a escolha do pesquisador é reaplicada ao reinterpretar
    const corr = { ...correcoesVazias(), conflitos: { [conflito!.chave]: 1 } };
    const e2 = interpretarExperimento(entrada("Pipetei 2 µL do DNA molde no master mix. Depois coloquei no termociclador com anelamento a 58 °C por 30 s, 30 ciclos.", [rel]), { id: "exp2", correcoes: corr, agora: AGORA });
    expect(e2.parametros.find((p) => p.nome === "Temperatura de anelamento")?.valor).toBe(60);
  });

  it("foto contribui com elementos confirmados; sugestões não confirmadas ficam de fora", () => {
    const img: Material = {
      id: "img1",
      tipo: "imagem",
      nome: "bancada.jpg",
      mime: "image/jpeg",
      bytes: 1000,
      legenda: "",
      analisadaEm: null,
      arquivoId: null,
      elementos: [
        { id: "e1", objeto: "placa_pocos", rotulo: "Placa de 96 poços", origem: "usuario", confirmado: true },
        { id: "e2", objeto: "centrifuga", rotulo: "Centrífuga", origem: "ia", confirmado: false },
      ],
    };
    const e = interpretarExperimento(entrada("Pipetei o primer na mistura", [img]), { id: "exp3", agora: AGORA });
    const recipiente = e.acoes[0].participantes.find((x) => x.papel === "recipiente");
    const p = e.participantes.find((x) => x.id === recipiente?.participanteId);
    expect(p).toMatchObject({ objeto: "placa_pocos", rotulo: "Placa de 96 poços" });
    expect(p?.origens[0]).toMatchObject({ tipo: "imagem", materialId: "img1" });
    expect(e.participantes.some((x) => x.objeto === "centrifuga")).toBe(false);
  });

  it("tabela preserva valores, grupos, réplicas e ausentes, sem inventar tempo", () => {
    const tab: Material = {
      id: "tab1",
      tipo: "tabela",
      nome: "ct.csv",
      aba: null,
      colunas: ["Amostra", "Grupo", "Réplica", "Ct"],
      linhas: [
        ["A1", "Controle", "1", "22,5"],
        ["A2", "Controle", "2", "NA"],
        ["B1", "Tratado", "1", "25.1"],
      ],
      papeis: ["identificador", "grupo", "replica", "valor"],
      unidade: null,
      totalLinhas: 3,
      avisos: [],
      arquivoId: null,
    };
    const e = interpretarExperimento(entrada("", [tab]), { id: "exp4", agora: AGORA });
    expect(e.dados).toHaveLength(1);
    const d = e.dados[0];
    expect(d.ausentes).toBe(1);
    expect(d.temTempo).toBe(false);
    expect(d.grupos).toEqual([
      { nome: "Controle", valores: [22.5, null], replicas: ["1", "2"] },
      { nome: "Tratado", valores: [25.1], replicas: ["1"] },
    ]);
    expect(e.fontes.find((f) => f.materialId === "tab1")?.estado).toBe("analisado");
  });

  it("sem descrição, as etapas vêm do relatório; ausências críticas só limitam a avaliação", () => {
    const rel: Material = { id: "rel2", tipo: "relatorio", nome: "r.docx", formato: "docx", estado: "extraido", texto: "Centrifugar a amostra. Correr o gel de agarose.", paginas: null, aviso: null, arquivoId: null };
    const e = interpretarExperimento(entrada("", [rel], "descricao"), { id: "exp5", agora: AGORA });
    expect(e.etapasDe).toBe("relatorio");
    expect(e.acoes.map((a) => a.tipo)).toEqual(["centrifugar", "eletroforese"]);
    const falta = e.ausentes.filter((n) => n.acaoId === "a1");
    expect(falta.every((n) => n.impacto === "avaliacao")).toBe(true);
    expect(e.fontes.find((f) => f.materialId === "rel2")?.estado).toBe("analisado");
  });

  it("relatório que não pôde ser lido aparece como indisponível", () => {
    const rel: Material = { id: "rel3", tipo: "relatorio", nome: "scan.pdf", formato: "pdf", estado: "sem_texto", texto: "", paginas: 3, aviso: "PDF sem camada de texto (imagem digitalizada).", arquivoId: null };
    const e = interpretarExperimento(entrada("Centrifuguei as amostras", [rel]), { id: "exp6", agora: AGORA });
    expect(e.fontes.find((f) => f.materialId === "rel3")).toMatchObject({ estado: "indisponivel", observacao: "PDF sem camada de texto (imagem digitalizada)." });
  });
});

describe("composição da cena e versões", () => {
  it("cada elemento mantém a origem; o equipamento padrão é marcado como inferido", () => {
    const e = interpretarExperimento(entrada("Coloquei os tubos no termociclador: 30 ciclos de 95 °C por 30 s"), { id: "exp7", agora: AGORA });
    const cena = comporCena(e);
    expect(cena.etapas[0].acao).toBe("amplificar");
    const termo = cena.etapas[0].elementos.find((x) => x.objeto === "termociclador");
    expect(termo?.inferido).toBe(false);
    expect(termo?.origens[0].tipo).toBe("texto");
    expect(cena.etapas[0].tempoExperimental).toContain("30 s");

    const e2 = interpretarExperimento(entrada("Amplifiquei por PCR"), { id: "exp8", agora: AGORA });
    const padrao = comporCena(e2).etapas[0].elementos.find((x) => x.objeto === "termociclador");
    expect(padrao).toMatchObject({ inferido: true });
    expect(padrao?.origens[0].tipo).toBe("biblioteca");
  });

  it("lista o que mudou entre versões", () => {
    const v1 = interpretarExperimento(entrada("Anelamento a 58 °C"), { id: "exp9", agora: AGORA });
    const v2 = interpretarExperimento(entrada("Anelamento a 60 °C"), { id: "exp9", versao: 2, agora: AGORA });
    expect(diferencas(v1, v2)).toContain("Temperatura de anelamento: 58 °C → 60 °C");
  });
});

describe("programa da PCR descrito em sequência", () => {
  it("fases logo após a amplificação viram parâmetros dela, sem nomes inventados nem conflitos internos", () => {
    const e = interpretarExperimento(entrada("Pipetei 2 µL do DNA molde no tubo com master mix. Depois coloquei no termociclador: 30 ciclos de 95 °C por 30 s, anelamento a 58 °C por 30 s e 72 °C por 45 s. Por fim, corri o gel de agarose 1,5%."), { id: "exp10", agora: AGORA });
    expect(e.acoes.map((a) => a.tipo)).toEqual(["pipetar", "amplificar", "eletroforese"]);
    const amp = e.parametros.filter((p) => p.acaoId === "a2");
    expect(amp.find((p) => p.valor === 58)?.nome).toBe("Temperatura de anelamento");
    expect(amp.find((p) => p.valor === 72)?.nome).toBe("Temperatura");
    expect(amp.find((p) => p.valor === 30 && p.grandeza === "ciclos")).toBeTruthy();
    expect(e.conflitos).toEqual([]);
    const pip = e.participantes.find((p) => p.objeto === "micropipeta");
    expect(pip?.inferido).toBe(false);
  });
});
