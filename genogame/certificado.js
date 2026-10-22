/* GenoGame · certificado da fase (dado no fim das dez etapas)
   - O certificado é desenhado num canvas do tamanho de uma folha A4 deitada (2480 × 1754 px, cerca de 212 pontos
     por polegada). Daí saem os dois arquivos: PNG (a imagem) e PDF (a mesma imagem numa página A4 paisagem).
   - O PDF é montado aqui mesmo, byte a byte (formato PDF 1.4: uma página, a imagem em JPEG e, por baixo, o texto
     invisível para que o arquivo possa ser pesquisado). Nada é enviado para fora do aparelho.
   - Os textos chegam prontos do genogame.js, já no idioma escolhido. */
(function () {
  "use strict";
  const W = 2480, H = 1754, B = W / 1123;   // desenha-se numa grade de 1123 × 794 (A4 a 96 ppp) e amplia-se
  const F = { disp: "Unbounded, 'Arial Black', sans-serif", sans: "'IBM Plex Sans', system-ui, sans-serif", mono: "'IBM Plex Mono', ui-monospace, monospace" };
  const COR = { ink: "#0F1730", ink2: "#3A4560", muted: "#6B7590", line: "#E6E9F0", violeta: "#7B4DE0", acento: "#E0385A" };

  async function prepararFontes() {
    const lista = ["700 46px Unbounded", "600 20px Unbounded", "500 20px 'IBM Plex Sans'", "600 20px 'IBM Plex Sans'", "700 20px 'IBM Plex Sans'", "600 15px 'IBM Plex Mono'", "500 15px 'IBM Plex Mono'"];
    try { await Promise.race([Promise.all(lista.map(f => document.fonts.load(f, "ÁÉãçõ"))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  }
  function carregarImagem(src) {
    return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  }
  // SVG em texto → imagem (para desenhar a medalha no canvas)
  function imagemSVG(svg) {
    return carregarImagem("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }

  /* ---------- texto com partes em negrito, quebrado em linhas ----------
     partes: [[texto, fonte, cor], …] */
  function quebrar(g, partes, largura) {
    const pal = [];
    partes.forEach(([txt, fonte, cor]) => { String(txt).split(/(\s+)/).forEach(p => { if (p) pal.push({ p, fonte, cor }); }); });
    const linhas = []; let linha = [], w = 0;
    pal.forEach(item => {
      g.font = item.fonte; const lw = g.measureText(item.p).width;
      const espaco = /^\s+$/.test(item.p);
      if (!espaco && w + lw > largura && linha.length) { while (linha.length && /^\s+$/.test(linha[linha.length - 1].p)) { w -= linha.pop().w; } linhas.push({ itens: linha, w }); linha = []; w = 0; }
      if (espaco && !linha.length) return;
      linha.push({ ...item, w: lw }); w += lw;
    });
    if (linha.length) linhas.push({ itens: linha, w });
    return linhas;
  }
  function escreverLinhas(g, linhas, x, y, alt, alinhar) {
    linhas.forEach((l, i) => {
      let xx = alinhar === "centro" ? x - l.w / 2 : x;
      l.itens.forEach(it => { g.font = it.fonte; g.fillStyle = it.cor; g.fillText(it.p, xx, y + i * alt); xx += it.w; });
    });
    return y + linhas.length * alt;
  }
  // o nome cabe sempre: diminui a letra; se ainda for longo, quebra em duas linhas
  function escreverNome(g, nome, x, y, largura) {
    let tam = 46;
    const fonte = t => "700 " + t + "px " + F.disp;
    g.font = fonte(tam);
    while (g.measureText(nome).width > largura && tam > 30) { tam -= 1; g.font = fonte(tam); }
    g.fillStyle = COR.violeta;
    if (g.measureText(nome).width <= largura) { g.fillText(nome, x, y); return y + 16; }
    tam = 30; g.font = fonte(tam);
    const linhas = quebrar(g, [[nome, fonte(tam), COR.violeta]], largura).slice(0, 3);
    while (linhas.some(l => l.w > largura) && tam > 18) { tam -= 1; g.font = fonte(tam); linhas.splice(0, linhas.length, ...quebrar(g, [[nome, fonte(tam), COR.violeta]], largura).slice(0, 3)); }
    const alt = tam * 1.18, fim = escreverLinhas(g, linhas, x, y - 14, alt);
    return fim - alt + 14;   // logo abaixo da última linha do nome
  }

  function moldura(g, cor) {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 1123, 794);
    // faixa suave no alto, com a cor da medalha
    const fx = g.createLinearGradient(0, 0, 1123, 0); fx.addColorStop(0, "#F2ECFE"); fx.addColorStop(1, "#FFFFFF");
    g.fillStyle = fx; g.fillRect(0, 0, 1123, 200);
    const gr = g.createLinearGradient(0, 0, 1123, 794); gr.addColorStop(0, "#4D7CFF"); gr.addColorStop(0.5, "#A58CFF"); gr.addColorStop(1, "#FF5470");
    g.strokeStyle = gr; g.lineWidth = 9; g.strokeRect(18, 18, 1123 - 36, 794 - 36);
    g.strokeStyle = COR.line; g.lineWidth = 1.2; g.strokeRect(34, 34, 1123 - 68, 794 - 68);
    g.fillStyle = cor || COR.violeta; g.fillRect(34, 34, 1123 - 68, 5);
    return gr;
  }
  function marca(g, gr, sub) {
    g.save(); g.translate(82, 88);
    g.beginPath(); g.arc(0, 0, 19, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 2.2; g.lineCap = "round";
    g.beginPath(); g.moveTo(-6, -10); g.bezierCurveTo(-6, -2, 6, -2, 6, 0); g.bezierCurveTo(6, 2, -6, 2, -6, 10); g.stroke();
    g.beginPath(); g.moveTo(6, -10); g.bezierCurveTo(6, -2, -6, -2, -6, 0); g.bezierCurveTo(-6, 2, 6, 2, 6, 10); g.stroke();
    g.restore();
    g.fillStyle = COR.ink; g.font = "600 21px " + F.disp; g.fillText("GenoEvidence", 112, 86);
    g.fillStyle = COR.muted; g.font = "500 13px " + F.mono; g.fillText(sub, 113, 106);
  }
  function retrato(g, gr, rosto) {
    if (!rosto) return;
    const cx = 1123 - 128, cy = 132, r = 66;
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.clip();
    g.drawImage(rosto, cx - r + 5, cy - r + 5, (r - 5) * 2, (r - 5) * 2); g.restore();
  }
  function rodape(g, d) {
    const col = [[64, d.dataRotulo, d.data], [430, d.registroRotulo, d.registro], [760, d.creditoRotulo, "Thaisa Carvalho"]];
    g.strokeStyle = COR.line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(64, 652); g.lineTo(1123 - 64, 652); g.stroke();
    col.forEach(([x, rot, val]) => {
      g.fillStyle = COR.muted; g.font = "600 12px " + F.mono; g.fillText(rot.toUpperCase(), x, 682);
      g.fillStyle = COR.ink; g.font = "600 18px " + F.sans; g.fillText(val, x, 708, 330);
    });
    g.fillStyle = COR.muted; g.font = "500 12.5px " + F.sans;
    escreverLinhas(g, quebrar(g, [[d.nota, "500 12.5px " + F.sans, COR.muted]], 1123 - 128), 64, 740, 17);
  }

  /* ---------- certificado da Fase 1: as dez etapas, com medalha e data de cada uma ---------- */
  async function desenharJornada(cv, d) {
    await prepararFontes();
    const rosto = await carregarImagem(d.rosto);
    const meds = await Promise.all(d.fases.map(f => imagemSVG(f.medalhaSVG)));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d"); g.setTransform(B, 0, 0, B, 0, 0);
    const gr = moldura(g, null); marca(g, gr, d.marcaSub); retrato(g, gr, rosto);
    g.fillStyle = COR.acento; g.font = "600 15px " + F.mono; g.fillText(d.kicker.toUpperCase(), 64, 182);
    g.fillStyle = COR.ink2; g.font = "500 20px " + F.sans; g.fillText(d.certificamos, 64, 226);
    let y = escreverNome(g, d.nome, 64, 280, 760);
    const corpo = quebrar(g, d.frase.map(([txt, forte]) => [txt, (forte ? "700 " : "500 ") + "18px " + F.sans, forte ? COR.ink : COR.ink2]), 800);
    y = escreverLinhas(g, corpo, 64, y + 26, 26);
    // as dez fases em duas colunas, sempre acima do rodapé (a linha divisória fica em 652)
    const y0 = Math.max(y + 18, 384), alt = Math.max(36, Math.min(50, (632 - y0) / 5));
    d.fases.forEach((f, i) => {
      const x = i < 5 ? 64 : 580, yy = y0 + (i % 5) * alt;
      if (meds[i]) g.drawImage(meds[i], x, yy - 8, 34, 42);
      g.fillStyle = COR.ink; g.font = "700 15px " + F.sans; g.fillText(f.titulo, x + 46, yy + 10, 440);
      g.fillStyle = COR.muted; g.font = "500 13px " + F.sans; g.fillText(f.detalhe, x + 46, yy + 29, 440);
    });
    rodape(g, d);
    return cv;
  }

  /* ---------- arquivos ---------- */
  const paraBlob = (cv, tipo, q) => new Promise((r, j) => { try { cv.toBlob(b => (b ? r(b) : j(new Error("blob"))), tipo, q); } catch (e) { j(e); } });
  function png(cv) { return paraBlob(cv, "image/png"); }

  // texto → bytes no padrão de letras do PDF (WinAnsi); o que não existe nele vira "?"
  const ESPECIAIS = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };
  function textoPDF(s) {
    let out = "";
    for (const ch of String(s)) {
      let c = ch.codePointAt(0);
      if (c > 255 || (c >= 128 && c < 160)) c = ESPECIAIS[c] || 63;
      if (c === 40 || c === 41 || c === 92) out += "\\" + String.fromCharCode(c);
      else if (c < 32 || c > 126) out += "\\" + c.toString(8).padStart(3, "0");
      else out += String.fromCharCode(c);
    }
    return "(" + out + ")";
  }
  // texto em UTF-16 (para título e autor nas propriedades do arquivo)
  function hexUTF16(s) {
    let h = "FEFF";
    for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
    return "<" + h + ">";
  }
  async function pdf(cv, meta) {
    const jpg = new Uint8Array(await (await paraBlob(cv, "image/jpeg", 0.93)).arrayBuffer());
    const PW = 841.89, PH = 595.28;   // A4 deitada, em pontos
    const ascii = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
    const partes = [], offs = [];
    let tam = 0;
    const add = x => { const b = typeof x === "string" ? ascii(x) : x; partes.push(b); tam += b.length; };
    const obj = (n, corpo) => { offs[n] = tam; add(n + " 0 obj\n"); corpo(); add("\nendobj\n"); };
    const agora = new Date(), z = n => String(n).padStart(2, "0");
    const dataPDF = "D:" + agora.getFullYear() + z(agora.getMonth() + 1) + z(agora.getDate()) + z(agora.getHours()) + z(agora.getMinutes()) + z(agora.getSeconds());
    // texto invisível (modo 3): o arquivo pode ser pesquisado e lido por leitores de tela
    const linhas = (meta.linhas || []).filter(Boolean);
    let conteudo = "q " + PW + " 0 0 " + PH + " 0 0 cm /Im0 Do Q\nBT 3 Tr /F1 11 Tf 14 TL 48 " + (PH - 60) + " Td\n";
    linhas.forEach(l => { conteudo += textoPDF(l) + " Tj T*\n"; });
    conteudo += "ET\n";

    add("%PDF-1.4\n%âãÏÓ\n");
    obj(1, () => add("<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> >>"));
    obj(2, () => add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    obj(3, () => add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 6 0 R >> >> /Contents 5 0 R >>"));
    obj(4, () => { add("<< /Type /XObject /Subtype /Image /Width " + cv.width + " /Height " + cv.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpg.length + " >>\nstream\n"); add(jpg); add("\nendstream"); });
    obj(5, () => { add("<< /Length " + ascii(conteudo).length + " >>\nstream\n"); add(conteudo); add("endstream"); });
    obj(6, () => add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
    obj(7, () => add("<< /Title " + hexUTF16(meta.titulo || "GenoGame") + " /Author " + hexUTF16(meta.autor || "") + " /Subject " + hexUTF16(meta.assunto || "") +
      " /Creator (GenoGame - GenoEvidence) /Producer (GenoGame) /CreationDate (" + dataPDF + ") >>"));
    const xref = tam;
    let x = "xref\n0 8\n0000000000 65535 f \n";
    for (let n = 1; n <= 7; n++) x += String(offs[n]).padStart(10, "0") + " 00000 n \n";
    add(x + "trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return new Blob(partes, { type: "application/pdf" });
  }

  window.GG_CERT = { desenharJornada, png, pdf, W, H };
})();
