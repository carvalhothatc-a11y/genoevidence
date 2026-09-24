/* GenoEvidence · abas do app (Início, Notícias, Artigos, Revistas, Sobre)
   - monta a barra do topo e a barra de abas (celular) em todas as páginas
   - carrega o conteúdo de cada aba a partir de data/noticias.json e data/artigos.json
   Cada página diz quem ela é em <body data-pagina="...">. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const RAIZ = (document.querySelector('meta[name="ge-root"]') || {}).content || "./";
  const PAGINA = document.body.dataset.pagina;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = u => fetch(RAIZ + u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  /* ---------- barra do topo e abas ---------- */
  const ICONES = {
    inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    noticias: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    artigos: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><circle cx="17.25" cy="17.25" r="3.75"/>',
    revistas: '<path d="M5 4v16M10 4v16"/><path d="M14.5 5.5l4.2 14"/><path d="M3 20h18"/>',
    sobre: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[n] + "</svg>";
  const ABAS = [["inicio", "Início", ""], ["noticias", "Notícias", "noticias/"], ["artigos", "Temas", "artigos/"], ["revistas", "Revistas", "revistas/"]];
  const atual = n => (n === PAGINA ? ' aria-current="page"' : "");
  const topo = $("#appbar");
  if (topo) {
    topo.className = "appbar";
    topo.innerHTML = '<div class="appbar-in"><button class="menu-btn" id="menuBtn" type="button" aria-label="Abrir o menu" aria-expanded="false" aria-controls="gaveta"><span></span><span></span><span></span></button>' +
      '<a class="logo" href="' + RAIZ + '" aria-label="GenoEvidence, início"><i></i><b>GenoEvidence</b></a>' +
      '<nav class="tabs-top" aria-label="Seções do app">' + ABAS.map(([n, l, h]) => '<a class="tab-' + n + '" href="' + RAIZ + h + '"' + atual(n) + ">" + l + "</a>").join("") + "</nav>" +
      '<a class="icon-btn" href="' + RAIZ + 'sobre/" aria-label="Sobre o GenoEvidence"' + atual("sobre") + ">" + svg("sobre") + "</a></div>";
  }
  const abas = $("#tabbar");
  if (abas) {
    abas.className = "tabbar";
    abas.setAttribute("aria-label", "Seções do app");
    abas.innerHTML = ABAS.map(([n, l, h]) => '<a class="tab-' + n + '" href="' + RAIZ + h + '"' + atual(n) + ">" + svg(n) + "<span>" + l + "</span></a>").join("");
  }

  /* ---------- menu de barrinhas: um painel lateral com filtro para ir a qualquer lugar ---------- */
  function montarMenu() {
    const btn = $("#menuBtn"); if (!btn) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div class="gaveta-fundo" id="gavetaFundo"></div>' +
      '<aside class="gaveta" id="gaveta" aria-label="Menu do GenoEvidence" aria-hidden="true">' +
      '<div class="gaveta-topo"><b>Ir para</b><button type="button" class="gaveta-fechar" id="gavetaFechar" aria-label="Fechar o menu">✕</button></div>' +
      '<input type="search" id="gavetaBusca" class="search" placeholder="Filtrar: câncer, Patrícia, DNA…" aria-label="Filtrar o menu" autocomplete="off">' +
      '<nav id="gavetaLista" aria-label="Destinos"></nav><p class="gaveta-vazio" id="gavetaVazio" hidden>Nada encontrado.</p></aside>');
    const gav = $("#gaveta"), fundo = $("#gavetaFundo"), busca = $("#gavetaBusca"), lista = $("#gavetaLista");
    const grupo = (titulo, itens) => itens.length ? '<div class="gv-grupo"><p class="gv-titulo">' + esc(titulo) + "</p>" + itens.map(i =>
      '<a class="gv-item" href="' + esc(i.href) + '" data-busca="' + esc((i.nome + " " + (i.extra || "")).toLowerCase()) + '"' + (i.cor ? ' style="--c:' + esc(i.cor) + '"' : "") + ">" +
      (i.cor ? "<i></i>" : "") + "<span>" + esc(i.nome) + "</span>" + (i.n != null ? '<em>' + i.n + "</em>" : "") + "</a>").join("") + "</div>" : "";
    const paginas = [
      { nome: "Início", href: RAIZ }, { nome: "Em destaque", href: RAIZ + "#destaques", extra: "pesquisadoras" },
      { nome: "Notícias da ciência", href: RAIZ + "noticias/", extra: "hoje" }, { nome: "Temas", href: RAIZ + "artigos/", extra: "artigos estudos" },
      { nome: "Revistas", href: RAIZ + "revistas/", extra: "publicações" }, { nome: "Estudo em andamento: R337H", href: RAIZ + "r337h/", extra: "tp53 li-fraumeni dna" },
      { nome: "Sobre o app", href: RAIZ + "sobre/", extra: "instalar" }];
    lista.innerHTML = grupo("Páginas", paginas);
    getJSON("data/artigos.json").then(d => {
      const arts = d.artigos || [];
      const temas = (d.temas || []).map(t => ({ nome: t.nome, href: RAIZ + "artigos/#" + t.id, cor: t.cor, extra: t.sobre, n: arts.filter(a => (a.temas || []).includes(t.id)).length })).filter(t => t.n);
      const pesq = (d.pesquisadoras || []).map(p => ({ nome: p.nome, href: RAIZ + "artigos/?pesquisadora=" + p.id, cor: p.cor, extra: p.vinculo, n: arts.filter(a => (a.pesquisadoras || []).includes(p.id)).length }));
      const estudos = arts.map(a => ({ nome: a.titulo_curto, href: RAIZ + a.url, extra: [a.titulo, a.titulo_pt, a.resumo, (a.tags || []).join(" "), (a.revista || {}).nome, a.autores_curto].join(" ") }));
      lista.innerHTML = grupo("Páginas", paginas) + grupo("Temas", temas) + grupo("Pesquisadoras", pesq) + grupo("Estudos", estudos);
      filtrar();
    }).catch(() => {});
    const norm = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    function filtrar() {
      const v = norm(busca.value.trim());
      $$(".gv-grupo", lista).forEach(g => {
        let algum = false;
        $$(".gv-item", g).forEach(a => { const ok = !v || norm(a.dataset.busca).includes(v); a.hidden = !ok; algum = algum || ok; });
        g.hidden = !algum;
      });
      $("#gavetaVazio").hidden = $$(".gv-grupo", lista).some(g => !g.hidden);
    }
    function abrir(sim) {
      gav.classList.toggle("aberta", sim); fundo.classList.toggle("aberta", sim);
      gav.setAttribute("aria-hidden", String(!sim)); btn.setAttribute("aria-expanded", String(sim));
      document.documentElement.classList.toggle("sem-rolagem", sim);
      if (sim) setTimeout(() => busca.focus({ preventScroll: true }), 180); else btn.focus({ preventScroll: true });
    }
    btn.addEventListener("click", () => abrir(true));
    fundo.addEventListener("click", () => abrir(false));
    $("#gavetaFechar").addEventListener("click", () => abrir(false));
    addEventListener("keydown", e => { if (e.key === "Escape" && gav.classList.contains("aberta")) abrir(false); });
    busca.addEventListener("input", filtrar);
    lista.addEventListener("click", e => { if (e.target.closest(".gv-item")) abrir(false); });
  }
  montarMenu();

  /* ---------- utilidades ---------- */
  const CORES = ["#7C9CFF", "#FFB23F", "#5FD39A", "#FF8A9D", "#A58CFF", "#3FC1C9", "#F4A6FF", "#7FD1FF"];
  const corDe = nome => { let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]; };
  const sigla = nome => nome.replace(/\(.*?\)/g, "").split(/\s+/).filter(w => /^[A-Za-zÀ-ú]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "R";
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  function quando(iso) {
    const d = new Date(iso), s = (d - Date.now()) / 1000, a = Math.abs(s);
    if (isNaN(d)) return "";
    if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const diaMes = iso => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const revistaBusca = nome => "https://europepmc.org/search?query=" + encodeURIComponent('JOURNAL:"' + nome + '"');
  function atualizadoTxt(iso) {
    const at = new Date(iso);
    return at.toDateString() === new Date().toDateString()
      ? "hoje às " + at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : at.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  }
  function entrar(nodes) {
    if (RM) return;
    nodes.forEach((n, i) => n.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: Math.min(i, 10) * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  }
  const linhaNoticia = n =>
    '<li><a class="row" href="' + esc(n.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="t" data-t="' + esc(n.tema) + '">' + esc(n.tema) + '</span><span class="src">' + esc(n.fonte) + '</span><span class="dot">' + esc(quando(n.data)) + '</span><span class="dot"' + (n.traduzido ? ' title="Original em inglês: ' + esc(n.titulo_original) + '"' : "") + ">" + (n.idioma === "pt" ? "PT" : n.traduzido ? "traduzido do inglês" : "EN") + "</span></div>" +
    "<h3>" + esc(n.titulo) + '<span class="ext">↗</span></h3>' + (n.resumo && (n.idioma === "pt" || n.resumo_original) ? "<p>" + esc(n.resumo) + "</p>" : "") + "</a></li>";
  const linhaPublicacao = a =>
    '<li><a class="row" href="' + esc(a.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="pill j" style="--j:' + corDe(a.revista) + '">' + esc(a.revista) + '</span><span>' + esc(diaMes(a.data)) + "</span>" +
    (a.acesso_aberto ? '<span class="oa">acesso aberto</span>' : "") + (a.traduzido ? '<span class="dot" title="Original em inglês: ' + esc(a.titulo_original) + '">traduzido do inglês</span>' : "") + "</div><h3>" + esc(a.titulo) + '<span class="ext">↗</span></h3>' + (a.autores ? "<p>" + esc(a.autores) + "</p>" : "") + "</a></li>";
  let PESQ = {}; // id → pesquisadora (preenchido quando data/artigos.json carrega)
  function cartaoArtigo(a) {
    const r = a.revista || {};
    const quem = (a.pesquisadoras || []).map(id => PESQ[id]).filter(Boolean);
    return '<a class="card art-card" href="' + RAIZ + esc(a.url) + '">' +
      (a.capa ? '<div class="art-cover" role="img" aria-label="' + esc(a.capa_alt || "") + '" style="background-image:url(\'' + RAIZ + esc(a.capa) + '\')"></div>' : "") +
      '<div class="art-body"><div class="tags">' + (r.nome ? '<span class="pill j" style="--j:' + corDe(r.nome) + '">' + esc(r.nome) + (r.ano ? " · " + esc(r.ano) : "") + "</span>" : a.selo ? '<span class="pill andamento">' + esc(a.selo) + "</span>" : "") +
      (a.tags || []).slice(0, 2).map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" +
      "<h3>" + esc(a.titulo_curto || a.titulo) + '</h3><p class="res">' + esc(a.resumo) + "</p>" +
      quem.map(p => '<p class="pesq-tag" style="--c:' + esc(p.cor) + '"><span class="av-mini">' + esc(p.iniciais) + "</span>" + esc(p.nome) + "</p>").join("") +
      '<div class="art-foot"><span class="jr">' + esc(a.autores_curto || "") + '</span><span class="read">Ler →</span></div></div></a>';
  }

  /* ---------- Início ---------- */
  function inicio() {
    const h = new Date().getHours();
    $("#saudacao").textContent = (h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite") + " · " + new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    getJSON("data/artigos.json").then(d => {
      const arts = d.artigos || [];
      // em destaque: o artigo publicado mais recente de cada pesquisadora
      $("#destaquesPesq").innerHTML = (d.pesquisadoras || []).map(p => {
        const dela = arts.filter(a => (a.pesquisadoras || []).includes(p.id)).sort((x, y) => String(y.data).localeCompare(String(x.data)));
        // destaque: o mais recente em que ela é a autora principal (primeira autora)
        const a = dela.find(x => x.primeira_autora === p.id) || dela[0]; if (!a) return "";
        const r = a.revista || {}, nome1 = p.nome.split(" ")[0];
        return '<article class="destaque-card" style="--c:' + esc(p.cor) + '"><a class="dc-link" href="' + RAIZ + esc(a.url) + '">' +
          '<div class="dc-img" role="img" aria-label="' + esc(a.capa_alt || "") + '" style="background-image:url(\'' + RAIZ + esc(a.capa) + '\')"></div>' +
          '<div class="dc-body"><div class="pesq-head"><span class="av" aria-hidden="true">' + esc(p.iniciais) + "</span><div><b>" + esc(p.nome) + "</b><span>" + esc(p.vinculo || "") + "</span></div></div>" +
          (a.primeira_autora === p.id ? '<span class="autora">Autora principal</span>' : "") +
          '<span class="pill j" style="--j:' + corDe(r.nome || "") + '">Publicado em ' + esc(r.nome || "") + (r.ano ? " · " + esc(r.ano) : "") + "</span>" +
          "<h3>" + esc(a.titulo_curto) + "</h3><p>" + esc(a.resumo) + '</p><span class="go">Ler o estudo completo →</span></div></a>' +
          '<a class="dc-todos" href="' + RAIZ + "artigos/?pesquisadora=" + esc(p.id) + '">Ver todos os ' + dela.length + " estudos de " + esc(nome1) + " →</a></article>";
      }).join("");
      entrar($$(".destaque-card"));
      $("#temasInicio").innerHTML = (d.temas || []).map(t => { const n = arts.filter(x => (x.temas || []).includes(t.id)).length;
        return n ? '<a class="tema-tile" href="' + RAIZ + "artigos/#" + esc(t.id) + '" style="--c:' + esc(t.cor) + '"><b>' + esc(t.nome) + "</b><span>" + n + (n > 1 ? " estudos" : " estudo") + "</span></a>" : ""; }).join("");
      entrar($$(".tema-tile"));
    }).catch(() => { $("#destaquesPesq").innerHTML = '<p class="loading">Não foi possível carregar os destaques.</p>'; });
    getJSON("data/noticias.json").then(d => {
      const ns = d.noticias || [];
      // as 3 mais relevantes do dia (o robô já as ordena), no máximo 2 da mesma fonte
      const porFonte = {}, escolha = [];
      for (const n of ns.filter(n => n.idioma === "pt" || n.traduzido)) {
        if (escolha.length === 3) break;
        if ((porFonte[n.fonte] || 0) < 2) { porFonte[n.fonte] = (porFonte[n.fonte] || 0) + 1; escolha.push(n); }
      }
      $("#hojeNoticias").innerHTML = escolha.map(n => '<li><a class="row" href="' + esc(n.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="t" data-t="' + esc(n.tema) + '">' + esc(n.tema) + '</span><span class="src">' + esc(n.fonte) + '</span><span class="dot">' + esc(quando(n.data)) + "</span></div><h3>" + esc(n.titulo) + '<span class="ext">↗</span></h3></a></li>').join("") || '<li class="empty">Sem notícias novas agora.</li>';
      if (d.atualizado_em) $("#atualizado").textContent = "Atualizado " + atualizadoTxt(d.atualizado_em) + " · notícias novas todos os dias.";
      entrar($$("#hojeNoticias li"));
    }).catch(() => { $("#hojeNoticias").innerHTML = '<li class="empty">Não foi possível carregar as notícias.</li>'; });
  }

  /* ---------- Notícias ---------- */
  function noticias() {
    let todas = [], filtro = "todas", mostrar = 15;
    const lista = $("#lista"), mais = $("#mais"), chips = $("#filtros");
    const passa = n => filtro === "todas" || (filtro === "pt" ? n.idioma === "pt" : n.tema === filtro);
    function render() {
      const itens = todas.filter(passa);
      // as 3 primeiras (as mais relevantes do dia) ganham a etiqueta "Em alta"
      lista.innerHTML = itens.slice(0, mostrar).map((n, i) => linhaNoticia(n).replace('<div class="meta">', '<div class="meta">' + (filtro === "todas" && i < 3 ? '<span class="hot">Em alta</span>' : ""))).join("") || '<li class="empty">Nenhuma notícia neste filtro hoje.</li>';
      mais.hidden = itens.length <= mostrar;
      entrar($$("li", lista));
    }
    chips.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      filtro = b.dataset.f; mostrar = 15;
      $$(".chip", chips).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    mais.addEventListener("click", () => { mostrar += 12; render(); });
    getJSON("data/noticias.json").then(d => {
      todas = d.noticias || [];
      $$(".chip", chips).forEach(b => {
        const f = b.dataset.f, n = todas.filter(x => f === "todas" || (f === "pt" ? x.idioma === "pt" : x.tema === f)).length;
        b.insertAdjacentHTML("beforeend", '<span class="n">' + n + "</span>"); b.hidden = !n && f !== "todas";
      });
      render();
      const fontes = (d.fontes || []).filter(f => f !== "Europe PMC").map(f => f.split(" · ")[0]).filter((v, i, a) => a.indexOf(v) === i);
      $("#info").textContent = "Atualizado " + atualizadoTxt(d.atualizado_em) + ". Escolhidas entre: " + fontes.join(", ") + ".";
    }).catch(() => { lista.innerHTML = '<li class="loading" style="padding:14px 18px">Sem conexão para carregar as notícias agora.</li>'; });
  }

  /* ---------- Artigos ---------- */
  /* ---------- Temas (aba "Temas", página artigos/) ----------
     Os temas e os artigos de cada tema vêm de data/artigos.json ("temas" e o campo "temas" de cada artigo).
     Um artigo pode estar em mais de um tema. */
  function artigos() {
    let todos = [], temas = [], pesq = [], quem = "";
    const bar = $("#temaBar"), box = $("#porTema"), busca = $("#busca"), chips = $("#porPesquisadora");
    const norm = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const doTema = (t, lista) => lista.filter(a => (a.temas || []).includes(t.id));
    function render() {
      const v = norm(busca.value.trim());
      const lista = todos.filter(a => (!quem || (a.pesquisadoras || []).includes(quem)) &&
        (!v || norm([a.titulo, a.titulo_curto, a.resumo, a.autores_curto, (a.tags || []).join(" "), (a.revista || {}).nome, a.selo].join(" ")).includes(v)));
      bar.innerHTML = temas.map(t => { const n = doTema(t, lista).length;
        return '<a class="tema-chip" href="#' + esc(t.id) + '" style="--c:' + esc(t.cor) + '"' + (n ? "" : ' aria-disabled="true"') + "><i></i>" + esc(t.nome) + '<span class="n">' + n + "</span></a>"; }).join("");
      const secs = temas.map(t => { const itens = doTema(t, lista); if (!itens.length) return "";
        return '<section class="tema-sec" id="' + esc(t.id) + '" style="--c:' + esc(t.cor) + '"><div class="tema-head"><h2>' + esc(t.nome) + "</h2>" +
          (t.sobre ? "<p>" + esc(t.sobre) + "</p>" : "") + '<span class="tema-n">' + itens.length + (itens.length > 1 ? " estudos" : " estudo") + "</span></div>" +
          '<div class="art-grid">' + itens.map(cartaoArtigo).join("") + "</div></section>"; }).join("");
      box.innerHTML = secs || '<p class="empty card">Nenhum artigo encontrado.</p>';
      entrar($$(".tema-sec", box));
      espiar();
    }
    // destaca, na barra, o tema que está na tela
    let io;
    function espiar() {
      if (io) io.disconnect();
      io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        $$(".tema-chip", bar).forEach(c => c.classList.toggle("on", c.getAttribute("href") === "#" + e.target.id));
        const c = $(".tema-chip.on", bar); if (c) bar.scrollTo({ left: c.offsetLeft - 16, behavior: RM ? "auto" : "smooth" });
      }), { rootMargin: "-140px 0px -55% 0px" });
      $$(".tema-sec", box).forEach(s => io.observe(s));
    }
    bar.addEventListener("click", e => {
      const c = e.target.closest(".tema-chip"); if (!c) return;
      e.preventDefault(); if (c.getAttribute("aria-disabled")) return;
      const alvo = $(c.getAttribute("href")); if (!alvo) return;
      history.replaceState(null, "", c.getAttribute("href"));
      alvo.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    });
    busca.addEventListener("input", render);
    chips.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      quem = b.dataset.p;
      $$(".chip", chips).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    getJSON("data/artigos.json").then(d => {
      todos = d.artigos || []; pesq = d.pesquisadoras || [];
      temas = (d.temas || []).filter(t => todos.some(a => (a.temas || []).includes(t.id)));
      pesq.forEach(p => { PESQ[p.id] = p; });
      $("#total").textContent = temas.length + " temas · " + todos.length + " estudos";
      chips.innerHTML = pesq.length ? '<span class="pesq-lbl">Pesquisadoras:</span><button type="button" class="chip" data-p="" aria-pressed="true">Todas</button>' +
        pesq.map(p => '<button type="button" class="chip pesq-chip" data-p="' + esc(p.id) + '" aria-pressed="false" style="--c:' + esc(p.cor) + '"><span class="av-mini">' + esc(p.iniciais) + "</span>" + esc(p.nome) + '<span class="n">' + todos.filter(a => (a.pesquisadoras || []).includes(p.id)).length + "</span></button>").join("") : "";
      render();
      const q = new URLSearchParams(location.search).get("pesquisadora"), alvoP = q && $('.chip[data-p="' + q + '"]', chips);
      if (alvoP) alvoP.click();
      if (location.hash && $(location.hash)) setTimeout(() => $(location.hash).scrollIntoView({ block: "start" }), 60);
    }).catch(() => { box.innerHTML = '<p class="loading">Não foi possível carregar os artigos.</p>'; });
  }

  /* ---------- Revistas ---------- */
  function revistas() {
    Promise.all([getJSON("data/artigos.json").catch(() => ({ artigos: [] })), getJSON("data/noticias.json").catch(() => ({ artigos: [] }))]).then(([da, dn]) => {
      // revistas dos artigos explicados no app
      const doApp = new Map();
      (da.artigos || []).forEach(a => { const r = a.revista; if (!r || !r.nome) return; const o = doApp.get(r.nome) || { r, itens: [] }; o.itens.push(a); doApp.set(r.nome, o); });
      $("#doApp").innerHTML = [...doApp.values()].map(({ r, itens }) =>
        '<div class="card jr-card"><div class="jr-top"><span class="jr-mark" style="--j:' + corDe(r.nome) + '">' + esc(sigla(r.nome)) + "</span><div><b>" + esc(r.nome) + '</b><p class="jr-sub">' +
        [r.cidade, r.issn && "ISSN " + r.issn].filter(Boolean).map(esc).join(" · ") + "</p></div></div>" +
        '<p class="jr-sub">' + itens.length + (itens.length > 1 ? " artigos explicados no app" : " artigo explicado no app") + "</p>" +
        '<ul class="jr-arts">' + itens.map(a => '<li><a href="' + RAIZ + esc(a.url) + '">' + esc(a.titulo_curto || a.titulo) + ' <span aria-hidden="true">→</span></a></li>').join("") + "</ul>" +
        (r.site ? '<div class="jr-links"><a class="btn small ghost" href="' + esc(r.site) + '" target="_blank" rel="noopener">Site da revista ↗</a></div>' : "") + "</div>").join("") ||
        '<p class="empty card">As revistas dos artigos explicados aparecem aqui.</p>';
      // publicações recentes, com filtro por revista
      const pubs = dn.artigos || [];
      const cont = new Map(); pubs.forEach(p => cont.set(p.revista, (cont.get(p.revista) || 0) + 1));
      const ordem = [...cont.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const chips = $("#porRevista");
      chips.innerHTML = '<button type="button" class="chip" data-r="" aria-pressed="true">Todas<span class="n">' + pubs.length + "</span></button>" +
        ordem.map(([n, c]) => '<button type="button" class="chip" data-r="' + esc(n) + '" aria-pressed="false">' + esc(n) + '<span class="n">' + c + "</span></button>").join("");
      const lista = $("#publicacoes");
      const render = r => { lista.innerHTML = pubs.filter(p => !r || p.revista === r).map(linhaPublicacao).join("") || '<li class="empty">Nenhuma publicação nova.</li>'; entrar($$("li", lista)); };
      chips.addEventListener("click", e => {
        const b = e.target.closest(".chip"); if (!b) return;
        $$(".chip", chips).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        render(b.dataset.r);
        $("#verRevista").hidden = !b.dataset.r;
        if (b.dataset.r) $("#verRevista").href = revistaBusca(b.dataset.r), $("#verRevista").textContent = "Todos os artigos de " + b.dataset.r + " ↗";
      });
      render("");
      $("#pubInfo").textContent = (dn.atualizado_em ? "Atualizado " + atualizadoTxt(dn.atualizado_em) + ". " : "") + "Artigos publicados nas últimas semanas sobre os temas dos artigos explicados no app: genética do câncer, variantes germinativas, venenos de serpentes e antivenenos (fonte: Europe PMC).";
    });
  }

  ({ inicio, noticias, artigos, revistas })[PAGINA]?.();
})();
