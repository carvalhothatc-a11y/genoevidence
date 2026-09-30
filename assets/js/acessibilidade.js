/* GenoEvidence · acessibilidade (todas as páginas; carregado no <head>, logo depois do i18n.js)
   - Botão "Acessibilidade" abre um painel com: tamanho do texto, alto contraste, modo escuro,
     espaço entre letras, espaço entre linhas, fonte mais fácil de ler, leitura facilitada,
     destacar links e reduzir movimento.
   - As escolhas ficam salvas neste aparelho e valem em todas as páginas do app.
   - Também põe o atalho "Pular para o conteúdo" e um foco bem visível para quem navega pelo teclado.
   As classes ficam no <html> (ge-contraste, ge-escuro, ge-letras, ge-linhas, ge-fonte, ge-leitura,
   ge-links, ge-sem-animacao) e o tamanho do texto em --ge-zoom. Os outros scripts podem ouvir os
   eventos "ge-acessibilidade" e "ge-movimento" (este quando o movimento é ligado ou desligado). */
(function () {
  "use strict";
  var CHAVE = "ge-acessibilidade", html = document.documentElement;
  var CLASSE = { contraste: "ge-contraste", escuro: "ge-escuro", letras: "ge-letras", linhas: "ge-linhas", fonte: "ge-fonte", leitura: "ge-leitura", links: "ge-links", movimento: "ge-sem-animacao" };
  var OPCOES = [
    ["contraste", "Alto contraste"], ["escuro", "Modo escuro"], ["letras", "Mais espaço entre letras"], ["linhas", "Mais espaço entre linhas"],
    ["fonte", "Fonte mais fácil de ler"], ["leitura", "Leitura facilitada"], ["links", "Destacar links"], ["movimento", "Reduzir movimento"]
  ];
  var TAMANHOS = [0.9, 1, 1.15, 1.3, 1.5];
  var est = { tamanho: 1 };
  try { var salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}"); if (salvo && typeof salvo === "object") est = Object.assign(est, salvo); } catch (e) {}
  var t = function (s) { return window.GE_I18N ? window.GE_I18N.t(s) : s; };

  function aplicar() {
    Object.keys(CLASSE).forEach(function (k) { html.classList.toggle(CLASSE[k], !!est[k]); });
    var z = TAMANHOS[est.tamanho] || 1;
    html.style.setProperty("--ge-zoom", z);
    html.classList.toggle("ge-zoom", z !== 1);
    if (est.fonte && !document.getElementById("ge-fonte-legivel")) {
      var l = document.createElement("link"); l.id = "ge-fonte-legivel"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap";
      document.head.appendChild(l);
    }
  }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(est)); } catch (e) {} }
  aplicar();   // antes de a página aparecer, para não piscar

  var CSS =
    /* foco visível e atalho para o conteúdo */
    ":focus-visible{outline:3px solid #D97706!important;outline-offset:2px!important}" +
    ".ge-pular{position:fixed;left:12px;top:-60px;z-index:1000;background:#0F1730;color:#fff;font:600 15px/1 'IBM Plex Sans',system-ui,sans-serif;padding:12px 16px;border-radius:10px;text-decoration:none;transition:top .2s}" +
    ".ge-pular:focus{top:12px}" +
    /* tamanho do texto: amplia a página inteira, e o layout se reorganiza */
    "html.ge-zoom body > :not(.ge-a11y){zoom:var(--ge-zoom)}" +
    /* espaçamentos (valores da WCAG 1.4.12) */
    ".ge-letras body *{letter-spacing:.12em!important;word-spacing:.16em!important}" +
    ".ge-linhas body :is(p,li,dd,dt,blockquote,figcaption,label,td,th,h1,h2,h3,h4,h5,h6,small,span,a,b,strong,em,button,summary){line-height:1.9!important}" +
    ".ge-linhas body p{margin-bottom:1em}" +
    /* fonte mais fácil de ler */
    ".ge-fonte body,.ge-fonte body :not(svg):not(svg *):not(.ge-a11y-ico){font-family:'Atkinson Hyperlegible',Verdana,Tahoma,sans-serif!important}" +
    /* destacar links */
    ".ge-links a{text-decoration:underline!important;text-decoration-thickness:2px!important;text-underline-offset:3px!important}" +
    ".ge-links a:hover,.ge-links a:focus-visible{background:#FFE58F!important;color:#000!important}" +
    /* reduzir movimento: animações e transições acabam na hora */
    ".ge-sem-animacao *,.ge-sem-animacao *::before,.ge-sem-animacao *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}" +
    ".ge-sem-animacao{scroll-behavior:auto!important}" +
    /* leitura facilitada: sem enfeites, uma coluna, texto maior */
    ".ge-leitura #bgfx,.ge-leitura .bg-grid,.ge-leitura .hero-cena,.ge-leitura .flutuantes,.ge-leitura .blob,.ge-leitura .mapa,.ge-leitura .xp-canvas,.ge-leitura .art-art,.ge-leitura #artCanvas{display:none!important}" +
    ".ge-leitura main p,.ge-leitura main li{font-size:17.5px!important;line-height:1.75!important;max-width:68ch}" +
    ".ge-leitura .descobertas,.ge-leitura .como,.ge-leitura .rede,.ge-leitura .destaques{display:block!important}" +
    ".ge-leitura .dsc,.ge-leitura .como-palco,.ge-leitura .destaque-card{margin-bottom:16px}" +
    ".ge-leitura .como-palco,.ge-leitura .dsc-img,.ge-leitura .dc-img{display:none!important}" +
    /* modo escuro: só nas páginas claras (Início, Notícias, Temas, Revistas, Sobre, que têm body[data-pagina]);
       as páginas de estudo e as experiências já são escuras */
    "html.ge-escuro:has(body[data-pagina]){color-scheme:dark;--bg:#0B1020;--surface:#111831;--surface2:#1A2340;--ink:#EEF2FF;--ink2:#C9D2E6;--muted:#9AA6C2;--line:#27314F;" +
      "--accent:#FF5C7A;--accent-soft:#3A1422;--blue:#7C9CFF;--blue-soft:#16214A;--violet:#A58CFF;--violet-soft:#221640;--teal:#3FC1C9;--teal-soft:#0E2A2E;--amber:#FFB23F;--amber-soft:#2E2210;--ok:#5FD39A;--ok-soft:#0F2A1C;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35)}" +
    ".ge-escuro body[data-pagina]{background:var(--bg);color:var(--ink)}" +
    ".ge-escuro .hero-cine{background:radial-gradient(80% 70% at 80% 38%,#1B2A55 0%,#15123A 40%,rgba(11,16,32,0) 72%),#0B1020}" +
    ".ge-escuro .como-palco,.ge-escuro .mapa,.ge-escuro .rede{background:radial-gradient(circle at 50% 45%,#16203F,#0E1530)}" +
    ".ge-escuro .study-banner{background:linear-gradient(120deg,#16214A,#2A1330)!important}" +
    /* alto contraste: nas páginas claras, texto preto e bordas pretas; nas escuras, texto branco */
    "html.ge-contraste:has(body[data-pagina]){--ink:#000;--ink2:#000;--muted:#1A1A1A;--line:#000;--accent:#B0002A;--blue:#0033CC;--violet:#4B1FB0;--teal:#006B75;--amber:#7A4A00;--ok:#0B5A30}" +
    "html.ge-contraste.ge-escuro:has(body[data-pagina]){--ink:#FFF;--ink2:#FFF;--muted:#F0F0F0;--line:#FFF;--bg:#000;--surface:#000;--surface2:#111;--accent:#FF8FA3;--blue:#9DB6FF;--violet:#C9B8FF;--teal:#7FE3E9;--amber:#FFD27A;--ok:#8FF0BE}" +
    "html.ge-contraste:not(:has(body[data-pagina])){--ink:#000;--panel:#000;--panel2:#0A0A0A;--text:#FFF;--muted:#FFF;--dim:#E6E6E6;--line:#FFF;--line2:#FFF;" +
      "--xp-bg:#000;--xp-ink:#FFF;--xp-muted:#FFF;--xp-dim:#E6E6E6;--xp-line:rgba(255,255,255,.6);--xp-line2:#FFF}" +
    /* o painel */
    ".ge-a11y-bt{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:120;width:46px;height:46px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;background:#0F1730;color:#fff;box-shadow:0 6px 20px rgba(15,23,48,.3)}" +
    ".ge-a11y-bt svg{width:26px;height:26px}" +
    ".ge-a11y-bt.no-topo{position:relative;left:auto;bottom:auto;width:36px;height:36px;box-shadow:none;background:transparent;color:inherit;border:1px solid rgba(127,127,127,.28);flex:none}" +"@media (max-width:760px){.appbar-in .ge-a11y-bt.no-topo{margin-left:auto}.appbar-in .ge-a11y-bt.no-topo+.ge-idioma{margin-left:0}}" +"@media (max-width:420px){.appbar-in .ge-a11y-bt.no-topo~.icon-btn{display:none}}" +"@media (max-width:430px){.hud-in:has(.ge-a11y-bt) .brand b{display:none}}" +"@media (max-width:760px){html.ge-zoom .appbar-in .logo b,html.ge-zoom .appbar-in .icon-btn,html.ge-zoom .hud-in .brand b,html.ge-zoom .xp-marca small{display:none}html.ge-zoom .appbar-in,html.ge-zoom .hud-in{gap:10px}}" +
    ".ge-a11y-bt.no-topo svg{width:20px;height:20px}" +
    "@media (max-width:760px){body:has(#tabbar) .ge-a11y-bt:not(.no-topo){bottom:calc(var(--tabbar,64px) + 12px + env(safe-area-inset-bottom,0px))}}" +
    ".ge-a11y{position:fixed;left:14px;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:1001;width:min(360px,calc(100vw - 28px));max-height:min(78vh,640px);overflow:auto;background:#FFFFFF;color:#0F1730;border:1px solid #CBD2E1;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,48,.3);padding:16px;font:400 15px/1.4 'IBM Plex Sans',system-ui,sans-serif}" +
    "@media (max-width:760px){body:has(#tabbar) .ge-a11y{bottom:calc(var(--tabbar,64px) + 70px + env(safe-area-inset-bottom,0px))}}" +
    ".ge-a11y.no-topo{top:64px;bottom:auto;left:auto;right:12px;max-height:calc(100vh - 80px)}" +
    ".ge-a11y[hidden]{display:none}" +
    ".ge-a11y h2{margin:0;font:600 17px/1.2 'Unbounded',system-ui,sans-serif;letter-spacing:-.01em}" +
    ".ge-a11y .topo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}" +
    ".ge-a11y .fechar{width:34px;height:34px;border-radius:50%;border:0;background:#EEF1F7;color:#0F1730;font-size:16px;cursor:pointer}" +
    ".ge-a11y .tam{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #DDE2EC;border-radius:14px;margin-bottom:8px}" +
    ".ge-a11y .tam span{font-weight:600}" +
    ".ge-a11y .tam div{display:flex;align-items:center;gap:6px}" +
    ".ge-a11y .tam button{min-width:44px;height:40px;border-radius:10px;border:1px solid #CBD2E1;background:#F6F8FC;color:#0F1730;font:700 15px/1 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer}" +
    ".ge-a11y .tam output{min-width:52px;text-align:center;font:600 14px/1 'IBM Plex Mono',monospace}" +
    ".ge-a11y .op{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;margin:0 0 6px;border:1px solid #DDE2EC;border-radius:14px;background:#FFFFFF;color:#0F1730;font:500 15px/1.3 'IBM Plex Sans',system-ui,sans-serif;text-align:left;cursor:pointer;min-height:48px}" +
    ".ge-a11y .op i{flex:none;width:42px;height:24px;border-radius:999px;background:#CBD2E1;position:relative;transition:background .2s}" +
    ".ge-a11y .op i::after{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}" +
    ".ge-a11y .op[aria-checked='true']{border-color:#2F5BEA;background:#F1F4FF}" +
    ".ge-a11y .op[aria-checked='true'] i{background:#2F5BEA}" +
    ".ge-a11y .op[aria-checked='true'] i::after{transform:translateX(18px)}" +
    ".ge-a11y .rodape{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px}" +
    ".ge-a11y .rodape small{color:#4A5470;font-size:12.5px;line-height:1.35}" +
    ".ge-a11y .restaurar{flex:none;border:1px solid #CBD2E1;background:#fff;color:#0F1730;border-radius:999px;padding:9px 12px;font:600 13px/1 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer}" +
    ".ge-escuro .ge-a11y,.ge-escuro .ge-a11y .op,.ge-escuro .ge-a11y .restaurar{background:#111831;color:#EEF2FF;border-color:#27314F}" +
    ".ge-escuro .ge-a11y .tam,.ge-escuro .ge-a11y .tam button{border-color:#27314F}.ge-escuro .ge-a11y .tam button,.ge-escuro .ge-a11y .fechar{background:#1A2340;color:#EEF2FF}" +
    ".ge-escuro .ge-a11y .op[aria-checked='true']{background:#16214A;border-color:#7C9CFF}.ge-escuro .ge-a11y .rodape small{color:#C9D2E6}";

  var ICONE = '<svg class="ge-a11y-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M4 8.5l8 1.5 8-1.5M12 10v5M9 21l3-6 3 6"/></svg>';

  function montar() {
    if (document.getElementById("geA11y")) return;
    var st = document.createElement("style"); st.id = "ge-a11y-css"; st.textContent = CSS; document.head.appendChild(st);
    // atalho: pular para o conteúdo principal
    var main = document.querySelector("main");
    if (main) {
      if (!main.id) main.id = "conteudo";
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      var pular = document.createElement("a"); pular.className = "ge-pular"; pular.href = "#" + main.id; pular.textContent = t("Pular para o conteúdo");
      pular.setAttribute("data-sem-traducao", "");
      document.body.insertBefore(pular, document.body.firstChild);
    }
    var bt = document.createElement("button");
    bt.type = "button"; bt.className = "ge-a11y-bt"; bt.id = "geA11yBt"; bt.innerHTML = ICONE;
    bt.setAttribute("aria-label", t("Acessibilidade")); bt.setAttribute("title", t("Acessibilidade"));
    bt.setAttribute("aria-expanded", "false"); bt.setAttribute("aria-controls", "geA11y"); bt.setAttribute("data-sem-traducao", "");
    var painel = document.createElement("div");
    painel.className = "ge-a11y"; painel.id = "geA11y"; painel.hidden = true;
    painel.setAttribute("role", "dialog"); painel.setAttribute("aria-labelledby", "geA11yTit"); painel.setAttribute("data-sem-traducao", "");
    painel.innerHTML = '<div class="topo"><h2 id="geA11yTit">' + t("Acessibilidade") + '</h2><button type="button" class="fechar" aria-label="' + t("Fechar") + '">✕</button></div>' +
      '<div class="tam" role="group" aria-label="' + t("Tamanho do texto") + '"><span>' + t("Tamanho do texto") + '</span><div>' +
        '<button type="button" data-tam="-1" aria-label="' + t("Diminuir o texto") + '">A−</button><output aria-live="polite"></output>' +
        '<button type="button" data-tam="1" aria-label="' + t("Aumentar o texto") + '">A+</button></div></div>' +
      OPCOES.map(function (o) { return '<button type="button" class="op" role="switch" aria-checked="false" data-op="' + o[0] + '"><span>' + t(o[1]) + '</span><i aria-hidden="true"></i></button>'; }).join("") +
      '<div class="rodape"><small>' + t("As escolhas ficam salvas neste aparelho.") + '</small><button type="button" class="restaurar">' + t("Restaurar o padrão") + "</button></div>";
    // o botão fica na barra do topo, ao lado do idioma (solto no canto ele cobriria o conteúdo)
    var topo = document.querySelector(".xp-topo") || document.querySelector(".appbar-in") || document.querySelector(".hud-in");
    if (topo) {
      bt.classList.add("no-topo"); painel.classList.add("no-topo");
      var antes = topo.querySelector(".ge-idioma") || topo.querySelector(".xp-barra") || topo.querySelector(".icon-btn");
      topo.insertBefore(bt, antes && antes.parentNode === topo ? antes : null);
    } else document.body.appendChild(bt);
    document.body.appendChild(painel);

    var saida = painel.querySelector("output");
    function atualizar() {
      saida.textContent = Math.round((TAMANHOS[est.tamanho] || 1) * 100) + "%";
      painel.querySelectorAll(".op").forEach(function (b) { b.setAttribute("aria-checked", String(!!est[b.dataset.op])); });
      painel.querySelector('[data-tam="-1"]').disabled = est.tamanho <= 0;
      painel.querySelector('[data-tam="1"]').disabled = est.tamanho >= TAMANHOS.length - 1;
    }
    function mudou(mov) {
      aplicar(); salvar(); atualizar();
      if (est.leitura) document.querySelectorAll("details.mapa-lista").forEach(function (d) { d.open = true; });
      document.dispatchEvent(new CustomEvent("ge-acessibilidade", { detail: est }));
      if (mov) document.dispatchEvent(new CustomEvent("ge-movimento", { detail: !!est.movimento }));
    }
    function abrir(sim) {
      painel.hidden = !sim; bt.setAttribute("aria-expanded", String(sim));
      if (sim) {
        atualizar();
        if (bt.classList.contains("no-topo")) { var r = bt.getBoundingClientRect(); painel.style.top = Math.round(r.bottom + 8) + "px"; painel.style.maxHeight = "calc(100vh - " + Math.round(r.bottom + 20) + "px)"; }
        var p = painel.querySelector(".op, button"); if (p) p.focus();
      }
    }
    bt.addEventListener("click", function (e) { e.stopPropagation(); abrir(painel.hidden); });
    painel.addEventListener("click", function (e) {
      e.stopPropagation();
      var b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("fechar")) { abrir(false); bt.focus(); return; }
      if (b.dataset.tam) { est.tamanho = Math.max(0, Math.min(TAMANHOS.length - 1, est.tamanho + (+b.dataset.tam))); mudou(false); return; }
      if (b.dataset.op) { est[b.dataset.op] = !est[b.dataset.op]; mudou(b.dataset.op === "movimento"); return; }
      if (b.classList.contains("restaurar")) { var tinhaMov = !!est.movimento; est = { tamanho: 1 }; mudou(tinhaMov); }
    });
    document.addEventListener("click", function () { if (!painel.hidden) abrir(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !painel.hidden) { abrir(false); bt.focus(); } });
    if (est.leitura) document.querySelectorAll("details.mapa-lista").forEach(function (d) { d.open = true; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
  window.GE_A11Y = { estado: function () { return est; } };
})();
