/* GenoGame · os experimentos de cada bancada.
   Cada experimento recebe um "ctx" do genogame.js com a cena (desenho), o lado (instruções e botões)
   e ajudantes: etapa(), retorno(), continuar(), perguntar(), segurar(), loop(), fim()…
   A ciência foi simplificada, mas não inventada: temperaturas, cores, ordens e nomes são os de verdade. */
(function () {
  "use strict";
  const EXP = window.GG_EXP = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const est3 = (erros, a, b) => (erros <= a ? 3 : erros <= b ? 2 : 1);
  const ico = d => '<svg viewBox="0 0 32 32" aria-hidden="true">' + d + "</svg>";
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => [...r.querySelectorAll(s)];
  const pulo = el => { el.classList.remove("pula"); void el.getBoundingClientRect(); el.classList.add("pula"); };
  const fmt = (c, n) => new Intl.NumberFormat(c.locale).format(n);
  // segurar o ponteiro no elemento (pode falhar em alguns navegadores; não é essencial)
  const captura = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (er) {} };

  /* ===================================================================== EPI */
  const IT = {
    jaleco: '<path d="M11 5l5 4 5-4 6 4-2 6-2-1v15H9V13l-2 1-2-6z" fill="#FCFAF5" stroke="#8E3B5F" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9v19" stroke="#8E3B5F" stroke-width="1.2"/>',
    luvas: '<path d="M10 28V15c0-1.5 2.5-1.5 2.5 0V9c0-1.6 2.6-1.6 2.6 0V7.5c0-1.6 2.6-1.6 2.6 0V9c0-1.6 2.6-1.6 2.6 0v8l1.6-2.2c1-1.4 3-.4 2.2 1.2L20 24v4z" fill="#4F86F0" stroke="#2F5BEA" stroke-width="1.2" stroke-linejoin="round"/>',
    oculos: '<path d="M3 15h26" stroke="#2A3350" stroke-width="2"/><rect x="5" y="11" width="10" height="9" rx="3.5" fill="#BFE3FF" stroke="#2A3350" stroke-width="2"/><rect x="17" y="11" width="10" height="9" rx="3.5" fill="#BFE3FF" stroke="#2A3350" stroke-width="2"/>',
    sapato: '<path d="M4 23c0-6 3-11 8-11l3 4c3 2 8 2 11 4 2 1 2 3 2 5H4z" fill="#2A3350"/><rect x="4" y="24" width="24" height="3" rx="1.5" fill="#141A30"/>',
    prendedor: '<path d="M10 23c-3-9 4-16 13-15-5 2-6 6-4 10" fill="#5A4A9E"/><ellipse cx="14" cy="22" rx="5.5" ry="2.8" fill="none" stroke="#E0385A" stroke-width="2.6"/>',
    chinelo: '<ellipse cx="16" cy="17" rx="7" ry="12" fill="#FFB23F"/><path d="M11 12l5 4 5-4" stroke="#E0385A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    lanche: '<path d="M5 15c0-6 22-6 22 0z" fill="#E7B672"/><path d="M5 17h22" stroke="#5FA35A" stroke-width="3"/><path d="M6 20h20" stroke="#E0385A" stroke-width="2.4"/><rect x="5" y="22" width="22" height="4" rx="2" fill="#E7B672"/>',
    bermuda: '<path d="M7 7h18l2 18h-8l-3-10-3 10H5z" fill="#2F5BEA" stroke="#1E3FB0" stroke-width="1.2" stroke-linejoin="round"/>'
  };
  EXP.epi = {
    titulo: "epi.titulo", kicker: "epi.kicker", passos: 1,
    async jogar(c) {
      const t = c.t;
      c.passos(1, 0);
      const s = c.svg("0 0 480 400", '<ellipse cx="240" cy="388" rx="110" ry="11" fill="rgba(15,23,48,.10)"/><g id="xGn" class="gn" transform="translate(240,384) scale(2.12)">' + c.geninho() + "</g>");
      const gn = $("#xGn", s);
      c.etapa(1, 1, t("epi.p1"), t("epi.instr"));
      const ordem = ["jaleco", "luvas", "chinelo", "oculos", "lanche", "sapato", "bermuda", "prendedor"];
      const certos = { jaleco: 1, luvas: 1, oculos: 1, sapato: 1, prendedor: 1 };
      let vestidos = 0;
      const pr = c.perguntar(ordem.map(id => ({ id, rotulo: t("epi." + id), icone: ico(IT[id]), certo: !!certos[id], resp: t("epi." + id + ".r") })), {
        grade: true,
        multi: (o, erros, pronto) => {
          gn.classList.add("com-" + o.id); vestidos++;
          if (!c.rm()) pulo(gn);
          const f = 4 - vestidos;
          c.retorno("ok", o.resp + (f > 0 ? " " + t(f === 1 ? "epi.falta" : "epi.faltam", { n: f }) : ""));
          if (f <= 0) pronto();
        }
      });
      const bj = $('.gg-op[data-i="0"]', c.lado); bj.classList.add("certo"); bj.disabled = true; $(".marca", bj).textContent = "✓";
      c.retorno("info", t("epi.jaleco.r"));
      setTimeout(() => { const b = $('.gg-op[data-i="1"]', c.lado); if (b) b.focus({ preventScroll: true }); }, 80);
      const erros = await pr;
      c.registrar(est3(erros, 0, 1), "epi");   // vestido: já vale, mesmo que a pessoa feche agora
      await c.espera(c.rm() ? 200 : 1100);
      await c.fim(est3(erros, 0, 1), [t("epi.fim")], "epi");
    }
  };

  /* ===================================================================== DNA de morango */
  const morango = (x, y, k, i) => '<g class="xMor" data-x="' + x + '" data-y="' + y + '" data-k="' + k + '" transform="translate(' + x + "," + y + ") scale(" + k + ')">' +
    '<path d="M-15 -9q15 -13 30 0q0 20 -15 32q-15 -12 -15 -32z" fill="' + (i % 2 ? "#E0385A" : "#EF4A6B") + '"/><path d="M-10 -11l10 -9 10 9-10 -3z" fill="#16A34A"/>' +
    [[-7, -1], [3, -3], [8, 4], [-3, 7], [4, 12], [-8, 8]].map(([a, b]) => '<ellipse cx="' + a + '" cy="' + b + '" rx="1.1" ry="1.6" fill="#FFE7A8"/>').join("") + "</g>";
  const ING = {
    agua: '<path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="#7FB4FF"/>',
    detergente: '<rect x="10" y="9" width="12" height="19" rx="4" fill="#16A34A"/><rect x="13" y="4" width="6" height="6" rx="1" fill="#2A3350"/><rect x="12" y="15" width="8" height="6" rx="1" fill="#E6F6ED"/>',
    sal: '<path d="M10 12h12l-1 16H11z" fill="#F4F6FA" stroke="#6B7590" stroke-width="1.5"/><path d="M10 12c0-5 12-5 12 0" fill="#C9CFDC"/><circle cx="14" cy="8.5" r=".9" fill="#5A6488"/><circle cx="18" cy="8.5" r=".9" fill="#5A6488"/>',
    acucar: '<rect x="7" y="13" width="12" height="12" rx="2" fill="#F4F6FA" stroke="#6B7590" stroke-width="1.5"/><rect x="14" y="8" width="11" height="11" rx="2" fill="#F4F6FA" stroke="#6B7590" stroke-width="1.5"/>',
    oleo: '<path d="M12 10h8l2 4v14H10V14z" fill="#FFD27A" stroke="#D98A0B" stroke-width="1.4"/><rect x="13.5" y="5" width="5" height="5" fill="#D98A0B"/>'
  };
  // tubo de ensaio: x de 222 a 258, fundo arredondado em y=368
  const TUBO = "M220 196V350a20 20 0 0 0 40 0V196";
  EXP.dna = {
    titulo: "dna.titulo", kicker: "dna.kicker", passos: 5,
    async jogar(c) {
      const t = c.t;
      let erros = 0;

      /* 1. amassar */
      c.passos(5, 0);
      const sementes = Array.from({ length: 46 }, () => [rnd(150, 330), rnd(200, 334)]);
      let s = c.svg("0 0 480 400",
        '<rect x="130" y="66" width="220" height="276" rx="28" fill="rgba(200,225,255,.35)" stroke="#8C96B0" stroke-width="3"/>' +
        '<path d="M132 98h216" stroke="#E0385A" stroke-width="5"/><path d="M132 107h216" stroke="#4D7CFF" stroke-width="3"/>' +
        '<clipPath id="xSacoClip"><rect x="133" y="110" width="214" height="229" rx="24"/></clipPath>' +
        '<g clip-path="url(#xSacoClip)"><rect id="xPure" x="130" y="342" width="220" height="0" fill="#E0385A" opacity=".85"/><g id="xSem">' +
        sementes.map(([x, y]) => '<ellipse cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" rx="1.4" ry="2" fill="#FFE7A8" opacity="0"/>').join("") + "</g></g>" +
        '<g id="xMors">' + morango(196, 226, 1.9, 0) + morango(278, 240, 2.1, 1) + morango(226, 284, 1.8, 2) + morango(302, 292, 1.6, 3) + morango(172, 288, 1.5, 4) + "</g>" +
        '<circle id="xDedo" r="20" fill="rgba(123,77,224,.18)" stroke="#7B4DE0" stroke-width="2" opacity="0"/>');
      c.etapa(1, 5, t("dna.p1"), t("dna.p1.instr"), '<div class="gg-medidor"><i id="xMed"></i></div><p class="gg-nota so-teclado">' + t("dna.p1.teclado") + "</p>");
      const mors = $$(".xMor", s), pure = $("#xPure", s), sem = $$("#xSem ellipse", s), dedo = $("#xDedo", s), med = $("#xMed", c.lado);
      let prog = 0, ant = null, segura = false;
      const desenhar1 = () => {
        const p = clamp(prog / 2400, 0, 1);
        mors.forEach((m, i) => { const k = +m.dataset.k * (1 - 0.6 * p); m.setAttribute("transform", "translate(" + (+m.dataset.x + Math.sin(prog / 60 + i) * 3 * (1 - p)) + "," + (+m.dataset.y + p * 30) + ") scale(" + k + ")"); m.setAttribute("opacity", String(1 - 0.92 * p)); });
        const h = p * 140; pure.setAttribute("y", String(342 - h)); pure.setAttribute("height", String(h));
        sem.forEach(e => e.setAttribute("opacity", +e.getAttribute("cy") > 342 - h + 6 ? "1" : "0"));
        med.style.width = (p * 100).toFixed(0) + "%";
      };
      await new Promise(pronto => {
        const fim = () => { if (prog >= 2400) { prog = 2400; desenhar1(); pronto(); return true; } };
        c.on(s, "pointerdown", e => { segura = true; ant = c.ponto(s, e); captura(s, e); });
        c.on(s, "pointerup", () => { segura = false; dedo.setAttribute("opacity", "0"); });
        c.on(s, "pointercancel", () => { segura = false; });
        c.on(s, "pointermove", e => {
          if (!segura || prog >= 2400) return;
          const p = c.ponto(s, e); dedo.setAttribute("cx", p.x); dedo.setAttribute("cy", p.y); dedo.setAttribute("opacity", "1");
          if (p.x > 120 && p.x < 360 && p.y > 60 && p.y < 350) prog += Math.hypot(p.x - ant.x, p.y - ant.y);
          ant = p; desenhar1(); fim();
        });
        c.on(document, "keydown", e => { if (prog < 2400 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); prog += 170; desenhar1(); fim(); } });
      });
      dedo.setAttribute("opacity", "0");
      c.retorno("ok", t("dna.p1.ok"));
      await c.continuar();

      /* 2. solução de extração */
      c.passos(5, 1);
      s = c.svg("0 0 480 400",
        '<rect x="150" y="96" width="180" height="246" rx="26" fill="rgba(200,225,255,.35)" stroke="#8C96B0" stroke-width="3"/><path d="M152 124h176" stroke="#E0385A" stroke-width="5"/>' +
        '<clipPath id="xSaco2"><rect x="153" y="130" width="174" height="209" rx="22"/></clipPath><g clip-path="url(#xSaco2)">' +
        '<rect id="xLiq" x="150" y="300" width="180" height="42" fill="#F2A2B6" opacity=".9"/><rect x="150" y="300" width="180" height="42" fill="#E0385A" opacity=".75" id="xPure2"/>' +
        '<g id="xEspuma" opacity="0">' + [170, 196, 222, 250, 276, 304].map((x, i) => '<circle cx="' + x + '" cy="0" r="' + (7 + (i % 3) * 3) + '" fill="#fff" opacity=".85"/>').join("") + "</g></g>" +
        '<g id="xJato" opacity="0"><path d="M240 30V300" stroke="#7FB4FF" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 10" class="agua-cai"/></g><g id="xFrasco" transform="translate(222,4) scale(1.15)" opacity="0"></g>');
      c.etapa(2, 5, t("dna.p2"), t("dna.p2.instr"));
      const liq = $("#xLiq", s), jato = $("#xJato", s), frasco = $("#xFrasco", s), espuma = $("#xEspuma", s);
      let nivel = 300, certos = 0;
      const cores = { agua: "#7FB4FF", detergente: "#5FD39A", sal: "#FFFFFF", acucar: "#FFFFFF", oleo: "#FFD27A" };
      const despeja = async (id, sobe) => {
        frasco.innerHTML = ING[id]; frasco.setAttribute("opacity", "1");
        $("path", jato).setAttribute("stroke", cores[id]); $("path", jato).setAttribute("d", "M240 46V" + nivel);
        jato.setAttribute("opacity", "1");
        if (sobe) { nivel -= sobe; liq.setAttribute("y", String(nivel)); liq.setAttribute("height", String(342 - nivel)); }
        if (id === "detergente") { espuma.setAttribute("opacity", "1"); espuma.setAttribute("transform", "translate(0," + nivel + ")"); }
        else if (sobe) espuma.setAttribute("transform", "translate(0," + nivel + ")");
        await new Promise(r => setTimeout(r, c.rm() ? 50 : 650));
        jato.setAttribute("opacity", "0"); frasco.setAttribute("opacity", "0");
      };
      const lista = ["agua", "acucar", "detergente", "oleo", "sal"].map(id => ({ id, rotulo: t("dna." + id), icone: ico(ING[id]), certo: ["agua", "detergente", "sal"].includes(id), resp: t("dna." + id + ".r") }));
      erros += await c.perguntar(lista, {
        grade: true,
        multi: (o, er, pronto) => { certos++; despeja(o.id, o.id === "agua" ? 70 : 22); if (certos >= 3) setTimeout(pronto, c.rm() ? 60 : 700); },
        aoErrar: o => { frasco.innerHTML = ING[o.id]; frasco.setAttribute("opacity", "1"); setTimeout(() => frasco.setAttribute("opacity", "0"), 700); }
      });
      await c.continuar();

      /* 3. coar */
      c.passos(5, 2);
      const marca = 0.45, alto = 158;
      s = c.svg("0 0 480 400",
        '<g transform="rotate(-28 150 70)"><rect x="70" y="20" width="150" height="110" rx="22" fill="rgba(200,225,255,.35)" stroke="#8C96B0" stroke-width="3"/><rect x="73" y="86" width="144" height="41" rx="18" fill="#EB7C97"/></g>' +
        '<path d="M190 120h100l-40 56v20h-20v-20z" fill="rgba(200,225,255,.25)" stroke="#8C96B0" stroke-width="3" stroke-linejoin="round"/><path d="M198 124h84l-34 46h-16z" fill="#FFFDF5" stroke="#E6DFC8" stroke-width="2"/>' +
        '<path id="xRasto" d="M231 92q30 10 9 40" stroke="#EB7C97" stroke-width="0" fill="none" stroke-linecap="round"/>' +
        '<path id="xGota" d="M240 200V200" stroke="#F2A2B6" stroke-width="5" stroke-linecap="round"/>' +
        '<clipPath id="xTuboC"><path d="' + TUBO + 'z"/></clipPath><g clip-path="url(#xTuboC)"><rect id="xNivel" x="210" y="370" width="60" height="0" fill="#F2A2B6"/></g>' +
        '<path d="' + TUBO + '" fill="none" stroke="#8C96B0" stroke-width="3.5"/>' +
        '<path d="M206 ' + (370 - marca * alto) + 'h12M262 ' + (370 - marca * alto) + 'h12" stroke="#7B4DE0" stroke-width="3.5" stroke-linecap="round"/><path d="M276 ' + (370 - marca * alto) + 'l10 -6v12z" fill="#7B4DE0"/>');
      const et3 = c.etapa(3, 5, t("dna.p3"), t("dna.p3.instr"));
      const nivelEl = $("#xNivel", s), gota = $("#xGota", s), rasto = $("#xRasto", s);
      const bt = c.botao(c.esc(t("dna.p3.bt")), "violeta gg-segurar");
      let segurando = false, fluxo = 0, cheio = 0, avaliado = true, terminou = false;
      c.segurar(bt, on => { segurando = on; if (on) avaliado = false; });
      await new Promise(pronto => {
        c.loop(dt => {
          fluxo = segurando ? Math.min(1, fluxo + dt * 6) : Math.max(0, fluxo - dt * 2.6);
          cheio = Math.min(0.97, cheio + fluxo * 0.16 * dt);
          const y = 370 - cheio * alto;
          nivelEl.setAttribute("y", y.toFixed(1)); nivelEl.setAttribute("height", (cheio * alto).toFixed(1));
          gota.setAttribute("d", "M240 198V" + (fluxo > 0.03 ? y.toFixed(0) : "198")); gota.setAttribute("opacity", String(fluxo));
          rasto.setAttribute("stroke-width", String(fluxo * 6));
          if (cheio >= 0.97) segurando = false;
          if (!segurando && fluxo === 0 && !avaliado) {
            avaliado = true;
            if (cheio < marca - 0.06) c.retorno("info", t("dna.p3.pouco"));
            else { terminou = true; if (cheio > marca + 0.13) { erros++; c.retorno("erro", t("dna.p3.muito")); } else c.retorno("ok", t("dna.p3.ok")); pronto(); return false; }
          }
        });
      });
      bt.remove();
      await c.continuar();

      /* 4. álcool gelado */
      c.passos(5, 3);
      const nivelVermelho = 370 - cheio * alto;
      s = c.svg("0 0 480 400",
        '<g transform="translate(206,150) rotate(125)"><rect x="-9" y="-2" width="18" height="20" rx="3" fill="#8C96B0"/><rect x="-26" y="16" width="52" height="100" rx="12" fill="#E6F2FF" stroke="#8C96B0" stroke-width="2.5"/>' +
        '<rect x="-20" y="50" width="40" height="60" rx="8" fill="#BFE3FF" opacity=".75"/><path d="M-20 44h40" stroke="#7FB4FF" stroke-width="4"/></g>' +
        '<path id="xFio" d="M206 150Q222 160 224 200" stroke="#BFE3FF" stroke-width="0" fill="none" stroke-linecap="round"/>' +
        '<clipPath id="xTuboD"><path d="' + TUBO + 'z"/></clipPath><g clip-path="url(#xTuboD)">' +
        '<rect x="210" y="' + nivelVermelho + '" width="60" height="' + (372 - nivelVermelho) + '" fill="#F2A2B6"/>' +
        '<rect id="xAlc" x="210" y="' + nivelVermelho + '" width="60" height="0" fill="#CFE6FF" opacity=".85"/><rect id="xMist" x="210" y="' + (nivelVermelho - 30) + '" width="60" height="40" fill="#F6C6D3" opacity="0"/>' +
        '<g id="xNuvem" opacity="0">' + [0, 1, 2, 3, 4].map(i => '<path d="M' + (224 + i * 3) + " " + (nivelVermelho - 2 - i * 3) + "q6 -8 12 0t12 0" + '" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>').join("") + "</g></g>" +
        '<path d="' + TUBO + '" fill="none" stroke="#8C96B0" stroke-width="3.5"/>' +
        '<g transform="translate(392,118)"><path d="M-62 0a62 62 0 0 1 124 0" fill="none" stroke="rgba(127,127,127,.25)" stroke-width="14"/>' +
        '<path d="' + arco(62, 0.15, 0.55) + '" fill="none" stroke="#14864A" stroke-width="14"/><path d="' + arco(62, 0.55, 1) + '" fill="none" stroke="#E0385A" stroke-width="14"/>' +
        '<g id="xAgulha"><path d="M0 0L-52 0" stroke="currentColor" style="stroke:var(--ink)" stroke-width="4" stroke-linecap="round"/></g><circle r="7" style="fill:var(--ink)"/>' +
        '<text x="-38" y="24" text-anchor="middle" font-size="13" fill="#14864A">' + c.esc(t("dna.p4.devagar")) + '</text><text x="44" y="24" text-anchor="middle" font-size="13" fill="#E0385A">' + c.esc(t("dna.p4.rapidoRot")) + "</text></g>");
      c.etapa(4, 5, t("dna.p4"), t("dna.p4.instr"), '<div class="gg-medidor"><i id="xMed4"></i></div>');
      const alc = $("#xAlc", s), mist = $("#xMist", s), nuvem = $("#xNuvem", s), agulha = $("#xAgulha", s), fio = $("#xFio", s), med4 = $("#xMed4", c.lado);
      const bt4 = c.botao(c.esc(t("dna.p4.bt")), "violeta gg-segurar");
      let seg4 = false, vazao = 0, vol = 0, turb = 0, avisou = false;
      c.segurar(bt4, on => { seg4 = on; });
      await new Promise(pronto => {
        c.loop(dt => {
          vazao = clamp(vazao + (seg4 ? 75 : -95) * dt, 0, 100);
          vol = Math.min(100, vol + vazao * dt * 0.55);
          if (vazao > 55) { turb += dt; if (!avisou) { avisou = true; c.retorno("erro", t("dna.p4.rapido")); } }
          else if (avisou && vazao < 50) { avisou = false; c.retorno("", ""); }
          agulha.setAttribute("transform", "rotate(" + (vazao * 1.8).toFixed(1) + ")");
          const h = vol * 0.5; alc.setAttribute("y", (nivelVermelho - h).toFixed(1)); alc.setAttribute("height", h.toFixed(1));
          fio.setAttribute("stroke-width", (vazao / 100 * 7).toFixed(1)); fio.setAttribute("d", "M206 150Q222 160 224 200L224 " + Math.max(200, nivelVermelho - h).toFixed(0));
          nuvem.setAttribute("opacity", (vol / 100 * (turb > 0.9 ? 0.6 : 1)).toFixed(2)); nuvem.setAttribute("transform", "translate(0," + (-h * 0.15).toFixed(1) + ")");
          mist.setAttribute("opacity", turb > 0.9 ? "0.7" : "0");
          med4.style.width = vol.toFixed(0) + "%";
          if (vol >= 100) { pronto(); return false; }
        });
      });
      bt4.remove(); fio.setAttribute("stroke-width", "0"); agulha.setAttribute("transform", "rotate(0)");
      if (turb > 0.9) { erros++; c.retorno("erro", t("dna.p4.misturou")); } else c.retorno("ok", t("dna.p4.ok"));
      await c.continuar();

      /* 5. enrolar */
      c.passos(5, 4);
      s = c.svg("0 0 480 400",
        '<clipPath id="xTuboE"><path d="M200 90V330a40 40 0 0 0 80 0V90z"/></clipPath><g clip-path="url(#xTuboE)">' +
        '<rect x="196" y="282" width="88" height="96" fill="#F2A2B6"/><rect x="196" y="160" width="88" height="122" fill="#CFE6FF" opacity=".85"/>' +
        '<g id="xNuv5">' + Array.from({ length: 9 }, (_, i) => '<path d="M' + (204 + (i % 3) * 22) + " " + (262 + Math.floor(i / 3) * 8) + "q7 -10 14 0t14 0" + '" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".95"/>').join("") +
        '<ellipse cx="240" cy="276" rx="34" ry="12" fill="#fff" opacity=".55"/></g></g>' +
        '<path d="M200 90V330a40 40 0 0 0 80 0V90" fill="none" stroke="#8C96B0" stroke-width="3.5"/>' +
        '<g id="xPalito"><path id="xFioDNA" d="M240 268V268" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".95"/><rect x="235" y="30" width="10" height="240" rx="4" fill="#D6A86A"/><g id="xListras" clip-path="url(#xPalC)"></g>' +
        '<clipPath id="xPalC"><rect x="235" y="30" width="10" height="240" rx="4"/></clipPath><ellipse id="xBolo" cx="240" cy="262" rx="5" ry="6" fill="#fff" stroke="#E6E9F0"/></g>' +
        '<circle id="xGiro" cx="240" cy="262" r="70" fill="none" stroke="#7B4DE0" stroke-width="2" stroke-dasharray="6 9" opacity="0"/>');
      c.etapa(5, 5, t("dna.p5"), t("dna.p5.instr"), '<div class="gg-medidor"><i id="xMed5"></i></div><p class="gg-nota so-teclado">' + t("dna.p5.teclado") + "</p>");
      const listras = $("#xListras", s), bolo = $("#xBolo", s), nuv5 = $("#xNuv5", s), med5 = $("#xMed5", c.lado), giro = $("#xGiro", s);
      const META = Math.PI * 6;
      let ang = 0, a0 = null, seg5 = false;
      const desenhar5 = () => {
        const p = clamp(ang / META, 0, 1);
        let l = ""; for (let i = -2; i < 26; i++) { const y = 30 + i * 12 + ((ang * 8) % 12); l += '<path d="M233 ' + y.toFixed(1) + 'l14 -6" stroke="#B9874A" stroke-width="2.5"/>'; }
        listras.innerHTML = l;
        bolo.setAttribute("rx", (5 + p * 13).toFixed(1)); bolo.setAttribute("ry", (6 + p * 9).toFixed(1));
        nuv5.setAttribute("opacity", (1 - p * 0.85).toFixed(2));
        nuv5.setAttribute("transform", "rotate(" + (ang * 20).toFixed(0) + " 240 270) scale(1," + (1 - p * 0.3).toFixed(2) + ")");
        med5.style.width = (p * 100).toFixed(0) + "%";
      };
      desenhar5();
      await new Promise(pronto => {
        const ver = () => { if (ang >= META) { ang = META; desenhar5(); pronto(); return true; } };
        c.on(s, "pointerdown", e => { seg5 = true; const p = c.ponto(s, e); a0 = Math.atan2(p.y - 262, p.x - 240); captura(s, e); giro.setAttribute("opacity", ".6"); });
        c.on(s, "pointerup", () => { seg5 = false; giro.setAttribute("opacity", "0"); });
        c.on(s, "pointercancel", () => { seg5 = false; });
        c.on(s, "pointermove", e => {
          if (!seg5 || ang >= META) return;
          const p = c.ponto(s, e); if (Math.hypot(p.x - 240, p.y - 262) < 14) return;
          const a = Math.atan2(p.y - 262, p.x - 240); let d = a - a0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
          ang += Math.abs(d); a0 = a; desenhar5(); ver();
        });
        c.on(document, "keydown", e => { if (ang < META && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); ang += 0.7; desenhar5(); ver(); } });
      });
      giro.setAttribute("opacity", "0");
      // puxa o palito: aparece o fio branco de DNA
      const pal = $("#xPalito", s), fioDNA = $("#xFioDNA", s);
      await new Promise(r => {
        if (c.rm()) { pal.setAttribute("transform", "translate(0,-110)"); fioDNA.setAttribute("d", "M240 268V378"); return r(); }
        const t0 = performance.now();
        c.loop((dt, agora) => { const k = clamp((agora - t0) / 1300, 0, 1), e = 1 - Math.pow(1 - k, 3); pal.setAttribute("transform", "translate(0," + (-110 * e).toFixed(1) + ")"); fioDNA.setAttribute("d", "M240 262V" + (262 + 110 * e * 0.9).toFixed(0)); if (k >= 1) { r(); return false; } });
      });
      await c.espera(300);
      await c.fim(est3(erros, 0, 2), [t("dna.fim1"), t("dna.fim2"), t("dna.fim3")], "dna");
    }
  };
  // arco do medidor (de 0 = esquerda a 1 = direita)
  function arco(r, a, b) {
    const p = f => { return [(-Math.cos(Math.PI * f) * r).toFixed(1), (-Math.sin(Math.PI * f) * r).toFixed(1)]; };
    const [x1, y1] = p(a), [x2, y2] = p(b);
    return "M" + x1 + " " + y1 + "A" + r + " " + r + " 0 0 1 " + x2 + " " + y2;
  }

  /* ===================================================================== PCR */
  EXP.pcr = {
    titulo: "pcr.titulo", kicker: "pcr.kicker", passos: 3,
    async jogar(c) {
      const t = c.t;
      // desnaturação ~98 °C (95–98), anelamento dos iniciadores ~55 °C (depende de cada iniciador), extensão 72 °C
      const FASES = [{ lo: 94, hi: 100, alvo: 98, cor: "#FF5470" }, { lo: 50, hi: 62, alvo: 55, cor: "#4D7CFF" }, { lo: 68, hi: 76, alvo: 72, cor: "#FFB23F" }];
      const X0 = 60, X1 = 448, Y0 = 34, Y1 = 192, larg = (X1 - X0) / 3;
      const yT = T => Y1 - (clamp(T, 20, 100) - 20) / 80 * (Y1 - Y0);
      const s = c.svg("0 0 480 400",
        '<rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0) + '" rx="8" fill="rgba(127,127,127,.06)" stroke="rgba(127,127,127,.25)"/>' +
        '<g id="xEixo">' + [40, 60, 80, 100].map(T => '<path d="M' + X0 + " " + yT(T) + "H" + X1 + '" stroke="rgba(127,127,127,.2)" stroke-dasharray="3 5"/><text x="' + (X0 - 8) + '" y="' + (yT(T) + 4) + '" text-anchor="end" font-size="12" style="fill:var(--muted)">' + T + "°</text>").join("") + "</g>" +
        '<g id="xFaixas">' + FASES.map((f, i) => '<rect x="' + (X0 + i * larg + 3) + '" y="' + yT(f.hi) + '" width="' + (larg - 6) + '" height="' + (yT(f.lo) - yT(f.hi)) + '" rx="5" fill="' + f.cor + '" fill-opacity=".2" stroke="' + f.cor + '" stroke-dasharray="5 4"/>' +
          '<text x="' + (X0 + i * larg + larg / 2) + '" y="' + (Y1 + 20) + '" text-anchor="middle" font-size="13.5" fill="' + f.cor + '">' + f.alvo + " °C</text>").join("") + "</g>" +
        '<polyline id="xTraco" fill="none" stroke="#7B4DE0" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points=""/>' +
        '<line id="xCab" x1="' + X0 + '" x2="' + X0 + '" y1="' + Y0 + '" y2="' + Y1 + '" style="stroke:var(--ink)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0"/>' +
        '<g id="xAlca"><path d="M' + (X1 + 5) + ' 0l13 -9v18z" fill="#7B4DE0"/></g><circle id="xPonto" r="5.5" fill="#7B4DE0"/>' +
        '<text id="xTemp" x="' + X1 + '" y="' + (Y0 - 11) + '" text-anchor="end" font-size="15" style="fill:var(--ink)">25 °C</text><text id="xCiclo" x="' + X0 + '" y="' + (Y0 - 11) + '" font-size="13" style="fill:var(--muted)"></text>' +
        '<g id="xMol"><rect id="xFA" x="110" y="282" width="260" height="11" rx="5.5" fill="#4D7CFF"/><rect id="xFB" x="110" y="302" width="260" height="11" rx="5.5" fill="#FF5470"/>' +
        '<rect id="xNA" x="330" y="296" width="0" height="9" rx="4.5" fill="#A58CFF"/><rect id="xNB" x="110" y="290" width="0" height="9" rx="4.5" fill="#A58CFF"/>' +
        '<rect id="xPA" x="480" y="296" width="40" height="9" rx="4.5" fill="#14864A" opacity="0"/><rect id="xPB" x="-40" y="290" width="40" height="9" rx="4.5" fill="#14864A" opacity="0"/>' +
        '<circle id="xPolA" r="9" fill="#FFB23F" opacity="0"/><circle id="xPolB" r="9" fill="#FFB23F" opacity="0"/></g>' +
        '<text id="xCop" x="240" y="386" text-anchor="middle" font-size="17" style="fill:var(--ink)">1 ' + c.esc(t("pcr.copias")) + "</text>" +
        '<g id="xCurva" opacity="0"></g>');
      const el = id => $("#" + id, s);
      const traco = el("xTraco"), cab = el("xCab"), alca = el("xAlca"), ponto = el("xPonto"), tTxt = el("xTemp"), cTxt = el("xCiclo"), cop = el("xCop");
      const FA = el("xFA"), FB = el("xFB"), NA = el("xNA"), NB = el("xNB"), PA = el("xPA"), PB = el("xPB"), polA = el("xPolA"), polB = el("xPolB");
      let T = 25, S = 25, sep = 0, pri = 0, ext = 0;
      function mol() {
        const yA = 282 - 34 * sep, yB = 302 + 34 * sep;
        FA.setAttribute("y", yA); FB.setAttribute("y", yB);
        PA.setAttribute("x", (480 - 150 * pri).toFixed(1)); PA.setAttribute("y", yA + 15); PA.setAttribute("opacity", pri > 0 ? "1" : "0");
        PB.setAttribute("x", (-40 + 150 * pri).toFixed(1)); PB.setAttribute("y", yB - 13); PB.setAttribute("opacity", pri > 0 ? "1" : "0");
        const w = 220 * ext;
        NA.setAttribute("x", (330 - w).toFixed(1)); NA.setAttribute("width", w.toFixed(1)); NA.setAttribute("y", yA + 15);
        NB.setAttribute("x", 150); NB.setAttribute("width", w.toFixed(1)); NB.setAttribute("y", yB - 13);
        polA.setAttribute("cx", (330 - w).toFixed(1)); polA.setAttribute("cy", yA + 19.5); polB.setAttribute("cx", (150 + w).toFixed(1)); polB.setAttribute("cy", yB - 8.5);
        const pol = ext > 0 && ext < 1 ? "1" : "0"; polA.setAttribute("opacity", pol); polB.setAttribute("opacity", pol);
      }
      function termo() {
        tTxt.textContent = Math.round(T) + " °C";
        alca.setAttribute("transform", "translate(0," + yT(S).toFixed(1) + ")");
      }
      mol(); termo();

      /* 1. os 3 passos */
      c.passos(3, 0);
      c.etapa(1, 3, t("pcr.p1"), t("pcr.p1.instr"),
        '<ol class="gg-lista-fases">' + [1, 2, 3].map(i => '<li style="--c:' + FASES[i - 1].cor + '"><b>' + c.esc(t("pcr.f" + i)) + " · " + FASES[i - 1].alvo + " °C</b><span>" + t("pcr.f" + i + ".r") + "</span></li>").join("") + "</ol>");
      await c.continuar(t("ui.comecarBt"));

      /* 2. três ciclos controlados por quem joga */
      c.passos(3, 1);
      c.etapa(2, 3, t("pcr.p2"), t("pcr.p2.instr"), '<div class="gg-pcr-agora" id="xAgora"></div><div class="gg-teclas" id="xTeclas"></div><p class="gg-nota so-teclado">' + t("pcr.p2.teclado") + "</p>");
      const teclas = $("#xTeclas", c.lado), agoraEl = $("#xAgora", c.lado);
      teclas.className = "gg-temps";
      teclas.innerHTML = [[98, 0], [55, 1], [72, 2]].map(([T, i]) => '<button type="button" class="btn gg-temp" data-t="' + T + '" style="--c:' + FASES[i].cor + '">' + T + " °C</button>").join("");
      let sobe = false, desce = false, arrasta = false;
      const escolhe = T => { S = T; $$(".gg-temp", c.lado).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.t === T))); };
      $$(".gg-temp", c.lado).forEach(b => c.on(b, "click", () => escolhe(+b.dataset.t)));
      c.on(document, "keydown", e => {
        if (e.key === "9") escolhe(98); if (e.key === "5") escolhe(55); if (e.key === "7") escolhe(72);
        if (e.key === "ArrowUp") { sobe = true; e.preventDefault(); } if (e.key === "ArrowDown") { desce = true; e.preventDefault(); }
      });
      c.on(document, "keyup", e => { if (e.key === "ArrowUp") sobe = false; if (e.key === "ArrowDown") desce = false; });
      const ajusta = e => { const p = c.ponto(s, e); if (p.y < Y0 - 30 || p.y > Y1 + 30) return; S = clamp(20 + (Y1 - p.y) / (Y1 - Y0) * 80, 20, 100); };
      c.on(s, "pointerdown", e => { arrasta = true; captura(s, e); ajusta(e); });
      c.on(s, "pointermove", e => { if (arrasta) ajusta(e); });
      c.on(s, "pointerup", () => { arrasta = false; }); c.on(s, "pointercancel", () => { arrasta = false; });
      const DUR = [3.2, 2.9, 2.9];
      let ciclo = 0, fase = -1, tf = 0, dentro = 0, somaT = 0, acertos = 0, copias = 1, okCiclo = true, pts = [];
      const mostraFase = () => {
        const i = fase < 0 ? 0 : fase, f = FASES[i];
        agoraEl.style.setProperty("--c", f.cor);
        agoraEl.innerHTML = "<b>" + c.esc(t("pcr.f" + (i + 1))) + " · " + f.alvo + " °C</b><span>" + t("pcr.f" + (i + 1) + ".r") + "</span>";
        cTxt.textContent = t("pcr.ciclo", { n: ciclo + 1 });
      };
      mostraFase();
      await new Promise(pronto => {
        c.loop(dt => {
          S = clamp(S + ((sobe ? 1 : 0) - (desce ? 1 : 0)) * 48 * dt, 20, 100);
          T += clamp((S - T) * 3.4, -40, 40) * dt;
          termo();
          if (fase < 0) {
            ponto.setAttribute("cx", X0); ponto.setAttribute("cy", yT(T).toFixed(1));
            if (T >= FASES[0].lo) { fase = 0; tf = 0; dentro = 0; somaT = 0; pts = []; cab.setAttribute("opacity", "1"); }
            return;
          }
          const f = FASES[fase], dur = DUR[fase];
          tf += dt; somaT += T * dt;
          const na = T >= f.lo && T <= f.hi; if (na) dentro += dt;
          if (okCiclo && na) {
            if (fase === 0) sep = Math.min(1, sep + dt * 1.3);
            if (fase === 1 && sep > 0.9) pri = Math.min(1, pri + dt * 1.3);
            if (fase === 2 && pri > 0.9) ext = Math.min(1, ext + dt * 0.62);
            mol();
          }
          const x = X0 + fase * larg + Math.min(1, tf / dur) * larg;
          pts.push(x.toFixed(1) + "," + yT(T).toFixed(1)); traco.setAttribute("points", pts.join(" "));
          cab.setAttribute("x1", x); cab.setAttribute("x2", x); ponto.setAttribute("cx", x); ponto.setAttribute("cy", yT(T).toFixed(1));
          if (tf < dur) return;
          // fim da fase: deu certo se ficou tempo suficiente na faixa
          if (dentro / dur >= 0.38) {
            acertos++;
            if (okCiclo) { if (fase === 0) sep = 1; if (fase === 1) pri = 1; if (fase === 2) ext = 1; mol(); c.retorno("ok", t("pcr.ok.f" + (fase + 1))); }
          } else {
            const media = somaT / dur, lado = media > f.hi ? "quente" : "frio";
            c.retorno("erro", t("pcr.erro.f" + (fase + 1) + "." + lado) + (okCiclo ? " " + t("pcr.semCopia") : ""));
            okCiclo = false;
          }
          fase++; tf = 0; dentro = 0; somaT = 0;
          if (fase < 3) { mostraFase(); return; }
          // fim do ciclo
          if (okCiclo) { copias *= 2; cop.textContent = fmt(c, copias) + " " + t("pcr.copias"); if (!c.rm()) cop.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 400, easing: "ease-out" }); }
          ciclo++;
          if (ciclo >= 3) { cab.setAttribute("opacity", "0"); pronto(); return false; }
          fase = 0; okCiclo = true; sep = pri = ext = 0; pts = []; mol(); mostraFase();
        });
      });

      /* 3. mais 27 ciclos, sozinho */
      c.passos(3, 2);
      c.etapa(3, 3, t("pcr.p3"), t("pcr.p3.instr"));
      const k = Math.log2(copias), final = Math.pow(2, k + 27);
      await c.continuar(t("pcr.acelerar"));
      const curva = el("xCurva");
      el("xFaixas").setAttribute("opacity", "0"); el("xEixo").setAttribute("opacity", "0"); traco.setAttribute("points", ""); ponto.setAttribute("opacity", "0"); alca.setAttribute("opacity", "0"); tTxt.textContent = "";
      cTxt.textContent = "";
      el("xMol").setAttribute("opacity", ".25");
      curva.setAttribute("opacity", "1");
      curva.innerHTML = '<text x="' + X0 + '" y="' + (Y1 + 20) + '" font-size="12" style="fill:var(--muted)">0</text><text x="' + X1 + '" y="' + (Y1 + 20) + '" text-anchor="end" font-size="12" style="fill:var(--muted)">30</text>' +
        '<polyline id="xAmp" fill="none" stroke="#7B4DE0" stroke-width="3.5" stroke-linejoin="round" points=""/><text id="xNum" x="240" y="120" text-anchor="middle" font-size="30" font-family="Unbounded,system-ui" style="fill:var(--ink)"></text>';
      const amp = $("#xAmp", curva), num = $("#xNum", curva);
      await new Promise(r => {
        const t0 = performance.now(), D = c.rm() ? 1 : 3200;
        c.loop((dt, agora) => {
          const q = clamp((agora - t0) / D, 0, 1), n = q * 30;
          const p = []; for (let i = 0; i <= n; i += 0.25) { const v = Math.pow(2, i - 30); p.push((X0 + i / 30 * (X1 - X0)).toFixed(1) + "," + (Y1 - v * (Y1 - Y0)).toFixed(1)); }
          amp.setAttribute("points", p.join(" "));
          const atual = q < 0.1 ? copias : Math.round(Math.pow(2, k + 27 * q));
          num.textContent = fmt(c, Math.max(copias, atual));
          cTxt.textContent = Math.max(3, Math.round(n)) + " / 30";
          if (q >= 1) { num.textContent = fmt(c, final); r(); return false; }
        });
      });
      cop.textContent = fmt(c, final) + " " + t("pcr.copias");
      await c.espera(400);
      await c.fim(acertos >= 9 ? 3 : acertos >= 6 ? 2 : 1, [t("pcr.fim1", { x: fmt(c, final) }), t("pcr.fim2")], "pcr");
    }
  };

  /* ===================================================================== gel */
  EXP.gel = {
    titulo: "gel.titulo", kicker: "gel.kicker", passos: 4,
    async jogar(c) {
      const t = c.t;
      let erros = 0;
      const LANES = [150, 240, 330], WY = 80, GY0 = 89, GY1 = 340;
      const nomes = ["gel.marcador", "gel.amostra", "gel.controle"];
      const s = c.svg("0 0 480 400",
        '<g id="xBase"><rect x="56" y="34" width="368" height="340" rx="14" fill="#DCEBFF" stroke="#9DB6E8" stroke-width="2.5"/>' +
        '<path d="M72 48H408M72 360H408" stroke="#9AA3BA" stroke-width="2.5"/>' +
        '<rect id="xGel" x="100" y="62" width="280" height="282" rx="6" fill="rgba(255,255,255,.7)" stroke="#B8C6E8" stroke-width="2"/>' +
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => '<path d="M384 ' + (GY0 + i * (GY1 - GY0) / 10).toFixed(1) + 'h' + (i % 5 === 0 ? 10 : 6) + '" stroke="#8FA3D6" stroke-width="1.6"/>').join("") +
        LANES.map((x, i) => '<text x="' + x + '" y="24" text-anchor="middle" font-size="12.5" style="fill:var(--ink2)">' + c.esc(t(nomes[i])) + '</text><rect x="' + (x - 22) + '" y="' + WY + '" width="44" height="9" rx="2" fill="#C9D6F2" stroke="#8FA3D6"/>' +
          '<rect class="xPoco" x="' + (x - 21) + '" y="' + (WY + 1) + '" width="42" height="7" rx="2" fill="#4450D0" opacity="0"/><rect class="xFrente" x="' + (x - 20) + '" y="' + GY0 + '" width="40" height="6" rx="2" fill="#4450D0" opacity="0"/>').join("") +
        '<circle id="xTerm1" cx="70" cy="48" r="9" fill="#9AA3BA"/><circle id="xTerm2" cx="70" cy="360" r="9" fill="#9AA3BA"/><g id="xCabos"></g><g id="xBolhas"></g><g id="xManchas"></g>' +
        '<rect id="xAlvo" x="0" y="' + (WY - 4) + '" width="52" height="17" rx="5" fill="none" stroke="#FFB23F" stroke-width="3" opacity="0"/></g>' +
        '<g id="xPip" opacity="0"><rect x="-9" y="-64" width="18" height="66" rx="6" fill="#fff" stroke="#8C96B0" stroke-width="2"/><rect x="-6" y="-80" width="12" height="18" rx="4" fill="#E0385A"/><path d="M-5 2h10l-3 26h-4z" fill="#F5F7FF" stroke="#8C96B0" stroke-width="1.5"/><circle id="xGotaP" cx="0" cy="30" r="0" fill="#4450D0"/></g>' +
        '<g id="xUV" opacity="0"></g>');
      const pocos = $$(".xPoco", s), frentes = $$(".xFrente", s), alvo = $("#xAlvo", s), pip = $("#xPip", s), gotaP = $("#xGotaP", s);

      /* 1. carregar */
      c.passos(4, 0);
      c.etapa(1, 4, t("gel.p1"), c.tt("gel.p1.instr"));
      const btSolta = c.botao(c.esc(t("gel.soltar")), "violeta");
      pip.setAttribute("opacity", "1");
      for (let i = 0; i < 3; i++) {
        alvo.setAttribute("x", LANES[i] - 26); alvo.setAttribute("opacity", "1");
        let fase = rnd(0, 6), px = 240, w = 1.7 + i * 0.45;
        while (true) {
          let soltou = false;
          const solta = () => { soltou = true; };
          const onKey = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); solta(); } };
          const onTap = e => { if (e.target.closest("button")) return; solta(); };
          btSolta.onclick = solta;
          c.on(document, "keydown", onKey); c.on(s, "pointerdown", onTap);
          await new Promise(r => {
            c.loop(dt => {
              fase += dt * w; px = 240 + 140 * Math.sin(fase);
              pip.setAttribute("transform", "translate(" + px.toFixed(1) + "," + (WY - 30) + ")");
              alvo.setAttribute("stroke-opacity", (0.55 + 0.45 * Math.sin(performance.now() / 160)).toFixed(2));
              if (soltou) { r(); return false; }
            });
          });
          document.removeEventListener("keydown", onKey); s.removeEventListener("pointerdown", onTap);
          if (!c.vivo) return;
          const d = Math.abs(px - LANES[i]);
          gotaP.setAttribute("r", "5");
          await c.espera(c.rm() ? 30 : 220); gotaP.setAttribute("r", "0");
          if (d <= 21) { pocos[i].setAttribute("opacity", "1"); c.retorno("ok", t("gel.p1.certo")); break; }
          erros++;
          $("#xManchas", s).insertAdjacentHTML("beforeend", '<ellipse cx="' + px.toFixed(0) + '" cy="' + (WY + 4) + '" rx="10" ry="4" fill="#4450D0" opacity=".35"/>');
          c.retorno("erro", t("gel.p1.errou"));
        }
      }
      btSolta.remove(); pip.setAttribute("opacity", "0"); alvo.setAttribute("opacity", "0");
      c.retorno("ok", t("gel.p1.ok"));
      await c.continuar();

      /* 2. ligar os fios */
      c.passos(4, 1);
      c.etapa(2, 4, t("gel.p2"), t("gel.p2.instr"));
      const t1 = $("#xTerm1", s), t2 = $("#xTerm2", s);
      const pisca = c.loop(() => { const o = (0.55 + 0.45 * Math.sin(performance.now() / 180)).toFixed(2); t1.setAttribute("opacity", o); t2.setAttribute("opacity", o); });
      [t1, t2].forEach((tm, i) => { tm.style.cursor = "pointer"; tm.setAttribute("r", "13"); });
      let certoPolo = false;
      while (!certoPolo) {
        const escolha = await new Promise(r => {
          const caixa = document.createElement("div"); caixa.className = "gg-perguntas";
          caixa.innerHTML = '<button type="button" class="gg-op" data-p="1"><span>' + c.esc(t("gel.pertoPocos")) + '</span></button><button type="button" class="gg-op" data-p="2"><span>' + c.esc(t("gel.outroLado")) + "</span></button>";
          $(".gg-acoes", c.lado).innerHTML = ""; $(".gg-acoes", c.lado).appendChild(caixa);
          caixa.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) r(+b.dataset.p); });
          t1.onclick = () => r(1); t2.onclick = () => r(2);
          setTimeout(() => caixa.querySelector("button").focus({ preventScroll: true }), 50);
        });
        if (!c.vivo) return;
        $(".gg-acoes", c.lado).innerHTML = "";
        const ligar = vermelhoEmCima => {
          const yR = vermelhoEmCima ? 48 : 360, yP = vermelhoEmCima ? 360 : 48;
          $("#xCabos", s).innerHTML = '<path d="M0 ' + (yR + 30) + "Q30 " + yR + " 61 " + yR + '" stroke="#E0385A" stroke-width="5" fill="none"/><path d="M0 ' + (yP - 30) + "Q30 " + yP + " 61 " + yP + '" stroke="#2A3350" stroke-width="5" fill="none"/>';
          t1.setAttribute("fill", vermelhoEmCima ? "#E0385A" : "#2A3350"); t2.setAttribute("fill", vermelhoEmCima ? "#2A3350" : "#E0385A");
        };
        if (escolha === 1) {
          erros++; ligar(true);
          // o corante sobe e sai do gel
          await new Promise(r => {
            const t0 = performance.now();
            c.loop((dt, agora) => {
              const k = clamp((agora - t0) / (c.rm() ? 1 : 900), 0, 1);
              pocos.forEach(p => { p.setAttribute("transform", "translate(0," + (-40 * k).toFixed(1) + ")"); p.setAttribute("opacity", (1 - k).toFixed(2)); });
              if (k >= 1) { r(); return false; }
            });
          });
          c.retorno("erro", t("gel.p2.errou"));
          await c.continuar(t("ui.tentarDeNovo"));
          pocos.forEach(p => { p.setAttribute("transform", ""); p.setAttribute("opacity", "1"); });
          $("#xCabos", s).innerHTML = ""; t1.setAttribute("fill", "#9AA3BA"); t2.setAttribute("fill", "#9AA3BA");
          c.retorno("", "");
        } else { certoPolo = true; ligar(false); }
      }
      pisca(); t1.setAttribute("opacity", "1"); t2.setAttribute("opacity", "1"); t1.onclick = t2.onclick = null; t1.style.cursor = t2.style.cursor = "";
      $("#xBolhas", s).innerHTML = [90, 140, 200, 260, 320, 380].map((x, i) => '<g transform="translate(' + x + ',360)"><circle class="bolha' + (i % 3 === 1 ? " b" : i % 3 === 2 ? " c" : "") + '" r="2.4" fill="#fff"/></g><g transform="translate(' + (x + 14) + ',48)"><circle class="bolha' + (i % 3 === 2 ? " b" : "") + '" r="2" fill="#fff"/></g>').join("");
      c.retorno("ok", t("gel.p2.ok"));
      await c.continuar();

      /* 3. correr */
      c.passos(4, 2);
      c.etapa(3, 4, t("gel.p3"), t("gel.p3.instr"));
      const btDesl = c.botao(c.esc(t("gel.desligar")), "");
      let frente = GY0, parar = false;
      btDesl.onclick = () => { parar = true; };
      const onKey3 = e => { if (e.key === " ") { e.preventDefault(); parar = true; } };
      c.on(document, "keydown", onKey3);
      frentes.forEach(f => f.setAttribute("opacity", ".9"));
      setTimeout(() => btDesl.focus({ preventScroll: true }), 60);
      await new Promise(r => {
        c.loop(dt => {
          frente += dt * (GY1 - GY0) / 6.2;
          frentes.forEach(f => f.setAttribute("y", frente.toFixed(1)));
          if (frente >= GY1 + 4) { frentes.forEach(f => f.setAttribute("opacity", "0")); r(); return false; }
          if (parar) { r(); return false; }
        });
      });
      document.removeEventListener("keydown", onKey3);
      btDesl.remove(); $("#xBolhas", s).innerHTML = "";
      const fr = (frente - GY0) / (GY1 - GY0);
      if (fr < 0.66) { erros++; c.retorno("info", t("gel.p3.cedo")); }
      else if (fr <= 0.86) c.retorno("ok", t("gel.p3.ok"));
      else { erros++; c.retorno("erro", t("gel.p3.tarde")); }
      await c.continuar();

      /* 4. ler sob a luz azul */
      c.passos(4, 3);
      const yF = Math.min(frente, GY1 + 40);
      const m = tam => (Math.log10(3000) - Math.log10(tam)) / (Math.log10(3000) - Math.log10(80));
      const yB = tam => GY0 + m(tam) * (yF - GY0) * 1.02;
      const banda = (x, y, forte) => y > GY1 - 2 ? "" : '<rect x="' + (x - 19) + '" y="' + (y - 2.5).toFixed(1) + '" width="38" height="5" rx="2" fill="#7CFFB2" opacity="' + (forte ? 1 : 0.8) + '" filter="url(#xBr)"/><rect x="' + (x - 19) + '" y="' + (y - 2).toFixed(1) + '" width="38" height="4" rx="2" fill="#C8FFE0"/>';
      const ESCADA = [1500, 1000, 700, 500, 300, 200, 100];
      $("#xUV", s).innerHTML = '<filter id="xBr" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
        '<rect x="0" y="0" width="480" height="400" rx="16" fill="#070B12"/><rect x="100" y="62" width="280" height="282" rx="6" fill="#0E1C26" stroke="#1F3A4A"/>' +
        LANES.map((x, i) => '<text x="' + x + '" y="24" text-anchor="middle" font-size="12.5" fill="#C9D2E6">' + c.esc(t(nomes[i])) + '</text><rect x="' + (x - 22) + '" y="' + WY + '" width="44" height="9" rx="2" fill="none" stroke="#2C4A5C"/>').join("") +
        '<text x="92" y="74" text-anchor="end" font-size="12" fill="#8FA3BF">' + c.esc(t("gel.pb")) + "</text>" +
        ESCADA.map(tam => { const y = yB(tam); return y > GY1 - 2 ? "" : banda(150, y) + '<text x="92" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="12.5" fill="#C9D2E6">' + fmt(c, tam) + "</text>"; }).join("") +
        banda(240, yB(500), true);
      $("#xBase", s).setAttribute("opacity", "0"); $("#xUV", s).setAttribute("opacity", "1");
      c.etapa(4, 4, t("gel.p4"), t("gel.p4.instr"), '<p><b>' + t("gel.q1") + "</b></p>");
      erros += await c.perguntar([300, 500, 1000].map(n => ({ rotulo: fmt(c, n) + " " + c.esc(t("gel.pb")), certo: n === 500, resp: n === 500 ? t("gel.q1.r") : t("gel.q1.e") })), {});
      await c.espera(300);
      const ac = $(".gg-acoes", c.lado);
      ac.insertAdjacentHTML("beforeend", '<p style="margin-top:12px"><b>' + t("gel.q2") + "</b></p>");
      erros += await c.perguntar([{ rotulo: c.esc(t("gel.q2.a")), certo: true, resp: t("gel.q2.r") }, { rotulo: c.esc(t("gel.q2.b")), resp: t("gel.q2.e") }], {});
      await c.continuar();
      await c.fim(est3(erros, 0, 2), [t("gel.fim1")], "gel");
    }
  };

  /* ===================================================================== microscópio */
  function celula(x, y, w, h, f, i) {
    const cx = x + w / 2, cy = y + h / 2;
    let d = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="#F6E4EE" stroke="#C98DB5" stroke-width="2.2"/>';
    if (f === "interfase") d += '<circle cx="' + cx + '" cy="' + cy + '" r="10.5" fill="#C77DB2" stroke="#9B4C8A" stroke-width="1.6"/><circle cx="' + (cx + 2) + '" cy="' + (cy - 1) + '" r="3.2" fill="#7A2E6A"/>';
    if (f === "profase") {
      d += '<circle cx="' + cx + '" cy="' + cy + '" r="12.5" fill="#EBC3DE" stroke="#9B4C8A" stroke-width="1.4" stroke-dasharray="3 2"/>';
      [[-6, -5], [3, -7], [-2, 2], [6, 3], [-7, 5], [1, 8]].forEach(([a, b], k) => { d += '<path d="M' + (cx + a) + " " + (cy + b) + "q3 -" + (3 + k % 2) + " 5 0t5 0" + '" stroke="#6E2363" stroke-width="2.2" fill="none" stroke-linecap="round"/>'; });
    }
    if (f === "metafase") {
      d += '<path d="M' + (x + 8) + " " + cy + "L" + (cx - 2) + " " + (cy - 12) + "M" + (x + 8) + " " + cy + "L" + (cx - 2) + " " + (cy + 12) + "M" + (x + w - 8) + " " + cy + "L" + (cx + 2) + " " + (cy - 12) + "M" + (x + w - 8) + " " + cy + "L" + (cx + 2) + " " + (cy + 12) + '" stroke="#D9B6CF" stroke-width="1"/>';
      for (let k = 0; k < 6; k++) d += '<rect x="' + (cx - 5) + '" y="' + (cy - 14 + k * 5) + '" width="10" height="3.4" rx="1.7" fill="#6E2363"/>';
    }
    if (f === "anafase") {
      [-1, 1].forEach(lado => { for (let k = 0; k < 4; k++) { const bx = cx + lado * 15, by = cy - 10 + k * 6.5; d += '<path d="M' + (bx - lado * 5) + " " + (by - 2.5) + "L" + bx + " " + by + "L" + (bx - lado * 5) + " " + (by + 2.5) + '" stroke="#6E2363" stroke-width="2.2" fill="none" stroke-linecap="round"/>'; } });
    }
    if (f === "telofase") d += '<circle cx="' + (cx - 17) + '" cy="' + cy + '" r="8" fill="#D9A3CB" stroke="#9B4C8A" stroke-width="1.4"/><circle cx="' + (cx + 17) + '" cy="' + cy + '" r="8" fill="#D9A3CB" stroke="#9B4C8A" stroke-width="1.4"/><path d="M' + cx + " " + (y + 4) + "V" + (y + h - 4) + '" stroke="#9B4C8A" stroke-width="2" stroke-dasharray="3 3"/>';
    return '<g class="xCel" data-f="' + f + '" tabindex="0" role="button" aria-label="CEL' + (i + 1) + '">' + d + "</g>";
  }
  EXP.micro = {
    titulo: "micro.titulo", kicker: "micro.kicker", passos: 2,
    async jogar(c) {
      const t = c.t;
      // células em tijolinhos, como na ponta da raiz
      const W = 70, Hc = 44, cells = [];
      for (let r = 0; r < 8; r++) for (let k = -1; k < 7; k++) {
        const x = 30 + k * (W + 2) + (r % 2 ? W / 2 : 0), y = 26 + r * (Hc + 2), cx = x + W / 2, cy = y + Hc / 2;
        const dc = Math.hypot(cx - 240, cy - 200);
        if (dc < 182) cells.push({ x, y, cx, cy, dc, f: "interfase" });
      }
      const centrais = cells.filter(e => e.dc < 135).sort(() => Math.random() - 0.5);
      const FASES = ["profase", "metafase", "anafase", "telofase"];
      FASES.forEach((f, i) => { centrais[i * 2].f = f; centrais[i * 2 + 1].f = f; });
      if (centrais[8]) centrais[8].f = "profase";
      const s = c.svg("0 0 480 400",
        '<filter id="xDesf" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="xBlur" stdDeviation="8"/></filter>' +
        '<clipPath id="xOcular"><circle cx="240" cy="200" r="178"/></clipPath>' +
        '<g clip-path="url(#xOcular)"><rect x="40" y="0" width="400" height="400" fill="#FBF3F7"/><g id="xCampo" filter="url(#xDesf)">' + cells.map((e, i) => celula(e.x, e.y, W, Hc, e.f, i)).join("") + '</g><g id="xMarcas"></g></g>' +
        '<path d="M0 0H480V400H0Z M240 22a178 178 0 1 0 0.1 0Z" fill-rule="evenodd" fill="#0B0F1E"/><circle cx="240" cy="200" r="178" fill="none" stroke="#2A3350" stroke-width="5"/>');
      $$(".xCel", s).forEach((g, i) => g.setAttribute("aria-label", t("micro.celula") + " " + (i + 1)));
      const blur = $("#xBlur", s), campo = $("#xCampo", s);

      /* 1. focar */
      c.passos(2, 0);
      c.etapa(1, 2, t("micro.p1"), t("micro.p1.instr"), '<div class="gg-foco"><div><p class="etapa">' + c.esc(t("micro.macro")) + '</p><div class="gg-teclas"><button type="button" class="btn ghost" data-d="4">▲</button><button type="button" class="btn ghost" data-d="-4">▼</button></div></div>' +
        '<div><p class="etapa">' + c.esc(t("micro.micro")) + '</p><div class="gg-teclas"><button type="button" class="btn ghost" data-d="0.6">▲</button><button type="button" class="btn ghost" data-d="-0.6">▼</button></div></div></div><p class="gg-nota so-teclado">' + t("micro.p1.teclado") + "</p>");
      let foco = (Math.random() < 0.5 ? -1 : 1) * rnd(16, 24), firme = 0;
      const aplica = () => { const b = Math.min(9, Math.abs(foco) * 0.42); blur.setAttribute("stdDeviation", b.toFixed(2)); campo.setAttribute("transform", "translate(240 200) scale(" + (1 + foco * 0.004).toFixed(3) + ") translate(-240 -200)"); };
      aplica();
      let repete = null;
      $$(".gg-foco [data-d]", c.lado).forEach(b => {
        const d = +b.dataset.d;
        const para = () => { clearInterval(repete); repete = null; };
        c.on(b, "pointerdown", e => { e.preventDefault(); foco += d; aplica(); para(); repete = setInterval(() => { foco += d; aplica(); }, 140); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(ev => c.on(b, ev, para));
        c.on(b, "keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); foco += d; aplica(); } });
      });
      c.on(document, "keydown", e => {
        const mapa = { ArrowUp: 4, ArrowDown: -4, ArrowRight: 0.6, ArrowLeft: -0.6 };
        if (mapa[e.key] != null && firme >= 0) { e.preventDefault(); foco += mapa[e.key]; aplica(); }
      });
      c.on(s, "wheel", e => { if (firme < 0) return; e.preventDefault(); foco += e.deltaY > 0 ? -0.6 : 0.6; aplica(); }, { passive: false });
      await new Promise(r => c.loop(dt => { if (Math.abs(foco) < 0.7) firme += dt; else firme = 0; if (firme > 0.35) { r(); return false; } }));
      firme = -1; clearInterval(repete);
      foco = 0; aplica(); campo.removeAttribute("filter");
      c.retorno("ok", t("micro.p1.ok"));
      await c.continuar();

      /* 2. encontrar as fases */
      c.passos(2, 1);
      let erros = 0;
      const marcas = $("#xMarcas", s);
      for (const f of FASES) {
        c.etapa(2, 2, t("micro.p2"), t("micro.p2.instr", { x: t("micro." + f), y: t("micro." + f + ".d") }));
        await new Promise(r => {
          const tenta = g => {
            if (!g || g.dataset.achada) return;
            const qual = g.dataset.f, rr = g.querySelector("rect");
            if (qual === f) {
              g.dataset.achada = "1";
              marcas.insertAdjacentHTML("beforeend", '<rect x="' + (+rr.getAttribute("x") - 4) + '" y="' + (+rr.getAttribute("y") - 4) + '" width="78" height="52" rx="10" fill="none" stroke="#FFB23F" stroke-width="4"/>');
              c.retorno("ok", t("micro.certo", { x: t("micro." + f) }));
              s.onclick = s.onkeydown = null; setTimeout(r, c.rm() ? 50 : 700);
            } else {
              erros++;
              c.retorno("erro", t("micro.errado", { x: t("micro." + qual), y: t("micro." + qual + ".d") }));
              if (!c.rm()) rr.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 400 });
            }
          };
          s.onclick = e => tenta(e.target.closest(".xCel"));
          s.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tenta(e.target.closest(".xCel")); } };
        });
        if (!c.vivo) return;
      }
      await c.continuar();
      await c.fim(est3(erros, 0, 2), [t("micro.fim1"), t("micro.fim2")], "micro");
    }
  };

  /* ===================================================================== antibiograma */
  EXP.bacterias = {
    titulo: "bac.titulo", kicker: "bac.kicker", passos: 4,
    async jogar(c) {
      const t = c.t;
      const CX = 240, CY = 200, R = 168;
      const SLOTS = [[165, 125], [315, 125], [165, 275], [315, 275]];
      const HALO = { A: 60, B: 42, C: 15, D: 28 };
      const FUNGO = [240, 352];
      const s = c.svg("0 0 480 400",
        '<ellipse cx="' + (CX + 6) + '" cy="' + (CY + 10) + '" rx="' + (R + 10) + '" ry="' + (R + 6) + '" fill="rgba(15,23,48,.12)"/>' +
        '<circle cx="' + CX + '" cy="' + CY + '" r="' + (R + 6) + '" fill="#F4F6FA" stroke="#C9CFDC" stroke-width="3"/><circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="#E8BF78"/>' +
        '<clipPath id="xPlaca"><circle cx="' + CX + '" cy="' + CY + '" r="' + R + '"/></clipPath>' +
        '<mask id="xMascara"><rect width="480" height="400" fill="#fff"/><g id="xBuracos"></g></mask>' +
        '<g clip-path="url(#xPlaca)"><path id="xRastro" d="" stroke="rgba(255,250,232,.75)" stroke-width="38" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<g id="xGrama" mask="url(#xMascara)" opacity="0"><circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="#FFF8E8"/>' +
        Array.from({ length: 160 }, () => { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * R; return '<circle cx="' + (CX + Math.cos(a) * d).toFixed(0) + '" cy="' + (CY + Math.sin(a) * d).toFixed(0) + '" r="' + rnd(1, 2.4).toFixed(1) + '" fill="#EADBB0"/>'; }).join("") + "</g>" +
        '<g id="xFungo" opacity="0" transform="translate(' + FUNGO[0] + "," + FUNGO[1] + ')"><circle r="22" fill="#F8FAF8"/><circle r="16" fill="#5FA38A"/><circle r="9" fill="#2F7A68"/>' +
        Array.from({ length: 14 }, (_, i) => '<circle cx="' + (Math.cos(i / 14 * 6.28) * 20).toFixed(1) + '" cy="' + (Math.sin(i / 14 * 6.28) * 20).toFixed(1) + '" r="4" fill="#fff"/>').join("") + "</g></g>" +
        '<g id="xSlots">' + SLOTS.map(([x, y], i) => '<g class="xSlot" data-i="' + i + '" opacity="0" tabindex="-1" role="button" aria-label="' + (i + 1) + '"><circle cx="' + x + '" cy="' + y + '" r="34" fill="transparent"/>' +
          '<circle class="xAlvoDisco" cx="' + x + '" cy="' + y + '" r="18" fill="rgba(123,77,224,.10)" stroke="#7B4DE0" stroke-width="2.6" stroke-dasharray="5 4"/></g>').join("") + "</g>" +
        '<g id="xDiscos"></g><g id="xSwab" opacity="0"><path d="M0 0L46 -46" stroke="#D6A86A" stroke-width="5" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="9" ry="7" fill="#fff" stroke="#E6E9F0"/></g><g id="xEstufa"></g>');
      const rastro = $("#xRastro", s), swab = $("#xSwab", s);

      /* 1. espalhar */
      c.passos(4, 0);
      c.etapa(1, 4, t("bac.p1"), t("bac.p1.instr"), '<div class="gg-medidor"><i id="xMedB"></i></div><p class="gg-nota so-teclado">' + t("bac.p1.teclado") + "</p>");
      const medB = $("#xMedB", c.lado);
      const N = 22, passo = (2 * R) / N, grade = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = CX - R + (i + 0.5) * passo, y = CY - R + (j + 0.5) * passo; if (Math.hypot(x - CX, y - CY) < R - 4) grade.push({ x, y, ok: false }); }
      let cobertos = 0, d = "", segB = false, espalhando = true;
      const cobre = p => { grade.forEach(g => { if (!g.ok && Math.hypot(g.x - p.x, g.y - p.y) < 22) { g.ok = true; cobertos++; } }); medB.style.width = Math.min(100, cobertos / grade.length / 0.88 * 100).toFixed(0) + "%"; };
      await new Promise(r => {
        const ver = () => { if (cobertos / grade.length >= 0.88) { r(); return true; } };
        c.on(s, "pointerdown", e => { if (!espalhando) return; segB = true; captura(s, e); const p = c.ponto(s, e); d += "M" + p.x.toFixed(0) + " " + p.y.toFixed(0); rastro.setAttribute("d", d); cobre(p); swab.setAttribute("opacity", "1"); swab.setAttribute("transform", "translate(" + p.x + "," + p.y + ")"); });
        c.on(s, "pointermove", e => { if (!espalhando || !segB || cobertos / grade.length >= 0.88) return; const p = c.ponto(s, e); d += "L" + p.x.toFixed(0) + " " + p.y.toFixed(0); rastro.setAttribute("d", d); swab.setAttribute("transform", "translate(" + p.x + "," + p.y + ")"); cobre(p); ver(); });
        c.on(s, "pointerup", () => { segB = false; swab.setAttribute("opacity", "0"); });
        c.on(s, "pointercancel", () => { segB = false; });
        // teclado: espalha sozinho em zigue-zague
        let auto = false;
        c.on(document, "keydown", e => {
          if (e.key !== "Enter" || auto || cobertos / grade.length >= 0.88) return;
          if (e.target.closest && e.target.closest("button")) return;
          e.preventDefault(); auto = true;
          let y = CY - R + 14, dir = 1; d += "M" + (CX - R) + " " + y;
          const t0 = setInterval(() => {
            if (!c.vivo) return clearInterval(t0);
            y += 22; dir = -dir; d += "L" + (dir > 0 ? CX - R : CX + R) + " " + y; rastro.setAttribute("d", d);
            for (let x = CX - R; x <= CX + R; x += 10) cobre({ x, y }), cobre({ x, y: y - 11 });
            if (y > CY + R || ver()) { clearInterval(t0); r(); }
          }, c.rm() ? 5 : 90);
        });
      });
      espalhando = false; segB = false; swab.setAttribute("opacity", "0"); medB.style.width = "100%";
      c.retorno("ok", t("bac.p1.ok"));
      await c.continuar();

      /* 2. discos */
      c.passos(4, 1);
      c.etapa(2, 4, t("bac.p2"), t("bac.p2.instr"));
      const slots = $$(".xSlot", s);
      slots.forEach(sl => { sl.setAttribute("opacity", "1"); sl.setAttribute("tabindex", "0"); sl.style.cursor = "pointer"; });
      const letras = ["A", "B", "C", "D"], pos = {};
      let n = 0;
      await new Promise(r => {
        const poe = sl => {
          if (!sl || sl.dataset.ok) return;
          sl.dataset.ok = "1"; sl.setAttribute("opacity", "0"); sl.setAttribute("tabindex", "-1");
          const [x, y] = SLOTS[+sl.dataset.i], L = letras[n++]; pos[L] = [x, y];
          $("#xDiscos", s).insertAdjacentHTML("beforeend", '<g transform="translate(' + x + "," + y + ')"><circle r="14" fill="#fff" stroke="#C9CFDC" stroke-width="2"/><text y="5" text-anchor="middle" font-size="15" font-weight="700" fill="#2A3350">' + L + "</text></g>");
          if (n >= 4) r();
        };
        s.onclick = e => poe(e.target.closest(".xSlot"));
        s.onpointerup = e => { const sl = e.target.closest && e.target.closest(".xSlot"); if (sl) { e.preventDefault(); poe(sl); } };
        s.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poe(e.target.closest(".xSlot")); } };
        setTimeout(() => slots[0].focus && slots[0].focus({ preventScroll: true }), 60);
      });
      s.onclick = s.onkeydown = s.onpointerup = null;
      c.retorno("ok", t("bac.p2.ok"));
      await c.continuar();

      /* 3. estufa */
      c.passos(4, 2);
      c.etapa(3, 4, t("bac.p3"), t("bac.p3.instr"));
      await c.continuar(t("bac.incubar"));
      const est = $("#xEstufa", s);
      const graus = new Intl.NumberFormat(c.locale, { minimumFractionDigits: 1 }).format(37);
      est.innerHTML = '<rect x="40" y="20" width="400" height="360" rx="20" fill="#E9ECF4" stroke="#C9CFDC" stroke-width="3"/><rect x="80" y="70" width="230" height="270" rx="12" fill="rgba(176,205,255,.35)" stroke="#9AA3BA" stroke-width="2"/>' +
        '<ellipse cx="195" cy="250" rx="80" ry="22" fill="#F3D9A4" stroke="#C9CFDC" stroke-width="2"/><rect x="330" y="70" width="90" height="36" rx="6" fill="#111A33"/><text x="375" y="94" text-anchor="middle" font-size="17" fill="#FFB23F">' + graus + " °C</text>" +
        '<circle cx="375" cy="180" r="40" fill="#fff" stroke="#2A3350" stroke-width="3"/><g id="xPont"><path d="M375 180V152" stroke="#E0385A" stroke-width="4" stroke-linecap="round"/></g><circle cx="375" cy="180" r="4" fill="#2A3350"/>' +
        '<text id="xHoras" x="375" y="256" text-anchor="middle" font-size="22" font-family="Unbounded,system-ui" fill="#2A3350">0 h</text>';
      const pont = $("#xPont", est), horas = $("#xHoras", est);
      await new Promise(r => {
        const t0 = performance.now(), D = c.rm() ? 1 : 2600;
        c.loop((dt, agora) => { const k = clamp((agora - t0) / D, 0, 1), h = Math.round(18 * k); pont.setAttribute("transform", "rotate(" + (k * 18 * 30) + " 375 180)"); horas.textContent = t("bac.horas", { n: h }); if (k >= 1) { r(); return false; } });
      });
      await c.espera(400);
      est.innerHTML = "";
      $("#xBuracos", s).innerHTML = letras.map(L => '<circle cx="' + pos[L][0] + '" cy="' + pos[L][1] + '" r="' + HALO[L] + '" fill="#000"/>').join("") + '<circle cx="' + FUNGO[0] + '" cy="' + FUNGO[1] + '" r="44" fill="#000"/>';
      rastro.setAttribute("opacity", "0");
      const grama = $("#xGrama", s), fungo = $("#xFungo", s);
      await new Promise(r => {
        const t0 = performance.now(), D = c.rm() ? 1 : 1400;
        c.loop((dt, agora) => { const k = clamp((agora - t0) / D, 0, 1); grama.setAttribute("opacity", (0.97 * k).toFixed(2)); fungo.setAttribute("opacity", k.toFixed(2)); if (k >= 1) { r(); return false; } });
      });
      c.retorno("uau", t("bac.surpresa"));
      await c.continuar();

      /* 4. ler os halos */
      c.passos(4, 3);
      let erros = 0;
      c.etapa(4, 4, t("bac.p4"), t("bac.p4.instr"), "<p><b>" + t("bac.q1") + "</b></p>");
      erros += await c.perguntar(letras.map(L => ({ rotulo: L, certo: L === "C", resp: L === "C" ? t("bac.q1.r") : t("bac.q1.e") })), { grade: true });
      await c.espera(300);
      $(".gg-acoes", c.lado).insertAdjacentHTML("beforeend", '<p style="margin-top:12px"><b>' + t("bac.q2") + "</b></p>");
      erros += await c.perguntar(letras.map(L => ({ rotulo: L, certo: L === "A", resp: L === "A" ? t("bac.q2.r") : t("bac.q2.e") })), { grade: true });
      await c.continuar();
      await c.fim(est3(erros, 0, 2), [t("bac.fim1"), t("bac.fim2")], "bacterias");
    }
  };

  /* ===================================================================== bioinformática */
  // começo real do gene HBB (beta-globina), códons 1 a 8, depois do ATG inicial
  const REF = "GTGCATCTGACTCCTGAGGAGAAG";
  const AMO = "GTGCATCTGACTCCTGTGGAGAAG";   // códon 6: GAG → GTG (anemia falciforme)
  const CORB = { A: "#5FD39A", T: "#FF8A9D", C: "#7C9CFF", G: "#FFD27A" };
  EXP.bio = {
    titulo: "bio.titulo", kicker: "bio.kicker", passos: 3,
    async jogar(c) {
      const t = c.t;
      let erros = 0;
      const PAD = 3;
      let off = (Math.random() < 0.5 ? -1 : 1) * ri(2, 3);
      c.cena.innerHTML = '<div class="bio-tela" id="xTela"><div class="bio-num" id="xNum"></div><p class="bio-rot">' + c.esc(t("bio.ref")) + '</p><div class="bio-linha" id="xRef"></div>' +
        '<p class="bio-rot">' + c.esc(t("bio.amostra")) + '</p><div class="bio-linha bio-mov" id="xAmo" tabindex="0" role="slider" aria-valuemin="-3" aria-valuemax="3" aria-label="' + c.esc(t("bio.amostra")) + '"></div><div id="xExtra"></div></div>';
      const tela = $("#xTela", c.cena), refEl = $("#xRef", c.cena), amoEl = $("#xAmo", c.cena), numEl = $("#xNum", c.cena);
      let cw = 20;
      const medir = () => { cw = clamp(Math.floor((c.cena.clientWidth - 56) / (REF.length + PAD * 2)), 10, 26); tela.style.setProperty("--cw", cw + "px"); };
      const letra = (b, i, cls) => '<span class="bio-l ' + (cls || "") + '" style="left:' + (i * cw) + "px;color:" + CORB[b] + '">' + b + "</span>";
      function desenhar() {
        medir();
        numEl.innerHTML = Array.from({ length: 8 }, (_, k) => '<span style="left:' + ((PAD + k * 3) * cw) + "px;width:" + (3 * cw) + 'px">' + (k + 1) + "</span>").join("");
        refEl.innerHTML = [...REF].map((b, i) => { const j = i - off; const ok = j >= 0 && j < AMO.length && AMO[j] === b; return letra(b, i + PAD, ok ? "bate" : ""); }).join("") +
          Array.from({ length: 7 }, (_, k) => '<i class="bio-sep" style="left:' + ((PAD + (k + 1) * 3) * cw) + 'px"></i>').join("");
        amoEl.innerHTML = [...AMO].map((b, j) => { const i = j + off; const ok = i >= 0 && i < REF.length && REF[i] === b; return letra(b, i + PAD, ok ? "bate" : "nao"); }).join("");
        amoEl.setAttribute("aria-valuenow", String(off));
      }
      desenhar();
      c.on(window, "resize", desenhar);

      /* 1. alinhar */
      c.passos(3, 0);
      c.etapa(1, 3, t("bio.p1"), t("bio.p1.instr"), '<div class="gg-teclas"><button type="button" class="btn ghost" id="xEsq" aria-label="' + c.esc(t("bio.esq")) + '">◀</button><button type="button" class="btn ghost" id="xDir" aria-label="' + c.esc(t("bio.dir")) + '">▶</button></div>');
      await new Promise(r => {
        const move = dlt => { off = clamp(off + dlt, -PAD, PAD); desenhar(); if (off === 0) { r(); } };
        $("#xEsq", c.lado).onclick = () => move(-1); $("#xDir", c.lado).onclick = () => move(1);
        c.on(amoEl, "keydown", e => { if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } if (e.key === "ArrowRight") { e.preventDefault(); move(1); } });
        let x0 = null, o0 = 0;
        c.on(amoEl, "pointerdown", e => { x0 = e.clientX; o0 = off; captura(amoEl, e); });
        c.on(amoEl, "pointermove", e => { if (x0 == null || off === 0) return; const n = clamp(o0 + Math.round((e.clientX - x0) / cw), -PAD, PAD); if (n !== off) { off = n; desenhar(); if (off === 0) { x0 = null; r(); } } });
        c.on(amoEl, "pointerup", () => { x0 = null; });
      });
      amoEl.classList.add("travado");
      $(".gg-teclas", c.lado).remove();
      c.retorno("ok", t("bio.p1.ok"));
      await c.continuar();

      /* 2. a diferença */
      c.passos(3, 1);
      c.etapa(2, 3, t("bio.p2"), t("bio.p2.instr"));
      const cods = Array.from({ length: 8 }, (_, k) => ({ k, r: REF.substr(k * 3, 3), a: AMO.substr(k * 3, 3) }));
      const cor = s => [...s].map(b => '<b style="color:' + CORB[b] + '">' + b + "</b>").join("");
      erros += await c.perguntar(cods.map(o => ({ rotulo: '<span class="bio-chip"><small>' + c.esc(t("bio.codon", { n: o.k + 1 })) + "</small><code>" + cor(o.r) + "</code><code>" + cor(o.a) + "</code></span>", certo: o.k === 5, resp: o.k === 5 ? t("bio.p2.ok") : t("bio.p2.e") })), { grade: true, desabilitaErro: true });
      $$(".bio-l", amoEl).forEach(l => { if (l.classList.contains("nao")) l.classList.add("muta"); });
      await c.continuar();

      /* 3. traduzir */
      c.passos(3, 2);
      const TAB = [["GTG", "bio.val"], ["CAT", "bio.his"], ["CTG", "bio.leu"], ["ACT", "bio.thr"], ["CCT", "bio.pro"], ["GAG", "bio.glu"], ["AAG", "bio.lys"]];
      $("#xExtra", c.cena).innerHTML = '<p class="bio-rot" style="margin-top:14px">' + c.esc(t("bio.tabela")) + '</p><div class="bio-tab">' + TAB.map(([cd, k]) => "<span><code>" + cor(cd) + "</code>" + c.esc(t(k)) + "</span>").join("") + "</div>";
      c.etapa(3, 3, t("bio.p3"), t("bio.p3.instr"), "<p>" + t("bio.q1") + "</p>");
      erros += await c.perguntar([["bio.glu", true], ["bio.val"], ["bio.lys"]].map(([k, ok]) => ({ rotulo: c.esc(t(k)), certo: !!ok, resp: ok ? t("bio.q.r") : t("bio.q.e") })), {});
      await c.espera(250);
      $(".gg-acoes", c.lado).insertAdjacentHTML("beforeend", '<p style="margin-top:12px">' + t("bio.q2") + "</p>");
      erros += await c.perguntar([["bio.glu"], ["bio.val", true], ["bio.his"]].map(([k, ok]) => ({ rotulo: c.esc(t(k)), certo: !!ok, resp: ok ? t("bio.q.r") : t("bio.q.e") })), {});
      // hemácia normal e em forma de foice
      $("#xExtra", c.cena).innerHTML = '<div class="bio-hem"><figure><svg viewBox="0 0 120 90"><ellipse cx="60" cy="45" rx="44" ry="34" fill="#E0385A"/><ellipse cx="60" cy="45" rx="20" ry="15" fill="#F27A93"/></svg><figcaption>' + c.esc(t("bio.normal")) + "</figcaption></figure>" +
        '<figure><svg viewBox="0 0 120 90"><path d="M18 62C26 24 72 8 104 22C80 22 52 38 42 70C34 72 24 70 18 62Z" fill="#C9254A"/></svg><figcaption>' + c.esc(t("bio.foice")) + "</figcaption></figure></div>";
      await c.continuar();
      await c.fim(est3(erros, 0, 2), [t("bio.fim1"), t("bio.fim2")], "bio");
    }
  };

  /* ===================================================================== freezer −80 °C */
  EXP.freezer = {
    titulo: "fre.titulo", kicker: "fre.kicker", passos: 1,
    async jogar(c) {
      const t = c.t;
      c.passos(1, 0);
      const LIN = "ABCDEF";
      let estrelas = 0;
      while (!estrelas) {
        const ped = { p: ri(1, 4), c: ri(1, 3), l: LIN[ri(0, 5)], n: ri(1, 6) };
        const posTxt = ped.l + ped.n;
        c.etapa(1, 1, t("fre.p1"), t("fre.p1.instr"), '<p class="gg-pedido">' + t("fre.pedido", { p: ped.p, c: ped.c, x: posTxt }) + '</p><p class="etapa" style="margin-top:6px">' + c.esc(t("fre.frio")) + '</p><div class="gg-medidor frio"><i id="xFrio"></i></div>');
        const s = c.svg("0 0 480 400", '<rect x="60" y="14" width="360" height="372" rx="16" fill="#F6F8FC" stroke="#C9CFDC" stroke-width="3"/><rect x="74" y="28" width="332" height="344" rx="10" fill="#DCE9F7"/>' +
          '<g id="xPorta"><rect x="60" y="14" width="360" height="372" rx="16" fill="#F9FBFE" stroke="#C9CFDC" stroke-width="3"/><rect x="380" y="150" width="12" height="100" rx="6" fill="#9AA3BA"/><rect x="100" y="40" width="150" height="44" rx="8" fill="#111A33"/><text x="175" y="69" text-anchor="middle" font-size="19" fill="#7FD1FF">−80 °C</text></g><g id="xDentro"></g>' +
          '<g id="xNevoa" opacity="0">' + [120, 200, 280, 360].map((x, i) => '<g transform="translate(' + x + ',40)"><ellipse class="nevoa" style="animation-delay:-' + i + 's" rx="46" ry="16" fill="#fff" opacity=".55"/></g>').join("") + "</g>");
        const dentro = $("#xDentro", s), frioEl = $("#xFrio", c.lado);
        await c.continuar(t("fre.abrir"));
        $("#xPorta", s).setAttribute("opacity", "0"); $("#xNevoa", s).setAttribute("opacity", "1");
        let frio = 0, tempo = 0, achou = false, falhou = false;
        const prateleiras = () => {
          let h = "";
          for (let p = 1; p <= 4; p++) {
            const y = 40 + (p - 1) * 84;
            h += '<rect x="74" y="' + (y + 70) + '" width="332" height="6" fill="#B8C6E0"/><text x="90" y="' + (y + 44) + '" font-size="16" font-weight="700" fill="#5A6488">' + p + "</text>";
            for (let k = 1; k <= 3; k++) {
              const x = 110 + (k - 1) * 98;
              h += '<g class="xCaixa" data-p="' + p + '" data-c="' + k + '" tabindex="0" role="button" aria-label="' + c.esc(t("fre.prateleira", { n: p }) + " · " + t("fre.caixa", { n: k })) + '" style="cursor:pointer">' +
                '<rect x="' + x + '" y="' + (y + 14) + '" width="88" height="56" rx="6" fill="' + ["#C9B8FF", "#BFD8FF", "#FFD9A0"][k - 1] + '" stroke="#8C96B0" stroke-width="1.5"/><text x="' + (x + 44) + '" y="' + (y + 48) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#2A3350">' + c.esc(t("fre.caixa", { n: k })) + "</text></g>";
            }
          }
          dentro.innerHTML = h;
          $(".gg-acoes", c.lado).innerHTML = "";
        };
        const caixa = (p, k) => {
          let h = '<rect x="74" y="28" width="332" height="344" rx="10" fill="#DCE9F7"/><rect x="104" y="40" width="300" height="320" rx="10" fill="' + ["#C9B8FF", "#BFD8FF", "#FFD9A0"][k - 1] + '" stroke="#8C96B0" stroke-width="2"/>';
          for (let j = 0; j < 6; j++) h += '<text x="' + (154 + j * 44) + '" y="62" text-anchor="middle" font-size="14" font-weight="700" fill="#2A3350">' + (j + 1) + "</text>";
          for (let i = 0; i < 6; i++) {
            h += '<text x="122" y="' + (98 + i * 46) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#2A3350">' + LIN[i] + "</text>";
            for (let j = 0; j < 6; j++) h += '<g class="xTubo" data-pos="' + LIN[i] + (j + 1) + '" tabindex="0" role="button" aria-label="' + LIN[i] + (j + 1) + '" style="cursor:pointer"><circle cx="' + (154 + j * 44) + '" cy="' + (93 + i * 46) + '" r="17" fill="#fff" stroke="#8C96B0" stroke-width="1.5"/><circle cx="' + (154 + j * 44) + '" cy="' + (93 + i * 46) + '" r="9" fill="' + ["#E0385A", "#2F5BEA", "#14864A", "#D98A0B", "#7B4DE0", "#0E9AA7"][(i + j) % 6] + '" opacity=".75"/></g>';
          }
          dentro.innerHTML = h;
          const v = c.botao(c.esc(t("fre.voltar")), "ghost"); v.onclick = () => { prateleiras(); c.retorno("", ""); };
          dentro.dataset.p = p; dentro.dataset.c = k;
        };
        prateleiras();
        const toca = g => {
          if (!g || achou || falhou) return;
          if (g.classList.contains("xCaixa")) {
            const p = +g.dataset.p, k = +g.dataset.c;
            if (p === ped.p && k === ped.c) { c.retorno("", ""); caixa(p, k); }
            else c.retorno("erro", t("fre.caixaErrada", { c: k, p }));
          } else if (g.classList.contains("xTubo")) {
            if (g.dataset.pos === posTxt) {
              achou = true; g.querySelector("circle").setAttribute("stroke", "#FFB23F"); g.querySelector("circle").setAttribute("stroke-width", "5");
              const seg = Math.max(1, Math.round(tempo)); c.retorno("ok", t(seg === 1 ? "fre.ok1" : "fre.ok", { n: seg }));
            } else c.retorno("erro", t("fre.posErrada", { x: g.dataset.pos }));
          }
        };
        s.onclick = e => toca(e.target.closest(".xCaixa,.xTubo"));
        s.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toca(e.target.closest(".xCaixa,.xTubo")); } };
        await new Promise(r => c.loop(dt => {
          tempo += dt; frio = Math.min(1, tempo / 24); frioEl.style.width = (frio * 100).toFixed(0) + "%";
          if (achou) { r(); return false; }
          if (frio >= 1) { falhou = true; r(); return false; }
        }));
        s.onclick = s.onkeydown = null;
        $(".gg-acoes", c.lado).innerHTML = "";
        if (falhou) { $("#xPorta", s).setAttribute("opacity", "1"); dentro.innerHTML = ""; c.retorno("erro", t("fre.falhou")); await c.continuar(t("ui.tentarDeNovo")); continue; }
        estrelas = tempo <= 12 ? 3 : tempo <= 19 ? 2 : 1;
        await c.continuar();
      }
      await c.fim(estrelas, [t("fre.fim1")], "freezer");
    }
  };

  /* ===================================================================== publicar o artigo */
  EXP.publicar = {
    titulo: "pub.titulo", kicker: "pub.kicker", passos: 4,
    async jogar(c) {
      const t = c.t, E = c.estado;
      if (!c.opc.certificado) {
        /* 1. autoria */
        c.passos(4, 0);
        c.cena.innerHTML = '<div class="pub-geninho"><img src="img/geninho-corpo.jpg" alt="" width="360" height="360"></div>';
        c.etapa(1, 4, t("pub.p1"), t("pub.p1.instr"), '<label class="gg-campo"><span>' + c.esc(t("pub.nome")) + '</span><input id="xNome" type="text" maxlength="40" autocomplete="name" value="' + c.esc(E.nome || "") + '"></label>');
        const inp = $("#xNome", c.lado);
        setTimeout(() => inp.focus({ preventScroll: true }), 80);
        c.on(inp, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); const b = $(".gg-acoes .btn", c.lado); if (b) b.click(); } });
        await c.continuar();
        E.nome = inp.value.trim().slice(0, 40); c.salvar();
        const nome = E.nome || t("pub.voce");

        /* 2. o artigo */
        c.passos(4, 1);
        const ids = ["epi", "dna", "pcr", "gel", "micro", "bacterias", "bio", "freezer"].filter(id => E.feitos[id]);
        c.cena.innerHTML = '<article class="pub-artigo"><p class="pub-rev">GenoGame · ' + new Date().getFullYear() + '</p><h3>' + c.esc(t("pub.artigoTitulo")) + '</h3><p class="pub-aut">' + c.esc(t("pub.autores", { x: nome })) + "</p>" +
          '<div class="pub-sec">' + ids.map(id => '<p><span class="pub-est">' + "★".repeat(+E.feitos[id] || 0) + "</span>" + c.esc(t("tar." + id)) + "</p>").join("") + "</div>" +
          '<div class="pub-figs"><span style="--c:#7B4DE0"></span><span style="--c:#2F5BEA"></span><span style="--c:#14864A"></span></div></article>';
        c.etapa(2, 4, t("pub.p2"), t("pub.p2.instr"));
        await c.continuar(t("pub.enviar"));

        /* 3. revisão por pares */
        c.passos(4, 2);
        c.cena.innerHTML = '<div class="pub-revisores">' + [1, 2, 3].map(n => '<div class="pub-r" id="xR' + n + '"><b>R' + n + "</b><span>" + c.esc(t("pub.revisor", { n })) + "</span></div>").join("") + "</div>";
        const QS = [["pub.r1", [["pub.r1.a", 1], ["pub.r1.b"]], 1], ["pub.r2", [["pub.r2.a", 1], ["pub.r2.b"], ["pub.r2.c"]], 2], ["pub.r3", [["pub.r3.a", 1], ["pub.r3.b"]], 2]];
        for (let i = 0; i < QS.length; i++) {
          const [q, ops, rev] = QS[i];
          $$(".pub-r", c.cena).forEach(r => r.classList.toggle("ativo", r.id === "xR" + rev));
          c.etapa(3, 4, t("pub.p3"), t("pub.p3.instr"), (i === 2 ? '<p class="gg-nota">' + c.esc(t("pub.revisor2")) + "</p>" : "") + "<p><b>" + c.esc(t("pub.revisor", { n: rev })) + ":</b> " + t(q) + "</p>");
          await c.perguntar(ops.map(([k, ok]) => ({ rotulo: c.esc(t(k)), certo: !!ok, resp: ok ? t("pub.ok") : t("pub.corrigir") })), {});
          $("#xR" + rev, c.cena).classList.add("ok");
          await c.espera(600);
        }
        $("#xR1", c.cena).classList.add("ok");

        /* 4. publicado */
        c.passos(4, 3);
        E.publicado = true; c.salvar();
        c.cena.innerHTML = '<div class="pub-caminho">' + [1, 2, 3, 4].map(n => '<div class="pub-passo" style="--i:' + n + '"><b>' + n + "</b><span>" + c.esc(t("pub.c" + n)) + "</span></div>").join('<i aria-hidden="true"></i>') + '</div><div class="pub-confete" aria-hidden="true">' +
          (c.rm() ? "" : Array.from({ length: 18 }, (_, i) => '<span style="left:' + rnd(2, 96).toFixed(0) + "%;animation-delay:-" + rnd(0, 4).toFixed(1) + "s;animation-duration:" + rnd(3.5, 6).toFixed(1) + "s;--c:" + ["#4D7CFF", "#FF5470", "#FFB23F", "#A58CFF", "#5FD39A"][i % 5] + '"></span>').join("")) + "</div>";
        c.etapa(4, 4, t("pub.p4"), t("pub.p4.instr"));
        const ac = $(".gg-acoes", c.lado);
        ac.insertAdjacentHTML("beforeend", '<a class="btn ghost" href="../artigos/">' + c.esc(t("pub.verEstudos")) + "</a>");
        await c.continuar(t("ui.verCertificado"));
      }

      /* certificado */
      c.passos(4, 4);
      c.cena.innerHTML = '<canvas id="xCert" width="1200" height="850" class="pub-cert" role="img" aria-label="' + c.esc(t("pub.cert")) + '"></canvas>';
      const cv = $("#xCert", c.cena);
      await desenharCertificado(c, cv);
      c.lado.innerHTML = '<p class="etapa">' + c.esc(t("pub.cert")) + "</p><h3>" + c.esc(t("pub.certTitulo")) + '</h3><p>' + c.esc(t("ui.estrelasConta", { n: c.nEstrelas(), t: c.ESTRELAS_MAX })) + " · " + c.esc(t("ui.cartasConta", { n: c.nCartas(), t: c.CARTAS.length })) + "</p>" +
        '<div class="gg-acoes"><a class="btn violeta" id="xSalvar" download="genogame-certificado.png">' + c.esc(t("pub.salvar")) + '</a><button type="button" class="btn ghost" id="xVoltar">' + c.esc(t("ui.voltarLab")) + "</button></div>" +
        '<p class="gg-nota">' + c.esc(t("ui.desenvolvido")) + " Thaisa Carvalho</p>";
      try { $("#xSalvar", c.lado).href = cv.toDataURL("image/png"); } catch (e) { $("#xSalvar", c.lado).remove(); }
      $("#xVoltar", c.lado).onclick = () => c.fechar();
      $("#xVoltar", c.lado).focus({ preventScroll: true });
    }
  };

  async function desenharCertificado(c, cv) {
    const t = c.t, E = c.estado, g = cv.getContext("2d"), W = cv.width, H = cv.height;
    try { await Promise.all(["700 64px Unbounded", "600 30px Unbounded", "500 26px 'IBM Plex Sans'", "600 22px 'IBM Plex Mono'"].map(f => document.fonts.load(f))); } catch (e) {}
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = "img/geninho-rosto-256.png"; });
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#4D7CFF"); gr.addColorStop(0.5, "#A58CFF"); gr.addColorStop(1, "#FF5470");
    g.strokeStyle = gr; g.lineWidth = 18; g.strokeRect(24, 24, W - 48, H - 48);
    g.fillStyle = "#F4F2FB"; g.fillRect(42, 42, W - 84, 150);
    g.fillStyle = "#E0385A"; g.font = "600 22px 'IBM Plex Mono', monospace"; g.fillText(t("pub.cert").toUpperCase() + " · GENOGAME", 90, 110);
    g.fillStyle = "#0F1730"; g.font = "600 30px Unbounded, sans-serif"; g.fillText("GenoEvidence", 90, 155);
    if (img) { g.save(); g.beginPath(); g.arc(W - 190, 300, 120, 0, Math.PI * 2); g.closePath(); g.fillStyle = gr; g.fill(); g.beginPath(); g.arc(W - 190, 300, 112, 0, Math.PI * 2); g.clip(); g.fillStyle = "#fff"; g.fill(); g.drawImage(img, W - 302, 188, 224, 224); g.restore(); }
    g.fillStyle = "#0F1730"; g.font = "700 60px Unbounded, sans-serif"; g.fillText(t("pub.certTitulo"), 90, 300, W - 420);
    const nome = E.nome || t("pub.voce");
    g.fillStyle = "#7B4DE0"; g.font = "700 52px Unbounded, sans-serif"; g.fillText(nome, 90, 400, W - 420);
    g.fillStyle = "#3A4560"; g.font = "500 28px 'IBM Plex Sans', sans-serif"; g.fillText(t("pub.certTexto"), 90, 460, W - 420);
    g.font = "600 26px 'IBM Plex Mono', monospace"; g.fillStyle = "#D98A0B";
    g.fillText("★ " + t("ui.estrelasConta", { n: c.nEstrelas(), t: c.ESTRELAS_MAX }), 90, 560);
    g.fillStyle = "#7B4DE0"; g.fillText("◆ " + t("ui.cartasConta", { n: c.nCartas(), t: c.CARTAS.length }), 90, 606);
    g.fillStyle = "#6B7590"; g.font = "500 22px 'IBM Plex Sans', sans-serif";
    g.fillText(t("pub.data") + ": " + new Date().toLocaleDateString(c.locale, { day: "2-digit", month: "long", year: "numeric" }), 90, 690);
    g.fillText(t("ui.desenvolvido") + " Thaisa Carvalho · genoevidence.com", 90, 760);
  }
})();
