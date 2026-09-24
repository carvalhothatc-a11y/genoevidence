/* GenoEvidence · comportamentos comuns das páginas do app (início e artigos)
   - menu lateral (☰) com filtro, montado a partir de <script type="application/json" id="ge-topicos">
   - rolagem até o ponto certo ao clicar em links internos (#...)
   - barra de progresso, destaque do menu do topo, botão de voltar ao topo
   - imagens ampliáveis (.fig) com setas, teclado e deslizar
   - efeito de toque nos botões e animação de abertura */
(function () {
  "use strict";
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const norm = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  window.GE = window.GE || {};

  /* ---------- rolagem até o ponto certo ---------- */
  function goTo(id) {
    const t = document.querySelector(id);
    if (!t) return false;
    const hud = $(".hud") ? $(".hud").offsetHeight : 0;
    const y = id === "#top" ? 0 : t.getBoundingClientRect().top + scrollY - hud - 14;
    scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
    if (!t.matches("section.s,#top")) {
      t.classList.remove("flash-target"); void t.offsetWidth; t.classList.add("flash-target");
      setTimeout(() => t.classList.remove("flash-target"), 1900);
    }
    try { history.replaceState(null, "", id === "#top" ? location.pathname + location.search : id); } catch (_) {}
    return true;
  }
  GE.goTo = goTo;
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length > 1 && goTo(id)) e.preventDefault();
  });

  /* ---------- barra de progresso, menu do topo ativo, voltar ao topo ---------- */
  const prog = $("#progress"), totop = $("#totop");
  let navLinks = [], secs = [];
  function prepararNav() {
    navLinks = $$("#nav a");
    secs = navLinks.map(a => document.querySelector(a.getAttribute("href")));
    onScroll();
  }
  function onScroll() {
    const h = document.documentElement;
    if (prog) prog.style.transform = "scaleX(" + (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) + ")";
    if (totop) totop.classList.toggle("show", h.scrollTop > 700);
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .35) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle("on", i === cur));
  }
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- efeito de toque ---------- */
  document.addEventListener("pointerdown", e => {
    if (RM) return;
    const t = e.target.closest(".cta,.nav a,.menu-btn,.dr-item,.dr-sub,.chip-f,.card-link,.fig,.more,.totop,.journal-btn,.copy-btn");
    if (!t) return;
    t.classList.add("rpl");
    const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, sp = document.createElement("span");
    sp.className = "ripple";
    sp.style.cssText = "width:" + d + "px;height:" + d + "px;left:" + (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
    t.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });

  /* ---------- menu lateral ---------- */
  function montarMenu() {
    const btn = $("#menuBtn"), dr = $("#drawer"), scrim = $("#drawerScrim"), nav = $("#drawerNav"), q = $("#drawerSearch"), x = $("#drawerClose");
    const dados = $("#ge-topicos");
    if (!btn || !dr || !nav || !dados) return;
    const TOPICS = JSON.parse(dados.textContent);
    TOPICS.forEach(([h, l, subs = []], i) => {
      const g = document.createElement("div");
      g.className = "dr-group";
      g.dataset.s = norm(l + " " + subs.map(s => s[1]).join(" "));
      g.innerHTML = '<a class="dr-item" href="' + h + '"><span class="dr-n">' + String(i + 1).padStart(2, "0") + "</span><span>" + l + "</span></a>" +
        subs.map(([sh, sl]) => '<a class="dr-sub" href="' + sh + '" data-s="' + norm(sl) + '">' + sl + "</a>").join("");
      nav.appendChild(g);
    });
    const vazio = document.createElement("p");
    vazio.className = "dr-empty"; vazio.textContent = "Nenhum tópico encontrado."; vazio.hidden = true; nav.appendChild(vazio);
    let open = false, t = 0; dr.inert = true;
    function setOpen(v) {
      if (v === open) return; open = v; clearTimeout(t);
      btn.setAttribute("aria-expanded", String(v));
      btn.setAttribute("aria-label", v ? "Fechar menu de tópicos" : "Abrir menu de tópicos");
      dr.classList.toggle("open", v); dr.inert = !v; document.body.style.overflow = v ? "hidden" : "";
      if (v) { scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("show")); marcar(); setTimeout(() => (innerWidth > 600 ? q : x).focus(), 60); }
      else {
        scrim.classList.remove("show");
        t = setTimeout(() => { scrim.hidden = true; if (q.value) { q.value = ""; q.dispatchEvent(new Event("input")); } }, 320);
        btn.focus({ preventScroll: true });
      }
    }
    btn.addEventListener("click", () => setOpen(!open));
    x.addEventListener("click", () => setOpen(false));
    scrim.addEventListener("click", () => setOpen(false));
    addEventListener("keydown", e => { if (open && e.key === "Escape") setOpen(false); });
    nav.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    q.addEventListener("input", () => {
      const v = norm(q.value.trim()); let n = 0;
      $$(".dr-group", nav).forEach(g => {
        const hit = !v || g.dataset.s.includes(v); g.hidden = !hit; if (hit) n++;
        $$(".dr-sub", g).forEach(s => { s.hidden = !!v && !s.dataset.s.includes(v) && !norm($(".dr-item", g).textContent).includes(v); });
      });
      vazio.hidden = n > 0;
    });
    q.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const f = $$("a", nav).find(a => !a.hidden && !a.closest("[hidden]"));
      if (f) { e.preventDefault(); f.click(); }
    });
    const links = $$("a", nav).map(a => [a, a.getAttribute("href").startsWith("#") ? document.querySelector(a.getAttribute("href")) : null]).filter(p => p[1]);
    function marcar() {
      let top = null, sub = null; const lim = innerHeight * .35;
      links.forEach(([a, el]) => { if (el.getBoundingClientRect().top < lim) { if (a.classList.contains("dr-item")) { top = a; sub = null; } else sub = a; } });
      links.forEach(([a]) => a.classList.toggle("on", a === top || a === sub));
    }
    addEventListener("scroll", () => { if (open) marcar(); }, { passive: true });
  }

  /* ---------- imagens ampliáveis ---------- */
  (function () {
    const lb = $("#lightbox");
    if (!lb) return;
    const im = $("#lbImg"), cap = $("#lbCap"), cnt = $("#lbCount"), x = $("#lbClose"), pv = $("#lbPrev"), nx = $("#lbNext");
    let last = null, grp = [], k = 0;
    function show(i, dir) {
      k = (i + grp.length) % grp.length;
      const b = grp[k], src = $("img", b), full = src.dataset.full || src.currentSrc || src.src;
      im.src = src.currentSrc || src.src; im.alt = src.alt;
      if (full !== im.src) { const pre = new Image(); pre.onload = () => { if (grp[k] === b) im.src = full; }; pre.src = full; }
      cap.textContent = b.dataset.cap || "";
      cnt.textContent = grp.length > 1 ? (k + 1) + " / " + grp.length : "";
      pv.hidden = nx.hidden = grp.length < 2;
      if (!RM) im.animate([{ transform: "translateX(" + (dir || 0) * 28 + "px) scale(.96)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    document.addEventListener("click", e => {
      const b = e.target.closest(".fig");
      if (!b || lb.contains(b)) return;
      const g = b.closest("[data-gallery]");
      grp = g ? $$(".fig", g).filter(f => !f.hidden) : [b];
      last = b; lb.hidden = false; document.body.style.overflow = "hidden"; show(grp.indexOf(b), 0); x.focus();
    });
    const close = () => { lb.hidden = true; document.body.style.overflow = ""; if (last) last.focus(); };
    x.addEventListener("click", close);
    pv.addEventListener("click", e => { e.stopPropagation(); show(k - 1, -1); });
    nx.addEventListener("click", e => { e.stopPropagation(); show(k + 1, 1); });
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    addEventListener("keydown", e => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (grp.length > 1 && e.key === "ArrowLeft") show(k - 1, -1);
      else if (grp.length > 1 && e.key === "ArrowRight") show(k + 1, 1);
    });
    let sx = null;
    lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (sx == null || grp.length < 2) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(k + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  })();

  /* ---------- botões "copiar" ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const alvo = document.querySelector(b.dataset.copy), texto = alvo ? alvo.innerText.trim() : "";
    const ok = () => { const t = b.textContent; b.textContent = "Copiado"; setTimeout(() => (b.textContent = t), 1600); };
    try { navigator.clipboard.writeText(texto).then(ok, () => { getSelection().selectAllChildren(alvo); }); }
    catch (_) { getSelection().selectAllChildren(alvo); }
  });

  /* ---------- animação de abertura (sempre termina no lugar) ---------- */
  function abertura() {
    if (!window.gsap || RM) return;
    const alvos = [".hero .eyebrow", ".hero h1", ".hero .sub", ".hero .authors", ".hero .cta", ".hero .readout"].filter(s => $(s));
    if (!alvos.length) return;
    const tw = gsap.from(alvos, { y: 18, opacity: 0, duration: .9, ease: "power3.out", stagger: .07, delay: .15, clearProps: "all" });
    setTimeout(() => tw.progress(1), 3500);
  }

  /* Páginas que montam o conteúdo depois (artigos) usam <body data-adiar="1"> e chamam GE.iniciar() */
  let iniciado = false;
  GE.iniciar = function () {
    if (iniciado) return; iniciado = true;
    prepararNav(); montarMenu(); abertura();
  };
  if (document.body.dataset.adiar !== "1") GE.iniciar();
})();
