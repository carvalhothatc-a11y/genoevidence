import { describe, expect, it } from "vitest";
import { interpretarRoteiro } from "@/lib/visual/roteiro";
import { extrairQuantidades } from "@/lib/experimento/quantidades";
import { pareceLevantamento, interpretarExperimento } from "@/lib/experimento/interpretar";
import { correcoesVazias } from "@/lib/experimento/correcoes";
import { ACOES_BIBLIOTECA, OBJETO_DA_ENTIDADE, OBJETOS } from "@/lib/cena/biblioteca";
import type { EntradaExperimento } from "@/lib/experimento/materiais";

const acoes = (t: string) => interpretarRoteiro(t).map((p) => p.acao);

const PROTOCOLO = [
  "Pese exatamente 5 g de tiossulfato de sódio penta-hidratado.",
  "Dissolva esses 5 g diretamente em 100 mL do extrato filtrado, obtendo uma concentração aproximada de 0,2 M.",
  "Deixe a mistura sob agitação magnética suave à temperatura ambiente por 20 minutos.",
  "Mantendo a agitação constante, adicione a solução de HCl 10% gota a gota.",
  "Transfira a solução turva para tubos de centrífuga e centrifugue a 10.000 rpm por 10 minutos.",
  "Adicione água deionizada ao pellet, ressuspenda as partículas e centrifugue novamente.",
  "Leve o produto a uma estufa a vácuo a 60 °C por 5 horas.",
].join(" ");

describe("vocabulário de síntese: o protocolo vira as etapas certas", () => {
  it("reconhece a sequência pesar → dissolver → agitar → acidificar → centrifugar → ressuspender → secar", () => {
    const a = acoes(PROTOCOLO);
    for (const esperada of ["pesar", "dissolver", "agitar", "acidificar", "centrifugar", "ressuspender", "secar"] as const) {
      expect(a, `faltou ${esperada} em ${a.join(",")}`).toContain(esperada);
    }
  });

  it("mantém a ordem: pesar vem antes de dissolver, que vem antes de secar", () => {
    const a = acoes(PROTOCOLO);
    expect(a.indexOf("pesar")).toBeLessThan(a.indexOf("dissolver"));
    expect(a.indexOf("dissolver")).toBeLessThan(a.indexOf("secar"));
  });

  it("“turvação” e “precipitado” viram precipitação, não centrifugação", () => {
    expect(acoes("Continue até observar aumento da turbidez, indicando a formação de precipitado.")).toContain("precipitar");
    expect(acoes("Observe se há turvação ou precipitação imediata.")).toContain("precipitar");
  });

  it("lavagem e ressuspensão são etapas próprias", () => {
    const a = acoes("Lavagem com água: adicione água deionizada ao pellet, ressuspenda as partículas e repita esse processo 5 vezes.");
    expect(a).toContain("lavar");
    expect(a).toContain("ressuspender");
  });

  it("medida de pH é reconhecida", () => {
    expect(acoes("Antes de iniciar, meça o pH dos metabolitos.")).toContain("medir_ph");
  });
});

describe("palavras da química não viram biologia molecular", () => {
  it("“extrato” e “filtrado” como substantivos NÃO viram extração de DNA nem filtração", () => {
    const a = acoes("Dissolva o sal em 25 mL do seu filtrado ou hidrolato, dependendo da nanopartícula.");
    expect(a).not.toContain("extrair");
    expect(a).not.toContain("filtrar");
  });

  it("“extrato” não produz uma cena de células rompidas", () => {
    const passos = interpretarRoteiro("60 mM permitem observar se o extrato dissolve o sólido ou se a carga maior favorece sedimentação.");
    for (const p of passos) {
      expect(p.acao).not.toBe("extrair");
      expect(p.mostra).not.toMatch(/c[eé]lulas s[ãa]o rompidas|lise/i);
    }
  });

  it("a extração de verdade continua reconhecida", () => {
    expect(acoes("Extraia o DNA genômico das células com o kit de miniprep.")).toContain("extrair");
    expect(acoes("As células foram rompidas por lise química.")).toContain("extrair");
  });

  it("filtrar como ação continua reconhecido", () => {
    expect(acoes("Não se esqueça de filtrar a 0,2 µm antes da leitura.")).toContain("filtrar");
  });
});

