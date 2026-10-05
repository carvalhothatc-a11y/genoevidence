# Módulos de técnica (`/modulos/[id]`)

Módulos educativos de biologia molecular, além do módulo de PCR (que tem página própria em
`/modulos/pcr`). Cada módulo é **conteúdo declarado**: os componentes só renderizam esse conteúdo.
Nenhum código de simulação é gerado a partir de documentos, da fala ou de artigos enviados.

## O que existe

| Módulo | Estado | Calculadora |
|---|---|---|
| Eletroforese em gel de agarose (`eletroforese`) | implementado | posição ilustrativa da banda |
| qPCR e RT-qPCR (`qpcr`) | implementado | ΔCt, ΔΔCt e razão corrigida pela eficiência |
| Western blot (`western`) | implementado | volume de extrato por poço |
| Clonagem molecular (`clonagem`) | parcial | — |
| Sequenciamento de Sanger (`sequenciamento`) | parcial | — |
| RNA-seq, conceitual (`rnaseq`) | parcial | TPM |

O estado de cada técnica também aparece em `src/lib/modules/registry.ts`, que é a fonte de verdade
mostrada na página `/modulos`. Um teste garante que os dois concordam.

**CRISPR continua sem módulo.** Houve uma tentativa de escrever o conteúdo e ela foi interrompida
por um filtro de segurança do assistente que redigiu este material; o texto não foi reescrito. A
técnica segue marcada como `nao_implementado` no registro.

## Estrutura de um módulo

Arquivos em `src/lib/modules/tecnicas/`:

- `tipos.ts` — o contrato (`TecnicaConteudo`, `EtapaTecnica`, `CenaEtapa`, `ParametroExploravel`)
  e os atalhos de citação `R`, `M`, `I`, `X`, `S`.
- um arquivo por técnica (`qpcr.ts`, `western.ts`, …) com o conteúdo.
- `index.ts` — a lista e a busca por id.
- `cena.ts` — converte a cena declarada da etapa num `PassoVisual`, para reaproveitar as mesmas
  cenas 3D (`Holo3D`/`Cena3D`) e 2D (`Cena`) da área de trabalho.

Interface em `src/components/tecnicas/`:

- `ModuloTecnica.tsx` — trilha de etapas, cena, abas (o que acontece / por quê / materiais e
  controles / o que observar), painel “Explorar”, solução de problemas, limites e fontes.
- `Calculadoras.tsx` — as calculadoras e o cartão de modelo de cada uma.

Página: `src/app/modulos/[id]/page.tsx` (exige sessão; id desconhecido responde 404).

## Regras que o conteúdo precisa seguir

Cada afirmação carrega o seu fundamento (`Claim.basis`):

- `referencia` — descrita numa fonte verificada, **sempre com a seção** no localizador;
- `modelo` — sai de um modelo identificado em `src/lib/models/*`;
- `ilustracao` — inferência didática, não descrita explicitamente nas fontes;
- `imprevisivel` — não pode ser previsto com as informações disponíveis;
- `sem_fonte` — prática comum sem fonte cadastrada; **exige `note`** dizendo isso.

Testes em `tests/unit/tecnicas.test.ts` conferem: toda citação aponta para uma fonte do catálogo;
toda afirmação `referencia` traz fonte; toda `sem_fonte` traz nota; nenhuma promete porcentagem de
sucesso; todo modelo declara pressupostos, limites e o que não prevê; toda calculadora citada por
uma etapa tem cartão de modelo; toda cena usa uma ação conhecida e traz legenda.

## Calculadoras e seus limites

Nenhuma calculadora estima chance de sucesso. Todas recusam valores fora de faixa em vez de
devolver um número silenciosamente, e cada uma mostra o cartão do modelo na própria tela.

- **ΔΔCt** (`src/lib/models/qpcr.ts`): definições conforme Rao et al. (2013, texto completo) e
  Livak & Schmittgen (2001, resumo). `2^−ΔΔCt` pressupõe eficiência de 100%.
- **Razão corrigida pela eficiência**: derivada do modelo exponencial. A equação publicada por
  Pfaffl (2001) **não foi lida** — o texto completo veio vazio do PMC; só o resumo foi lido. Isso
  está dito no cartão do modelo e no catálogo de fontes.
- **TPM** (`src/lib/models/rnaseq.ts`): a fórmula de conversão não veio na extração de Zhao et al.
  (2020); o cálculo foi derivado das duas propriedades descritas no texto (proporcional ao RPKM e
  soma 10⁶). Também declarado no cartão.
- **Volume de extrato** (`src/lib/models/proteina.ts`): conta de proporção, a partir de
  Mahmood & Yang (2012, texto completo).
- **Posição da banda** (`src/lib/models/pcr.ts → bandPosition`): já existia no módulo de PCR;
  marcador genérico ilustrativo.

## Fontes

Todas as referências novas estão em `src/lib/sources/catalog.ts` com o nível real de leitura
(`metadados`, `resumo` ou `texto_completo`), as seções lidas e as ressalvas da extração — inclusive
erros conhecidos do artigo de Western blot, que **não** foram reproduzidos no conteúdo.

## Testes

```bash
npm test                         # unidade, inclui tests/unit/tecnicas.test.ts
node scripts/e2e-tecnicas.mjs http://127.0.0.1:3100 <arquivo-senha-demo> <pasta-de-capturas>
```

O script de ponta a ponta percorre todos os módulos e todas as etapas, confere as legendas das
cenas, exercita as quatro calculadoras (inclusive a recusa de valores inválidos), o painel
“Explorar”, o 404 de técnica inexistente, o redirecionamento sem sessão e a ausência de rolagem
horizontal no celular.
