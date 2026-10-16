# Perguntar às fontes

Seção **Perguntar às fontes**, dentro de cada projeto. Você envia PDFs, DOCX ou TXT, pergunta em
português, e a resposta cita o trecho — com o parágrafo à vista.

É a resposta do GenoLab ao que o NotebookLM e o SciSpace fazem, **sem mandar os seus documentos
para fora**: a busca acontece inteiramente neste servidor, e só os trechos relevantes vão para o
modelo.

## O princípio

**A resposta é um ponteiro para os trechos, não um substituto para lê-los.**

O risco destas ferramentas não é inventar um artigo inteiro: é citar algo que *quase* existe — uma
palavra trocada, uma ressalva removida, duas frases costuradas de partes diferentes. Quem lê não
percebe, porque a citação parece plausível.

Por isso nada aparece como citação sem ser conferido contra o arquivo.

## As três camadas

### 1. Dividir em trechos (`src/lib/fontes/trechos.ts`)

Cada trecho guarda **arquivo, página e posição**. O corte respeita parágrafo: cortar no meio de uma
frase produz citação que não se sustenta, porque o trecho mostrado não contém a ideia inteira.

Para citar página, a extração de PDF passou a manter as páginas separadas
(`extractText(pdf, { mergePages: false })`). DOCX e TXT não têm página, e o sistema **não inventa
uma** — o endereço fica só com o nome do arquivo.

Alvo de ~900 caracteres, teto de 1600, mínimo de 220 (parágrafo curto é juntado ao vizinho). Um
documento rende no máximo 1200 trechos.

### 2. Achar o trecho (`busca.ts`)

BM25 em português, rodando **dentro do servidor**.

Por que não vetores: embeddings exigiriam um serviço externo pago e mandariam o conteúdo dos
documentos para fora. Para dezenas de artigos, a busca por palavra basta — e tem uma vantagem que
importa aqui: **dá para explicar por que um trecho foi escolhido** (as palavras que bateram
aparecem na tela). Um vetor não dá.

Duas decisões:

- **Nada encontrado devolve vazio**, nunca o trecho menos ruim. Vazio significa "não está nos seus
  documentos", e é uma resposta legítima.
- **Um documento não toma todas as vagas** (`equilibrarPorDocumento`): sem isso, um artigo que
  repete o assunto domina a resposta e as outras fontes somem da vista.

### 3. Conferir a citação (`verificar.ts`)

A citação precisa aparecer **literalmente** no trecho indicado. Comparação por conteúdo (sem
acento, sem maiúscula, espaços colapsados), porque o modelo pode reescrever aspas sem mudar o que
foi dito. Qualquer troca de **palavra** reprova.

| Situação | Resultado |
|---|---|
| Citação literal | passa |
| Acento, maiúscula ou aspas diferentes | passa — é a mesma frase |
| Palavra trocada (58 → 60) | **reprova** |
| Ressalva removida | **reprova** — é o erro mais perigoso |
| Frases costuradas de partes diferentes | **reprova** |
| Trecho que não existe | **reprova** |
| Citação com menos de 25 caracteres | **reprova** — não prova nada |

O que reprova **vira aviso na tela, não vira fonte**.

## O que a tela mostra

- A resposta.
- **De onde veio — conferido no seu documento**: cada citação com ✔, o endereço
  (`artigo.pdf, página 2`), a frase, e "ver o parágrafo inteiro".
- **Citações recusadas**, quando houver, com o motivo.
- **Ver os N trechos consultados** — para ler além do que foi citado, com as palavras que bateram.
- Quando os documentos não respondem: um aviso de que **não se deve completar a lacuna** com o que
  está ali.

## Privacidade

Dividir e buscar acontecem **só neste servidor**. Para responder, os trechos recuperados (não os
arquivos inteiros) vão para a API do Claude. A página diz isso.

Os trechos ficam guardados por arquivo, com o SHA-256 do conteúdo na chave: se o arquivo for
substituído, o SHA muda e os trechos são refeitos. Não existe cache velho servindo trecho de
documento que já não está lá.

## Verificado de verdade

`scripts/e2e-fontes.mjs` — **consome API da Anthropic** (2 perguntas por execução). 14 conferências,
todas passando, pelo caminho real (envio pelo formulário do projeto):

- o PDF de 3 páginas vira trechos citáveis;
- o painel **percebe o arquivo recém-anexado sem recarregar a página**;
- a resposta traz o valor que está no documento **e preserva a ressalva**;
- cita a **página 2**, que é onde o dado está;
- a citação exibida existe **palavra por palavra** no PDF (conferido fora do app);
- pergunta fora dos documentos → diz que não respondem e **não apresenta citação**;
- sem sessão, as rotas não respondem; sem violação de CSP; sem erro no console.

Unidade: `tests/unit/fontes.test.ts` (23 casos) e `tests/unit/extracao-paginas.test.ts` (4 casos,
com um PDF de verdade montado no teste).

## Limites conhecidos

- **Tabela em markdown ou em PDF chunka mal.** Numa prova com texto real, o trecho melhor colocado
  às vezes era uma tabela, que bate as palavras mas lê mal como citação. Não penalizo tabela — em
  artigo científico ela costuma ser *a* resposta. Mitigação: vários trechos vão ao modelo e o
  parágrafo aparece na tela.
- **Busca por palavra não entende sinônimo.** Perguntar "temperatura de hibridização" não acha
  "anelamento". Escrever a palavra que está no artigo funciona melhor.
- **Tabelas (CSV, XLSX) e imagens não viram trecho citável** — a interface lista esses arquivos
  como "fora", com o motivo.
- **PDF digitalizado sem camada de texto** não rende trecho nenhum; a interface diz isso.
- Não há comparação entre artigos em tabela (o "extract data" do SciSpace). Fica para depois.
