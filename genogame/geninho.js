/* GenoGame · o Geninho vivo, com as poses desenhadas por Thaisa Carvalho
   As poses (scripts/genogame/poses/, 1254 × 1254 px) viram camadas em img/gp-*.webp (scripts/genogame/poses.py):
   - parado de três quartos (para a direita e para a esquerda), com as patas abaixadas: só o antebraço da frente
     se mexe, girando no punho da manga, para pegar, carregar e usar os equipamentos;
   - andando de perfil: pernas, pés, braços e cauda articulados; o corpo sobe e desce conforme o ângulo da perna
     de apoio, para o pé ficar no chão; para a direita, a pose é espelhada;
   - de frente (para encarar quem joga, comemorar e no meio das viradas), de costas (ao entrar no elevador) e
     alcançando (para olhar algo de perto).
   Troca de pose com transição curta (as duas aparecem misturadas por um instante). Pisca em intervalos variados.
   Coordenadas das partes: as das imagens originais (1254 px). Pés na origem; cerca de 168 de altura (× ESCALA no jogo). */
(function () {
  "use strict";
  const K = 168 / 1160;   // imagem original → mundo
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const suave = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const sino = k => Math.sin(Math.PI * clamp(k, 0, 1));
  const env = (k, a, b) => (k < a ? suave(k / a) : k < b ? 1 : 1 - suave((k - b) / (1 - b)));

  /* poses: âncora (meio do jaleco, linha dos pés), olhos (para piscar), articulações e onde fica a mão.
     olha: para que lado a imagem olha (se for o outro, ela é espelhada) */
  const P = {
    frente: { anc: [622.6, 1196], olhos: [[537, 254, 38, 32], [738, 247, 33, 30]], mao: [852, 912] },
    costas: { anc: [633.5, 1200], olhos: [], mao: [860, 900] },
    alcanca: { anc: [717.4, 1181], olhos: [[814, 378, 41, 33], [1002, 420, 30, 30]], mao: [1150, 985], olha: 1 },
    ladoD: { anc: [587.1, 1202], olhos: [[520, 270, 40, 30], [686, 236, 19, 29]], braco: [792, 733], mao: [784, 912], frente: 1 },
    ladoE: { anc: [577.5, 1218], olhos: [[414, 251, 22, 31], [585, 251, 42, 31]], braco: [368, 715], mao: [345, 905], frente: -1 },
    andar: { anc: [572.9, 1202], olhos: [[446, 277, 32, 33]], mao: [800, 884], olha: -1,
      piv: { braco: [738, 740], braco2: [396, 746], perna: [520, 1015], pe: [478, 1128], perna2: [734, 1058], pe2: [768, 1134], cauda: [868, 1000] } }
  };
  const PERNA = 170;   // comprimento da perna (quadril → sola) na pose de caminhada, em px da imagem
  const ABRE = 27;     // ângulo de cada perna na pose desenhada (graus a partir da vertical)

  const img = (n, troca) => '<image' + (troca ? ' class="epi-troca"' : "") + ' data-base="' + n + '" href="img/gp-' + n + '.webp" x="0" y="0" width="1254" height="1254"/>';
  const palpebras = olhos => olhos.map(([cx, cy, rx, ry]) => '<g class="palpebra" style="transform-origin:' + cx + "px " + (cy - ry - 3) + 'px"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rx + 4) + '" ry="' + (ry + 4) + '" fill="#EEDFD3"/>' +
    '<path d="M' + (cx - rx) + " " + (cy + ry * 0.55) + "Q" + cx + " " + (cy + ry * 1.05) + " " + (cx + rx) + " " + (cy + ry * 0.55) + '" stroke="#3A2A24" stroke-width="5" fill="none" stroke-linecap="round"/></g>').join("");
  const mao = p => '<g class="mao" data-pose="' + p + '"><g class="mao-obj"></g><circle class="mao-ponto" cx="' + P[p].mao[0] + '" cy="' + P[p].mao[1] + '" r="3" fill="none"/></g>';
  const grupo = (p, miolo) => '<g class="pose" data-pose="' + p + '"><g transform="scale(' + K.toFixed(5) + ") translate(" + (-P[p].anc[0]) + "," + (-P[p].anc[1]) + ')"><g class="espelho">' + miolo + "</g></g></g>";
  const parte = (n, miolo) => '<g class="pt-' + n + '">' + miolo + "</g>";

  /* o Geninho do laboratório (com todas as poses) */
  function geninhoSVG() {
    const ladoD = grupo("ladoD", parte("corpo", img("ladoD-corpo", 1)) + palpebras(P.ladoD.olhos) + parte("braco", img("ladoD-braco", 1) + mao("ladoD")) + img("ladoD-manga"));
    const ladoE = grupo("ladoE", parte("braco", img("ladoE-braco", 1) + mao("ladoE")) + parte("corpo", img("ladoE-corpo", 1)) + palpebras(P.ladoE.olhos));
    const andar = grupo("andar",
      parte("cauda", img("andar-cauda")) + parte("braco2", img("andar-braco2", 1)) +
      parte("perna2", img("andar-perna2") + parte("pe2", img("andar-pe2", 1))) +
      parte("perna", img("andar-perna") + parte("pe", img("andar-pe", 1))) +
      parte("corpo", img("andar-corpo", 1)) + palpebras(P.andar.olhos) + parte("braco", img("andar-braco", 1) + mao("andar")) + img("andar-manga"));
    const frente = grupo("frente", img("frente", 1) + palpebras(P.frente.olhos) + mao("frente"));
    const costas = grupo("costas", img("costas", 1) + mao("costas"));
    const alcanca = grupo("alcanca", img("alcanca", 1) + palpebras(P.alcanca.olhos) + mao("alcanca"));
    return '<ellipse cx="0" cy="1" rx="44" ry="6.5" class="c-sombra"/><g class="tudo">' + ladoD + ladoE + andar + frente + costas + alcanca + "</g>" +
      '<g class="molhado"><g class="gotas"><path d="M-34 -150q3 5 0 7q-3 -2 0 -7z" fill="#7FB4FF"/><path d="M30 -150q3 5 0 7q-3 -2 0 -7z" fill="#7FB4FF"/><path d="M-4 -176q3 5 0 7q-3 -2 0 -7z" fill="#7FB4FF"/><path d="M42 -96q3 5 0 7q-3 -2 0 -7z" fill="#7FB4FF"/></g></g>';
  }
  /* no painel do EPI: o Geninho de frente, com cada item numa camada (aparece quando é escolhido) */
  function geninhoPainel() {
    const item = n => '<image class="epi ' + n + '" href="img/gp-frente-' + n + '.webp" x="0" y="0" width="1254" height="1254"/>';
    return '<ellipse cx="0" cy="1" rx="44" ry="6.5" class="c-sombra"/><g class="tudo"><g transform="scale(' + K.toFixed(5) + ") translate(" + (-P.frente.anc[0]) + "," + (-P.frente.anc[1]) + ')">' +
      img("frente") + item("luvas") + item("sapato") + item("oculos") + item("prendedor") + palpebras(P.frente.olhos) + "</g></g>";
  }

  /* ---------------- gestos ----------------
     fixa: a pose usada enquanto o gesto acontece (senão, a de parado); bra: ângulo do antebraço da frente
     (positivo = para a frente), com peso braW; by, br, sy e sx mexem o corpo inteiro. */
  const GESTOS = {
    alcancar: { dur: 0.8, eventos: [[0.5, "meio"]], pose(k, o) {
      const e = env(k, 0.42, 0.62), alto = o.alto == null ? 1 : o.alto;
      return { bra: 78 + 34 * alto, braW: e, br: 4 * e, by: -(2 + 5 * alto) * e, sy: 0.03 * e };
    } },
    usar: { dur: 1.0, eventos: [[0.3, "toque"], [0.72, "toque"]], pose(k) {
      const e = env(k, 0.18, 0.85), toque = Math.pow(Math.abs(Math.sin(Math.PI * 2 * k)), 1.5);
      return { bra: 74 + 14 * toque, braW: e, br: 2.5 * e, by: -2 * e };
    } },
    digitar: { dur: 1.4, eventos: [[0.5, "meio"]], pose(k) {
      const e = env(k, 0.15, 0.85);
      return { bra: 66 + 7 * Math.sin(Math.PI * 2 * k * 7), braW: e, br: 2 * e };
    } },
    surpresa: { dur: 0.95, fixa: "frente", eventos: [], pose(k) {
      const pulo = k > 0.12 && k < 0.6 ? sino((k - 0.12) / 0.48) : 0, agacha = k < 0.12 ? sino(k / 0.24) : k > 0.6 && k < 0.85 ? sino((k - 0.6) / 0.25) : 0;
      return { by: -16 * pulo, sy: 0.05 * pulo - 0.07 * agacha, sx: 0.05 * agacha };
    } },
    comemorar: { dur: 1.9, fixa: "frente", eventos: [], pose(k) {
      const e = env(k, 0.08, 0.9), pulo = Math.abs(Math.sin(Math.PI * 2 * clamp(k / 0.85, 0, 1)));
      return { by: -20 * pulo * e, sy: (0.05 * pulo - 0.04 * (1 - pulo)) * e, sx: 0.03 * (1 - pulo) * e, br: 3 * Math.sin(Math.PI * 2 * k * 2) * e };
    } },
    // depois de um tempo parado, ele se vira para quem joga e dá um pulinho
    tchau: { dur: 2.2, fixa: "frente", eventos: [], pose(k) {
      const pulo = k > 0.1 && k < 0.35 ? sino((k - 0.1) / 0.25) : 0;
      return { by: -9 * pulo, br: 2.5 * Math.sin(Math.PI * 2 * k * 1.5) * env(k, 0.2, 0.8) };
    } },
    pulinho: { dur: 0.62, eventos: [], pose(k) {
      const pulo = k > 0.18 && k < 0.8 ? sino((k - 0.18) / 0.62) : 0, agacha = k < 0.18 ? sino(k / 0.36) : k > 0.8 ? sino((k - 0.8) / 0.4) : 0;
      return { by: -15 * pulo, sy: 0.04 * pulo - 0.06 * agacha, sx: 0.04 * agacha };
    } },
    // olhar algo de perto: inclina o corpo (pose alcançando)
    curioso: { dur: 1.7, fixa: "alcanca", eventos: [], pose(k) {
      const e = env(k, 0.2, 0.75);
      return { br: 1.5 * Math.sin(Math.PI * 2 * k) * e, by: 1.5 * e };
    } },
    olhaCima: { dur: 1.5, eventos: [], pose(k) {
      const e = env(k, 0.3, 0.7);
      return { br: -3 * e };
    } }
  };

  /* ---------------- o boneco ---------------- */
  function criar(gn, cfg) {
    cfg = cfg || {};
    const rm = cfg.rm || (() => false);
    const q = (s, r) => (r || gn).querySelector(s);
    gn.classList.add("rig2");
    const tudo = q(".tudo"), sombra = q(".c-sombra");
    const G = {};   // grupos de cada pose
    gn.querySelectorAll(".pose").forEach(g => { G[g.dataset.pose] = { el: g, esp: q(".espelho", g), op: -1 }; });
    const pt = (p, n) => q(".pt-" + n, G[p].el);
    const A = { cauda: pt("andar", "cauda"), braco: pt("andar", "braco"), braco2: pt("andar", "braco2"), perna: pt("andar", "perna"), pe: pt("andar", "pe"), perna2: pt("andar", "perna2"), pe2: pt("andar", "pe2") };
    const BR = { ladoD: pt("ladoD", "braco"), ladoE: pt("ladoE", "braco") };
    // articulações (fixas): origem de cada giro
    const piv = P.andar.piv;
    [["perna", "perna"], ["perna2", "perna2"], ["pe", "pe"], ["pe2", "pe2"], ["braco", "braco"], ["braco2", "braco2"], ["cauda", "cauda"]].forEach(([k, n]) => { A[k].style.transformOrigin = piv[n][0] + "px " + piv[n][1] + "px"; });
    ["ladoD", "ladoE"].forEach(n => { BR[n].style.transformOrigin = P[n].braco[0] + "px " + P[n].braco[1] + "px"; });
    const palp = [...gn.querySelectorAll(".palpebra")];
    const maos = [...gn.querySelectorAll(".mao")].map(m => ({ p: m.dataset.pose, o: m.querySelector(".mao-obj") }));

    const mola = (k, c) => ({ x: 0, v: 0, k, c, alvo: 0, passo(dt) { const a = this.k * (this.alvo - this.x) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; } });
    const M = { bra: mola(120, 16), corpo: mola(110, 15), sq: mola(260, 13), cauda: mola(30, 5) };

    const S = {
      t: Math.random() * 10, face: -1, vira: null, pose: "ladoE", ant: null, mist: 1, forcada: null,
      fase: 0, anda: 0, cad: 0, andava: false, piscaEm: 1.2 + Math.random() * 2, piscaT: -1, piscaDupla: false,
      gestos: [], carga: null, encara: false
    };

    function piscar() { if (S.piscaT < 0) S.piscaT = 0; }
    function piscadas(dt) {
      if (S.piscaT >= 0) {
        S.piscaT += dt;
        if (S.piscaT > 0.15) { S.piscaT = -1; if (S.piscaDupla) { S.piscaDupla = false; S.piscaEm = 0.12; } else { S.piscaEm = 1.8 + Math.random() * 4.6; S.piscaDupla = Math.random() < 0.18; } }
      } else if ((S.piscaEm -= dt) <= 0) piscar();
      return S.piscaT >= 0 ? sino(S.piscaT / 0.15) : 0;
    }

    /* virar: passa pela pose de frente (lado → frente → outro lado) */
    function virar(face, rapido) {
      if (face !== 1 && face !== -1) return Promise.resolve();
      if (S.vira) { const f = S.vira.fim; S.vira = null; f(); }
      if (S.face === face) return Promise.resolve();
      S.face = face;
      if (rm() || rapido) return Promise.resolve();
      piscar();
      let fim; const p = new Promise(r => { fim = r; });
      S.vira = { t: 0, dur: S.anda > 0.35 ? 0.2 : 0.34, fim };
      return p;
    }

    function gesto(nome, o) {
      const g = GESTOS[nome]; if (!g) return Promise.resolve();
      o = o || {};
      return new Promise(res => {
        if (rm()) { g.eventos.forEach(([, ev]) => o[ev] && o[ev]()); res(); return; }
        piscar();
        S.gestos.push({ g, o, t: 0, dur: g.dur * (o.vel || 1), disparados: 0, res });
      });
    }

    function segurar(svgObj) {
      S.carga = svgObj || null;
      const h = svgObj ? '<g transform="scale(' + (1 / K).toFixed(3) + ')">' + svgObj + "</g>" : "";
      maos.forEach(m => { m.o.innerHTML = h; });
    }
    function posMao(svgRaiz) {
      const ponto = q('.mao[data-pose="' + S.pose + '"] .mao-ponto');
      if (!ponto) return null;
      const r = ponto.getBoundingClientRect(), m = svgRaiz.getScreenCTM();
      if (!m || !r.width) return null;
      const p = svgRaiz.createSVGPoint(); p.x = r.left + r.width / 2; p.y = r.top + r.height / 2;
      const w = p.matrixTransform(m.inverse()); return { x: w.x, y: w.y };
    }
    // EPI: troca cada imagem pela versão com luvas, sapatos, óculos e presilha
    function epi(on) {
      gn.querySelectorAll("image.epi-troca").forEach(im => { im.setAttribute("href", "img/gp-" + im.dataset.base + (on ? "-epi" : "") + ".webp"); });
    }

    const pulso = () => 1 + 0.08 * S.anda * Math.sin(Math.PI * 4 * S.fase + 0.9);
    const ladoDe = f => (f === 1 ? "ladoD" : "ladoE");
    // troca de pose: a nova aparece inteira por baixo e a antiga some por cima (assim ninguém fica transparente)
    function trocarPose(p) {
      if (p === S.pose) return;
      S.ant = S.pose; S.pose = p; S.mist = rm() ? 1 : 0;
      tudo.appendChild(G[S.ant].el);
    }

    function quadro(dt, mov) {
      mov = mov || {};
      const red = rm();
      S.t += dt;
      const vel = mov.vel || 0, acc = mov.acc || 0, v = Math.abs(vel), vn = clamp(v / 300, 0, 1.3);

      /* passos: a cadência acompanha a velocidade */
      if (v > 3) { S.cad = clamp(v / 52, 1.6, 5.4) / 2; S.anda = Math.min(1, S.anda + dt * 8); S.andava = true; }
      else { S.anda = Math.max(0, S.anda - dt * 5); if (S.andava && S.anda < 0.5) { S.andava = false; if (!red) M.sq.v -= 0.5; } }
      S.fase = (S.fase + S.cad * dt * (v > 3 ? 1 : S.anda)) % 1;

      /* virada */
      let viraPose = null;
      if (S.vira) {
        S.vira.t += dt;
        const k = S.vira.t / S.vira.dur;
        viraPose = k < 0.5 ? "frente" : null;
        if (k >= 1) { const f = S.vira.fim; S.vira = null; f(); }
      }

      /* gestos */
      const Gs = { by: 0, br: 0, sy: 0, sx: 0, bra: 0, braW: 0, pose: null };
      for (let i = S.gestos.length - 1; i >= 0; i--) {
        const a = S.gestos[i];
        a.t += dt; const k = clamp(a.t / a.dur, 0, 1);
        const ps = a.g.pose(k, a.o);
        ["by", "br", "sy", "sx"].forEach(c => { if (ps[c]) Gs[c] += ps[c]; });
        if (ps.braW != null && ps.braW >= Gs.braW) { Gs.braW = ps.braW; Gs.bra = ps.bra; }
        if (a.g.fixa && k < 1) Gs.pose = a.g.fixa;
        a.g.eventos.forEach(([kk, ev], j) => { if (k >= kk && !(a.disparados & (1 << j))) { a.disparados |= 1 << j; if (a.o[ev]) a.o[ev](); } });
        if (k >= 1) { S.gestos.splice(i, 1); a.res(); }
      }

      /* qual pose mostrar */
      trocarPose(S.forcada || viraPose || Gs.pose || (S.anda > 0.35 ? "andar" : S.encara ? "frente" : ladoDe(S.face)));
      S.mist = Math.min(1, S.mist + dt / 0.13);
      const vis = n => n === S.pose || (n === S.ant && S.mist < 1);

      /* corpo inteiro: respiração, balanço, inclinação ao andar */
      const T = S.t, w = red ? 0 : S.anda, parado = red ? 0 : 1 - w;
      const resp = Math.sin(Math.PI * 2 * T / 3.4);
      const accFrente = clamp(acc * S.face / 900, -1, 1);
      M.corpo.alvo = parado * (0.6 * Math.sin(Math.PI * 2 * T / 7.1) + 0.3 * Math.sin(Math.PI * 2 * T / 2.9 + 1)) + w * (1.2 * vn + 1.5 * accFrente);
      M.corpo.passo(dt); M.sq.passo(dt);

      /* caminhada: ângulo das pernas, pés no chão e o corpo na altura certa */
      let sobe = 0;
      if (vis("andar")) {
        const p = S.fase, s = Math.cos(Math.PI * 2 * p), sn = Math.sin(Math.PI * 2 * p);
        const amp = ABRE * clamp(0.45 + vn * 0.75, 0.45, 1) * (red ? 0 : Math.max(w, 0.2));
        const angP = -ABRE + amp * s, angL = ABRE - amp * s;               // graus, em relação à pose desenhada
        const liftP = Math.max(0, -sn) * 34 * (red ? 0 : w), liftL = Math.max(0, sn) * 34 * (red ? 0 : w);
        const vertP = ABRE + angP, vertL = ABRE - angL;                      // inclinação a partir da vertical
        const apoio = liftP < liftL ? vertP : vertL;
        sobe = PERNA * (Math.cos(apoio * Math.PI / 180) - Math.cos(ABRE * Math.PI / 180));   // px da imagem
        A.perna.style.transform = "translate(0px," + (-liftP).toFixed(1) + "px) rotate(" + angP.toFixed(2) + "deg)";
        A.perna2.style.transform = "translate(0px," + (-liftL).toFixed(1) + "px) rotate(" + angL.toFixed(2) + "deg)";
        // os pés ficam deitados no chão no apoio e levantam a ponta no ar
        A.pe.style.transform = "rotate(" + (-angP * 0.6 - 9 * Math.min(1, liftP / 20)).toFixed(2) + "deg)";
        A.pe2.style.transform = "rotate(" + (-angL * 0.6 - 9 * Math.min(1, liftL / 20)).toFixed(2) + "deg)";
        // braços ao contrário das pernas; carregando, o braço de perto fica firme, para a frente
        const ampB = 17 * clamp(0.5 + vn * 0.6, 0.5, 1) * (red ? 0 : w);
        const braP = S.carga ? 38 + 3 * s * w : ampB * (1 - s);
        A.braco.style.transform = "rotate(" + braP.toFixed(2) + "deg)";
        A.braco2.style.transform = "rotate(" + (-ampB * (1 - s)).toFixed(2) + "deg)";
        M.cauda.alvo = (3 * Math.sin(Math.PI * 2 * p + 2.2) - 2 * vn) * w + parado * 1.5 * Math.sin(Math.PI * 2 * T / 3.3);
        M.cauda.passo(dt);
        A.cauda.style.transform = "rotate(" + M.cauda.x.toFixed(2) + "deg)";
        maos.forEach(m => { if (m.p === "andar") m.o.style.transform = "translate(" + P.andar.mao[0] + "px," + P.andar.mao[1] + "px) rotate(" + (-braP).toFixed(1) + "deg)"; });
      }

      /* antebraço da frente (parado de três quartos): abaixado; sobe para pegar, carregar e usar */
      const alvoBra = (S.carga ? 58 : 0) + parado * 1.5 * Math.sin(Math.PI * 2 * T / 4.3 + 1);
      M.bra.alvo = lerp(alvoBra, Gs.bra, clamp(Gs.braW, 0, 1));
      M.bra.passo(dt);
      ["ladoD", "ladoE"].forEach(n => {
        if (!vis(n)) return;
        const ang = -P[n].frente * M.bra.x;
        BR[n].style.transform = "rotate(" + ang.toFixed(2) + "deg)";
        maos.forEach(m => { if (m.p === n) m.o.style.transform = "translate(" + P[n].mao[0] + "px," + P[n].mao[1] + "px) rotate(" + (-ang).toFixed(1) + "deg)"; });
      });
      maos.forEach(m => { if (m.p !== "andar" && m.p !== "ladoD" && m.p !== "ladoE") m.o.style.transform = "translate(" + P[m.p].mao[0] + "px," + P[m.p].mao[1] + "px)"; });

      /* corpo inteiro */
      const sy = 1 + parado * 0.011 * resp + M.sq.x * 0.06 + Gs.sy;
      const sx = 1 + (1 - sy) * 0.5 + Gs.sx;
      const by = -sobe * K + Gs.by;
      const br = (M.corpo.x + Gs.br) * S.face;
      tudo.style.transform = "translate(0px," + by.toFixed(2) + "px) rotate(" + br.toFixed(2) + "deg) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";

      /* mistura das poses e espelhamento (caminhada e alcançar olham para um lado só) */
      for (const n in G) {
        const g = G[n];
        const op = n === S.pose ? 1 : n === S.ant ? 1 - S.mist : 0;
        if (op !== g.op) { g.op = op; g.el.style.opacity = op.toFixed(3); g.el.style.display = op > 0.001 ? "" : "none"; }
        const olha = P[n].olha;
        if (olha && vis(n)) g.esp.setAttribute("transform", olha !== S.face ? "translate(" + (2 * P[n].anc[0]) + ",0) scale(-1,1)" : "translate(0,0)");
      }
      const fecha = red ? 0 : piscadas(dt);
      palp.forEach(el => { el.style.transform = "scaleY(" + fecha.toFixed(3) + ")"; });
      const alt = Math.max(0, -Gs.by);
      sombra.setAttribute("rx", (44 * (1 - alt / 70)).toFixed(1));
      sombra.style.opacity = (1 - alt / 45).toFixed(2);
    }

    function desenhar(x, y) { gn.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")"); }

    return {
      quadro, desenhar, virar, gesto, segurar, posMao, piscar, pulso, epi,
      get face() { return S.face; },
      get virando() { return !!S.vira; },
      get ocupado() { return S.gestos.length > 0; },
      get carga() { return S.carga; },
      olhar() {},
      // pose fixa por um tempo (ex.: de costas ao entrar no elevador); null volta ao normal
      forcar(p) { S.forcada = p || null; },
      // encarar quem joga (durante as falas, por exemplo)
      encarar(on) { S.encara = !!on; }
    };
  }

  window.GG_GENINHO = geninhoPainel;
  window.GG_RIG = { criar, svg: geninhoSVG, K, MAO_MUNDO: -56 };   // a pata, esticada para pegar, alcança ~56 unidades à frente
})();
