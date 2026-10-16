import { describe, expect, it } from "vitest";
import { dividirEmTrechos, enderecoDoTrecho, MAXIMO, MAX_TRECHOS_POR_DOCUMENTO } from "@/lib/fontes/trechos";
import { equilibrarPorDocumento, indexar, procurar, termos } from "@/lib/fontes/busca";
import { conferirCitacao, conferirTodas } from "@/lib/fontes/verificar";

const doc = (arquivoId: string, arquivo: string, conteudo: string | string[]) => dividirEmTrechos({ arquivoId, arquivo, conteudo });

describe("dividir o documento em trechos", () => {
  it("guarda a página de cada trecho e nunca atravessa páginas", () => {
    const t = doc("f_1", "artigo.pdf", ["Primeira página falando de PCR.", "Segunda página falando de eletroforese."]);
    expect(t).toHaveLength(2);
    expect(t[0].pagina).toBe(1);
    expect(t[1].pagina).toBe(2);
    expect(t[0].texto).not.toMatch(/eletroforese/);
  });

  it("documento sem páginas (DOCX, TXT) não inventa número de página", () => {
    const t = doc("f_2", "notas.docx", "Um parágrafo qualquer com conteúdo suficiente para virar trecho.");
    expect(t[0].pagina).toBeNull();
    expect(enderecoDoTrecho(t[0])).toBe("notas.docx");
  });

  it("o endereço diz arquivo e página", () => {
    const t = doc("f_3", "artigo.pdf", ["Conteúdo da primeira página."]);
    expect(enderecoDoTrecho(t[0])).toBe("artigo.pdf, página 1");
  });

  it("junta parágrafos curtos em vez de criar trechos sem sentido", () => {
    const t = doc("f_4", "a.txt", "Curto.\n\nTambém curto.\n\nMais um curto.");
    expect(t).toHaveLength(1);
    expect(t[0].texto).toMatch(/Curto/);
    expect(t[0].texto).toMatch(/Mais um curto/);
  });

  it("parágrafo gigante é partido, e nenhum trecho passa do máximo", () => {
    const frase = "Esta é uma frase de tamanho razoável sobre a reação em cadeia da polimerase. ";
    const t = doc("f_5", "grande.txt", frase.repeat(80));
    expect(t.length).toBeGreaterThan(1);
    for (const x of t) expect(x.texto.length, x.texto.slice(0, 40)).toBeLessThanOrEqual(MAXIMO);
  });

  it("os identificadores são estáveis e em ordem", () => {
    const t = doc("f_6", "a.pdf", ["Página um com texto.", "Página dois com texto."]);
    expect(t.map((x) => x.id)).toEqual(["f_6:0", "f_6:1"]);
    expect(t.map((x) => x.ordem)).toEqual([0, 1]);
  });

  it("documento enorme é limitado, em vez de estourar", () => {
    const t = doc("f_7", "enorme.pdf", Array.from({ length: 3000 }, (_, i) => `Página ${i} com conteúdo suficiente para virar um trecho inteiro.`));
    expect(t.length).toBeLessThanOrEqual(MAX_TRECHOS_POR_DOCUMENTO);
  });

  it("documento vazio não vira trecho nenhum", () => {
    expect(doc("f_8", "vazio.txt", "")).toEqual([]);
    expect(doc("f_9", "so-espaco.txt", "   \n\n  \n ")).toEqual([]);
  });
});

describe("termos da busca", () => {
  it("tira acento, minúsculas e palavras vazias", () => {
    expect(termos("A proteína está na AMOSTRA")).toEqual(["proteina", "amostra"]);
  });

  it("preserva números e nomes como p53 e 58", () => {
    expect(termos("Detectei p53 a 58 °C")).toContain("p53");
    expect(termos("Detectei p53 a 58 °C")).toContain("58");
  });
});

