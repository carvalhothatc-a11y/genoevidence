# GenoEvidence

**A ciência por trás das evidências.** Aplicativo web (PWA) com abas separadas:

| Aba | O que tem |
|---|---|
| **Início** | Artigo em destaque, notícias de hoje e o que acabou de sair nas revistas. |
| **Notícias** | Notícias de ciência e saúde do dia (Agência FAPESP, Jornal da USP, Nature, ScienceDaily), com filtros. |
| **Artigos** | Artigos publicados explicados em linguagem simples. Cada um abre a sua página de leitura. |
| **Revistas** | As revistas dos artigos explicados e as publicações científicas mais recentes (Europe PMC), com filtro por revista. |
| **Sobre** | Como funciona, como instalar e créditos. |

As abas têm visual claro e limpo. A página de leitura de cada artigo tem um visual imersivo próprio,
com resumo em 1 minuto, gráficos interativos, figuras, glossário e o botão **Ler na revista**.

**Acesse:** https://carvalhothatc-a11y.github.io/genoevidence/

## Artigos no app

| Artigo | Revista |
|---|---|
| [O veneno da cobra coral amazônica no músculo, e quanto o soro protege](https://carvalhothatc-a11y.github.io/genoevidence/artigos/micrurus-spixii/) | ARACÊ, v. 8, n. 2, 2026 · [DOI 10.56238/arev8n2-068](https://doi.org/10.56238/arev8n2-068) |

## Estrutura do projeto

```
index.html                  aba Início
noticias/index.html         aba Notícias
artigos/index.html          aba Artigos
revistas/index.html         aba Revistas
sobre/index.html            página Sobre
artigos/micrurus-spixii/    página de leitura de um artigo (conteúdo em artigo.json)
artigos/_modelo/            modelo para criar um artigo novo
data/artigos.json           lista de artigos explicados (aba Artigos e destaque do Início)
data/noticias.json          notícias e publicações do dia (gerado automaticamente)
assets/css/shell.css        visual das abas
assets/css/base.css, artigo.css   visual da página de leitura
assets/js/shell.js          barra do topo, barra de abas e conteúdo das abas
assets/js/artigo.js         monta a página de leitura a partir do artigo.json
assets/js/app.js, dna.js    menu lateral e animações da página de leitura
assets/js/pwa.js            instalar como app e modo offline
scripts/atualizar_noticias.py   robô que busca as notícias do dia
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
