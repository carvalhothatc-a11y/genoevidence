/* GenoEvidence · página inicial: notícias do dia, artigos novos, estudos e revistas */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CORES = ["#9DB6FF", "#FFB23F", "#5FD39A", "#FF8A9D", "#A58CFF", "#3FC1C9", "#F4A6FF", "#7FD1FF"];
  const corDe = nome => { let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]; };
  const sigla = nome => nome.replace(/\(.*?\)/g, "").split(/\s+/).filter(w => /^[A-Za-zÀ-ú]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "R";
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  function quando(iso) {
    const d = new Date(iso), s = (d - Date.now()) / 1000;
    if (isNaN(d)) return "";
    const abs = Math.abs(s);
    if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const getJSON = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  function entrar(nodes) {
    if (RM) return;
    nodes.forEach((n, i) => n.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: i * 45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  }

  let ESTUDOS = [], ARTIGOS = [];

  /* ---------- estudos ---------- */
  const HELIX = '<svg viewBox="0 0 200 300" aria-hidden="true">' + (() => {
    let s = "";
    for (let i = 0; i < 16; i++) {
      const y = 12 + i * 18, a = i * .62, x1 = 100 + 58 * Math.sin(a), x2 = 100 + 58 * Math.sin(a + Math.PI);
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y + '" x2="' + x2.toFixed(1) + '" y2="' + y + '" stroke="' + (i === 9 ? "#FF5470" : "#3a5bb8") + '" stroke-width="' + (i === 9 ? 5 : 3) + '" stroke-linecap="round" opacity="' + (i === 9 ? 1 : .7) + '"/>';
      s += '<circle cx="' + x1.toFixed(1) + '" cy="' + y + '" r="6" fill="#4D7CFF"/><circle cx="' + x2.toFixed(1) + '" cy="' + y + '" r="6" fill="#9DB6FF"/>';
    }
    return s;
  })() + "</svg>";
  function capa(e) {
    const txt = esc(e.destaque || e.titulo.split(" ")[0]);
    const big = /^R\d+H$/.test(e.destaque || "") ? '<span class="r">R</span>' + esc(e.destaque.slice(1, -1)) + '<span class="h">H</span>' : txt;
    return '<div class="study-cover">' + HELIX + '<div class="big">' + big + "</div></div>";
  }
  function renderEstudos() {
    const g = $("#estudosGrid");
    g.innerHTML = ESTUDOS.map(e => {
      const rev = e.revista && e.revista.nome ? '<span class="badge rev" style="--j:' + corDe(e.revista.nome) + '">' + esc(e.revista.nome) + (e.revista.ano ? " · " + esc(e.revista.ano) : "") + "</span>" : "";
      return '<a class="study-card card-link" href="' + esc(e.url) + '">' + capa(e) +
        '<div class="study-body"><div class="badges"><span class="badge tipo">' + esc(e.rotulo || (e.revista ? "Artigo publicado" : "Estudo")) + "</span>" + rev +
        (e.tags || []).slice(0, 3).map(t => '<span class="badge">' + esc(t) + "</span>").join("") + "</div>" +
        "<h3>" + esc(e.titulo) + "</h3>" + (e.subtitulo ? '<p class="sub2">' + esc(e.subtitulo) + "</p>" : "") +
        '<p class="res">' + esc(e.resumo) + "</p>" +
        '<p class="study-authors">' + esc((e.autores || []).join(" · ")) + (e.ano ? " · " + esc(e.ano) : "") + "</p>" +
        '<div class="study-go"><span>' + (e.revista ? "Resumo, imagens e link para a revista" : "Resumo, 3D, gráficos e imagens") + "</span><span>Abrir estudo →</span></div></div></a>";
    }).join("") +
      '<div class="study-soon"><p class="eyebrow">Em breve</p><h3>Artigos já publicados</h3><p>Os próximos estudos chegam aqui com resumo, explicação, imagens e o botão <strong>Ler na revista</strong>, que leva direto à publicação original.</p></div>';
    entrar($$(".study-card, .study-soon", g));
    $("#hjEstudos").textContent = ESTUDOS.length;
  }

  /* ---------- notícias ---------- */
  let NOTICIAS = [], filtro = "todas", mostrar = 9;
  function renderNoticias() {
    const lista = NOTICIAS.filter(n => filtro === "todas" || (filtro === "pt" ? n.idioma === "pt" : n.tema === filtro));
    const g = $("#noticiasGrid");
    if (!lista.length) { g.innerHTML = '<p class="loading">Nenhuma notícia neste filtro hoje.</p>'; $("#maisNoticias").hidden = true; return; }
    g.innerHTML = lista.slice(0, mostrar).map((n, i) =>
      '<a class="news-card card-link' + (i === 0 && filtro === "todas" ? " lead" : "") + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
      '<div class="news-top"><span class="src-pill">' + esc(n.fonte) + '</span><span class="lang">' + (n.idioma === "pt" ? "PT" : "EN") + '</span><span class="tema" data-t="' + esc(n.tema) + '">' + esc(n.tema) + "</span><span>" + esc(quando(n.data)) + "</span></div>" +
      "<h3>" + esc(n.titulo) + "</h3>" + (n.resumo ? "<p>" + esc(n.resumo) + "</p>" : "") +
      '<span class="news-go">Ler na fonte ↗</span></a>').join("");
    $("#maisNoticias").hidden = lista.length <= mostrar;
    entrar($$(".news-card", g));
  }
  function contarFiltros() {
    $$("#fNoticias .chip-f").forEach(b => {
      const f = b.dataset.f, n = NOTICIAS.filter(x => f === "todas" || (f === "pt" ? x.idioma === "pt" : x.tema === f)).length;
      let s = $(".n", b); if (!s) { s = document.createElement("span"); s.className = "n"; b.appendChild(s); }
      s.textContent = n; b.hidden = !n && f !== "todas";
    });
  }
  $("#fNoticias").addEventListener("click", e => {
    const b = e.target.closest(".chip-f"); if (!b) return;
    filtro = b.dataset.f; mostrar = 9;
    $$("#fNoticias .chip-f").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    renderNoticias();
  });
  $("#maisNoticias").addEventListener("click", () => { mostrar += 9; renderNoticias(); });

  /* ---------- artigos científicos novos ---------- */
  let mostrarArt = 8;
  function renderArtigos() {
    const ol = $("#artigosLista");
    if (!ARTIGOS.length) { ol.innerHTML = '<li class="loading">Nenhum artigo novo encontrado nas últimas semanas.</li>'; return; }
    ol.innerHTML = ARTIGOS.slice(0, mostrarArt).map(a =>
      '<li class="pub"><div><div class="pub-head"><a class="pub-journal" style="--j:' + corDe(a.revista) + '" href="' + esc(revistaUrl(a.revista)) + '" target="_blank" rel="noopener" title="Ver artigos desta revista">' + esc(a.revista) + '</a><span class="pub-date">' + esc(new Date(a.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })) + "</span>" +
      (a.acesso_aberto ? '<span class="oa">acesso aberto</span>' : "") + "</div>" +
      "<h3>" + esc(a.titulo) + "</h3>" + (a.autores ? '<p class="pub-authors">' + esc(a.autores) + "</p>" : "") + "</div>" +
      '<a class="journal-btn" href="' + esc(a.url) + '" target="_blank" rel="noopener">Ler na revista ↗</a></li>').join("");
    $("#maisArtigos").hidden = ARTIGOS.length <= mostrarArt;
    entrar($$(".pub", ol));
  }
  $("#maisArtigos").addEventListener("click", () => { mostrarArt += 8; renderArtigos(); });
  const revistaUrl = nome => "https://europepmc.org/search?query=" + encodeURIComponent('JOURNAL:"' + nome + '"');

  /* ---------- revistas em destaque ---------- */
  function renderRevistas() {
    const m = new Map();
    ESTUDOS.filter(e => e.revista && e.revista.nome).forEach(e => {
      const k = e.revista.nome; m.set(k, { nome: k, n: (m.get(k) || {}).n || 0, estudo: e, url: e.revista.site || e.revista.url });
    });
    ARTIGOS.forEach(a => { const r = m.get(a.revista) || { nome: a.revista, n: 0 }; r.n++; m.set(a.revista, r); });
    const lista = [...m.values()].sort((a, b) => (b.estudo ? 1 : 0) - (a.estudo ? 1 : 0) || b.n - a.n || a.nome.localeCompare(b.nome)).slice(0, 12);
    const g = $("#revistasGrid");
    g.innerHTML = lista.map(r =>
      '<a class="journal card-link" style="--j:' + corDe(r.nome) + '" href="' + esc(r.url || revistaUrl(r.nome)) + '" target="_blank" rel="noopener">' +
      '<span class="j-mark">' + esc(sigla(r.nome)) + "</span><b>" + esc(r.nome) + "</b>" +
      "<span>" + (r.estudo ? "Artigo explicado no app" + (r.n ? " · " : "") : "") + (r.n ? r.n + (r.n > 1 ? " artigos novos" : " artigo novo") : "") + "</span>" +
      '<span class="go">Ver artigos da revista ↗</span></a>').join("") || '<p class="loading">As revistas aparecem aqui assim que os artigos do dia forem carregados.</p>';
    entrar($$(".journal", g));
    $("#hjRevistas").textContent = lista.length;
  }

  /* ---------- se os dados estiverem velhos, busca artigos ao vivo (Europe PMC) ---------- */
  function buscarArtigosAoVivo() {
    const termos = ["Li-Fraumeni", "TP53", "hereditary cancer", "cancer predisposition", "germline variant", "germline variants"];
    const fim = new Date(), ini = new Date(Date.now() - 21 * 864e5), f = d => d.toISOString().slice(0, 10);
    const q = "(" + termos.map(t => 'TITLE_ABS:"' + t + '"').join(" OR ") + ") AND FIRST_PDATE:[" + f(ini) + " TO " + f(fim) + "] sort_date:y";
    return getJSON("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=24&resultType=lite&query=" + encodeURIComponent(q))
      .then(d => (d.resultList.result || []).filter(r => r.title && r.journalTitle).map(r => ({
        titulo: r.title.replace(/<[^>]+>/g, ""), autores: r.authorString || "", revista: r.journalTitle, data: r.firstPublicationDate,
        doi: r.doi, url: r.doi ? "https://doi.org/" + r.doi : "https://europepmc.org/article/" + (r.source || "MED") + "/" + r.id, acesso_aberto: r.isOpenAccess === "Y"
      })));
  }

  /* ---------- carregar tudo ---------- */
  getJSON("data/estudos.json").then(d => { ESTUDOS = d.estudos || []; renderEstudos(); renderRevistas(); })
    .catch(() => { $("#estudosGrid").innerHTML = '<p class="loading">Não foi possível carregar os estudos.</p>'; });

  getJSON("data/noticias.json").then(d => {
    NOTICIAS = d.noticias || []; ARTIGOS = d.artigos || [];
    contarFiltros(); renderNoticias(); renderArtigos(); renderRevistas();
    const at = new Date(d.atualizado_em);
    const txt = at.toDateString() === new Date().toDateString() ? "hoje às " + at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : at.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    $("#hjNoticias").textContent = NOTICIAS.length; $("#hjArtigos").textContent = ARTIGOS.length; $("#hjData").textContent = txt;
    $("#noticiasInfo").textContent = "Atualizado " + txt + " · Fontes: " + (d.fontes || []).filter(f => f !== "Europe PMC").map(f => f.split(" · ")[0]).filter((v, i, a) => a.indexOf(v) === i).join(", ") + ".";
    if (Date.now() - at > 30 * 3600e3 && navigator.onLine !== false) {
      buscarArtigosAoVivo().then(lista => { if (lista.length) { ARTIGOS = lista; renderArtigos(); renderRevistas(); $("#hjArtigos").textContent = ARTIGOS.length; $("#artigosInfo").textContent = "Fonte: Europe PMC (buscado agora)."; } }).catch(() => {});
    }
  }).catch(() => {
    $("#noticiasGrid").innerHTML = '<p class="loading">Sem conexão para carregar as notícias agora. Tente novamente mais tarde.</p>';
    $("#artigosLista").innerHTML = '<li class="loading">Sem conexão para carregar os artigos agora.</li>';
  });
})();