describe("achar o trecho certo", () => {
  const trechos = [
    ...doc("a", "pcr.pdf", ["A temperatura de anelamento usada foi de 58 °C para os primers do gene TP53."]),
    ...doc("b", "western.pdf", ["A detecção da proteína p53 foi feita por western blot com anticorpo monoclonal."]),
    ...doc("c", "geral.pdf", ["Este trabalho discute métodos gerais de biologia molecular sem detalhar condições."]),
  ];
  const indice = indexar(trechos);

  it("traz o trecho que responde, não o genérico", () => {
    const r = procurar(indice, "qual foi a temperatura de anelamento?");
    expect(r[0].trecho.arquivo).toBe("pcr.pdf");
    expect(r[0].trecho.texto).toMatch(/58 °C/);
  });

  it("diz quais palavras bateram — dá para explicar a escolha", () => {
    const r = procurar(indice, "anelamento dos primers");
    expect(r[0].casaram).toContain("anelamento");
  });

  it("pergunta sem relação com os documentos devolve VAZIO, não o menos ruim", () => {
    expect(procurar(indice, "cotação do dólar e futebol")).toEqual([]);
  });

  it("sem documento nenhum, devolve vazio", () => {
    expect(procurar(indexar([]), "qualquer coisa")).toEqual([]);
  });

  it("não deixa um documento só tomar todas as vagas", () => {
    const repetido = Array.from({ length: 10 }, (_, i) => doc("x", "repetido.pdf", [`A proteína p53 aparece de novo, menção ${i}, com texto suficiente aqui.`])[0]).map((t, i) => ({
      ...t,
      id: `x:${i}`,
      ordem: i,
    }));
    const comOutro = [...repetido, ...doc("y", "outro.pdf", ["A proteína p53 também é discutida neste outro artigo, com contexto próprio."])];
    const r = equilibrarPorDocumento(procurar(indexar(comOutro), "proteína p53", 20), 3);
    expect(r.filter((a) => a.trecho.arquivoId === "x")).toHaveLength(3);
    expect(r.some((a) => a.trecho.arquivoId === "y")).toBe(true);
  });
});

describe("conferir a citação antes de mostrar", () => {
  const trechos = doc("a", "artigo.pdf", ["A temperatura de anelamento foi de 58 °C, embora resultados variem entre lotes de primers."]);
  const id = trechos[0].id;

  it("citação literal passa", () => {
    const r = conferirCitacao(trechos, id, "A temperatura de anelamento foi de 58 °C");
    expect(r.ok).toBe(true);
  });

  it("diferença de acento, maiúscula e aspas não reprova — é a mesma frase", () => {
    expect(conferirCitacao(trechos, id, "a TEMPERATURA de anelamento foi de 58 °C").ok).toBe(true);
  });

  it("palavra trocada REPROVA", () => {
    const r = conferirCitacao(trechos, id, "A temperatura de anelamento foi de 60 °C");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe("nao_encontrada");
  });

  it("ressalva removida REPROVA — é o erro mais perigoso", () => {
    // o documento diz "embora resultados variem"; a citação some com a ressalva e emenda outra coisa
    const r = conferirCitacao(trechos, id, "A temperatura de anelamento foi de 58 °C e os resultados são reprodutíveis");
    expect(r.ok).toBe(false);
  });

  it("frases costuradas de partes diferentes REPROVAM", () => {
    const dois = doc("b", "outro.pdf", ["Primeira ideia completa sobre o método usado aqui.\n\nSegunda ideia completa sobre outro assunto distinto."]);
    const r = conferirCitacao(dois, dois[0].id, "Primeira ideia completa Segunda ideia completa");
    expect(r.ok).toBe(false);
  });

  it("trecho que não existe REPROVA", () => {
    const r = conferirCitacao(trechos, "inventado:99", "A temperatura de anelamento foi de 58 °C");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe("trecho_inexistente");
  });

  it("citação curta demais não prova nada", () => {
    const r = conferirCitacao(trechos, id, "a temperatura");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe("curta_demais");
  });

  it("separa o que passou do que não passou", () => {
    const r = conferirTodas(trechos, [
      { trechoId: id, citacao: "A temperatura de anelamento foi de 58 °C" },
      { trechoId: id, citacao: "A temperatura de anelamento foi de 95 °C" },
    ]);
    expect(r.validas).toHaveLength(1);
    expect(r.recusadas).toHaveLength(1);
  });
});
