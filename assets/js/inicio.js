/* GenoEvidence · Início como uma jornada: "do conhecimento científico até a descoberta"
   - abertura: rede de conhecimento em camadas e partículas que se juntam num DNA (desenho conceitual, sem dados);
   - como funciona: 4 etapas, cada uma com a sua animação;
   - mapa do conhecimento: estudos, temas, assuntos e pesquisadoras, todos de data/artigos.json;
   - descobertas recentes: a principal descoberta de cada estudo, copiada da própria página do estudo;
   - explore a ciência: cada tema com um símbolo animado; tocar abre os estudos do tema ali mesmo;
   - rede da p53: dados da Iniciação Científica de Thaisa Carvalho (data/rede-p53.json);
   - elementos flutuantes e entrada das seções ao rolar.
   Movimento reduzido (no aparelho ou no painel de acessibilidade) deixa tudo parado; internet lenta
   ou economia de dados deixa a abertura sem animação. Nenhuma informação depende só do movimento. */
(function () {
  "use strict";
  if (document.body.dataset.pagina !== "inicio") return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const I = window.GE_I18N || { lang: "pt", locale: "pt-BR", t: s => s };
  const T = s => I.t(s);
  const L = I.lang || "pt";
  const RAIZ = (document.querySelector('meta[name="ge-root"]') || {}).content || "./";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = t => 1 - Math.pow(1 - t, 3);
  const rnd = n => Math.random() * n;
  // movimento: respeita o aparelho e o painel de acessibilidade (a qualquer momento)
  const parado = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ge-sem-animacao");
  const rede = navigator.connection || {};
  const LEVE = !!(rede.saveData || /(^|-)2g$/.test(rede.effectiveType || ""));
  if (LEVE) document.documentElement.classList.add("ge-leve");
  const dados = new Promise(res => {
    if (window.GE_APP) res(window.GE_APP.artigos);
    else document.addEventListener("ge-dados", () => res(window.GE_APP.artigos), { once: true });
  });
  // chama fn uma vez, quando o elemento aparece na tela
  function aoVer(el, fn, limiar) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: limiar == null ? .25 : limiar });
    io.observe(el);
  }
  // avisa sempre que o elemento entra ou sai da tela
  function naTela(el, fn) {
    if (!el || !("IntersectionObserver" in window)) return fn(true);
    new IntersectionObserver(es => fn(es[0].isIntersecting)).observe(el);
  }

  /* =================== 1. abertura =================== */
  function abertura() {
    const sec = $(".hero-cine"), cv = $("#heroCena");
    if (!sec || !cv) return;
    // frases que aparecem em sequência (as duas ficam no texto da página para leitores de tela)
    const box = $("#heroFrases");
    if (box) {
      box.setAttribute("data-sem-traducao", "");
      $$(".hf", box).forEach(f => {
        const txt = T(f.textContent.trim());
        f.innerHTML = txt.split(/\s+/).map((p, i) => '<span class="pw" style="--i:' + i + '">' + esc(p) + "</span>").join(" ");
      });
    }
    if (parado()) sec.classList.add("pronta", "f2");
    else {
      sec.classList.add("animar");
      requestAnimationFrame(() => requestAnimationFrame(() => sec.classList.add("pronta", "f1")));
      setTimeout(() => { sec.classList.remove("f1"); sec.classList.add("f2"); }, 2700);
    }

    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const COR = ["47,91,234", "123,77,224", "14,154,167", "224,56,90"];
    let W = 0, H = 0, poeira = [], nos = [], pulsos = [], fitas = [], letras = [], geo = null;
    let raf = 0, visivel = true, t0 = performance.now(), px = 0, py = 0, ax = 0, ay = 0, ultimoPulso = 0;
    function montar() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cel = W < 700;
      poeira = Array.from({ length: cel ? 36 : 80 }, () => ({ x: rnd(W), y: rnd(H), r: .6 + rnd(1.4), a: .1 + rnd(.14) }));
      nos = Array.from({ length: cel ? 20 : 36 }, (_, i) => ({ x: rnd(W), y: rnd(H), vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16, r: 1.6 + rnd(2.4), c: COR[i % 3] }));
      const N = cel ? 22 : 30;
      geo = { cx: W * .76, cy: H * .47, alt: H * .74, raio: clamp(W * .042, 56, 96), N: N };
      if (cel) {
        // no celular, o DNA fica no espaço livre ao lado do título, sem passar por cima do texto
        const h1 = $(".hero-titulo"), rc = cv.getBoundingClientRect();
        if (h1) {
          const rg = document.createRange(); rg.selectNodeContents(h1); const rt = rg.getBoundingClientRect();
          const livre = W - (rt.right - rc.left);
          geo = { cx: rt.right - rc.left + livre / 2, cy: rt.top - rc.top + rt.height / 2, alt: Math.max(110, rt.height * 1.05), raio: clamp(livre * .22, 16, 30), N: N };
        } else geo = { cx: W * .82, cy: H * .45, alt: H * .3, raio: 24, N: N };
      }
      fitas = [];
      for (let i = 0; i < N; i++) for (let f = 0; f < 2; f++) fitas.push({ i: i, f: f, sx: rnd(W), sy: rnd(H) });
      letras = cel ? [] : Array.from({ length: 12 }, () => ({ ch: "ATCG"[Math.floor(rnd(4))], x: rnd(W), y: rnd(H), v: .12 + rnd(.2), a: .07 + rnd(.07) }));
      pulsos = [];
    }
    function quadro(agora) {
      raf = 0;
      if (!W) return;
      const quieto = parado() || LEVE;
      const t = quieto ? 3 : (agora - t0) / 1000;
      const forma = quieto ? 1 : suave(clamp((t - .15) / 1.9, 0, 1));
      px += (ax - px) * .06; py += (ay - py) * .06;
      const rol = clamp(scrollY / (H || 1), 0, 1);
      ctx.clearRect(0, 0, W, H);
      // camada 1: poeira ao fundo
      poeira.forEach(p => { ctx.fillStyle = "rgba(47,91,234," + p.a + ")"; ctx.beginPath(); ctx.arc(p.x + px * 6, p.y + py * 6 - rol * 20, p.r, 0, 6.283); ctx.fill(); });
      letras.forEach(l => {
        if (!quieto) { l.y -= l.v; if (l.y < -10) { l.y = H + 10; l.x = rnd(W); } }
        ctx.fillStyle = "rgba(123,77,224," + l.a + ")"; ctx.font = "500 12px 'IBM Plex Mono', monospace"; ctx.fillText(l.ch, l.x + px * 10, l.y - rol * 30);
      });
      // camada 2: rede de conhecimento, com dados passando pelas ligações
      const D = Math.min(170, W * .28), ox = px * 16, oy = py * 12 - rol * 50;
      if (!quieto) nos.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < -20 || n.x > W + 20) n.vx *= -1; if (n.y < -20 || n.y > H + 20) n.vy *= -1; });
      const lig = [];
      for (let a = 0; a < nos.length; a++) for (let b = a + 1; b < nos.length; b++) {
        const dx = nos[a].x - nos[b].x, dy = nos[a].y - nos[b].y, d = Math.hypot(dx, dy);
        if (d < D) { lig.push([a, b]); ctx.strokeStyle = "rgba(47,91,234," + (.2 * (1 - d / D) * forma).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nos[a].x + ox, nos[a].y + oy); ctx.lineTo(nos[b].x + ox, nos[b].y + oy); ctx.stroke(); }
      }
      nos.forEach(n => { ctx.fillStyle = "rgba(" + n.c + "," + (.55 * forma + .1) + ")"; ctx.beginPath(); ctx.arc(n.x + ox, n.y + oy, n.r, 0, 6.283); ctx.fill(); });
      if (!quieto && lig.length && agora - ultimoPulso > 380 && pulsos.length < 7) { ultimoPulso = agora; const e = lig[Math.floor(rnd(lig.length))]; pulsos.push({ a: e[0], b: e[1], t: 0 }); }
      pulsos = pulsos.filter(p => p.t <= 1);
      pulsos.forEach(p => {
        p.t += .012; const A = nos[p.a], B = nos[p.b];
        const x = A.x + (B.x - A.x) * p.t + ox, y = A.y + (B.y - A.y) * p.t + oy;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, "rgba(224,56,90,.9)"); g.addColorStop(1, "rgba(224,56,90,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
      });
      // camada 3: partículas que se juntam numa dupla hélice
      const G = geo, hx = G.cx + px * 26, hy = G.cy + py * 18 - rol * 90, giro = t * .55 + rol * 2.2;
      const pos = fitas.map(p => {
        const ang = p.i * .42 + giro + p.f * Math.PI, z = Math.sin(ang);
        const tx = hx + Math.cos(ang) * G.raio, ty = hy - G.alt / 2 + p.i * (G.alt / (G.N - 1));
        return { x: p.sx + (tx - p.sx) * forma, y: p.sy + (ty - p.sy) * forma, z: z, p: p };
      });
      ctx.lineWidth = 1.2;
      for (let i = 0; i < G.N; i += 2) {
        const a = pos[i * 2], b = pos[i * 2 + 1];
        ctx.strokeStyle = "rgba(123,77,224," + (.16 * forma).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      pos.sort((a, b) => a.z - b.z).forEach(q => {
        const prof = (q.z + 1) / 2, raio = 1.6 + prof * 2.6, alfa = .3 + prof * .55;
        const c = q.p.f ? "224,56,90" : (q.p.i / G.N < .5 ? "47,91,234" : "123,77,224");
        ctx.fillStyle = "rgba(" + c + "," + alfa.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(q.x, q.y, raio, 0, 6.283); ctx.fill();
      });
      if (!quieto && visivel) raf = requestAnimationFrame(quadro);
    }
    const acordar = () => { if (!raf) raf = requestAnimationFrame(quadro); };
    montar(); acordar();
    addEventListener("resize", () => { montar(); acordar(); });
    if (document.fonts) document.fonts.ready.then(() => { montar(); acordar(); });
    document.addEventListener("ge-acessibilidade", () => { montar(); acordar(); });
    addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; ax = e.clientX / innerWidth - .5; ay = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener("scroll", () => { if (parado() || LEVE) acordar(); }, { passive: true });
    naTela(sec, v => { visivel = v; if (v) acordar(); });
    document.addEventListener("ge-movimento", acordar);
  }

  /* =================== 2. como funciona =================== */
  const SVG_COMO = [
    // pesquisa: artigos científicos surgindo e uma lupa passando
    '<g class="cf" data-passo="0">' +
      [0, 1, 2].map(i => '<g class="papel" style="--i:' + i + '"><rect x="' + (150 + i * 34) + '" y="' + (70 + i * 16) + '" width="130" height="170" rx="10"/>' +
        [0, 1, 2, 3, 4, 5].map(k => '<line x1="' + (166 + i * 34) + '" y1="' + (104 + i * 16 + k * 20) + '" x2="' + (264 + i * 34 - (k % 3) * 18) + '" y2="' + (104 + i * 16 + k * 20) + '"/>').join("") +
        '<rect class="fig" x="' + (166 + i * 34) + '" y="' + (86 + i * 16) + '" width="44" height="8" rx="3"/></g>').join("") +
      '<g class="lupa"><circle cx="0" cy="0" r="26"/><line x1="18" y1="18" x2="40" y2="40"/></g></g>',
    // dados: gráfico se construindo e uma rede aparecendo
    '<g class="cf" data-passo="1"><line class="eixo" x1="70" y1="250" x2="300" y2="250"/><line class="eixo" x1="70" y1="250" x2="70" y2="70"/>' +
      [80, 130, 105, 160, 120, 175].map((h, i) => '<rect class="barra" style="--i:' + i + '" x="' + (86 + i * 34) + '" y="' + (250 - h) + '" width="22" height="' + h + '" rx="4"/>').join("") +
      '<path class="linha" d="M97 190 L131 150 L165 168 L199 118 L233 140 L267 96"/>' +
      [[350, 100], [410, 80], [440, 150], [380, 190], [330, 230], [420, 240]].map((p, i) => '<circle class="no" style="--i:' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="9"/>').join("") +
      [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [2, 5], [4, 5]].map((e, i) => { const P = [[350, 100], [410, 80], [440, 150], [380, 190], [330, 230], [420, 240]];
        return '<line class="aresta" style="--i:' + i + '" x1="' + P[e[0]][0] + '" y1="' + P[e[0]][1] + '" x2="' + P[e[1]][0] + '" y2="' + P[e[1]][1] + '"/>'; }).join("") + "</g>",
    // descoberta: as conexões se revelam até um ponto que acende
    '<g class="cf" data-passo="2">' +
      [[90, 160], [160, 90], [170, 230], [250, 150], [320, 80], [330, 240], [400, 160]].map((p, i) => '<circle class="no" style="--i:' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 6 ? 16 : 10) + '"/>').join("") +
      [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]].map((e, i) => { const P = [[90, 160], [160, 90], [170, 230], [250, 150], [320, 80], [330, 240], [400, 160]];
        return '<line class="aresta' + ([0, 2, 4, 6].includes(i) ? " caminho" : "") + '" style="--i:' + i + '" x1="' + P[e[0]][0] + '" y1="' + P[e[0]][1] + '" x2="' + P[e[1]][0] + '" y2="' + P[e[1]][1] + '"/>'; }).join("") +
      '<circle class="brilho" cx="400" cy="160" r="16"/><circle class="brilho b2" cx="400" cy="160" r="16"/></g>',
    // comunicação: um texto simples aparecendo, em três idiomas
    '<g class="cf" data-passo="3"><rect class="tela" x="150" y="40" width="180" height="250" rx="22"/>' +
      [0, 1, 2, 3, 4].map(k => '<rect class="txt" style="--i:' + k + '" x="172" y="' + (86 + k * 24) + '" width="' + [136, 118, 128, 96, 110][k] + '" height="9" rx="4.5"/>').join("") +
      '<path class="balao" d="M350 70 h92 a14 14 0 0 1 14 14 v36 a14 14 0 0 1 -14 14 h-58 l-18 16 v-16 h-16 a14 14 0 0 1 -14 -14 v-36 a14 14 0 0 1 14 -14 z"/>' +
      ["PT", "EN", "ES"].map((l, i) => '<g class="lingua" style="--i:' + i + '"><rect x="' + (160 + i * 58) + '' + '" y="240" width="46" height="26" rx="13"/><text x="' + (183 + i * 58) + '" y="258">' + l + "</text></g>").join("") + "</g>"
  ];
  function comoFunciona() {
    const palco = $("#comoPalco"), lista = $("#comoPassos");
    if (!palco || !lista) return;
    palco.innerHTML = '<svg viewBox="0 0 480 320" preserveAspectRatio="xMidYMid meet" focusable="false">' + SVG_COMO.join("") + "</svg>";
    const grupos = $$(".cf", palco), bts = $$("button", lista);
    let atual = -1, auto = null, mexeu = false;
    function ir(k) {
      k = (k + 4) % 4;
      bts.forEach((b, i) => { if (i === k) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      grupos.forEach((g, i) => { g.classList.remove("ativo"); if (i === k) { void g.getBoundingClientRect(); g.classList.add("ativo"); } });
      atual = k;
    }
    ir(0);
    const parar = () => { mexeu = true; clearInterval(auto); auto = null; };
    bts.forEach((b, i) => b.addEventListener("click", () => { parar(); ir(i); }));
    lista.addEventListener("keydown", e => {
      const i = bts.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); bts[(i + 1) % 4].focus(); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); bts[(i + 3) % 4].focus(); }
    });
    // avança sozinho enquanto a seção está na tela, até a pessoa tocar em uma etapa
    naTela(palco, v => {
      if (parado() || mexeu) return;
      if (v && !auto) { ir(atual); auto = setInterval(() => ir(atual + 1), 4200); }
      if (!v && auto) { clearInterval(auto); auto = null; }
    });
    palco.parentNode.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && auto) { clearInterval(auto); auto = null; } });
    palco.parentNode.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !mexeu && !parado() && !auto) auto = setInterval(() => ir(atual + 1), 4200); });
  }

  /* =================== 3. mapa do conhecimento =================== */
  const norm = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  function mapa(d) {
    const cv = $("#mapaCanvas"), box = $("#mapaBox"), info = $("#mapaInfo");
    if (!cv || !box) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const arts = d.artigos || [], temas = (d.temas || []).filter(t => arts.some(a => (a.temas || []).includes(t.id)));
    const nos = [], idx = {}, arestas = [];
    const add = n => { idx[n.id] = nos.length; n.viz = []; nos.push(n); return n; };
    temas.forEach(t => add({ id: "t:" + t.id, tipo: "tema", nome: t.nome, cor: t.cor, texto: t.sobre, url: RAIZ + "artigos/#" + t.id }));
    (d.pesquisadoras || []).forEach(p => add({ id: "p:" + p.id, tipo: "pesq", nome: p.nome, cor: p.cor || "#E0385A", texto: p.vinculo, url: RAIZ + "artigos/?pesquisadora=" + p.id, iniciais: p.iniciais }));
    const nomesTema = new Set(temas.map(t => norm(t.nome)));
    arts.forEach(a => {
      const t0 = temas.find(t => (a.temas || []).includes(t.id));
      add({ id: "e:" + a.id, tipo: "estudo", nome: a.titulo_curto || a.titulo, cor: t0 ? t0.cor : "#6B7590", texto: (a.descoberta && a.descoberta.texto) || a.resumo, url: RAIZ + a.url, xp: !!a.experiencia });
      (a.tags || []).forEach(tag => {
        const k = "a:" + norm(tag);
        if (nomesTema.has(norm(tag))) return;           // assunto com o mesmo nome do tema: fica só o tema
        if (idx[k] == null) add({ id: k, tipo: "assunto", nome: tag, cor: "#3A4560" });
      });
    });
    const liga = (a, b) => { const i = idx[a], j = idx[b]; if (i == null || j == null) return; arestas.push([i, j]); nos[i].viz.push(j); nos[j].viz.push(i); };
    arts.forEach(a => {
      (a.temas || []).forEach(t => liga("e:" + a.id, "t:" + t));
      (a.tags || []).forEach(tag => liga("e:" + a.id, "a:" + norm(tag)));
      (a.pesquisadoras || []).forEach(p => liga("e:" + a.id, "p:" + p));
    });
    nos.forEach(n => { n.grau = n.viz.length; n.r = n.tipo === "tema" ? 11 : n.tipo === "pesq" ? 12 : n.tipo === "estudo" ? 6.5 : 4.5; });

    // posições: uma simulação simples de forças, calculada de uma vez
    const ang = (i, n) => i / n * Math.PI * 2;
    nos.forEach((n, i) => { const a = ang(i, nos.length), r = n.tipo === "tema" ? 120 : n.tipo === "estudo" ? 200 : 290; n.x = Math.cos(a) * r + rnd(20); n.y = Math.sin(a) * r + rnd(20); n.vx = 0; n.vy = 0; });
    // o formato da rede acompanha o da caixa: numa tela em pé, ela cresce para cima e para baixo
    const bw = box.clientWidth || 800, bh = box.clientHeight || 500, gx = .004 * Math.max(1, bh / bw) ** 1.4, gy = .004 * Math.max(1, bw / bh) ** 1.4;
    for (let it = 0; it < 420; it++) {
      const esfria = 1 - it / 420;
      for (let a = 0; a < nos.length; a++) for (let b = a + 1; b < nos.length; b++) {
        const A = nos[a], B = nos[b]; let dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy + .01;
        const f = 2600 / d2; const d = Math.sqrt(d2); dx /= d; dy /= d;
        A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f;
      }
      arestas.forEach(([a, b]) => {
        const A = nos[a], B = nos[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
        const alvo = (A.tipo === "tema" || B.tipo === "tema") ? 95 : 70, f = (d - alvo) * .035;
        A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f;
      });
      nos.forEach(n => { n.vx -= n.x * gx; n.vy -= n.y * gy; n.x += clamp(n.vx, -12, 12) * esfria; n.y += clamp(n.vy, -12, 12) * esfria; n.vx *= .6; n.vy *= .6; });
    }
    nos.forEach((n, i) => { n.fase = rnd(6.28); n.bx = n.x; n.by = n.y; n.ordem = i; });

    // desenho
    let W = 0, H = 0, vista = { k: 1, x: 0, y: 0 }, sel = null, sobre = null, entrada = parado() ? 1 : 0, t0 = 0, raf = 0, visivel = false;
    function caber() {
      const xs = nos.map(n => n.bx), ys = nos.map(n => n.by);
      const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
      // espaço para a legenda (em cima) e os botões (à direita)
      const topo = W < 600 ? 74 : 50, dir = 56, esq = 10, baixo = 10;
      const kx = (W - esq - dir) / (x1 - x0), ky = (H - topo - baixo) / (y1 - y0), k = Math.min(kx, ky);
      // estica um pouco a rede na direção que sobra espaço, para preencher o quadro
      const sx = clamp(kx / k, 1, 1.6), sy = clamp(ky / k, 1, 1.6);
      vista = { k: k, sx: sx, sy: sy, x: esq + (W - esq - dir) / 2 - (x0 + x1) / 2 * k * sx, y: topo + (H - topo - baixo) / 2 - (y0 + y1) / 2 * k * sy };
      vista.k0 = k;
    }
    function medir() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      caber(); desenhar();
    }
    const tela = n => ({ x: n.x * vista.k * (vista.sx || 1) + vista.x, y: n.y * vista.k * (vista.sy || 1) + vista.y });
    function desenhar(agora) {
      if (!W) return;
      const t = (agora || 0) / 1000, mov = !parado();
      const esc2 = document.documentElement.classList.contains("ge-escuro"), FUNDO = esc2 ? "#111831" : "#fff", TINTA = esc2 ? "#EEF2FF" : "#0F1730", ASS = esc2 ? "#9AA6C2" : "#3A4560";
      nos.forEach(n => { n.x = n.bx + (mov ? Math.sin(t * .6 + n.fase) * 2.2 : 0); n.y = n.by + (mov ? Math.cos(t * .5 + n.fase) * 2.2 : 0); });
      const e = suave(entrada);
      ctx.clearRect(0, 0, W, H);
      const foco = sel != null ? sel : sobre, vizinhos = foco != null ? new Set([foco].concat(nos[foco].viz)) : null;
      const cx = W / 2, cy = H / 2;
      const P = nos.map(n => { const p = tela(n); return { x: cx + (p.x - cx) * e, y: cy + (p.y - cy) * e }; });
      arestas.forEach(([a, b], i) => {
        const on = vizinhos && vizinhos.has(a) && vizinhos.has(b) && (a === foco || b === foco);
        ctx.strokeStyle = on ? "rgba(224,56,90,.75)" : vizinhos ? "rgba(128,140,170,.08)" : "rgba(128,140,170," + (.3 * e).toFixed(3) + ")";
        ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
      });
      const zoom = vista.k / (vista.k0 || 1);
      nos.forEach((n, i) => {
        const p = P[i], apag = vizinhos && !vizinhos.has(i), r = n.r * clamp(Math.sqrt(zoom), .8, 1.8) * e;
        ctx.globalAlpha = apag ? .18 : 1;
        if (n.tipo === "tema") {
          ctx.fillStyle = n.cor + "2A"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9, 0, 6.283); ctx.fill();
          ctx.fillStyle = n.cor; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
        } else if (n.tipo === "pesq") {
          ctx.fillStyle = FUNDO; ctx.strokeStyle = n.cor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill(); ctx.stroke();
          ctx.fillStyle = n.cor; ctx.font = "700 " + Math.round(r * .8) + "px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.iniciais || "", p.x, p.y + .5);
        } else if (n.tipo === "estudo") {
          ctx.fillStyle = FUNDO; ctx.strokeStyle = n.cor; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill(); ctx.stroke();
          ctx.fillStyle = n.cor; ctx.beginPath(); ctx.arc(p.x, p.y, r * .38, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = ASS; ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.2); ctx.lineTo(p.x + r * 1.2, p.y); ctx.lineTo(p.x, p.y + r * 1.2); ctx.lineTo(p.x - r * 1.2, p.y); ctx.closePath(); ctx.fill();
        }
        if (i === foco) { ctx.strokeStyle = "rgba(224,56,90,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 6, 0, 6.283); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
      // nomes: primeiro os mais importantes; um nome não cobre outro
      if (e > .6) {
        const ordem = nos.map((n, i) => i).sort((a, b) => prioridade(b, vizinhos, zoom) - prioridade(a, vizinhos, zoom));
        // os pontos contam como ocupados: um nome não fica por cima de outro ponto
        const ocupado = P.map((p, i) => { const r = nos[i].r * clamp(Math.sqrt(zoom), .8, 1.8) + 2; return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2, i: i }; });
        ctx.font = "500 12px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ordem.forEach(i => {
          const n = nos[i], pr = prioridade(i, vizinhos, zoom); if (pr <= 0) return;
          let txt = n.nome; if (txt.length > 34) txt = txt.slice(0, 32) + "…";
          const w = ctx.measureText(txt).width + 10, h = 18, p = P[i], rr = n.r + 6;
          const opcoes = [[p.x + rr, p.y - h / 2], [p.x - rr - w, p.y - h / 2], [p.x - w / 2, p.y - rr - h], [p.x - w / 2, p.y + rr]];
          const livre = opcoes.map(([x, y]) => [clamp(x, 2, W - w - 2), clamp(y, 2, H - h - 2)])
            .find(([x, y]) => !ocupado.some(o => o.i !== i && x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y));
          if (!livre) return;
          const x = livre[0], y = livre[1];
          ocupado.push({ x: x, y: y, w: w, h: h });
          ctx.fillStyle = esc2 ? "rgba(17,24,49,.9)" : "rgba(255,255,255,.88)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h); ctx.fill();
          ctx.fillStyle = vizinhos && !vizinhos.has(i) ? (esc2 ? "rgba(238,242,255,.3)" : "rgba(15,23,48,.3)") : n.tipo === "tema" && !esc2 ? n.cor : TINTA;
          if (n.tipo === "tema") ctx.font = "600 12px 'IBM Plex Sans', sans-serif"; else ctx.font = "500 12px 'IBM Plex Sans', sans-serif";
          ctx.fillText(txt, x + 5, y + h / 2 + .5);
        });
      }
    }
    function prioridade(i, vizinhos, zoom) {
      const n = nos[i];
      if (vizinhos) return vizinhos.has(i) ? (i === (sel != null ? sel : sobre) ? 100 : 60) : 0;
      if (n.tipo === "tema") return 50;
      if (n.tipo === "pesq") return 40;
      if (n.tipo === "assunto") return zoom > 1.25 || n.grau > 1 ? 20 + n.grau : 0;
      return zoom > 1.6 ? 10 : 0;                          // os estudos aparecem ao aproximar
    }
    function laço(agora) {
      raf = 0;
      if (entrada < 1) { if (!t0) t0 = agora; entrada = clamp((agora - t0) / 1300, 0, 1); }
      desenhar(agora);
      if (visivel && (!parado() || entrada < 1)) raf = requestAnimationFrame(laço);
    }
    const acordar = () => { if (!raf) raf = requestAnimationFrame(laço); };
    medir();
    addEventListener("resize", medir);
    naTela(box, v => { visivel = v; if (v) acordar(); });
    document.addEventListener("ge-movimento", () => { desenhar(); acordar(); });
    document.addEventListener("ge-acessibilidade", () => { medir(); acordar(); });

    // legenda
    const leg = $("#mapaLegenda");
    if (leg) leg.innerHTML = [["tema", T("Tema")], ["assunto", T("Assunto")], ["estudo", T("Estudo")], ["pesq", T("Pesquisadora")]]
      .map(([k, r]) => '<span class="ml ml-' + k + '"><i aria-hidden="true"></i>' + esc(r) + "</span>").join("");

    // tocar, arrastar, pinçar e zoom
    const ponteiros = new Map(); let arrasto = null, pinca = null;
    const perto = (x, y) => { let m = null, md = 1e9; nos.forEach((n, i) => { const p = tela(n), d = Math.hypot(p.x - x, p.y - y); if (d < Math.max(14, n.r * vista.k / (vista.k0 || 1) + 10) && d < md) { md = d; m = i; } }); return m; };
    const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function zoomEm(f, x, y) {
      const k = clamp(vista.k * f, vista.k0 * .6, vista.k0 * 4);
      vista.x = x - (x - vista.x) * (k / vista.k); vista.y = y - (y - vista.y) * (k / vista.k); vista.k = k; desenhar(performance.now());
    }
    cv.addEventListener("pointerdown", e => {
      ponteiros.set(e.pointerId, local(e));
      if (ponteiros.size === 1) arrasto = { ...local(e), vx: vista.x, vy: vista.y, moveu: false };
      if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), k: vista.k }; arrasto = null; }
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener("pointermove", e => {
      const p = local(e);
      if (ponteiros.has(e.pointerId)) ponteiros.set(e.pointerId, p);
      if (pinca && ponteiros.size === 2) {
        const [a, b] = [...ponteiros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomEm((pinca.k * d / pinca.d) / vista.k, (a.x + b.x) / 2, (a.y + b.y) / 2); return;
      }
      if (arrasto && ponteiros.size === 1) {
        const dx = p.x - arrasto.x, dy = p.y - arrasto.y;
        if (Math.hypot(dx, dy) > 5) arrasto.moveu = true;
        if (arrasto.moveu) { vista.x = arrasto.vx + dx; vista.y = arrasto.vy + dy; desenhar(performance.now()); }
        return;
      }
      if (e.pointerType === "mouse") { const s = perto(p.x, p.y); if (s !== sobre) { sobre = s; cv.style.cursor = s != null ? "pointer" : "grab"; desenhar(performance.now()); } }
    });
    const soltar = e => {
      const p = local(e), era = arrasto;
      ponteiros.delete(e.pointerId);
      if (ponteiros.size < 2) pinca = null;
      if (era && !era.moveu && e.type === "pointerup") escolher(perto(p.x, p.y));
      if (!ponteiros.size) arrasto = null;
    };
    cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
    cv.addEventListener("pointerleave", () => { if (sobre != null) { sobre = null; desenhar(performance.now()); } });
    cv.addEventListener("wheel", e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const p = local(e); zoomEm(Math.exp(-e.deltaY * .01), p.x, p.y); }, { passive: false });
    $("#mapaMais").addEventListener("click", () => zoomEm(1.35, W / 2, H / 2));
    $("#mapaMenos").addEventListener("click", () => zoomEm(1 / 1.35, W / 2, H / 2));
    $("#mapaCentro").addEventListener("click", () => { escolher(null); caber(); desenhar(performance.now()); });

    const TIPO = { tema: T("Tema"), assunto: T("Assunto"), estudo: T("Estudo"), pesq: T("Pesquisadora") };
    function escolher(i) {
      sel = i; desenhar(performance.now());
      if (i == null) { info.hidden = true; return; }
      const n = nos[i], viz = n.viz.map(j => nos[j]);
      const estudos = viz.filter(v => v.tipo === "estudo"), outros = viz.filter(v => v.tipo !== "estudo");
      let h = '<button type="button" class="mi-fechar" aria-label="' + esc(T("Fechar")) + '">✕</button>' +
        '<span class="mi-tipo mi-' + n.tipo + '">' + esc(TIPO[n.tipo]) + "</span><b>" + esc(n.nome) + "</b>";
      if (n.tipo === "assunto") h += "<p>" + esc(T("Aparece em")) + " " + esc(estudos.length === 1 ? T("1 estudo") : estudos.length + " " + T("estudos")) + ".</p>";
      else if (n.texto) h += "<p>" + esc(n.texto) + "</p>";
      if (n.tipo === "estudo" && outros.length) h += '<p class="mi-liga">' + outros.map(o => esc(o.nome)).join(" · ") + "</p>";
      if (estudos.length && n.tipo !== "estudo") h += "<ul>" + estudos.map(s => '<li><a href="' + esc(s.url) + '">' + esc(s.nome) + "</a></li>").join("") + "</ul>";
      if (n.url && n.tipo !== "assunto") h += '<a class="mi-ir" href="' + esc(n.url) + '">' + esc(n.tipo === "estudo" ? (n.xp ? T("Ver a experiência interativa") : T("Abrir o estudo")) : n.tipo === "tema" ? T("Abrir o tema") : T("Ver os estudos dela")) + " →</a>";
      info.innerHTML = h; info.hidden = false;
      $(".mi-fechar", info).addEventListener("click", () => escolher(null));
    }
    document.addEventListener("keydown", e => { if (e.key === "Escape" && sel != null) escolher(null); });

    // a mesma informação em lista (leitores de tela e teclado)
    const lista = $("#mapaLista");
    if (lista) lista.innerHTML = temas.map(t => {
      const es = arts.filter(a => (a.temas || []).includes(t.id));
      return '<div class="mapa-grupo"><h3><a href="' + esc(RAIZ + "artigos/#" + t.id) + '">' + esc(t.nome) + "</a></h3><ul>" + es.map(a => {
        const quem = (a.pesquisadoras || []).map(p => ((d.pesquisadoras || []).find(x => x.id === p) || {}).nome).filter(Boolean);
        return '<li><a href="' + esc(RAIZ + a.url) + '">' + esc(a.titulo_curto) + "</a>" + ((a.tags || []).length || quem.length ? '<span class="ml-tags">' + esc((a.tags || []).concat(quem).join(" · ")) + "</span>" : "") + "</li>";
      }).join("") + "</ul></div>";
    }).join("");
  }

  /* =================== 4. descobertas recentes =================== */
  function descobertas(d) {
    const box = $("#descobertasLista"); if (!box) return;
    const temas = {}; (d.temas || []).forEach(t => { temas[t.id] = t; });
    const lista = (d.artigos || []).filter(a => a.descoberta).sort((x, y) => String(y.data).localeCompare(String(x.data))).slice(0, 6);
    box.innerHTML = lista.map((a, i) => {
      const t = temas[(a.temas || [])[0]] || {};
      return '<article class="dsc" style="--c:' + esc(t.cor || "#E0385A") + ';--i:' + i + '"><a class="dsc-link" href="' + esc(RAIZ + a.url) + '">' +
        '<div class="dsc-img"><span style="background-image:url(\'' + esc(RAIZ + a.capa) + '\')" role="img" aria-label="' + esc(a.capa_alt || "") + '"></span>' +
          (a.experiencia ? '<em class="dsc-xp">' + esc(T("Experiência interativa")) + "</em>" : "") + "</div>" +
        '<div class="dsc-corpo"><div class="dsc-tags"><span class="dsc-tema">' + esc(t.nome || "") + "</span>" + (a.tags || []).filter(g => norm(g) !== norm(t.nome || "")).slice(0, 2).map(g => '<span class="dsc-tag">' + esc(g) + "</span>").join("") + "</div>" +
          "<h3>" + esc(a.titulo_curto || a.titulo) + "</h3>" +
          '<div class="dsc-desc"><span class="dsc-rot">' + esc(T("Principal descoberta")) + "</span><b>" + esc(a.descoberta.titulo) + "</b><p>" + esc(a.descoberta.texto) + "</p></div>" +
          (a.numero ? '<div class="dsc-num"><b>' + esc(a.numero.valor) + "</b><span>" + esc(a.numero.texto) + "</span></div>" : "") +
          '<span class="dsc-btn">' + esc(a.experiencia ? T("Ver a experiência interativa") : T("Explorar")) + ' <span aria-hidden="true">→</span></span></div></a></article>';
    }).join("");
    // profundidade: o cartão inclina e a imagem se move com o mouse
    $$(".dsc", box).forEach(c => {
      c.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse" || parado()) return;
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg"); c.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
        c.style.setProperty("--mx", ((x + .5) * 100).toFixed(1) + "%"); c.style.setProperty("--my", ((y + .5) * 100).toFixed(1) + "%");
        c.style.setProperty("--ix", (-x * 14).toFixed(1) + "px"); c.style.setProperty("--iy", (-y * 10).toFixed(1) + "px");
        c.classList.add("mexe");
      });
      c.addEventListener("pointerleave", () => { c.classList.remove("mexe"); ["--rx", "--ry", "--ix", "--iy"].forEach(v => c.style.removeProperty(v)); });
    });
    aoVer(box, () => box.classList.add("visto"), .1);
  }

  /* =================== 5. explore a ciência =================== */
  // um símbolo animado para cada tema (desenhos conceituais)
  const SIMBOLO = {
    genetica: '<svg viewBox="0 0 64 64"><path class="s-fita" d="M22 6c0 14 20 16 20 26S22 44 22 58"/><path class="s-fita b" d="M42 6c0 14-20 16-20 26s20 16 20 26"/>' + [14, 22, 32, 42, 50].map((y, i) => '<line class="s-degrau" style="--i:' + i + '" x1="24" y1="' + y + '" x2="40" y2="' + y + '"/>').join("") + "</svg>",
    "biologia-molecular": '<svg viewBox="0 0 64 64"><circle class="s-no" cx="32" cy="20" r="6"/><circle class="s-no" cx="18" cy="42" r="6"/><circle class="s-no" cx="46" cy="42" r="6"/><path class="s-liga" d="M32 26L20 37M32 26l12 11M24 42h16"/></svg>',
    bioinformatica: '<svg viewBox="0 0 64 64"><path class="s-liga" d="M14 20l18 12 18-14M32 32l-14 16M32 32l16 14M14 20l4 28"/>' + [[14, 20], [32, 32], [50, 18], [18, 48], [48, 46]].map((p, i) => '<circle class="s-pisca" style="--i:' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="4.5"/>').join("") + "</svg>",
    oncologia: '<svg viewBox="0 0 64 64"><path class="s-celula" d="M32 10c10 0 20 6 21 18 1 11-7 24-20 25S11 45 11 33c0-13 10-23 21-23z"/><circle class="s-nucleo" cx="33" cy="32" r="8"/><circle class="s-alvo" cx="33" cy="32" r="16"/></svg>',
    microbiologia: '<svg viewBox="0 0 64 64"><g class="s-bac"><rect x="16" y="24" width="30" height="14" rx="7"/><path d="M46 31c4 0 4-5 8-5M46 33c4 0 4 5 8 5"/></g><g class="s-bac b"><rect x="12" y="44" width="20" height="10" rx="5"/></g></svg>',
    biomateriais: '<svg viewBox="0 0 64 64"><path class="s-hex" d="M20 14l10-6 10 6v12l-10 6-10-6zM36 34l10-6 10 6v12l-10 6-10-6zM8 36l10-6 10 6v12l-10 6-10-6z"/><circle class="s-nano" cx="30" cy="32" r="3.5"/></svg>',
    toxinologia: '<svg viewBox="0 0 64 64"><path class="s-gota" d="M32 8c7 11 13 19 13 27a13 13 0 0 1-26 0c0-8 6-16 13-27z"/><ellipse class="s-onda" cx="32" cy="56" rx="10" ry="3"/></svg>',
    "saude-publica": '<svg viewBox="0 0 64 64"><path class="s-pulso" d="M6 34h12l5-12 8 24 6-16 4 4h17"/><path class="s-cruz" d="M44 10h6v6h6v6h-6v6h-6v-6h-6v-6h6z"/></svg>',
    fonoaudiologia: '<svg viewBox="0 0 64 64"><path class="s-balao" d="M8 14h34v22H24l-9 8v-8H8z"/><path class="s-fala" d="M47 18q5 7 0 14"/><path class="s-fala b" d="M53 13q9 12 0 24"/></svg>',
    "meio-ambiente": '<svg viewBox="0 0 64 64"><path class="s-folha" d="M14 50C14 26 30 12 52 12c0 24-14 38-38 38zM14 50L36 28"/><path class="s-agua" d="M8 56c6-4 10 4 16 0s10 4 16 0 10 4 16 0"/></svg>'
  };
  function ciencia(d) {
    const grade = $("#temasInicio"), painel = $("#temaPainel"); if (!grade || !painel) return;
    const arts = d.artigos || [];
    grade.innerHTML = (d.temas || []).map(t => {
      const n = arts.filter(a => (a.temas || []).includes(t.id)).length; if (!n) return "";
      return '<a class="tema-tile tema-simbolo" href="' + esc(RAIZ + "artigos/#" + t.id) + '" data-tema="' + esc(t.id) + '" style="--c:' + esc(t.cor) + '" role="button" aria-expanded="false" aria-controls="temaPainel">' +
        '<span class="simb" aria-hidden="true">' + (SIMBOLO[t.id] || SIMBOLO["biologia-molecular"]) + "</span><b>" + esc(t.nome) + "</b><span>" + n + (n > 1 ? " estudos" : " estudo") + "</span></a>";
    }).join("");
    // colunas que dividem os temas sem deixar um sozinho na última linha (8 → 4, 9 → 3...)
    const nT = $$(".tema-tile", grade).length, cols = [4, 3, 5].find(c => nT % c === 0) || (nT % 4 >= 2 ? 4 : 3);
    grade.style.setProperty("--cols", cols);
    naTela(grade, v => grade.classList.toggle("anima", v && !parado()));
    let aberto = null;
    $$(".tema-tile", grade).forEach(tile => {
      const id = tile.dataset.tema;
      tile.addEventListener("click", e => {
        e.preventDefault();
        $$(".tema-tile", grade).forEach(t => t.setAttribute("aria-expanded", "false"));
        if (aberto === id) { aberto = null; painel.hidden = true; return; }
        aberto = id; tile.setAttribute("aria-expanded", "true");
        const t = (d.temas || []).find(x => x.id === id) || {}, lista = arts.filter(a => (a.temas || []).includes(id));
        painel.style.setProperty("--c", t.cor || "var(--accent)");
        painel.innerHTML = '<div class="tp-topo"><div><b>' + esc(t.nome || "") + "</b><p>" + esc(t.sobre || "") + '</p></div><a class="link-more" href="' + esc(RAIZ + "artigos/#" + id) + '">' + esc(T("Abrir o tema")) + " →</a></div>" +
          '<div class="tp-trilho">' + lista.map(a => '<a class="tp-card" href="' + esc(RAIZ + a.url) + '">' +
            (a.capa ? '<span class="tp-img" style="background-image:url(\'' + esc(RAIZ + a.capa) + '\')"></span>' : "") +
            (a.experiencia ? '<span class="tp-xp">' + esc(T("Experiência interativa")) + "</span>" : a.selo ? '<span class="tp-xp and">' + esc(a.selo) + "</span>" : "") +
            "<b>" + esc(a.titulo_curto || a.titulo) + "</b><small>" + esc(a.autores_curto || "") + "</small></a>").join("") + "</div>";
        painel.hidden = false;
        const r = painel.getBoundingClientRect();
        if (r.bottom > innerHeight) scrollBy({ top: Math.min(r.bottom - innerHeight + 24, r.top - 90), behavior: parado() ? "auto" : "smooth" });
      });
    });
  }

  /* =================== 6. rede da p53 =================== */
  function redeP53() {
    const box = $("#redeP53"); if (!box) return;
    fetch(RAIZ + "data/rede-p53.json", { cache: "no-cache" }).then(r => r.json()).then(R => {
      const tx = R.textos[L] || R.textos.pt, rot = n => typeof n.rotulo === "string" ? n.rotulo : (n.rotulo[L] || n.rotulo.pt);
      const lede = $("#conectaLede"); if (lede) { lede.textContent = tx.lede; lede.setAttribute("data-sem-traducao", ""); }
      box.setAttribute("data-sem-traducao", "");
      const grupos = R.grupos, cor = {}; grupos.forEach(g => { cor[g.id] = g.cor; });
      let retrato = box.clientWidth < 620;
      const nos = [Object.assign({ grupo: "centro" }, R.centro)].concat(R.nos);
      // posições: no computador, cada grupo num setor ao redor da p53; no celular, as proteínas num anel
      // de dentro e o resto num anel de fora, como "pílulas" com o nome dentro (nada fica cortado na borda)
      const larguraPilula = n => Math.max(58, rot(n).length * 8 + 24);
      function posicionar() {
        retrato = box.clientWidth < 620;
        if (retrato) {
          // proteínas ao redor da p53; processos em duas fileiras em cima; dados e fármacos em duas embaixo
          const V = { w: 420, h: 620, cx: 210, cy: 320 };
          nos.filter(n => n.grupo === "proteinas").forEach((n, i) => { const a = (-162 + i * 72) * Math.PI / 180; n.x = V.cx + Math.cos(a) * 150; n.y = V.cy + Math.sin(a) * 120; n.pilula = false; });
          const cima = [[115, 70], [305, 70], [115, 120], [305, 120]], baixo = [[115, 515], [305, 515], [115, 565], [305, 565]];
          nos.filter(n => n.grupo === "processos").forEach((n, i) => { n.pilula = true; n.lw = larguraPilula(n); [n.x, n.y] = cima[i % 4]; });
          nos.filter(n => n.grupo === "dados" || n.grupo === "farmacos").forEach((n, i) => { n.pilula = true; n.lw = larguraPilula(n); [n.x, n.y] = baixo[i % 4]; });
          nos[0].x = V.cx; nos[0].y = V.cy;
          return V;
        }
        // computador: proteínas em cima e embaixo da p53; processos numa coluna à esquerda, dados e fármacos à direita
        const V = { w: 700, h: 480, cx: 350, cy: 240 };
        nos.filter(n => n.grupo === "proteinas").forEach((n, i) => { const a = [-125, -90, -55, 55, 125][i % 5] * Math.PI / 180; n.x = V.cx + Math.cos(a) * 150; n.y = V.cy + Math.sin(a) * 150; n.pilula = false; });
        const ys = [150, 210, 270, 330];
        nos.filter(n => n.grupo === "processos").forEach((n, i) => { n.pilula = true; n.lw = larguraPilula(n); n.x = 88; n.y = ys[i % 4]; });
        nos.filter(n => n.grupo === "dados" || n.grupo === "farmacos").forEach((n, i) => { n.pilula = true; n.lw = larguraPilula(n); n.x = 612; n.y = ys[i % 4]; });
        nos[0].x = V.cx; nos[0].y = V.cy;
        return V;
      }
      let V = posicionar();
      const filtros = '<div class="rd-filtros" role="group" aria-label="' + esc(T("Mostrar")) + '"><button type="button" aria-pressed="true" data-g="">' + esc(tx.todos) + "</button>" +
        grupos.map(g => '<button type="button" aria-pressed="false" data-g="' + g.id + '" style="--c:' + g.cor + '"><i aria-hidden="true"></i>' + esc(g[L] || g.pt) + "</button>").join("") + "</div>";
      box.innerHTML = filtros + '<div class="rd-area"><svg class="rd-svg" role="group" aria-label="' + esc(tx.lede) + '"></svg>' +
        '<div class="rd-zoom"><button type="button" data-z="1.3" aria-label="' + esc(T("Aproximar")) + '">+</button><button type="button" data-z="0.77" aria-label="' + esc(T("Afastar")) + '">−</button><button type="button" data-z="0" aria-label="' + esc(T("Centralizar")) + '">⟲</button></div></div>' +
        '<div class="rd-info" aria-live="polite"></div><p class="rd-nota">' + esc(tx.nota) + ' <a href="' + esc(RAIZ + R.estudo) + '">' + esc(tx.abrir) + " →</a></p>";
      const svg = $(".rd-svg", box), infoEl = $(".rd-info", box);
      let vb = null;
      function desenhar() {
        V = posicionar(); vb = { x: 0, y: 0, w: V.w, h: V.h }; aplicar();
        svg.innerHTML = '<g class="rd-arestas">' + nos.slice(1).map((n, i) => '<line class="rd-a" data-id="' + n.id + '" data-g="' + n.grupo + '" style="--c:' + cor[n.grupo] + ';--i:' + i + '" x1="' + V.cx + '" y1="' + V.cy + '" x2="' + n.x.toFixed(1) + '" y2="' + n.y.toFixed(1) + '"/>').join("") + "</g>" +
          nos.map((n, i) => {
            const c = n.grupo === "centro" ? "#E0385A" : cor[n.grupo], r = n.grupo === "centro" ? 44 : n.grupo === "proteinas" ? 29 : 13, fora = n.grupo !== "proteinas" && n.grupo !== "centro";
            const lx = n.x + (n.x < V.cx - 5 ? -1 : n.x > V.cx + 5 ? 1 : 0) * (r + 8), anc = n.x < V.cx - 5 ? "end" : n.x > V.cx + 5 ? "start" : "middle";
            const ly = n.x > V.cx - 5 && n.x < V.cx + 5 ? n.y + r + 18 : n.y + 5;
            const t = n[L] || n.pt;
            const abre = '<g class="rd-no rd-' + n.grupo + '" data-id="' + n.id + '" data-g="' + n.grupo + '" tabindex="0" role="button" aria-label="' + esc(t.titulo) + '" style="--c:' + c + ';--i:' + i + ';--x:' + n.x.toFixed(1) + 'px;--y:' + n.y.toFixed(1) + 'px;--cx:' + V.cx + "px;--cy:" + V.cy + 'px">';
            if (n.pilula) return abre + '<g class="rd-mov"><rect class="rd-halo" x="' + (n.x - n.lw / 2 - 6).toFixed(1) + '" y="' + (n.y - 21).toFixed(1) + '" width="' + (n.lw + 12).toFixed(1) + '" height="42" rx="21"/>' +
              '<rect class="rd-bola" x="' + (n.x - n.lw / 2).toFixed(1) + '" y="' + (n.y - 15).toFixed(1) + '" width="' + n.lw.toFixed(1) + '" height="30" rx="15"/>' +
              '<text class="rd-rot" x="' + n.x.toFixed(1) + '" y="' + (n.y + 5).toFixed(1) + '" text-anchor="middle">' + esc(rot(n)) + "</text></g></g>";
            return abre +
              '<g class="rd-mov"><circle class="rd-halo" cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + (r + 9) + '"/><circle class="rd-bola" cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + r + '"/>' +
              (fora ? '<text class="rd-rot fora" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anc + '">' + esc(rot(n)) + "</text>" :
                '<text class="rd-rot" x="' + n.x.toFixed(1) + '" y="' + (n.y + (n.grupo === "centro" ? 8 : 5)).toFixed(1) + '" text-anchor="middle">' + esc(rot(n)) + "</text>") + "</g></g>";
          }).join("");
        $$(".rd-no", svg).forEach(g => {
          g.addEventListener("click", () => escolher(g.dataset.id));
          g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(g.dataset.id); } });
          g.addEventListener("pointerenter", () => marcar(g.dataset.id, true)); g.addEventListener("pointerleave", () => marcar(g.dataset.id, false));
        });
        escolher(escolhido || "p53", true);
      }
      function aplicar() { svg.setAttribute("viewBox", vb.x.toFixed(1) + " " + vb.y.toFixed(1) + " " + vb.w.toFixed(1) + " " + vb.h.toFixed(1)); }
      function marcar(id, on) { const l = $('.rd-a[data-id="' + id + '"]', svg); if (l) l.classList.toggle("quente", on); }
      let escolhido = null;
      function escolher(id, inicio) {
        escolhido = id;
        const n = nos.find(x => x.id === id) || nos[0], t = n[L] || n.pt;
        $$(".rd-no", svg).forEach(g => g.classList.toggle("sel", g.dataset.id === id));
        $$(".rd-a", svg).forEach(l => l.classList.toggle("sel", l.dataset.id === id));
        const g = grupos.find(x => x.id === n.grupo);
        infoEl.style.setProperty("--c", n.grupo === "centro" ? "#E0385A" : cor[n.grupo]);
        infoEl.innerHTML = '<span class="rd-tipo">' + esc(g ? (g[L] || g.pt) : "TP53") + "</span><b>" + esc(t.titulo) + "</b><p>" + esc(t.texto) + '</p><p class="rd-fonte">' + esc(tx.fonte) + ": " + esc(t.fonte) + "</p>";
        if (!inicio && !parado()) infoEl.animate([{ opacity: .3, filter: "blur(3px)" }, { opacity: 1, filter: "none" }], { duration: 320, easing: "ease-out" });
      }
      // filtros: mostrar só um grupo de ligações
      $$(".rd-filtros button", box).forEach(b => b.addEventListener("click", () => {
        $$(".rd-filtros button", box).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        const g = b.dataset.g;
        $$(".rd-no, .rd-a", svg).forEach(el => el.classList.toggle("some", !!g && el.dataset.g !== g && el.dataset.g !== "centro"));
      }));
      // aproximar, afastar, arrastar e pinçar
      function zoom(f, cx, cy) {
        if (!f) { vb = { x: 0, y: 0, w: V.w, h: V.h }; aplicar(); return; }
        const w = clamp(vb.w / f, V.w * .35, V.w * 1.4), h = w * V.h / V.w;
        cx = cx == null ? vb.x + vb.w / 2 : cx; cy = cy == null ? vb.y + vb.h / 2 : cy;
        vb = { x: cx - (cx - vb.x) * (w / vb.w), y: cy - (cy - vb.y) * (h / vb.h), w: w, h: h }; aplicar();
      }
      $$(".rd-zoom button", box).forEach(b => b.addEventListener("click", () => zoom(+b.dataset.z)));
      const pt = e => { const r = svg.getBoundingClientRect(), s = Math.max(vb.w / r.width, vb.h / r.height); return { x: vb.x + (e.clientX - r.left) * s, y: vb.y + (e.clientY - r.top) * s, s: s }; };
      const ps = new Map(); let arr = null, pin = null;
      svg.addEventListener("pointerdown", e => {
        if (e.target.closest(".rd-no")) return;
        ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ps.size === 1) arr = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, s: pt(e).s };
        if (ps.size === 2) { const [a, b] = [...ps.values()]; pin = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w }; arr = null; }
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      });
      svg.addEventListener("pointermove", e => {
        if (!ps.has(e.pointerId)) return; ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pin && ps.size === 2) { const [a, b] = [...ps.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoom(vb.w / (pin.w * pin.d / d)); return; }
        if (arr) { vb.x = arr.vx - (e.clientX - arr.x) * arr.s; vb.y = arr.vy - (e.clientY - arr.y) * arr.s; aplicar(); }
      });
      const fim = e => { ps.delete(e.pointerId); if (ps.size < 2) pin = null; if (!ps.size) arr = null; };
      svg.addEventListener("pointerup", fim); svg.addEventListener("pointercancel", fim);
      svg.addEventListener("wheel", e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const p = pt(e); zoom(Math.exp(-e.deltaY * .01), p.x, p.y); }, { passive: false });
      desenhar();
      let largura = box.clientWidth;
      addEventListener("resize", () => { if (Math.abs(box.clientWidth - largura) > 40) { largura = box.clientWidth; desenhar(); } });
      aoVer(box, () => box.classList.add("visto"), .2);
    }).catch(() => { box.innerHTML = ""; });
  }

  /* =================== 7. movimento da página: seções e elementos flutuantes =================== */
  function movimento() {
    // cada seção entra de um jeito: foco, cortina ou escala (nada de só subir de baixo)
    const jeitos = ["v-foco", "v-cortina", "v-escala"];
    const secs = $$("main.home .sec, main.home .install-card");
    if (!parado() && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top > innerHeight * .9) { s.classList.add("entra", jeitos[i % 3]); io.observe(s); } else s.classList.add("visto"); });
    }
    // moléculas desenhadas flutuando ao fundo, em profundidades diferentes
    const main = $("main.home"); if (!main || LEVE) return;
    const MOL = [
      '<svg viewBox="0 0 80 80"><path d="M40 8l28 16v32L40 72 12 56V24z"/><circle cx="40" cy="8" r="4"/><circle cx="68" cy="56" r="4"/><circle cx="12" cy="56" r="4"/></svg>',
      '<svg viewBox="0 0 80 80"><circle cx="20" cy="40" r="8"/><circle cx="60" cy="24" r="6"/><circle cx="58" cy="60" r="7"/><path d="M27 37l27-10M27 44l25 13"/></svg>',
      '<svg viewBox="0 0 80 80"><path d="M24 6c0 20 32 22 32 34S24 54 24 74M56 6c0 20-32 22-32 34s32 14 32 34"/></svg>'
    ];
    const fl = document.createElement("div"); fl.className = "flutuantes"; fl.setAttribute("aria-hidden", "true");
    const lugares = [[4, 14, .12], [88, 22, .2], [8, 38, .08], [90, 52, .16], [6, 68, .22], [86, 84, .1]];
    fl.innerHTML = lugares.map((l, i) => '<span class="mol" data-p="' + l[2] + '" style="left:' + l[0] + "%;top:" + l[1] + "%;--r:" + (i * 37) + 'deg">' + MOL[i % 3] + "</span>").join("");
    main.prepend(fl);
    const mols = $$(".mol", fl); let pedido = 0;
    const mover = () => { pedido = 0; if (parado()) { mols.forEach(m => { m.style.transform = ""; }); return; } const y = scrollY; mols.forEach(m => { m.style.transform = "translateY(" + (-y * +m.dataset.p).toFixed(1) + "px) rotate(" + (y * .02).toFixed(1) + "deg)"; }); };
    addEventListener("scroll", () => { if (!pedido) pedido = requestAnimationFrame(mover); }, { passive: true });
    mover();
  }

  abertura();
  comoFunciona();
  redeP53();
  movimento();
  dados.then(d => { mapa(d); descobertas(d); ciencia(d); }).catch(() => {});
})();
