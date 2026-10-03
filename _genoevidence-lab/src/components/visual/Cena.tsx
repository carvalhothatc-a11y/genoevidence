import type { ReactNode } from "react";
import { ENTIDADE_NOME, type PassoVisual } from "@/lib/visual/roteiro";

/**
 * Cenas em SVG (viewBox 640×360) desenhadas a partir de uma etapa do roteiro, com progresso t ∈ [0,1].
 * Estilo holográfico nas cores da marca. ILUSTRAÇÃO DIDÁTICA: formas, escalas e quantidades não são reais.
 * Puro SVG (sem HTML) para poder ser exportado como imagem.
 */
export const W = 640;
export const H = 360;

const C = {
  azul: "#4d7cff",
  violeta: "#8f68ff",
  rosa: "#e679b5",
  teal: "#5fd4dd",
  ambar: "#ffb23f",
  branco: "#eef2f9",
  apoio: "#a7b2c8",
  linha: "rgba(180,156,245,0.55)",
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Progresso normalizado de um subintervalo [a, b] de t, com suavização. */
const seg = (t: number, a: number, b: number) => {
  const x = clamp((t - a) / (b - a));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function Defs() {
  return (
    <defs>
      <linearGradient id="vgA" x1="0" x2="1">
        <stop offset="0" stopColor={C.azul} />
        <stop offset="1" stopColor={C.violeta} />
      </linearGradient>
      <linearGradient id="vgB" x1="0" x2="1">
        <stop offset="0" stopColor={C.rosa} />
        <stop offset="1" stopColor={C.violeta} />
      </linearGradient>
      <radialGradient id="vgCel" cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="rgba(143,104,255,0.28)" />
        <stop offset="1" stopColor="rgba(77,124,255,0.06)" />
      </radialGradient>
      <radialGradient id="vgPlaca" cx="50%" cy="50%" r="55%">
        <stop offset="0" stopColor="rgba(95,212,221,0.10)" />
        <stop offset="1" stopColor="rgba(143,104,255,0.18)" />
      </radialGradient>
      <filter id="vgBrilho" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ---------------------------------------------------------------- primitivas

function Helice({ x, y, w, amp = 14, sep = 0, cor1 = "url(#vgA)", cor2 = "url(#vgB)", fase = 0, espessura = 4, pontes = true }: { x: number; y: number; w: number; amp?: number; sep?: number; cor1?: string; cor2?: string; fase?: number; espessura?: number; pontes?: boolean }) {
  const a: string[] = [];
  const b: string[] = [];
  const k = (Math.PI * 2) / 60;
  const ampE = amp * (1 - 0.6 * sep);
  for (let i = 0; i <= w; i += 4) {
    a.push(`${x + i},${(y - sep * 26 + ampE * Math.sin(i * k + fase)).toFixed(1)}`);
    b.push(`${x + i},${(y + sep * 26 + ampE * Math.sin(i * k + fase + Math.PI)).toFixed(1)}`);
  }
  return (
    <g filter="url(#vgBrilho)">
      {pontes && sep < 0.3 && (
        <g stroke={C.branco} strokeOpacity={0.45 * (1 - sep / 0.3)} strokeWidth={1.4}>
          {Array.from({ length: Math.floor(w / 15) }, (_, j) => {
            const xi = 7 + j * 15;
            return <line key={j} x1={x + xi} x2={x + xi} y1={y + amp * Math.sin(xi * k + fase)} y2={y + amp * Math.sin(xi * k + fase + Math.PI)} />;
          })}
        </g>
      )}
      <polyline points={a.join(" ")} fill="none" stroke={cor1} strokeWidth={espessura} strokeLinecap="round" />
      <polyline points={b.join(" ")} fill="none" stroke={cor2} strokeWidth={espessura} strokeLinecap="round" />
    </g>
  );
}

function Fita({ x, y, w, cor = C.teal, onda = 5, esp = 4 }: { x: number; y: number; w: number; cor?: string; onda?: number; esp?: number }) {
  const p: string[] = [];
  for (let i = 0; i <= w; i += 4) p.push(`${x + i},${(y + onda * Math.sin(i / 9)).toFixed(1)}`);
  return <polyline points={p.join(" ")} fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" filter="url(#vgBrilho)" />;
}

/** Plasmídeo: anel com abertura (0 fechado → 1 aberto) e arco do inserto opcional. */
function Plasmideo({ cx, cy, r, abertura = 0, inserto = 0, rotulo }: { cx: number; cy: number; r: number; abertura?: number; inserto?: number; rotulo?: boolean }) {
  const gap = abertura * 0.55; // radianos de cada lado do topo
  const arco = (a0: number, a1: number) => {
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${r},${r} 0 ${large} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
  };
  const topo = -Math.PI / 2;
  return (
    <g filter="url(#vgBrilho)">
      <path d={arco(topo + gap + 0.02, topo + Math.PI * 2 - gap - 0.02)} fill="none" stroke="url(#vgA)" strokeWidth={6} strokeLinecap="round" />
      <path d={arco(topo + gap + 0.02, topo + Math.PI * 2 - gap - 0.02)} fill="none" stroke={C.branco} strokeOpacity={0.25} strokeWidth={1.2} strokeDasharray="2 6" />
      {inserto > 0 && <path d={arco(topo - 0.5 * inserto, topo + 0.5 * inserto)} fill="none" stroke={C.rosa} strokeWidth={7} strokeLinecap="round" />}
      {/* marcador de resistência */}
      <path d={arco(topo + 2.2, topo + 2.9)} fill="none" stroke={C.ambar} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
      {rotulo && <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={C.apoio}>plasmídeo</text>}
    </g>
  );
}

function Bacteria({ cx, cy, w, h, children, cromossomo = true }: { cx: number; cy: number; w: number; h: number; children?: ReactNode; cromossomo?: boolean }) {
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} fill="url(#vgCel)" stroke={C.violeta} strokeWidth={2.5} filter="url(#vgBrilho)" />
      <rect x={cx - w / 2 + 7} y={cy - h / 2 + 7} width={w - 14} height={h - 14} rx={(h - 14) / 2} fill="none" stroke={C.azul} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="5 5" />
      {cromossomo && <path d={`M${cx - w * 0.28},${cy + 6} C ${cx - w * 0.18},${cy - h * 0.3} ${cx - w * 0.02},${cy + h * 0.32} ${cx + w * 0.1},${cy - 4} S ${cx + w * 0.26},${cy - h * 0.25} ${cx + w * 0.3},${cy + 8}`} fill="none" stroke={C.teal} strokeWidth={2.5} strokeOpacity={0.8} />}
      {children}
    </g>
  );
}

function CelulaEuc({ cx, cy, r, children }: { cx: number; cy: number; r: number; children?: ReactNode }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="url(#vgCel)" stroke={C.violeta} strokeWidth={2.5} filter="url(#vgBrilho)" />
      <circle cx={cx + r * 0.12} cy={cy + r * 0.05} r={r * 0.36} fill="rgba(77,124,255,0.12)" stroke={C.azul} strokeWidth={1.8} />
      {children}
    </g>
  );
}

function Tubo({ x, y, h = 120, liquido = 0.4, cor = C.violeta, rotulo }: { x: number; y: number; h?: number; liquido?: number; cor?: string; rotulo?: string }) {
  const w = h * 0.32;
  const corpo = `M${x - w / 2},${y} L${x + w / 2},${y} L${x + w / 2},${y + h * 0.62} Q${x + w / 2},${y + h} ${x},${y + h} Q${x - w / 2},${y + h} ${x - w / 2},${y + h * 0.62} Z`;
  const ly = y + h * (1 - liquido);
  return (
    <g filter="url(#vgBrilho)">
      <clipPath id={`tubo-${Math.round(x)}-${Math.round(y)}`}>
        <path d={corpo} />
      </clipPath>
      <rect x={x - w / 2} y={ly} width={w} height={h} fill={cor} opacity={0.45} clipPath={`url(#tubo-${Math.round(x)}-${Math.round(y)})`} />
      <path d={corpo} fill="rgba(238,242,249,0.05)" stroke={C.branco} strokeOpacity={0.8} strokeWidth={1.8} />
      <rect x={x - w / 2 - 4} y={y - 8} width={w + 8} height={9} rx={3} fill="rgba(238,242,249,0.08)" stroke={C.branco} strokeOpacity={0.7} strokeWidth={1.5} />
      {rotulo && (
        <text x={x} y={y + h + 18} textAnchor="middle" fontSize={11} fill={C.apoio}>
          {rotulo}
        </text>
      )}
    </g>
  );
}

function Pipeta({ x, y }: { x: number; y: number }) {
  return (
    <g filter="url(#vgBrilho)">
      <rect x={x - 9} y={y - 120} width={18} height={70} rx={6} fill="rgba(77,124,255,0.18)" stroke={C.azul} strokeWidth={1.8} />
      <rect x={x - 5} y={y - 135} width={10} height={16} rx={3} fill="rgba(77,124,255,0.3)" stroke={C.azul} strokeWidth={1.5} />
      <path d={`M${x - 6},${y - 50} L${x + 6},${y - 50} L${x + 1.5},${y} L${x - 1.5},${y} Z`} fill="rgba(238,242,249,0.12)" stroke={C.branco} strokeWidth={1.3} />
    </g>
  );
}

function Proteina({ cx, cy, s = 1, cor = C.rosa }: { cx: number; cy: number; s?: number; cor?: string }) {
  return (
    <g filter="url(#vgBrilho)" transform={`translate(${cx} ${cy}) scale(${s})`}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(a) * 8} cy={Math.sin(a) * 8} r={6} fill={cor} opacity={0.75} />;
      })}
      <circle r={6} fill={C.violeta} />
    </g>
  );
}

