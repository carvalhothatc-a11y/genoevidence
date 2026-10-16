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

## Os objetos da cena também têm molécula real

O painel tem duas partes. A de cima, **Moléculas citadas**, vem do que você escreveu. A de baixo,
**Também na cena**, vem dos objetos que a cena desenhou — inclusive os que a IA reconheceu numa
**foto** que você enviou (ficam marcados “da foto”).

A cena usa um vocabulário genérico: “DNA”, “polimerase”, “anticorpo”. Cada um tem uma molécula de
verdade por trás, e é isso que esta parte liga
(`src/lib/cena/referencias-moleculares.ts`).

### A regra: genérico não vira específico em silêncio

Quando a cena diz “DNA”, o que existe para mostrar é um **exemplo** de dupla-hélice resolvida por
cristalografia — não a sua sequência. A interface diz isso em destaque, antes de abrir a estrutura:

> **É um exemplo, não a sua molécula.** Exemplo de dupla-hélice de DNA resolvida por cristalografia.
> Não é a sequência do seu experimento — é a forma que o DNA assume.

O campo `exemplo` no código é o que obriga esse aviso a aparecer. Um teste de unidade garante que
toda referência marcada como exemplo traz a explicação junto.

### O que tem estrutura, e o que não tem

| Objeto da cena | O que aparece | Exemplo? |
|---|---|---|
| DNA | 1BNA — dodecâmero de B-DNA (Drew–Dickerson) | sim |
| RNA | 1EHZ — tRNA de fenilalanina (levedura) | sim |
| Polimerase | 1TAQ — Taq polimerase | sim |
| Ligase | 6DT1 — ligase do fago T4 com DNA | sim |
| Enzima de corte | 1ERI — EcoRI presa ao sítio que corta | sim |
| Cas9 | 4OO8 — Cas9 de *S. pyogenes* com RNA-guia | sim |
| Anticorpo | 1IGT — IgG inteira | sim |
| Ribossomo | 4V6X — ribossomo 80S humano (ME, 5,0 Å) | sim |
| **dNTPs** | dATP, dCTP, dGTP e dTTP, pelo CID do PubChem | **não** — são exatamente aqueles |

Todos os códigos foram conferidos nas bases em 15/10/2026, e um teste garante que nenhum deles é um
código inventado. Os compostos são buscados **pelo CID**, não pelo nome: assim o nome escrito no
código nunca decide qual molécula aparece.

E o que **não** tem estrutura diz por quê, em vez de mostrar algo parecido:

- **célula, bactéria** — organismo inteiro, feito de milhões de moléculas;
- **primer, produto de PCR, plasmídeo** — é a *sua* sequência; nenhum banco tem;
- **precipitado, nanopartícula, extrato, amostra** — não são moléculas definidas;
- **proteína, antibiótico, ácido, solvente, sal** — genéricos: a interface manda escrever o nome,
  que aí cai no painel de moléculas citadas, de cima.

Equipamento e recipiente nem entram no painel.

## Quando não dá

Nada é preenchido por aproximação.

- Serviço ocupado → *“O PubChem está recusando pedidos agora (muitas consultas).”* Isso é diferente
  de não existir, e a interface diz qual dos dois é.
- Código de estrutura inexistente (0ZZZ — o PDB nunca emite código começando por zero) → *“A estrutura 0ZZZ não existe no RCSB PDB.”* Nenhuma
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
- 0ZZZ é recusado sem substituição;
- sem sessão, as rotas não respondem;
- sem violação de CSP e sem erro no console.

`scripts/e2e-cena-moleculas.mjs` — 23 conferências sobre a parte nova:

- o painel aparece com os objetos da cena, e equipamento/recipiente ficam de fora;
- DNA abre **1BNA** com o aviso de exemplo em destaque;
- dNTPs **não** são marcados como exemplo, e os quatro aparecem com o CID certo;
- célula diz que não há estrutura, explica o motivo e **não abre nada parecido no lugar**;
- nenhuma consulta às bases acontece **sem clique**.

Unidade: `tests/unit/moleculas-cena.test.ts` (13 casos de reconhecimento, desambiguação e exclusão)
e `tests/unit/referencias-moleculares.test.ts` (10 casos: nenhum objeto cai no vazio, todo exemplo
avisa, nada específico ganha estrutura emprestada).

## Limites conhecidos

- O reconhecimento é por **vocabulário e contexto**, não por um modelo. Um símbolo de gene pouco
  comum pode não ser reconhecido; um nome em maiúsculas que não seja gene pode aparecer na lista —
  e aí basta não clicar. Nada é buscado sem clique.
- A tabela de compostos cobre reagentes comuns em português. Um reagente fora dela só é reconhecido
  se estiver escrito em inglês ou pela fórmula.
- A estrutura mostrada é a que **existe depositada**, da proteína inteira ou de um pedaço dela. Não
  é a sua amostra, não é a sua construção e não reflete mutações que você tenha introduzido.
