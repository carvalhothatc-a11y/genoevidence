# GenoEvidence

**A ciência por trás das evidências.** Aplicativo web (PWA) que reúne:

- **Notícias de ciência do dia**, atualizadas automaticamente todas as manhãs
  (Agência FAPESP, Jornal da USP, Nature, ScienceDaily);
- **Artigos científicos novos** sobre TP53, Síndrome de Li-Fraumeni e câncer hereditário,
  com a revista em destaque e o botão *Ler na revista* (Europe PMC);
- **Estudos e artigos explicados**, cada um com a sua página: resumo em 1 minuto,
  explicação em linguagem simples, gráficos, imagens, glossário e link para a revista.

**Acesse:** https://carvalhothatc-a11y.github.io/genoevidence/

## Estudos no app

| Página | Tipo | Revista |
|---|---|---|
| [Cobra coral amazônica (*Micrurus spixii*)](https://carvalhothatc-a11y.github.io/genoevidence/estudos/micrurus-spixii/) | Artigo publicado | ARACÊ, v. 8, n. 2, 2026 · [DOI 10.56238/arev8n2-068](https://doi.org/10.56238/arev8n2-068) |
| [R337H no gene TP53](https://carvalhothatc-a11y.github.io/genoevidence/estudos/r337h/) | TCC · Biomedicina | — |

## Estrutura do projeto

```
index.html                  página inicial (notícias, artigos novos, estudos, revistas)
estudos/
  r337h/                    estudo R337H (página própria, com 3D e gráficos)
  micrurus-spixii/          artigo publicado (conteúdo em artigo.json)
  _modelo/                  modelo para criar um artigo novo
data/
  estudos.json              lista de estudos mostrados no início
  noticias.json             notícias e artigos do dia (gerado automaticamente)
assets/
  css/                      estilos (base, início, artigo)
  js/                       app.js (menu, navegação), inicio.js, artigo.js, dna.js (3D), pwa.js (instalar/offline)
scripts/atualizar_noticias.py   robô que busca as notícias do dia
.github/workflows/noticias.yml  roda o robô todo dia às 6h (Brasília)
docs/COMO-ADICIONAR-ARTIGO.md   passo a passo para publicar um artigo novo
manifest.webmanifest, sw.js, icons/   aplicativo instalável e modo offline
```

## Trabalhando no VS Code

1. Abra a pasta do projeto no VS Code (**Arquivo → Abrir Pasta…**).
2. Aceite as extensões recomendadas (Live Preview, Prettier, corretor em português).
3. Para ver o site: **Terminal → Executar Tarefa… → Abrir o site no navegador (servidor local)**
   e abra `http://localhost:8000`.
4. Para publicar: **Terminal → Executar Tarefa… → Publicar no site (GitHub)**.

Para adicionar um artigo novo, siga [docs/COMO-ADICIONAR-ARTIGO.md](docs/COMO-ADICIONAR-ARTIGO.md).

## Instalar como aplicativo

- **Android (Chrome):** toque em **Instalar como app** (ou menu ⋮ → Instalar app).
- **iPhone/iPad (Safari):** Compartilhar → **Adicionar à Tela de Início**.
- **Computador (Chrome ou Edge):** **Instalar como app** ou o ícone de instalação da barra de endereço.

## Créditos

Resumos e explicações produzidos pelo GenoEvidence a partir dos artigos originais;
figuras reproduzidas com crédito à publicação. Notícias: títulos e trechos com link para a fonte.
Conteúdo educativo: não substitui orientação médica ou aconselhamento genético.
