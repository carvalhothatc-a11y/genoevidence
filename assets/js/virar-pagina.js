/* GenoEvidence · página virando ao trocar de página (todas as páginas; carregado no <head>)
   - Ao abrir outra página, a folha atual vira para a esquerda e revela a próxima.
   - Ao voltar (botão de voltar do app, do celular ou do navegador), a folha anterior volta pelo outro lado.
   - Entre as abas de baixo (Início → Notícias → Temas → Revistas), a direção segue a ordem das abas.
   Usa as transições entre páginas do navegador (View Transitions). Onde não existem, a troca é normal.
   Com "reduzir movimento" (no aparelho ou no painel de acessibilidade) a página só troca, sem virar. */
(function () {
  "use strict";
  var css =
    "@view-transition{navigation:auto}" +
    "::view-transition-old(root),::view-transition-new(root){animation-duration:.6s;animation-timing-function:cubic-bezier(.45,.05,.25,1);mix-blend-mode:normal;backface-visibility:hidden}" +
    /* avançar: a página atual vira para a esquerda e revela a próxima por baixo */
    "::view-transition-old(root){z-index:2;transform-origin:left center;animation-name:ge-folha-vai}" +
    "::view-transition-new(root){z-index:1;animation-name:ge-por-baixo}" +
    /* voltar: a folha anterior volta por cima, do outro lado */
    "html:active-view-transition-type(voltar)::view-transition-new(root){z-index:2;transform-origin:left center;animation-name:ge-folha-volta}" +
    "html:active-view-transition-type(voltar)::view-transition-old(root){z-index:1;animation-name:ge-por-baixo-sai}" +
    "@keyframes ge-folha-vai{from{transform:perspective(1800px) rotateY(0);filter:brightness(1)}to{transform:perspective(1800px) rotateY(-100deg);filter:brightness(.8)}}" +
    "@keyframes ge-folha-volta{from{transform:perspective(1800px) rotateY(-100deg);filter:brightness(.8)}to{transform:perspective(1800px) rotateY(0);filter:brightness(1)}}" +
    "@keyframes ge-por-baixo{from{filter:brightness(.8)}to{filter:brightness(1)}}" +
    "@keyframes ge-por-baixo-sai{from{filter:brightness(1)}to{filter:brightness(.8)}}" +
    "@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}";
  var st = document.createElement("style"); st.id = "ge-virar-css"; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var parado = function () {
    return matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("ge-sem-animacao");
  };
  // posição das abas de baixo; outras páginas não entram na conta
  function aba(u) {
    var p; try { p = new URL(u, location.href).pathname; } catch (e) { return -1; }
    if (/\/noticias\/(index\.html)?$/.test(p)) return 1;
    if (/\/artigos\/(index\.html)?$/.test(p)) return 2;
    if (/\/revistas\/(index\.html)?$/.test(p)) return 3;
    if (/\/genoevidence\/(index\.html)?$/.test(p) || p === "/" || /^\/index\.html$/.test(p)) return 0;
    return -1;
  }
  function direcao() {
    // o botão de voltar do app, quando não há página anterior, leva ao Início e deixa este aviso
    try { if (sessionStorage.getItem("ge-virar") === "voltar") { sessionStorage.removeItem("ge-virar"); return "voltar"; } } catch (e) {}
    var nav = window.navigation, at = nav && nav.activation;
    if (at && at.from && at.entry) {
      if (at.navigationType === "traverse") return at.from.index > at.entry.index ? "voltar" : "avancar";
      var de = aba(at.from.url), para = aba(at.entry.url);
      if (de >= 0 && para >= 0) return para < de ? "voltar" : "avancar";
      return "avancar";
    }
    // navegadores sem a API de navegação: voltar ou avançar pelo histórico conta como voltar
    var ent = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    return ent && ent.type === "back_forward" ? "voltar" : "avancar";
  }
  addEventListener("pagereveal", function (e) {
    if (!e.viewTransition) return;
    if (parado()) { e.viewTransition.skipTransition(); return; }
    if (e.viewTransition.types) e.viewTransition.types.add(direcao());
  });
  addEventListener("pageswap", function (e) {
    if (e.viewTransition && parado()) e.viewTransition.skipTransition();
  });
})();
