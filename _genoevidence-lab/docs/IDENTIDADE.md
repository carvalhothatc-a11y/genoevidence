# Identidade visual — GenoLab

O produto se chama **GenoLab** (nome definido pela responsável em 02/10/2026) e reutiliza a identidade do GenoEvidence. No cabeçalho, o lockup original “GenoEvidence” é seguido do rótulo “Lab”, sem alterar o logotipo.

## Fontes da identidade (analisadas em 02/10/2026)

| Arquivo | Uso |
|---|---|
| `~/Downloads/Carrossel GenoEvidence.zip` → `export/01…07*.png` (01/10/2026) | Referência principal: cores medidas, lockup, componentes |
| `~/Downloads/Carrossel Instagram GenoEvidence/1…7.png` (25/09/2026) | Símbolo em alta resolução (`7.png`), cartões, sobretítulos |

**Atualização (02/10/2026):** o código-fonte do site ficou disponível (`sistema tcc/`). Os tokens abaixo foram
substituídos pelos valores de `assets/css/shell.css` (tema claro) e `assets/css/base.css` (tema escuro das experiências),
e as fontes foram confirmadas no `<link>` do Google Fonts em `index.html`.

### Valores do código do site (fonte de verdade)

| Token do site | Valor | Uso no Lab |
|---|---|---|
| `--bg` / `--surface` / `--surface2` | `#FFFFFF` / `#FFFFFF` / `#F4F6FA` | Fundo, cartões, superfícies secundárias |
| `--ink` / `--ink2` / `--muted` / `--line` | `#0F1730` / `#3A4560` / `#6B7590` / `#E6E9F0` | Títulos, texto, rótulos, divisórias |
| `--accent` / `--accent-soft` | `#E0385A` / `#FDEBEF` | Ação principal, sobretítulos |
| `--blue` / `--blue-soft` | `#2F5BEA` / `#ECF1FE` | Seleção, links, foco, dados |
| `--violet` / `--violet-soft` | `#7B4DE0` / `#F2ECFE` | Ilustração didática, comparação |
| `--teal`, `--amber`, `--ok` | `#0E9AA7`, `#D98A0B`, `#14864A` | Estados e apoio |
| `--shadow` | `0 1px 2px rgba(15,23,48,.04), 0 6px 20px rgba(15,23,48,.06)` | Cartões |
| Gradiente | `linear-gradient(90deg, #2F5BEA, #7B4DE0 55%, #E0385A)` | Palavra de destaque, faixas das bancadas |
| Fontes | Unbounded 500–700 · IBM Plex Sans 400–600 · IBM Plex Mono 400–600 | Títulos · texto · rótulos e valores |
| Tema escuro (`base.css`) | `#0B1221`, `#0F182B`, `#1B2742`, texto `#EEF2F9`, `#A7B2C8`, azul `#4D7CFF`, vermelho `#FF5470` | Painéis de análise, Mol*, console de login |
| Movimento | respostas `.2s`; deslocamentos `.6s`/`1.1s`; `cubic-bezier(.2,.8,.2,1)`; entrada `emFoco` (desfoque 10 px → nítido) | Painéis, câmera, entrada |
| Componentes | `.btn` pílula 600 14,5px; `.btn.ghost` contorno interno; `.card` raio 16px; `.kicker` mono 600 12,5px carmim | Botões, cartões, sobretítulos |

Os valores medidos nos PNGs (tabela seguinte) ficam como registro histórico.

## Valores medidos (pixels dos PNGs exportados)

Medidos em áreas chapadas com Python/Pillow. Exportações PNG podem ter pequenas variações em relação aos tokens originais; **confirmar com o arquivo-fonte do design quando disponível.**

