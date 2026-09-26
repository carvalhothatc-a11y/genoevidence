# Como adicionar um novo artigo ao GenoEvidence

Cada artigo tem a sua própria página, montada a partir de um arquivo de dados (`artigo.json`).
Você não precisa mexer em código: basta copiar o modelo e preencher os textos.

## 1. Copie o modelo

No VS Code, na barra lateral, clique com o botão direito em `artigos/_modelo` → **Copiar**,
cole dentro de `artigos/` e renomeie a pasta com um nome curto, sem espaços nem acentos.
Exemplo: `artigos/veneno-cascavel/`.

A pasta tem:

```
artigos/veneno-cascavel/
  index.html      página (não precisa editar)
  artigo.json     todo o conteúdo do artigo  ← é aqui que você escreve
  imagens/        figuras do artigo
  imagens/mini/   versões pequenas das figuras (carregam mais rápido)
```

## 2. Preencha o `artigo.json`

| Campo | O que colocar |
|---|---|
| `titulo` | O título completo, igual ao da revista. |
| `titulo_pt` | Se o título original for em inglês, a tradução em português (aparece em destaque; o original fica embaixo). |
| `tema` e `tema_id` | O tema do estudo (ex.: `"Genética"` e `"genetica"`), igual ao usado em `data/artigos.json`. |
| `arte` | A ilustração animada do topo: `celulas`, `rede`, `helice`, `fibras`, `particulas`, `bastonetes` ou `sangue`. Use `arte_legenda` para a legenda. |
| `titulo_curto` | Um título claro, em linguagem simples (aparece grande no topo). |
| `autores` | Nome e afiliação de cada autor. Coloque `"destaque": true` no nome da pesquisadora em destaque. |
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
| `grafico` | Gráfico de barras interativo com abas (veja o exemplo em `artigos/micrurus-spixii/artigo.json`). Use `unidade` (ex.: `" mm"`, `" meses"`; o padrão é `%`), e cada aba pode ter seus próprios `grupos` e `unidade`. |

Dica: no VS Code, dentro do `artigo.json`, digite `ge-` e escolha um bloco pronto
(`ge-texto`, `ge-figura`, `ge-passos`, `ge-cartoes`, `ge-destaque`).

## 3. Coloque as imagens

Salve as figuras em `imagens/` (de preferência em `.webp`) e uma cópia menor
(cerca de 720 px de largura) em `imagens/mini/` com o mesmo nome.
Sempre coloque o crédito da figura no campo `credito`.

## 4. Mostre o artigo nas abas do app

Abra `data/artigos.json` e adicione um item na lista `artigos`
(copie o item de um artigo parecido e troque os dados). Campos importantes:

| Campo | Para que serve |
|---|---|
| `temas` | O tema do estudo, com um só item (ex.: `["genetica"]`). Cada estudo fica em um só tema. Os temas ficam na lista `temas`, no começo do arquivo. |
| `pesquisadoras` | Liga o estudo a uma pesquisadora em destaque (ex.: `["patricia"]`). |
| `primeira_autora` | Se ela for a autora principal, coloque o id dela (ex.: `"patricia"`). O mais recente desses fica **Em destaque** no Início. |
| `data` | Data da publicação (`AAAA-MM-DD`), usada para ordenar. |
| `titulo_pt` | Tradução do título, se ele for em inglês. |
| `selo` | Para estudos ainda não publicados, use `"Estudo em andamento"` e deixe sem `revista`. |

Com isso:

- o estudo aparece na aba **Temas**, no tema escolhido, e no menu de barrinhas;
- a revista aparece na aba **Revistas**, em "Revistas dos artigos explicados".

O campo `capa` é a imagem do cartão (use a versão pequena, em `imagens/mini/`, ou um `capa.svg`).

## Inglês e espanhol

- Página do estudo: copie o `artigo.json` para `artigo.en.json` e `artigo.es.json` e traduza só os textos (deixe `id`, `tipo`, `cor`, imagens, números dos gráficos, `doi` e `url` iguais). Se o título original já estiver no idioma da página, apague `titulo_pt`; se não, coloque em `titulo_pt` a tradução e em `rotulo_original` algo como "Original title in Portuguese:". Sem esses arquivos, a página aparece em português.
- Cartão do estudo, temas e pesquisadoras: em `data/artigos.json`, preencha o campo `i18n` (`en` e `es`) com `titulo_curto`, `resumo`, `tags` e `capa_alt` traduzidos.
- No inglês, use ponto nos decimais (76.9%); no espanhol, vírgula (76,9%).

## 5. Veja como ficou e publique

1. No VS Code: **Terminal → Executar Tarefa… → Abrir o site no navegador (servidor local)**
   e abra `http://localhost:8000` (ou use a extensão **Live Preview**).
2. Quando estiver tudo certo: **Terminal → Executar Tarefa… → Publicar no site (GitHub)**.
   O site é atualizado em cerca de 1 minuto.

> As páginas precisam de um servidor local para funcionar no computador,
> porque leem os arquivos `.json`. Dar dois cliques no `index.html` não basta.
