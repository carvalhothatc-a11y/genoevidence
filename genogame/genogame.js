/* GenoGame · uma jornada no laboratório com o Geninho
   - O laboratório é um prédio visto em corte: 1º andar, térreo e subsolo, com elevador.
   - A Fase 1 do jogo tem dez etapas (fases.js). Cada etapa mostra um objetivo por vez e termina com uma ação de
     verdade, e dá uma medalha. No fim das dez etapas vem o certificado da Fase 1 (certificado.js), em PDF e PNG.
   - O Geninho (geninho.js) anda até onde se toca, ou com as setas, e usa o que estiver perto (toque, clique ou
     Enter). Ele caminha até o ponto certo, vira para o objeto e faz o gesto: pega, carrega, coloca, aperta.
   - Os materiais (tubos, lâmina, placa, caderno) saem do lugar, vão na palma da mão dele e ficam onde ele põe.
   - Regras de comando: um toque novo durante a caminhada troca o destino; durante um gesto (pegar, colocar,
     elevador), o último pedido espera o gesto acabar; com fala ou painel aberto, ele não se mexe sozinho.
   - Textos em textos.js, nos três idiomas do app. O progresso fica salvo só neste aparelho (localStorage).
   - Sem som (regra do app). Respeita "reduzir movimento" e o modo escuro do painel de acessibilidade. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const html = document.documentElement;
  const I = window.GE_I18N || { lang: "pt", locale: "pt-BR", t: s => s, montarSeletor: () => {} };
  const LANG = window.GG_TX[I.lang] ? I.lang : "pt";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // versão kids: textos mais curtos (chaves terminadas em "_kids") e tudo em letra maiúscula (genogame.css)
  let KIDS = false;
  function t(k, v) {
    const L = GG_TX[LANG];
    let s = (KIDS && L[k + "_kids"]) || L[k]; if (s == null) s = GG_TX.pt[k]; if (s == null) return k;
    return v ? s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)) : s;
  }
  const TOQUE = matchMedia("(pointer: coarse)").matches;
  const tt = (k, v) => (TOQUE && (GG_TX[LANG][k + "_toque"] || GG_TX.pt[k + "_toque"]) ? t(k + "_toque", v) : t(k, v));
  const semTags = s => String(s).replace(/<[^>]+>/g, "");
  // ?teste: animações por relógio comum (para testar com a aba em segundo plano, onde o navegador pausa as animações)
  // (com o painel oculto, os relógios também ficam lentos; por isso o laço usa mensagens, que não são freadas)
  if (/[?&]teste\b/.test(location.search)) window.requestAnimationFrame = cb => {
    const quando = performance.now() + 16, canal = new MessageChannel();
    canal.port1.onmessage = () => { if (performance.now() >= quando) cb(performance.now()); else canal.port2.postMessage(0); };
    canal.port2.postMessage(0); return 0;
  };
  const rm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || html.classList.contains("ge-sem-animacao");
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const z2 = n => String(n).padStart(2, "0");
  const { FASES, ITENS } = window.GG_FASES;

  /* ---------------- progresso (só neste aparelho) ----------------
     v2 (jornada em dez fases) guarda: fases concluídas com data e registro, etapas, materiais e o que está
     na mão, além de tudo o que a versão anterior já guardava (experimentos, estrelas, cartas, nome). */
  const CHAVE = "genogame-v1";
  const NOVO = () => ({ v: 2, feitos: {}, cartas: {}, vistos: {}, cracha: false, epi: false, andar: "T", x: 160, nome: "", publicado: false, intro: false,
    fases: {}, etapas: {}, itens: {}, mao: null, maoDe: null, jornada: null, falas: {}, kids: false, retomar: {} });
  let E = NOVO(), versaoSalva = 2;
  try { const s = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (s && typeof s === "object") { versaoSalva = s.v || 1; E = Object.assign(NOVO(), s); } } catch (e) {}
  ["feitos", "cartas", "vistos", "fases", "etapas", "itens", "falas", "retomar"].forEach(k => { if (!E[k] || typeof E[k] !== "object") E[k] = {}; });
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) {} };
  function aplicarKids() { KIDS = !!E.kids; html.classList.toggle("gg-kids", KIDS); if (KIDS && typeof maiusculas === "function") maiusculas(document.getElementById("gg")); }
  // versão kids: o CSS já põe tudo em maiúscula; os textos desenhados nas cenas (SVG) são trocados aqui também,
  // porque nem todo navegador aplica o CSS a eles (o Safari, por exemplo). Só textos sem outros elementos dentro.
  const caixaAlta = s => String(s).toLocaleUpperCase(I.locale);
  function maiusculas(raiz) {
    if (!KIDS || !raiz) return;
    const lista = raiz.tagName && raiz.tagName.toLowerCase() === "text" ? [raiz] : raiz.querySelectorAll ? raiz.querySelectorAll("text") : [];
    lista.forEach(el => { if (el.children.length) return; const u = caixaAlta(el.textContent); if (u !== el.textContent) el.textContent = u; });
  }
  new MutationObserver(ms => {
    if (!KIDS) return;
    ms.forEach(m => {
      if (m.type === "characterData") { const pai = m.target.parentNode; if (pai && pai.tagName && pai.tagName.toLowerCase() === "text") maiusculas(pai); }
      else m.addedNodes.forEach(n => { if (n.nodeType === 1) maiusculas(n); else if (n.parentNode && n.parentNode.tagName && n.parentNode.tagName.toLowerCase() === "text") maiusculas(n.parentNode); });
    });
  }).observe(document.getElementById("gg"), { subtree: true, childList: true, characterData: true });
  aplicarKids();
  const hoje = () => { const d = new Date(); return d.getFullYear() + "-" + z2(d.getMonth() + 1) + "-" + z2(d.getDate()); };
  // registro local: um código para identificar a conquista neste aparelho (não há validação pública)
  function novoRegistro(pref) {
    const AL = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", a = new Uint8Array(8);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 8; i++) a[i] = Math.random() * 256; }
    const s = [...a].map(b => AL[b % AL.length]).join("");
    return "GG-" + pref + "-" + s.slice(0, 4) + "-" + s.slice(4);
  }
  // progresso da versão anterior: cada fase já feita é reconhecida, com a data de hoje como data de reconhecimento
  if (versaoSalva < 2) {
    const antes = { 1: !!E.feitos.epi || !!(E.vistos.mural && E.vistos.epi), 2: !!E.feitos.epi, 3: !!E.feitos.dna, 4: !!E.feitos.pcr, 5: !!E.feitos.gel,
      6: !!E.feitos.micro, 7: !!E.feitos.bacterias, 8: !!E.feitos.bio, 9: !!E.feitos.freezer, 10: !!E.publicado };
    let n = 0;
    Object.keys(antes).forEach(k => { if (antes[k] && !E.fases[k]) { E.fases[k] = { data: hoje(), id: novoRegistro("F" + z2(k)), reconhecida: true }; n++; } });
    if (E.fases[1]) { E.etapas.mural = true; E.etapas.armario = true; }
    if (n) E.migrou = n;
    E.v = 2;
  }
  (function arrumarItens() {
    const padrao = GG_FASES.itensPadrao(E);
    Object.keys(padrao).forEach(k => { if (!(k in E.itens)) E.itens[k] = padrao[k]; });
    // um material só pode estar num lugar: se a mão não confere, ele volta para onde estava
    Object.keys(E.itens).forEach(k => { if (E.itens[k] === "mao" && E.mao !== k) E.itens[k] = padrao[k] === "mao" ? "origem" : padrao[k]; });
    if (E.mao && E.itens[E.mao] !== "mao") E.mao = null;
    if (E.fases[1]) E.itens.caderno = "bolso";
  })();
  salvar();

  const TAREFAS = ["epi", "dna", "pcr", "gel", "micro", "bacterias", "bio", "freezer"];
  const CARTAS = [["epi", "#D98A0B"], ["dna", "#7B4DE0"], ["pcr", "#E0385A"], ["gel", "#2F5BEA"], ["micro", "#0E9AA7"], ["bacterias", "#14864A"], ["bio", "#7B4DE0"],
    ["freezer", "#2F5BEA"], ["mosca", "#E0385A"], ["chuveiro", "#14864A"], ["planta", "#14864A"], ["revistas", "#D98A0B"], ["nitrogenio", "#0E9AA7"], ["autoclave", "#6B7590"]];
  const COR_CARTA = Object.fromEntries(CARTAS);
  const ESTRELAS_MAX = TAREFAS.length * 3;
  const nEstrelas = () => TAREFAS.reduce((a, id) => a + (+E.feitos[id] || 0), 0);
  const nCartas = () => CARTAS.filter(c => E.cartas[c[0]]).length;
  const faseAtual = () => FASES.find(f => !E.fases[f.n]) || null;
  const objetivoAtual = () => { const f = faseAtual(); return f ? f.objetivos.find(o => !o.feito(E)) || null : null; };
  const nFases = () => FASES.filter(f => E.fases[f.n]).length;
  const nomeFase = n => t("fase." + n + ".nome");
  const dataLocal = iso => { const [a, m, d] = String(iso || hoje()).split("-").map(Number); return new Date(a, m - 1, d).toLocaleDateString(I.locale, { day: "numeric", month: "long", year: "numeric" }); };

  /* ---------------- ícones ---------------- */
  const IC = {
    epi: '<path d="M24 6l14 5v11c0 9-6 16-14 20-8-4-14-11-14-20V11z"/><path d="M17 24l5 5 9-10"/>',
    dna: '<path d="M16 6c0 9 16 9 16 18s-16 9-16 18M32 6c0 9-16 9-16 18s16 9 16 18M18 11h12M21 17h6M21 31h6M18 37h12"/>',
    pcr: '<path d="M20 29V10a4 4 0 0 1 8 0v19"/><circle cx="24" cy="34" r="6"/><path d="M24 30V18M33 12h6M33 19h4M33 26h6"/>',
    gel: '<rect x="9" y="7" width="30" height="34" rx="4"/><path d="M14 13h6M28 13h6M14 20h6M14 27h6M28 25h6M14 34h6"/>',
    micro: '<path d="M14 41h22M20 41v-5h12"/><path d="M26 36c7-2 10-9 7-16"/><path d="M15 16l7-8 5 4-7 8z"/><path d="M22 22l4 6"/>',
    bacterias: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="8" stroke-dasharray="3 3"/><circle cx="24" cy="24" r="2.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="34" cy="31" r="1.5"/><circle cx="33" cy="14" r="1.5"/>',
    bio: '<rect x="7" y="9" width="34" height="23" rx="3"/><path d="M17 40h14M24 32v8M13 17h5M21 17h9M13 24h9M25 24h6"/>',
    freezer: '<path d="M24 6v36M8.5 15l31 18M8.5 33l31-18M19 9l5 4 5-4M19 39l5-4 5 4"/>',
    mosca: '<ellipse cx="24" cy="28" rx="5" ry="9"/><circle cx="24" cy="16" r="4"/><path d="M20 24c-9-6-14-1-12 4 2 4 8 2 12-2M28 24c9-6 14-1 12 4-2 4-8 2-12-2M21 13l-4-5M27 13l4-5"/>',
    chuveiro: '<path d="M10 8h14v7"/><path d="M17 15h14l-3 6H20z"/><path d="M20 26l-2 5M24 26v6M28 26l2 5M18 36l-1 3M24 37v3M30 36l1 3"/>',
    planta: '<path d="M24 42V20"/><path d="M24 30c-8 0-12-4-13-10 7 0 12 3 13 10zM24 26c7 0 10-4 11-9-6 0-10 3-11 9z"/><circle cx="24" cy="15" r="3"/><circle cx="18" cy="10" r="2"/><circle cx="30" cy="10" r="2"/>',
    revistas: '<path d="M9 40h30"/><rect x="11" y="10" width="6" height="30" rx="1"/><rect x="19" y="14" width="6" height="26" rx="1"/><path d="M28 16l6-2 6 25-6 2z"/>',
    nitrogenio: '<path d="M19 10h10v6c5 2 8 7 8 12v12H11V28c0-5 3-10 8-12z"/><path d="M16 4c2 2-2 3 0 5M24 3c2 2-2 3 0 5M32 4c2 2-2 3 0 5"/>',
    autoclave: '<rect x="7" y="9" width="34" height="32" rx="5"/><circle cx="24" cy="25" r="10"/><path d="M24 15v20M14 25h20M17 18l14 14M31 18L17 32"/>',
    bussola: '<circle cx="24" cy="24" r="17"/><path d="M30 18l-4 10-10 4 4-10z"/><circle cx="24" cy="24" r="1.6"/><path d="M24 7v3M24 38v3M7 24h3M38 24h3"/>',
    artigo: '<path d="M13 6h16l8 8v28H13z"/><path d="M29 6v8h8M18 21h14M18 27h14M18 33h9"/>',
    livro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v2.5H6.5"/><path d="M9 7h7M9 11h5"/>',
    medalha: '<circle cx="12" cy="15" r="6"/><path d="M9 10L6 3h4l2 4M15 10l3-7h-4l-2 4"/>',
    mao: '<path d="M7 12V7.5a1.5 1.5 0 0 1 3 0V11M10 10V5.5a1.5 1.5 0 0 1 3 0V11M13 10.5V7a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L3 13.5a1.4 1.4 0 0 1 2.2-1.7L7 14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    seta: '<path d="M9 6l6 6-6 6"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    baixar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    compartilhar: '<path d="M12 3v12M8 7l4-4 4 4M6 12v7h12v-7"/>'
  };
  const icone = (n, vb) => '<svg viewBox="0 0 ' + (vb || 48) + " " + (vb || 48) + '" fill="none" stroke="currentColor" stroke-width="' + (vb === 24 ? 2 : 2.6) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + "</svg>";
  const estrela = on => '<svg viewBox="0 0 24 24" class="' + (on ? "on" : "") + '" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4-4.7-4.4 6.4-.8z" fill="' + (on ? "#FFB23F" : "none") + '" style="stroke:' + (on ? "#D98A0B" : "var(--line)") + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  // miniatura de um material (para o painel, o chip "na mão" e o certificado)
  const miniItem = id => '<svg viewBox="-36 -40 72 44" aria-hidden="true">' + ITENS[id].desenho(E.itens[id]) + "</svg>";

  /* medalha de cada fase: fita, disco dourado, ícone da descoberta e o número da fase */
  function medalhaSVG(f, bloqueada) {
    const c = bloqueada ? "#AEB6CA" : f.cor, g = "mo" + f.n + (bloqueada ? "b" : "");
    const ouro = bloqueada ? ["#E3E7F0", "#CBD1DF", "#AEB6CA"] : ["#FFE29A", "#F2B840", "#D98A0B"];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 124" width="200" height="248" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + ouro[0] + '"/><stop offset=".5" stop-color="' + ouro[1] + '"/><stop offset="1" stop-color="' + ouro[2] + '"/></linearGradient></defs>' +
      '<path d="M27 2h19l12 42H39z" fill="' + c + '"/><path d="M73 2H54L42 44h19z" fill="' + c + '" opacity=".72"/><path d="M27 2h19l3 9H30z" fill="#fff" opacity=".25"/>' +
      '<circle cx="50" cy="80" r="41" fill="url(#' + g + ')"/><circle cx="50" cy="80" r="34" fill="' + c + '"/>' +
      '<circle cx="50" cy="80" r="30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="3 3"/>' +
      '<g transform="translate(31 61) scale(.79)" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + (bloqueada ? '<g transform="translate(12 12)"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g>' : IC[f.icone]) + "</g>" +
      '<circle cx="81" cy="47" r="13" fill="#fff" stroke="' + c + '" stroke-width="3"/>' +
      '<text x="81" y="52.2" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="' + (f.n > 9 ? 12.5 : 15) + '" fill="' + c + '">' + f.n + "</text></svg>";
  }

  /* ---------------- o prédio ---------------- */
  const PISO = 520;                       // altura do chão dentro de cada andar
  const Y0 = { "1": 0, T: 600, S: 1200 };  // topo de cada andar no mundo
  const ANDARES = ["1", "T", "S"];
  const EX = 1040;                        // onde o Geninho fica para entrar no elevador
  const LIM = { "1": [40, 1960], T: [-430, 1960], S: [40, 1960] };
  const ESCALA = 1.12;                    // Geninho ≈ 188 de altura: bancada na altura do peito, porta um pouco acima da cabeça
  const MAO_X = Math.round(-GG_RIG.MAO_MUNDO * ESCALA);   // distância do centro do Geninho até a palma (≈ 70)

  // objetos que dá para usar: x = onde o Geninho para; caixa = área de toque (no andar)
  const HOT = [
    { id: "porta", andar: "T", x: 60, caixa: [-44, 292, 84, 228] },
    { id: "mural", andar: "T", x: 120, caixa: [38, 188, 196, 152] },
    { id: "epi", andar: "T", x: 360, caixa: [246, 214, 228, 306], exp: true },
    { id: "chuveiro", andar: "T", x: 556, caixa: [494, 130, 124, 390] },
    { id: "dna", andar: "T", x: 800, caixa: [624, 256, 322, 264], exp: true },
    { id: "elevador", andar: "T", x: EX, caixa: [960, 244, 160, 276] },
    { id: "pcr", andar: "T", x: 1190, caixa: [1140, 290, 322, 230], exp: true },
    { id: "gel", andar: "T", x: 1640, caixa: [1478, 264, 484, 256], exp: true },
    { id: "micro", andar: "1", x: 150, caixa: [56, 250, 370, 270], exp: true },
    { id: "planta", andar: "1", x: 520, caixa: [444, 244, 152, 276] },
    { id: "bacterias", andar: "1", x: 660, caixa: [620, 166, 322, 354], exp: true },
    { id: "elevador", andar: "1", x: EX, caixa: [960, 244, 160, 276] },
    { id: "bio", andar: "1", x: 1250, caixa: [1140, 206, 440, 314], exp: true },
    { id: "revistas", andar: "1", x: 1680, caixa: [1598, 196, 166, 324] },
    { id: "jaleco", andar: "1", x: 1826, caixa: [1830, 240, 104, 280] },
    { id: "autoclave", andar: "S", x: 220, caixa: [62, 200, 300, 320] },
    { id: "nitrogenio", andar: "S", x: 480, caixa: [400, 250, 162, 270] },
    { id: "freezer", andar: "S", x: 620, caixa: [600, 160, 342, 360], exp: true },
    { id: "elevador", andar: "S", x: EX, caixa: [960, 244, 160, 276] },
    { id: "quadro", andar: "S", x: 1540, caixa: [1466, 206, 148, 160] }
  ];
  HOT.forEach((h, i) => { h.n = i; });
  const H = id => HOT.find(h => h.id === id);
  const HA = (id, an) => HOT.find(h => h.id === id && h.andar === an);
  // altura das placas sobre cada área (o marcador da missão fica acima delas)
  const PLACA_Y = { mural: 160, epi: 226, dna: 196, gel: 220, micro: 214, bacterias: 172, bio: 216, revistas: 172, freezer: 166, autoclave: 214 };
  // em qual objeto do laboratório fica cada lugar dos materiais
  const HOT_DO_LUGAR = { "caderno.origem": "mural", "morangos.origem": "dna", "morangos.bancada": "dna", "tuboDNA.suporte": "dna", "tuboDNA.termo": "pcr", "tuboDNA.gel": "gel",
    "tuboRes.suporte": "dna", "tuboRes.freezer": "freezer", "lamina.caixa": "micro", "lamina.micro": "micro", "placa.estufa": "bacterias", "placa.cabine": "bacterias", "foto.doc": "gel" };

  const placa = (cx, y, txt, cor) => {
    const w = txt.length * 8.4 + (cor ? 44 : 28);
    return '<g><rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="26" rx="7" class="c-placa"/>' +
      (cor ? '<rect x="' + (cx - w / 2 + 10) + '" y="' + (y + 9) + '" width="8" height="8" rx="2" fill="' + cor + '"/>' : "") +
      '<text x="' + (cx + (cor ? 8 : 0)) + '" y="' + (y + 17.5) + '" text-anchor="middle" font-size="12.5" class="t-placa" letter-spacing=".5">' + esc(txt) + "</text></g>";
  };
  function bancada(x1, x2) {
    const w = x2 - x1;
    let s = '<rect x="' + (x1 + 2) + '" y="512" width="' + (w - 4) + '" height="9" rx="4" class="c-sombra2"/><rect x="' + (x1 + 6) + '" y="412" width="' + (w - 12) + '" height="106" class="c-armario"/>';
    const n = Math.max(1, Math.round((w - 12) / 92)), pw = (w - 12) / n;
    for (let i = 0; i < n; i++) s += '<rect x="' + (x1 + 6 + i * pw + 4) + '" y="418" width="' + (pw - 8) + '" height="94" rx="4" class="c-armario2" opacity=".6"/><rect x="' + (x1 + 6 + i * pw + pw / 2 - 13) + '" y="428" width="26" height="4.5" rx="2.2" class="c-metal2"/>';
    return s + '<rect x="' + x1 + '" y="398" width="' + w + '" height="14" rx="4" class="c-bancada"/><rect x="' + x1 + '" y="409" width="' + w + '" height="3" class="c-bancada2"/><rect x="' + (x1 + 4) + '" y="398" width="' + (w - 8) + '" height="2.5" rx="1.2" fill="#fff" opacity=".5"/>';
  }
  const lampada = x => '<rect x="' + (x - 42) + '" y="22" width="84" height="7" rx="3" class="c-metal"/><rect x="' + (x - 36) + '" y="28" width="72" height="3.5" rx="1.6" fill="#FFF3CF"/>' +
    '<path class="cone" d="M' + (x - 36) + " 31L" + (x + 36) + " 31L" + (x + 130) + " 520L" + (x - 130) + ' 520Z" fill="url(#gLuz)"/><ellipse class="poca" cx="' + x + '" cy="521" rx="140" ry="9" fill="url(#gPoca)"/>';
  let NJ = 0;
  function janela(x, y, w, h) {
    const id = "jc" + (NJ++), cx = x + w / 2;
    return '<clipPath id="' + id + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"/></clipPath>' +
      '<rect x="' + (x - 7) + '" y="' + (y - 7) + '" width="' + (w + 14) + '" height="' + (h + 14) + '" rx="8" class="c-metal"/>' +
      '<g clip-path="url(#' + id + ')"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#gCeu)"/>' +
      '<g class="pais" data-cx="' + cx + '" data-w="' + w + '"><use href="#ceuCoisas" x="' + (cx - 450) + '" y="' + y + '"/><use href="#cidade" x="' + (cx - 450) + '" y="' + (y + h - 118) + '"/></g>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#gVidro)"/></g>' +
      '<path d="M' + cx + " " + y + "v" + h + "M" + x + " " + (y + h * 0.42) + "h" + w + '" stroke="var(--w-metal)" stroke-width="5"/>' +
      '<rect x="' + (x - 12) + '" y="' + (y + h + 6) + '" width="' + (w + 24) + '" height="8" rx="3" class="c-bancada"/>';
  }
  function cidade() {
    // horizonte genérico de prédios (900 de largura, base em y=118), com janelas que acendem à noite
    let s = "", x = 0, seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    while (x < 900) {
      const w = 40 + rnd() * 60, h = 30 + rnd() * 80, c = rnd() > 0.5 ? "c-cidade" : "c-cidade2";
      s += '<rect x="' + x.toFixed(1) + '" y="' + (118 - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" class="' + c + '"/>';
      for (let yy = 118 - h + 8; yy < 110; yy += 14) for (let xx = x + 7; xx < x + w - 8; xx += 12) if (rnd() > 0.55) s += '<rect class="acesa" x="' + xx.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="5" height="6" fill="#FFD27A"/>';
      x += w + 4;
    }
    let ceu = "";
    for (let i = 0; i < 26; i++) ceu += '<circle class="estrela" cx="' + (rnd() * 900).toFixed(1) + '" cy="' + (8 + rnd() * 120).toFixed(1) + '" r="' + (0.8 + rnd() * 1.3).toFixed(1) + '" fill="#fff"/>';
    ceu += '<g class="lua"><circle cx="560" cy="24" r="13" fill="#F6F1D8"/><circle cx="555" cy="21" r="2.6" fill="#E6DFC0"/><circle cx="564" cy="29" r="2" fill="#E6DFC0"/></g>';
    ceu += '<g class="nuvens"><g class="nuvem"><path d="M120 60a16 16 0 0 1 30-6a14 14 0 0 1 26 8h-60z" fill="#fff" opacity=".85"/></g><g class="nuvem" style="animation-delay:-35s"><path d="M560 40a14 14 0 0 1 26-5a12 12 0 0 1 22 7h-52z" fill="#fff" opacity=".8"/></g></g>';
    return '<g id="cidade">' + s + '</g><g id="ceuCoisas">' + ceu + "</g>";
  }
  function andarBase(an) {
    let s = '<rect x="0" y="22" width="2000" height="498" class="c-parede"/>' +
      // painéis na parede e a sombra suave onde a parede encontra o chão (dão profundidade)
      [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="' + (i * 250 + 8) + '" y="40" width="234" height="420" rx="6" class="c-painel"/>').join("") +
      '<rect x="0" y="472" width="2000" height="36" class="c-parede2"/><rect x="0" y="508" width="2000" height="12" class="c-rodape"/><rect x="0" y="486" width="2000" height="34" fill="url(#gAO)"/>';
    for (let x = 130; x < 2000; x += 260) if (x < 940 || x > 1140) s += lampada(x);
    s += '<rect x="-26" y="0" width="2052" height="22" class="c-laje"/><rect x="0" y="22" width="2000" height="4" class="c-teto"/>';
    s += '<rect x="-26" y="520" width="2052" height="80" class="c-laje"/><rect x="0" y="520" width="2000" height="8" class="c-piso"/><rect x="0" y="520" width="2000" height="3" fill="#fff" opacity=".35"/><path d="M-26 556H2026M-26 578H2026" stroke="var(--w-laje2)" stroke-width="2"/>';
    s += '<rect x="2000" y="0" width="26" height="600" class="c-laje"/>';
    if (an !== "T") s += '<rect x="-26" y="0" width="26" height="600" class="c-laje"/>';
    else s += '<rect x="-26" y="0" width="26" height="292" class="c-laje"/><rect x="-26" y="520" width="26" height="80" class="c-laje"/><rect x="-22" y="292" width="18" height="6" class="c-metal2"/>' +
      '<rect id="portaVidro" x="-16" y="298" width="7" height="222" rx="2" class="c-vidro" stroke="var(--w-metal2)" stroke-width="1.5"/>';
    // elevador
    s += '<rect x="960" y="26" width="160" height="494" class="c-parede2"/><rect x="972" y="284" width="136" height="236" rx="4" class="c-metal2"/>' +
      '<clipPath id="ecl' + an + '"><rect x="980" y="292" width="120" height="228"/></clipPath>' +
      '<g clip-path="url(#ecl' + an + ')"><rect x="980" y="292" width="120" height="228" fill="#FFF6DA"/><rect x="980" y="292" width="120" height="228" fill="url(#gLuz)" opacity=".6"/>' +
      '<g class="pe-esq" data-andar="' + an + '"><rect x="980" y="292" width="60" height="228" class="c-metal"/><path d="M1036 300v212" stroke="var(--w-metal2)" stroke-width="2"/></g>' +
      '<g class="pe-dir" data-andar="' + an + '"><rect x="1040" y="292" width="60" height="228" class="c-metal"/><path d="M1044 300v212" stroke="var(--w-metal2)" stroke-width="2"/></g></g>' +
      '<rect x="990" y="246" width="100" height="28" rx="7" class="c-tela"/>' +
      ANDARES.map((a, i) => '<text class="ind" data-ind="' + a + '" x="' + (1010 + i * 30) + '" y="265" text-anchor="middle" font-size="14" fill="#5A6488">' + a + "</text>").join("") +
      '<rect x="1110" y="380" width="8" height="30" rx="3" class="c-metal2"/><circle cx="1114" cy="388" r="2.4" fill="#5FD39A"/><circle cx="1114" cy="401" r="2.4" fill="#5FD39A"/>';
    return s;
  }
  const brilho = (x, y) => '<g transform="translate(' + x + "," + y + ')"><path class="brilho" d="M0 -9L2.5 -2.5L9 0L2.5 2.5L0 9L-2.5 2.5L-9 0L-2.5 -2.5Z" fill="#FFB23F"/></g>';
  function hot(h, arte) {
    const [x, y, w, hh] = h.caixa;
    return '<g class="hot" data-hot="' + h.n + '" tabindex="-1" role="button" aria-label="' + esc(t("obj." + h.id)) + '">' +
      '<rect class="hit" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="14"/><g class="arte">' + arte + "</g>" + brilho(x + w / 2, y - 6) + "</g>";
  }

  /* ----- térreo ----- */
  function terreo() {
    let s = andarBase("T");
    s += janela(1520, 92, 190, 176) + janela(660, 64, 230, 112);
    s += '<rect x="6" y="514" width="90" height="6" rx="3" fill="#7B4DE0" opacity=".35"/>';
    // mural de avisos (o caderno fica preso nele: é um material, desenhado à parte)
    s += hot(HA("mural", "T"), '<rect x="40" y="200" width="192" height="132" rx="8" fill="#C98B4E"/><rect x="48" y="208" width="176" height="116" rx="5" fill="#E2B27C"/>' +
      '<rect x="60" y="218" width="58" height="72" rx="2" fill="#fff" transform="rotate(-3 89 254)"/><path d="M68 232h40M68 242h34M68 252h40M68 262h28M68 272h36" stroke="#9AA3BA" stroke-width="2.5" transform="rotate(-3 89 254)"/>' +
      '<rect x="130" y="222" width="80" height="50" rx="2" fill="#FDEBEF"/><path d="M138 236h60M138 246h44M138 256h52" stroke="#E0385A" stroke-width="2.5" opacity=".7"/>' +
      '<rect x="128" y="282" width="40" height="34" rx="2" fill="#ECF1FE"/><path d="M134 292h28M134 300h20" stroke="#2F5BEA" stroke-width="2" opacity=".6"/><rect x="188" y="282" width="6" height="6" rx="3" fill="#E0385A"/>' +
      '<circle cx="89" cy="219" r="4" fill="#E0385A"/><circle cx="170" cy="223" r="4" fill="#2F5BEA"/><circle cx="148" cy="283" r="4" fill="#14864A"/>') + placa(136, 160, t("placa.mural"));
    // armários de EPI
    let arm = "";
    for (let i = 0; i < 4; i++) {
      const x = 252 + i * 55;
      arm += '<rect x="' + x + '" y="262" width="52" height="256" rx="4" class="c-metal"/><rect x="' + (x + 6) + '" y="272" width="40" height="236" rx="3" class="c-metal2" opacity=".35"/>' +
        '<path d="M' + (x + 14) + " 286h24M" + (x + 14) + " 294h24M" + (x + 14) + ' 302h24" stroke="var(--w-metal2)" stroke-width="3"/><rect x="' + (x + 40) + '" y="380" width="5" height="22" rx="2" class="c-escuro"/>';
    }
    // o último armário abre: dentro, óculos e luvas (somem quando o Geninho os veste)
    arm += '<g id="armarioAberto"><rect x="417" y="268" width="44" height="244" rx="3" class="c-escuro"/><rect x="421" y="330" width="36" height="4" class="c-metal"/><rect x="421" y="420" width="36" height="4" class="c-metal"/>' +
      '<g id="epiDentro"><rect x="424" y="304" width="14" height="10" rx="4" fill="rgba(170,220,255,.7)" stroke="#E6E9F0" stroke-width="2"/><rect x="440" y="304" width="14" height="10" rx="4" fill="rgba(170,220,255,.7)" stroke="#E6E9F0" stroke-width="2"/>' +
      '<rect x="424" y="392" width="30" height="28" rx="3" fill="#4F86F0"/><path d="M430 392c0-6 18-6 18 0" fill="#7FA6F5"/><path d="M424 488h30l-3 -16h-24z" fill="#2A3350"/></g>' +
      '<path d="M461 268l26 10v232l-26 2z" class="c-metal"/></g>' +
      '<g id="armarioFechado"><rect x="417" y="262" width="52" height="256" rx="4" class="c-metal"/><rect x="423" y="272" width="40" height="236" rx="3" class="c-metal2" opacity=".35"/>' +
      '<path d="M431 286h24M431 294h24M431 302h24" stroke="var(--w-metal2)" stroke-width="3"/><rect x="457" y="380" width="5" height="22" rx="2" class="c-escuro"/></g>';
    s += hot(HA("epi", "T"), arm) + placa(360, 226, t("placa.epi"), "#D98A0B");
    // chuveiro de emergência e lava-olhos
    s += hot(HA("chuveiro", "T"), '<rect x="552" y="22" width="9" height="136" fill="#16A34A"/><path d="M536 158h41l-8 12h-25z" fill="#16A34A"/><circle cx="556" cy="172" r="3" fill="#16A34A"/>' +
      '<path d="M570 166v118" stroke="#16A34A" stroke-width="3"/><path d="M562 284h16l-8 14z" fill="none" stroke="#16A34A" stroke-width="4" stroke-linejoin="round"/>' +
      '<g id="aguaChuveiro" opacity="0"><path class="agua-cai" d="M542 174V518M550 174V518M558 174V518M566 174V518" stroke="#7FB4FF" stroke-width="2.6" stroke-dasharray="12 12"/></g>' +
      '<rect x="524" y="418" width="64" height="8" rx="4" fill="#16A34A"/><path d="M528 412q28 16 56 0z" fill="#16A34A"/><rect x="552" y="426" width="8" height="92" fill="#16A34A"/><rect x="540" y="512" width="32" height="6" rx="3" fill="#16A34A"/>' +
      '<rect x="586" y="196" width="34" height="34" rx="5" fill="#16A34A"/><path d="M594 206h12v6h-8l-4 4M598 218l-1 4M603 218v5M608 218l1 4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>');
    // bancada de extração de DNA (os morangos e os tubos de DNA são materiais, desenhados à parte)
    let dna = '<rect x="650" y="276" width="270" height="7" rx="3" class="c-bancada2"/><rect x="650" y="336" width="270" height="7" rx="3" class="c-bancada2"/>';
    [[664, "#D98A0B"], [690, "#2F5BEA"], [716, "#9AA3BA"], [748, "#E0385A"], [790, "#14864A"], [826, "#7B4DE0"], [866, "#D98A0B"], [896, "#0E9AA7"]].forEach(([x, c], i) => {
      const hh = 26 + (i % 3) * 8; dna += '<rect x="' + x + '" y="' + (276 - hh) + '" width="18" height="' + hh + '" rx="4" fill="' + c + '" opacity=".75"/><rect x="' + (x + 5) + '" y="' + (276 - hh - 6) + '" width="8" height="7" rx="2" class="c-escuro"/>';
    });
    [[672, 22], [700, 30], [776, 18], [812, 26], [858, 22]].forEach(([x, hh]) => { dna += '<rect x="' + x + '" y="' + (336 - hh) + '" width="20" height="' + hh + '" rx="3" class="c-vidro" stroke="var(--w-metal2)"/>'; });
    dna += bancada(630, 945);
    dna += '<g id="frascoMosca" opacity="0"><rect x="738" y="314" width="16" height="22" rx="4" class="c-vidro" stroke="var(--w-metal2)" stroke-width="1.5"/><rect x="737" y="310" width="18" height="5" rx="2" class="c-escuro"/><circle cx="746" cy="326" r="2" fill="#2A3350"/></g>' +
      '<path d="M748 362h26v34q0 4 -4 4h-18q-4 0 -4 -4z" class="c-vidro" stroke="var(--w-metal2)" stroke-width="2"/><rect x="750" y="380" width="22" height="18" rx="2" fill="#E0385A" opacity=".55"/>' +
      '<circle class="bolha" cx="758" cy="390" r="2" fill="#fff"/><circle class="bolha b" cx="765" cy="392" r="1.6" fill="#fff"/>' +
      // suporte de tubos: três tubos fixos; nas outras duas vagas ficam os tubos de DNA (tampa roxa e tampa azul)
      '<rect x="790" y="384" width="56" height="14" rx="3" class="c-metal2"/>' + [799.5, 819.5, 839.5].map((x, i) => '<rect x="' + (x - 3.5) + '" y="' + (356 + (i % 2) * 4) + '" width="7" height="36" rx="3.5" class="c-vidro" stroke="var(--w-metal2)"/>').join("") +
      '<circle cx="809.5" cy="389" r="2.6" class="c-escuro" opacity=".5"/><circle cx="829.5" cy="389" r="2.6" class="c-escuro" opacity=".5"/>' +
      '<path d="M858 360h16l2 8v30h-20v-30z" fill="#16A34A" opacity=".85"/><rect x="862" y="350" width="8" height="10" class="c-escuro"/>' +
      '<rect x="884" y="376" width="14" height="22" rx="5" fill="#fff" stroke="#D9DEEA" stroke-width="2"/><circle cx="889" cy="380" r="1" fill="#9AA3BA"/><circle cx="893" cy="380" r="1" fill="#9AA3BA"/>' +
      '<path d="M904 372h36l-4 26h-28z" fill="#2F5BEA" opacity=".85"/><rect x="914" y="344" width="14" height="32" rx="3" fill="#E6F2FF" stroke="#9AA3BA"/><path d="M908 372l6 -6h18l6 6" fill="#BFE0FF"/>';
    s += hot(HA("dna", "T"), dna) + placa(785, 196, t("placa.molecular"), "#7B4DE0");
    // termociclador (com tampa que abre), centrífuga e pipetas
    let pcr = '<rect x="1180" y="120" width="116" height="140" rx="6" fill="#0F1730"/><path d="M1214 136c0 18 48 18 48 36s-48 18-48 36s48 18 48 36" stroke="#4D7CFF" stroke-width="4" fill="none"/><path d="M1262 136c0 18-48 18-48 36s48 18 48 36s-48 18-48 36" stroke="#FF5470" stroke-width="4" fill="none"/>' +
      '<rect x="1340" y="300" width="110" height="10" rx="3" class="c-bancada2"/>' + [[1346, "#2F5BEA"], [1382, "#FFB23F"], [1418, "#14864A"]].map(([x, c]) => '<rect x="' + x + '" y="276" width="30" height="24" rx="3" fill="' + c + '" opacity=".8"/>').join("");
    pcr += bancada(1140, 1462);
    pcr += '<rect x="1188" y="326" width="146" height="72" rx="10" class="c-bancada" stroke="var(--w-bancada2)" stroke-width="2"/><rect x="1206" y="322" width="112" height="10" rx="3" class="c-escuro"/>' +
      [1222, 1242, 1262, 1282, 1302].map(x => '<circle cx="' + x + '" cy="327" r="3" fill="#5A6488"/>').join("") +
      '<g id="tampaPCR"><path d="M1192 330l10 -22h118l10 22z" class="c-metal"/><rect x="1240" y="312" width="44" height="5" rx="2.5" class="c-metal2"/></g><rect x="1206" y="340" width="68" height="30" rx="5" class="c-tela"/>' +
      '<text id="telaPCR" x="1240" y="361" text-anchor="middle" font-size="15" fill="#3FC1C9">25°C</text><circle class="led" cx="1300" cy="350" r="4" fill="#5FD39A"/><circle id="ledPCR" cx="1314" cy="350" r="4" fill="#9AA3BA"/><rect x="1290" y="366" width="34" height="8" rx="3" class="c-metal2"/>' +
      '<ellipse cx="1392" cy="388" rx="34" ry="10" class="c-metal"/><rect x="1358" y="358" width="68" height="32" rx="8" class="c-bancada" stroke="var(--w-bancada2)" stroke-width="2"/><ellipse cx="1392" cy="360" rx="30" ry="8" class="c-metal2"/><g class="gira"><path d="M1380 360h24M1392 354v12" stroke="#5A6488" stroke-width="3" stroke-linecap="round"/></g>' +
      '<rect x="1436" y="330" width="16" height="68" rx="3" class="c-metal2"/>' + [["#E0385A", 0], ["#FFB23F", 1], ["#2F5BEA", 2]].map(([c, i]) => '<rect x="1440" y="' + (336 + i * 18) + '" width="24" height="7" rx="3" fill="' + c + '"/>').join("");
    s += hot(HA("pcr", "T"), pcr);
    // eletroforese (com um suporte pequeno para o tubo e o fotodocumentador, de onde sai a foto do gel)
    let gel = bancada(1480, 1962);
    gel += '<rect x="1500" y="372" width="140" height="26" rx="5" fill="#BFD8FF" opacity=".8" stroke="#7FA6F5" stroke-width="2"/><rect x="1510" y="377" width="120" height="14" rx="2" fill="#E6F0FF"/><path d="M1520 380h10M1540 380h10M1560 380h10" stroke="#2F5BEA" stroke-width="3"/>' +
      '<path d="M1640 384c20 0 20 -30 40 -30" stroke="#E0385A" stroke-width="3" fill="none"/><path d="M1500 386c-14 0-10-40 180-36" stroke="#2A3350" stroke-width="3" fill="none"/>' +
      '<rect x="1664" y="334" width="100" height="64" rx="8" class="c-metal"/><rect x="1676" y="344" width="56" height="22" rx="4" class="c-tela"/><text x="1704" y="360" text-anchor="middle" font-size="13" fill="#FF8A9D">120 V</text>' +
      '<circle cx="1684" cy="384" r="5.5" fill="#E0385A"/><circle cx="1702" cy="384" r="5.5" fill="#2A3350"/><rect x="1740" y="344" width="14" height="40" rx="4" class="c-metal2"/>' +
      '<rect x="1766" y="386" width="20" height="12" rx="2" fill="#7FA6F5"/><circle cx="1776" cy="389" r="2.4" fill="#2F5BEA" opacity=".5"/>' +
      '<rect x="1786" y="358" width="130" height="40" rx="6" class="c-escuro"/><rect x="1794" y="362" width="114" height="10" rx="3" fill="#FF9A3C" opacity=".85"/>' +
      '<rect x="1800" y="272" width="96" height="66" rx="6" class="c-escuro"/><rect x="1806" y="278" width="84" height="54" rx="3" fill="#0B0F1E"/>' +
      [1818, 1834, 1850, 1866].map((x, i) => [0, 1, 2].map(j => '<rect x="' + (x - 5) + '" y="' + (288 + j * 12 + (i % 2) * 4) + '" width="10" height="2.6" fill="#5FD39A" opacity="' + (0.5 + j * 0.2) + '"/>').join("")).join("") +
      '<rect x="1844" y="338" width="8" height="20" class="c-escuro"/>';
    s += hot(HA("gel", "T"), gel) + placa(1720, 220, t("placa.molecular"), "#2F5BEA");
    s += hot(HA("elevador", "T"), "");
    s += hot(HA("porta", "T"), "");
    // a mosquinha
    s += '<g id="mosca" class="hot" data-hot="mosca" tabindex="-1" role="button" aria-label="' + esc(t("obj.mosca")) + '"><circle class="hit" r="30"/><g class="arte"><ellipse cx="0" cy="0" rx="4.6" ry="3" fill="#2A3350"/><circle cx="4.5" cy="-.5" r="2.3" fill="#C9254A"/>' +
      '<g class="asas"><ellipse cx="-1" cy="-4" rx="4.4" ry="2.2" fill="rgba(200,220,255,.85)" transform="rotate(-25)"/><ellipse cx="-2" cy="-3" rx="4.2" ry="2" fill="rgba(200,220,255,.7)" transform="rotate(-45)"/></g></g></g>';
    return s;
  }

  /* ----- 1º andar ----- */
  function primeiro() {
    let s = andarBase("1");
    s += janela(446, 86, 148, 150) + janela(1172, 70, 256, 118) + janela(1792, 84, 180, 150);
    // microscopia (a lâmina é um material: fica na caixa até o Geninho pôr no microscópio)
    let mi = '<rect x="86" y="110" width="118" height="150" rx="6" fill="#fff" stroke="#E6E9F0" stroke-width="2"/><ellipse cx="145" cy="184" rx="44" ry="56" fill="#F2ECFE" stroke="#7B4DE0" stroke-width="3"/><circle cx="150" cy="178" r="16" fill="#C9B8FF"/><circle cx="154" cy="174" r="5" fill="#7B4DE0"/>' +
      '<path d="M118 150c6 4 10 0 16 4M162 210c6 2 10-2 14 2M124 214c4-4 8-2 12-6" stroke="#0E9AA7" stroke-width="3" fill="none" stroke-linecap="round"/>';
    mi += bancada(56, 426);
    mi += '<path d="M190 398h76l-6 -12h-64z" class="c-escuro"/><path d="M212 386c-2-40 10-70 40-84l8 10c-24 14-30 38-28 74z" fill="#fff" stroke="#D9DEEA" stroke-width="2"/>' +
      '<ellipse id="luzMicro" cx="221" cy="356" rx="20" ry="7" fill="#FFF1A8" opacity="0"/>' +
      '<rect x="196" y="344" width="64" height="8" rx="3" class="c-escuro"/><path d="M226 344v-14M234 344v-18" stroke="#9AA3BA" stroke-width="5"/><rect x="236" y="276" width="18" height="44" rx="6" transform="rotate(-28 245 298)" fill="#7B4DE0"/>' +
      '<path d="M246 268l-6 -14" stroke="#2A3350" stroke-width="9" stroke-linecap="round"/><circle cx="250" cy="352" r="8" class="c-metal2"/><circle cx="250" cy="352" r="3.5" class="c-escuro"/>' +
      '<rect x="296" y="378" width="54" height="20" rx="3" fill="#0E9AA7" opacity=".85"/><rect x="300" y="372" width="46" height="8" rx="2" fill="#E4F6F7"/><rect x="364" y="384" width="44" height="14" rx="2" fill="#FEF4E2" transform="rotate(-6 386 391)"/>' +
      '<path d="M98 398l20 -50h14" stroke="#2A3350" stroke-width="4" fill="none"/><path d="M128 340l26 8-6 10-24-6z" fill="#2A3350"/>';
    s += hot(HA("micro", "1"), mi) + placa(310, 214, t("placa.micro"), "#0E9AA7");
    // planta (Arabidopsis) sob a luz
    s += hot(HA("planta", "1"), '<rect x="452" y="252" width="136" height="9" rx="4" fill="#C9B8FF"/><path class="cone" d="M458 261h124l20 140H438z" fill="#E9D9FF" opacity=".35"/>' +
      '<rect x="476" y="418" width="88" height="100" rx="6" class="c-metal"/><path d="M490 376h60l-6 44h-48z" fill="#C2703D"/><rect x="486" y="370" width="68" height="10" rx="3" fill="#A65A2C"/>' +
      '<g class="folha"><path d="M520 372c-2 -40 2 -70 0 -92M520 330c8 -10 14 -20 14 -36M520 312c-8 -8 -12 -18 -12 -30" stroke="#5FA35A" stroke-width="2.4" fill="none"/>' +
      '<circle cx="520" cy="278" r="3.4" fill="#fff" stroke="#E6E9F0"/><circle cx="534" cy="292" r="3" fill="#fff" stroke="#E6E9F0"/><circle cx="508" cy="280" r="3" fill="#fff" stroke="#E6E9F0"/>' +
      '<path d="M520 372c-18 -2 -30 -10 -32 -18c12 -2 26 4 32 18zM520 372c18 -2 30 -10 32 -18c-12 -2 -26 4 -32 18zM520 372c-10 -10 -14 -22 -10 -30c8 6 12 16 10 30zM520 372c10 -10 14 -22 10 -30c-8 6 -12 16 -10 30z" fill="#4E9A4A"/></g>');
    // microbiologia: cabine de segurança e estufa (as placas novas ficam em cima da estufa)
    let mb = '<rect x="636" y="512" width="306" height="9" rx="4" class="c-sombra2"/><rect x="640" y="200" width="184" height="318" rx="8" class="c-metal"/><rect x="648" y="208" width="168" height="34" rx="4" class="c-metal2"/><path d="M660 216h144M660 226h144M660 234h144" stroke="var(--w-metal)" stroke-width="2"/>' +
      '<rect x="652" y="248" width="160" height="148" rx="4" fill="#FFFDF2"/><rect x="652" y="248" width="160" height="148" fill="url(#gLuz)" opacity=".7"/><path d="M652 248l160 0l0 64l-160 22z" class="c-vidro" stroke="var(--w-metal2)" stroke-width="2"/>' +
      '<ellipse cx="682" cy="390" rx="18" ry="5" fill="#F3D9A4" stroke="#D9DEEA"/><ellipse cx="770" cy="390" rx="18" ry="5" fill="#F3D9A4" stroke="#D9DEEA"/>' +
      '<rect x="652" y="396" width="160" height="6" class="c-metal2"/><rect x="660" y="410" width="144" height="100" rx="4" class="c-armario2" opacity=".6"/>' +
      '<rect x="842" y="300" width="94" height="218" rx="6" class="c-bancada" stroke="var(--w-bancada2)" stroke-width="2"/><rect x="852" y="330" width="74" height="96" rx="4" class="c-vidro" stroke="var(--w-metal2)"/>' +
      '<path d="M856 360h66M856 392h66" stroke="var(--w-metal2)" stroke-width="2"/><ellipse cx="875" cy="356" rx="12" ry="3" fill="#F3D9A4"/><ellipse cx="900" cy="388" rx="12" ry="3" fill="#F3D9A4"/>' +
      '<rect x="852" y="308" width="44" height="16" rx="3" class="c-tela"/><text x="874" y="320.5" text-anchor="middle" font-size="11" fill="#FFB23F">37.0</text><circle class="led c" cx="914" cy="316" r="3.5" fill="#5FD39A"/>' +
      [300, 291].map(y => '<g transform="translate(900,' + y + ')">' + ITENS.placa.desenho() + "</g>").join("");
    s += hot(HA("bacterias", "1"), mb) + placa(780, 172, t("placa.microbio"), "#14864A");
    // bioinformática
    let bi = '<rect x="1488" y="214" width="84" height="304" rx="6" class="c-escuro"/>';
    for (let i = 0; i < 8; i++) bi += '<rect x="1496" y="' + (226 + i * 34) + '" width="68" height="26" rx="3" fill="#1C2445"/><circle class="led' + (i % 3 === 1 ? " b" : i % 3 === 2 ? " c" : "") + '" cx="1506" cy="' + (239 + i * 34) + '" r="2.6" fill="' + (i % 2 ? "#5FD39A" : "#4D7CFF") + '"/><path d="M1516 ' + (239 + i * 34) + 'h38" stroke="#2E3A66" stroke-width="3"/>';
    bi += bancada(1140, 1470);
    const tela = (x, cid) => {
      let l = "";
      const cores = { A: "#5FD39A", T: "#FF8A9D", C: "#7C9CFF", G: "#FFD27A" }, bases = "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAG";
      for (let r = 0; r < 14; r++) for (let c = 0; c < 9; c++) { const b = bases[(r * 9 + c + cid * 5) % bases.length]; l += '<text x="' + (x + 12 + c * 11.5) + '" y="' + (318 + r * 12) + '" font-size="10" fill="' + cores[b] + '">' + b + "</text>"; }
      return '<rect x="' + x + '" y="296" width="122" height="88" rx="6" class="c-escuro"/><clipPath id="tl' + cid + '"><rect x="' + (x + 5) + '" y="301" width="112" height="78" rx="3"/></clipPath><rect x="' + (x + 5) + '" y="301" width="112" height="78" rx="3" class="c-tela"/>' +
        '<g clip-path="url(#tl' + cid + ')"><g class="rola" style="animation-delay:-' + (cid * 3) + 's">' + l + "</g></g>" +
        '<rect x="' + (x + 54) + '" y="384" width="14" height="10" class="c-escuro"/><rect x="' + (x + 36) + '" y="393" width="50" height="5" rx="2" class="c-escuro"/>';
    };
    bi += tela(1166, 1) + tela(1306, 2) + '<rect x="1196" y="390" width="60" height="7" rx="2" class="c-metal2"/><rect x="1336" y="390" width="60" height="7" rx="2" class="c-metal2"/><path d="M1438 380a12 10 0 1 1 0.1 0" class="c-escuro"/>';
    s += hot(HA("bio", "1"), bi) + placa(1300, 216, t("placa.bio"), "#7B4DE0");
    // biblioteca
    let rv = '<rect x="1596" y="512" width="172" height="9" rx="4" class="c-sombra2"/><rect x="1600" y="208" width="164" height="310" rx="6" fill="#B07A4A"/><rect x="1608" y="216" width="148" height="294" fill="#8E5E34"/>';
    const cores = ["#E0385A", "#2F5BEA", "#14864A", "#D98A0B", "#7B4DE0", "#0E9AA7", "#F4A6B8", "#2A3350"];
    for (let p = 0; p < 4; p++) {
      const y = 216 + p * 74; rv += '<rect x="1608" y="' + (y + 66) + '" width="148" height="8" fill="#B07A4A"/>';
      let x = 1612; let k = p * 3;
      while (x < 1744) { const w = 9 + ((k * 7) % 6), hh = 44 + ((k * 13) % 18); rv += '<rect x="' + x + '" y="' + (y + 66 - hh) + '" width="' + w + '" height="' + hh + '" rx="1.5" fill="' + cores[k % 8] + '"/><rect x="' + x + '" y="' + (y + 66 - hh + 8) + '" width="' + w + '" height="3" fill="#fff" opacity=".5"/>'; x += w + 2; k++; }
    }
    s += hot(H("revistas"), rv) + placa(1682, 172, t("placa.biblioteca"), "#D98A0B");
    // cabide com jaleco (e o crachá)
    s += hot(H("jaleco"), '<rect x="1877" y="250" width="6" height="262" rx="3" class="c-escuro"/><path d="M1852 516h56" stroke="var(--w-escuro)" stroke-width="6" stroke-linecap="round"/><path d="M1866 254h28" stroke="var(--w-escuro)" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M1880 262c-14 0-26 8-28 20l-6 120h68l-6-120c-2-12-14-20-28-20z" fill="#FCFAF5" stroke="#E6E0D4" stroke-width="2"/><path d="M1880 264v138M1870 270l10 22 10-22" stroke="#8E3B5F" stroke-width="1.8" fill="none"/>' +
      '<rect x="1888" y="320" width="16" height="16" rx="2" fill="#FCFAF5" stroke="#E6E0D4"/><g id="cracha"><rect x="1891" y="308" width="12" height="16" rx="2" fill="#2F5BEA"/><rect x="1893" y="312" width="8" height="5" rx="1" fill="#fff"/></g>');
    s += hot(HA("elevador", "1"), "");
    return s;
  }

  /* ----- subsolo ----- */
  function subsolo() {
    let s = andarBase("S");
    s += '<path d="M0 44H2000M0 58H940M1140 58H2000" stroke="var(--w-metal2)" stroke-width="9"/><path d="M0 44H2000" stroke="var(--w-metal)" stroke-width="3"/>' +
      [200, 520, 1300, 1700].map(x => '<rect x="' + (x - 6) + '" y="36" width="12" height="30" rx="2" class="c-metal2"/>').join("");
    // autoclave
    s += hot(H("autoclave"), '<rect x="80" y="258" width="262" height="260" rx="14" class="c-metal"/><rect x="92" y="270" width="238" height="236" rx="10" class="c-metal2" opacity=".4"/>' +
      '<circle cx="200" cy="392" r="84" class="c-metal2"/><circle cx="200" cy="392" r="72" class="c-metal"/><circle cx="200" cy="392" r="14" class="c-escuro"/>' +
      '<path d="M200 334v116M142 392h116M159 351l82 82M241 351l-82 82" stroke="var(--w-escuro)" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="306" cy="292" r="16" fill="#fff" stroke="var(--w-escuro)" stroke-width="3"/><path d="M306 292l8 -8" stroke="#E0385A" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="292" y="320" width="34" height="18" rx="3" class="c-tela"/><text x="309" y="333" text-anchor="middle" font-size="10" fill="#FFB23F">121</text>' +
      '<g transform="translate(150,252)"><path class="vapor" d="M0 0q-6 -10 0 -18q6 -8 0 -16" stroke="#C9D2E6" stroke-width="5" fill="none" stroke-linecap="round"/></g><g transform="translate(176,252)"><path class="vapor b" d="M0 0q-6 -10 0 -18q6 -8 0 -16" stroke="#C9D2E6" stroke-width="5" fill="none" stroke-linecap="round"/></g>') + placa(210, 214, t("placa.esteril"), "#6B7590");
    // nitrogênio líquido
    s += hot(H("nitrogenio"), '<path d="M452 296h56v20c14 6 22 16 22 30v156h-100v-156c0-14 8-24 22-30z" class="c-metal"/><rect x="460" y="284" width="40" height="14" rx="4" class="c-metal2"/>' +
      '<rect x="444" y="384" width="72" height="44" rx="6" fill="#2F5BEA"/><text x="480" y="413" text-anchor="middle" font-size="20" fill="#fff">N₂</text><path d="M436 500h88" stroke="var(--w-escuro)" stroke-width="6"/><circle cx="446" cy="510" r="8" class="c-escuro"/><circle cx="514" cy="510" r="8" class="c-escuro"/>' +
      '<g transform="translate(480,282)"><ellipse class="nevoa" cx="0" cy="0" rx="40" ry="16" fill="#fff" opacity=".5"/></g><g transform="translate(470,270)"><ellipse class="nevoa" style="animation-delay:-2s" cx="0" cy="0" rx="26" ry="11" fill="#fff" opacity=".45"/></g>');
    // freezers −80 °C (a porta do primeiro abre quando o Geninho guarda o tubo)
    let fz = '<rect x="612" y="512" width="328" height="9" rx="4" class="c-sombra2"/>';
    [[618, "A"], [784, "B"]].forEach(([x], i) => {
      if (i === 0) fz += '<rect x="' + (x + 4) + '" y="206" width="142" height="308" rx="8" fill="#DCE9F7"/>' + [270, 330, 390, 450].map(y => '<rect x="' + (x + 10) + '" y="' + y + '" width="130" height="5" fill="#B8C6E0"/><rect x="' + (x + 18) + '" y="' + (y - 34) + '" width="40" height="32" rx="3" fill="#C9B8FF"/><rect x="' + (x + 64) + '" y="' + (y - 34) + '" width="40" height="32" rx="3" fill="#BFD8FF"/>').join("");
      fz += (i === 0 ? '<g id="portaFreezer" style="transform-origin:' + x + 'px 359px">' : "") +
        '<rect x="' + x + '" y="200" width="150" height="318" rx="10" fill="#F6F8FC" stroke="#D9DEEA" stroke-width="2"/><rect x="' + (x + 10) + '" y="212" width="130" height="36" rx="5" class="c-tela"/>' +
        '<text x="' + (x + 75) + '" y="236" text-anchor="middle" font-size="16" fill="#7FD1FF">−80 °C</text><rect x="' + (x + 128) + '" y="280" width="8" height="90" rx="4" fill="#9AA3BA"/>' +
        '<path d="M' + (x + 6) + " 260h138M" + (x + 6) + ' 508h138" stroke="#E4F1FB" stroke-width="5" stroke-linecap="round"/><path d="M' + (x + 8) + " 262l8 8 8-8 8 8 8-8M" + (x + 100) + ' 506l8-8 8 8 8-8" stroke="#BFE3FF" stroke-width="2" fill="none"/>' +
        (i === 0 ? "</g>" : "");
    });
    s += hot(H("freezer"), fz) + placa(770, 166, t("placa.biobanco"), "#2F5BEA");
    let cx = "";
    for (let p = 0; p < 3; p++) { cx += '<rect x="1160" y="' + (300 + p * 72) + '" width="250" height="7" class="c-metal2"/>'; for (let i = 0; i < 5; i++) cx += '<rect x="' + (1166 + i * 48) + '" y="' + (262 + p * 72) + '" width="42" height="38" rx="3" fill="' + ["#C9B8FF", "#BFD8FF", "#FFD9A0", "#B7E8C8", "#FFC2CE"][(i + p) % 5] + '" opacity=".85"/>'; }
    cx += '<rect x="1164" y="260" width="6" height="258" class="c-metal2"/><rect x="1402" y="260" width="6" height="258" class="c-metal2"/>';
    cx += '<rect x="1652" y="430" width="22" height="60" rx="8" fill="#E0385A"/><rect x="1656" y="420" width="12" height="12" class="c-escuro"/>' +
      '<rect x="1720" y="300" width="120" height="218" rx="4" class="c-metal2"/><rect x="1730" y="310" width="100" height="208" rx="3" class="c-metal"/><circle cx="1816" cy="414" r="5" class="c-escuro"/><path d="M1720 300l12 -12h96l12 12" fill="#FFB23F"/>';
    s += cx;
    s += hot(H("quadro"), '<rect x="1474" y="216" width="132" height="140" rx="6" fill="#D98A0B"/><rect x="1482" y="224" width="116" height="100" rx="3" fill="#FFF8EC"/>' +
      '<image href="img/geninho-rosto-96.png" x="1504" y="230" width="72" height="72"/><path d="M1540 306l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#FFB23F"/>' +
      '<rect x="1490" y="330" width="100" height="18" rx="3" class="c-placa"/><text x="1540" y="343" text-anchor="middle" font-size="7.5" class="t-placa">' + esc(t("placa.quadro")) + "</text>");
    s += hot(HA("elevador", "S"), "");
    return s;
  }

  /* ----- lado de fora: céu, calçada, terra e telhado ----- */
  function fora() {
    let s = '<rect x="-900" y="-500" width="3800" height="1621" fill="url(#gCeu)"/>' +
      '<g class="pais-fora"><use href="#ceuCoisas" x="-700" y="-300" transform="scale(1.6)"/><use href="#cidade" x="-640" y="1002"/><use href="#cidade" x="2120" y="1002"/></g>' +
      '<rect x="-900" y="1120" width="3800" height="900" class="c-terra"/><rect x="-900" y="1120" width="3800" height="14" class="c-calcada"/><rect x="-900" y="1134" width="3800" height="10" class="c-grama"/>';
    for (let i = 0; i < 40; i++) s += '<ellipse cx="' + (-880 + i * 97) + '" cy="' + (1260 + ((i * 53) % 560)) + '" rx="' + (10 + (i % 4) * 5) + '" ry="' + (6 + (i % 3) * 3) + '" class="c-pedra" opacity=".7"/>';
    s += '<rect x="-372" y="980" width="16" height="140" rx="6" fill="#8B5E3C"/><circle cx="-364" cy="960" r="64" fill="#5FA35A"/><circle cx="-404" cy="990" r="40" fill="#4E9A4A"/><circle cx="-322" cy="994" r="42" fill="#6DB167"/>' +
      '<rect x="-150" y="940" width="6" height="180" class="c-escuro"/><path d="M-147 944h30" stroke="var(--w-escuro)" stroke-width="6" stroke-linecap="round"/><ellipse cx="-118" cy="952" rx="14" ry="6" fill="#FFE7A8"/>' +
      '<ellipse cx="-240" cy="1112" rx="42" ry="18" fill="#5FA35A"/><ellipse cx="2200" cy="1112" rx="54" ry="20" fill="#5FA35A"/><ellipse cx="2280" cy="1110" rx="30" ry="16" fill="#6DB167"/>' +
      '<rect x="2360" y="990" width="16" height="130" rx="6" fill="#8B5E3C"/><circle cx="2368" cy="966" r="56" fill="#4E9A4A"/>';
    s += '<rect x="-26" y="-26" width="2052" height="26" class="c-laje"/><rect x="-26" y="-44" width="14" height="22" class="c-laje"/><rect x="2012" y="-44" width="14" height="22" class="c-laje"/>' +
      [240, 360, 480].map(x => '<path d="M' + x + " -26l14 -46h96l-14 46z" + '" fill="#2F4B9A"/><path d="M' + (x + 38) + " -26l14 -46M" + (x + 76) + ' -26l14 -46" stroke="#7C9CFF" stroke-width="1.5"/>').join("") +
      '<rect x="1588" y="-120" width="5" height="94" class="c-escuro"/><path d="M1560 -122a32 32 0 0 0 60 -14z" class="c-metal"/><circle class="led" cx="1590" cy="-122" r="4" fill="#E0385A"/>' +
      '<rect x="850" y="-96" width="420" height="62" rx="12" fill="#0F1730"/><circle cx="890" cy="-65" r="20" fill="url(#gMarca)"/><path d="M882 -76c0 7 16 7 16 11s-16 4-16 11M898 -76c0 7-16 7-16 11s16 4 16 11" stroke="#fff" stroke-width="2.4" fill="none"/>' +
      '<text x="1070" y="-58" text-anchor="middle" font-size="17" fill="#fff" letter-spacing="1" font-family="Unbounded,system-ui" font-weight="600">' + esc(t("placa.predio")) + '</text><rect x="900" y="-34" width="8" height="8" class="c-escuro"/><rect x="1212" y="-34" width="8" height="8" class="c-escuro"/>';
    s += '<rect x="-26" y="1800" width="2052" height="120" class="c-terra2"/>';
    return s;
  }

  // fill="var(--x)" nem sempre funciona como atributo; aqui vira style="fill:var(--x)"
  function varsParaEstilo(s) {
    return s.replace(/<([a-zA-Z]+)\b([^>]*)>/g, (m, tag, at) => {
      if (at.indexOf("var(") < 0) return m;
      let est = "";
      at = at.replace(/\s(fill|stroke|stop-color)="(var\([^"]*\))"/g, (mm, a, v) => { est += a + ":" + v + ";"; return ""; });
      if (!est) return m;
      const fecha = /\/\s*$/.test(at); if (fecha) at = at.replace(/\/\s*$/, "");
      if (/\sstyle="/.test(at)) at = at.replace(/\sstyle="([^"]*)"/, (mm, v) => ' style="' + est + v + '"'); else at += ' style="' + est + '"';
      return "<" + tag + at + (fecha ? "/" : "") + ">";
    });
  }
  function montarMundo() {
    const defs = "<defs>" +
      '<linearGradient id="gCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-ceu1"/><stop offset="1" class="s-ceu2"/></linearGradient>' +
      '<linearGradient id="gLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-luz"/><stop offset="1" class="s-luz0"/></linearGradient>' +
      '<radialGradient id="gPoca"><stop offset="0" class="s-poca"/><stop offset="1" class="s-poca0"/></radialGradient>' +
      '<linearGradient id="gAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1730" stop-opacity="0"/><stop offset="1" stop-color="#0F1730" stop-opacity=".09"/></linearGradient>' +
      '<linearGradient id="gVidro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gMarca" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4D7CFF"/><stop offset="1" stop-color="#FF5470"/></linearGradient>' +
      cidade() + "</defs>";
    return '<svg id="ggSvg" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="' + esc(t("ui.mundo")) + '" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice">' + defs + fora() +
      '<g class="andar" data-andar="1" transform="translate(0,0)">' + primeiro() + "</g>" +
      '<g class="andar" data-andar="T" transform="translate(0,600)">' + terreo() + "</g>" +
      '<g class="andar frio" data-andar="S" transform="translate(0,1200)">' + subsolo() + "</g>" +
      '<g id="itens" aria-hidden="true"></g><g id="marcaChao" aria-hidden="true" opacity="0"><ellipse rx="26" ry="7" fill="none" stroke="#7B4DE0" stroke-width="3"/><ellipse rx="12" ry="3.5" fill="#7B4DE0" opacity=".35"/></g>' +
      '<g id="gn" class="gn">' + GG_RIG.svg() + "</g>" +
      '<g id="voo" aria-hidden="true"></g><g id="marcaAlvo" aria-hidden="true" style="display:none"><g class="pula-marca"><path d="M-13 -10L0 4L13 -10" fill="none" stroke="#FFB23F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-13 -10L0 4L13 -10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></svg>';
  }

  /* ---------------- montagem da página ---------------- */
  const palco = $("#gg"), mundo = $("#ggMundo"), sub = $("#ggSub");
  const topo = $(".gg-topo");
  I.montarSeletor(topo, null);
  mundo.innerHTML = varsParaEstilo(montarMundo());
  const svg = $("#ggSvg"), gn = $("#gn");
  const mosca = $("#mosca");
  palco.insertAdjacentHTML("beforeend",
    '<div class="gg-hud"><button type="button" class="gg-missao" id="ggMissao"><span class="gg-missao-topo"><span class="fase"></span><span class="gg-pontos" aria-hidden="true"></span></span><span class="obj"></span></button>' +
    '<button type="button" class="gg-chip gg-caderno-bt" id="ggCadernoBt" aria-label="' + esc(t("ui.abrirCaderno")) + '" hidden>' + icone("livro", 24) + "<span>" + esc(t("ui.caderno")) + '</span><b id="ggConta"></b></button></div>' +
    '<div class="gg-baixo"><div class="gg-chip gg-mao" id="ggMao" hidden></div><button type="button" class="gg-acao" id="ggAcao" hidden></button></div>' +
    '<div class="gg-guia" id="ggGuia" aria-hidden="true" hidden>' + icone("seta", 24) + "</div>" +
    '<p class="sr" aria-live="polite" id="ggVivo"></p>');

  /* ---------------- céu de acordo com a hora de quem joga ---------------- */
  function ceu() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    let c, noite = false;
    if (h >= 19.5 || h < 5.5) { c = ["#0B1638", "#2C3670", "#1C2550", "#151D40"]; noite = true; }
    else if (h < 7.5) c = ["#7088CC", "#FFD0AE", "#A2A6CC", "#8E93BC"];
    else if (h < 17) c = ["#86B6FF", "#E3EEFF", "#BAC7E5", "#A2B1D8"];
    else c = ["#5568B8", "#FFB48C", "#8C88B4", "#77739F"];
    ["--ceu1", "--ceu2", "--cidade", "--cidade2"].forEach((v, i) => palco.style.setProperty(v, c[i]));
    svg.classList.toggle("noite", noite); svg.classList.toggle("dia", !noite);
    $$("#cidade .acesa, #ceuCoisas .estrela, #ceuCoisas .lua", svg).forEach(e => e.setAttribute("display", noite ? "inline" : "none"));
    $$("#ceuCoisas .nuvens", svg).forEach(e => e.setAttribute("display", noite ? "none" : "inline"));
  }
  const estiloNoite = document.createElement("style");
  estiloNoite.textContent = "#ggSvg .cone{opacity:.55}#ggSvg.noite .cone,html.ge-escuro #ggSvg .cone{opacity:1}" +
    ".frio .c-parede{fill:#E9F0F8}.frio .c-parede2{fill:#DCE6F2}html.ge-escuro .frio .c-parede{fill:#152036}html.ge-escuro .frio .c-parede2{fill:#111A2E}";
  document.head.appendChild(estiloNoite);
  ceu(); setInterval(ceu, 5 * 60 * 1000);

  /* ---------------- o Geninho no mundo ---------------- */
  const G = { x: E.intro ? E.x : -300, andar: E.intro ? E.andar : "T", vel: 0, acc: 0, alvo: null, ocupa: 0, pendente: null, oculto: false, parado: 0, foco: null, dist: 0 };
  Object.defineProperty(G, "ocupado", { get() { return G.ocupa > 0; } });
  if (!LIM[G.andar]) G.andar = "T";
  if (G.andar === "S" && !E.cracha) G.andar = "T";
  G.x = clamp(G.x, LIM[G.andar][0], LIM[G.andar][1]);
  const rig = GG_RIG.criar(gn, { rm });
  vestirEPI(gn);
  // EPI: no laboratório, o Geninho troca as imagens pelas versões com luvas, óculos, sapatos e presilha
  function vestirEPI(el) { if (el === gn) rig.epi(!!E.epi); else ["oculos", "luvas", "sapato", "prendedor"].forEach(k => el.classList.toggle("com-" + k, !!E.epi)); }
  if (E.mao) rig.segurar(ITENS[E.mao].desenho(E.maoDe));
  const chaoY = () => Y0[G.andar] + PISO;
  function desenharGeninho() {
    rig.desenhar(G.x, chaoY());
    gn.setAttribute("transform", gn.getAttribute("transform") + " scale(" + ESCALA + ")");
  }
  // ocupado: enquanto um gesto acontece; o último pedido feito nesse meio-tempo é atendido no fim
  function ocupar() { G.ocupa++; atualizarHots(); }
  function livre() {
    G.ocupa = Math.max(0, G.ocupa - 1);
    atualizarHots();
    if (!G.ocupado && G.pendente && !painelAberto() && !falaEl) { const p = G.pendente; G.pendente = null; executar(p); }
  }

  /* ---------------- materiais no laboratório ---------------- */
  let emVoo = null;
  const lugar = (id, est) => ITENS[id].lugares[est || E.itens[id]] || null;
  const noMundo = L => ({ x: L.x, y: Y0[L.andar] + L.y });
  function desenharItens() {
    let s = "";
    Object.keys(ITENS).forEach(id => {
      const est = E.itens[id], L = ITENS[id].lugares[est];
      if (!L || L.dentro || id === emVoo) return;
      s += '<g class="item" data-item="' + id + '" transform="translate(' + L.x + "," + (Y0[L.andar] + L.y) + ')">' + ITENS[id].desenho(est) + "</g>";
    });
    $("#itens", svg).innerHTML = s;
    atualizarEquipamentos();
  }
  // os equipamentos mostram o que aconteceu: armário aberto e vazio, tela do termociclador, luz do microscópio
  function atualizarEquipamentos() {
    const aberto = !!E.etapas.armario;
    $("#armarioAberto", svg).style.display = aberto ? "" : "none";
    $("#armarioFechado", svg).style.display = aberto ? "none" : "";
    $("#epiDentro", svg).style.display = E.epi ? "none" : "";
    const tela = $("#telaPCR", svg), led = $("#ledPCR", svg), dentro = E.itens.tuboDNA === "termo";
    tela.textContent = dentro && E.feitos.pcr ? "4°C" : "25°C";
    led.setAttribute("fill", dentro ? (E.feitos.pcr ? "#5FD39A" : "#FFB23F") : "#9AA3BA");
    $("#luzMicro", svg).setAttribute("opacity", E.itens.lamina === "micro" ? ".9" : "0");
  }
  // a tampa do termociclador e a porta do freezer abrem e fecham
  function animar(el, de, para, dur, aplicar) {
    return new Promise(r => {
      if (rm()) { aplicar(para); r(); return; }
      const t0 = performance.now();
      (function passo(agora) { const k = clamp((agora - t0) / dur, 0, 1); aplicar(lerp(de, para, suave(k))); if (k < 1) requestAnimationFrame(passo); else r(); })(t0);
    });
  }
  const tampaPCR = abrir => animar(null, abrir ? 0 : 1, abrir ? 1 : 0, 320, k => $("#tampaPCR", svg).setAttribute("transform", "translate(0," + (-30 * k).toFixed(1) + ") rotate(" + (-8 * k).toFixed(1) + " 1192 330)"));
  const portaFreezer = abrir => animar(null, abrir ? 0 : 1, abrir ? 1 : 0, 380, k => { $("#portaFreezer", svg).style.transform = "scaleX(" + (1 - 0.84 * k).toFixed(3) + ")"; });

  // um material voando entre um lugar e a mão (de e para podem mudar durante o voo: a mão se mexe)
  function voar(desenho, de, para, dur, o) {
    o = o || {};
    return new Promise(r => {
      const g = $("#voo", svg);
      g.innerHTML = "<g>" + desenho + "</g>";
      const el = g.firstChild;
      const pega = p => (typeof p === "function" ? p() : p);
      if (rm() || !dur) { g.innerHTML = ""; r(); return; }
      const t0 = performance.now();
      (function passo(agora) {
        const k = clamp((agora - t0) / dur, 0, 1), e = suave(k), a = pega(de), b = pega(para);
        if (!a || !b) { g.innerHTML = ""; r(); return; }
        const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e) - Math.sin(Math.PI * k) * (o.arco == null ? 16 : o.arco);
        const esc1 = lerp(o.escDe || 1, o.escPara || 1, e);
        el.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") scale(" + esc1.toFixed(3) + ")");
        if (o.some) el.setAttribute("opacity", (1 - clamp((k - 0.6) / 0.4, 0, 1)).toFixed(2));
        if (k < 1) requestAnimationFrame(passo); else { g.innerHTML = ""; r(); }
      })(t0);
    });
  }
  const maoNoMundo = () => rig.posMao(svg);
  // altura do alcance: 0 (perto do chão) a 1,3 (bem alto, na ponta dos pés)
  const altoDe = L => clamp((PISO - L.y - 80) / 45, 0, 1.3);
  // onde parar para a palma alcançar o lugar: um braço de distância, do lado de onde ele vem
  function pontoPara(L) {
    const lado = G.andar === L.andar ? (G.x <= L.x ? 1 : -1) : (EX <= L.x ? 1 : -1);
    const lim = LIM[L.andar];
    let x = L.x - lado * MAO_X;
    if (x < lim[0] || x > lim[1]) x = L.x + lado * MAO_X;
    return { x: clamp(x, lim[0], lim[1]), olhar: L.x >= x ? 1 : -1 };
  }

  async function pegar(id, deEst) {
    const L = lugar(id, deEst); if (!L) return;
    ocupar();
    try {
      await rig.virar(L.x >= G.x ? 1 : -1);
      G.foco = noMundo(L);
      let voo = null;
      await rig.gesto("alcancar", { alto: altoDe(L), meio: () => {
        E.itens[id] = "mao"; E.mao = id; E.maoDe = deEst; emVoo = id; desenharItens(); salvar();
        voo = voar(ITENS[id].desenho(deEst), noMundo(L), maoNoMundo, 280, { escPara: ESCALA });
      } });
      if (voo) await voo;
      emVoo = null; rig.segurar(ITENS[id].desenho(deEst));
      atualizarHUD();
    } finally { G.foco = null; livre(); }
  }
  async function colocar(id, paraEst) {
    const L = lugar(id, paraEst); if (!L || E.mao !== id) return;
    ocupar();
    try {
      await rig.virar(L.x >= G.x ? 1 : -1);
      G.foco = noMundo(L);
      let voo = null;
      await rig.gesto("alcancar", { alto: altoDe(L), meio: () => {
        const de = maoNoMundo(); rig.segurar(null);
        E.itens[id] = paraEst; E.mao = null; E.maoDe = null; emVoo = id; salvar();
        voo = voar(ITENS[id].desenho(paraEst), de, noMundo(L), 280, { escDe: ESCALA, some: L.dentro });
      } });
      if (voo) await voo;
      emVoo = null; desenharItens(); atualizarHUD();
    } finally { G.foco = null; livre(); }
  }
  // caderno, crachá e foto do gel vão para o bolso do jaleco
  async function paraBolso(id, desenho, aoGuardar) {
    ocupar();
    try {
      await espera(rm() ? 0 : 260);
      const de = maoNoMundo(); rig.segurar(null);
      const bolso = { x: G.x + rig.face * 12 * ESCALA, y: chaoY() - 62 * ESCALA };
      await voar(desenho, de, bolso, 360, { escDe: ESCALA, escPara: 0.25, arco: 10, some: true });
      if (aoGuardar) aoGuardar();
      salvar(); atualizarHUD();
    } finally { livre(); }
  }

  /* ---------------- câmera ---------------- */
  const cam = { x: 0, y: 0, w: 1000, h: 640 };
  let PW = 0, PH = 0;
  function medir() {
    PW = palco.clientWidth; PH = palco.clientHeight;
    const asp = PW / Math.max(1, PH);
    cam.h = 640; cam.w = cam.h * asp;
    const minW = PW < 600 ? 520 : 600;   // no celular, o Geninho aparece um pouco maior
    if (cam.w < minW) { cam.w = minW; cam.h = cam.w / asp; }
  }
  function alvoCamera() {
    const fala = $(".gg-fala:not([hidden])") || $(".gg-elevador");
    const rb = fala ? Math.min(0.45, (fala.offsetHeight + 28) / PH) : ($(".gg-baixo") ? Math.min(0.14, 64 / PH) : 0);
    const hud = $(".gg-hud"), rt = hud ? Math.min(0.3, (hud.offsetHeight + 16) / PH) : 0;
    let ty = Y0[G.andar] + 300 - cam.h * (rt + (1 - rt - rb) / 2);
    ty = clamp(ty, -330, 1880 - cam.h);
    // olha um pouco à frente na direção da caminhada; numa ação, enquadra o Geninho e o objeto
    let cx = G.x + clamp(G.vel * 0.45, -cam.w * 0.18, cam.w * 0.18);
    if (G.foco) cx = (G.x + G.foco.x) / 2;
    let tx = cx - cam.w / 2;
    tx = cam.w > 3040 ? 1000 - cam.w / 2 : clamp(tx, -560, 2560 - cam.w);
    return [tx, ty];
  }
  function camAgora() { const [x, y] = alvoCamera(); cam.x = x; cam.y = y; }
  // do mundo para a tela (para a seta de orientação)
  function naTela(x, y) {
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = svg.createSVGPoint(); p.x = x; p.y = y; const s = p.matrixTransform(m);
    const r = palco.getBoundingClientRect(); return { x: s.x - r.left, y: s.y - r.top };
  }

  /* ---------------- objetos perto, foco do teclado e estrelinhas ---------------- */
  const hotEls = $$(".hot[data-hot]", svg);
  const hotDe = el => (el.dataset.hot === "mosca" ? { id: "mosca", andar: "T", x: moscaPos.x, mosca: true } : HOT[+el.dataset.hot]);
  function atualizarHots() {
    hotEls.forEach(el => {
      const h = hotDe(el); if (!h) return;
      const visto = h.mosca ? true : (h.id === "elevador" || h.id === "porta" || E.vistos[h.id] || (h.exp && E.feitos[h.id]));
      el.classList.toggle("novo", !visto);
      el.setAttribute("tabindex", h.andar === G.andar && !G.ocupado && !painelAberto() ? "0" : "-1");
    });
    $("#frascoMosca", svg).setAttribute("opacity", E.cartas.mosca ? "1" : "0");
    mosca.style.display = E.cartas.mosca ? "none" : "";
    const cr = $("#cracha", svg); if (cr) cr.style.display = E.cracha ? "none" : "";
  }
  let pertoAtual = null;
  function maisPerto() {
    let melhor = null, d = 150;
    HOT.forEach(h => { if (h.andar !== G.andar) return; const ac = acaoDe(h), x = ac && ac.x != null ? ac.x : h.x, dd = Math.abs(x - G.x); if (dd < d) { d = dd; melhor = h; } });
    if (G.andar === "T" && !E.cartas.mosca && Math.abs(moscaPos.x - 40 - G.x) < Math.min(d, 90)) melhor = { id: "mosca", andar: "T", x: moscaPos.x, mosca: true };
    return melhor;
  }
  function marcarPerto(h) {
    const id = h ? (h.mosca ? "mosca" : String(h.n)) : null;
    if (id === pertoAtual) return;
    pertoAtual = id;
    hotEls.forEach(el => el.classList.toggle("perto", el.dataset.hot === id));
  }

  /* ---------------- HUD: missão, caderno, o que está na mão, ação disponível ---------------- */
  let ultimoObj = "";
  function atualizarHUD() {
    sub.textContent = t("ui.andar." + G.andar) + " · " + t("ui.andarSub." + G.andar);
    $$(".ind", svg).forEach(el => el.setAttribute("fill", el.dataset.ind === G.andar ? "#FFB23F" : "#5A6488"));
    const f = faseAtual(), o = objetivoAtual(), m = $("#ggMissao");
    $(".fase", m).textContent = f ? t("ui.faseDe", { n: f.n, t: FASES.length }) + " · " + nomeFase(f.n) : t("ui.jornadaCompleta");
    const txt = f && o ? tt("fase." + f.n + ".obj." + o.id) : t("ui.jornadaCompletaTxt");
    $(".obj", m).innerHTML = txt;
    $(".gg-pontos", m).innerHTML = FASES.map(x => '<i class="' + (E.fases[x.n] ? "ok" : f && x.n === f.n ? "agora" : "") + '" style="--c:' + x.cor + '"></i>').join("");
    m.setAttribute("aria-label", semTags($(".fase", m).textContent + ". " + txt + ". " + t("ui.abrirJornada")));
    if (txt !== ultimoObj) {
      if (ultimoObj) { $("#ggVivo").textContent = t("ui.novoObjetivo") + " " + semTags(txt); if (!rm()) { m.classList.remove("muda"); void m.offsetWidth; m.classList.add("muda"); } }
      ultimoObj = txt;
    }
    const cb = $("#ggCadernoBt");
    cb.hidden = E.itens.caderno !== "bolso";
    $("#ggConta").textContent = nFases() + "/" + FASES.length;
    const mao = $("#ggMao");
    if (E.mao) { mao.hidden = false; mao.innerHTML = miniItem(E.mao) + "<span>" + esc(t("ui.naMao")) + " <b>" + esc(t("it." + E.mao)) + "</b></span>"; }
    else mao.hidden = true;
  }
  let acaoMostrada = null;
  function atualizarAcao(h) {
    const bt = $("#ggAcao");
    const pode = h && !G.ocupado && !painelAberto() && !falaEl && !capaAberta && !elevEl && Math.abs(G.vel) < 30 && G.alvo == null;
    const ac = pode ? acaoDe(h) : null;
    const rot = ac ? ac.rotulo : null, chave = rot ? h.n + "|" + rot : null;
    if (chave === acaoMostrada) return;
    acaoMostrada = chave;
    if (!rot) { bt.hidden = true; bt._h = null; return; }
    bt.hidden = false; bt._h = h;
    bt.innerHTML = icone("mao", 24) + "<span>" + esc(rot) + "</span>" + (TOQUE ? "" : '<kbd aria-hidden="true">Enter</kbd>');
  }
  $("#ggAcao").addEventListener("click", () => { const h = $("#ggAcao")._h; if (h) comando({ h }); });
  $("#ggMissao").addEventListener("click", () => { if (!G.ocupado && !painelAberto()) abrirCaderno("jornada"); });
  $("#ggCadernoBt").addEventListener("click", () => { if (!G.ocupado && !painelAberto()) abrirCaderno("jornada"); });

  // orientação: um marcador sobre o objetivo; se ele estiver fora da tela (ou em outro andar), uma seta na borda
  function pontoGuia() {
    const o = objetivoAtual(); if (!o || capaAberta) return null;
    let h = H(o.alvo); if (!h) return null;
    if (h.andar !== G.andar) h = HA("elevador", G.andar);
    const ac = acaoDe(h);
    if (ac && ac.lugar) { const L = ac.lugar; return { x: L.x, y: Y0[L.andar] + L.y - 50, andar: L.andar }; }
    const topo = Math.min(h.caixa[1], PLACA_Y[h.id] || 999);
    return { x: h.caixa[0] + h.caixa[2] / 2, y: Y0[h.andar] + topo - 18, andar: h.andar };
  }
  function atualizarGuia() {
    const m = $("#marcaAlvo", svg), seta = $("#ggGuia");
    const p = pontoGuia();
    const esconder = !p || painelAberto() || !!falaEl || G.ocupado;
    if (esconder) { m.style.display = "none"; seta.hidden = true; return; }
    m.style.display = ""; m.setAttribute("transform", "translate(" + p.x.toFixed(0) + "," + p.y.toFixed(0) + ")");
    const s = naTela(p.x, p.y + 20); if (!s) { seta.hidden = true; return; }
    const mg = 30, fora = s.x < mg || s.x > PW - mg || s.y < mg + 70 || s.y > PH - mg;
    if (!fora) { seta.hidden = true; return; }
    const x = clamp(s.x, mg, PW - mg), y = clamp(s.y, mg + 80, PH - mg - 70);
    const ang = Math.atan2(s.y - y, s.x - x) * 180 / Math.PI;
    seta.hidden = false; seta.style.transform = "translate(" + (x - 22).toFixed(0) + "px," + (y - 22).toFixed(0) + "px) rotate(" + ang.toFixed(0) + "deg)";
  }

  /* ---------------- falas do Geninho ---------------- */
  let falaEl = null;
  function fala(linhas, opcoes) {
    if (!Array.isArray(linhas)) linhas = [linhas];
    return new Promise(resolve => {
      fecharFala(); fecharFalaCurta();
      rig.encarar(true);
      falaEl = document.createElement("div");
      falaEl.className = "gg-fala";
      falaEl.setAttribute("role", "dialog"); falaEl.setAttribute("aria-label", t("ui.geninho"));
      falaEl.innerHTML = '<div class="gg-rosto"><img src="img/geninho-rosto-96.png" alt="" width="58" height="58"></div><div><p class="quem">' + esc(t("ui.geninho")) + '</p><p class="txt"></p><div class="opcoes"></div></div>' +
        '<button type="button" class="seta" aria-label="' + esc(t("ui.continuarFala")) + '">' + icone("seta", 24) + "</button>";
      palco.appendChild(falaEl);
      const txt = $(".txt", falaEl), ops = $(".opcoes", falaEl), seta = $(".seta", falaEl);
      let i = -1, digitando = null;
      function mostrar() {
        i++;
        if (i >= linhas.length) { fecharFala(); resolve(null); return; }
        const ultima = i === linhas.length - 1;
        txt.innerHTML = linhas[i];
        $("#ggVivo").textContent = semTags(linhas[i]);
        ops.innerHTML = "";
        falaEl.classList.remove("pronta");
        const fim = () => {
          digitando = null; falaEl.classList.add("pronta");
          if (ultima && opcoes) {
            seta.hidden = true;
            ops.innerHTML = opcoes.map((o, k) => '<button type="button" class="btn small' + (k ? " ghost" : " violeta") + '" data-k="' + k + '">' + esc(o) + "</button>").join("");
            const b = ops.querySelector("button"); if (b) b.focus({ preventScroll: true });
          } else { seta.hidden = false; seta.focus({ preventScroll: true }); }
        };
        if (rm()) { fim(); return; }
        const nos = []; const w = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { nos.push([n, n.nodeValue]); n.nodeValue = ""; }
        let k = 0; const total = nos.reduce((a, b) => a + b[1].length, 0);
        const timer = setInterval(() => {
          k += 2; let resto = k;
          nos.forEach(([no, v]) => { const q = clamp(resto, 0, v.length); no.nodeValue = v.slice(0, q); resto -= v.length; });
          if (k >= total) { clearInterval(timer); fim(); }
        }, 22);
        digitando = { completar: () => { clearInterval(timer); nos.forEach(([no, v]) => { no.nodeValue = v; }); fim(); } };
      }
      falaEl.addEventListener("click", e => {
        const op = e.target.closest("[data-k]");
        if (op) { fecharFala(); resolve(+op.dataset.k); return; }
        if (digitando) { digitando.completar(); return; }
        if (!(ops.children.length)) mostrar();
      });
      falaEl._tecla = e => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target.closest && e.target.closest(".opcoes")) return;
          e.preventDefault();
          if (digitando) digitando.completar(); else if (!ops.children.length) mostrar();
        }
      };
      mostrar();
    });
  }
  function fecharFala() { if (falaEl) { falaEl.remove(); falaEl = null; } rig.encarar(false); }
  // fala curta: aparece e some sozinha, sem parar o jogo (reações ao que acabou de acontecer)
  let curtaEl = null, curtaTimer = 0;
  function falaCurta(txt) {
    fecharFalaCurta();
    curtaEl = document.createElement("div");
    curtaEl.className = "gg-curta"; curtaEl.setAttribute("role", "status");
    curtaEl.innerHTML = '<img src="img/geninho-rosto-96.png" alt="" width="34" height="34"><p>' + txt + "</p>";
    curtaEl.addEventListener("click", fecharFalaCurta);
    palco.appendChild(curtaEl);
    curtaTimer = setTimeout(fecharFalaCurta, Math.max(3200, semTags(txt).length * 55));
  }
  function fecharFalaCurta() { clearTimeout(curtaTimer); if (curtaEl) { curtaEl.remove(); curtaEl = null; } }

  /* ---------------- andar ----------------
     A velocidade sobe e desce aos poucos; perto do destino ele freia para parar no ponto certo.
     Se o destino fica atrás, ele freia, vira e só então sai andando. */
  const ANDA = 230, CORRE = 340, ACEL = 1050, FREIO = 1350;
  const teclas = { esq: false, dir: false };
  function moverQuadro(dt) {
    let desejo = 0;
    const pausa = painelAberto() || !!falaEl || capaAberta || G.oculto;
    const manual = (teclas.esq || teclas.dir) && !G.ocupado && !pausa;
    if (manual) desejo = ((teclas.dir ? 1 : 0) - (teclas.esq ? 1 : 0)) * ANDA;
    else if (G.alvo && !pausa) {
      const d = G.alvo.x - G.x;
      if (Math.abs(d) < 1.5 && Math.abs(G.vel) < 40) { chegar(); }
      else { const vmax = G.dist > 650 ? CORRE : ANDA; desejo = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * FREIO * 0.9 * Math.abs(d))); }
    }
    const sentido = Math.sign(desejo);
    if (sentido && sentido !== rig.face) {
      if (Math.abs(G.vel) > 8) desejo = 0;
      else { G.vel = 0; rig.virar(sentido); desejo = 0; }
    }
    if (rig.virando) desejo = 0;
    const dv = desejo - G.vel, freando = Math.abs(desejo) < Math.abs(G.vel) || Math.sign(desejo) !== Math.sign(G.vel);
    const lim = (freando ? FREIO : ACEL) * dt;
    const passo = clamp(dv, -lim, lim);
    G.acc = passo / Math.max(dt, 0.001); G.vel += passo;
    if (Math.abs(G.vel) < 0.5 && !desejo) G.vel = 0;
    const antes = G.alvo ? G.alvo.x - G.x : 0;
    G.x += G.vel * dt * rig.pulso();
    if (G.alvo && antes && Math.sign(G.alvo.x - G.x) !== Math.sign(antes)) { G.x = G.alvo.x; G.vel = 0; }
    const lim2 = LIM[G.andar];
    if (G.x < lim2[0] || G.x > lim2[1]) { G.x = clamp(G.x, lim2[0], lim2[1]); G.vel = 0; }
  }
  function irAte(x, aoChegar, olhar) {
    const xx = clamp(x, LIM[G.andar][0], LIM[G.andar][1]);
    G.alvo = { x: xx, aoChegar, olhar }; G.dist = Math.abs(xx - G.x);
  }
  function chegar() {
    const a = G.alvo; G.alvo = null; G.vel = 0;
    $("#marcaChao", svg).setAttribute("opacity", "0");
    if (!a) return;
    const vira = a.olhar && a.olhar !== rig.face ? rig.virar(a.olhar) : Promise.resolve();
    if (a.aoChegar) vira.then(() => a.aoChegar());
  }
  function andarAte(x, olhar) { return new Promise(r => irAte(x, r, olhar)); }
  function marcaChao(x) {
    const m = $("#marcaChao", svg);
    m.setAttribute("transform", "translate(" + x.toFixed(0) + "," + (chaoY() + 2) + ")"); m.setAttribute("opacity", "1");
    if (!rm()) { m.classList.remove("aparece"); void m.getBoundingClientRect(); m.classList.add("aparece"); }
  }

  /* ---------------- comandos ---------------- */
  function comando(dest) {
    if (painelAberto() || capaAberta) return;
    if (falaEl) return;                       // primeiro termina-se de ler a fala
    if (elevEl) fecharElevador();
    if (G.ocupado) { G.pendente = dest; return; }
    executar(dest);
  }
  function executar(dest) {
    fecharFalaCurta();
    if (dest.chao != null) { irAte(dest.chao, null); marcaChao(G.alvo.x); rig.piscar(); return; }
    const h = dest.h; if (!h) return;
    if (h.andar !== G.andar) {
      if (h.andar === "S" && !E.cracha) { fala(t("f.elevadorTrancado")); return; }
      irAte(EX, async () => { await viajar(h.andar); executar(dest); });
      return;
    }
    const ac = acaoDe(h); if (!ac) return;
    const x = ac.x != null ? ac.x : h.mosca ? moscaPos.x - 40 : h.x;
    const olhar = ac.olhar || (h.mosca ? (moscaPos.x >= x ? 1 : -1) : Math.sign((h.caixa ? h.caixa[0] + h.caixa[2] / 2 : h.x) - x) || rig.face);
    rig.piscar();
    if (Math.abs(x - G.x) < 3) { irAte(G.x, () => fazer(h, ac), olhar); return; }
    irAte(x, () => fazer(h, ac), olhar);
  }
  async function fazer(h, ac) {
    if (!h.mosca) { E.vistos[h.id] = true; salvar(); atualizarHots(); }
    try { await ac.fazer(); } catch (e) { console.error(e); }
    atualizarHUD(); desenharItens();
    verificarFases();
  }

  /* ---------------- o que fazer em cada objeto ----------------
     Depende da fase, do que está na mão e de onde estão os materiais. Devolve o rótulo (para o botão de ação),
     o ponto onde o Geninho para e a ação. */
  const podeAtividade = id => { const f = faseAtual(); return !!E.feitos[id] || (id === "publicar" ? !!(f && f.n === 10) : !!(f && f.exp === id)); };
  function acItem(tipo, id, est, depois, antes) {
    const L = lugar(id, est), p = pontoPara(L);
    return { rotulo: t("ac." + tipo + "." + id + (tipo === "colocar" ? "." + est : "")), x: p.x, olhar: p.olhar, lugar: L,
      // a sequência inteira (abrir, pegar ou pôr, reagir, abrir a atividade) não pode ser interrompida no meio
      fazer: async () => {
        ocupar();
        try {
          if (antes) await antes();
          if (tipo === "pegar") await pegar(id, est); else await colocar(id, est);
          if (depois) await depois();
        } finally { livre(); }
      } };
  }
  const acAtividade = (rot, id, opc) => ({ rotulo: rot, fazer: () => atividade(id, opc) });
  const acFala = (rot, txt) => ({ rotulo: rot, fazer: () => fala(txt) });
  const examinar = h => t("ac.examinar", { x: t("obj." + h.id) });
  function bloqueado(h) {
    const f = faseAtual(), o = objetivoAtual();
    return { rotulo: examinar(h), fazer: () => fala(f && o ? t("f.ainda", { x: semTags(tt("fase." + f.n + ".obj." + o.id)) }) : t("f.semAcao")) };
  }
  function acaoDe(h) {
    if (!h) return null;
    if (h.mosca) return { rotulo: t("ac.mosca"), fazer: pegarMosca };
    const f = faseAtual(), fn = f ? f.n : 11, mao = E.mao, it = E.itens;
    // devolver o que está na mão ao lugar de onde veio
    const devolver = () => {
      if (!mao || !E.maoDe || HOT_DO_LUGAR[mao + "." + E.maoDe] !== h.id) return null;
      const a = acItem("colocar", mao, E.maoDe, () => falaCurta(t("r.devolvido")));
      a.rotulo = t("ac.devolver", { x: t("it." + mao) }); return a;
    };
    const ocupada = () => ({ rotulo: examinar(h), fazer: () => falaCurta(t("r.maosOcupadas", { x: t("it." + mao) })) });
    const repetir = id => acAtividade(t("ac.repetir", { x: t("tar." + id) }), id);
    switch (h.id) {
      case "porta": return acFala(t("ac.porta"), t("f.porta"));
      case "quadro": return acFala(examinar(h), t("f.quadro"));
      case "elevador": return { rotulo: t("ac.elevador"), fazer: painelElevador };
      case "chuveiro": return { rotulo: t("ac.chuveiro"), fazer: chuveiro };
      case "planta": case "nitrogenio": case "autoclave": return { rotulo: examinar(h), fazer: () => cartaDoObjeto(h.id) };
      case "jaleco":
        if (mao && !E.cracha) return ocupada();
        if (E.cracha) return acFala(examinar(h), t("f.crachaJa"));
        return { rotulo: t("ac.cracha"), x: 1826, olhar: 1, lugar: { andar: "1", x: 1897, y: 316 }, fazer: pegarCracha };
      case "mural":
        if (mao) return devolver() || ocupada();
        if (!E.etapas.mural) return { rotulo: t("ac.lerMural"), fazer: lerMural };
        if (it.caderno === "origem") return acItem("pegar", "caderno", "origem", guardarCaderno);
        return { rotulo: t("ac.jornada"), fazer: () => abrirCaderno("jornada") };
      case "epi":
        if (mao) return ocupada();
        if (!E.etapas.armario) return { rotulo: t("ac.armario"), fazer: acharArmario };
        if (E.feitos.epi) return acFala(examinar(h), t("f.epiJa"));
        if (podeAtividade("epi")) return acAtividade(t("ac.vestir"), "epi");
        return bloqueado(h);
      case "dna":
        if (mao === "morangos" && fn === 3) return acItem("colocar", "morangos", "bancada", () => atividade("dna", { material: "morangos" }));
        if (mao) return devolver() || ocupada();
        if (fn === 3 && it.morangos === "origem") return acItem("pegar", "morangos", "origem", () => falaCurta(t("r.morangos")));
        if (fn === 3) return acAtividade(t("ac.extrair"), "dna", { material: "morangos" });
        if (fn === 4 && it.tuboDNA === "suporte") return acItem("pegar", "tuboDNA", "suporte", () => falaCurta(t("r.tuboDNA")));
        if (fn === 9 && it.tuboRes === "suporte" && E.cracha) return acItem("pegar", "tuboRes", "suporte", () => falaCurta(t("r.tuboRes")));
        if (fn === 9 && it.tuboRes === "suporte") return acFala(examinar(h), t("f.reservaSemCracha"));
        if (E.feitos.dna) return repetir("dna");
        return bloqueado(h);
      case "pcr":
        if (mao === "tuboDNA" && fn === 4) return acItem("colocar", "tuboDNA", "termo", async () => { await tampaPCR(false); desenharItens(); falaCurta(t("r.termo")); await espera(rm() ? 0 : 450); await atividade("pcr", { material: "tuboDNA" }); }, () => tampaPCR(true));
        if (mao) return devolver() || ocupada();
        if (fn === 4 && it.tuboDNA === "termo") return acAtividade(t("ac.pcr"), "pcr", { material: "tuboDNA" });
        if (fn === 5 && it.tuboDNA === "termo") return acItem("pegar", "tuboDNA", "termo", async () => { await tampaPCR(false); falaCurta(t("r.retirar")); }, () => tampaPCR(true));
        if (E.feitos.pcr) return repetir("pcr");
        return bloqueado(h);
      case "gel":
        if (mao === "tuboDNA" && fn === 5) return acItem("colocar", "tuboDNA", "gel", () => atividade("gel", { material: "tuboDNA" }));
        if (mao) return devolver() || ocupada();
        if (fn === 5 && it.tuboDNA === "gel") return acAtividade(t("ac.gel"), "gel", { material: "tuboDNA" });
        if (it.foto === "doc") return acItem("pegar", "foto", "doc", guardarFoto);
        if (E.feitos.gel) return repetir("gel");
        return bloqueado(h);
      case "micro":
        if (mao === "lamina" && fn === 6) return acItem("colocar", "lamina", "micro", async () => { desenharItens(); falaCurta(t("r.laminaMicro")); await espera(rm() ? 0 : 500); await atividade("micro", { material: "lamina" }); });
        if (mao) return devolver() || ocupada();
        if (fn === 6 && it.lamina === "caixa") return acItem("pegar", "lamina", "caixa", () => falaCurta(t("r.lamina")));
        if (fn === 6) return acAtividade(t("ac.micro"), "micro", { material: "lamina" });
        if (E.feitos.micro) return repetir("micro");
        return bloqueado(h);
      case "bacterias":
        if (mao === "placa" && fn === 7) return acItem("colocar", "placa", "cabine", () => atividade("bacterias", { material: "placa" }));
        if (mao) return devolver() || ocupada();
        if (fn === 7 && it.placa === "estufa") return acItem("pegar", "placa", "estufa", () => falaCurta(t("r.placa")));
        if (fn === 7) return acAtividade(t("ac.bac"), "bacterias", { material: "placa" });
        if (E.feitos.bacterias) return repetir("bacterias");
        return bloqueado(h);
      case "bio":
        if (mao) return ocupada();
        if (podeAtividade("bio")) return acAtividade(E.feitos.bio ? t("ac.repetir", { x: t("tar.bio") }) : t("ac.bio"), "bio");
        return bloqueado(h);
      case "freezer":
        if (mao === "tuboRes" && fn === 9) { const L = lugar("tuboRes", "freezer"), p = pontoPara(L); return { rotulo: t("ac.guardar"), x: p.x, olhar: p.olhar, lugar: L, fazer: () => atividade("freezer", { material: "tuboRes" }) }; }
        if (mao) return ocupada();
        if (E.feitos.freezer) return repetir("freezer");
        if (fn === 9) return acFala(examinar(h), t("f.freezerSemTubo"));
        return bloqueado(h);
      case "revistas":
        if (mao) return ocupada();
        if (fn === 10) return acAtividade(t("ac.artigo"), "publicar");
        return { rotulo: examinar(h), fazer: () => cartaDoObjeto("revistas") };
    }
    return null;
  }

  /* ----- ações de cada objeto ----- */
  async function lerMural() {
    ocupar();
    try { await rig.gesto("olhaCima"); } finally { livre(); }
    await fala([t("f.mural1"), t("f.mural2")]);
    E.etapas.mural = true; salvar(); atualizarHUD();
  }
  function guardarCaderno() {
    falaCurta(t("r.caderno"));
    return paraBolso("caderno", ITENS.caderno.desenho(), () => {
      E.itens.caderno = "bolso"; E.mao = null; E.maoDe = null;
      const b = $("#ggCadernoBt"); b.hidden = false; if (!rm()) { b.classList.remove("pulsa"); void b.offsetWidth; b.classList.add("pulsa"); }
    });
  }
  function guardarFoto() {
    falaCurta(t("r.foto"));
    return paraBolso("foto", ITENS.foto.desenho(), () => { E.itens.foto = "bolso"; E.mao = null; E.maoDe = null; });
  }
  async function acharArmario() {
    ocupar();
    try {
      await rig.gesto("usar");
      E.etapas.armario = true; salvar(); atualizarEquipamentos();
      await rig.gesto("surpresa");
    } finally { livre(); }
    await fala(t("f.armario"));
  }
  async function pegarCracha() {
    ocupar();
    try {
      await rig.virar(1);
      const de = { x: 1897, y: Y0["1"] + 316 };
      G.foco = de;
      let voo = null;
      await rig.gesto("alcancar", { alto: 1.2, meio: () => { E.cracha = true; salvar(); atualizarHots(); voo = voar('<rect x="-6" y="-16" width="12" height="16" rx="2" fill="#2F5BEA"/><rect x="-4" y="-12" width="8" height="5" rx="1" fill="#fff"/>', de, maoNoMundo, 260, { escPara: ESCALA }); } });
      if (voo) await voo;
      rig.segurar('<rect x="-6" y="-16" width="12" height="16" rx="2" fill="#2F5BEA"/><rect x="-4" y="-12" width="8" height="5" rx="1" fill="#fff"/>');
    } finally { G.foco = null; livre(); }
    await paraBolso("cracha", '<rect x="-6" y="-16" width="12" height="16" rx="2" fill="#2F5BEA"/>');
    await fala(t("f.cracha"));
  }
  async function cartaDoObjeto(id) {
    if (id === "planta" && !rm()) { const f = $(".folha", svg); f.classList.add("balanca"); setTimeout(() => f.classList.remove("balanca"), 1200); }
    if (!E.cartas[id]) { ocupar(); try { await rig.gesto("curioso", { lado: Math.random() < 0.5 ? 1 : -1 }); } finally { livre(); } }
    await fala(t("f." + id));
    return ganharCarta(id);
  }
  async function chuveiro() {
    ocupar();
    try {
      await rig.gesto("usar");
      const agua = $("#aguaChuveiro", svg);
      agua.setAttribute("opacity", "1"); gn.classList.add("molhado");
      await rig.gesto("surpresa");
      await espera(rm() ? 300 : 700);
      agua.setAttribute("opacity", "0");
    } finally { livre(); }
    await fala(t("f.chuveiro"));
    await ganharCarta("chuveiro");
    setTimeout(() => gn.classList.remove("molhado"), 1500);
  }
  async function atividade(id, opc) {
    if (!podeAtividade(id)) return bloqueado(H(id) || HOT[0]).fazer();
    ocupar();
    try {
      if (id === "freezer") { await rig.gesto("usar"); await portaFreezer(true); }
      else if (id === "bio") await rig.gesto("digitar");
      else if (id === "publicar") await rig.gesto("curioso", { lado: 1 });
      else if (id !== "epi") await rig.gesto("usar");
    } finally { G.ocupa = Math.max(0, G.ocupa - 1); }
    if (id === "freezer") portaFreezer(false);
    abrirExperimento(id, opc);
  }

  // a mosquinha voa em volta dos morangos
  const moscaPos = { x: 690, y: 360 };
  let moscaT = 0;
  function voarMosca(dt) {
    if (E.cartas.mosca) return;
    moscaT += dt;
    moscaPos.x = 700 + 46 * Math.sin(moscaT * 1.3) + 12 * Math.sin(moscaT * 4.1);
    moscaPos.y = 340 + 22 * Math.sin(moscaT * 1.9) + 8 * Math.cos(moscaT * 5.3);
    const dir = Math.cos(moscaT * 1.3) >= 0 ? 1 : -1;
    mosca.setAttribute("transform", "translate(" + moscaPos.x.toFixed(1) + "," + moscaPos.y.toFixed(1) + ") scale(" + dir + ",1)");
    const asas = mosca.querySelector(".asas"); if (asas) asas.setAttribute("opacity", Math.sin(moscaT * 60) > 0 ? "1" : ".35");
  }
  async function pegarMosca() {
    if (E.cartas.mosca) return;
    await rig.virar(moscaPos.x >= G.x ? 1 : -1);
    E.cartas.mosca = true; salvar(); atualizarHots();
    ocupar(); try { await rig.gesto("pulinho"); } finally { livre(); }
    await fala(t("f.mosca"));
    await ganharCarta("mosca", true);
  }

  /* ---------------- elevador ---------------- */
  let elevEl = null;
  function painelElevador() {
    fecharElevador();
    const o = objetivoAtual(), andarMissao = o && H(o.alvo) ? H(o.alvo).andar : null;
    elevEl = document.createElement("div");
    elevEl.className = "gg-elevador"; elevEl.setAttribute("role", "dialog"); elevEl.setAttribute("aria-labelledby", "ggElevTit");
    elevEl.innerHTML = '<h2 id="ggElevTit">' + esc(t("ui.paraOnde")) + '<button type="button" class="x" aria-label="' + esc(t("ui.fechar")) + '">✕</button></h2><div class="andares">' +
      ANDARES.map(a => {
        const trancado = a === "S" && !E.cracha, aqui = a === G.andar, missao = a === andarMissao && !aqui;
        return '<button type="button" class="andar' + (missao ? " missao" : "") + '" data-a="' + a + '"' + (aqui ? ' aria-current="true"' : "") + (trancado ? ' aria-disabled="true" data-trancado="1"' : "") + "><b>" + a + "</b><span>" + esc(t("ui.andar." + a)) +
          "<small>" + esc(trancado ? t("ui.precisaCracha") : aqui ? t("ui.voceEsta") : missao ? t("ui.missaoAqui") : t("ui.andarSub." + a)) + "</small></span>" + (trancado ? icone("cadeado", 24) : "") + "</button>";
      }).join("") + "</div>";
    palco.appendChild(elevEl);
    elevEl.addEventListener("click", e => {
      if (e.target.closest(".x")) return fecharElevador();
      const b = e.target.closest(".andar"); if (!b) return;
      if (b.dataset.trancado) { fecharElevador(); fala(t("f.elevadorTrancado")); return; }
      fecharElevador();
      if (b.dataset.a !== G.andar) viajar(b.dataset.a);
    });
    const f = $(".andar.missao:not([data-trancado])", elevEl) || $(".andar:not([aria-current]):not([data-trancado])", elevEl) || $(".x", elevEl); f.focus({ preventScroll: true });
  }
  function fecharElevador() { if (elevEl) { elevEl.remove(); elevEl = null; } }
  function portas(an, abrir) {
    const esq = $('.pe-esq[data-andar="' + an + '"]', svg), dir = $('.pe-dir[data-andar="' + an + '"]', svg);
    const dur = rm() ? 1 : 420, t0 = performance.now();
    return new Promise(r => {
      (function passo(agora) {
        const k = clamp((agora - t0) / dur, 0, 1), e = abrir ? k : 1 - k, q = e * e * (3 - 2 * e);
        esq.setAttribute("transform", "translate(" + (-56 * q) + ",0)"); dir.setAttribute("transform", "translate(" + (56 * q) + ",0)");
        if (k < 1) requestAnimationFrame(passo); else r();
      })(t0);
    });
  }
  function sumir(sim) {
    G.oculto = sim;
    if (rm()) { gn.style.opacity = sim ? "0" : "1"; return espera(1); }
    gn.style.transition = "opacity .3s"; gn.style.opacity = sim ? "0" : "1";
    return espera(320);
  }
  async function viajar(destino) {
    if (G.ocupado) return;
    ocupar();
    try {
      await andarAte(EX);
      await portas(G.andar, true); rig.forcar("costas"); await espera(rm() ? 0 : 160); await sumir(true); await portas(G.andar, false);
      G.andar = destino; G.x = EX; G.vel = 0; E.andar = destino; E.x = EX; salvar();
      atualizarHUD(); atualizarHots();
      await espera(rm() ? 50 : 950);
      rig.forcar("frente"); await rig.virar(1, true);
      await portas(destino, true); await sumir(false); await espera(rm() ? 0 : 220); rig.forcar(null); await portas(destino, false);
    } finally { livre(); }
    if (destino === "S" && !E.vistos.subsolo) { E.vistos.subsolo = true; salvar(); await fala(t("f.subsolo")); }
  }

  /* ---------------- cartas ---------------- */
  function cartaHTML(id, nova) {
    return '<article class="gg-carta' + (nova ? " nova" : "") + '" style="--c:' + COR_CARTA[id] + '"><div class="topo">' + icone(id) + "<h4>" + esc(t("c." + id + ".t")) + '</h4><span class="ano">' + esc(t("c." + id + ".a")) + "</span></div><p>" + t("c." + id + ".x") + "</p></article>";
  }
  function ganharCarta(id, jaMarcada) {
    const nova = jaMarcada || !E.cartas[id];
    if (!nova) return fala(t("f.cartaVista"));
    E.cartas[id] = true; salvar(); atualizarHots();
    rig.gesto("surpresa");
    return new Promise(r => {
      const p = painel({ kicker: t("ui.cartaNova"), titulo: t("c." + id + ".t"), simples: true, aoFechar: r });
      p.corpo.innerHTML = '<div class="gg-rolagem" style="display:grid;place-items:center"><div style="width:min(420px,100%);display:grid;gap:16px">' + cartaHTML(id, true) +
        '<button type="button" class="btn violeta">' + esc(t("ui.continuarBt")) + "</button></div></div>";
      const b = $(".btn", p.corpo); b.addEventListener("click", () => p.fechar()); b.focus({ preventScroll: true });
    });
  }

  /* ---------------- painéis (experimentos, caderno, cartas, medalhas, certificados) ---------------- */
  let painelAtual = null;
  const painelAberto = () => !!painelAtual;
  function painel({ kicker, titulo, simples, aoFechar, classe }) {
    const sec = document.createElement("section");
    sec.className = "gg-painel" + (classe ? " " + classe : ""); sec.setAttribute("role", "dialog"); sec.setAttribute("aria-modal", "true"); sec.setAttribute("aria-labelledby", "ggPTit");
    sec.innerHTML = '<div class="gg-painel-in"' + (simples ? ' style="width:min(560px,100%);margin:auto;max-height:100%"' : "") + '><header class="gg-cab"><div><p class="kicker">' + esc(kicker || "") + '</p><h2 id="ggPTit">' + esc(titulo || "") + '</h2><div class="gg-passos"></div></div>' +
      '<span class="gg-material" hidden></span><button type="button" class="x" aria-label="' + esc(t("ui.fechar")) + '">' + icone("x", 24) + '</button></header><div class="gg-conteudo" style="flex:1;min-height:0;display:flex;flex-direction:column"></div></div>';
    palco.appendChild(sec);
    const antes = document.activeElement;
    const obj = {
      el: sec, corpo: $(".gg-conteudo", sec), passos: $(".gg-passos", sec), limpezas: [],
      fechar() {
        if (!sec.isConnected) return;
        obj.limpezas.forEach(f => { try { f(); } catch (e) {} });
        sec.remove(); if (painelAtual === obj) painelAtual = null;
        atualizarHots();
        if (antes && antes.focus && antes.isConnected) antes.focus({ preventScroll: true }); else palco.focus({ preventScroll: true });
        if (aoFechar) aoFechar();
      }
    };
    $(".x", sec).addEventListener("click", () => obj.fechar());
    sec.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); obj.fechar(); }
      if (e.key === "Tab") {
        const f = $$('button:not([disabled]),[href],input,[tabindex="0"]', sec).filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    painelAtual = obj; atualizarHots(); fecharFala(); fecharFalaCurta(); fecharElevador();
    teclas.esq = teclas.dir = false; G.alvo = null; G.pendente = null;
    setTimeout(() => { if (sec.isConnected && !sec.contains(document.activeElement)) $(".x", sec).focus({ preventScroll: true }); }, 30);
    return obj;
  }

  /* ----- caderno: a jornada (fases, medalhas, certificados) e as cartas ----- */
  function abrirCaderno(aba) {
    const p = painel({ kicker: t("ui.caderno"), titulo: t("ui.fase1"), aoFechar: () => verificarFases() });
    p.corpo.innerHTML = '<div class="gg-abas" role="tablist"><button type="button" class="gg-aba" role="tab" data-aba="jornada">' + esc(t("ui.jornada")) + '</button><button type="button" class="gg-aba" role="tab" data-aba="cartas">' + esc(t("ui.cartas")) + "</button></div>" +
      '<div class="gg-rolagem" id="ggAbaCorpo"></div><footer class="gg-rodape"><span>' + esc(t("ui.desenvolvido")) + " <strong>Thaisa Carvalho</strong></span>" + botaoKids() + "<button type=\"button\" id=\"ggZerar\">" + esc(t("ui.recomecar")) + "</button></footer>";
    const corpo = $("#ggAbaCorpo", p.corpo);
    function mostrar(qual) {
      $$(".gg-aba", p.corpo).forEach(b => b.setAttribute("aria-selected", String(b.dataset.aba === qual)));
      $("#ggPTit", p.el).textContent = qual === "cartas" ? t("ui.cartas") : t("ui.fase1");
      if (qual === "cartas") {
        corpo.innerHTML = '<div class="gg-resumo"><span class="gg-chip"><i style="--c:#7B4DE0"></i>' + esc(t("ui.cartasConta", { n: nCartas(), t: CARTAS.length })) + "</span></div><div class=\"gg-grade\">" +
          CARTAS.map(([id]) => E.cartas[id] ? cartaHTML(id) : '<div class="gg-carta oculta" aria-label="' + esc(t("ui.aindaNao")) + '"><span>?</span></div>').join("") + "</div>";
        return;
      }
      const atual = faseAtual();
      const linha = f => {
        const r = E.fases[f.n], agora = atual && atual.n === f.n, est = f.exp && f.exp !== "publicar" ? +E.feitos[f.exp] || 0 : 0;
        const o = agora ? objetivoAtual() : null;
        const status = r ? (r.reconhecida ? t("ui.reconhecidaEm", { d: dataLocal(r.data) }) : t("ui.concluidaEm", { d: dataLocal(r.data) })) : agora ? (o ? tt("fase." + f.n + ".obj." + o.id) : "") : t("ui.bloqueada");
        return '<li class="' + (r ? "ok" : agora ? "agora" : "bloq") + '"><span class="med">' + medalhaSVG(f, !r) + '</span><span class="info"><span class="num">' + esc(t("ui.faseDe", { n: f.n, t: FASES.length })) + "</span>" +
          '<span class="nome">' + esc(nomeFase(f.n)) + '</span><span class="medn">' + esc(r ? t("fase." + f.n + ".medalha") : t("fase." + f.n + ".resumo")) + '</span><span class="st">' + (agora && !r ? "<b>" + esc(t("ui.missao")) + ":</b> " : "") + status + "</span>" +
          (r && est ? '<span class="mini" aria-label="' + esc(t("ui.melhor", { n: est })) + '">' + [1, 2, 3].map(k => estrela(k <= est)).join("") + "</span>" : "") + "</span>" +
          '<span class="bts">' + (r && f.exp && f.exp !== "publicar" && f.exp !== "epi" ? '<button type="button" class="btn small ghost" data-repetir="' + f.exp + '">' + esc(t("ui.repetir")) + "</button>" : "") + "</span></li>";
      };
      corpo.innerHTML = '<div class="gg-resumo"><span class="gg-chip"><i style="--c:#7B4DE0"></i>' + esc(t("ui.fasesConta", { n: nFases(), t: FASES.length })) + '</span><span class="gg-chip"><i style="--c:#FFB23F"></i>' + esc(t("ui.estrelasConta", { n: nEstrelas(), t: ESTRELAS_MAX })) + "</span>" +
        '<span class="gg-chip"><i style="--c:#14864A"></i>' + esc(t("ui.cartasConta", { n: nCartas(), t: CARTAS.length })) + "</span></div>" +
        '<p class="gg-nota" style="margin:0 0 14px">' + esc(t("ui.medalhaEstrela")) + "</p>" +
        (!atual ? '<div class="gg-final"><p><b>' + esc(t("ui.jornadaCompleta")) + "</b> " + esc(t("ui.jornadaFinalTxt")) + '</p><button type="button" class="btn violeta" data-cert="jornada">' + icone("baixar", 24) + esc(t("ui.certJornada")) + "</button></div>" : "") +
        '<ol class="gg-fases">' + FASES.map(linha).join("") + "</ol>" +
        '<p class="gg-nota" style="margin-top:16px">' + esc(t("ui.aviso")) + "</p>";
    }
    p.corpo.addEventListener("click", e => {
      const b = e.target.closest(".gg-aba"); if (b) { mostrar(b.dataset.aba); return; }
      const c = e.target.closest("[data-cert]"); if (c) { p.fechar(); abrirCertificado(); return; }
      const r = e.target.closest("[data-repetir]");
      if (r) { const h = H(r.dataset.repetir); p.fechar(); if (h) comando({ h }); }
    });
    $("#ggZerar", p.corpo).addEventListener("click", () => { if (confirm(KIDS ? caixaAlta(t("ui.recomecarConfirma")) : t("ui.recomecarConfirma"))) { try { localStorage.removeItem(CHAVE); } catch (er) {} location.reload(); } });
    $(".gg-kids-bt", p.corpo).addEventListener("click", e => {
      trocarKids(); const b = e.currentTarget; b.setAttribute("aria-checked", String(KIDS)); $("b", b).textContent = t("ui.kids"); $("small", b).textContent = t("ui.kidsTxt");
      mostrar($(".gg-aba[aria-selected=true]", p.corpo).dataset.aba);
    });
    mostrar(aba === "cartas" ? "cartas" : "jornada");
  }

  /* ---------------- etapas e medalhas ----------------
     A Fase 1 do jogo tem dez etapas (em fases.js, a lista FASES). Cada etapa dá uma medalha; o certificado vem
     só no fim das dez etapas (certificado da Fase 1). */
  let verificando = false;
  async function verificarFases() {
    if (verificando || painelAberto() || falaEl || capaAberta) return;
    verificando = true;
    try {
      for (;;) {
        const f = faseAtual(); if (!f || !f.objetivos.every(o => o.feito(E))) break;
        E.fases[f.n] = { data: hoje(), id: novoRegistro("F" + z2(f.n)) }; salvar(); atualizarHUD();
        await cerimonia(f);
        const prox = faseAtual();
        if (prox && !E.falas["inicio" + prox.n]) { E.falas["inicio" + prox.n] = 1; salvar(); await fala(t("fase." + prox.n + ".inicio")); }
      }
      if (!faseAtual() && !E.jornada) { E.jornada = { data: hoje(), id: novoRegistro("F1") }; salvar(); await fala(t("f.jornadaCompleta")); abrirCertificado(); }
    } finally { verificando = false; atualizarHUD(); }
  }
  function confete() {
    return rm() ? "" : '<div class="pub-confete" aria-hidden="true">' + Array.from({ length: 22 }, (_, i) => '<span style="left:' + (Math.random() * 96 + 2).toFixed(0) + "%;animation-delay:-" + (Math.random() * 4).toFixed(1) + "s;animation-duration:" + (3.5 + Math.random() * 2.5).toFixed(1) + "s;--c:" + ["#4D7CFF", "#FF5470", "#FFB23F", "#A58CFF", "#5FD39A"][i % 5] + '"></span>').join("") + "</div>";
  }
  function cerimonia(f) {
    return new Promise(async fim => {
      ocupar();
      try { await espera(rm() ? 0 : 200); await rig.gesto("comemorar"); } finally { G.ocupa = Math.max(0, G.ocupa - 1); G.pendente = null; }
      const p = painel({ kicker: t("med.kicker"), titulo: t("med.titulo"), simples: true, classe: "gg-cerimonia", aoFechar: fim });
      const est = f.exp && f.exp !== "publicar" ? +E.feitos[f.exp] || 0 : 0;
      p.corpo.innerHTML = '<div class="gg-rolagem gg-medalha-tela">' + confete() + '<div class="gg-medalha-grande">' + medalhaSVG(f) + "</div>" +
        '<p class="etapa">' + esc(t("ui.faseDe", { n: f.n, t: FASES.length })) + " · " + esc(nomeFase(f.n)) + "</p><h3>" + esc(t("fase." + f.n + ".medalha")) + "</h3>" +
        "<p>" + esc(t("med.texto")) + "</p>" +
        (est ? '<div class="gg-med-est"><span class="gg-estrelas pequenas">' + [1, 2, 3].map(k => estrela(k <= est)).join("") + "</span><span>" + esc(t("med.estrelas", { n: est })) + "</span></div>" : "") +
        '<p class="gg-nota">' + esc(t("med.certFinal", { n: nFases(), t: FASES.length })) + "</p>" +
        '<div class="gg-acoes"><button type="button" class="btn violeta" id="ggSegue">' + esc(t("ui.continuarBt")) + icone("seta", 24) + "</button></div></div>";
      $("#ggSegue", p.corpo).addEventListener("click", () => p.fechar());
      $("#ggVivo").textContent = t("med.titulo") + ": " + t("fase." + f.n + ".medalha");
      setTimeout(() => $("#ggSegue", p.corpo) && $("#ggSegue", p.corpo).focus({ preventScroll: true }), 60);
    });
  }

  /* ---------------- certificados ----------------
     O nome é pedido antes de emitir. Os arquivos são preparados antes do toque no botão (são links de verdade
     para os arquivos), assim o download funciona também no Safari do iPhone e do iPad. */
  function dadosCertificado(nome) {
    const d = dadosCertificado1(nome);
    if (!KIDS) return d;
    const M = v => (typeof v === "string" ? caixaAlta(v) : Array.isArray(v) ? v.map(M) : v);
    ["nome", "marcaSub", "certificamos", "registroRotulo", "creditoRotulo", "kicker", "data", "dataRotulo", "nota"].forEach(k => { d[k] = M(d[k]); });
    d.frase = d.frase.map(([x, f]) => [caixaAlta(x), f]);
    d.fases = d.fases.map(f => Object.assign({}, f, { titulo: caixaAlta(f.titulo), detalhe: caixaAlta(f.detalhe) }));
    return d;
  }
  function dadosCertificado1(nome) {
    const partes = s => s.split("**").map((x, i) => [x, i % 2 === 1]).filter(x => x[0]);
    const j = E.jornada || { data: hoje(), id: "—" }, antigas = FASES.some(f => E.fases[f.n] && E.fases[f.n].reconhecida);
    return { rosto: "img/geninho-rosto-256.png", nome, marcaSub: "GenoGame · " + t("cert.jornadaEducativa"), certificamos: t("cert.certificamos"),
      registroRotulo: t("cert.registroLocal"), creditoRotulo: t("cert.desenvolvido"),
      kicker: t("cert.kickerJornada"), frase: partes(t("cert.fraseJornada")), data: dataLocal(j.data), dataRotulo: t("cert.dataConclusao"), registro: j.id,
      nota: t("cert.nota") + (antigas ? " " + t("cert.notaReconhecida") : ""),
      fases: FASES.map(f => ({ medalhaSVG: medalhaSVG(f), titulo: t("ui.faseDe", { n: f.n, t: FASES.length }) + " · " + nomeFase(f.n), detalhe: t("fase." + f.n + ".medalha") + " · " + dataLocal(E.fases[f.n] && E.fases[f.n].data) })) };
  }
  const limparNome = s => String(s || "").replace(/\s+/g, " ").trim().slice(0, 60);
  function abrirCertificado(aoFechar) {
    if (!E.jornada) { if (aoFechar) aoFechar(); return; }
    let urls = [];
    const soltar = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
    const p = painel({ kicker: t("cert.kicker"), titulo: t("ui.certJornada"), aoFechar: () => { soltar(); if (aoFechar) aoFechar(); }, classe: "gg-cert" });
    p.limpezas.push(soltar);
    const arq = "genogame-fase-1-certificado";
    p.corpo.innerHTML = '<div class="gg-corpo"><div class="gg-cena cert-previa"><canvas id="ggCertCv" width="1123" height="794" role="img" aria-label="' + esc(t("cert.previa")) + '"></canvas><p class="cert-espera" id="ggCertEspera">' + esc(t("cert.preparando")) + "</p></div>" +
      '<div class="gg-lado"><p class="etapa">' + esc(t("cert.passo1")) + "</p>" +
      '<label class="gg-campo"><span>' + esc(t("cert.nome")) + '</span><input id="ggCertNome" type="text" maxlength="60" autocomplete="name" spellcheck="false" value="' + esc(E.nome || "") + '" aria-describedby="ggCertAjuda"></label>' +
      '<p class="gg-nota" id="ggCertAjuda">' + esc(t("cert.nomeAjuda")) + "</p>" +
      '<p class="etapa" style="margin-top:6px">' + esc(t("cert.passo2")) + "</p>" +
      '<div class="gg-acoes cert-bts"><a class="btn violeta" id="ggPdf" role="button" aria-disabled="true">' + icone("baixar", 24) + esc(t("cert.pdf")) + '</a><a class="btn ghost" id="ggPng" role="button" aria-disabled="true">' + icone("baixar", 24) + esc(t("cert.png")) + "</a>" +
      '<button type="button" class="btn ghost" id="ggShare" hidden>' + icone("compartilhar", 24) + esc(t("cert.compartilhar")) + "</button></div>" +
      '<div id="ggCertRet" aria-live="polite"></div>' +
      '<p class="gg-nota">' + esc(t("cert.safari")) + "</p><p class=\"gg-nota\">" + esc(t("cert.local")) + "</p></div></div>";
    const cv = $("#ggCertCv", p.corpo), inp = $("#ggCertNome", p.corpo), pdfA = $("#ggPdf", p.corpo), pngA = $("#ggPng", p.corpo), share = $("#ggShare", p.corpo), ret = $("#ggCertRet", p.corpo), espera1 = $("#ggCertEspera", p.corpo);
    let versao = 0, arquivos = null;
    const desativar = () => { [pdfA, pngA].forEach(a => { a.removeAttribute("href"); a.removeAttribute("download"); a.setAttribute("aria-disabled", "true"); }); share.hidden = true; arquivos = null; };
    async function gerar() {
      const v = ++versao, nome = limparNome(inp.value);
      desativar(); soltar();
      espera1.hidden = false;
      const d = dadosCertificado(nome || t("cert.semNome"));
      try {
        await GG_CERT.desenharJornada(cv, d);
      } catch (e) { console.error(e); }
      if (v !== versao || !p.el.isConnected) return;
      espera1.hidden = true;
      if (!nome) { ret.innerHTML = '<div class="gg-retorno info"><span>' + esc(t("cert.precisaNome")) + "</span></div>"; return; }
      ret.innerHTML = '<div class="gg-retorno info"><span>' + esc(t("cert.gerando")) + "</span></div>";
      try {
        const linhas = [d.kicker, d.certificamos, nome, d.frase.map(x => x[0]).join(""), d.dataRotulo + ": " + d.data, d.registroRotulo + ": " + d.registro, d.creditoRotulo + ": Thaisa Carvalho", d.nota];
        const [bPdf, bPng] = await Promise.all([GG_CERT.pdf(cv, { titulo: t("ui.certJornada") + " · " + nome, autor: "GenoGame · GenoEvidence", assunto: d.frase.map(x => x[0]).join(""), linhas }), GG_CERT.png(cv)]);
        if (v !== versao || !p.el.isConnected) return;
        const uPdf = URL.createObjectURL(bPdf), uPng = URL.createObjectURL(bPng); urls.push(uPdf, uPng);
        pdfA.href = uPdf; pdfA.download = arq + ".pdf"; pdfA.removeAttribute("aria-disabled");
        pngA.href = uPng; pngA.download = arq + ".png"; pngA.removeAttribute("aria-disabled");
        arquivos = { pdf: new File([bPdf], arq + ".pdf", { type: "application/pdf" }), png: new File([bPng], arq + ".png", { type: "image/png" }) };
        try { share.hidden = !(navigator.canShare && navigator.canShare({ files: [arquivos.pdf] }) && TOQUE); } catch (e) { share.hidden = true; }
        ret.innerHTML = '<div class="gg-retorno ok"><span>' + esc(t("cert.pronto")) + "</span></div>";
      } catch (e) {
        console.error(e);
        ret.innerHTML = '<div class="gg-retorno erro"><span>' + esc(t("cert.falhou")) + "</span></div>";
      }
    }
    [pdfA, pngA].forEach(a => a.addEventListener("click", e => {
      if (a.getAttribute("aria-disabled")) { e.preventDefault(); if (!limparNome(inp.value)) { inp.focus(); ret.innerHTML = '<div class="gg-retorno erro"><span>' + esc(t("cert.precisaNome")) + "</span></div>"; } return; }
      ret.innerHTML = '<div class="gg-retorno ok"><span>' + esc(t("cert.baixando")) + "</span></div>";
    }));
    share.addEventListener("click", () => { if (arquivos) navigator.share({ files: [arquivos.pdf], title: "GenoGame" }).catch(() => {}); });
    let espera2 = 0;
    inp.addEventListener("input", () => {
      E.nome = limparNome(inp.value); salvar();
      desativar(); clearTimeout(espera2); espera2 = setTimeout(gerar, 380);
    });
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
    gerar();
    setTimeout(() => { if (!limparNome(inp.value)) inp.focus({ preventScroll: true }); else pdfA.focus({ preventScroll: true }); }, 80);
  }

  /* ----- experimentos: moldura comum (o conteúdo de cada um está em experimentos.js) ----- */
  const FECHADO = { fechado: true };
  let animarGuardar = false;
  // o que muda no laboratório quando um experimento termina
  function aoRegistrar(id) {
    if (id === "epi") { E.epi = true; vestirEPI(gn); }
    if (id === "dna") { if (E.itens.tuboDNA === "nenhum") E.itens.tuboDNA = "suporte"; if (E.itens.tuboRes === "nenhum") E.itens.tuboRes = "suporte"; E.itens.morangos = "bancada"; }
    if (id === "gel" && E.itens.foto === "nenhum") E.itens.foto = "doc";
    if (id === "freezer" && E.mao === "tuboRes") { E.mao = null; E.maoDe = null; E.itens.tuboRes = "freezer"; animarGuardar = true; }
  }
  function abrirExperimento(id, opc) {
    const def = window.GG_EXP && window.GG_EXP[id]; if (!def) return;
    opc = opc || {};
    const p = painel({ kicker: t(def.kicker), titulo: t(def.titulo) });
    // o material usado no laboratório aparece também no painel
    if (opc.material) { const m = $(".gg-material", p.el); m.hidden = false; m.innerHTML = miniItem(opc.material) + "<span>" + esc(t("it." + opc.material)) + "</span>"; }
    p.corpo.innerHTML = '<div class="gg-corpo"><div class="gg-cena"></div><div class="gg-lado" aria-live="polite"></div></div>';
    const cena = $(".gg-cena", p.corpo), lado = $(".gg-lado", p.corpo);
    let vivo = true, reg = null, depoisFeito = false;
    // atividade fechada no meio: volta na etapa em que estava, com os dados guardados
    const retoma = E.retomar[id] && E.retomar[id].etapa > 0 ? E.retomar[id] : null;
    let avisar = !!retoma;
    p.limpezas.push(() => { vivo = false; });
    p.limpezas.push(() => { if (!depoisFeito) { depoisFeito = true; setTimeout(() => depoisDoExperimento(id, reg ? !reg.antes : false, !!reg), 60); } });
    const registrar = (estrelas, carta) => {
      if (reg) return reg;
      estrelas = clamp(Math.round(estrelas), 1, 3);
      reg = { antes: +E.feitos[id] || 0, cartaNova: !!carta && !E.cartas[carta], estrelas };
      E.feitos[id] = Math.max(reg.antes, estrelas);
      if (carta) E.cartas[carta] = true;
      delete E.retomar[id];
      aoRegistrar(id);
      salvar(); atualizarHUD(); atualizarHots();
      return reg;
    };
    const ctx = {
      t, tt, esc, icone, estrela, rm, toque: TOQUE, cena, lado, estado: E, salvar, locale: I.locale, opc,
      de: retoma ? retoma.etapa : 0, dados: retoma ? Object.assign({}, retoma.dados) : {},
      marcar(k, dados) { if (!vivo || reg) return; ctx.dados = Object.assign({}, ctx.dados, dados || {}); E.retomar[id] = { etapa: k, dados: ctx.dados }; salvar(); },
      esquecer() { delete E.retomar[id]; salvar(); },
      get vivo() { return vivo; },
      passos(n, atual) { p.passos.innerHTML = Array.from({ length: n }, (_, i) => "<i class=\"" + (i < atual ? "feito" : i === atual ? "agora" : "") + "\"></i>").join(""); },
      espera(ms) { return new Promise((r, j) => setTimeout(() => (vivo ? r() : j(FECHADO)), ms)); },
      on(alvo, tipo, fn, o) { alvo.addEventListener(tipo, fn, o); p.limpezas.push(() => alvo.removeEventListener(tipo, fn, o)); },
      loop(fn) {
        let lid = 0, ant = performance.now(), parou = false;
        const f = agora => { if (!vivo || parou) return; const dt = Math.min(0.05, (agora - ant) / 1000); ant = agora; if (fn(dt, agora) === false) return; lid = requestAnimationFrame(f); };
        lid = requestAnimationFrame(f);
        const parar = () => { parou = true; cancelAnimationFrame(lid); };
        p.limpezas.push(parar); return parar;
      },
      svg(vb, conteudo) { cena.innerHTML = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + conteudo + "</svg>"; return cena.firstChild; },
      ponto(s, e) { const pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = s.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; },
      etapa(n, total, titulo, texto, extra) {
        lado.innerHTML = '<p class="etapa">' + esc(t("ui.etapa", { n, t: total })) + "</p><h3>" + esc(titulo) + "</h3><p>" + texto + "</p>" + (extra || "") + '<div class="gg-ret"></div><div class="gg-acoes"></div>';
        if (avisar) { avisar = false; $(".gg-ret", lado).innerHTML = '<div class="gg-retorno info"><span>' + esc(t("ui.retomando")) + "</span></div>"; }
        return { ret: $(".gg-ret", lado), acoes: $(".gg-acoes", lado) };
      },
      retorno(tipo, h) { const r = $(".gg-ret", lado); if (r) r.innerHTML = h ? '<div class="gg-retorno ' + tipo + '">' + "<span>" + h + "</span></div>" : ""; },
      botao(rotulo, classe) {
        const a = $(".gg-acoes", lado); const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (classe || "violeta"); b.innerHTML = rotulo; a.appendChild(b); return b;
      },
      continuar(rotulo) {
        return new Promise((r, j) => {
          const b = ctx.botao(esc(rotulo || t("ui.continuarBt")) + icone("seta", 24));
          b.addEventListener("click", () => { b.remove(); vivo ? r() : j(FECHADO); }, { once: true });
          setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 50);
        });
      },
      segurar(b, quando) {
        const liga = e => { if (e) e.preventDefault(); b.classList.add("ativo"); quando(true); };
        const desliga = () => { if (!b.classList.contains("ativo")) return; b.classList.remove("ativo"); quando(false); };
        ctx.on(b, "pointerdown", e => { try { b.setPointerCapture(e.pointerId); } catch (er) {} liga(e); });
        ctx.on(b, "pointerup", desliga); ctx.on(b, "pointercancel", desliga); ctx.on(b, "lostpointercapture", desliga);
        ctx.on(b, "contextmenu", e => e.preventDefault());
        ctx.on(b, "keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) liga(e); });
        ctx.on(b, "keyup", e => { if (e.key === " " || e.key === "Enter") desliga(); });
        ctx.on(b, "blur", desliga);
      },
      perguntar(lista, conf) {
        conf = conf || {};
        const caixa = document.createElement("div"); caixa.className = conf.grade ? "gg-opcoes" : "gg-perguntas";
        caixa.innerHTML = lista.map((o, i) => '<button type="button" class="gg-op" data-i="' + i + '">' + (o.icone || "") + "<span>" + o.rotulo + '</span><span class="marca"></span></button>').join("");
        (conf.onde || $(".gg-acoes", lado)).appendChild(caixa);
        let erros = 0;
        return new Promise((r, j) => {
          caixa.addEventListener("click", e => {
            const b = e.target.closest(".gg-op"); if (!b || b.disabled) return;
            if (!vivo) return j(FECHADO);
            const o = lista[+b.dataset.i];
            if (o.certo) {
              b.classList.add("certo"); $(".marca", b).textContent = "✓";
              if (o.resp) ctx.retorno("ok", o.resp);
              if (!conf.multi) { $$(".gg-op", caixa).forEach(x => { x.disabled = true; }); r(erros); }
              else { b.disabled = true; conf.multi(o, erros, () => r(erros)); }
            } else {
              erros++; b.classList.add("errado", "treme"); $(".marca", b).textContent = "✗"; b.disabled = !!conf.desabilitaErro || !!conf.multi;
              setTimeout(() => b.classList.remove("treme"), 450);
              if (o.resp) ctx.retorno("erro", o.resp);
              if (conf.aoErrar) conf.aoErrar(o);
            }
          });
          const f = caixa.querySelector(".gg-op"); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
        });
      },
      registrar,
      async fim(estrelas, textos, carta) {
        const { antes, cartaNova } = registrar(estrelas, carta);
        estrelas = reg.estrelas;
        ctx.passos(def.passos || 1, def.passos || 1);
        const melhor = Math.max(antes, estrelas);
        lado.innerHTML = '<div class="gg-resultado"><p class="etapa">' + esc(t("ui.estrelas", { n: estrelas })) + '</p><div class="gg-estrelas">' + [1, 2, 3].map(k => estrela(k <= estrelas)).join("") + "</div>" +
          (antes ? '<p class="gg-nota">' + esc(estrelas > antes ? t("ui.melhorou", { n: estrelas }) : t("ui.melhorFica", { n: melhor })) + "</p>" : "") +
          textos.map(x => "<p>" + x + "</p>").join("") + (carta ? '<p class="etapa">' + esc(cartaNova ? t("ui.cartaNova") : t("ui.cartas")) + "</p>" + cartaHTML(carta, cartaNova) : "") +
          '<div class="gg-acoes" style="width:100%"><button type="button" class="btn violeta" id="ggVoltar">' + esc(t("ui.voltarLab")) + "</button></div></div>";
        lado.scrollTop = 0;
        const b = $("#ggVoltar", lado); b.focus({ preventScroll: true });
        await new Promise(r => b.addEventListener("click", r, { once: true }));
        p.fechar();
      },
      fechar() { p.fechar(); },
      geninho: GG_GENINHO, vestirEPI, cartaHTML, ESTRELAS_MAX, nEstrelas, nCartas, CARTAS
    };
    window.GG && (window.GG.ctx = ctx);   // para testes
    Promise.resolve().then(() => def.jogar(ctx)).catch(e => { if (e !== FECHADO) console.error(e); });
  }

  async function depoisDoExperimento(id, primeira, terminou) {
    ocupar();
    try {
      if (id === "freezer" && animarGuardar) {
        animarGuardar = false;
        G.foco = noMundo(lugar("tuboRes", "freezer"));
        await rig.virar(lugar("tuboRes", "freezer").x >= G.x ? 1 : -1);
        await portaFreezer(true);
        let voo = null;
        await rig.gesto("alcancar", { alto: 0.8, meio: () => { const de = maoNoMundo(); rig.segurar(null); voo = voar(ITENS.tuboRes.desenho(), de, noMundo(lugar("tuboRes", "freezer")), 300, { escDe: ESCALA, some: true }); } });
        if (voo) await voo;
        await portaFreezer(false);
        G.foco = null;
        falaCurta(t("r.guardado"));
      }
      if (terminou) await rig.gesto(primeira ? "surpresa" : "pulinho");
      if (id === "dna" && primeira) { desenharItens(); falaCurta(t("r.tubos")); }
      if (id === "epi" && primeira) falaCurta(t("r.epi"));
      if (id === "gel" && E.itens.foto === "doc") {
        desenharItens();
        const ac = acItem("pegar", "foto", "doc", guardarFoto);
        await andarAte(ac.x, ac.olhar);
        await ac.fazer();
      }
    } catch (e) { console.error(e); } finally { G.foco = null; livre(); desenharItens(); atualizarHUD(); }
    verificarFases();
  }

  /* ---------------- toque e teclado no mundo ---------------- */
  svg.addEventListener("pointerdown", e => {
    if (painelAberto() || capaAberta) return;
    if (elevEl) { fecharElevador(); return; }
    if (falaEl) return;
    const hel = e.target.closest(".hot");
    if (hel) { e.preventDefault(); comando({ h: hotDe(hel) }); return; }
    if (e.target.closest("#gn")) { curiosidade(); return; }
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const m = svg.getScreenCTM(); if (!m) return;
    const w = p.matrixTransform(m.inverse());
    const an = ANDARES.find(a => w.y >= Y0[a] && w.y < Y0[a] + 600);
    if (an !== G.andar) return;
    comando({ chao: clamp(w.x, LIM[G.andar][0], LIM[G.andar][1]) });
  });
  svg.addEventListener("keydown", e => {
    const hel = e.target.closest && e.target.closest(".hot");
    if (hel && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); comando({ h: hotDe(hel) }); }
  });
  let curI = Math.floor(Math.random() * 8);
  async function curiosidade() {
    if (G.alvo != null || G.ocupado) return;
    ocupar(); try { await rig.gesto("pulinho"); } finally { livre(); }
    curI = curI % 8 + 1;
    fala(t("cur." + curI));
  }
  addEventListener("keydown", e => {
    if (painelAberto() || capaAberta) return;
    if (falaEl) { falaEl._tecla(e); return; }
    const k = e.key;
    if (e.target.closest && e.target.closest(".gg-elevador,.ge-a11y,.ge-idioma,input,textarea")) { if (k === "Escape") fecharElevador(); return; }
    if (e.target.closest && e.target.closest("button,a") && (k === "Enter" || k === " ")) return;
    if (k === "ArrowLeft" || k === "a" || k === "A") { teclas.esq = true; G.alvo = null; G.pendente = null; e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { teclas.dir = true; G.alvo = null; G.pendente = null; e.preventDefault(); }
    else if (k === "Enter" || k === " " || k === "e" || k === "E" || k === "ArrowUp") {
      if (e.target.closest && e.target.closest(".hot")) return;
      e.preventDefault(); const h = maisPerto(); if (h) comando({ h });
    }
    else if (k === "c" || k === "C") { if (!G.ocupado) abrirCaderno("jornada"); }
    else if (k === "Escape") fecharElevador();
  });
  addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") teclas.esq = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") teclas.dir = false;
  });
  addEventListener("blur", () => { teclas.esq = teclas.dir = false; });

  /* ---------------- laço principal ---------------- */
  let ant = performance.now(), primeiroQuadro = true, relogioHUD = 0;
  const paisagens = $$(".pais", svg), portaVidro = $("#portaVidro");
  function quadro(agora) {
    const dt = Math.min(0.05, Math.max(0, (agora - ant) / 1000)); ant = agora;
    moverQuadro(dt);
    rig.quadro(dt, { vel: G.vel, acc: G.acc });
    desenharGeninho();
    // parado por um tempo, ele acena para quem joga (só se nada estiver acontecendo)
    const quieto = !G.ocupado && !falaEl && !painelAberto() && !capaAberta && Math.abs(G.vel) < 1 && G.alvo == null;
    G.parado = quieto ? G.parado + dt : 0;
    if (G.parado > 16) { G.parado = -12; rig.gesto("tchau"); }
    if (portaVidro) portaVidro.setAttribute("opacity", G.andar === "T" && Math.abs(G.x) < 90 ? ".15" : "1");
    voarMosca(dt);
    const [tx, ty] = alvoCamera();
    if (primeiroQuadro || rm()) { cam.x = tx; cam.y = ty; primeiroQuadro = false; }
    else { cam.x = lerp(cam.x, tx, Math.min(1, dt * 4.2)); cam.y = lerp(cam.y, ty, Math.min(1, dt * 5)); }
    svg.setAttribute("viewBox", cam.x.toFixed(1) + " " + cam.y.toFixed(1) + " " + cam.w.toFixed(1) + " " + cam.h.toFixed(1));
    const centro = cam.x + cam.w / 2;
    paisagens.forEach(g => { const cx = +g.dataset.cx, w = +g.dataset.w, lim = 440 - w / 2; g.setAttribute("transform", "translate(" + clamp((centro - cx) * 0.18, -lim, lim).toFixed(1) + ",0)"); });
    relogioHUD -= dt;
    if (relogioHUD <= 0) {
      relogioHUD = 0.12;
      const h = maisPerto(); marcarPerto(h); atualizarAcao(h); atualizarGuia();
    }
    if (Math.abs(G.vel) < 1 && G.alvo == null && Math.round(E.x) !== Math.round(G.x) && !G.ocupado) { E.x = G.x; E.andar = G.andar; if (E.intro) salvar(); }
    requestAnimationFrame(quadro);
  }

  /* ---------------- versão kids ---------------- */
  function botaoKids() {
    return '<button type="button" class="gg-kids-bt" role="switch" aria-checked="' + KIDS + '"><span class="chave" aria-hidden="true"><i></i></span><span><b>' + esc(t("ui.kids")) + "</b><small>" + esc(t("ui.kidsTxt")) + "</small></span></button>";
  }
  function trocarKids() {
    E.kids = !E.kids; salvar(); aplicarKids(); ultimoObj = ""; atualizarHUD(); acaoMostrada = null;
    $("#ggVivo").textContent = t(KIDS ? "ui.kidsLigada" : "ui.kidsDesligada");
  }

  /* ---------------- capa ---------------- */
  let capaAberta = true;
  function capa() {
    const tem = E.intro, f = faseAtual();
    const c = document.createElement("section");
    c.className = "gg-capa"; c.setAttribute("aria-labelledby", "ggTitulo");
    c.innerHTML = '<div class="gg-capa-in"><div class="gg-retrato"><span class="anel"></span><img src="img/geninho-corpo.jpg" alt="' + esc(t("ui.altGeninho")) + '" width="720" height="720">' +
      '<span class="orb" style="--c:#4D7CFF;width:22px;height:22px;top:8%;left:6%"></span><span class="orb" style="--c:#FF5470;width:14px;height:14px;bottom:14%;right:2%;animation-delay:-2s"></span><span class="orb" style="--c:#FFB23F;width:10px;height:10px;top:18%;right:10%;animation-delay:-3.5s"></span></div>' +
      '<div><p class="kicker">' + esc(t("ui.capaKicker")) + '</p><h1 id="ggTitulo">Geno<em>Game</em></h1><p class="sub">' + esc(t("ui.sub")) + '</p><p class="txt">' + esc(t("ui.capaTexto")) + "</p>" +
      (tem ? '<div class="gg-capa-prog"><span class="gg-pontos" aria-hidden="true">' + FASES.map(x => '<i class="' + (E.fases[x.n] ? "ok" : f && x.n === f.n ? "agora" : "") + '" style="--c:' + x.cor + '"></i>').join("") + "</span><span>" +
        esc(f ? t("ui.faseDe", { n: f.n, t: FASES.length }) + " · " + nomeFase(f.n) : t("ui.jornadaCompleta")) + " · " + esc(t("ui.medalhasConta", { n: nFases(), t: FASES.length })) + "</span></div>" : "") +
      '<div class="acoes"><button type="button" class="btn violeta" id="ggJogar">' + esc(tem ? t("ui.continuar") : t("ui.comecar")) + icone("seta", 24) + "</button>" +
      (tem ? '<button type="button" class="btn ghost" id="ggDoZero">' + esc(t("ui.recomecar")) + "</button>" : "") + "</div>" +
      botaoKids() +
      '<p class="rodape">' + esc(t("ui.salvoAqui")) + "</p>" +
      '<p class="rodape">' + esc(t("ui.desenvolvido")) + " <strong>Thaisa Carvalho</strong></p></div></div>";
    palco.appendChild(c);
    $(".gg-kids-bt", c).addEventListener("click", () => { trocarKids(); c.remove(); capa(); setTimeout(() => { const b = $(".gg-kids-bt"); if (b) b.focus({ preventScroll: true }); }, 70); });
    $("#ggJogar", c).addEventListener("click", () => {
      capaAberta = false;
      if (rm()) c.remove(); else { c.classList.add("sai"); setTimeout(() => c.remove(), 650); }
      palco.focus({ preventScroll: true });
      if (!E.intro) introducao();
      else { atualizarHots(); boasVindas(); }
    });
    const zr = $("#ggDoZero", c);
    if (zr) zr.addEventListener("click", () => { if (confirm(KIDS ? caixaAlta(t("ui.recomecarConfirma")) : t("ui.recomecarConfirma"))) { try { localStorage.removeItem(CHAVE); } catch (er) {} location.reload(); } });
    setTimeout(() => $("#ggJogar", c).focus({ preventScroll: true }), 60);
  }
  async function introducao() {
    ocupar();
    try {
      G.x = -300; G.andar = "T";
      await espera(rm() ? 50 : 500);
      await andarAte(150, 1);
      await rig.gesto("tchau");
    } finally { G.ocupa = Math.max(0, G.ocupa - 1); }
    await fala([t("f.intro1"), tt("f.intro2"), t("f.intro3")]);
    E.intro = true; E.x = G.x; E.andar = "T"; salvar(); atualizarHots(); atualizarHUD();
  }
  async function boasVindas() {
    if (E.migrou && !E.falas.migrou) {
      E.falas.migrou = 1; salvar();
      await fala([t("f.migrou", { n: E.migrou }), t("f.migrou2")]);
    }
    verificarFases();
  }

  /* ---------------- começar ---------------- */
  medir(); camAgora();
  addEventListener("resize", () => { medir(); });
  rig.virar(1, true);
  desenharItens(); atualizarHUD(); atualizarHots(); desenharGeninho();
  requestAnimationFrame(t0 => { ant = t0; requestAnimationFrame(quadro); });
  capa();
  // para testes
  window.GG = { estado: () => E, G, rig, comando: (id, an) => comando({ h: an ? HA(id, an) : H(id) }), chao: x => comando({ chao: x }), acaoDe: id => acaoDe(H(id)), faseAtual, objetivoAtual,
    abrirExperimento, viajar, verificarFases, abrirCertificado, dadosCertificado, medalhaSVG, desenharItens };
})();
