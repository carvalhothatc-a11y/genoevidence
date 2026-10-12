import { describe, expect, it } from "vitest";
import { FERRAMENTAS_APP, LIMITES_AGENTE } from "@/lib/assistant/agente";
import { precisaEsclarecer } from "@/lib/assistant/ferramentas/moleculas";
import { GENINHO_SYSTEM, GeninhoRequest } from "@/lib/assistant/geninho";

describe("contrato das ferramentas do Geninho", () => {
  it("toda ferramenta tem nome, descrição e esquema de entrada", () => {
    for (const f of FERRAMENTAS_APP) {
      expect(f.name, "nome").toMatch(/^[a-z_]+$/);
      expect(f.description.length, f.name).toBeGreaterThan(60);
      expect(f.input_schema.type, f.name).toBe("object");
      expect(Object.keys(f.input_schema.properties).length, f.name).toBeGreaterThan(0);
    }
  });

  it("as quatro ferramentas científicas estão declaradas", () => {
    const nomes = FERRAMENTAS_APP.map((f) => f.name);
    expect(nomes).toEqual(expect.arrayContaining(["buscar_artigos", "identificar_proteina", "buscar_estrutura", "identificar_composto"]));
  });

  it("a descrição proíbe inventar e proíbe trocar a molécula pedida", () => {
    const artigos = FERRAMENTAS_APP.find((f) => f.name === "buscar_artigos")!;
    expect(artigos.description).toMatch(/nunca invente/i);
    const estrutura = FERRAMENTAS_APP.find((f) => f.name === "buscar_estrutura")!;
    expect(estrutura.description).toMatch(/nunca troque/i);
  });

  it("os limites impedem ciclo sem fim", () => {
    expect(LIMITES_AGENTE.voltas).toBeGreaterThan(1);
    expect(LIMITES_AGENTE.voltas).toBeLessThanOrEqual(12);
    expect(LIMITES_AGENTE.tempoMs).toBeGreaterThan(10_000);
    expect(LIMITES_AGENTE.porFerramenta).toBeGreaterThan(0);
    expect(LIMITES_AGENTE.buscasWeb).toBeGreaterThan(0);
  });
});

describe("instruções do agente", () => {
  it("manda usar as ferramentas em vez de responder de memória", () => {
    expect(GENINHO_SYSTEM).toMatch(/Suas ferramentas/);
    expect(GENINHO_SYSTEM).toMatch(/Confira o retorno antes de afirmar/i);
  });

  it("separa encontrado de lido", () => {
    expect(GENINHO_SYSTEM).toMatch(/encontrei o artigo.*li o resumo.*li a página/is);
  });

  it("manda perguntar quando falta informação, em vez de escolher sozinho", () => {
    expect(GENINHO_SYSTEM).toMatch(/pergunte em vez de escolher sozinho/i);
  });

  it("distingue gene de proteína", () => {
    expect(GENINHO_SYSTEM).toMatch(/TP53 é o gene, p53 é a proteína/);
  });

  it("não promete mais que não tem acesso à internet", () => {
    expect(GENINHO_SYSTEM).not.toMatch(/nem à internet/);
  });
});

describe("pedido ao Geninho", () => {
  const base = { messages: [{ role: "user" as const, content: "oi" }] };

  it("aceita o sinalizador de busca na web", () => {
    expect(GeninhoRequest.parse({ ...base, web: true }).web).toBe(true);
    expect(GeninhoRequest.parse(base).web).toBeUndefined();
  });

  it("recusa conversa que não termina numa pergunta", () => {
    expect(() => GeninhoRequest.parse({ messages: [{ role: "assistant", content: "oi" }] })).toThrow();
  });

  it("recusa contexto gigante", () => {
    expect(() => GeninhoRequest.parse({ ...base, contexto: "x".repeat(6001) })).toThrow();
  });
});

describe("desambiguação de nomes moleculares", () => {
  it("símbolo de gene sozinho pede esclarecimento", () => {
    const a = precisaEsclarecer("TP53", "me mostre TP53");
    expect(a).not.toBeNull();
    expect(a!.opcoes.map((o) => o.tipo)).toEqual(["gene", "proteina"]);
  });

  it("contexto de gene ou de proteína resolve sozinho", () => {
    expect(precisaEsclarecer("TP53", "amplifiquei o gene TP53")).toBeNull();
    expect(precisaEsclarecer("TP53", "detectei a proteína por western blot")).toBeNull();
  });

  it("palavra comum não é tratada como símbolo de gene", () => {
    expect(precisaEsclarecer("proteina", "qualquer coisa")).toBeNull();
    expect(precisaEsclarecer("DNA extraído", "qualquer coisa")).toBeNull();
  });
});
