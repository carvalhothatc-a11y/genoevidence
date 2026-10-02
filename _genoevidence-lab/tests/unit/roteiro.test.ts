import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { interpretarRoteiro, reconstruirPasso, POSSIBILIDADES } from "@/lib/visual/roteiro";
import { Cena } from "@/components/visual/Cena";

const acoes = (t: string) => interpretarRoteiro(t).map((p) => p.acao);

describe("roteiro visual a partir da descrição", () => {
  it("exemplo da responsável: primer → DNA → plasmídeo → bactéria", () => {
    const passos = interpretarRoteiro("Tirei o primer de um lado, acrescentei no DNA, foi no plasmídeo, e daí vou inserir no DNA da bactéria.");
    expect(passos.map((p) => p.acao)).toEqual(["pipetar", "anelar", "inserir_vetor", "transformar"]);
    const t = passos[3];
    expect(t.integracao).toBe(true);
    expect(t.origem).toBe("plasmideo");
    expect(t.atencao.map((a) => a.texto).join(" ")).toMatch(/cromossomo/);
    expect(t.atencao.map((a) => a.texto).join(" ")).toMatch(/antibiótico/);
    expect(passos[2].atencao.map((a) => a.texto).join(" ")).toMatch(/como o inserto entra/);
  });

  it("clonagem completa com rótulos do texto", () => {
    const passos = interpretarRoteiro("Vou amplificar o gene GFP por PCR, cortar com EcoRI e BamHI, ligar no vetor pUC19 com T4 DNA ligase, transformar em E. coli DH5α e plaquear em ampicilina.");
    expect(passos.map((p) => p.acao)).toEqual(["amplificar", "cortar", "inserir_vetor", "transformar", "cultivar"]);
    expect(passos[0].rotulos.gene).toBe("GFP");
    expect(passos[1].rotulos.enzima).toBe("EcoRI");
    expect(passos[2].origem).toBe("produto_pcr");
    expect(passos[3].rotulos.organismo).toBe("E. coli");
    expect(passos[4].rotulos.antibiotico).toBe("ampicilina");
    // há antibiótico no texto: sem o alerta de seleção
    expect(passos[3].atencao.some((a) => /antibiótico/.test(a.texto))).toBe(false);
  });

  it("extração, quantificação e gel", () => {
    expect(acoes("Extraí o DNA das células, quantifiquei no nanodrop e corri um gel de agarose.")).toEqual(["extrair", "quantificar", "eletroforese"]);
  });

  it("sempre gera algo, mesmo sem ação reconhecida, e marca para conferir", () => {
    const vago = interpretarRoteiro("Hoje vou trabalhar com aquelas amostras do freezer.");
    expect(vago.length).toBe(1);
    expect(vago[0].acao).toBe("generica");
    expect(vago[0].atencao[0].texto).toMatch(/Reescreva/);
    const corrigido = reconstruirPasso(vago[0], "extrair");
    expect(corrigido.acao).toBe("extrair");
    expect(corrigido.atencao.some((a) => /Reescreva/.test(a.texto))).toBe(false);
  });

  it("toda ação desenha uma cena em SVG puro (exportável), sem números de resultado", () => {
    const passos = interpretarRoteiro(
      "Vou amplificar o gene GFP, cortar com EcoRI, ligar no vetor, transformar em E. coli, plaquear em ampicilina, selecionar colônias, expressar a proteína, extrair o DNA, purificar, correr o gel, centrifugar, incubar a 37 °C, sequenciar, usar CRISPR, fazer qPCR, quantificar no nanodrop, transcrever o gene, traduzir o RNA.",
    );
    expect(passos.length).toBeGreaterThanOrEqual(15);
    for (const p of passos) {
      const svg = renderToStaticMarkup(createElement("svg", null, createElement(Cena, { passo: p, t: 1 })));
      expect(svg.length).toBeGreaterThan(200);
      expect(svg).not.toMatch(/<div|<span/);
      expect(svg).not.toMatch(/\d+\s?%/);
    }
  });

  it("desfechos com fonte citam referência; os demais são marcados como gerais", () => {
    for (const lista of Object.values(POSSIBILIDADES)) for (const x of lista!) expect(x.base === "referencia" ? x.refs.length > 0 : x.refs.length === 0).toBe(true);
  });
});
