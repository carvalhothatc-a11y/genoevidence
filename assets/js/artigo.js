/* GenoEvidence · página de artigo publicado
   Monta a página inteira a partir do arquivo artigo.json da pasta do artigo.
   Para criar um artigo novo, veja docs/COMO-ADICIONAR-ARTIGO.md. */
(function () {
  "use strict";
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COR = { his: "#FF5470", arg: "#4D7CFF", amber: "#FFB23F", ok: "#5FD39A", violet: "#A58CFF", teal: "#3FC1C9" };
  const cor = c => COR[c] || c || COR.arg;
  const I = window.GE_I18N || { lang: "pt", locale: "pt-BR" };
  const num = v => Number(v).toLocaleString(I.locale, { maximumFractionDigits: 2 });
  const data = iso => new Date(iso + "T12:00:00").toLocaleDateString(I.locale, { day: "2-digit", month: "long", year: "numeric" });
  const main = $("#artigo");
  const RAIZ = (document.querySelector('meta[name="ge-root"]') || {}).content || "../../";

  // no inglês e no espanhol, usa artigo.en.json / artigo.es.json; se não existir, o original em português
  const arquivo = main.dataset.dados || "artigo.json";
  const buscar = u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  (I.lang !== "pt" ? buscar(arquivo.replace(/\.json$/, "." + I.lang + ".json")).catch(() => buscar(arquivo)) : buscar(arquivo))
    .then(montar)
    .catch(err => {
      main.innerHTML = '<div class="wrap s"><p class="loading">Não foi possível carregar este artigo (' + esc(err.message) + "). Se você abriu o arquivo direto do computador, use um servidor local (veja o README).</p></div>";
      if (window.GE && GE.iniciar) GE.iniciar();
    });

  /* ---------------- blocos de conteúdo ---------------- */
  const BLOCOS = {
    texto: b => '<div class="prose art-prose">' + b.html + "</div>",
    nota: b => '<p class="note art-note">' + b.html + "</p>",
    destaque: b => '<div class="callout">' + b.html + "</div>",
    lista: b => '<div class="art-list">' + (b.titulo ? "<h3>" + esc(b.titulo) + "</h3>" : "") + "<ul>" + b.itens.map(i => "<li>" + esc(i) + "</li>").join("") + "</ul></div>",
    cartoes: b => (b.titulo ? '<h3 class="blk-title">' + esc(b.titulo) + "</h3>" : "") + '<div class="cards-art">' +
      b.itens.map(i => '<div class="card-art" style="--c:' + cor(i.cor) + '"><b>' + esc(i.titulo) + "</b><p>" + esc(i.texto) + "</p></div>").join("") + "</div>",
    passos: b => '<ol class="steps">' + b.itens.map(i => '<li><div><b>' + esc(i.titulo) + "</b><p>" + esc(i.texto) + "</p></div></li>").join("") + "</ol>",
    cadeia: b => '<ol class="chain" aria-label="Sequência de eventos">' + b.itens.map((i, k) => '<li style="--k:' + k + '"><span>' + esc(i) + "</span></li>").join("") + "</ol>",
    figura: b => '<figure class="art-fig"><button class="fig fig-art" type="button" data-cap="' + esc(b.legenda + (b.credito ? " Fonte: " + b.credito + "." : "")) + '"><img src="' + esc(b.src) + '" data-full="' + esc(b.full || b.src) + '" alt="' + esc(b.alt || b.legenda) + '" loading="lazy" decoding="async"><span class="fig-zoom">⤢ ampliar</span></button>' +
      '<figcaption>' + esc(b.legenda) + (b.credito ? ' <span class="cred">Fonte: ' + esc(b.credito) + "</span>" : "") + "</figcaption></figure>",
    galeria: b => '<div class="figs" data-gallery>' + b.itens.map(i => '<button class="fig" type="button" data-cap="' + esc(i.legenda + (i.credito ? " Fonte: " + i.credito + "." : "")) + '"><img src="' + esc(i.src) + '" data-full="' + esc(i.full || i.src) + '" alt="' + esc(i.titulo) + '" loading="lazy" decoding="async"><span><b>' + esc(i.titulo) + "</b></span></button>").join("") + "</div>",
    grafico: (b, id) => {
      const gid = "g-" + id;
      return '<div class="chart-art" id="' + gid + '">' +
        '<div class="chips-f" role="tablist" aria-label="' + esc(b.rotulo_chips || "Escolha o que comparar") + '">' + b.parametros.map((p, i) => '<button type="button" class="chip-f" role="tab" data-i="' + i + '" aria-selected="' + (i === 0) + '" aria-pressed="' + (i === 0) + '">' + esc(p.rotulo) + "</button>").join("") + "</div>" +
        '<div class="chart-body"><svg viewBox="0 0 560 320" role="img" aria-live="polite"></svg><div class="chart-side"><ul class="chart-leg"></ul><p class="chart-read"></p></div></div>' +
        (b.nota ? '<p class="note art-note">' + esc(b.nota) + "</p>" : "") + "</div>";
    }
  };

  function desenharGrafico(el, b) {
    const svg = $("svg", el), leitura = $(".chart-read", el), NS = "http://www.w3.org/2000/svg";
    const mk = (tag, at, pai, txt) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; (pai || svg).appendChild(e); return e; };
    const passoBom = x => { const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
    let atual = 0;
    function mostrar(i) {
      atual = i;
      const p = b.parametros[i], grupos = p.grupos || b.grupos;
      // unidade dos valores ("%" se não for informada; ex.: " mm", " meses"), que cada aba pode trocar
      const uni = p.unidade != null ? p.unidade : b.unidade != null ? b.unidade : "%", pre = p.prefixo || b.prefixo || "", eixo = p.eixo || b.eixo;
      const fmt = v => pre + num(v) + uni;
      const noEixo = v => pre + num(v) + (uni.trim().length <= 2 ? uni : "");
      svg.innerHTML = "";
      svg.setAttribute("aria-label", p.rotulo + ": " + p.valores.map((v, k) => grupos[k].nome + " " + fmt(v.m)).join("; "));
      $(".chart-leg", el).innerHTML = grupos.map(g => '<li><i style="background:' + g.cor + '"></i>' + esc(g.nome) + "</li>").join("");
      const L = 56, R = 540, T = 30, B = 270, max = Math.max(...p.valores.map(v => v.m + (v.ep || 0))) || 1;
      const passo = passoBom((max * 1.15) / 5);
      const topo = Math.ceil((max * 1.15) / passo) * passo, Y = v => B - (v / topo) * (B - T);
      for (let v = 0; v <= topo + 1e-9; v += passo) {
        mk("line", { x1: L, x2: R, y1: Y(v), y2: Y(v), class: "gridl" });
        mk("text", { x: L - 10, y: Y(v) + 4, "text-anchor": "end", class: "lbl" }, null, noEixo(+v.toFixed(2)));
      }
      if (uni.trim().length > 2 || eixo) mk("text", { x: 8, y: 14, class: "lbl" }, null, eixo || uni.trim());
      mk("line", { x1: L, x2: R, y1: B, y2: B, class: "axis" });
      const w = (R - L) / p.valores.length, bw = Math.min(96, w * .52);
      p.valores.forEach((v, k) => {
        const cx = L + w * k + w / 2, g = grupos[k], y = Y(v.m);
        const bar = mk("rect", { x: cx - bw / 2, y: y, width: bw, height: Math.max(0, B - y), rx: 6, fill: g.cor });
        if (!RM) { bar.style.transformBox = "fill-box"; bar.style.transformOrigin = "center bottom"; bar.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 700, delay: k * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); }
        if (v.ep) {
          const y1 = Y(v.m + v.ep), y2 = Y(Math.max(0, v.m - v.ep));
          mk("line", { x1: cx, x2: cx, y1, y2, stroke: "#E7ECF6", "stroke-width": 1.5 });
          mk("line", { x1: cx - 9, x2: cx + 9, y1, y2: y1, stroke: "#E7ECF6", "stroke-width": 1.5 });
        }
        const topoBarra = Y(v.m + (v.ep || 0));
        mk("text", { x: cx, y: topoBarra - 10, "text-anchor": "middle", class: "val" }, null, pre + num(v.m) + (v.ep ? " ± " + num(v.ep) : "") + (uni.trim().length <= 2 ? uni : ""));
        if (v.sig) mk("text", { x: cx, y: topoBarra - 28, "text-anchor": "middle", class: "sig" }, null, v.sig);
        mk("text", { x: cx, y: B + 22, "text-anchor": "middle", class: "lbl-strong" }, null, g.nome);
      });
      leitura.innerHTML = "<b>" + esc(p.rotulo) + "</b>" + esc(p.leitura);
      if (!RM) leitura.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 380 });
      $$(".chip-f", el).forEach((c, k) => { c.setAttribute("aria-pressed", String(k === i)); c.setAttribute("aria-selected", String(k === i)); });
    }
    $(".chips-f", el).addEventListener("click", e => { const c = e.target.closest(".chip-f"); if (c) mostrar(+c.dataset.i); });
    let feito = false;
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting && !feito) { feito = true; io.disconnect(); mostrar(atual); } }, { threshold: .25 }).observe(el);
    mostrar(0);
  }

  /* ---------------- ilustração animada da abertura: fibras musculares ao microscópio ---------------- */
  function arteCelulas(cv) {
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, cells = [], raf = 0, vis = true;
    const t0 = performance.now();
    function build() {
      const r = cv.getBoundingClientRect(), pr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * pr; cv.height = H * pr; ctx.setTransform(pr, 0, 0, pr, 0, 0);
      const s = W < 700 ? 30 : 38, x0 = W < 980 ? -s : W * .5, rows = Math.ceil(H / (s * .86)) + 2;
      cells = [];
      for (let j = -1; j < rows; j++) for (let x = x0; x < W + s; x += s) {
        const jx = (Math.random() - .5) * s * .35, jy = (Math.random() - .5) * s * .35;
        cells.push({ x: x + (j % 2 ? s / 2 : 0) + jx, y: j * s * .86 + jy, r: s * (.4 + Math.random() * .12), e: .82 + Math.random() * .32, rot: Math.random() * 6.28, n: Math.random() * 6.28, d: 0 });
      }
    }
    function draw(now) {
      raf = 0; const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const span = W < 980 ? W : W * .55, x0 = W < 980 ? 0 : W * .45;
      const frente = x0 + ((t * .07) % 1.5) * span * 1.1 - span * .1;          // onde o veneno está agindo
      for (const c of cells) {
        const dv = frente - c.x, alvo = RM ? 0 : (dv > 0 && dv < span * .32 ? 1 : 0);
        c.d += (alvo - c.d) * .035;
        const d = c.d;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(1 + d * .14, 1 + d * .14);
        ctx.beginPath(); ctx.ellipse(0, 0, c.r * c.e, c.r / c.e * .9, 0, 0, 6.283);
        ctx.fillStyle = "hsla(" + (348 - d * 8) + "," + (64 - d * 34) + "%," + (56 + d * 22) + "%," + (.5 - d * .2) + ")"; ctx.fill();
        ctx.strokeStyle = "hsla(345,60%,78%," + (.35 - d * .18) + ")"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(c.r * c.e * .68 * Math.cos(c.n), c.r * .58 * Math.sin(c.n), 2.4, 0, 6.283);
        ctx.fillStyle = "rgba(96,70,170," + (.75 - d * .45) + ")"; ctx.fill();
        if (d > .35) { ctx.fillStyle = "rgba(6,10,19," + ((d - .35) * .9).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(-c.r * .22, c.r * .08, c.r * .2 * d, 0, 6.283); ctx.arc(c.r * .24, -c.r * .2, c.r * .13 * d, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
      if (!RM) { const g = ctx.createLinearGradient(frente - 60, 0, frente, 0); g.addColorStop(0, "rgba(255,84,112,0)"); g.addColorStop(1, "rgba(255,84,112,.18)"); ctx.fillStyle = g; ctx.fillRect(frente - 60, 0, 60, H); }
      if (W >= 980) { const m = ctx.createLinearGradient(W * .42, 0, W * .62, 0); m.addColorStop(0, "#060A13"); m.addColorStop(1, "rgba(6,10,19,0)"); ctx.fillStyle = m; ctx.fillRect(0, 0, W * .62, H); }
      if (!RM && vis) raf = requestAnimationFrame(draw);
    }
    build(); draw(performance.now());
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !RM) raf = requestAnimationFrame(draw); }).observe(cv);
    addEventListener("resize", () => { build(); if (!raf) draw(performance.now()); });
  }

  /* ---------------- outras ilustrações da abertura (campo "arte" do artigo.json) ----------------
     rede: dados e inteligência artificial · helice: DNA · fibras: celulose e curativos
     particulas: nanopartículas e cosméticos · bastonetes: bactérias · sangue: células do sangue */
  const ARTES = {
    rede: {
      criar: (W, H, rnd) => ({ ns: Array.from({ length: W < 700 ? 34 : 60 }, () => ({ x: rnd(W), y: rnd(H), vx: rnd(.3) - .15, vy: rnd(.3) - .15, q: Math.random() < .12 })) }),
      desenhar(c, s, t, W, H) {
        for (const n of s.ns) { n.x = (n.x + n.vx + W) % W; n.y = (n.y + n.vy + H) % H; }
        for (let i = 0; i < s.ns.length; i++) for (let j = i + 1; j < s.ns.length; j++) {
          const a = s.ns[i], b = s.ns[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) { c.strokeStyle = "rgba(120,160,255," + (.32 * (1 - d / 130)).toFixed(3) + ")"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        for (const n of s.ns) {
          const pulso = n.q ? .5 + .5 * Math.sin(t * 2 + n.x) : 0;
          c.fillStyle = n.q ? "rgba(255,84,112," + (.55 + pulso * .45) + ")" : "rgba(170,195,255,.75)";
          c.beginPath(); c.arc(n.x, n.y, n.q ? 3.2 + pulso * 2 : 2.2, 0, 6.283); c.fill();
        }
      }
    },
    helice: {
      criar: () => ({}),
      desenhar(c, s, t, W, H) {
        const cy = H * .5, A = Math.min(H * .2, 120), x0 = W < 980 ? 0 : W * .38;
        for (let x = x0, k = 0; x < W + 20; x += 15, k++) {
          const f = x * .018 + t * .7, y1 = cy + A * Math.sin(f), y2 = cy - A * Math.sin(f), z = Math.cos(f);
          if (k % 2 === 0) { const alvo = (k % 22 === 10); c.strokeStyle = alvo ? "rgba(255,84,112,.8)" : "rgba(140,170,255,.28)"; c.lineWidth = alvo ? 3 : 1.4; c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.stroke(); }
          c.fillStyle = "rgba(125,160,255," + (.45 + .4 * z) + ")"; c.beginPath(); c.arc(x, y1, 3.6 + 1.6 * z, 0, 6.283); c.fill();
          c.fillStyle = "rgba(190,150,255," + (.45 - .4 * z) + ")"; c.beginPath(); c.arc(x, y2, 3.6 - 1.6 * z, 0, 6.283); c.fill();
        }
        c.lineWidth = 1;
      }
    },
    fibras: {
      criar: (W, H, rnd) => ({ fs: Array.from({ length: 26 }, (_, i) => ({ y: (i + .5) * H / 26 + rnd(20) - 10, a: 8 + rnd(26), f: .004 + rnd(.01), v: .2 + rnd(.5), p: rnd(6.28), w: .6 + rnd(1.6) })), gs: Array.from({ length: 16 }, () => ({ f: Math.floor(rnd(26)), x: rnd(W), v: .4 + rnd(.8) })) }),
      desenhar(c, s, t, W, H) {
        const yDe = (f, x) => f.y + f.a * Math.sin(x * f.f + f.p + t * f.v);
        for (const f of s.fs) {
          c.strokeStyle = "rgba(95,211,200,.22)"; c.lineWidth = f.w; c.beginPath();
          for (let x = 0; x <= W; x += 12) { const y = yDe(f, x); x ? c.lineTo(x, y) : c.moveTo(x, y); }
          c.stroke();
        }
        // gotinhas do ativo sendo liberadas ao longo das fibras
        for (const g of s.gs) {
          g.x += g.v; if (g.x > W + 10) { g.x = -10; g.f = Math.floor(Math.random() * s.fs.length); }
          const f = s.fs[g.f], y = yDe(f, g.x);
          c.fillStyle = "rgba(255,178,63,.85)"; c.beginPath(); c.arc(g.x, y, 2.6, 0, 6.283); c.fill();
        }
        c.lineWidth = 1;
      }
    },
    particulas: {
      criar: (W, H, rnd) => ({ ps: Array.from({ length: W < 700 ? 22 : 38 }, () => ({ x: rnd(W), y: rnd(H), r: 6 + rnd(22), v: .15 + rnd(.45), h: [340, 38, 170, 255][Math.floor(rnd(4))] })) }),
      desenhar(c, s, t, W, H) {
        for (const p of s.ps) {
          p.y -= p.v; if (p.y < -p.r * 2) { p.y = H + p.r * 2; p.x = Math.random() * W; }
          const x = p.x + Math.sin(t * .6 + p.r) * 8;
          const g = c.createRadialGradient(x - p.r * .3, p.y - p.r * .3, p.r * .1, x, p.y, p.r);
          g.addColorStop(0, "hsla(" + p.h + ",90%,82%,.55)"); g.addColorStop(1, "hsla(" + p.h + ",80%,60%,.06)");
          c.fillStyle = g; c.beginPath(); c.arc(x, p.y, p.r, 0, 6.283); c.fill();
          c.strokeStyle = "hsla(" + p.h + ",85%,80%,.35)"; c.beginPath(); c.arc(x, p.y, p.r * .72, 0, 6.283); c.stroke();
        }
      }
    },
    bastonetes: {
      criar: (W, H, rnd) => ({ bs: Array.from({ length: W < 700 ? 12 : 20 }, () => ({ x: rnd(W), y: rnd(H), a: rnd(6.28), va: rnd(.01) - .005, vx: rnd(.4) - .2, vy: rnd(.4) - .2 })), is: Array.from({ length: 70 }, () => ({ x: rnd(W), y: rnd(H), b: Math.floor(rnd(12)) })) }),
      desenhar(c, s, t, W, H) {
        for (const b of s.bs) {
          b.x = (b.x + b.vx + W) % W; b.y = (b.y + b.vy + H) % H; b.a += b.va;
          c.save(); c.translate(b.x, b.y); c.rotate(b.a);
          c.fillStyle = "rgba(95,211,154,.28)"; c.strokeStyle = "rgba(140,235,190,.55)";
          c.beginPath(); c.roundRect ? c.roundRect(-26, -8, 52, 16, 8) : c.rect(-26, -8, 52, 16); c.fill(); c.stroke(); c.restore();
        }
        // íons de metal sendo atraídos e presos pelas bactérias
        for (const m of s.is) {
          const b = s.bs[m.b % s.bs.length], dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy);
          if (d < 14 || d > W * .6) { m.x = Math.random() * W; m.y = Math.random() * H; m.b = Math.floor(Math.random() * s.bs.length); continue; }
          m.x += dx / d * .7; m.y += dy / d * .7;
          c.fillStyle = "rgba(200,210,230," + Math.min(.9, d / 120) + ")"; c.beginPath(); c.arc(m.x, m.y, 1.8, 0, 6.283); c.fill();
        }
      }
    },
    sangue: {
      criar: (W, H, rnd) => ({ cs: Array.from({ length: W < 700 ? 26 : 44 }, () => ({ x: rnd(W), y: rnd(H), r: 7 + rnd(9), v: .3 + rnd(.8), l: Math.random() < .35 })) }),
      desenhar(c, s, t, W, H) {
        for (const e of s.cs) {
          e.x += e.v; if (e.x > W + 20) { e.x = -20; e.y = Math.random() * H; }
          const y = e.y + Math.sin(t + e.x * .01) * 6;
          if (e.l) { // linfócito: núcleo grande
            c.fillStyle = "rgba(165,140,255,.22)"; c.beginPath(); c.arc(e.x, y, e.r * 1.1, 0, 6.283); c.fill();
            c.fillStyle = "rgba(150,120,255,.7)"; c.beginPath(); c.arc(e.x, y, e.r * .8, 0, 6.283); c.fill();
          } else { // hemácia
            c.fillStyle = "rgba(255,84,112,.45)"; c.beginPath(); c.ellipse(e.x, y, e.r, e.r * .82, 0, 0, 6.283); c.fill();
            c.fillStyle = "rgba(6,10,19,.25)"; c.beginPath(); c.ellipse(e.x, y, e.r * .45, e.r * .35, 0, 0, 6.283); c.fill();
          }
        }
      }
    }
  };

  function arteAnimada(cv, tipo) {
    const ctx = cv.getContext("2d"), A = ARTES[tipo];
    let W = 0, H = 0, s = null, raf = 0, vis = true;
    const t0 = performance.now(), rnd = n => Math.random() * n;
    function build() {
      const r = cv.getBoundingClientRect(), pr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * pr; cv.height = H * pr; ctx.setTransform(pr, 0, 0, pr, 0, 0);
      s = A.criar(W, H, rnd);
    }
    function draw(now) {
      raf = 0; ctx.clearRect(0, 0, W, H);
      A.desenhar(ctx, s, RM ? 0 : (now - t0) / 1000, W, H);
      // no computador, o desenho fica à direita e some atrás do texto
      if (W >= 980) { const m = ctx.createLinearGradient(W * .38, 0, W * .62, 0); m.addColorStop(0, "#060A13"); m.addColorStop(1, "rgba(6,10,19,0)"); ctx.fillStyle = m; ctx.fillRect(0, 0, W * .62, H); }
      else { ctx.fillStyle = "rgba(6,10,19,.45)"; ctx.fillRect(0, 0, W, H); }
      if (!RM && vis) raf = requestAnimationFrame(draw);
    }
    build(); draw(performance.now());
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !RM) raf = requestAnimationFrame(draw); }).observe(cv);
    addEventListener("resize", () => { build(); if (!raf) draw(performance.now()); });
  }

  /* ---------------- montagem da página ---------------- */
  function montar(d) {
    const rv = d.revista || {};
    document.title = (d.titulo_curto || d.titulo) + " · GenoEvidence";
    const desc = $('meta[name="description"]'); if (desc) desc.content = d.titulo;
    const autores = d.autores || [];

    const hero = document.createElement("section");
    hero.className = "hero art-hero"; hero.id = "top";
    hero.innerHTML = '<canvas id="artCanvas" aria-hidden="true"></canvas><div class="hero-grid"></div>' +
      '<div class="wrap hero-in"><div>' +
      '<p class="eyebrow crumb"><a href="' + RAIZ + '">GenoEvidence</a> <span aria-hidden="true">/</span> <a href="' + RAIZ + "artigos/" + (d.tema_id ? "#" + esc(d.tema_id) : "") + '">' + esc(d.tema || "Temas") + '</a> <span aria-hidden="true">/</span> <span style="color:var(--text)">' + esc(d.breadcrumb || d.titulo_curto) + "</span></p>" +
      '<div class="kind-row"><span class="badge tipo">' + esc(d.rotulo || "Artigo publicado") + "</span>" + (rv.nome ? '<a class="badge rev" href="' + esc(rv.site || rv.url) + '" target="_blank" rel="noopener">Revista ' + esc(rv.nome) + (rv.ano ? " · " + esc(rv.ano) : "") + "</a>" : "") + "</div>" +
      '<h1 class="art-title">' + esc(d.titulo_curto || d.titulo) + "</h1>" +
      // título completo: em português; se o original for em outra língua, ele aparece embaixo
      '<p class="sub art-full">' + esc(d.titulo_pt || d.titulo) + (d.titulo_pt ? '<span class="art-orig">' + esc(d.rotulo_original || "Título original em inglês:") + " " + esc(d.titulo) + "</span>" : "") + "</p>" +
      '<p class="authors art-authors">' + autores.map(a => "<span" + (a.destaque ? ' class="hl" title="Pesquisadora em destaque no GenoEvidence"' : "") + ">" + esc(a.nome || a) + "</span>").join("") + "</p>" +
      '<div class="cta-row">' +
      (rv.url ? '<a class="cta journal-cta" href="' + esc(rv.url) + '" target="_blank" rel="noopener">Ler na revista <span aria-hidden="true">↗</span></a>' : "") +
      '<a class="cta ghost" href="#em-1-minuto">Resumo em 1 minuto</a>' +
      (rv.pdf ? '<a class="cta ghost" href="' + esc(rv.pdf) + '" target="_blank" rel="noopener">Baixar PDF <span aria-hidden="true">↗</span></a>' : "") +
      "</div></div>" +
      '<aside class="readout" aria-label="Onde foi publicado"><p class="eyebrow" style="margin-bottom:6px">Publicado em</p>' +
      '<p class="rv-name' + ((rv.nome || "").length > 22 ? " longo" : "") + '">' + esc(rv.nome || "—") + "</p>" +
      (rv.volume ? '<div class="row"><span class="k">Volume · número</span><span class="v">v. ' + esc(rv.volume) + (rv.numero ? ", n. " + esc(rv.numero) : "") + "</span></div>" : "") +
      (rv.paginas ? '<div class="row"><span class="k">Páginas</span><span class="v">' + esc(rv.paginas) + "</span></div>" : "") +
      (rv.publicado ? '<div class="row"><span class="k">Publicação</span><span class="v">' + esc(data(rv.publicado)) + "</span></div>" : "") +
      (rv.issn ? '<div class="row"><span class="k">ISSN</span><span class="v">' + esc(rv.issn) + "</span></div>" : "") +
      (rv.doi ? '<div class="row"><span class="k">DOI</span><span class="v his">' + esc(rv.doi) + "</span></div>" : "") +
      '<a class="readout-link" href="#revista">Sobre a revista e como citar →</a></aside></div>' +
      '<span class="art-canvas-tag">' + esc(d.arte_legenda || "ilustração · fibras musculares ao microscópio") + "</span>";
    main.before(hero);

    let html = "";
    // em 1 minuto + números-chave
    if (d.em_1_minuto) {
      html += '<section class="s" id="em-1-minuto"><div class="wrap"><div class="s-head"><p class="eyebrow">Em 1 minuto</p><h2>O artigo em quatro passos</h2><p class="lede">Para quem tem pouco tempo: o essencial do estudo, em linguagem simples.</p></div>' +
        '<div class="story">' + d.em_1_minuto.map(i => '<div class="story-card"><span class="eyebrow">' + esc(i.rotulo) + "</span><h3>" + esc(i.titulo) + "</h3><p>" + esc(i.texto) + "</p></div>").join("") + "</div>" +
        (d.numeros ? '<div class="num-grid">' + d.numeros.map(n => '<div class="num-tile" style="--c:' + cor(n.cor) + '"><span class="num-v">' + esc(n.valor) + "</span><p>" + esc(n.texto) + "</p></div>").join("") + "</div>" : "") +
        "</div></section>";
    }
    (d.secoes || []).forEach(sec => {
      html += '<section class="s" id="' + esc(sec.id) + '"><div class="wrap"><div class="s-head"><p class="eyebrow">' + esc(sec.eyebrow || "") + "</p><h2>" + esc(sec.titulo) + "</h2>" + (sec.lede ? '<p class="lede">' + esc(sec.lede) + "</p>" : "") + "</div>" +
        '<div class="blocks">' + (sec.blocos || []).map((b, k) => (BLOCOS[b.tipo] ? BLOCOS[b.tipo](b, sec.id + "-" + k) : "")).join("") + "</div></div></section>";
    });
    if (d.glossario) {
      html += '<section class="s" id="glossario"><div class="wrap"><div class="s-head"><p class="eyebrow">Glossário</p><h2>Palavras-chave, sem complicação</h2><p class="lede">Os termos técnicos deste artigo explicados de forma simples.</p></div>' +
        '<dl class="gloss">' + d.glossario.map(g => "<div><dt>" + esc(g.termo) + "</dt><dd>" + esc(g.def) + "</dd></div>").join("") + "</dl></div></section>";
    }
    // a revista em destaque + autores + como citar
    html += '<section class="s" id="revista"><div class="wrap"><div class="s-head"><p class="eyebrow">A revista</p><h2>Onde este artigo foi publicado</h2><p class="lede">Toda evidência tem uma fonte. Leia o artigo completo diretamente na revista.</p></div>' +
      '<div class="journal-panel"><div class="jp-main"><span class="jp-mark">' + esc((rv.nome || "R").slice(0, 2)) + '</span><div><p class="eyebrow">Revista científica</p><p class="jp-name">' + esc(rv.nome || "") + "</p>" +
      '<p class="jp-meta">' + [rv.cidade, rv.volume && "v. " + rv.volume, rv.numero && "n. " + rv.numero, rv.paginas && "p. " + rv.paginas, rv.ano].filter(Boolean).map(esc).join(" · ") + "</p></div></div>" +
      '<dl class="kv jp-kv">' +
      (rv.submetido ? "<dt>Submetido</dt><dd>" + esc(data(rv.submetido)) + "</dd>" : "") +
      (rv.publicado ? "<dt>Publicado</dt><dd>" + esc(data(rv.publicado)) + "</dd>" : "") +
      (rv.issn ? "<dt>ISSN</dt><dd>" + esc(rv.issn) + "</dd>" : "") +
      (rv.doi ? '<dt>DOI</dt><dd><a href="https://doi.org/' + esc(rv.doi) + '" target="_blank" rel="noopener">' + esc(rv.doi) + "</a></dd>" : "") + "</dl>" +
      '<div class="jp-btns">' + (rv.url ? '<a class="journal-btn" href="' + esc(rv.url) + '" target="_blank" rel="noopener">Ler na revista ↗</a>' : "") +
      (rv.pdf ? '<a class="cta ghost" href="' + esc(rv.pdf) + '" target="_blank" rel="noopener">PDF do artigo ↗</a>' : "") +
      (rv.site ? '<a class="cta ghost" href="' + esc(rv.site) + '" target="_blank" rel="noopener">Site da revista ↗</a>' : "") + "</div></div>" +
      (autores.length ? '<h3 class="blk-title">Autores</h3><ul class="author-list">' + autores.map(a => "<li" + (a.destaque ? ' class="hl"' : "") + "><b>" + esc(a.nome || a) + "</b>" + (a.afiliacao ? "<span>" + esc(a.afiliacao) + "</span>" : "") + "</li>").join("") + "</ul>" : "") +
      (d.citacao ? '<div class="cite-box"><div class="cite-head"><h3 class="blk-title">Como citar (ABNT)</h3><button type="button" class="copy-btn" data-copy="#citacao">Copiar citação</button></div><p id="citacao">' + esc(d.citacao) + "</p></div>" : "") +
      "</div></section>";
    if (d.referencias) {
      html += '<section class="s" id="referencias"><div class="wrap"><div class="s-head"><p class="eyebrow">Referências</p><h2>Referências citadas nesta página</h2><p class="lede">Estudos mencionados na explicação acima, com os títulos no idioma original, como pede a norma ABNT. A lista completa está no artigo original.</p></div>' +
        '<ol class="ref-list">' + d.referencias.map(r => "<li><p>" + esc(r.texto) + "</p>" + (r.doi ? '<a href="https://doi.org/' + esc(r.doi) + '" target="_blank" rel="noopener">doi.org/' + esc(r.doi) + " ↗</a>" : r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">Acessar ↗</a>' : "") + "</li>").join("") + "</ol></div></section>";
    }
    main.innerHTML = html;

    // gráficos interativos
    (d.secoes || []).forEach(sec => (sec.blocos || []).forEach((b, k) => { if (b.tipo === "grafico") desenharGrafico($("#g-" + sec.id + "-" + k), b); }));
    // animação da cadeia de eventos
    $$(".chain").forEach(ch => new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { ch.classList.add("on"); io.disconnect(); } }, { threshold: .3 }).observe(ch));
    // ilustração da abertura
    const cv = $("#artCanvas"); if (cv) ARTES[d.arte] ? arteAnimada(cv, d.arte) : arteCelulas(cv);

    // menu do topo e menu lateral
    const secs = [["#em-1-minuto", "Resumo"]].concat((d.secoes || []).map(s => ["#" + s.id, s.menu || s.titulo]));
    if (d.glossario) secs.push(["#glossario", "Glossário"]);
    secs.push(["#revista", "Revista"]);
    if (d.referencias) secs.push(["#referencias", "Referências"]);
    $("#nav").innerHTML = secs.map(([h, l]) => '<a href="' + h + '">' + esc(l) + "</a>").join("");
    $("#ge-topicos").textContent = JSON.stringify([["#top", "Início do artigo"]].concat(secs.map(([h, l]) => [h, l])));
    if (window.GE && GE.iniciar) GE.iniciar();
    if (location.hash && document.querySelector(location.hash)) setTimeout(() => GE.goTo(location.hash), 300);
  }
})();
