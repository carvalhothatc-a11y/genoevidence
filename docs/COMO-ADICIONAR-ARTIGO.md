# Como adicionar um novo artigo ao GenoEvidence

Cada artigo tem a sua própria página, montada a partir de um arquivo de dados (`artigo.json`).
Você não precisa mexer em código: basta copiar o modelo e preencher os textos.

## 1. Copie o modelo

No VS Code, na barra lateral, clique com o botão direito em `estudos/_modelo` → **Copiar**,
cole dentro de `estudos/` e renomeie a pasta com um nome curto, sem espaços nem acentos.
Exemplo: `estudos/veneno-cascavel/`.

A pasta tem:

```
estudos/veneno-cascavel/
  index.html      página (não precisa editar)
  artigo.json     todo o conteúdo do artigo  ← é aqui que você escreve
  imagens/        figuras do artigo
  imagens/mini/   versões pequenas das figuras (carregam mais rápido)
```

## 2. Preencha o `artigo.json`

| Campo | O que colocar |
|---|---|
| `titulo` | O título completo, igual ao da revista. |
| `titulo_curto` | Um título claro, em linguagem simples (aparece grande no topo). |
| `autores` | Nome e afiliação de cada autor. |
| `revista` | Nome da revista, volume, número, páginas, datas, ISSN, **DOI** e links. O botão **Ler na revista** usa o campo `url` (de preferência `https://doi.org/` + DOI). |
| `em_1_minuto` | Quatro cartões: o problema, o que fizeram, o que acharam, por que importa. |
| `numeros` | Números-chave do estudo, em destaque. |
| `secoes` | As partes da explicação (contexto, método, resultados, discussão…). |
| `glossario` | Termos técnicos explicados de forma simples. |
| `citacao` | Como citar (ABNT). |
| `referencias` | Estudos citados na explicação, com DOI. |

### Tipos de bloco dentro de cada seção

| `tipo` | Para que serve |
|---|---|
| `texto` | Parágrafos (`html` aceita `<p>`, `<strong>`, `<em>`). |
| `destaque` | Caixa amarela com uma frase importante. |
| `nota` | Observação em letra menor. |
| `lista` | Lista com marcadores (`titulo` + `itens`). |
| `cartoes` | Grade de cartões coloridos (`cor`: `arg`, `his`, `amber`, `ok`, `violet`, `teal`). |
| `passos` | Etapas numeradas (bom para o método). |
| `cadeia` | Sequência de eventos com setas (causa → efeito). |
| `figura` | Imagem grande, ampliável, com legenda e crédito. |
| `galeria` | Várias imagens lado a lado, ampliáveis. |
| `grafico` | Gráfico de barras interativo com abas (veja o exemplo em `estudos/micrurus-spixii/artigo.json`). |

Dica: no VS Code, dentro do `artigo.json`, digite `ge-` e escolha um bloco pronto
(`ge-texto`, `ge-figura`, `ge-passos`, `ge-cartoes`, `ge-destaque`).

## 3. Coloque as imagens

Salve as figuras em `imagens/` (de preferência em `.webp`) e uma cópia menor
(cerca de 720 px de largura) em `imagens/mini/` com o mesmo nome.
Sempre coloque o crédito da figura no campo `credito`.

## 4. Mostre o artigo na página inicial

Abra `data/estudos.json` e adicione um item no começo da lista `estudos`
(copie o item do `micrurus-spixii` e troque os dados). O campo `revista`
faz o nome da revista aparecer no cartão e em **Revistas em destaque**.

## 5. Veja como ficou e publique

1. No VS Code: **Terminal → Executar Tarefa… → Abrir o site no navegador (servidor local)**
   e abra `http://localhost:8000` (ou use a extensão **Live Preview**).
2. Quando estiver tudo certo: **Terminal → Executar Tarefa… → Publicar no site (GitHub)**.
   O site é atualizado em cerca de 1 minuto.

> As páginas precisam de um servidor local para funcionar no computador,
> porque leem os arquivos `.json`. Dar dois cliques no `index.html` não basta.
