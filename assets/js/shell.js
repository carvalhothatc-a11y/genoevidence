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
    artigos: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
    revistas: '<path d="M5 4v16M10 4v16"/><path d="M14.5 5.5l4.2 14"/><path d="M3 20h18"/>',
    sobre: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
    r337h: '<path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/><path d="M8.5 7h7M8.5 17h7"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[n] + "</svg>";
  const ABAS = [["inicio", "Início", ""], ["noticias", "Notícias", "noticias/"], ["artigos", "Artigos", "artigos/"], ["revistas", "Revistas", "revistas/"], ["r337h", "R337H", "r337h/"]];
  const atual = n => (n === PAGINA ? ' aria-current="page"' : "");
  const topo = $("#appbar");
  if (topo) {
    topo.className = "appbar";
    topo.innerHTML = '<div class="appbar-in"><a class="logo" href="' + RAIZ + '" aria-label="GenoEvidence, início"><i></i><b>GenoEvidence</b></a>' +
      '<nav class="tabs-top" aria-label="Seções do app">' + ABAS.map(([n, l, h]) => '<a class="tab-' + n + '" href="' + RAIZ + h + '"' + atual(n) + ">" + l + "</a>").join("") + "</nav>" +
      '<a class="icon-btn" href="' + RAIZ + 'sobre/" aria-label="Sobre o GenoEvidence"' + atual("sobre") + ">" + svg("sobre") + "</a></div>";
  }
  const abas = $("#tabbar");
  if (abas) {
    abas.className = "tabbar";
    abas.setAttribute("aria-label", "Seções do app");
    abas.innerHTML = ABAS.map(([n, l, h]) => '<a class="tab-' + n + '" href="' + RAIZ + h + '"' + atual(n) + ">" + svg(n) + "<span>" + l + "</span></a>").join("");
  }

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
    '<li><a class="row" href="' + esc(n.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="t" data-t="' + esc(n.tema) + '">' + esc(n.tema) + '</span><span class="src">' + esc(n.fonte) + '</span><span class="dot">' + esc(quando(n.data)) + '</span><span class="dot">' + (n.idioma === "pt" ? "PT" : "EN") + "</span></div>" +
    "<h3>" + esc(n.titulo) + '<span class="ext">↗</span></h3>' + (n.resumo ? "<p>" + esc(n.resumo) + "</p>" : "") + "</a></li>";
  const linhaPublicacao = a =>
    '<li><a class="row" href="' + esc(a.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="pill j" style="--j:' + corDe(a.revista) + '">' + esc(a.revista) + '</span><span>' + esc(diaMes(a.data)) + "</span>" +
    (a.acesso_aberto ? '<span class="oa">acesso aberto</span>' : "") + "</div><h3>" + esc(a.titulo) + '<span class="ext">↗</span></h3>' + (a.autores ? "<p>" + esc(a.autores) + "</p>" : "") + "</a></li>";
  function cartaoArtigo(a) {
    const r = a.revista || {};
    return '<a class="card art-card" href="' + RAIZ + esc(a.url) + '">' +
      (a.capa ? '<div class="art-cover" role="img" aria-label="' + esc(a.capa_alt || "") + '" style="background-image:url(\'' + RAIZ + esc(a.capa) + '\')"></div>' : "") +
      '<div class="art-body"><div class="tags">' + (r.nome ? '<span class="pill j" style="--j:' + corDe(r.nome) + '">' + esc(r.nome) + (r.ano ? " · " + esc(r.ano) : "") + "</span>" : "") +
      (a.tags || []).slice(0, 2).map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" +
      "<h3>" + esc(a.titulo_curto || a.titulo) + '</h3><p class="full">' + esc(a.titulo) + '</p><p class="res">' + esc(a.resumo) + "</p>" +
      '<div class="art-foot"><span class="jr">' + esc(a.autores_curto || "") + '</span><span class="read">Ler →</span></div></div></a>';
  }

  /* ---------- Início ---------- */
  function inicio() {
    const h = new Date().getHours();
    $("#saudacao").textContent = (h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite") + " · " + new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    getJSON("data/artigos.json").then(d => {
      const a = (d.artigos || [])[0], alvo = $("#destaque");
      if (!a) { alvo.innerHTML = '<p class="empty card">Os artigos explicados aparecem aqui.</p>'; return; }
      const r = a.revista || {};
      alvo.innerHTML = '<a class="card feature" href="' + RAIZ + esc(a.url) + '"><div class="feature-img" role="img" aria-label="' + esc(a.capa_alt || "") + '" style="background-image:url(\'' + RAIZ + esc(a.capa) + '\')"></div>' +
        '<div class="feature-body"><div class="tags">' + (r.nome ? '<span class="pill j" style="--j:' + corDe(r.nome) + '">Publicado em ' + esc(r.nome) + (r.ano ? " · " + esc(r.ano) : "") + "</span>" : "") + "</div>" +
        "<h3>" + esc(a.titulo_curto) + "</h3><p>" + esc(a.resumo) + '</p><span class="go">Ler o artigo explicado →</span></div></a>';
      entrar([$(".feature", alvo)]);
    }).catch(() => { $("#destaque").innerHTML = '<p class="loading">Não foi possível carregar o destaque.</p>'; });
    getJSON("data/noticias.json").then(d => {
      const ns = d.noticias || [], pt = ns.filter(n => n.idioma === "pt"), lead = pt[0] || ns[0];
      if (lead) {
        $("#noticiaDestaque").innerHTML = '<a class="news-lead" href="' + esc(lead.url) + '" target="_blank" rel="noopener"><div class="meta"><span class="t" data-t="' + esc(lead.tema) + '">' + esc(lead.tema) + '</span><span class="src">' + esc(lead.fonte) + '</span><span class="dot">' + esc(quando(lead.data)) + "</span></div>" +
          "<h3>" + esc(lead.titulo) + "</h3>" + (lead.resumo ? "<p>" + esc(lead.resumo) + "</p>" : "") + '<span class="go">Ler na fonte ↗</span></a>';
        entrar([$(".news-lead")]);
      }
      $("#hojeNoticias").innerHTML = ns.filter(n => n !== lead).slice(0, 5).map(linhaNoticia).join("") || '<li class="empty">Sem notícias por enquanto.</li>';
      $("#hojePublicacoes").innerHTML = (d.artigos || []).slice(0, 4).map(linhaPublicacao).join("") || '<li class="empty">Sem publicações novas.</li>';
      $("#atualizado").textContent = "Atualizado " + atualizadoTxt(d.atualizado_em) + ".";
      entrar($$("#hojeNoticias li, #hojePublicacoes li"));
    }).catch(() => {
      $("#hojeNoticias").innerHTML = '<li class="loading" style="padding:14px 18px">Sem conexão para carregar as notícias agora.</li>';
      $("#hojePublicacoes").innerHTML = "";
    });
  }

  /* ---------- Notícias ---------- */
  function noticias() {
    let todas = [], filtro = "todas", mostrar = 12;
    const lista = $("#lista"), mais = $("#mais"), chips = $("#filtros");
    const passa = n => filtro === "todas" || (filtro === "pt" ? n.idioma === "pt" : n.tema === filtro);
    function render() {
      const itens = todas.filter(passa);
      lista.innerHTML = itens.slice(0, mostrar).map(linhaNoticia).join("") || '<li class="empty">Nenhuma notícia neste filtro hoje.</li>';
      mais.hidden = itens.length <= mostrar;
      entrar($$("li", lista));
    }
    chips.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      filtro = b.dataset.f; mostrar = 12;
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
      $("#info").textContent = "Atualizado " + atualizadoTxt(d.atualizado_em) + ". Fontes: " + fontes.join(", ") + ". Toque em uma notícia para ler na fonte original.";
    }).catch(() => { lista.innerHTML = '<li class="loading" style="padding:14px 18px">Sem conexão para carregar as notícias agora.</li>'; });
  }

  /* ---------- Artigos ---------- */
  function artigos() {
    let todos = [];
    const grid = $("#grade"), busca = $("#busca");
    const norm = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function render() {
      const v = norm(busca.value.trim());
      const itens = todos.filter(a => !v || norm([a.titulo, a.titulo_curto, a.resumo, (a.tags || []).join(" "), (a.revista || {}).nome].join(" ")).includes(v));
      grid.innerHTML = itens.map(cartaoArtigo).join("") || '<p class="empty card">Nenhum artigo encontrado.</p>';
      entrar($$(".art-card", grid));
    }
    busca.addEventListener("input", render);
    getJSON("data/artigos.json").then(d => { todos = d.artigos || []; $("#total").textContent = todos.length + (todos.length === 1 ? " artigo" : " artigos"); render(); })
      .catch(() => { grid.innerHTML = '<p class="loading">Não foi possível carregar os artigos.</p>'; });
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