function Enzima({ cx, cy, abre = 0.5, cor = C.ambar }: { cx: number; cy: number; abre?: number; cor?: string }) {
  const a = 0.25 + 0.5 * abre;
  return (
    <path
      d={`M${cx},${cy} L${cx + 22 * Math.cos(a)},${cy - 22 * Math.sin(a)} A22,22 0 1 0 ${cx + 22 * Math.cos(a)},${cy + 22 * Math.sin(a)} Z`}
      fill={cor}
      opacity={0.9}
      filter="url(#vgBrilho)"
    />
  );
}

function Placa({ cx, cy, r, colonias, destaque }: { cx: number; cy: number; r: number; colonias: number; destaque?: number }) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = i * 2.39996;
    const d = r * 0.82 * Math.sqrt((i + 0.5) / 28);
    return [cx + d * Math.cos(a), cy + d * Math.sin(a) * 0.55] as const;
  });
  return (
    <g>
      <ellipse cx={cx} cy={cy + 10} rx={r + 8} ry={(r + 8) * 0.55} fill="none" stroke={C.branco} strokeOpacity={0.25} strokeWidth={2} />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.55} fill="url(#vgPlaca)" stroke={C.branco} strokeOpacity={0.8} strokeWidth={2} filter="url(#vgBrilho)" />
      {pts.slice(0, colonias).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === destaque ? 7 : 5} fill={i % 3 === 0 ? C.rosa : C.teal} opacity={0.9} stroke={i === destaque ? C.branco : "none"} strokeWidth={2} />
      ))}
    </g>
  );
}

