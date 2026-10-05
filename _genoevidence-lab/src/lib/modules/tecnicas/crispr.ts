import { AUTORIA, M, R, X, ref, type TecnicaConteudo } from "./tipos";

const JIN = ref("jinek2012", "Resumo");
const RAN = (l: string) => ref("ran2013", l);

/**
 * Módulo CONCEITUAL de CRISPR-Cas9: o que a enzima faz, como a célula responde ao corte, por que o
 * resultado varia de célula para célula e como uma frequência observada é relatada com honestidade.
 * Não é um protocolo de bancada: não traz reagentes, condições nem passos de execução.
 */
export const CRISPR: TecnicaConteudo = {
  id: "crispr",
  titulo: "CRISPR-Cas9: como funciona e como se mede",
  tecnica: "Edição genômica guiada por RNA — mecanismo, vias de reparo e leitura honesta de uma frequência observada",
  versao: "0.1.0",
  status: "parcial",
  resumo:
    "Módulo conceitual: o que a Cas9 faz no DNA, as duas maneiras de a célula reparar o corte, por que o resultado varia entre células e como relatar uma frequência observada sem transformá-la em promessa.",
  fontes: [JIN, RAN("")],
  etapas: [
    {
      id: "mecanismo",
      titulo: "O que a Cas9 faz",
      resumo: "Uma enzima que corta DNA no lugar indicado por um RNA.",
      cena: {
        acao: "editar_crispr",
        entidades: ["cas9", "dna"],
        legenda: "Ilustração do reconhecimento e do corte. Formas, escalas e tempos não são reais, e a cena não representa um alvo específico.",
      },
      acontece: [
        R("A Cas9 é uma enzima guiada por RNA: o RNA guia pareia com o DNA e a enzima corta as duas fitas no sítio correspondente. Um domínio (HNH) corta a fita complementar ao guia e o outro (semelhante a RuvC) corta a fita oposta.", [JIN]),
        R("O crRNA e o tracrRNA do sistema natural podem ser fundidos num RNA guia único, que também dirige o corte específico pela Cas9 — é essa versão simplificada que se usa em laboratório.", [JIN]),
      ],
      porque: [
        R("Trocar o alvo significa trocar a sequência do guia: é o pareamento entre o RNA e o DNA que define onde o corte acontece. Essa é a diferença em relação a nucleases anteriores, que exigiam construir novas proteínas para cada alvo.", [RAN("Introduction — Comparison with other genome editing technologies")]),
        R("Além do pareamento com o guia, o DNA precisa ter, logo ao lado do alvo, uma sequência curta de reconhecimento (chamada PAM), que varia conforme a versão da Cas9. Ela é exigida no DNA, mas não faz parte do guia.", [RAN("Introduction — Cas9")]),
      ],
      materiais: [
        { nome: "Cas9", papel: "A enzima que corta as duas fitas do DNA.", refs: [JIN] },
        { nome: "RNA guia", papel: "Define, por pareamento, onde o corte acontece.", refs: [JIN] },
      ],
      controles: [],
      observar: [
        R("Nem todo guia funciona: alguns não produzem edição por razões ainda desconhecidas, e por isso se desenha mais de um por região e se testa no tipo de célula em questão.", [RAN("Experimental design — Target selection for sgRNA")]),
        X("Se um guia específico vai funcionar, e quão bem, não é previsto por este módulo nem por nenhum cálculo aqui."),
      ],
      limitacoes: [
        "Módulo conceitual: não desenha guias, não avalia sequências e não traz procedimento de bancada.",
        "Para desenhar guias e avaliar risco fora do alvo, use uma ferramenta dedicada e a literatura da sua área.",
      ],
    },
    {
      id: "reparo",
      titulo: "Como a célula responde ao corte",
      resumo: "Duas vias de reparo, com resultados diferentes.",
      cena: {
        acao: "generica",
        entidades: ["dna", "celula"],
        legenda: "A cena mostra apenas os elementos envolvidos. O reparo não é animado, porque o resultado em cada célula não é previsível.",
      },
      acontece: [
        R("Depois do corte, a região passa por uma de duas vias principais de reparo. Sem um molde, a quebra é religada por uma via sujeita a erro, que costuma deixar pequenas inserções ou deleções no ponto do corte. Com um molde fornecido, o reparo pode copiar a informação do molde e produzir uma modificação definida.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
        R("Pequenas inserções ou deleções dentro de uma região codificante podem deslocar a fase de leitura e interromper a produção da proteína — é assim que se obtém um nocaute.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
      ],
      porque: [
        R("O reparo guiado por molde é menos frequente e muito mais variável que a religação sujeita a erro, acontece em geral só em células que estão se dividindo, e sua eficiência varia conforme o tipo de célula, a região do genoma e o molde usado.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
      ],
      materiais: [
        { nome: "Molde de reparo (quando se busca uma modificação definida)", papel: "Fornece a informação a ser copiada durante o reparo.", refs: [RAN("Introduction — Precise genome editing using engineered nucleases")] },
      ],
      controles: [],
      observar: [
        X("Qual via vai reparar cada célula, e com que resultado, não pode ser previsto: é por isso que a edição precisa ser medida depois, e não estimada antes."),
        R("Células diferentes da mesma população podem terminar com resultados diferentes; por isso, quando se quer uma população uniforme, parte-se de uma única célula e espera-se ela se multiplicar.", [RAN("Experimental design — Clonal isolation of cell lines")]),
      ],
      limitacoes: ["O módulo não simula o reparo nem estima a proporção entre as duas vias."],
      parametros: [
        {
          id: "objetivo",
          rotulo: "O que se busca",
          descricao: "O resultado pretendido muda o que é preciso fornecer e o que esperar.",
          padrao: "nocaute",
          opcoes: [
            {
              valor: "nocaute",
              rotulo: "Interromper o gene (nocaute)",
              consequencias: [
                R("Não exige molde: aproveita-se a religação sujeita a erro, que deixa pequenas inserções ou deleções capazes de deslocar a fase de leitura.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
              ],
            },
            {
              valor: "precisa",
              rotulo: "Fazer uma alteração definida",
              consequencias: [
                R("Exige fornecer um molde com a informação desejada, acontece em geral só em células em divisão e tem eficiência bem mais variável que o nocaute.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
                R("A referência também observa que a taxa cai bastante conforme a alteração fica mais distante do ponto do corte.", [RAN("Experimental design — Design of repair template")]),
              ],
            },
          ],
        },
      ],
    },
    {
      id: "especificidade",
      titulo: "Por que a especificidade é um problema em aberto",
      resumo: "O corte pode acontecer em lugares parecidos com o alvo.",
      cena: {
        acao: "generica",
        entidades: ["dna", "cas9"],
        legenda: "Ilustração genérica dos componentes. A cena não representa sítios fora do alvo nem a chance de eles serem cortados.",
      },
      acontece: [
        R("Além do alcance dos alvos possíveis, a outra limitação reconhecida do sistema é a possibilidade de alterações fora do alvo, em regiões parecidas com a sequência do guia.", [RAN("Introduction — Limitations of the Cas9 system")]),
        R("Uma estratégia descrita para aumentar a especificidade usa uma versão da enzima que corta só uma fita, combinada com dois guias vizinhos, de modo que a quebra completa só ocorra onde os dois reconhecem.", [RAN("Introduction — Cas9: an RNA-guided nuclease for genome editing")]),
      ],
      porque: [
        R("Ferramentas de desenho estimam sítios fora do alvo por semelhança de sequência, considerando a identidade, a posição e a distribuição das diferenças em relação ao guia — mas são previsões computacionais, que precisam ser verificadas experimentalmente.", [RAN("Experimental design — Target selection for sgRNA")]),
      ],
      materiais: [],
      controles: [
        R("A própria referência trata a análise fora do alvo como etapa experimental separada, não como algo resolvido no desenho.", [RAN("Experimental design — Functional testing")]),
      ],
      observar: [
        X("Este módulo não estima risco fora do alvo e não substitui uma ferramenta de desenho nem a verificação experimental."),
      ],
      limitacoes: ["Nenhuma predição de especificidade é feita aqui."],
    },
    {
      id: "medir",
      titulo: "Medir a edição e relatar com honestidade",
      resumo: "A frequência é observada numa amostra, não prevista.",
      cena: {
        acao: "sequenciar",
        entidades: ["dna"],
        legenda: "Sequência ilustrativa: não é a do seu material e não mostra edições reais.",
      },
      acontece: [
        R("Uma forma de medir é isolar versões individuais da região editada e ler cada uma; a eficiência é então o número de versões modificadas dividido pelo total de versões analisadas.", [RAN("Procedure — Assessment by Sanger sequencing")]),
        R("A referência recomenda analisar mais de 24 versões para que essa proporção seja uma aproximação razoável.", [RAN("Procedure — Assessment by Sanger sequencing")]),
      ],
      porque: [
        M("Uma proporção vinda de poucas observações carrega muita incerteza. A calculadora mostra o intervalo de confiança exato dessa proporção: ele diz quais valores são compatíveis com o que foi observado."),
        R("A própria recomendação de analisar mais de 24 versões existe porque, com menos, a estimativa fica frouxa demais.", [RAN("Procedure — Assessment by Sanger sequencing")]),
      ],
      materiais: [],
      controles: [
        R("A referência também descreve o uso de amostras não tratadas como comparação na análise.", [RAN("Experimental design — Functional testing")]),
      ],
      observar: [
        M("O intervalo descreve a incerteza da amostra analisada. Ele não diz qual será a frequência numa próxima tentativa, com outro guia, outra célula ou outra região."),
        X("Nenhum número aqui é uma previsão de sucesso: é a leitura do que já foi observado."),
      ],
      limitacoes: [
        "A calculadora não lê arquivos de sequenciamento: você informa quantas versões foram modificadas e quantas foram analisadas.",
        "O intervalo supõe que as versões analisadas são independentes entre si e representam a população.",
      ],
      calculadora: "frequencia_edicao",
    },
  ],
  modelos: [
    {
      id: "frequencia_edicao",
      name: "Frequência observada de edição, com intervalo exato",
      equation: "frequência = modificadas ÷ analisadas;  intervalo de 95% pelo método exato de Clopper–Pearson",
      parameters: [
        { id: "x", label: "Versões modificadas", range: "inteiro de 0 até o total", source: "usuario" },
        { id: "n", label: "Versões analisadas", range: "inteiro ≥ 1 (a referência recomenda mais de 24)", source: "usuario" },
        { id: "conf", label: "Confiança", range: "95% (fixo)", source: "fixo" },
      ],
      assumptions: [
        "As versões analisadas são independentes entre si.",
        "As versões analisadas representam a população de onde vieram.",
        "Cada versão é classificada sem erro como modificada ou não.",
      ],
      validity: "Descreve a amostra analisada. O intervalo é exato, isto é, nunca cobre menos do que a confiança declarada.",
      limitations: [
        "Com poucas observações o intervalo fica muito largo — é essa a informação útil, e não um número isolado.",
        "Não vale como previsão de uma nova tentativa, com outro guia, outra célula ou outra região.",
        "Não distingue tipos de modificação nem diferencia os alelos de uma mesma célula.",
      ],
      implementation: "src/lib/models/edicao.ts → frequenciaEdicao()",
      doesNotPredict: ["Frequência numa nova tentativa", "Se um guia vai funcionar", "Efeitos fora do alvo", "Sucesso do experimento"],
      refs: [RAN("Procedure — Assessment by Sanger sequencing")],
    },
  ],
  problemas: [
    {
      sintoma: "Nenhuma versão modificada entre as analisadas",
      causas: [
        R("Alguns guias não produzem edição por razões ainda desconhecidas; por isso se desenha mais de um por região e se testa no tipo de célula em questão.", [RAN("Experimental design — Target selection for sgRNA")]),
        M("Zero entre poucas versões não significa frequência zero: o intervalo exato mostra o quanto ainda é compatível com essa observação."),
      ],
    },
    {
      sintoma: "A alteração definida não aparece, mas há pequenas inserções e deleções",
      causas: [
        R("O reparo guiado por molde é menos frequente e mais variável, e em geral só ocorre em células em divisão.", [RAN("Introduction — Precise genome editing using engineered nucleases")]),
      ],
    },
    {
      sintoma: "Resultados diferentes entre células da mesma população",
      causas: [
        R("O reparo acontece célula a célula; para obter uma população uniforme parte-se de uma única célula e espera-se a multiplicação.", [RAN("Experimental design — Clonal isolation of cell lines")]),
      ],
    },
  ],
  limitacoes: [
    "Parcial e conceitual: explica o mecanismo, as vias de reparo e a leitura de uma frequência observada.",
    "Não é um protocolo: não traz reagentes, condições, quantidades nem passos de execução. Siga o protocolo validado do seu laboratório e a literatura da sua área.",
  ],
  naoFaz: [
    "Desenhar ou avaliar guias",
    "Estimar efeitos fora do alvo",
    "Prever se a edição vai funcionar",
    "Substituir protocolo de bancada ou supervisão",
  ],
  autoria: AUTORIA,
};
