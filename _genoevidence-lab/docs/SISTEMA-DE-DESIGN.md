# Sistema de design

Como as cores, os tamanhos e os componentes do GenoLab são definidos — e a regra de ouro:
**nenhuma cor nova é escrita direto no componente.**

## Como as cores funcionam

Três camadas, em `src/app/globals.css`:

1. **Paleta da marca** (`--ge-*`): os valores fixos da Geno Evidence. Não se usa direto.
2. **Camada semântica** (`--ink`, `--body`, `--muted`, `--surface`, `--line`, `--accent`, `--danger`,
   `--warn`, `--ok`, `--violet`…): o *papel* da cor, não a cor em si.
3. **Escopo escuro** (`.ge-dark`): **redefine os mesmos tokens** com os valores do tema escuro.

A terceira camada é a que importa. `.ge-dark` envolve o app inteiro (no `AppShell`, e as telas
imersivas trazem o próprio), então `text-muted` **já resolve** para `#a7b2c8` sem ninguém escrever
esse valor. Era essa a intenção desde o começo; o que faltava era o código seguir.

## A regra

| Em vez de | Escreva |
|---|---|
| `text-[#a7b2c8]` | `text-muted` |
| `text-[#c9d2e3]` | `text-body` |
| `text-[#7d8aa3]` | `text-panel-dim` |
| `text-[#ffb23f]` · `border-[#ffb23f]/40` | `text-warn` · `border-warn/40` |
| `text-[#b49cf5]` | `text-violet` |
| `text-[#9db4ff]` | `text-accent-ink` |
| `bg-[#0b1221]` | `bg-panel` |
| `bg-[#060a13]` | `bg-paper` |
| `text-[#ff5470]` | `text-danger` |

Um hex cravado não é só feio: ele **não acompanha o tema**. O componente fica preso ao escuro para
sempre, e qualquer ajuste de paleta tem de ser caçado arquivo por arquivo.

### As exceções legítimas

Hex direto continua certo onde **não existe CSS**:

- materiais e cores do three.js (`new Color("#…")`) — WebGL não lê variável CSS;
- `fill=` e `stroke=` de SVG desenhado à mão (quando não dá para usar `currentColor`);
- `themeColor` no `metadata` do Next (vai para a barra do navegador, fora da página).

### O caso do `<html>`/`<body>`

`html` e `body` ficam **fora** de `.ge-dark`, que só começa no `AppShell`. Ali `--paper` ainda é o
claro, e qualquer classe de fundo é inútil de todo jeito: a regra `body { background }` do
`globals.css` **não está em camada** e vence o utilitário do Tailwind, que está.

Por isso existe `--app-bg` (`#060a13`): o fundo da superfície mais externa do app, aplicado em
`html, body` pelo próprio `globals.css`.

> **Achado de 13/10/2026:** o `<body>` carregava `bg-[#060a13]`, classe que **nunca teve efeito** —
> o fundo real era branco, inclusive em produção. Não aparecia porque a `div` escura cobre a
> viewport inteira; só vazava no overscroll. A conferência em `scripts/teste-privacidade.mjs` mede
> o fundo aplicado no `body` e teria pego.

## Medição de 13/10/2026

Antes da limpeza: **701 hex cravados** em 34 dos 74 arquivos de componente. Os 9 valores mais
repetidos — **371 ocorrências** — eram cópia exata de um token que já existia.

Depois: esses 371 viraram classe semântica. Restam 330, quase todos nas exceções acima.

Outras medidas da mesma auditoria:

| Categoria | Situação |
|---|---|
| Espaçamento | ✅ 9 arbitrários em 1.704 usos (99,5% na escala) |
| Raio de borda | ✅ 4 arbitrários em ~360 usos |
| Tipografia | ❌ 16 tamanhos em px avulsos; **sem token de escala** |
| Movimento | ⚠️ `--ease-standard` usado 14×; `--dur-view` e `--r-sm/md` nunca usados |
| Botões | ⚠️ 153 `<button>` crus contra 64 usos de `<Button>`; o `Button` não tem estado de carregando |

## Contraste (medido, não estimado)

Todas as cores de texto sobre os dois fundos escuros, pelo critério WCAG:

| Cor | sobre `--panel` `#0b1221` | sobre `#060a13` |
|---|---|---|
| `--ink` | 16,66:1 | 17,64:1 |
| `--body` | 12,30:1 | 13,02:1 |
| `--muted` | 8,77:1 | 9,28:1 |
| `--panel-dim` | 5,38:1 | 5,69:1 |
| `--accent-ink` | 9,27:1 | 9,81:1 |
| `--violet` | 8,03:1 | 8,50:1 |
| `--warn` | 10,41:1 | 11,02:1 |
| `--danger` | 6,02:1 | 6,37:1 |

**Todas passam no mínimo de texto pequeno (4,5:1)**, inclusive `--panel-dim`, que é o tom mais
apagado e aparece em texto de 11 px.

## Nomes

- **Callbacks**: `on` + verbo em português — `onFechar`, `onSalvar`, `onPerguntar`. Props que são
  repasse direto do DOM (`onClick`, `onChange`) mantêm o nome do DOM.
- **Componentes e pastas**: convivem inglês (`admin`, `auth`, `projects`) e português (`caderno`,
  `ideia`, `tecnicas`, `workspace`). Não vale renomear o que já existe só por simetria; o que vier
  novo segue o português, que é a língua do produto.

## Como conferir que uma troca de cor não mudou nada

Trocar hex por token **não pode** mudar a tela. O jeito de provar não é olhar: é medir.

1. Fotografar as telas e gravar, para cada elemento, a cor que o navegador realmente aplica
   (`getComputedStyle`) — antes da mudança.
2. Repetir depois e comparar **valor convertido para sRGB**, não a notação: o Tailwind pode escrever
   a mesma cor como `lab(...)` ou `oklab(...)` conforme a origem.
3. Comparar as imagens pixel a pixel, separando o que cai **dentro de um `<canvas>`** — cena 3D
   animada difere entre execuções e não prova nada.

Resultado da limpeza de 13/10/2026, em 1.292 elementos e 7 telas:

- 4 telas **idênticas pixel a pixel**;
- `referencias`: 347 pixels (0,005%), só em canto arredondado de borda;
- `tecnicas`: toda a diferença **dentro do canvas 3D** (animação);
- `area`: 10.732 pixels dentro do canvas; 363 fora, com desvio máximo de **1**.

As únicas cores que mudaram de valor foram três, todas com modificador de opacidade — e em todas as
três o valor **novo** é o hex exato do token, enquanto o antigo estava arredondado pela mistura em
espaço lab:

| Token | Antes | Depois | Valor real |
|---|---|---|---|
| `--warn` | (255, 177, 64) | (255, 178, 63) | **#ffb23f = (255, 178, 63)** |
| `--violet` | (170, 158, 244) | (180, 156, 245) | **#b49cf5 = (180, 156, 245)** |
| `--paper` | (5, 10, 19) | (6, 10, 19) | **#060a13 = (6, 10, 19)** |

## O que ainda falta

1. **Escala tipográfica.** 16 tamanhos avulsos, incluindo `10.5px` e `13.5px`. Quatro ou cinco
   degraus nomeados cobrem o uso real.
2. **Estado de carregando no `Button`**, para as telas pararem de improvisar
   `{salvando ? "Guardando…" : "Salvar"}`.
3. **Migrar botões crus** nas telas novas. Não vale reescrever os 153 de uma vez; vale não criar
   mais.
