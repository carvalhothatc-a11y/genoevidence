# GenoEvidence

Sistema visual e interativo que reúne as evidências sobre a variante **TP53 R337H** (c.1010G>A, p.Arg337His) e sua relação com a **Síndrome de Li-Fraumeni**, com base em análises *in silico* feitas em bancos de dados públicos.

**Acesse o site:** https://carvalhothatc-a11y.github.io/genoevidence/

## O que o site mostra

- **Resumo em 1 minuto:** a história da pesquisa em quatro passos.
- **Síndrome, mutação e proteína:** o que é a Síndrome de Li-Fraumeni, como uma letra trocada no DNA muda a proteína p53 e onde a R337H fica na estrutura.
- **Laboratório 3D:** as imagens reais do DynaMut2 (p53 normal × R337H) e um modelo 3D ilustrativo do tetrâmero da p53.
- **Lacuna científica, método e resultados:** ClinVar, gnomAD, DynaMut2 e TP53 Database, com gráficos interativos.
- **Discussão, conclusão, galeria de imagens, glossário e referências** (estilo Vancouver).

## Estrutura

```
index.html   página completa do site
imagens/     capturas de tela das plataformas usadas na pesquisa
```

Para abrir no computador, basta dar dois cliques em `index.html`. O site usa Three.js (r128) e GSAP (3.12.5) pelo cdnjs e fontes do Google Fonts, então precisa de internet para carregar esses recursos.

## Bancos de dados consultados

| Plataforma | Uso na pesquisa |
|---|---|
| [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/variation/12379/) | Classificação clínica da variante |
| [gnomAD v4.1.1](https://gnomad.broadinstitute.org/variant/17-7670699-C-T?dataset=gnomad_r4) | Frequência populacional |
| [DynaMut2](https://biosig.lab.uq.edu.au/dynamut2/) | Predição do impacto na estabilidade da p53 |
| [TP53 Database](https://tp53.cancer.gov/) | Registros tumorais germinativos |

As imagens da pasta `imagens/` são capturas de tela dessas plataformas, usadas para fins acadêmicos.

## Autoria

- Ana Júlia Silva Rodrigues
- Thaisa Carvalho
- Orientação: Profa. Dra. Patrícia Alves

Conteúdo educativo. Não substitui aconselhamento genético.