function Rotulo({ x, y, x2: x2Pedido, y2, texto, sub, alinhar = "start" }: { x: number; y: number; x2: number; y2: number; texto: string; sub?: string; alinhar?: "start" | "end" }) {
  // mantém o texto dentro do quadro (largura aproximada das letras)
  const largura = Math.max(texto.length * 7.4, (sub?.length ?? 0) * 5.8);
  const x2 = alinhar === "start" ? Math.min(x2Pedido, W - 8 - 6 - largura) : Math.max(x2Pedido, 8 + 6 + largura);
  return (
    <g>
      <line x1={x} y1={y} x2={x2} y2={y2} stroke={C.linha} strokeWidth={1.2} />
      <circle cx={x} cy={y} r={3} fill={C.rosa} />
      <text x={x2 + (alinhar === "start" ? 6 : -6)} y={y2 + 4} textAnchor={alinhar} fontSize={13} fill={C.branco} fontWeight={600}>
        {texto}
      </text>
      {sub && (
        <text x={x2 + (alinhar === "start" ? 6 : -6)} y={y2 + 19} textAnchor={alinhar} fontSize={10.5} fill={C.apoio}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Seta({ x1, y1, x2, y2, k = 1 }: { x1: number; y1: number; x2: number; y2: number; k?: number }) {
  const xe = lerp(x1, x2, k);
  const ye = lerp(y1, y2, k);
  return (
    <g opacity={k > 0.02 ? 1 : 0}>
      <line x1={x1} y1={y1} x2={xe} y2={ye} stroke={C.violeta} strokeWidth={2} strokeDasharray="4 5" />
      {k > 0.95 && <circle cx={x2} cy={y2} r={3.5} fill={C.violeta} />}
    </g>
  );
}

// ---------------------------------------------------------------- cenas por ação

export function Cena({ passo, t }: { passo: PassoVisual; t: number }) {
  const r = passo.rotulos;
  const gene = r.gene;
  const nomeOrigem = passo.origem ? ENTIDADE_NOME[passo.origem] : "Material";
  switch (passo.acao) {
    case "pipetar":
    case "misturar": {
      const k = seg(t, 0.1, 0.9);
      const px = lerp(200, 440, seg(t, 0.4, 0.85));
      const py = lerp(110, 150, seg(t, 0.1, 0.35)) - 30 * seg(t, 0.35, 0.5) + 30 * seg(t, 0.85, 1);
      return (
        <g>
          <Tubo x={200} y={150} h={130} liquido={0.45} cor={passo.origem === "primer" ? C.teal : C.violeta} rotulo={`${nomeOrigem} (estoque)`} />
          <Tubo x={440} y={150} h={130} liquido={0.3 + 0.15 * seg(t, 0.85, 1)} cor={C.azul} rotulo={passo.destino ? ENTIDADE_NOME[passo.destino] : "Mistura de reação"} />
          <g transform={`translate(${px - 200} ${py - 110})`}>
            <Pipeta x={200} y={150} />
            <circle cx={200} cy={156} r={5 * (k > 0.3 && k < 0.95 ? 1 : 0)} fill={passo.origem === "primer" ? C.teal : C.violeta} filter="url(#vgBrilho)" />
          </g>
          {passo.origem === "primer" && t > 0.3 && <Fita x={180} y={240} w={36} cor={C.teal} esp={3} />}
          <Rotulo x={214} y={200} x2={260} y2={70} texto={nomeOrigem} sub="retirado com a micropipeta" />
        </g>
      );
    }
    case "desnaturar":
    case "anelar":
    case "estender": {
      const sep = passo.acao === "desnaturar" ? seg(t, 0.1, 0.8) : 1 - (passo.acao === "anelar" ? 1 - seg(t, 0, 0.35) : 0);
      const pk = passo.acao === "anelar" ? seg(t, 0.45, 0.9) : 1;
      const ek = passo.acao === "estender" ? seg(t, 0.15, 0.95) : 0;
      return (
        <g>
          <Helice x={110} y={180} w={420} sep={sep} amp={16} fase={t * 2} />
          {passo.acao !== "desnaturar" && (
            <g>
              <g transform={`translate(0 ${lerp(-90, 0, pk)})`} opacity={pk}>
                <rect x={390} y={137} width={60} height={7} rx={3} fill={C.teal} filter="url(#vgBrilho)" />
              </g>
              <g transform={`translate(0 ${lerp(90, 0, pk)})`} opacity={pk}>
                <rect x={190} y={216} width={60} height={7} rx={3} fill={C.teal} filter="url(#vgBrilho)" />
              </g>
            </g>
          )}
          {ek > 0 && (
            <g filter="url(#vgBrilho)">
              <rect x={390 - 280 * ek} y={137} width={280 * ek} height={7} rx={3} fill={C.violeta} opacity={0.85} />
              <rect x={250} y={216} width={280 * ek} height={7} rx={3} fill={C.violeta} opacity={0.85} />
              <circle cx={390 - 280 * ek} cy={140} r={10} fill={C.ambar} opacity={0.9} />
              <circle cx={250 + 280 * ek} cy={220} r={10} fill={C.ambar} opacity={0.9} />
            </g>
          )}
          <Rotulo x={120} y={154} x2={70} y2={70} texto="Fita molde" sub={gene ? `gene ${gene}` : undefined} />
          {passo.acao !== "desnaturar" && pk > 0.5 && <Rotulo x={450} y={140} x2={500} y2={70} texto="Primers" sub="pareiam com a sequência complementar" />}
          {ek > 0.3 && <Rotulo x={250 + 280 * ek} y={230} x2={520} y2={300} texto="Polimerase" sub="sintetiza a nova fita" />}
          {passo.acao === "desnaturar" && <text x={320} y={320} textAnchor="middle" fontSize={12} fill={C.apoio}>{r.temperatura ? `aquecimento a ${r.temperatura}` : "aquecimento: as fitas se separam"}</text>}
        </g>
      );
    }
    case "amplificar": {
      const n = t < 0.22 ? 1 : t < 0.47 ? 2 : t < 0.72 ? 4 : 8;
      const pos = Array.from({ length: n }, (_, i) => [140 + (i % 2) * 220 + (n === 1 ? 110 : 0), 70 + Math.floor(i / 2) * (n <= 2 ? 120 : 62) + (n === 1 ? 90 : n === 2 ? 50 : 0)]);
      return (
        <g>
          {pos.map(([x, y], i) => (
            <g key={i} opacity={i < n / 2 || n === 1 ? 1 : seg((t % 0.25) / 0.25, 0, 0.6) * 0.4 + 0.6}>
              <Helice x={x} y={y} w={150} amp={n > 4 ? 9 : 13} espessura={n > 4 ? 3 : 4} fase={t * 3} />
            </g>
          ))}
          <text x={320} y={338} textAnchor="middle" fontSize={13} fill={C.branco} fontWeight={600}>
            {["1", "2", "4", "8"].slice(0, [1, 2, 4, 8].indexOf(n) + 1).join(" → ")} cópias{gene ? ` do alvo ${gene}` : ""}
          </text>
          <text x={320} y={354} textAnchor="middle" fontSize={10} fill={C.apoio}>
            ilustração do crescimento por ciclo · quantidades reais não são calculadas
          </text>
        </g>
      );
    }
    case "cortar": {
      const ek = seg(t, 0.05, 0.5);
      const ck = seg(t, 0.55, 0.95);
      const plas = passo.origem === "plasmideo" || passo.entidades.includes("plasmideo");
      return plas ? (
        <g>
          <Plasmideo cx={320} cy={180} r={95} abertura={ck} />
          <g transform={`translate(${lerp(-160, 0, ek)} 0)`}>
            <Enzima cx={320} cy={70} abre={(Math.sin(t * 20) + 1) / 2} />
          </g>
          <Rotulo x={320} y={70} x2={420} y2={40} texto={r.enzima ?? "Enzima de restrição"} sub="reconhece o sítio e corta" />
          <Rotulo x={230} y={220} x2={110} y2={300} texto="Plasmídeo aberto" alinhar="end" />
        </g>
      ) : (
        <g>
          <g transform={`translate(${-60 * ck} 0)`}>
            <Helice x={110} y={180} w={200} amp={15} />
            <path d={`M310,${165} h10 v30 h-10`} fill="none" stroke={C.rosa} strokeWidth={4} opacity={ck} />
          </g>
          <g transform={`translate(${60 * ck} 0)`}>
            <Helice x={320} y={180} w={210} amp={15} fase={(210 / 60) * Math.PI * 2 * 0} />
          </g>
          <g transform={`translate(${lerp(-200, 0, ek)} 0)`}>
            <Enzima cx={315} cy={120} abre={(Math.sin(t * 20) + 1) / 2} />
          </g>
          <Rotulo x={315} y={120} x2={420} y2={60} texto={r.enzima ?? "Enzima de restrição"} sub="corta no sítio de reconhecimento" />
          {ck > 0.5 && <Rotulo x={260} y={196} x2={150} y2={300} texto="Extremidades geradas pelo corte" alinhar="end" />}
        </g>
      );
    }
    case "inserir_vetor": {
      const mk = seg(t, 0.15, 0.7);
      const fk = seg(t, 0.7, 0.95);
      const ix = lerp(560, 320, mk);
      const iy = lerp(70, 92, mk);
      return (
        <g>
          <Plasmideo cx={320} cy={200} r={95} abertura={1 - fk} inserto={fk} />
          {fk < 0.98 && (
            <g transform={`translate(${ix - 320} ${iy - 92})`}>
              <Helice x={290} y={92} w={60} amp={7} cor1={C.rosa} cor2={C.violeta} espessura={4} pontes={false} />
            </g>
          )}
          {fk > 0.5 &&
            [-0.5, 0.5].map((a) => (
              <circle key={a} cx={320 + 95 * Math.cos(-Math.PI / 2 + a * fk)} cy={200 + 95 * Math.sin(-Math.PI / 2 + a * fk)} r={7 * fk} fill={C.ambar} opacity={0.9} filter="url(#vgBrilho)" />
            ))}
          <Rotulo x={ix} y={iy} x2={500} y2={40} texto={passo.origem ? ENTIDADE_NOME[passo.origem] : "Inserto"} sub={gene ? `gene ${gene}` : "fragmento de DNA"} />
          <Rotulo x={232} y={240} x2={110} y2={300} texto={fk > 0.6 ? "Plasmídeo recombinante" : "Plasmídeo (vetor) aberto"} alinhar="end" />
          {fk > 0.6 && <Rotulo x={320 + 95 * Math.cos(-Math.PI / 2 + 0.5)} y={200 + 95 * Math.sin(-Math.PI / 2 + 0.5)} x2={520} y2={150} texto="Ligação" sub="extremidades unidas (ligase)" />}
          <Rotulo x={320 + 95 * Math.cos(-Math.PI / 2 + 2.55)} y={200 + 95 * Math.sin(-Math.PI / 2 + 2.55)} x2={520} y2={300} texto="Gene de resistência" sub="usado na seleção" />
        </g>
      );
    }
    case "transformar":
    case "transfectar": {
      const ek = seg(t, 0.1, 0.75);
      const ik = passo.integracao ? seg(t, 0.75, 1) : 0;
      const px = lerp(110, 360, ek);
      const py = lerp(110, 190, ek);
      const euc = passo.acao === "transfectar";
      const conteudo = <g transform={`translate(${px} ${py}) scale(${lerp(1, 0.75, ek)})`}>{passo.origem === "virus" ? <circle r={20} fill="none" stroke={C.rosa} strokeWidth={3} strokeDasharray="6 4" filter="url(#vgBrilho)" /> : <Plasmideo cx={0} cy={0} r={28} inserto={0.9} />}</g>;
      return (
        <g>
          {euc ? <CelulaEuc cx={400} cy={190} r={120}>{conteudo}</CelulaEuc> : <Bacteria cx={400} cy={190} w={330} h={170}>{conteudo}</Bacteria>}
          {t < 0.2 && conteudo}
          {passo.integracao && (
            <g opacity={ik}>
              <path d={`M${px},${py + 24} C ${px},${py + 50} ${420},${230} ${430},${205}`} fill="none" stroke={C.rosa} strokeWidth={2} strokeDasharray="5 5" />
              <rect x={418} y={196} width={26} height={7} rx={3} fill={C.rosa} opacity={0.9} />
              <Rotulo x={432} y={205} x2={540} y2={320} texto="Integração no cromossomo?" sub="só com estratégia específica" />
            </g>
          )}
          {ek > 0.05 && ek < 0.9 && !euc && <text x={235} y={300} fontSize={11} fill={C.apoio}>choque térmico ou eletroporação</text>}
          <Rotulo x={px} y={py - 26} x2={150} y2={40} texto={passo.origem === "virus" ? "Vetor viral" : "Plasmídeo recombinante"} alinhar="start" />
          <Rotulo x={euc ? 470 : 540} y={euc ? 110 : 130} x2={560} y2={60} texto={euc ? `Célula${r.organismo ? ` ${r.organismo}` : ""}` : `Bactéria${r.organismo ? ` (${r.organismo})` : ""}`} />
          {!euc && <Rotulo x={460} y={186} x2={560} y2={250} texto="Cromossomo bacteriano" />}
        </g>
      );
    }
    case "cultivar":
    case "selecionar": {
      const n = Math.round(lerp(0, 22, seg(t, 0.05, passo.acao === "selecionar" ? 0.4 : 0.95)));
      const sel = passo.acao === "selecionar" && t > 0.55 ? 4 : undefined;
      return (
        <g>
          <Placa cx={320} cy={185} r={150} colonias={n} destaque={sel} />
          {passo.acao === "selecionar" && t > 0.65 && <Seta x1={340} y1={170} x2={560} y2={120} k={seg(t, 0.65, 0.95)} />}
          {passo.acao === "selecionar" && t > 0.9 && <Tubo x={575} y={70} h={80} liquido={0.5} cor={C.teal} />}
          <Rotulo x={250} y={140} x2={90} y2={40} texto={`Placa${r.antibiotico ? ` com ${r.antibiotico}` : ""}`} sub={r.antibiotico ? "só cresce quem tem o gene de resistência" : "antibiótico não informado"} alinhar="start" />
          <Rotulo x={360} y={215} x2={520} y2={320} texto={passo.acao === "selecionar" ? "Colônia escolhida" : "Colônias"} sub="cada colônia vem de uma célula" />
        </g>
      );
    }
    case "expressar":
    case "transcrever":
    case "traduzir": {
      if (passo.acao === "traduzir") {
        const k = seg(t, 0.05, 0.95);
        return (
          <g>
            <Fita x={80} y={240} w={480} cor={C.rosa} onda={3} />
            <g transform={`translate(${lerp(120, 480, k)} 222)`} filter="url(#vgBrilho)">
              <ellipse rx={38} ry={22} fill="rgba(143,104,255,0.35)" stroke={C.violeta} strokeWidth={2} />
              <ellipse cy={-24} rx={28} ry={16} fill="rgba(143,104,255,0.35)" stroke={C.violeta} strokeWidth={2} />
            </g>
            {Array.from({ length: Math.round(12 * k) }, (_, i) => (
              <circle key={i} cx={lerp(120, 480, k) - 10 - i * 16} cy={150 - Math.sin(i / 1.6) * 20} r={7} fill={i % 2 ? C.teal : C.ambar} filter="url(#vgBrilho)" />
            ))}
            <Rotulo x={100} y={240} x2={70} y2={310} texto="RNA mensageiro" />
            <Rotulo x={lerp(120, 480, k)} y={200} x2={520} y2={60} texto="Ribossomo" sub="lê o RNA" />
            <Rotulo x={lerp(120, 480, k) - 40} y={150} x2={120} y2={60} texto="Cadeia de aminoácidos" alinhar="start" />
          </g>
        );
      }
      const tk = seg(t, 0.05, 0.6);
      const pk = passo.acao === "expressar" ? seg(t, 0.45, 1) : 0;
      return (
        <g>
          {passo.acao === "expressar" ? (
            <Bacteria cx={300} cy={190} w={360} h={190}>
              <Plasmideo cx={210} cy={190} r={40} inserto={0.9} />
              <Fita x={260} y={150} w={90 * tk} cor={C.rosa} onda={3} esp={3} />
              {Array.from({ length: Math.round(9 * pk) }, (_, i) => (
                <Proteina key={i} cx={330 + (i % 3) * 38} cy={165 + Math.floor(i / 3) * 34} s={0.85} />
              ))}
            </Bacteria>
          ) : (
            <g>
              <Helice x={100} y={150} w={440} sep={0.5 * seg(t, 0, 0.3)} />
              <Fita x={160} y={250} w={330 * tk} cor={C.rosa} onda={4} />
            </g>
          )}
          {passo.acao === "expressar" ? (
            <>
              <Rotulo x={210} y={150} x2={80} y2={40} texto="Gene no plasmídeo" sub={gene ? `gene ${gene}` : undefined} alinhar="start" />
              <Rotulo x={300} y={152} x2={300} y2={40} texto="RNA mensageiro" />
              {pk > 0.3 && <Rotulo x={410} y={200} x2={560} y2={320} texto="Proteína" sub={r.temperatura ? `indução a ${r.temperatura}` : "quantidade não prevista"} />}
            </>
          ) : (
            <>
              <Rotulo x={120} y={128} x2={80} y2={50} texto="Gene (DNA)" sub={gene} alinhar="start" />
              <Rotulo x={160 + 330 * tk} y={250} x2={520} y2={320} texto="RNA mensageiro" />
            </>
          )}
        </g>
      );
    }
    case "extrair":
    case "purificar": {
      const lk = seg(t, 0.05, 0.4);
      const sk = seg(t, 0.35, 0.95);
      return (
        <g>
          {passo.acao === "extrair" &&
            [0, 1, 2].map((i) => (
              <g key={i} opacity={1 - lk} transform={`translate(${110 + i * 40} ${120 + i * 50}) scale(${1 + lk * 0.4})`}>
                <rect x={-35} y={-18} width={70} height={36} rx={18} fill="url(#vgCel)" stroke={C.violeta} strokeWidth={2} />
              </g>
            ))}
          {passo.acao === "purificar" && <Tubo x={170} y={110} h={130} liquido={0.55} cor={C.violeta} rotulo="mistura" />}
          <g opacity={lk > 0.5 || passo.acao === "purificar" ? 1 : lk * 2}>
            <g transform={`translate(${lerp(200, 330, sk)} ${lerp(180, 160, sk)})`}>
              <Helice x={-55} y={0} w={110} amp={10} espessura={3.5} />
            </g>
            {[0, 1, 2].map((i) => (
              <Proteina key={i} cx={lerp(200, 330 + i * 30, sk)} cy={lerp(170, 70 + i * 12, sk)} s={0.9} />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} cx={lerp(200, 300 + i * 22, sk)} cy={lerp(190, 280 + (i % 2) * 14, sk)} r={6} fill={C.teal} opacity={0.8} filter="url(#vgBrilho)" />
            ))}
          </g>
          <Tubo x={540} y={120} h={140} liquido={0.25 + 0.3 * seg(t, 0.75, 1)} cor={C.azul} rotulo={`${passo.origem && passo.origem !== "celula" && passo.origem !== "bacteria" ? ENTIDADE_NOME[passo.origem] : "DNA"} separado`} />
          {sk > 0.4 && (
            <>
              <Rotulo x={400} y={80} x2={430} y2={40} texto="Proteínas" />
              <Rotulo x={385} y={160} x2={430} y2={130} texto="DNA" />
              <Rotulo x={380} y={290} x2={430} y2={318} texto="Outros componentes" />
            </>
          )}
          {passo.acao === "extrair" && lk < 0.6 && <Rotulo x={150} y={170} x2={80} y2={40} texto="Células rompidas (lise)" alinhar="start" />}
        </g>
      );
    }
    case "eletroforese": {
      const k = seg(t, 0.15, 0.95);
      const lanes = 5;
      return (
        <g>
          <rect x={150} y={50} width={340} height={260} rx={10} fill="rgba(77,124,255,0.08)" stroke={C.branco} strokeOpacity={0.6} strokeWidth={2} filter="url(#vgBrilho)" />
          {Array.from({ length: lanes }, (_, i) => (
            <rect key={i} x={175 + i * 62} y={66} width={40} height={9} rx={2} fill="rgba(238,242,249,0.25)" />
          ))}
          {[0.18, 0.3, 0.45, 0.62, 0.8].map((p, j) => (
            <rect key={`l${j}`} x={175} y={80 + p * 200 * k} width={40} height={5} rx={2} fill={C.azul} opacity={0.9} filter="url(#vgBrilho)" />
          ))}
          {[1, 2, 3].map((i) => (
            <rect key={i} x={175 + i * 62} y={80 + 0.5 * 200 * k} width={40} height={6} rx={2} fill={C.rosa} opacity={0.35 + 0.4 * k} strokeDasharray="3 2" stroke={C.rosa} />
          ))}
          <text x={460} y={300} fontSize={16} fill={C.rosa} fontWeight={700}>
            +
          </text>
          <text x={460} y={72} fontSize={16} fill={C.apoio} fontWeight={700}>
            −
          </text>
          <Rotulo x={195} y={100} x2={70} y2={40} texto="Marcador" sub="referência de tamanho" alinhar="start" />
          <Rotulo x={320} y={186} x2={520} y2={330} texto="Amostras" sub="posições ilustrativas · não é resultado" />
        </g>
      );
    }
    case "centrifugar": {
      const rot = t * 900;
      return (
        <g>
          <circle cx={320} cy={185} r={120} fill="rgba(77,124,255,0.06)" stroke={C.branco} strokeOpacity={0.5} strokeWidth={2} filter="url(#vgBrilho)" />
          <g transform={`rotate(${rot} 320 185)`}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const tem = i % 4 === 0;
              return <circle key={i} cx={320 + 80 * Math.cos(a)} cy={185 + 80 * Math.sin(a)} r={14} fill={tem ? C.violeta : "none"} stroke={C.branco} strokeOpacity={0.6} strokeWidth={1.5} />;
            })}
          </g>
          <Rotulo x={400} y={185} x2={520} y2={60} texto="Tubos em posições opostas" sub="rotor balanceado" />
        </g>
      );
    }
    case "incubar":
      return (
        <g>
          <Tubo x={320} y={110} h={150} liquido={0.45} cor={C.violeta} rotulo="reação" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${270 + i * 50},${300} q 10,-15 0,-30 q -10,-15 0,-30`} fill="none" stroke={C.ambar} strokeWidth={2.5} opacity={0.4 + 0.6 * ((Math.sin(t * 10 + i) + 1) / 2)} />
          ))}
          <text x={320} y={60} textAnchor="middle" fontSize={22} fill={C.branco} fontWeight={700}>
            {r.temperatura ?? "temperatura não informada"}
          </text>
        </g>
      );
    case "sequenciar": {
      const seqIlustrativa = "ATGGCTAGCAAGGGCGAGGAGCTGTTCACCGGGGTGGTGCCCATC";
      const n = Math.round(seqIlustrativa.length * seg(t, 0.05, 0.95));
      return (
        <g>
          <Helice x={90} y={150} w={460} amp={12} />
          <text x={320} y={250} textAnchor="middle" fontSize={17} fontFamily="IBM Plex Mono, monospace" fill={C.teal} letterSpacing={2}>
            {seqIlustrativa.slice(0, n)}
          </text>
          <text x={320} y={280} textAnchor="middle" fontSize={11} fill={C.apoio}>
            sequência ilustrativa — não é a sequência do seu material
          </text>
        </g>
      );
    }
    case "editar_crispr": {
      const mk = seg(t, 0.05, 0.5);
      const ck = seg(t, 0.5, 0.75);
      const rk = seg(t, 0.8, 1);
      return (
        <g>
          <g transform={`translate(${-24 * ck * (1 - rk)} 0)`}>
            <Helice x={70} y={210} w={250} amp={14} />
          </g>
          <g transform={`translate(${24 * ck * (1 - rk)} 0)`}>
            <Helice x={330} y={210} w={240} amp={14} />
          </g>
          <g transform={`translate(${lerp(120, 325, mk)} ${lerp(80, 170, mk)})`} filter="url(#vgBrilho)">
            <ellipse rx={44} ry={30} fill="rgba(143,104,255,0.35)" stroke={C.violeta} strokeWidth={2.5} />
            <path d="M-30,10 q 30,-30 60,0" fill="none" stroke={C.teal} strokeWidth={3} />
          </g>
          {rk > 0 && <circle cx={325} cy={210} r={8} fill={C.ambar} opacity={rk} filter="url(#vgBrilho)" />}
          <Rotulo x={lerp(120, 325, mk)} y={lerp(80, 170, mk) - 30} x2={420} y2={50} texto="Cas9 + RNA guia" sub={gene ? `alvo: ${gene}` : "alvo definido pelo guia"} />
          <Rotulo x={200} y={226} x2={110} y2={320} texto={rk > 0.5 ? "Corte reparado pela célula" : "Genoma"} alinhar="end" />
        </g>
      );
    }
    case "detectar":
    case "quantificar": {
      const k = seg(t, 0.1, 0.9);
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <Tubo x={170 + i * 75} y={120} h={110} liquido={0.4} cor={C.violeta} />
              <circle cx={170 + i * 75} cy={210} r={16} fill={i % 2 ? C.teal : C.rosa} opacity={k * (0.4 + 0.15 * i)} filter="url(#vgBrilho)" />
            </g>
          ))}
          <text x={320} y={320} textAnchor="middle" fontSize={12} fill={C.apoio}>
            {passo.acao === "quantificar" ? "a concentração é medida no equipamento · valores não são previstos" : "o sinal aparece nas amostras · intensidade e valores não são previstos"}
          </text>
        </g>
      );
    }
    default: {
      const ents = passo.entidades.length ? passo.entidades : (["tubo"] as const);
      return (
        <g>
          <Tubo x={320} y={110} h={140} liquido={0.4 + 0.1 * Math.sin(t * 6)} cor={C.violeta} />
          {ents.slice(0, 4).map((e, i) => {
            const a = (i / Math.max(1, ents.length)) * Math.PI * 2 - Math.PI / 2;
            const x = 320 + 210 * Math.cos(a);
            const y = 180 + 120 * Math.sin(a);
            return <Rotulo key={e} x={320 + 40 * Math.cos(a)} y={180 + 40 * Math.sin(a)} x2={x} y2={y} texto={ENTIDADE_NOME[e]} alinhar={Math.cos(a) < 0 ? "end" : "start"} />;
          })}
        </g>
      );
    }
  }
}
