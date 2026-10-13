# Moléculas no procedimento

A cena 3D da área de trabalho é **ilustração**: ela mostra o que você fez, com objetos genéricos
(tubo, gel, cuba, béquer). Nunca foi — e continua não sendo — o desenho da molécula de verdade.

Faltava o outro lado: quando a pessoa escreve “amplifiquei o gene TP53”, o TP53 existe, tem
identificador e tem estrutura resolvida. Antes isso se perdia: a cena desenhava um DNA genérico e
pronto. Agora, abaixo da cena, aparece o painel **Moléculas citadas**, e os dois ficam visivelmente
separados — a legenda do painel diz *“a cena é ilustração; aqui vem o dado real”*.

## O que o painel faz

1. **Reconhece** os nomes citados no texto do experimento (`src/lib/cena/moleculas.ts`).
2. **Não busca nada sozinho.** A consulta às bases externas só acontece quando você clica no nome —
   é uma saída de dados do GenoLab, então é sempre uma ação sua.
3. **Mostra o dado real**, com fonte e identificador: UniProt, RCSB PDB, PubChem.

## Gene, proteína e composto não são a mesma coisa

É a regra central deste painel.

- **TP53** é um gene. **p53** é a proteína que ele codifica. São objetos diferentes e a estrutura é
  outra. O painel nunca troca um pelo outro em silêncio.
- Quando a frase decide (“o **gene** TP53”, “a **proteína** p53”), o painel usa o que está escrito.
- Quando a frase **não** decide (“analisei TP53 na amostra”), o painel **pergunta**: *“‘TP53’ pode
  ser o gene ou a proteína que ele codifica. São objetos diferentes e a estrutura muda. Qual você
  quer?”* — e espera a escolha.
- Se você pedir o gene, ele mostra a proteína correspondente **avisando a troca**: a sequência do
  gene não tem estrutura 3D resolvida; o que existe no banco de estruturas é a proteína.
- **Compostos** (reagentes) vão para o PubChem, com fórmula, massa e o desenho 2D.

## De onde vem cada coisa

| O que aparece | Fonte | Como chega |
|---|---|---|
| Proteína (nome, acesso, organismo, gene) | UniProt REST | servidor do GenoLab |
| Estruturas 3D de uma proteína | RCSB PDB (busca por acesso UniProt) | servidor do GenoLab |
| Arquivo da estrutura (mmCIF) | RCSB PDB | `/api/moleculas/estrutura` |
| Composto (CID, fórmula, massa, desenho 2D) | PubChem PUG REST | `/api/moleculas/imagem` |

**Seu navegador não fala com essas bases.** Tudo passa pelo servidor do GenoLab, por duas razões:
a política de segurança da página (CSP) não permite carregar imagem nem arquivo de outro endereço,
e assim o seu IP e o que você está lendo não vão para fora. O que sai do servidor é só o termo
(o nome do gene, da proteína ou do composto) — nunca o texto do experimento, seus arquivos ou
seus dados de conta.

## Estruturas: por que buscamos pelo acesso UniProt

Procurar “p53” por texto no RCSB traz estruturas que apenas **mencionam** p53 — numa conferência
real, a busca por texto devolveu CagA de *H. pylori* (4IRV) e mucina MUC1 (2ACM, 6BSB). Nenhuma
delas é p53.

Por isso a busca é feita pelo **acesso UniProt** da proteína
(`estruturasDaProteina()` em `src/lib/assistant/ferramentas/moleculas.ts`), com correspondência
exata, ordenada da melhor resolução para a pior. Só entram na lista estruturas que **contêm** aquela
proteína. Ainda assim, muitas são fragmentos ou complexos com outras moléculas: o título completo
aparece ao passar o mouse, e a legenda pede para ler.

## O visualizador 3D

Clicar num código do PDB abre o Mol\* dentro do painel, no quadro dele — não toma a tela.

A legenda diz o que a imagem é e o que ela não é:

> Estrutura experimental depositada por terceiros. Girar a molécula é só para olhar: não é movimento
> calculado nem dinâmica molecular.

Girar com o mouse muda o seu ponto de vista. Não é simulação, não é trajetória, não é o movimento da
molécula no tempo.

## Quando não dá

Nada é preenchido por aproximação.

- Serviço ocupado → *“O PubChem está recusando pedidos agora (muitas consultas).”* Isso é diferente
  de não existir, e a interface diz qual dos dois é.
- Código de estrutura inexistente (9ZZZ) → *“A estrutura 9ZZZ não existe no RCSB PDB.”* Nenhuma
  parecida é colocada no lugar.
- Proteína sem estrutura depositada → diz isso, e não mostra a de um parente.

## O que não é reconhecido como molécula

Siglas de técnica, tampão, equipamento e unidade não viram gene: PCR, DNA, RNA, TAE, TBS, SDS,
EDTA, UV, RPM, TEM, XRD, FTIR, TPM e outras estão numa lista de exclusão.

Fórmulas químicas também não: “(NH₄)₂SO₄” não pode virar os “genes” NH e SO. Antes de procurar
símbolos de gene, o texto passa por `semSubscritos()` (₂ → 2) e `semFormulas()`, que tira os
trechos de fórmula. A fórmula continua sendo reconhecida como **composto** — CaCl₂ vira cloreto de
cálcio, e vai para o PubChem.

## Verificado de verdade

`scripts/e2e-moleculas.mjs` (consulta bases públicas; sem chave e sem custo) — 18 conferências,
todas passando:

- o painel aparece junto da cena, e reconhece reagente, gene e proteína na mesma frase;
- sigla de técnica não vira molécula;
- PubChem ocupado → a interface diz a causa real, não “não encontrado”;
- gene TP53 → UniProt **P04637**, *Homo sapiens*, com o aviso de que a estrutura é da proteína;
- as 5 estruturas oferecidas são **todas** de p53 (9C5S, 3D06, 5MHC, 8UQR, 6GGC);
- Mol\* desenha a estrutura e **fica no quadro** (altura 278 px, não a tela toda);
- termo ambíguo pergunta antes de escolher, com as duas opções explícitas;
- 9ZZZ é recusado sem substituição;
- sem sessão, as rotas não respondem;
- sem violação de CSP e sem erro no console.

Unidade: `tests/unit/moleculas-cena.test.ts` (13 casos de reconhecimento, desambiguação e exclusão).

## Limites conhecidos

- O reconhecimento é por **vocabulário e contexto**, não por um modelo. Um símbolo de gene pouco
  comum pode não ser reconhecido; um nome em maiúsculas que não seja gene pode aparecer na lista —
  e aí basta não clicar. Nada é buscado sem clique.
- A tabela de compostos cobre reagentes comuns em português. Um reagente fora dela só é reconhecido
  se estiver escrito em inglês ou pela fórmula.
- A estrutura mostrada é a que **existe depositada**, da proteína inteira ou de um pedaço dela. Não
  é a sua amostra, não é a sua construção e não reflete mutações que você tenha introduzido.
