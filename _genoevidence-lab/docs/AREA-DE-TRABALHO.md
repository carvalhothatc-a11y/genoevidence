# Área de trabalho do GenoLab

Fluxo: **entrar → explicar ou enviar materiais → conferir → criar Motion 3D → explorar → editar → salvar e reabrir.**
A entrada é `/laboratorio`; a bancada 3D antiga continua em `/laboratorio/bancada` (opcional, educativa).

## Camadas

| Camada | Arquivos | Observações |
|---|---|---|
| Entrada e extração | `src/lib/materiais/office.ts`, `src/lib/materiais/extrair.ts`, `POST /api/materiais/extrair` | PDF (unpdf), DOCX e XLSX (ZIP + XML com fflate, limite de descompactação), CSV/TSV (papaparse), TXT. Roda no servidor do GenoLab, sem guardar o arquivo. |
| Interpretação por IA (opcional) | `src/lib/assistant/imagem.ts`, `POST /api/interpretar/imagem` | Identificação de elementos visíveis numa foto (Claude, saída estruturada no vocabulário da biblioteca). Só com autorização por envio; sugestões começam não confirmadas. |
| Interpretação por regras | `src/lib/experimento/interpretar.ts`, `quantidades.ts` | Texto/fala → ações (roteiro), grandezas com unidade e contexto, participantes, dados observados, fontes, pendências e conflitos entre materiais. Ação isolada continua isolada; programa da PCR vira parâmetro da amplificação. |
| Validação | `src/lib/experimento/schema.ts`, `materiais.ts`, `correcoes.ts` (Zod) | Toda informação guarda a **origem** (texto, áudio, foto, relatório, tabela, referência, biblioteca, usuário). Correções do pesquisador são reaplicadas a cada reinterpretação. |
| Composição da cena | `src/lib/cena/biblioteca.ts`, `src/lib/cena/compor.ts` | Vocabulário fechado de objetos e ações; a cena é só dados validados (nenhum código gerado). Limitações (sem forma 3D, ação genérica) são listadas. |
| Animações | `src/components/holo/*` | R3F: rótulos clicáveis ligados ao objeto da biblioteca, zoom, reiniciar visão, giro suave com o cursor, termociclador. Sem WebGL: ilustração 2D. |
| Cálculos e previsões | `src/lib/ideia/*`, `src/lib/models/pcr.ts` | Perfil do programa da PCR (cálculo), posição esperada de banda (ilustração), avaliação por regras com fonte. Probabilidade de sucesso suspensa sem modelo validado. |
| Persistência | `src/lib/experimento/store.ts`, `/api/projects/[id]/experimentos` | Rascunho no navegador (sem arquivos); ao salvar, arquivos originais vão para o projeto e todas as versões são preservadas. |
| Moléculas reais | `src/lib/cena/moleculas.ts`, `src/components/workspace/Moleculas.tsx`, `/api/moleculas/*` | Painel abaixo da cena, em duas partes: nomes **citados** no texto, e os **objetos da cena** (inclusive os reconhecidos numa foto). Viram dado real (UniProt, RCSB PDB, PubChem) e estrutura no Mol\*. Objeto genérico avisa que a estrutura é **exemplo**, não a molécula do experimento. Gene, proteína e composto não se substituem; termo ambíguo pergunta antes. A busca só acontece ao clicar. Ver `docs/MOLECULAS-NA-CENA.md`. |
| Interface | `src/components/workspace/*`, `src/store/experimento.ts` | Computador: materiais à esquerda, visualização à direita; celular: empilhado. Geninho dá as instruções iniciais e, sob demanda, recebe a síntese (com autorização). |

## Resultados (sempre identificados)

- ✎ **Processo ilustrado** — representação didática da ação.
- ▦ **Resultado observado** — valores enviados, por grupo (nunca como evolução no tempo não medida); ausentes mantidos.
- ◇ **Resultado esperado** — desfechos qualitativos com fonte (ou “orientação geral, sem fonte”).
- ƒ **Resultado previsto** — só com modelo aplicável; sem modelo validado, nenhuma porcentagem.

## Testes

```bash
npm test                                                     # unitários (interpretação, grandezas, XLSX/DOCX, retenção)
node scripts/e2e-area.mjs <base> <senha-demo> <capturas>     # fluxo completo da área de trabalho
node scripts/e2e-area.mjs <base> <senha-demo> <capturas> --ia  # + identificação de foto e Geninho com contexto (API real)
node scripts/teste-privacidade.mjs <base> <senha-demo> <dados> # CSP sem violações, privacidade, exclusão de conta
node scripts/e2e-estudio.mjs <base> <senha-demo> <capturas>  # bancada 3D (PCR)
node scripts/e2e-moleculas.mjs <base> <senha-demo> <capturas> # moléculas citadas: dado real, desambiguação e Mol*
node scripts/e2e-caderno.mjs <base> <senha-demo> <capturas>   # caderno de laboratório: registro do dia, anexos e rastro de edição
node scripts/e2e-cena-moleculas.mjs <base> <senha-demo> <capturas> # molécula real por trás de cada objeto da cena (e da foto)
```

## Limitações conhecidas

- A interpretação de texto é por regras (português); frases muito livres podem virar “etapa descrita” (genérica), sinalizada para correção.
- A identificação automática de fotos depende da API configurada e sugere só itens da biblioteca; a marcação manual funciona sem ela.
- Equipamentos sem forma 3D (banho-maria, incubadora, transiluminador, placa de poços…) aparecem como rótulo.
- Reconhecimento de voz depende do navegador (Chrome/Edge); no Chrome o áudio é processado pelo Google.
- Comparação de versões usa ilustração 2D sincronizada.
- A cena 3D é **ilustração**, com objetos genéricos; a molécula real fica no painel “Moléculas citadas”, separado e identificado.
- Não há leitura automática do conteúdo de referências por DOI (ficam “cadastradas”); anexe o PDF como relatório para análise.
