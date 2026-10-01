/* GenoEvidence · experiências interativas
   Monta uma reportagem científica em rolagem a partir de um roteiro (roteiro.json na pasta da experiência;
   roteiro.en.json e roteiro.es.json para inglês e espanhol).
   Cada cena tem um palco fixo (o visual) e passos de texto que passam por cima. O visual reage ao passo ativo
   (elementos com data-desde / data-ate, destaques) e, em algumas cenas, ao quanto a cena já foi rolada.
   Tipos de visual: particulas, escala, veiculos, funil, niveis, barras, destaques, pele, zno, comparacao,
   colunas, amostras, limites, fila, icones, tempo. Quem prefere movimento reduzido vê tudo parado, sem rolagem presa. */
(function () {
  "use strict";
  const I = window.GE_I18N || { lang: "pt", locale: "pt-BR", t: s => s, montarSeletor: () => {} };
  const T = s => I.t(s);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ge-sem-animacao");
  const NS = "http://www.w3.org/2000/svg";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v, d) => Number(v).toLocaleString(I.locale, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function el(tag, attrs, pai, html) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    if (pai) pai.appendChild(e);
    return e;
  }
  function sv(tag, attrs, pai) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }
  // mostra os elementos com data-desde (e data-ate) de acordo com o passo
  // "atual" marca os que entraram por último (no celular, as listas mostram só esses)
  function revelar(raiz, k) {
    const itens = $$("[data-desde]", raiz);
    const ultimo = Math.max(-1, ...itens.map(e => +e.dataset.desde).filter(d => d <= k));
    itens.forEach(e => {
      const de = +e.dataset.desde, ate = e.dataset.ate != null ? +e.dataset.ate : Infinity;
      e.classList.toggle("on", k >= de && k <= ate);
      e.classList.toggle("atual", de === ultimo);
    });
  }
  // destaca os itens citados em "foco" no passo; os outros ficam apagados
  function focar(itens, foco) {
    itens.forEach(e => e.classList.toggle("xp-apagado", !!(foco && foco.length) && !foco.includes(e.dataset.id)));
  }

  /* =============================== visuais =============================== */
  const VISUAIS = {};

  /* ---- partículas: a pele vista de perto, até o mundo dos nanômetros (ilustração) ---- */
  VISUAIS.particulas = (vis, c) => {
    const cv = el("canvas", { class: "xp-canvas", "aria-hidden": "true" }, vis);
    const ctx = cv.getContext("2d");
    const op = c.visual || {};
    const acento = op.cor || "#F2B8A2";
    let W = 0, H = 0, dpr = 1, p = op.inverter ? 1 : 0, alvo = p, ativo = false, raf = 0;
    // relevo da pele: pontos ligados aos vizinhos mais próximos
    const pts = [];
    for (let i = 0; i < 170; i++) pts.push([(Math.random() * 2 - 1) * 1.25, (Math.random() * 2 - 1) * 1.25]);
    const lig = [];
    pts.forEach((a, i) => {
      pts.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2]).filter(x => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 3)
        .forEach(([j]) => { if (i < j) lig.push([i, j]); });
    });
    // “veículos” em nanoescala, concentrados no centro (onde o zoom chega)
    const nano = [];
    for (let i = 0; i < 260; i++) {
      const r = Math.pow(Math.random(), 1.6) * .16, a = Math.random() * Math.PI * 2;
      nano.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, t: Math.random() * 6.28, k: .6 + Math.random() * .8, bi: Math.random() < .7 });
    }
    function medir() {
      const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function desenhar(tempo) {
      const t = tempo / 1000, q = ease(clamp(p, 0, 1));
      const s = Math.exp(Math.log(1) + (Math.log(op.zoom || 34) - Math.log(1)) * q);   // escala: 1× até ~34×
      const base = Math.min(W, H) * .5;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .75);
      g.addColorStop(0, "rgba(58,30,26," + (0.9 - q * .5) + ")"); g.addColorStop(1, "rgba(5,8,15,1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2);
      // relevo
      const aRel = clamp(.55 / Math.pow(s, .55), 0, .55);
      if (aRel > .01) {
        ctx.strokeStyle = acento; ctx.globalAlpha = aRel; ctx.lineWidth = 1;
        ctx.beginPath();
        lig.forEach(([i, j]) => { ctx.moveTo(pts[i][0] * base * s, pts[i][1] * base * s); ctx.lineTo(pts[j][0] * base * s, pts[j][1] * base * s); });
        ctx.stroke();
      }
      // partículas
      const aNano = clamp((s - 2) / 5, 0, 1);
      if (aNano > 0) {
        nano.forEach(n => {
          const dx = RM ? 0 : Math.sin(t * .4 * n.k + n.t) * .004, dy = RM ? 0 : Math.cos(t * .33 * n.k + n.t) * .004;
          const x = (n.x + dx) * base * s, y = (n.y + dy) * base * s;
          if (x < -W || x > W || y < -H || y > H) return;
          const r = clamp(.0026 * n.k * base * s, .6, 70);
          ctx.globalAlpha = aNano * (r > 3 ? .95 : .6);
          if (r > 5 && n.bi) {          // bicamada (lembra um lipossoma)
            ctx.lineWidth = Math.max(1, r * .12);
            ctx.strokeStyle = acento; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
            ctx.globalAlpha *= .6; ctx.beginPath(); ctx.arc(x, y, r * .76, 0, 6.283); ctx.stroke();
            ctx.globalAlpha = aNano * .18; ctx.fillStyle = "#9DB6FF"; ctx.beginPath(); ctx.arc(x, y, r * .7, 0, 6.283); ctx.fill();
            ctx.globalAlpha = aNano * .9; ctx.fillStyle = "#FFB23F";
            for (let k = 0; k < 3; k++) { const a = n.t + k * 2.1 + t * .3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * .35, y + Math.sin(a) * r * .35, Math.max(1, r * .08), 0, 6.283); ctx.fill(); }
          } else {
            ctx.fillStyle = n.bi ? acento : "#FFD27A"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
          }
        });
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function quadro(tempo) {
      raf = 0; p += (alvo - p) * (RM ? 1 : .12);
      desenhar(tempo || performance.now());
      if (ativo && !RM) raf = requestAnimationFrame(quadro);
    }
    medir(); addEventListener("resize", () => { medir(); desenhar(performance.now()); });
    desenhar(0);
    return {
      progresso(v) { alvo = op.inverter ? 1 - v : v; if (RM) quadro(); },
      ativo(on) { ativo = on; if (on && !raf && !RM) raf = requestAnimationFrame(quadro); },
      final() { alvo = p = op.inverter ? 0 : 1; desenhar(0); }
    };
  };

  /* ---- régua de escala logarítmica (dados de tamanho do artigo) ---- */
  VISUAIS.escala = (vis, c) => {
    const d = c.visual, min = d.min, max = d.max;          // potências de 10, em nanômetros
    const pos = nm => ((Math.log10(nm) - min) / (max - min) * 100);
    const box = el("div", { class: "xp-escala" }, vis);
    const eixo = el("div", { class: "eixo" }, box);
    d.marcas.forEach(m => el("div", { class: "tick", style: "left:" + pos(m.em) + "%" }, eixo, "<span>" + esc(m.rotulo) + "</span>"));
    (d.faixas || []).forEach(f => {
      const fx = el("div", { class: "faixa", "data-desde": f.desde || 0, style: "--c:" + f.cor }, box);
      const a = pos(f.de), b = pos(f.ate);
      el("div", { class: "bar" + (f.aberta ? " aberta" : ""), style: "left:" + a + "%;width:" + (b - a) + "%" }, fx);
      // rótulo: dentro da barra (se ela for larga), antes dela (se chegar perto do fim) ou logo depois
      const dentro = b - a > 45;
      const onde = dentro ? "left:" + a + "%;max-width:" + (100 - a) + "%" : b > 70 ? "right:" + (100 - a) + "%;padding-right:8px;padding-left:0" : "left:" + b + "%";
      el("label", { style: onde, class: dentro ? "dentro" : null }, fx, esc(f.rotulo));
    });
    (d.linhas || []).forEach(l => {
      const ln = el("div", { class: "linha", "data-desde": l.desde || 0, style: "left:" + pos(l.em) + "%;--c:" + l.cor + ";top:" + (l.topo || 0) + "px" }, box);
      el("span", {}, ln, esc(l.rotulo));
    });
    if (d.legenda) el("p", { class: "leg" }, box, esc(d.legenda));
    // as linhas tracejadas param antes da legenda, para não riscar o texto
    const ajustar = () => { const leg = $(".leg", box); if (leg) $$(".linha", box).forEach(l => { l.style.bottom = (leg.offsetHeight + 14) + "px"; }); };
    requestAnimationFrame(ajustar); addEventListener("resize", ajustar);
    return { passo: k => revelar(box, k) };
  };

  /* ---- veículos: desenhos esquemáticos, fora de escala ---- */
  function iconeVeiculo(tipo, cor) {
    const s = sv("svg", { viewBox: "0 0 140 140", class: "xp-svg", "aria-hidden": "true" });
    const cx = 70, cy = 70;
    const cabecas = (r, n, forma, c) => {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (forma === "q") sv("rect", { x: x - 3.2, y: y - 3.2, width: 6.4, height: 6.4, rx: 1, fill: c, transform: "rotate(" + (a * 57.3) + " " + x + " " + y + ")" }, s);
        else sv("circle", { cx: x, cy: y, r: 3.4, fill: c }, s);
      }
    };
    const caudas = (r1, r2, n, c) => {
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; sv("line", { x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2, stroke: c, "stroke-width": 1.2, opacity: .6 }, s); }
    };
    if (tipo === "lipossoma" || tipo === "niossoma") {
      sv("circle", { cx, cy, r: 40, fill: "#9DB6FF", opacity: .16 }, s);
      caudas(44, 53, 30, cor); caudas(37, 44, 24, cor);
      cabecas(56, 30, tipo === "niossoma" ? "q" : "c", cor); cabecas(35, 24, tipo === "niossoma" ? "q" : "c", cor);
      for (let i = 0; i < 4; i++) sv("circle", { cx: cx - 12 + (i % 2) * 22, cy: cy - 10 + (i > 1 ? 20 : 0), r: 3, fill: "#FFB23F" }, s);
    } else if (tipo === "nls") {
      sv("circle", { cx, cy, r: 46, fill: cor, opacity: .55 }, s);
      caudas(46, 54, 30, cor); cabecas(57, 30, "c", cor);
      for (let i = 0; i < 5; i++) sv("circle", { cx: cx - 16 + i * 8, cy: cy + (i % 2 ? 8 : -6), r: 3, fill: "#FFB23F" }, s);
    } else if (tipo === "nanoemulsao") {
      sv("rect", { x: 6, y: 6, width: 128, height: 128, rx: 18, fill: "#9DB6FF", opacity: .1 }, s);
      [[46, 48, 22], [92, 60, 16], [62, 96, 18], [104, 104, 10], [28, 96, 9]].forEach(([x, y, r]) => {
        sv("circle", { cx: x, cy: y, r, fill: "#FFD27A", opacity: .5 }, s);
        sv("circle", { cx: x, cy: y, r: r + 3, fill: "none", stroke: cor, "stroke-width": 2.4, "stroke-dasharray": "2 3" }, s);
      });
    } else if (tipo === "metalica") {
      const g = sv("defs", {}, s), lg = sv("linearGradient", { id: "gm" + Math.random().toString(36).slice(2, 7), x1: 0, y1: 0, x2: 1, y2: 1 }, g);
      sv("stop", { offset: 0, "stop-color": "#FFE7A3" }, lg); sv("stop", { offset: 1, "stop-color": "#B8862B" }, lg);
      const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; pts.push((cx + Math.cos(a) * 44) + "," + (cy + Math.sin(a) * 44)); }
      sv("polygon", { points: pts.join(" "), fill: "url(#" + lg.id + ")" }, s);
      sv("polyline", { points: cx + ",26 " + cx + ",114", stroke: "#fff", opacity: .25, "stroke-width": 1 }, s);
      sv("polyline", { points: "26," + cy + " 114," + cy, stroke: "#fff", opacity: .25, "stroke-width": 1 }, s);
      sv("circle", { cx: 54, cy: 50, r: 7, fill: "#fff", opacity: .55 }, s);
    }
    return s;
  }
  VISUAIS.veiculos = (vis, c) => {
    const g = el("div", { class: "xp-veic", style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:18px 14px;width:100%;max-width:680px" }, vis);
    const itens = c.visual.itens.map(it => {
      const b = el("div", { class: "xp-foco", "data-id": it.id, style: "text-align:center" }, g);
      const ic = el("div", { class: "ic", style: "width:min(130px,26vw);margin:0 auto" }, b);
      ic.appendChild(iconeVeiculo(it.id, it.cor));
      el("b", { style: "display:block;font:600 15.5px/1.25 var(--display);margin-top:8px" }, b, esc(it.nome));
      if (it.tam) el("small", { style: "display:block;font:500 13.5px/1.35 var(--mono);color:var(--xp-muted);margin-top:4px" }, b, esc(it.tam));
      return b;
    });
    return { passo: k => focar(itens, (c.passos[k] || {}).foco) };
  };

  /* ---- funil: cada ponto é um artigo; a cada filtro, os excluídos saem para o lado ---- */
  VISUAIS.funil = (vis, c) => {
    const d = c.visual, N = d.total;
    const box = el("div", { class: "xp-funil", role: "img", "aria-label": d.alt || "" }, vis);
    const cont = el("div", { class: "cont" }, box);
    const pontos = []; for (let i = 0; i < N; i++) pontos.push(el("i", {}, box));
    // ordem de saída: sorteada, mas sempre a mesma
    let semente = 7; const rnd = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
    const ordem = pontos.map((_, i) => i).sort(() => rnd() - .5);
    const saida = new Array(N).fill(-1); let pos = 0;
    d.cortes.forEach((ct, ci) => { for (let j = 0; j < ct.n; j++) saida[ordem[pos++]] = ci; });
    const pilhas = d.cortes.map(ct => el("div", { class: "pilha" }, box, "<b>−" + num(ct.n) + "</b> " + esc(ct.rotulo)));
    let passoAtual = 0;
    function arrumar(k) {
      passoAtual = k;
      const w = box.clientWidth, h = box.clientHeight, t = w * .0135, g = w * .021;
      const cortesFeitos = Math.min(k, d.cortes.length);
      const ficam = pontos.filter((_, i) => saida[i] < 0 || saida[i] >= cortesFeitos);
      // o contador primeiro: os pontos começam logo abaixo dele, sem passar por baixo do texto
      const etapa = k === 0 ? d.inicio : d.cortes[cortesFeitos - 1].depois;
      cont.innerHTML = num(ficam.length) + "<small>" + esc(etapa) + "</small>";
      const y0 = Math.max(h * .2, cont.offsetTop + cont.offsetHeight + 10);
      const areaW = w * .56, cols = Math.max(8, Math.floor(areaW / g));
      ficam.forEach((p, j) => { p.classList.remove("fora"); p.style.transform = "translate(" + ((j % cols) * g) + "px," + (y0 + Math.floor(j / cols) * g) + "px)"; });
      let y = h * .02;
      d.cortes.forEach((ct, ci) => {
        const mostra = ci < cortesFeitos, pc = 16, gp = w * .0165;
        pilhas[ci].style.top = y + "px"; pilhas[ci].style.opacity = mostra ? 1 : 0;
        const lh = pilhas[ci].offsetHeight + 4;          // os pontos ficam logo abaixo do rótulo
        const saem = pontos.filter((_, i) => saida[i] === ci);
        saem.forEach((p, j) => {
          if (!mostra) return;
          p.classList.add("fora");
          p.style.transform = "translate(" + (w * .62 + (j % pc) * gp) + "px," + (y + lh + Math.floor(j / pc) * gp) + "px) scale(.78)";
        });
        if (mostra) y += lh + Math.ceil(ct.n / pc) * gp + 10;
      });
      // a altura do funil acompanha as pilhas da direita (assim o ajuste de tamanho sabe quanto ocupa)
      box.style.minHeight = Math.ceil(y) + "px";
    }
    addEventListener("resize", () => arrumar(passoAtual));
    requestAnimationFrame(() => arrumar(0));
    return { passo: arrumar, final: () => arrumar(d.cortes.length) };
  };

  /* ---- níveis: onde os estudos foram testados ---- */
  VISUAIS.niveis = (vis, c) => {
    // com muitas pessoas numa fileira, os pontos ficam menores para tudo caber
    const maior = Math.max(...c.visual.niveis.map(nv => nv.n));
    const box = el("div", { class: "xp-niveis" + (maior > 120 ? " muitos" : maior > 60 ? " varios" : "") }, vis);
    c.visual.niveis.forEach(nv => {
      const l = el("div", { class: "nivel", "data-desde": nv.desde || 0, style: "--c:" + nv.cor }, box);
      el("div", {}, l, "<b>" + esc(nv.rotulo) + "</b><small>" + esc(nv.sub || "") + "</small>");
      const pts = el("div", { class: "pts", role: "img", "aria-label": nv.rotulo + ": " + nv.n }, l);
      const tipos = nv.tipos || [{ n: nv.n, estilo: "cheio" }];
      let i = 0;
      tipos.forEach(tp => { for (let j = 0; j < tp.n; j++) el("i", { class: tp.estilo === "oco" ? "oco" : tp.estilo === "trac" ? "trac" : "", style: "transition-delay:" + (i++ * 35) + "ms" }, pts); });
      el("b", { style: "font:700 16px/1 var(--mono);margin-left:8px;align-self:center" }, pts, num(nv.n));
      if (nv.tipos) { const lg = el("div", { class: "leg" }, l); l.appendChild(lg); lg.style.gridColumn = "1 / -1";
        nv.tipos.forEach(tp => el("span", {}, lg, '<i class="' + (tp.estilo === "oco" ? "oco" : tp.estilo === "trac" ? "trac" : "") + '" style="' + (tp.estilo !== "cheio" ? "background:transparent;border:2px " + (tp.estilo === "trac" ? "dashed" : "solid") + " var(--c)" : "") + '"></i>' + esc(tp.legenda) + " (" + tp.n + ")")); }
    });
    if (c.visual.nota) el("p", { class: "xp-rotulo", style: "margin:6px 0 0" }, box, esc(c.visual.nota));
    return { passo: k => revelar(box, k) };
  };

  /* ---- barras horizontais (dados do artigo) ---- */
  VISUAIS.barras = (vis, c) => {
    const d = c.visual, max = d.max || Math.max(...d.itens.map(i => i.valor));
    const box = el("div", { class: "xp-barras", role: "img", "aria-label": d.alt || "" }, vis);
    if (d.titulo) el("p", { class: "xp-rotulo forte", style: "margin:0 0 6px" }, box, esc(d.titulo));
    const linhas = d.itens.map(it => {
      const l = el("div", { class: "linha xp-foco", "data-id": it.grupo || it.rotulo, style: "--c:" + (it.cor || "var(--xp-acento)") }, box);
      el("span", { title: it.rotulo }, l, esc(it.rotulo));
      el("div", { class: "tr" }, l, '<div class="fl" style="--v:' + (it.valor / max) + '"></div>');
      el("span", { class: "val" }, l, num(it.valor));
      return l;
    });
    if (d.eixo) el("p", { class: "eixo" }, box, esc(d.eixo));
    return { passo: k => { box.classList.add("on"); focar(linhas, (c.passos[k] || {}).foco); }, final: () => box.classList.add("on") };
  };

  /* ---- números em destaque, cada um com o cuidado que pede ---- */
  VISUAIS.destaques = (vis, c) => {
    const box = el("div", { class: "xp-destaques" }, vis);
    c.visual.itens.forEach(it => el("div", { class: "item", "data-desde": it.desde || 0, style: "--c:" + (it.cor || "var(--xp-acento)") }, box,
      '<div class="v">' + esc(it.valor) + "</div><p>" + it.texto + "</p>" + (it.cuidado ? '<p class="cuidado">⚠ ' + esc(it.cuidado) + "</p>" : "")));
    if (c.visual.nuvem) { const n = el("div", { class: "xp-nuvem", "data-desde": c.visual.nuvemDesde || 0 }, vis); vis.style.alignContent = "center";
      c.visual.nuvem.forEach(w => el("span", {}, n, esc(w))); }
    return { passo: k => revelar(vis, k) };
  };

  /* ---- a pele por dentro: por que envelhece e o que os ativos fazem (esquema) ---- */
  VISUAIS.pele = (vis, c) => {
    const d = c.visual || {};
    const W = 800, H = 520;
    // quadro com a proporção do desenho: os rótulos ficam presos ao desenho em qualquer tela
    const quadro = el("div", { class: "xp-quadro", style: "--ar:" + W + "/" + H }, vis);
    const s = sv("svg", { viewBox: "0 0 " + W + " " + H, class: "xp-svg", role: "img", "aria-label": d.alt || "" }, quadro);
    const defs = sv("defs", {}, s);
    const lg = sv("linearGradient", { id: "derme", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": "#3A1F22" }, lg); sv("stop", { offset: 1, "stop-color": "#140C14" }, lg);
    sv("rect", { x: 0, y: 150, width: W, height: H - 150, fill: "url(#derme)" }, s);
    // epiderme lisa × com ruga
    const lisa = "M0 150 C 120 138, 240 162, 400 150 S 680 140, 800 152 L800 190 C 680 182, 520 196, 400 188 S 120 182, 0 190 Z";
    const ruga = "M0 150 C 120 138, 250 160, 360 150 L 400 214 L 440 150 C 560 142, 680 140, 800 152 L800 190 C 680 182, 520 196, 440 190 L 400 250 L 360 190 C 250 186, 120 182, 0 190 Z";
    const epi = sv("g", {}, s);
    sv("path", { d: lisa, fill: "#E9A38C", opacity: .85, "data-desde": 0, "data-ate": d.rugaNoPasso != null ? d.rugaNoPasso - 1 : 99 }, epi);
    if (d.rugaNoPasso != null) sv("path", { d: ruga, fill: "#E9A38C", opacity: .85, "data-desde": d.rugaNoPasso }, epi);
    // fibras de colágeno (grossas) e elastina (finas), inteiras × danificadas
    const fibras = (grupoAttrs, danificada) => {
      const g = sv("g", grupoAttrs, s);
      for (let i = 0; i < 12; i++) {
        const y = 250 + i * 20, off = (i % 3) * 40;
        sv("path", { d: "M" + (-40 + off) + " " + y + " C 120 " + (y - 26) + ", 240 " + (y + 26) + ", 400 " + y + " S 680 " + (y - 26) + ", " + (860 - off) + " " + y,
          fill: "none", stroke: "#F2B8A2", "stroke-width": 4, opacity: danificada ? .25 : .55, "stroke-dasharray": danificada ? "18 26" : null, "stroke-linecap": "round" }, g);
      }
      for (let i = 0; i < 9; i++) {
        const y = 262 + i * 24; let dd = "M-20 " + y;
        for (let x = 0; x <= 840; x += 20) dd += " Q " + (x + 10) + " " + (y + (x / 20 % 2 ? 9 : -9)) + " " + (x + 20) + " " + y;
        sv("path", { d: dd, fill: "none", stroke: "#C9B8FF", "stroke-width": 1.4, opacity: danificada ? .18 : .45, "stroke-dasharray": danificada ? "10 22" : null }, g);
      }
      return g;
    };
    fibras({ "data-desde": 0, "data-ate": d.danoNoPasso != null ? d.danoNoPasso - 1 : 99 }, false);
    if (d.danoNoPasso != null) fibras({ "data-desde": d.danoNoPasso }, true);
    // sol e poluição → radicais livres
    if (d.agressoresNoPasso != null) {
      const ag = sv("g", { "data-desde": d.agressoresNoPasso }, s);
      sv("circle", { cx: 250, cy: 50, r: 26, fill: "#FFB23F" }, ag);
      for (let i = 0; i < 5; i++) sv("line", { x1: 270 + i * 22, y1: 70 + i * 4, x2: 320 + i * 34, y2: 150 + i * 4, stroke: "#FFB23F", "stroke-width": 2, opacity: .6, "stroke-dasharray": "6 8" }, ag);
      for (let i = 0; i < 26; i++) sv("circle", { cx: 560 + (i * 37) % 220, cy: 30 + (i * 23) % 90, r: 3 + (i % 3), fill: "#8D9AB5", opacity: .6 }, ag);
      const ros = sv("g", { "data-desde": d.agressoresNoPasso }, s);
      for (let i = 0; i < 34; i++) {
        const x = 40 + (i * 151) % 720, y = 220 + (i * 71) % 280;
        sv("circle", { cx: x, cy: y, r: 5, fill: "#FF5470", opacity: .85, class: "xp-ros" }, ros);
        sv("circle", { cx: x + 4, cy: y - 4, r: 1.6, fill: "#fff" }, ros);
      }
    }
    // proteção: antioxidantes “capturando” radicais livres
    if (d.protecaoNoPasso != null) {
      const pr = sv("g", { "data-desde": d.protecaoNoPasso }, s);
      for (let i = 0; i < 34; i += 2) {
        const x = 40 + (i * 151) % 720, y = 220 + (i * 71) % 280;
        sv("circle", { cx: x, cy: y, r: 13, fill: "none", stroke: "#5FD39A", "stroke-width": 2.5 }, pr);
      }
    }
    // rótulos em HTML (legíveis no celular)
    const rot = el("div", { class: "xp-rotulos" }, quadro);
    (d.rotulos || []).forEach(r => el("span", { class: "xp-rotulo forte", "data-desde": r.desde || 0, "data-ate": r.ate,
      style: "left:" + r.x + "%;top:" + r.y + "%" }, rot, esc(r.texto)));
    return { passo: k => { revelar(s, k); revelar(rot, k); } };
  };

  /* ---- óxido de zinco: tamanho da partícula e sinais de envelhecimento na célula (esquema) ---- */
  VISUAIS.zno = (vis, c) => {
    const d = c.visual || {};
    const quadro = el("div", { class: "xp-quadro", style: "--ar:800/480" }, vis);
    const s = sv("svg", { viewBox: "0 0 800 480", class: "xp-svg", role: "img", "aria-label": d.alt || "" }, quadro);
    sv("ellipse", { cx: 400, cy: 250, rx: 210, ry: 170, fill: "#16213A", stroke: "#4D7CFF", "stroke-width": 2 }, s);
    sv("circle", { cx: 420, cy: 250, r: 62, fill: "#1E2C4F", stroke: "#7C9CFF", "stroke-width": 1.5 }, s);
    const sen = sv("g", { "data-desde": 1 }, s);
    sv("ellipse", { cx: 400, cy: 250, rx: 210, ry: 170, fill: "#3FC1C9", opacity: .18 }, sen);
    for (let i = 0; i < 9; i++) sv("circle", { cx: 300 + (i * 53) % 220, cy: 170 + (i * 37) % 170, r: 5, fill: "#3FC1C9" }, sen);
    const pequenas = sv("g", {}, s);
    for (let i = 0; i < 16; i++) sv("circle", { cx: 250 + (i * 29) % 110, cy: 140 + (i * 47) % 220, r: 5, fill: "#FFD27A" }, pequenas);
    const grandes = sv("g", {}, s);
    for (let i = 0; i < 5; i++) sv("circle", { cx: 690 + (i % 2) * 44, cy: 130 + i * 58, r: 17, fill: "#FFD27A", opacity: .9 }, grandes);
    const rot = el("div", { class: "xp-rotulos" }, quadro);
    (d.rotulos || []).forEach(r => el("span", { class: "xp-rotulo forte", "data-desde": r.desde || 0,
      style: "left:" + r.x + "%;top:" + r.y + "%" }, rot, esc(r.texto)));
    return { passo: k => { revelar(s, k); revelar(rot, k); } };
  };

  /* ---- comparação lado a lado ---- */
  VISUAIS.comparacao = (vis, c) => {
    const d = c.visual, box = el("div", { class: "xp-comp" }, vis);
    el("div", { class: "cab" }, box, "<span></span><span>" + esc(d.colunas[0]) + "</span><span>" + esc(d.colunas[1]) + "</span>");
    d.linhas.forEach(l => el("div", { class: "lin", "data-desde": l.desde || 0 }, box, "<b>" + esc(l.rotulo) + "</b><span>" + esc(l.a) + "</span><span>" + esc(l.b) + "</span>"));
    return { passo: k => revelar(box, k) };
  };

  /* ---- colunas: quanto tempo a estabilidade foi testada (ou se nem foi informada) ---- */
  VISUAIS.colunas = (vis, c) => {
    const d = c.visual, box = el("div", { class: "xp-colunas", role: "img", "aria-label": d.alt || "" }, vis);
    if (d.titulo) el("p", { class: "xp-rotulo forte", style: "margin:0 0 10px" }, box, esc(d.titulo));
    const area = el("div", { class: "area" }, box);
    (d.referencias || []).forEach(r => el("div", { class: "ref", style: "bottom:" + (r.valor / d.max * 100) + "%" }, area, "<span>" + esc(r.rotulo) + "</span>"));
    const cols = [];
    d.grupos.forEach(g => {
      const gg = el("div", { class: "grupo", style: "--n:" + g.itens.length }, area);
      g.itens.forEach((it, i) => cols.push(el("div", { class: "c xp-foco" + (it.dias == null ? " na" : ""), "data-id": String(it.ref),
        title: "Ref. " + it.ref + ": " + (it.dias == null ? T("não informado") : it.texto),
        style: "--c:" + g.cor + ";--h:" + (it.dias == null ? 100 : Math.max(1.5, it.dias / d.max * 100)) + ";transition-delay:" + (i * 30) + "ms" }, gg)));
    });
    el("div", { class: "rot" }, box, d.grupos.map(g => '<span style="--n:' + g.itens.length + '">' + esc(g.rotulo) + "</span>").join(""));
    el("div", { class: "leg" }, box, d.grupos.map(g => '<span><i style="--c:' + g.cor + '"></i>' + esc(g.rotulo) + "</span>").join("") + '<span><i class="na"></i>' + esc(d.semInfo) + "</span>");
    return { passo: k => { box.classList.add("on"); focar(cols, (c.passos[k] || {}).foco); }, final: () => box.classList.add("on") };
  };

  /* ---- amostras: cada ponto é uma pessoa que participou ----
     Uma linha por estudo: etiqueta da referência, os pontos e o número alinhado à direita.
     Quando o artigo não dá o número, aparece o que ele diz, num quadro tracejado. */
  VISUAIS.amostras = (vis, c) => {
    const d = c.visual, box = el("div", { class: "xp-amostras" }, vis);
    if (d.titulo) el("p", { class: "am-cab" }, box, "<b>" + esc(d.titulo) + "</b>" + (d.subtitulo ? "<span>" + esc(d.subtitulo) + "</span>" : ""));
    const linhas = d.itens.map(it => {
      const sem = it.n == null;
      const l = el("div", { class: "lin xp-foco" + (it.ok ? " ok" : "") + (sem ? " sem" : ""), "data-id": String(it.ref) }, box);
      el("b", { class: "am-ref" }, l, "ref. " + esc(it.ref));
      const p = el("div", { class: "pts", role: "img", "aria-label": "ref. " + it.ref + ": " + (sem ? it.texto : it.n) }, l);
      if (sem) el("span", { class: "am-sem" }, p, esc(it.texto || ""));
      else for (let i = 0; i < it.n; i++) el("i", { style: "transition-delay:" + (i * 12) + "ms" }, p);
      el("span", { class: "am-n", "aria-hidden": "true" }, l, sem ? esc(it.valor || "—") : num(it.n));
      if (!sem && it.texto) el("em", { class: "am-obs" }, l, esc(it.texto));
      return l;
    });
    if (d.nota) el("p", { class: "xp-rotulo am-nota" }, box, esc(d.nota));
    return { passo: k => { box.classList.add("on"); focar(linhas, (c.passos[k] || {}).foco); }, final: () => box.classList.add("on") };
  };

  /* ---- o que ainda não se sabe (ou, com "icone", uma lista de propostas ou etapas) ---- */
  VISUAIS.limites = (vis, c) => {
    const box = el("div", { class: "xp-limites" }, vis);
    c.visual.itens.forEach(it => el("div", { class: "it" + (it.ausente ? " aus" : "") + (it.icone ? " prop" : ""), "data-desde": it.desde || 0 }, box,
      "<i>" + esc(it.icone || (it.ausente ? "∅" : "?")) + "</i><div><b>" + esc(it.titulo) + "</b><span>" + esc(it.texto) + "</span></div>"));
    return { passo: k => revelar(box, k) };
  };

  /* ---- fila: cada ponto é uma pessoa, em serpentina, como numa fila de verdade ----
     Os grupos (ex.: agendadas, aguardando, saíram) ganham cor a partir do passo "coresDesde". */
  VISUAIS.fila = (vis, c) => {
    const d = c.visual, N = d.total, grupos = d.grupos || [];
    const box = el("div", { class: "xp-fila", role: "img", "aria-label": d.alt || "" }, vis);
    if (d.titulo) el("p", { class: "fila-tit" }, box, "<b>" + esc(d.titulo) + "</b>" + (d.subtitulo ? "<span>" + esc(d.subtitulo) + "</span>" : ""));
    const area = el("div", { class: "fila-area" }, box);
    const linha = sv("svg", { class: "fila-linha", "aria-hidden": "true" }, area), caminho = sv("polyline", {}, linha);
    const pts = []; for (let i = 0; i < N; i++) pts.push(el("i", { style: "--k:" + i }, area));
    const dono = new Array(N).fill(-1); let k0 = 0;
    grupos.forEach((g, gi) => { for (let j = 0; j < g.n && k0 < N; j++) dono[k0++] = gi; });
    const leg = el("div", { class: "fila-leg" }, box, grupos.map(g => '<span style="--c:' + g.cor + '"' + (g.apagado ? ' class="apag"' : "") + "><i></i><b>" + num(g.n) + "</b> " + esc(g.rotulo) + "</span>").join(""));
    function arrumar() {
      const w = area.clientWidth, h = area.clientHeight; if (!w || !h) return;
      let cols = Math.max(6, Math.round(Math.sqrt(N * w / h))), rows = Math.ceil(N / cols);
      const gx = w / cols, gy = h / rows, t = Math.max(3, Math.min(gx, gy) * .58);
      const xy = i => { const r = Math.floor(i / cols), ci = i % cols, cx = r % 2 ? cols - 1 - ci : ci; return [cx * gx + gx / 2, r * gy + gy / 2]; };
      // posição com "translate" (e não "transform"), para a onda que aumenta o ponto não tirá-lo do lugar
      pts.forEach((p, i) => { const [x, y] = xy(i); p.style.width = p.style.height = t + "px"; p.style.translate = (x - t / 2).toFixed(1) + "px " + (y - t / 2).toFixed(1) + "px"; });
      linha.setAttribute("viewBox", "0 0 " + w + " " + h);
      // a linha da fila passa pelo meio das fileiras e faz a curva nas pontas
      const vert = []; for (let r = 0; r < rows; r++) { const ini = xy(r * cols), fim = xy(Math.min(N - 1, r * cols + cols - 1)); vert.push(ini, fim); }
      caminho.setAttribute("points", vert.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join(" "));
    }
    let atual = 0;
    function passo(k) {
      atual = k; box.classList.add("on");
      const cor = grupos.length && k >= (d.coresDesde || 0);
      pts.forEach((p, i) => { const g = cor && dono[i] >= 0 ? grupos[dono[i]] : null; p.style.background = g ? g.cor : ""; p.classList.toggle("apag", !!(g && g.apagado)); });
      leg.classList.toggle("on", !!cor);
    }
    addEventListener("resize", arrumar);
    requestAnimationFrame(() => { arrumar(); passo(atual); });
    return { passo: passo, final: () => passo(99) };
  };

  /* ---- ícones: áreas de uma profissão, cada uma com um desenho simples (ilustração) ---- */
  const ICONES = {
    linguagem: '<path d="M10 14h44v26H30l-12 10V40h-8z"/><circle cx="23" cy="27" r="2.6" class="ch"/><circle cx="32" cy="27" r="2.6" class="ch"/><circle cx="41" cy="27" r="2.6" class="ch"/>',
    voz: '<circle cx="22" cy="26" r="10"/><path d="M22 36v8M14 50h16"/><path d="M38 20q6 6 0 12M45 15q11 11 0 22M52 10q16 16 0 32" class="onda"/>',
    audicao: '<path d="M22 44c0 6 4 10 9 10s8-4 8-8c0-6 10-8 10-20 0-9-7-16-16-16s-16 7-16 16"/><path d="M27 26a6 6 0 0 1 12 0c0 5-6 6-6 11"/><path d="M52 18q5 8 0 16" class="onda"/>',
    disfagia: '<path d="M20 8c0 14 8 16 8 28v20M44 8c0 14-8 16-8 28v20"/><path d="M32 18c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" class="ch"/><path d="M32 34v12M27 41l5 5 5-5"/>',
    motricidade: '<circle cx="32" cy="32" r="22"/><circle cx="24" cy="26" r="2.4" class="ch"/><circle cx="40" cy="26" r="2.4" class="ch"/><path d="M22 38q10 9 20 0"/><path d="M26 40q6 3 12 0"/>',
    equilibrio: '<path d="M32 32m0-3a3 3 0 1 1 -3 3a7 7 0 1 1 7 7a12 12 0 1 1 -12 -12a17 17 0 1 1 17 17"/>'
  };
  VISUAIS.icones = (vis, c) => {
    const g = el("div", { class: "xp-icones" }, vis);
    const itens = c.visual.itens.map(it => {
      const b = el("div", { class: "ico-item xp-foco", "data-id": it.id, style: "--c:" + (it.cor || "var(--xp-acento)") }, g);
      el("div", { class: "ico", "aria-hidden": "true" }, b, '<svg viewBox="0 0 64 64">' + (ICONES[it.icone] || "") + "</svg>");
      el("b", {}, b, esc(it.nome)); if (it.desc) el("small", {}, b, esc(it.desc));
      return b;
    });
    return { passo: k => focar(itens, (c.passos[k] || {}).foco) };
  };

  /* ---- linha do tempo (anos), com faixas que aparecem passo a passo ---- */
  VISUAIS.tempo = (vis, c) => {
    const d = c.visual, a0 = d.de, a1 = d.ate;
    const pos = (s, fim) => { const [y, m] = String(s).split("-").map(Number); return ((y + ((m || 1) - (fim ? 0 : 1)) / 12) - a0) / (a1 - a0) * 100; };
    const box = el("div", { class: "xp-tempo" }, vis);
    const eixo = el("div", { class: "tp-eixo" }, box);
    for (let y = a0; y <= a1; y++) el("span", { style: "left:" + pos(y + "-1") + "%" }, eixo, "<b>" + y + "</b>");
    d.faixas.forEach(f => {
      const r = el("div", { class: "tp-faixa", "data-desde": f.desde || 0, style: "--c:" + f.cor }, box);
      const ini = pos(f.de), fim = pos(f.ate, true);
      el("div", { class: "tp-bar", style: "left:" + ini + "%;width:" + (fim - ini) + "%" }, r);
      el("p", { class: "tp-rot", style: "padding-left:" + Math.min(ini, 60) + "%" }, r, "<b>" + esc(f.rotulo) + "</b><span>" + esc(f.periodo || "") + "</span>");
    });
    if (d.legenda) el("p", { class: "tp-leg" }, box, esc(d.legenda));
    return { passo: k => revelar(box, k) };
  };

  /* =============================== montagem =============================== */
  const main = $("#xp");
  if (!main) return;
  const arquivo = main.dataset.roteiro || "roteiro.json";
  const buscar = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  (I.lang !== "pt" ? buscar(arquivo.replace(/\.json$/, "." + I.lang + ".json")).catch(() => buscar(arquivo)) : buscar(arquivo))
    .then(montar)
    .catch(e => { main.innerHTML = '<p class="xp-carregando">' + esc(T("Não foi possível carregar a experiência.")) + "</p>"; console.error(e); });

  function cartao(p) {
    let h = "";
    if (p.eyebrow) h += '<p class="ey">' + esc(p.eyebrow) + "</p>";
    if (p.capa) h += "<h1>" + esc(p.capa) + "</h1>";
    if (p.titulo) h += "<h2>" + esc(p.titulo) + "</h2>";
    if (p.grande) h += '<span class="grande">' + esc(p.grande) + "</span>";
    if (p.texto) h += (Array.isArray(p.texto) ? p.texto : [p.texto]).map(t => "<p>" + t + "</p>").join("");
    if (p.nota) h += '<p class="nota">' + p.nota + "</p>";
    if (p.ausente) h += '<p class="ausente">' + esc(T("Informação ausente no artigo:")) + " " + esc(p.ausente) + "</p>";
    if (p.extra) h += '<p class="extra">' + esc(p.extra) + "</p>";
    if (p.fonte) h += '<p class="fonte">' + esc(T("Fonte:")) + " " + esc(p.fonte) + "</p>";
    if (p.link) h += '<p class="link"><a href="' + esc(p.link.url) + '">' + esc(p.link.rotulo) + "</a></p>";
    return h;
  }

  function montar(R) {
    document.title = R.titulo + " · GenoEvidence";
    if (R.acento) document.documentElement.style.setProperty("--xp-acento", R.acento);
    const sub = $("#xpSub"); if (sub) sub.textContent = R.subtitulo_topo || "";
    if (RM) document.body.classList.add("xp-estatico");
    main.innerHTML = "";
    const cenas = R.cenas.map((c, i) => {
      const sec = el("section", { class: "xp-cena" + (c.cheia ? " cheia" : ""), id: c.id, "data-capitulo": c.capitulo, "aria-label": c.rotulo || null }, main);
      const palco = el("div", { class: "xp-palco" }, sec);
      const vis = el("div", { class: "xp-visual" }, palco);
      if (c.alt) { vis.setAttribute("role", "img"); vis.setAttribute("aria-label", c.alt); }
      if (i === 0) el("a", { class: "xp-pular", href: "#" + (R.cenas[1] || c).id }, palco, esc(T("Role para começar")) + "<i></i>");
      const passos = el("div", { class: "xp-passos" }, sec);
      const cards = c.passos.map((p, k) => { const d = el("div", { class: "xp-passo", "data-k": k }, passos); el("div", { class: "xp-cartao" }, d, cartao(p)); return d; });
      const r = (VISUAIS[c.tipo] || (() => ({})))(vis, c) || {};
      return { c, sec, cards, r, k: -1, visivel: false };
    });
    // créditos e referências
    creditos(R);
    // capítulos
    const nav = $("#xpCapitulos");
    if (nav) (R.capitulos || []).forEach(cp => {
      const alvo = R.cenas.find(c => c.capitulo === cp.id); if (!alvo) return;
      el("a", { href: "#" + alvo.id, "data-cap": cp.id }, nav, "<span>" + esc(cp.nome) + "</span><i></i>");
    });
    const seletor = $(".xp-topo"); if (seletor) I.montarSeletor(seletor, $(".xp-barra"));
    // se um gráfico não cabe na área dele (telas baixas), diminui só o necessário
    const caber = vis => {
      const f = vis.firstElementChild; if (!f || vis.parentNode.parentNode.classList.contains("cheia")) return;
      const cs = getComputedStyle(vis);
      const livreH = vis.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const h = f.offsetHeight || 1, k = Math.min(1, livreH / h), st = f.style;
      if (k >= .995) { st.scale = st.translate = st.transformOrigin = st.alignSelf = ""; return; }
      // encosta no topo e centraliza na altura pela conta (o navegador não centraliza o que transborda)
      st.alignSelf = "start"; st.transformOrigin = "50% 0"; st.scale = k.toFixed(3);
      st.translate = "0 " + ((livreH - k * h) / 2).toFixed(1) + "px";
    };
    if (!RM && "ResizeObserver" in window) {
      const ro = new ResizeObserver(es => es.forEach(e => caber(e.target.classList.contains("xp-visual") ? e.target : e.target.parentNode)));
      $$(".xp-visual", main).forEach(v => { ro.observe(v); if (v.firstElementChild) ro.observe(v.firstElementChild); });
    }

    if (RM) { cenas.forEach(o => { o.cards.forEach(c => c.classList.add("ativo")); const u = o.c.passos.length - 1; o.r.passo && o.r.passo(u); o.r.final && o.r.final(); }); return; }

    // passo ativo: o cartão que cruza o meio da tela
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const o = cenas.find(x => x.cards.includes(e.target)); const k = +e.target.dataset.k;
      o.cards.forEach(c => c.classList.toggle("ativo", c === e.target));
      if (o.k !== k) { o.k = k; o.r.passo && o.r.passo(k); }
      if (o === cenas[0]) { const pl = $(".xp-pular", o.sec); if (pl) pl.classList.toggle("some", k > 0); }
    }), { rootMargin: "-45% 0px -45% 0px" });
    cenas.forEach(o => o.cards.forEach(c => io.observe(c)));
    // cena visível: liga a animação só de quem está na tela
    const io2 = new IntersectionObserver(es => es.forEach(e => {
      const o = cenas.find(x => x.sec === e.target); o.visivel = e.isIntersecting; o.r.ativo && o.r.ativo(e.isIntersecting);
    }), { rootMargin: "10% 0px 10% 0px" });
    cenas.forEach(o => io2.observe(o.sec));
    cenas.forEach(o => o.r.passo && o.r.passo(0));

    // rolagem: barra de progresso, capítulo atual e progresso de cada cena
    const barra = $(".xp-barra i"), capLinks = nav ? $$("a", nav) : [];
    let pedido = 0;
    function rolar() {
      pedido = 0;
      const h = document.documentElement, y = h.scrollTop, vh = innerHeight;
      if (barra) barra.style.transform = "scaleX(" + clamp(y / (h.scrollHeight - vh || 1), 0, 1) + ")";
      let cap = null;
      cenas.forEach(o => {
        const top = o.sec.offsetTop, alt = o.sec.offsetHeight - vh;
        if (y + vh * .5 >= top) cap = o.c.capitulo;
        if (o.visivel && o.r.progresso) o.r.progresso(clamp((y - top) / (alt || 1), 0, 1));
      });
      capLinks.forEach(a => a.setAttribute("aria-current", String(a.dataset.cap === cap)));
    }
    addEventListener("scroll", () => { if (!pedido) pedido = requestAnimationFrame(rolar); }, { passive: true });
    addEventListener("resize", rolar);
    rolar();
  }

  function creditos(R) {
    const cr = R.creditos || {};
    const s = el("section", { class: "xp-creditos", id: "creditos", "aria-labelledby": "creditosTitulo" }, main);
    const d = el("div", { class: "in" }, s);
    el("h2", { id: "creditosTitulo" }, d, esc(T("Créditos e referências")));
    if (cr.estudo) el("p", {}, d, cr.estudo);
    const ctas = el("div", { class: "ctas" }, d);
    (cr.botoes || []).forEach((b, i) => el("a", { class: "xp-cta" + (i ? " fantasma" : ""), href: b.url, target: /^https?:/.test(b.url) ? "_blank" : null, rel: /^https?:/.test(b.url) ? "noopener" : null }, ctas, esc(b.rotulo)));
    if (cr.como) { el("h3", {}, d, esc(T("Como esta experiência foi feita"))); el("p", {}, d, cr.como); }
    if (cr.referencias) {
      el("h3", {}, d, esc(T("Referências")));
      el("ol", {}, d, cr.referencias.map(r => "<li>" + esc(r.texto) + (r.doi ? ' <a href="https://doi.org/' + esc(r.doi) + '" target="_blank" rel="noopener">doi.org/' + esc(r.doi) + "</a>" : r.url ? ' <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.url.replace(/^https?:\/\//, "")) + "</a>" : "") + "</li>").join(""));
    }
    el("p", { class: "rodape" }, d, esc(T("Conteúdo educativo: não substitui orientação médica.")) + " · " + esc(T("Desenvolvido por")) + " <strong>Thaisa Carvalho</strong>");
  }

})();
