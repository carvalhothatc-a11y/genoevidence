# Geninho como agente científico

O Geninho deixou de ser só conversa. Ele agora **escolhe e usa ferramentas reais**, confere o que
elas devolvem e mostra o estado de cada passo na tela.

Este documento registra o que está pronto, o que foi verificado e o que ainda falta.

## Auditoria do que existia (2026-10-05)

A ausência de moléculas nos procedimentos **não era problema do texto do prompt**. A cadeia estava
cortada no segundo elo:

| Etapa | Antes |
|---|---|
| Identificar entidades na descrição | funcionava, em classes genéricas (DNA, proteína, plasmídeo) |
| **Resolver nomes e identificadores** | **não existia** |
| Buscar estruturas | só download por código PDB exato, digitado à mão, na aba Projetos |
| Preparar recursos visuais | não existia |
| Carregar no visualizador | Mol* só abria estrutura já anexada a um projeto |
| Inserir na cena | a cena usa a biblioteca fechada de formas esquemáticas |
| Exibir | nunca chegava |

Verificado na prática: a frase “Amplifiquei o gene TP53 e detectei a proteína p53 por Western blot”
produzia apenas os objetos genéricos `dna` e `proteina`. O nome TP53 virava etiqueta de texto.

## Ferramentas (contratos em `src/lib/assistant/ferramentas/`)

Todas são serviços públicos, sem chave, conferidos em 2026-10-05.

| Ferramenta | Serviço | O que devolve |
|---|---|---|
| `buscar_artigos` | PubMed E-utilities | título, revista, ano, PMID, DOI; resumo só quando pedido |
| `identificar_proteina` | UniProt | acesso, nome oficial, genes, organismo |
| `buscar_estrutura` | RCSB PDB | candidatas por texto, ou metadados de um código exato |
| `identificar_composto` | PubChem | CID, fórmula, massa, SMILES, desenho 2D, SDF 3D |
| `web_search`, `web_fetch` | Anthropic (servidor) | só quando a pessoa marca “pesquisar na internet” |

Regras embutidas nas funções, não só no prompt:

- sem resultado, devolvem `encontrado: false` **com o motivo** — nunca um palpite;
- **gene, proteína e composto são tipos diferentes** e não se substituem;
- busca de estrutura por texto devolve **candidatas** e não fixa cartão na tela: o cartão só aparece
  quando o agente escolhe um código e pede de novo com `pdb_id`. Assim a interface nunca mostra uma
  estrutura que a resposta vai descartar.

## O ciclo (`src/lib/assistant/agente.ts`)

compreender → escolher ferramentas → executar → **conferir os retornos** → apresentar.

Limites para o ciclo não se estender sem fim: 8 voltas, 120 s de parede, 4 usos por ferramenta e
5 buscas na web por pergunta. Ao bater um limite, o agente é avisado e encerra com o que tem,
dizendo que parou.

Cada passo emite um evento com o estado **real**: `iniciou`, `ok`, `vazio` ou `falhou`, com o
detalhe que veio da ferramenta (“nenhum artigo para …”, “9ZZZ não existe no RCSB”,
“url_not_accessible”). Nada é marcado como concluído sem o retorno.

## Interface

A conversa mostra, acima da resposta: a lista de passos com ícone e estado; os cartões de molécula
(proteína, estrutura ou composto) com identificador, origem e link; e “Fontes consultadas”, cada uma
marcada como **conteúdo lido**, **só o resumo foi lido** ou **referência localizada; conteúdo não
lido**.

A caixa “Pesquisar na internet nesta pergunta” fica desmarcada por padrão — sem ela o Geninho
consulta só PubMed, UniProt, RCSB PDB e PubChem, que não têm custo por busca.

## Imagem do composto servida pelo GenoLab

`/api/moleculas/imagem?cid=…` busca o PNG no PubChem **no servidor** e o serve daqui. Dois motivos:
a política de segurança de conteúdo só autoriza imagens do próprio servidor, e assim o navegador de
quem usa não precisa falar com o PubChem — o IP da pessoa não é exposto. Só o número do composto sai
daqui.

## Verificado de verdade

`scripts/e2e-geninho-agente.mjs` (consome API; com `--web`, consome buscas cobradas):

- gene citado → identifica a proteína no UniProt **antes** da estrutura (P04637, *Homo sapiens*);
- busca por texto lista candidatas **sem** fixar cartão; só p53 virou cartão (1TUP);
- composto → PubChem CID 24477, Na₂O₃S₂, com o desenho 2D;
- artigos → marcados como **encontrados**, não lidos, e a resposta diz isso;
- “Me mostre TP53” → **pergunta** se é o gene ou a proteína, e não abre estrutura antes;
- “PDB 9ZZZ” → diz que não existe e **recusa** mostrar outra no lugar;
- com `--web` → usa a busca, cada uma informa o resultado real, e o filtro interno não vira passo;
- sem sessão, não responde.

Unidade: `tests/unit/agente.test.ts` (contratos das ferramentas, limites e instruções).

## O que ainda falta

Pela ordem de prioridade combinada:

1. ~~Busca científica com fontes~~ — **pronto**.
2. Identificação de moléculas — **pronta**. Falta **ligar à cena do procedimento**: hoje o cartão
   aparece na conversa, não dentro da cena 3D da área de trabalho. O visualizador Mol* ainda exige
   importar a estrutura num projeto.
3. **Geração de imagens** — não configurada. A Anthropic não gera imagens; a escolha foi OpenAI
   (gpt-image) e falta a conta e a chave. Enquanto não houver, a Integrações deve declarar
   “não configurada” — nunca apresentar saída simulada como geração real.
4. Composição de processos animados com moléculas reais.
5. Memória por projeto e avaliações com casos revisados.
