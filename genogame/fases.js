/* GenoGame · as dez etapas da Fase 1 e os materiais que o Geninho carrega.
   - A lista se chama FASES por histórico, mas cada item é uma ETAPA da Fase 1 (outras fases virão depois).
   - Cada etapa tem objetivos em ordem; o jogo mostra um de cada vez. A etapa termina quando todos estão
     feitos (o último é sempre uma ação de verdade: concluir a atividade, guardar a amostra…) e dá uma medalha.
   - Os materiais têm lugares (onde ficam no laboratório) e estados: na origem, na mão, no bolso (caderno,
     crachá, foto), em uso num equipamento, guardado. Cada um está sempre em um lugar só.
   - Textos (nomes, objetivos, medalhas) ficam em textos.js, nas chaves "fase.N.*" e "it.*". */
(function () {
  "use strict";

  /* ---------------- materiais ----------------
     Desenhos em unidades do mundo, com a base em (0,0) e o alto para y negativo: servem tanto na bancada
     quanto na palma do Geninho. */
  const tubo = (tampa, liquido) =>
    '<rect x="-3.8" y="-29" width="7.6" height="27" rx="3.8" fill="#EEF4FF" fill-opacity=".92" stroke="#8C96B0" stroke-width="1.2"/>' +
    '<rect x="-2.6" y="-13" width="5.2" height="10" rx="2.6" fill="' + liquido + '"/>' +
    '<rect x="-5" y="-34" width="10" height="6" rx="2" fill="' + tampa + '"/><rect x="4" y="-33" width="3" height="3" rx="1" fill="' + tampa + '"/>';
  const ITENS = {
    caderno: {
      desenho: () => '<rect x="-11" y="-30" width="22" height="30" rx="2.5" fill="#7B4DE0"/><rect x="-11" y="-30" width="5" height="30" rx="2" fill="#5B35C9"/>' +
        '<rect x="-3" y="-25" width="12" height="8" rx="1.5" fill="#fff" opacity=".92"/><path d="M-2 -11h10M-2 -7h7" stroke="#D9CCFF" stroke-width="1.5" stroke-linecap="round"/>',
      lugares: { origem: { andar: "T", x: 190, y: 318, alto: 1 } }
    },
    morangos: {
      desenho: () => '<path d="M-32 -18h64q-4 18 -32 18t-32 -18z" fill="#fff" stroke="#D9DEEA" stroke-width="2"/>' +
        [[-20, -22], [-6, -28], [8, -23], [22, -26], [1, -19]].map(([x, y]) => '<path d="M' + (x - 7) + " " + y + 'q7 -8 14 0q-2 10 -7 13q-5 -3 -7 -13z" fill="#E0385A"/><path d="M' + (x - 4) + " " + (y - 3) + 'l4 -4 4 4" fill="#14864A"/>').join(""),
      lugares: { origem: { andar: "T", x: 676, y: 398, alto: 0.6 }, bancada: { andar: "T", x: 712, y: 398, alto: 0.6 } }
    },
    tuboDNA: {
      desenho: est => tubo("#7B4DE0", est === "gel" || est === "termo" ? "#C9B8FF" : "#E6DDF7"),
      lugares: { suporte: { andar: "T", x: 809.5, y: 392, alto: 0.8 }, termo: { andar: "T", x: 1262, y: 332, dentro: true, alto: 0.9 }, gel: { andar: "T", x: 1776, y: 386, alto: 0.7 } }
    },
    tuboRes: {
      desenho: () => tubo("#2F5BEA", "#E6DDF7"),
      lugares: { suporte: { andar: "T", x: 829.5, y: 392, alto: 0.8 }, freezer: { andar: "S", x: 694, y: 372, dentro: true, alto: 0.7 } }
    },
    lamina: {
      desenho: () => '<rect x="-16" y="-5" width="32" height="5" rx="1" fill="#DCEEFF" stroke="#8C96B0" stroke-width="1"/><rect x="-6" y="-4.6" width="12" height="4.2" rx="1" fill="#C77DB2" opacity=".85"/>',
      lugares: { caixa: { andar: "1", x: 323, y: 372, alto: 0.6 }, micro: { andar: "1", x: 221, y: 344, alto: 0.9 } }
    },
    placa: {
      desenho: () => '<rect x="-17" y="-8" width="34" height="8" rx="2" fill="#EEF4FF" fill-opacity=".9" stroke="#8C96B0" stroke-width="1.2"/><rect x="-15" y="-5.5" width="30" height="4.5" rx="1" fill="#F3D9A4"/>' +
        '<rect x="-18" y="-10" width="36" height="3.2" rx="1.6" fill="#F4F8FF" stroke="#8C96B0" stroke-width="1"/>',
      lugares: { estufa: { andar: "1", x: 900, y: 282, alto: 1.2 }, cabine: { andar: "1", x: 726, y: 394, dentro: false, alto: 0.6 } }
    },
    foto: {
      desenho: () => '<rect x="-13" y="-18" width="26" height="18" rx="1.5" fill="#fff" stroke="#C9CFDC"/><rect x="-11" y="-16" width="22" height="13" fill="#0E1C26"/>' +
        '<path d="M-7 -13h4M-7 -10h4M-7 -7.5h4M1 -9.5h4" stroke="#7CFFB2" stroke-width="1.4"/>',
      lugares: { doc: { andar: "T", x: 1878, y: 358, alto: 1 } }
    }
  };

  /* estado inicial de cada material, a partir do que já foi feito (serve também para o progresso antigo) */
  function itensPadrao(E) {
    const f = E.feitos || {}, ok = n => !!(E.fases && E.fases[n]);
    return {
      caderno: ok(1) ? "bolso" : "origem",
      morangos: f.dna ? "bancada" : "origem",
      tuboDNA: !f.dna ? "nenhum" : f.gel ? "gel" : f.pcr ? "termo" : "suporte",
      tuboRes: !f.dna ? "nenhum" : f.freezer ? "freezer" : "suporte",
      lamina: f.micro ? "micro" : "caixa",
      placa: f.bacterias ? "cabine" : "estufa",
      foto: f.gel ? "bolso" : "nenhum"
    };
  }

  /* ---------------- as dez fases ----------------
     alvo: o objeto do laboratório onde a ação acontece (para o marcador e a seta de orientação). */
  const FASES = [
    { n: 1, cor: "#0E9AA7", icone: "bussola", exp: null, objetivos: [
      { id: "mural", feito: E => !!E.etapas.mural, alvo: "mural" },
      { id: "caderno", feito: E => E.itens.caderno === "bolso", alvo: "mural" },
      { id: "armario", feito: E => !!E.etapas.armario, alvo: "epi" }] },
    { n: 2, cor: "#D98A0B", icone: "epi", exp: "epi", objetivos: [
      { id: "vestir", feito: E => !!E.feitos.epi, alvo: "epi" }] },
    { n: 3, cor: "#7B4DE0", icone: "dna", exp: "dna", objetivos: [
      { id: "morangos", feito: E => E.itens.morangos !== "origem" || !!E.feitos.dna, alvo: "dna" },
      { id: "extrair", feito: E => !!E.feitos.dna, alvo: "dna" }] },
    { n: 4, cor: "#E0385A", icone: "pcr", exp: "pcr", objetivos: [
      { id: "tubo", feito: E => E.itens.tuboDNA !== "suporte" || !!E.feitos.pcr, alvo: "dna" },
      { id: "pcr", feito: E => !!E.feitos.pcr, alvo: "pcr" }] },
    { n: 5, cor: "#2F5BEA", icone: "gel", exp: "gel", objetivos: [
      { id: "retirar", feito: E => E.itens.tuboDNA !== "termo" || !!E.feitos.gel, alvo: "pcr" },
      { id: "gel", feito: E => !!E.feitos.gel, alvo: "gel" }] },
    { n: 6, cor: "#B43C8F", icone: "micro", exp: "micro", objetivos: [
      { id: "lamina", feito: E => E.itens.lamina !== "caixa" || !!E.feitos.micro, alvo: "micro" },
      { id: "micro", feito: E => !!E.feitos.micro, alvo: "micro" }] },
    { n: 7, cor: "#14864A", icone: "bacterias", exp: "bacterias", objetivos: [
      { id: "placa", feito: E => E.itens.placa !== "estufa" || !!E.feitos.bacterias, alvo: "bacterias" },
      { id: "bac", feito: E => !!E.feitos.bacterias, alvo: "bacterias" }] },
    { n: 8, cor: "#4450D0", icone: "bio", exp: "bio", objetivos: [
      { id: "bio", feito: E => !!E.feitos.bio, alvo: "bio" }] },
    { n: 9, cor: "#1F7FB8", icone: "freezer", exp: "freezer", objetivos: [
      { id: "cracha", feito: E => !!E.cracha || !!E.feitos.freezer, alvo: "jaleco" },
      { id: "reserva", feito: E => E.itens.tuboRes !== "suporte" || !!E.feitos.freezer, alvo: "dna" },
      { id: "guardar", feito: E => !!E.feitos.freezer, alvo: "freezer" }] },
    { n: 10, cor: "#E2632A", icone: "artigo", exp: "publicar", objetivos: [
      { id: "artigo", feito: E => !!E.publicado, alvo: "revistas" }] }
  ];

  window.GG_FASES = { FASES, ITENS, itensPadrao };
})();