| Token | Valor | Onde aparece |
|---|---|---|
| `--ge-white` | `#ffffff` | Fundo |
| `--ge-ink` | `#0f1730` | Títulos, palavra “GenoEvidence” |
| `--ge-body` | `#3a4560` | Texto corrido |
| `--ge-slate` | `#6b7590` | Rótulos monoespaçados, legendas, “Arraste →” |
| `--ge-line` | `#e6e9f0` | Divisórias |
| `--ge-dot` | `#d5dae5` | Pontos de progresso inativos |
| `--ge-red` | `#e0385a` | Botão principal (pílula), sobretítulo, ponto ativo |
| `--ge-blue` → `--ge-violet` → `--ge-crimson` | `#355ae9` → `#734ee1` → `#d83a65` | Gradiente em texto de destaque |
| `--ge-logo-a` → `--ge-logo-b` | `#7a95f6` → `#e679b5` | Gradiente do símbolo |

Logotipo: símbolo circular com hélice de DNA vazada + palavra “GenoEvidence”. Os arquivos em `public/brand/` foram **recortados** dos PNGs originais, sem redesenho nem alteração de proporção:

- `geno-evidence-lockup.png` — símbolo + palavra (de `export/07-acesse.png`)
- `geno-evidence-simbolo-{64,192,512}.png` — símbolo (de `7.png`), recorte circular com fundo transparente fora do círculo

## Componentes observados

- Botões em **pílula**: carmim preenchido com texto branco; secundário com contorno escuro.
- **Sobretítulo** em fonte monoespaçada carmim, precedido de um pequeno quadrado arredondado.
- **Cartões** brancos, cantos amplos, borda clara e sombra suave e difusa.
- **Progresso** em pontos: inativos `#d5dae5`, ativo alongado em carmim.
- Títulos grandes e pesados, com uma palavra em gradiente.
- Fundos claros com sequências de DNA em mono muito suaves e hélices translúcidas como ilustração.

## Pendências (não inventadas)

1. ~~Tipografia~~ — resolvido: Unbounded, IBM Plex Sans e IBM Plex Mono (do site).
2. ~~Movimento~~ — resolvido: curva e durações do site; câmera 3D (0,8 s) é extensão.
3. ~~Código-fonte~~ — resolvido: `sistema tcc/`.

## Extensões documentadas (derivadas, não presentes nas referências)

| Token | Valor | Motivo |
|---|---|---|
| `--action` | `#c42a4b` | Variação mais escura de `--ge-red` para texto branco em botões de tamanho normal (5,56:1). `#e0385a` com branco dá 4,30:1, adequado só a texto grande. |
| `--ge-surface-2` | `#f6f7fb` | Superfície levemente tingida para áreas secundárias. |
| `--panel` / `--panel-2` | `#0f1730` / `#172042` | Painéis escuros de análise (uso da cor de tinta da marca como fundo). |
| `--accent-soft`, `--violet-soft` | `#eef2fe`, `#f2eefc` | Fundos suaves de seleção e comparação. |
| Estados funcionais | ok `#1d6b33`, atenção `#8a5300`, erro `#b42318` | Cores de estado distintas do carmim de ação (o vermelho da marca não pode significar “erro” e “ação” ao mesmo tempo). |
| Categorias científicas | dados = azul da marca; ilustração = violeta da marca; simulação = âmbar `#8a4b00` | Selos com ícone + texto; não dependem só da cor. |

### Movimento (provisório)

| Token | Valor | Uso |
|---|---|---|
| `--dur-press` | 150 ms | Resposta a clique e seleção |
| `--dur-panel` | 240 ms | Abertura e fechamento de painéis |
| `--dur-view` | 400 ms | Troca de escala/visualização |
| câmera | 800 ms | Transição de câmera (em JS) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Entradas |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Saídas |

Com `prefers-reduced-motion`, as transições de câmera viram cortes diretos e os painéis aparecem sem deslocamento.

### No ambiente 3D

As grandes superfícies continuam neutras (bancadas claras, resina escura, metal e vidro). A marca aparece na sinalização das bancadas (faixa em gradiente da marca), na seleção (azul `#355ae9`), nos pontos de interesse e nos painéis.
