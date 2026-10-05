# Vocabulário de síntese química e nanopartículas

A área de trabalho nasceu com vocabulário de biologia molecular. Ao receber protocolos de **síntese
de nanopartículas**, ela interpretava errado: “extrato” (extrato vegetal) virava “extrair DNA”, e a
cena desenhava **células rompidas** que não existem nesses experimentos. Este documento registra o
vocabulário acrescentado para corrigir isso.

## O problema original

Com três documentos reais de síntese (protocolo de nanopartículas de enxofre, rotas de CaSO₄ e um
levantamento de artigos), o laboratório produzia:

- “60 mM permitem observar se **o extrato** dissolve o sólido” → etapa de **Extração**, cena com
  “Células rompidas (lise)”;
- “Rota 1 — precipitação a partir de CaCl₂ e (NH₄)₂SO₄” → **Centrifugação**;
- uma frase de ressalva de uma revisão de literatura → etapa de extração.

Do protocolo inteiro, só “centrifugar” estava certo.

## Ações novas

Em `src/lib/visual/roteiro.ts`, declaradas também em `src/lib/experimento/schema.ts` (`ACAO_IDS`) e
em `src/lib/cena/biblioteca.ts` (`ACOES_BIBLIOTECA`):

| Ação | Reconhece |
|---|---|
| `pesar` | pese, pesar, pesagem, massa de, balança analítica |
| `dissolver` | dissolva, dissolver, solubilizar, diluir |
| `agitar` | agitação (magnética), agite, turrax, mistura vigorosa |
| `acidificar` | acidificação, gota a gota, gotejar, adicionar ácido lentamente |
| `precipitar` | precipitação, turvação, turbidez, formação de precipitado |
| `lavar` | lavagem, lave, repita esse processo |
| `ressuspender` | ressuspenda, ressuspensão |
| `secar` | secagem, seque, estufa, dessecador, liofilizar |
| `filtrar` | filtre, filtrar, filtração, membrana de 0,2 µm |
| `medir_ph` | meça/medir/ajustar o pH |

**`precipitar` saiu de `centrifugar`:** antes, `precipit\w*` fazia parte da regra de centrifugação.

## Entidades e objetos novos

Entidades (`Entidade` em `roteiro.ts`): `sal_precursor`, `extrato_vegetal`, `acido`, `solvente`,
`precipitado`, `nanoparticula`.

Objetos da cena (`OBJETO_IDS` em `biblioteca.ts`): `balanca`, `agitador_magnetico`, `estufa`,
`ph_metro`, `balao_volumetrico`, `proveta`, mais os materiais correspondentes às entidades acima.

Formas 3D em `src/components/holo/primitivas.tsx`: `Bequer` (com barra magnética giratória),
`Particulas` (suspensão ou sedimento), `Gotejamento`, `Balanca` e `Po`. As cenas de cada ação estão
em `Cena3D.tsx`.

## Correções de precisão

Duas palavras eram lidas como verbo quando são substantivo:

- **“extrato”, “extratos”** não disparam mais `extrair`. A regra passou de `extra\w*` para formas
  verbais explícitas (`extrair`, `extração`, `extraído`…). Isso também corrigiu “lista”, que antes
  casava com `lis\w*`.
- **“filtrado”, “o filtrado”** não disparam mais `filtrar`. Só as formas verbais e “foi filtrado”.

Testes de regressão em `tests/unit/sintese.test.ts` cobrem exatamente essas duas frases.

## Grandezas

`src/lib/experimento/quantidades.ts` passou a ler **gramas** (`5 g`) — sem confundir com a força
`× g` da centrifugação, que continua sendo reconhecida antes. Contextos novos nomeiam os parâmetros:
tiossulfato, CaCl₂, (NH₄)₂SO₄, CaSO₄, HCl, ácido cítrico, etanol, secagem, agitação, lavagem e
nanopartícula. Assim “60 °C por 5 horas” vira *Temperatura de secagem* e *Tempo de secagem*.

## Avisos honestos (em vez de inventar)

Em `src/lib/experimento/interpretar.ts`:

- **`pareceLevantamento(texto)`** — detecta documento que é revisão de literatura e não procedimento
  (muitas citações autor-ano e “não informado”, poucos verbos no imperativo). Quando detectado, o
  experimento ganha uma pendência dizendo que as frases descrevem o que *outros autores* fizeram.
- **`etapasCortadas(relatorio)`** — documentos longos passam de `MAX_ETAPAS_RELATORIO` (24). O
  excedente agora vira aviso, em vez de sumir em silêncio. `MAX_TRECHOS` em `roteiro.ts` é 28.

## Envio de arquivos no projeto

`FileUploadForm` aceitava só imagem, embora a API já aceitasse mais. Agora aceita imagem (PNG, JPEG,
WebP), documento (PDF, DOCX, TXT, MD) e tabela (CSV, TSV, XLSX), até 20 MB, com um campo para
descrever o papel do arquivo. O conteúdo **não** é interpretado ali: para virar visualização, o
documento é enviado na área de trabalho.

## O que continua fora

- Não há modelo que preveja tamanho, forma, rendimento ou pureza das partículas. A cena diz isso.
- A participação química do extrato não é demonstrada pela cena; isso exige controles sem extrato.
- Caracterização (FTIR, XRD, TEM, NTA, DLS) não é representada nem interpretada.

## Testes

```bash
npm test                                 # inclui tests/unit/sintese.test.ts (20 testes)
node scripts/e2e-arquivos-projeto.mjs http://127.0.0.1:3100 <senha-demo> <capturas>
# opcional: DOCS_TESTE=/caminho/com/documentos/ exercita o envio de .docx
```