describe("grandezas da síntese", () => {
  it("lê gramas, miligramas e molaridade", () => {
    const q = extrairQuantidades("Pese 5 g de tiossulfato e dissolva em 100 mL, obtendo 0,2 M.");
    const pares = q.map((x) => [x.grandeza, x.valor, x.unidade]);
    expect(pares).toContainEqual(["massa", 5, "g"]);
    expect(pares).toContainEqual(["volume", 100, "mL"]);
    expect(pares).toContainEqual(["concentracao", 0.2, "M"]);
  });

  it("lê a massa em miligramas das rotas de CaCl₂", () => {
    const q = extrairQuantidades("138,72 mg de CaCl₂ em 25 mL do filtrado");
    expect(q.map((x) => [x.grandeza, x.valor, x.unidade])).toContainEqual(["massa", 138.72, "mg"]);
  });

  it("nomeia os parâmetros pelo contexto da síntese", () => {
    const nomes = extrairQuantidades("Leve a uma estufa a vácuo a 60 °C por 5 horas.").map((x) => x.nome);
    expect(nomes.join(" | ")).toMatch(/secagem/i);
  });

  it("não confunde força g de centrifugação com gramas", () => {
    const q = extrairQuantidades("Centrifugue a 10.000 × g por 10 minutos.");
    expect(q.find((x) => x.grandeza === "rotacao")?.unidade).toBe("× g");
    expect(q.some((x) => x.grandeza === "massa")).toBe(false);
  });
});

describe("biblioteca da cena cobre as ações novas", () => {
  it("toda ação de síntese tem entrada na biblioteca", () => {
    for (const a of ["pesar", "dissolver", "agitar", "acidificar", "precipitar", "lavar", "ressuspender", "secar", "filtrar", "medir_ph"] as const) {
      expect(ACOES_BIBLIOTECA[a], a).toBeTruthy();
      expect(ACOES_BIBLIOTECA[a].id, a).toBe(a);
    }
  });

  it("toda entidade nova aponta para um objeto existente da biblioteca", () => {
    for (const e of ["sal_precursor", "extrato_vegetal", "acido", "solvente", "precipitado", "nanoparticula"] as const) {
      const obj = OBJETO_DA_ENTIDADE[e];
      expect(obj, e).toBeTruthy();
      expect(OBJETOS[obj], e).toBeTruthy();
    }
  });

  it("a explicação das nanopartículas não promete tamanho nem pureza", () => {
    expect(OBJETOS.nanoparticula.explicacao).toMatch(/caracteriza/i);
  });
});

describe("o laboratório avisa em vez de fingir", () => {
  const entrada = (texto: string, nome = "doc.docx"): EntradaExperimento => ({
    texto: "",
    via: "texto",
    etapasDe: "relatorio",
    materiais: [{ id: "m1", tipo: "relatorio", nome, formato: "docx", estado: "extraido", texto, paginas: 1, aviso: null, arquivoId: null }],
  });

  it("reconhece um levantamento de artigos e não o confunde com protocolo", () => {
    const levantamento = `Foram incluídos 12 artigos originais. Tamanho não informado no texto integral consultado (Tripathi et al., 2018).
      Concentração não informada; não estimada (Najafi et al., 2020). DLS: não informado (Khalifa et al., 2024).
      Média reportada: 23 nm (Ragab & Saad-Allah, 2020). Valor não informado (Dasauni et al., 2024).`;
    expect(pareceLevantamento(levantamento)).toBe(true);
    expect(pareceLevantamento(PROTOCOLO)).toBe(false);
  });

  it("o aviso de levantamento aparece entre as pendências do experimento", () => {
    const levantamento = `Tabela comparativa. Tamanho não informado (Tripathi et al., 2018). Concentração não informada (Najafi et al., 2020).
      Resultado não informado (Khalifa et al., 2024). Atividade não informada (Suryavanshi et al., 2017). Extrato acidificado com HCl.`;
    const exp = interpretarExperimento(entrada(levantamento, "tabela artigos.docx"), { id: "e1", versao: 1, correcoes: correcoesVazias(), agora: "2026-10-05T12:00:00.000Z" });
    expect(exp.ausentes.map((p) => p.texto).join(" ")).toMatch(/parece um levantamento de artigos/i);
  });

  it("um protocolo de verdade não recebe o aviso de levantamento", () => {
    const exp = interpretarExperimento(entrada(PROTOCOLO, "protocolo.docx"), { id: "e2", versao: 1, correcoes: correcoesVazias(), agora: "2026-10-05T12:00:00.000Z" });
    expect(exp.ausentes.map((p) => p.texto).join(" ")).not.toMatch(/parece um levantamento/i);
  });

  it("as etapas do protocolo entram no experimento com a origem no documento", () => {
    const exp = interpretarExperimento(entrada(PROTOCOLO, "protocolo.docx"), { id: "e3", versao: 1, correcoes: correcoesVazias(), agora: "2026-10-05T12:00:00.000Z" });
    expect(exp.acoes.map((a) => a.tipo)).toContain("pesar");
    expect(exp.acoes.every((a) => a.origens.every((o) => o.tipo === "relatorio"))).toBe(true);
  });
});
