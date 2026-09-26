/* GenoEvidence · idiomas (português, inglês e espanhol)
   - Descobre o idioma: ?lang=en na URL → escolha salva → idioma do aparelho → português.
   - Traduz os textos fixos da interface (menus, botões, avisos) trocando o texto em português
     pelo do idioma escolhido, inclusive o que aparece depois de a página carregar.
   - O conteúdo (estudos, temas, notícias, frases) vem traduzido dos arquivos de dados:
     artigo.en.json / artigo.es.json, campo "i18n" em data/artigos.json etc.
   - Monta o seletor 🌐 PT · EN · ES no topo.
   Este arquivo é carregado no <head> de todas as páginas, antes dos outros scripts. */
(function () {
  "use strict";
  var IDIOMAS = {
    pt: { nome: "Português", curto: "PT", locale: "pt-BR" },
    en: { nome: "English", curto: "EN", locale: "en-US" },
    es: { nome: "Español", curto: "ES", locale: "es" }
  };

  function detectar() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q && IDIOMAS[q]) { localStorage.setItem("ge-idioma", q); return q; }
      var s = localStorage.getItem("ge-idioma");
      if (s && IDIOMAS[s]) return s;
    } catch (e) {}
    var nav = (navigator.languages || [navigator.language || "pt"]);
    for (var i = 0; i < nav.length; i++) {
      var c = String(nav[i]).slice(0, 2).toLowerCase();
      if (IDIOMAS[c]) return c;
    }
    return "pt";
  }
  var lang = detectar();
  document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

  // páginas com versões em arquivos separados (ex.: r337h/en/): vai direto para a versão certa
  var versoes = document.querySelector('meta[name="ge-versoes"]');
  if (versoes) {
    var aqui = (document.querySelector('meta[name="ge-idioma-pagina"]') || {}).content || "pt";
    var mapa = {};
    versoes.content.split(",").forEach(function (p) { var kv = p.split(":"); mapa[kv[0].trim()] = kv[1].trim(); });
    if (aqui !== lang && mapa[lang]) { location.replace(mapa[lang] + location.hash); return; }
  }

  /* ---------------- dicionário da interface (texto em português → tradução) ---------------- */
  var D = {
    en: {
      // barra do topo, abas e menu
      "Início": "Home", "Notícias": "News", "Temas": "Topics", "Revistas": "Journals", "Sobre o app": "About the app",
      "Seções do app": "App sections", "Sobre o GenoEvidence": "About GenoEvidence", "Abrir o menu": "Open the menu",
      "Ir para": "Go to", "Fechar o menu": "Close the menu", "Filtrar: câncer, Patrícia, DNA…": "Filter: cancer, Patrícia, DNA…",
      "Filtrar o menu": "Filter the menu", "Nada encontrado.": "Nothing found.", "Páginas": "Pages", "Pesquisadoras": "Researchers",
      "Em destaque": "Featured", "Notícias da ciência": "Science news", "Estudo em andamento: R337H": "Ongoing study: R337H",
      "Abrir o tema": "Open the topic", "Ver todos os estudos dela": "See all her studies", "Menu do GenoEvidence": "GenoEvidence menu",
      "Destinos": "Destinations", "Idioma": "Language", "Escolher idioma": "Choose language", "Sobre": "About", "Desenvolvido por": "Developed by", "Idiomas: o app pode ser lido em português, inglês e espanhol. É só tocar no botão de idioma, no topo da tela. As páginas dos estudos foram traduzidas pelo GenoEvidence.": "Languages: the app can be read in Portuguese, English and Spanish. Just tap the language button at the top of the screen. The study pages were translated by GenoEvidence.",
      // Início
      "A ciência de hoje,": "Today's science,", "explicada": "explained",
      "Estudos completos, temas e notícias da ciência em linguagem simples, com o link direto para a fonte.": "Full studies, topics and science news in plain language, with a direct link to the source.",
      "Pesquisar estudos, temas, pesquisadoras, notícias…": "Search studies, topics, researchers, news…",
      "Pesquisar no GenoEvidence": "Search GenoEvidence", "Resultados da pesquisa": "Search results",
      "Ver os destaques": "See the highlights", "Explorar por tema": "Explore by topic", "Ver todas →": "See all →",
      "Todos os estudos →": "All studies →", "Carregando…": "Loading…", "Estudo em andamento": "Ongoing study",
      "Ainda não publicado": "Not yet published", "A variante R337H no gene TP53 e a Síndrome de Li-Fraumeni": "The R337H variant in the TP53 gene and Li-Fraumeni syndrome",
      "Com modelo 3D, gráficos, mapa e todas as evidências reunidas até agora.": "With a 3D model, charts, a map and all the evidence gathered so far.",
      "Abrir estudo →": "Open study →", "Explore por tema": "Explore by topic", "Ver todos →": "See all →",
      "Leve o GenoEvidence no celular": "Take GenoEvidence on your phone", "Instale como aplicativo e leia mesmo sem internet.": "Install it as an app and read even offline.",
      "GenoEvidence · a ciência por trás das evidências ·": "GenoEvidence · the science behind the evidence ·",
      "Bom dia": "Good morning", "Boa tarde": "Good afternoon", "Boa noite": "Good evening",
      "Autora principal": "Lead author", "Ler o estudo completo →": "Read the full study →",
      "Não foi possível carregar os destaques.": "Could not load the highlights.", "Sem notícias novas agora.": "No new stories right now.",
      "Não foi possível carregar as notícias.": "Could not load the news.", "Estudo": "Study", "Tema": "Topic", "Pesquisadora": "Researcher", "Notícia": "News",
      "Não foi possível carregar os estudos.": "Could not load the studies.",
      // Notícias
      "Notícias da ciência · escolhidas todos os dias": "Science news · picked every day", "O que importa hoje": "What matters today",
      "Só as notícias de ciência mais relevantes do dia: as principais de fontes brasileiras e do mundo, com as estrangeiras traduzidas para o português. Toque em uma notícia para ler na fonte original.":
        "Only the most relevant science news of the day, from Brazilian and international sources, translated into English. Tap a story to read it at the original source.",
      "Todas": "All", "Fontes do Brasil": "Brazilian sources", "Genética": "Genetics", "Câncer": "Cancer", "Saúde": "Health",
      "Meio ambiente": "Environment", "Espaço": "Space", "Ciência": "Science", "Carregando as notícias de hoje…": "Loading today's news…",
      "Mostrar mais notícias": "Show more news", "Filtrar notícias": "Filter news", "Em alta": "Trending",
      "Nenhuma notícia neste filtro hoje.": "No news in this filter today.", "Sem conexão para carregar as notícias agora.": "No connection to load the news right now.",
      "traduzido": "translated", "Toque em uma notícia para ler na fonte original.": "Tap a story to read it at the original source.",
      // Temas
      "Artigos por tema": "Studies by topic",
      "Escolha um tema e veja os estudos explicados em linguagem simples. Toque em um estudo para abrir a página completa dele, com imagens, gráficos e o link para a revista.":
        "Choose a topic and see the studies explained in plain language. Tap a study to open its full page, with images, charts and the link to the journal.",
      "Buscar artigo, revista ou palavra…": "Search for a study, journal or word…", "Buscar artigos": "Search studies",
      "Filtrar por pesquisadora": "Filter by researcher", "Pesquisadoras:": "Researchers:", "Nenhum artigo encontrado.": "No studies found.",
      "Não foi possível carregar os artigos.": "Could not load the studies.", "Ler →": "Read →",
      // Revistas
      "Fontes originais": "Original sources", "Onde a ciência está sendo publicada: as revistas dos artigos explicados no app e o que acabou de sair.": "Where science is being published: the journals of the studies explained in the app and what just came out.",
      "Revistas dos artigos explicados": "Journals of the explained studies", "Publicações recentes": "Recent publications",
      "Filtrar por revista": "Filter by journal", "As revistas dos artigos explicados aparecem aqui.": "The journals of the explained studies appear here.",
      "Nenhuma publicação nova.": "No new publications.", "Site da revista ↗": "Journal website ↗", "acesso aberto": "open access",
      "Artigos publicados nas últimas semanas sobre os temas dos artigos explicados no app: genética do câncer, variantes germinativas, venenos de serpentes e antivenenos (fonte: Europe PMC).":
        "Papers published in recent weeks on the topics of the studies explained in the app: cancer genetics, germline variants, snake venoms and antivenoms (source: Europe PMC).",
      // Sobre
      "A ciência por trás das evidências.": "The science behind the evidence.",
      "O GenoEvidence reúne, num só lugar, o que a ciência está publicando agora e a explicação aprofundada de artigos selecionados, sempre com o caminho de volta para a fonte original.":
        "GenoEvidence brings together, in one place, what science is publishing right now and in-depth explanations of selected papers, always with a way back to the original source.",
      "Como funciona": "How it works", "Notícias do dia": "Today's news",
      "Todos os dias o app reúne notícias de ciência e saúde da Agência FAPESP, do Jornal da USP, da Nature e do ScienceDaily.": "Every day the app gathers science and health news from Brazilian and international sources.",
      "Estudos por tema": "Studies by topic",
      "Cada estudo publicado ganha uma página com resumo em 1 minuto, explicação simples, gráficos, imagens, glossário e o título traduzido, organizada por tema.":
        "Each published study gets a page with a 1-minute summary, a plain explanation, charts, images, a glossary and the translated title, organized by topic.",
      "Direto da revista": "Straight from the journal", "Cada artigo mostra a revista em que foi publicado, com o DOI e o botão Ler na revista.": "Each study shows the journal where it was published, with the DOI and a Read in the journal button.",
      "Instalar como aplicativo": "Install as an app", "iPhone ou iPad": "iPhone or iPad",
      "Abra o site no Safari (não dentro do WhatsApp ou do Instagram).": "Open the site in Safari (not inside WhatsApp or Instagram).",
      "Toque em Compartilhar, o quadrado com a seta para cima.": "Tap Share, the square with the upward arrow.",
      "Role a lista e toque em Adicionar à Tela de Início.": "Scroll the list and tap Add to Home Screen.",
      "Abra o site no Chrome.": "Open the site in Chrome.", "Toque em Instalar app, ou no menu ⋮ → Instalar app.": "Tap Install app, or menu ⋮ → Install app.",
      "Computador": "Computer", "No Chrome ou no Edge, clique no ícone de instalar na barra de endereço.": "In Chrome or Edge, click the install icon in the address bar.",
      "Fontes e créditos": "Sources and credits",
      "Notícias: as mais relevantes do dia, escolhidas entre Agência FAPESP, Pesquisa FAPESP, Agência Fiocruz, Jornal da Unicamp, Jornal da USP, Nature, New Scientist, Scientific American e ScienceDaily, com título, um trecho e o link para a matéria original. As notícias são traduzidas automaticamente (serviço MyMemory). Publicações recentes: Europe PMC. Os resumos dos artigos explicados são produzidos pelo GenoEvidence a partir das publicações originais, e as figuras são reproduzidas com crédito.":
        "News: the most relevant of the day, picked from Agência FAPESP, Pesquisa FAPESP, Agência Fiocruz, Jornal da Unicamp, Jornal da USP, Nature, New Scientist, Scientific American and ScienceDaily, with the headline, an excerpt and a link to the original story. Stories are translated automatically (MyMemory service). Recent publications: Europe PMC. The summaries of the explained studies are written by GenoEvidence from the original publications, and figures are reproduced with credit.",
      "Conteúdo educativo: não substitui orientação médica ou aconselhamento genético.": "Educational content: it does not replace medical advice or genetic counseling.",
      // página de cada estudo
      "Carregando o artigo…": "Loading the study…", "Tópicos": "Topics", "Filtrar tópicos…": "Filter topics…", "Filtrar tópicos": "Filter topics",
      "Toque em um tópico para ir direto até ele.": "Tap a topic to jump straight to it.", "← Início do GenoEvidence": "← GenoEvidence home",
      "Abrir menu de tópicos": "Open topics menu", "Fechar menu de tópicos": "Close topics menu", "Fechar menu": "Close menu",
      "Nenhum tópico encontrado.": "No topics found.", "Voltar ao topo": "Back to top", "Imagem ampliada": "Enlarged image",
      "Imagem anterior": "Previous image", "Próxima imagem": "Next image", "Fechar": "Close", "Seções do artigo": "Study sections",
      "Tópicos do artigo": "Study topics", "Ir para o tópico": "Go to topic", "GenoEvidence — ir para o início do app": "GenoEvidence — go to the app home",
      "Aviso": "Notice", "Conteúdo educativo. Não substitui orientação médica.": "Educational content. It does not replace medical advice.",
      "Conteúdo educativo. Não substitui orientação médica. Em caso de acidente com cobra, procure atendimento imediatamente.": "Educational content. It does not replace medical advice. If bitten by a snake, seek care immediately.",
      "Resumo e explicação feitos pelo GenoEvidence a partir do artigo original, com figuras reproduzidas com crédito. Para a versão completa, leia o artigo na revista.":
        "Summary and explanation written by GenoEvidence from the original paper, with figures reproduced with credit. For the full version, read the paper in the journal.",
      "Ler na revista ↗": "Read in the journal ↗", "Ler na revista": "Read in the journal", "Resumo em 1 minuto": "1-minute summary", "Baixar PDF": "Download PDF",
      "Publicado em": "Published in", "Volume · número": "Volume · issue", "Páginas": "Pages", "Publicação": "Publication",
      "Sobre a revista e como citar →": "About the journal and how to cite →", "Em 1 minuto": "In 1 minute", "O artigo em quatro passos": "The study in four steps",
      "Para quem tem pouco tempo: o essencial do estudo, em linguagem simples.": "For those short on time: the essentials of the study, in plain language.",
      "Glossário": "Glossary", "Palavras-chave, sem complicação": "Key terms, made simple", "Os termos técnicos deste artigo explicados de forma simples.": "The technical terms in this study, explained simply.",
      "A revista": "The journal", "Onde este artigo foi publicado": "Where this study was published",
      "Toda evidência tem uma fonte. Leia o artigo completo diretamente na revista.": "All evidence has a source. Read the full paper directly in the journal.",
      "Revista científica": "Scientific journal", "Submetido": "Submitted", "Publicado": "Published", "PDF do artigo ↗": "Paper PDF ↗",
      "Autores": "Authors", "Como citar (ABNT)": "How to cite (ABNT style)", "Copiar citação": "Copy citation", "Copiado": "Copied",
      "Referências": "References", "Referências citadas nesta página": "References cited on this page",
      "Estudos mencionados na explicação acima, com os títulos no idioma original, como pede a norma ABNT. A lista completa está no artigo original.":
        "Studies mentioned in the explanation above, with titles in their original language. The full list is in the original paper.",
      "Revista": "Journal", "Início do artigo": "Start of the study", "Resumo": "Summary", "⤢ ampliar": "⤢ enlarge", "Acessar ↗": "Open ↗",
      "Artigo publicado": "Published study", "Pesquisadora em destaque no GenoEvidence": "Featured researcher on GenoEvidence",
      "Escolha o que comparar": "Choose what to compare",
      // instalar
      "Instalar como app": "Install as app", "Como instalar o GenoEvidence": "How to install GenoEvidence", "Link copiado": "Link copied"
    },
    es: {
      "Início": "Inicio", "Notícias": "Noticias", "Temas": "Temas", "Revistas": "Revistas", "Sobre o app": "Sobre la app",
      "Seções do app": "Secciones de la app", "Sobre o GenoEvidence": "Sobre GenoEvidence", "Abrir o menu": "Abrir el menú",
      "Ir para": "Ir a", "Fechar o menu": "Cerrar el menú", "Filtrar: câncer, Patrícia, DNA…": "Filtrar: cáncer, Patrícia, ADN…",
      "Filtrar o menu": "Filtrar el menú", "Nada encontrado.": "No se encontró nada.", "Páginas": "Páginas", "Pesquisadoras": "Investigadoras",
      "Em destaque": "Destacados", "Notícias da ciência": "Noticias de ciencia", "Estudo em andamento: R337H": "Estudio en curso: R337H",
      "Abrir o tema": "Abrir el tema", "Ver todos os estudos dela": "Ver todos sus estudios", "Menu do GenoEvidence": "Menú de GenoEvidence", "Sobre": "Acerca de", "Desenvolvido por": "Desarrollado por", "Idiomas: o app pode ser lido em português, inglês e espanhol. É só tocar no botão de idioma, no topo da tela. As páginas dos estudos foram traduzidas pelo GenoEvidence.": "Idiomas: la app se puede leer en portugués, inglés y español. Solo toca el botón de idioma, arriba en la pantalla. Las páginas de los estudios fueron traducidas por GenoEvidence.",
      "Destinos": "Destinos", "Idioma": "Idioma", "Escolher idioma": "Elegir idioma",
      "A ciência de hoje,": "La ciencia de hoy,", "explicada": "explicada",
      "Estudos completos, temas e notícias da ciência em linguagem simples, com o link direto para a fonte.": "Estudios completos, temas y noticias de ciencia en lenguaje sencillo, con el enlace directo a la fuente.",
      "Pesquisar estudos, temas, pesquisadoras, notícias…": "Buscar estudios, temas, investigadoras, noticias…",
      "Pesquisar no GenoEvidence": "Buscar en GenoEvidence", "Resultados da pesquisa": "Resultados de la búsqueda",
      "Ver os destaques": "Ver los destacados", "Explorar por tema": "Explorar por tema", "Ver todas →": "Ver todas →",
      "Todos os estudos →": "Todos los estudios →", "Carregando…": "Cargando…", "Estudo em andamento": "Estudio en curso",
      "Ainda não publicado": "Aún no publicado", "A variante R337H no gene TP53 e a Síndrome de Li-Fraumeni": "La variante R337H en el gen TP53 y el síndrome de Li-Fraumeni",
      "Com modelo 3D, gráficos, mapa e todas as evidências reunidas até agora.": "Con modelo 3D, gráficos, mapa y todas las evidencias reunidas hasta ahora.",
      "Abrir estudo →": "Abrir estudio →", "Explore por tema": "Explora por tema", "Ver todos →": "Ver todos →",
      "Leve o GenoEvidence no celular": "Lleva GenoEvidence en tu celular", "Instale como aplicativo e leia mesmo sem internet.": "Instálala como aplicación y lee incluso sin internet.",
      "GenoEvidence · a ciência por trás das evidências ·": "GenoEvidence · la ciencia detrás de las evidencias ·",
      "Bom dia": "Buenos días", "Boa tarde": "Buenas tardes", "Boa noite": "Buenas noches",
      "Autora principal": "Autora principal", "Ler o estudo completo →": "Leer el estudio completo →",
      "Não foi possível carregar os destaques.": "No se pudieron cargar los destacados.", "Sem notícias novas agora.": "No hay noticias nuevas ahora.",
      "Não foi possível carregar as notícias.": "No se pudieron cargar las noticias.", "Estudo": "Estudio", "Tema": "Tema", "Pesquisadora": "Investigadora", "Notícia": "Noticia",
      "Não foi possível carregar os estudos.": "No se pudieron cargar los estudios.",
      "Notícias da ciência · escolhidas todos os dias": "Noticias de ciencia · elegidas todos los días", "O que importa hoje": "Lo que importa hoy",
      "Só as notícias de ciência mais relevantes do dia: as principais de fontes brasileiras e do mundo, com as estrangeiras traduzidas para o português. Toque em uma notícia para ler na fonte original.":
        "Solo las noticias de ciencia más relevantes del día, de fuentes brasileñas e internacionales, traducidas al español. Toca una noticia para leerla en la fuente original.",
      "Todas": "Todas", "Fontes do Brasil": "Fuentes de Brasil", "Genética": "Genética", "Câncer": "Cáncer", "Saúde": "Salud",
      "Meio ambiente": "Medio ambiente", "Espaço": "Espacio", "Ciência": "Ciencia", "Carregando as notícias de hoje…": "Cargando las noticias de hoy…",
      "Mostrar mais notícias": "Mostrar más noticias", "Filtrar notícias": "Filtrar noticias", "Em alta": "Tendencia",
      "Nenhuma notícia neste filtro hoje.": "No hay noticias en este filtro hoy.", "Sem conexão para carregar as notícias agora.": "Sin conexión para cargar las noticias ahora.",
      "traduzido": "traducido", "Toque em uma notícia para ler na fonte original.": "Toca una noticia para leerla en la fuente original.",
      "Artigos por tema": "Estudios por tema",
      "Escolha um tema e veja os estudos explicados em linguagem simples. Toque em um estudo para abrir a página completa dele, com imagens, gráficos e o link para a revista.":
        "Elige un tema y ve los estudios explicados en lenguaje sencillo. Toca un estudio para abrir su página completa, con imágenes, gráficos y el enlace a la revista.",
      "Buscar artigo, revista ou palavra…": "Buscar estudio, revista o palabra…", "Buscar artigos": "Buscar estudios",
      "Filtrar por pesquisadora": "Filtrar por investigadora", "Pesquisadoras:": "Investigadoras:", "Nenhum artigo encontrado.": "No se encontraron estudios.",
      "Não foi possível carregar os artigos.": "No se pudieron cargar los estudios.", "Ler →": "Leer →",
      "Fontes originais": "Fuentes originales", "Onde a ciência está sendo publicada: as revistas dos artigos explicados no app e o que acabou de sair.": "Dónde se está publicando la ciencia: las revistas de los estudios explicados en la app y lo que acaba de salir.",
      "Revistas dos artigos explicados": "Revistas de los estudios explicados", "Publicações recentes": "Publicaciones recientes",
      "Filtrar por revista": "Filtrar por revista", "As revistas dos artigos explicados aparecem aqui.": "Aquí aparecen las revistas de los estudios explicados.",
      "Nenhuma publicação nova.": "No hay publicaciones nuevas.", "Site da revista ↗": "Sitio de la revista ↗", "acesso aberto": "acceso abierto",
      "Artigos publicados nas últimas semanas sobre os temas dos artigos explicados no app: genética do câncer, variantes germinativas, venenos de serpentes e antivenenos (fonte: Europe PMC).":
        "Artículos publicados en las últimas semanas sobre los temas de los estudios explicados en la app: genética del cáncer, variantes germinales, venenos de serpiente y antivenenos (fuente: Europe PMC).",
      "A ciência por trás das evidências.": "La ciencia detrás de las evidencias.",
      "O GenoEvidence reúne, num só lugar, o que a ciência está publicando agora e a explicação aprofundada de artigos selecionados, sempre com o caminho de volta para a fonte original.":
        "GenoEvidence reúne, en un solo lugar, lo que la ciencia está publicando ahora y la explicación a fondo de artículos seleccionados, siempre con el camino de vuelta a la fuente original.",
      "Como funciona": "Cómo funciona", "Notícias do dia": "Noticias del día",
      "Todos os dias o app reúne notícias de ciência e saúde da Agência FAPESP, do Jornal da USP, da Nature e do ScienceDaily.": "Todos los días la app reúne noticias de ciencia y salud de fuentes brasileñas e internacionales.",
      "Estudos por tema": "Estudios por tema",
      "Cada estudo publicado ganha uma página com resumo em 1 minuto, explicação simples, gráficos, imagens, glossário e o título traduzido, organizada por tema.":
        "Cada estudio publicado tiene una página con resumen en 1 minuto, explicación sencilla, gráficos, imágenes, glosario y el título traducido, organizada por tema.",
      "Direto da revista": "Directo de la revista", "Cada artigo mostra a revista em que foi publicado, com o DOI e o botão Ler na revista.": "Cada estudio muestra la revista en que fue publicado, con el DOI y el botón Leer en la revista.",
      "Instalar como aplicativo": "Instalar como aplicación", "iPhone ou iPad": "iPhone o iPad",
      "Abra o site no Safari (não dentro do WhatsApp ou do Instagram).": "Abre el sitio en Safari (no dentro de WhatsApp o Instagram).",
      "Toque em Compartilhar, o quadrado com a seta para cima.": "Toca Compartir, el cuadrado con la flecha hacia arriba.",
      "Role a lista e toque em Adicionar à Tela de Início.": "Desplaza la lista y toca Agregar a inicio.",
      "Abra o site no Chrome.": "Abre el sitio en Chrome.", "Toque em Instalar app, ou no menu ⋮ → Instalar app.": "Toca Instalar app, o en el menú ⋮ → Instalar app.",
      "Computador": "Computadora", "No Chrome ou no Edge, clique no ícone de instalar na barra de endereço.": "En Chrome o Edge, haz clic en el ícono de instalar en la barra de direcciones.",
      "Fontes e créditos": "Fuentes y créditos",
      "Notícias: as mais relevantes do dia, escolhidas entre Agência FAPESP, Pesquisa FAPESP, Agência Fiocruz, Jornal da Unicamp, Jornal da USP, Nature, New Scientist, Scientific American e ScienceDaily, com título, um trecho e o link para a matéria original. As notícias são traduzidas automaticamente (serviço MyMemory). Publicações recentes: Europe PMC. Os resumos dos artigos explicados são produzidos pelo GenoEvidence a partir das publicações originais, e as figuras são reproduzidas com crédito.":
        "Noticias: las más relevantes del día, elegidas entre Agência FAPESP, Pesquisa FAPESP, Agência Fiocruz, Jornal da Unicamp, Jornal da USP, Nature, New Scientist, Scientific American y ScienceDaily, con el título, un fragmento y el enlace a la nota original. Se traducen automáticamente (servicio MyMemory). Publicaciones recientes: Europe PMC. Los resúmenes de los estudios explicados son elaborados por GenoEvidence a partir de las publicaciones originales, y las figuras se reproducen con crédito.",
      "Conteúdo educativo: não substitui orientação médica ou aconselhamento genético.": "Contenido educativo: no sustituye la orientación médica ni el asesoramiento genético.",
      "Carregando o artigo…": "Cargando el estudio…", "Tópicos": "Temas", "Filtrar tópicos…": "Filtrar temas…", "Filtrar tópicos": "Filtrar temas",
      "Toque em um tópico para ir direto até ele.": "Toca un tema para ir directo a él.", "← Início do GenoEvidence": "← Inicio de GenoEvidence",
      "Abrir menu de tópicos": "Abrir menú de temas", "Fechar menu de tópicos": "Cerrar menú de temas", "Fechar menu": "Cerrar menú",
      "Nenhum tópico encontrado.": "No se encontraron temas.", "Voltar ao topo": "Volver arriba", "Imagem ampliada": "Imagen ampliada",
      "Imagem anterior": "Imagen anterior", "Próxima imagem": "Imagen siguiente", "Fechar": "Cerrar", "Seções do artigo": "Secciones del estudio",
      "Tópicos do artigo": "Temas del estudio", "Ir para o tópico": "Ir al tema", "GenoEvidence — ir para o início do app": "GenoEvidence — ir al inicio de la app",
      "Aviso": "Aviso", "Conteúdo educativo. Não substitui orientação médica.": "Contenido educativo. No sustituye la orientación médica.",
      "Conteúdo educativo. Não substitui orientação médica. Em caso de acidente com cobra, procure atendimento imediatamente.": "Contenido educativo. No sustituye la orientación médica. Ante una mordedura de serpiente, busca atención de inmediato.",
      "Resumo e explicação feitos pelo GenoEvidence a partir do artigo original, com figuras reproduzidas com crédito. Para a versão completa, leia o artigo na revista.":
        "Resumen y explicación elaborados por GenoEvidence a partir del artículo original, con figuras reproducidas con crédito. Para la versión completa, lee el artículo en la revista.",
      "Ler na revista ↗": "Leer en la revista ↗", "Ler na revista": "Leer en la revista", "Resumo em 1 minuto": "Resumen en 1 minuto", "Baixar PDF": "Descargar PDF",
      "Publicado em": "Publicado en", "Volume · número": "Volumen · número", "Páginas": "Páginas", "Publicação": "Publicación",
      "Sobre a revista e como citar →": "Sobre la revista y cómo citar →", "Em 1 minuto": "En 1 minuto", "O artigo em quatro passos": "El estudio en cuatro pasos",
      "Para quem tem pouco tempo: o essencial do estudo, em linguagem simples.": "Para quien tiene poco tiempo: lo esencial del estudio, en lenguaje sencillo.",
      "Glossário": "Glosario", "Palavras-chave, sem complicação": "Palabras clave, sin complicaciones", "Os termos técnicos deste artigo explicados de forma simples.": "Los términos técnicos de este estudio explicados de forma sencilla.",
      "A revista": "La revista", "Onde este artigo foi publicado": "Dónde se publicó este estudio",
      "Toda evidência tem uma fonte. Leia o artigo completo diretamente na revista.": "Toda evidencia tiene una fuente. Lee el artículo completo directamente en la revista.",
      "Revista científica": "Revista científica", "Submetido": "Enviado", "Publicado": "Publicado", "PDF do artigo ↗": "PDF del artículo ↗",
      "Autores": "Autores", "Como citar (ABNT)": "Cómo citar (norma ABNT)", "Copiar citação": "Copiar cita", "Copiado": "Copiado",
      "Referências": "Referencias", "Referências citadas nesta página": "Referencias citadas en esta página",
      "Estudos mencionados na explicação acima, com os títulos no idioma original, como pede a norma ABNT. A lista completa está no artigo original.":
        "Estudios mencionados en la explicación anterior, con los títulos en su idioma original. La lista completa está en el artículo original.",
      "Revista": "Revista", "Início do artigo": "Inicio del estudio", "Resumo": "Resumen", "⤢ ampliar": "⤢ ampliar", "Acessar ↗": "Abrir ↗",
      "Artigo publicado": "Estudio publicado", "Pesquisadora em destaque no GenoEvidence": "Investigadora destacada en GenoEvidence",
      "Escolha o que comparar": "Elige qué comparar",
      "Instalar como app": "Instalar como app", "Como instalar o GenoEvidence": "Cómo instalar GenoEvidence", "Link copiado": "Enlace copiado"
    }
  };
  // textos com números ou nomes (o {n} e o {x} são trocados na hora)
  var P = {
    en: [
      [/^(\d+) estudos?$/, function (m) { return m[1] + (m[1] === "1" ? " study" : " studies"); }],
      [/^(\d+) temas · (\d+) estudos$/, "$1 topics · $2 studies"],
      [/^Ver todos os (\d+) estudos de (.+) →$/, "See all $1 studies by $2 →"],
      [/^Todos os artigos de (.+)$/, "All papers from $1"],
      [/^(\d+) artigos? explicados? no app$/, function (m) { return m[1] + (m[1] === "1" ? " study explained in the app" : " studies explained in the app"); }],
      [/^Voltar para o tema (.+)$/, "Back to the $1 topic"],
      [/^Nada encontrado para “(.+)”\. Tente outra palavra, como câncer, DNA ou bactéria\.$/, "Nothing found for “$1”. Try another word, like cancer, DNA or bacteria."],
      [/^Atualizado (.+) · notícias novas todos os dias\.$/, "Updated $1 · new stories every day."],
      [/^Atualizado (.+)\. Escolhidas entre: (.+)\.$/, "Updated $1. Picked from: $2."],
      [/^hoje às (.+)$/, "today at $1"],
      [/^(.+) · GenoEvidence$/, function (m) { return t(m[1]) + " · GenoEvidence"; }],
      [/^Título original em (inglês|português):$/, function (m) { return "Original title in " + (m[1] === "inglês" ? "English" : "Portuguese") + ":"; }]
    ],
    es: [
      [/^(\d+) estudos?$/, function (m) { return m[1] + (m[1] === "1" ? " estudio" : " estudios"); }],
      [/^(\d+) temas · (\d+) estudos$/, "$1 temas · $2 estudios"],
      [/^Ver todos os (\d+) estudos de (.+) →$/, "Ver los $1 estudios de $2 →"],
      [/^Todos os artigos de (.+)$/, "Todos los artículos de $1"],
      [/^(\d+) artigos? explicados? no app$/, function (m) { return m[1] + (m[1] === "1" ? " estudio explicado en la app" : " estudios explicados en la app"); }],
      [/^Voltar para o tema (.+)$/, "Volver al tema $1"],
      [/^Nada encontrado para “(.+)”\. Tente outra palavra, como câncer, DNA ou bactéria\.$/, "No se encontró nada para “$1”. Prueba otra palabra, como cáncer, ADN o bacteria."],
      [/^Atualizado (.+) · notícias novas todos os dias\.$/, "Actualizado $1 · noticias nuevas todos los días."],
      [/^Atualizado (.+)\. Escolhidas entre: (.+)\.$/, "Actualizado $1. Elegidas entre: $2."],
      [/^hoje às (.+)$/, "hoy a las $1"],
      [/^(.+) · GenoEvidence$/, function (m) { return t(m[1]) + " · GenoEvidence"; }],
      [/^Título original em (inglês|português):$/, function (m) { return "Título original en " + (m[1] === "inglês" ? "inglés" : "portugués") + ":"; }]
    ]
  };

  var normal = function (s) { return String(s).replace(/\s+/g, " ").trim(); };
  function t(pt) {
    if (lang === "pt" || pt == null) return pt;
    var k = normal(pt), d = D[lang];
    if (Object.prototype.hasOwnProperty.call(d, k)) return d[k];
    var ps = P[lang];
    for (var i = 0; i < ps.length; i++) {
      var m = k.match(ps[i][0]);
      if (m) return typeof ps[i][1] === "function" ? ps[i][1](m) : k.replace(ps[i][0], ps[i][1]);
    }
    return pt;
  }
  // outras páginas (ex.: R337H) podem acrescentar o próprio dicionário: GE_I18N.acrescentar({en:{…}, es:{…}}, {en:[…], es:[…]})
  function acrescentar(dic, pad) {
    ["en", "es"].forEach(function (l) {
      if (dic && dic[l]) for (var k in dic[l]) D[l][normal(k)] = dic[l][k];
      if (pad && pad[l]) P[l] = pad[l].concat(P[l]);
    });
  }
  // campo traduzido de um item de dados: item.i18n[idioma][campo], ou o original
  function L(obj, campo) {
    if (!obj) return "";
    var tr = obj.i18n && obj.i18n[lang];
    return (tr && tr[campo] != null) ? tr[campo] : obj[campo];
  }

  /* ---------------- tradução automática dos textos da página ---------------- */
  var ATRIBUTOS = ["placeholder", "aria-label", "title", "alt"];
  var PULAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  // proteção: se algo ficar trocando o mesmo texto sem parar, a tradução automática se desliga
  var trocas = 0, janela = 0, obs = null, ultimas = [], desligado = false;
  function fusivel(txt) {
    var agora = Date.now();
    if (agora - janela > 1000) { janela = agora; trocas = 0; }
    ultimas.push(txt); if (ultimas.length > 6) ultimas.shift();
    if (desligado) return true;
    if (++trocas > 4000) { desligado = true; if (obs) obs.disconnect(); console.warn("GE_I18N: tradução automática desligada (textos em repetição)", ultimas); return true; }
    return false;
  }
  function traduzirTexto(no) {
    var v = no.nodeValue; if (!v || !/[A-Za-zÀ-ú]/.test(v)) return;
    var r = t(v); if (r === v) return;
    var ini = v.match(/^\s*/)[0], fim = v.match(/\s*$/)[0];
    var novo = ini + r + fim;   // mantém os espaços das pontas; só troca se o texto mudar de fato
    if (novo !== v && !fusivel(v)) no.nodeValue = novo;
  }
  function traduzirElemento(el) {
    if (PULAR[el.tagName] || (el.closest && el.closest("[data-sem-traducao]"))) return;
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = el.getAttribute && el.getAttribute(ATRIBUTOS[i]);
      if (a) { var n = t(a); if (n !== a && n !== normal(a) && !fusivel(a)) el.setAttribute(ATRIBUTOS[i], n); }
    }
  }
  function traduzir(raiz) {
    if (lang === "pt" || !raiz) return;
    if (raiz.nodeType === 3) { if (raiz.parentElement && !PULAR[raiz.parentElement.tagName] && !raiz.parentElement.closest("[data-sem-traducao]")) traduzirTexto(raiz); return; }
    if (raiz.nodeType !== 1) return;
    traduzirElemento(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.nodeType === 1 ? n : n.parentElement;
        if (!p || PULAR[p.tagName] || p.closest("[data-sem-traducao]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) traduzirTexto(n); else traduzirElemento(n); }
  }
  if (lang !== "pt") {
    obs = new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === "attributes") traduzirElemento(m.target);
        else if (m.type === "characterData") traduzirTexto(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) traduzir(m.addedNodes[j]);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
    document.addEventListener("DOMContentLoaded", function () {
      traduzir(document.body); document.title = t(document.title);
      [].forEach.call(document.querySelectorAll('[lang="pt-BR"]'), function (e) { if (e !== document.documentElement) e.lang = lang; });
    });
  }

  /* ---------------- seletor 🌐 PT · EN · ES ---------------- */
  var CSS = ".ge-idioma{position:relative;flex:none}" +
    ".ge-idioma>button{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:999px;border:1px solid rgba(127,127,127,.28);background:transparent;color:inherit;font:600 12.5px/1 'IBM Plex Mono',ui-monospace,monospace;cursor:pointer}" +
    ".ge-idioma>button svg{width:16px;height:16px}" +
    ".ge-idioma ul{position:absolute;right:0;top:calc(100% + 6px);z-index:120;list-style:none;margin:0;padding:6px;min-width:150px;border-radius:12px;background:#fff;color:#0F1730;box-shadow:0 14px 34px rgba(16,22,38,.18);border:1px solid #E6E9F0}" +
    ".ge-idioma ul[hidden]{display:none}" +
    ".ge-idioma li button{display:flex;width:100%;justify-content:space-between;gap:10px;padding:9px 10px;border:0;border-radius:8px;background:none;color:inherit;font:500 14px/1.2 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer;text-align:left}" +
    ".ge-idioma li button:hover,.ge-idioma li button[aria-current='true']{background:#F2ECFE;color:#5B35C9}" +
    ".ge-idioma li small{font:600 11px/1.2 'IBM Plex Mono',monospace;opacity:.6}";
  function montarSeletor(onde, antes) {
    if (!onde || onde.querySelector(".ge-idioma")) return;
    if (!document.getElementById("ge-idioma-css")) { var st = document.createElement("style"); st.id = "ge-idioma-css"; st.textContent = CSS; document.head.appendChild(st); }
    var box = document.createElement("div"); box.className = "ge-idioma"; box.setAttribute("data-sem-traducao", "");
    box.innerHTML = '<button type="button" aria-haspopup="true" aria-expanded="false" aria-label="' + t("Escolher idioma") + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>' +
      IDIOMAS[lang].curto + "</button><ul hidden>" +
      Object.keys(IDIOMAS).map(function (c) { return '<li><button type="button" data-lang="' + c + '"' + (c === lang ? ' aria-current="true"' : "") + ">" + IDIOMAS[c].nome + "<small>" + IDIOMAS[c].curto + "</small></button></li>"; }).join("") + "</ul>";
    var bt = box.querySelector("button"), ul = box.querySelector("ul");
    bt.addEventListener("click", function (e) { e.stopPropagation(); var abre = ul.hidden; ul.hidden = !abre; bt.setAttribute("aria-expanded", String(abre)); });
    document.addEventListener("click", function () { ul.hidden = true; bt.setAttribute("aria-expanded", "false"); });
    ul.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lang]"); if (!b) return;
      var novo = b.dataset.lang;
      try { localStorage.setItem("ge-idioma", novo); } catch (er) {}
      var u = new URL(location.href); u.searchParams.delete("lang");
      if (versoes) { // página com versões em arquivos separados
        var mp = {}; versoes.content.split(",").forEach(function (p) { var kv = p.split(":"); mp[kv[0].trim()] = kv[1].trim(); });
        if (mp[novo]) { location.href = mp[novo] + location.hash; return; }
      }
      location.href = u.pathname + u.search + u.hash;
    });
    if (antes && antes.parentNode === onde) onde.insertBefore(box, antes); else onde.appendChild(box);
  }
  // páginas de estudo e do R337H (barra escura fixa): o seletor entra sozinho na barra
  document.addEventListener("DOMContentLoaded", function () {
    var hud = document.querySelector(".hud-in");
    if (hud) montarSeletor(hud, null);
  });

  window.GE_I18N = { lang: lang, locale: IDIOMAS[lang].locale, idiomas: IDIOMAS, t: t, L: L, montarSeletor: montarSeletor, traduzir: traduzir, acrescentar: acrescentar };
})();
