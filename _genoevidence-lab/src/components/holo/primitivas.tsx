"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { create } from "zustand";
import { brilho, COR, halo, holograma, luz } from "./materiais";
import { registrarAncora, removerRotulo } from "./rotulos";
import type { ObjetoId } from "@/lib/cena/biblioteca";

type V3 = [number, number, number];

// ---------------------------------------------------------------- rótulos (âncora 3D + caixa DOM)

/** alvo: objeto da biblioteca representado (o rótulo vira botão que mostra nome, função e fonte). */
export type RotuloSpec = { texto: string; sub?: string; dx: number; alvo?: ObjetoId };
export const useRotulos = create<{ itens: Record<string, RotuloSpec>; set: (id: string, r: RotuloSpec) => void; del: (id: string) => void }>((set) => ({
  itens: {},
  set: (id, r) => set((s) => ({ itens: { ...s.itens, [id]: r } })),
  del: (id) =>
    set((s) => {
      const n = { ...s.itens };
      delete n[id];
      return { itens: n };
    }),
}));

export function Ancora({ id, texto, sub, dx = 120, dy = -40, position = [0, 0, 0], alvo }: { id: string; texto: string; sub?: string; dx?: number; dy?: number; position?: V3; alvo?: ObjetoId }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    registrarAncora(id, ref.current, dx, dy);
    useRotulos.getState().set(id, { texto, sub, dx, alvo });
    return () => {
      useRotulos.getState().del(id);
      removerRotulo(id);
    };
  }, [id, texto, sub, dx, dy, alvo]);
  return <group ref={ref} position={position} />;
}

// ---------------------------------------------------------------- materiais com tempo

function useHolo(cor: THREE.Color, borda: THREE.Color = COR.branco, opacidade = 0.9) {
  const m = useMemo(() => holograma(cor, borda, opacidade), [cor, borda, opacidade]);
  useFrame((st) => {
    m.uniforms.uTempo.value = st.clock.elapsedTime;
  });
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** Sprite de brilho aditivo. */
export function Brilho({ cor = COR.violeta, escala = 1.6, opacidade = 0.55, position = [0, 0, 0] }: { cor?: THREE.Color; escala?: number; opacidade?: number; position?: V3 }) {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: brilho(), color: cor, transparent: true, opacity: opacidade, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [cor, opacidade]);
  return <sprite material={mat} scale={[escala, escala, 1]} position={position} />;
}

// ---------------------------------------------------------------- DNA

class HeliceCurva extends THREE.Curve<THREE.Vector3> {
  constructor(
    private comp: number,
    private raio: number,
    private voltas: number,
    private fase: number,
  ) {
    super();
  }
  getPoint(t: number, alvo = new THREE.Vector3()) {
    const a = Math.PI * 2 * this.voltas * t + this.fase;
    return alvo.set(-this.comp / 2 + this.comp * t, this.raio * Math.cos(a), this.raio * Math.sin(a));
  }
}

class Reta extends THREE.Curve<THREE.Vector3> {
  constructor(private comp: number) {
    super();
  }
  getPoint(t: number, alvo = new THREE.Vector3()) {
    return alvo.set(-this.comp / 2 + this.comp * t, 0, 0);
  }
}

/**
 * Dupla hélice. sep: 0 = fita dupla; 1 = fitas separadas (cada uma vira uma fita simples).
 * novaFita: 0–1, progresso da síntese de uma nova fita ao lado de cada molde.
 */
export function Helice({ comp = 4, raio = 0.32, voltas = 4, sep = 0, corA = COR.azul, corB = COR.rosa, espessura = 0.055, novaFita = 0, girar = 0.25, position = [0, 0, 0], escala = 1 }: { comp?: number; raio?: number; voltas?: number; sep?: number; corA?: THREE.Color; corB?: THREE.Color; espessura?: number; novaFita?: number; girar?: number; position?: V3; escala?: number }) {
  const g = useRef<THREE.Group>(null);
  const geoA = useMemo(() => new THREE.TubeGeometry(new HeliceCurva(comp, raio, voltas, 0), Math.round(voltas * 40), espessura, 8), [comp, raio, voltas, espessura]);
  const geoB = useMemo(() => new THREE.TubeGeometry(new HeliceCurva(comp, raio, voltas, Math.PI), Math.round(voltas * 40), espessura, 8), [comp, raio, voltas, espessura]);
  const geoNova = useMemo(() => new THREE.TubeGeometry(new HeliceCurva(comp, raio * 0.75, voltas, Math.PI / 2), Math.round(voltas * 40), espessura * 0.85, 6), [comp, raio, voltas, espessura]);
  const geoHaloA = useMemo(() => new THREE.TubeGeometry(new HeliceCurva(comp, raio, voltas, 0), Math.round(voltas * 30), espessura * 2.6, 6), [comp, raio, voltas, espessura]);
  const geoHaloB = useMemo(() => new THREE.TubeGeometry(new HeliceCurva(comp, raio, voltas, Math.PI), Math.round(voltas * 30), espessura * 2.6, 6), [comp, raio, voltas, espessura]);
  const mA = useMemo(() => luz(corA), [corA]);
  const mB = useMemo(() => luz(corB), [corB]);
  const hA = useMemo(() => halo(corA, 0.18), [corA]);
  const hB = useMemo(() => halo(corB, 0.18), [corB]);
  const mNova = useMemo(() => luz(COR.violeta), []);
  const mPonte = useMemo(() => halo(COR.branco, 0.5), []);
  const pontes = useMemo(() => {
    const n = Math.round(voltas * 10);
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const a = Math.PI * 2 * voltas * t;
      return { x: -comp / 2 + comp * t, a };
    });
  }, [comp, voltas]);
  useEffect(() => {
    const total = geoNova.index?.count ?? 0;
    geoNova.setDrawRange(0, Math.floor(total * Math.max(0, Math.min(1, novaFita))));
  }, [geoNova, novaFita]);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.x += dt * girar;
  });
  const d = sep * 0.75;
  return (
    <group position={position} scale={escala}>
      <group ref={g}>
        <group position={[0, d, 0]}>
          <mesh geometry={geoA} material={mA} />
          <mesh geometry={geoHaloA} material={hA} />
          {novaFita > 0 && <mesh geometry={geoNova} material={mNova} />}
        </group>
        <group position={[0, -d, 0]}>
          <mesh geometry={geoB} material={mB} />
          <mesh geometry={geoHaloB} material={hB} />
          {novaFita > 0 && <mesh geometry={geoNova} material={mNova} rotation={[Math.PI, 0, 0]} />}
        </group>
        {sep < 0.25 &&
          pontes.map((p, i) => (
            <mesh key={i} position={[p.x, 0, 0]} rotation={[p.a, 0, 0]} material={mPonte} scale={[1, 1 - sep * 4, 1]}>
              <cylinderGeometry args={[0.012, 0.012, raio * 2, 4]} />
            </mesh>
          ))}
      </group>
    </group>
  );
}

/** Fita curta (primer, inserto linear, RNA). */
export function Fita({ comp = 0.8, cor = COR.teal, espessura = 0.06, onda = 0.05, position = [0, 0, 0], rotation = [0, 0, 0], progresso = 1 }: { comp?: number; cor?: THREE.Color; espessura?: number; onda?: number; position?: V3; rotation?: V3; progresso?: number }) {
  const geo = useMemo(() => {
    const curva = onda > 0 ? new HeliceCurva(comp, onda, comp * 2.2, 0) : new Reta(comp);
    return new THREE.TubeGeometry(curva, 48, espessura, 8);
  }, [comp, espessura, onda]);
  useEffect(() => {
    geo.setDrawRange(0, Math.floor((geo.index?.count ?? 0) * Math.max(0, Math.min(1, progresso))));
  }, [geo, progresso]);
  const m = useMemo(() => luz(cor), [cor]);
  const h = useMemo(() => halo(cor, 0.22), [cor]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={m} />
      <mesh geometry={geo} material={h} scale={[1, 2.4, 2.4]} />
    </group>
  );
}

// ---------------------------------------------------------------- plasmídeo

class Circulo extends THREE.Curve<THREE.Vector3> {
  constructor(
    private r: number,
    private ini: number,
    private ext: number,
  ) {
    super();
  }
  getPoint(t: number, alvo = new THREE.Vector3()) {
    const a = this.ini + this.ext * t;
    return alvo.set(this.r * Math.cos(a), this.r * Math.sin(a), 0);
  }
}

/** Plasmídeo: anel com abertura no topo (0 fechado → 1 aberto) e arco do inserto. */
export function Plasmideo({ r = 1.2, abertura = 0, inserto = 0, position = [0, 0, 0], escala = 1, girar = 0.15 }: { r?: number; abertura?: number; inserto?: number; position?: V3; escala?: number; girar?: number }) {
  const g = useRef<THREE.Group>(null);
  const gap = Math.round(abertura * 30) / 30;
  const meio = 0.7 * gap; // meia abertura em radianos
  const geoAnel = useMemo(() => new THREE.TubeGeometry(new Circulo(r, Math.PI / 2 + meio + 0.04, Math.PI * 2 - 2 * meio - 0.08), 160, 0.07, 10), [r, meio]);
  const ins = Math.round(inserto * 30) / 30;
  const geoIns = useMemo(() => (ins > 0 ? new THREE.TubeGeometry(new Circulo(r, Math.PI / 2 - 0.7 * ins, 1.4 * ins), 48, 0.085, 10) : null), [r, ins]);
  const geoRes = useMemo(() => new THREE.TubeGeometry(new Circulo(r, Math.PI * 1.2, 0.8), 48, 0.08, 10), [r]);
  const mAnel = useMemo(() => luz(COR.azul), []);
  const hAnel = useMemo(() => halo(COR.violeta, 0.2), []);
  const mIns = useMemo(() => luz(COR.rosa), []);
  const mRes = useMemo(() => luz(COR.ambar), []);
  useFrame((_, dt) => {
    if (g.current && girar) g.current.rotation.y = Math.sin(performance.now() / 2600) * girar * 2;
  });
  return (
    <group position={position} scale={escala}>
      <group ref={g}>
        <mesh geometry={geoAnel} material={mAnel} />
        <mesh geometry={geoAnel} material={hAnel} scale={[1.02, 1.02, 2.4]} />
        {geoIns && <mesh geometry={geoIns} material={mIns} />}
        <mesh geometry={geoRes} material={mRes} />
        <Brilho cor={COR.violeta} escala={r * 3.2} opacidade={0.18} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- células

export function Bacteria({ comp = 3.2, raio = 1.05, position = [0, 0, 0], children, cromossomo = true }: { comp?: number; raio?: number; position?: V3; children?: React.ReactNode; cromossomo?: boolean }) {
  const mExt = useHolo(COR.violeta, COR.rosa, 0.95);
  const mInt = useHolo(COR.azul, COR.azul, 0.35);
  const crom = useMemo(() => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * comp * 0.28 + Math.sin(a * 3) * 0.2, Math.sin(a) * raio * 0.42, Math.cos(a * 2) * 0.25);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.035, 6, true);
  }, [comp, raio]);
  const mCrom = useMemo(() => luz(COR.teal, 0.85), []);
  return (
    <group position={position}>
      <mesh material={mExt} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[raio, comp - 2 * raio, 12, 32]} />
      </mesh>
      <mesh material={mInt} rotation={[0, 0, Math.PI / 2]} scale={0.92}>
        <capsuleGeometry args={[raio, comp - 2 * raio, 8, 24]} />
      </mesh>
      {cromossomo && <mesh geometry={crom} material={mCrom} />}
      {children}
    </group>
  );
}

export function CelulaEuc({ r = 1.5, position = [0, 0, 0], children }: { r?: number; position?: V3; children?: React.ReactNode }) {
  const mExt = useHolo(COR.violeta, COR.rosa, 0.95);
  const mNuc = useHolo(COR.azul, COR.teal, 0.8);
  return (
    <group position={position}>
      <mesh material={mExt}>
        <sphereGeometry args={[r, 48, 32]} />
      </mesh>
      <mesh material={mNuc} position={[0.25, -0.1, 0]}>
        <sphereGeometry args={[r * 0.38, 32, 24]} />
      </mesh>
      {children}
    </group>
  );
}

// ---------------------------------------------------------------- materiais de laboratório

/** Microtubo de vidro com líquido e tampa (perfil de revolução). */
export function Tubo({ altura = 2, nivel = 0.4, cor = COR.violeta, position = [0, 0, 0], rotation = [0, 0, 0], escala = 1 }: { altura?: number; nivel?: number; cor?: THREE.Color; position?: V3; rotation?: V3; escala?: number }) {
  const perfil = useMemo(() => {
    const h = altura;
    return [new THREE.Vector2(0.001, -h / 2), new THREE.Vector2(0.12, -h / 2 + 0.12), new THREE.Vector2(0.3, -h / 2 + h * 0.36), new THREE.Vector2(0.32, h / 2 - 0.05), new THREE.Vector2(0.35, h / 2)];
  }, [altura]);
  const geo = useMemo(() => new THREE.LatheGeometry(perfil, 48), [perfil]);
  const geoLiq = useMemo(() => {
    const h = altura;
    const topo = -h / 2 + h * Math.max(0.05, nivel);
    const pts = perfil.filter((p) => p.y <= topo).map((p) => new THREE.Vector2(p.x * 0.9, p.y));
    const rTopo = topo < -h / 2 + h * 0.36 ? 0.12 + (0.3 - 0.12) * ((topo + h / 2 - 0.12) / (h * 0.36 - 0.12)) : 0.3;
    pts.push(new THREE.Vector2(rTopo * 0.9, topo), new THREE.Vector2(0.001, topo));
    return new THREE.LatheGeometry(pts, 40);
  }, [altura, nivel, perfil]);
  const mVidro = useHolo(COR.branco, COR.azul, 0.85);
  const mLiq = useMemo(() => halo(cor, 0.55), [cor]);
  return (
    <group position={position} rotation={rotation} scale={escala}>
      <mesh geometry={geo} material={mVidro} />
      <mesh geometry={geoLiq} material={mLiq} />
      <mesh material={mVidro} position={[0, altura / 2 + 0.06, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.12, 40, 1, true]} />
      </mesh>
      <mesh material={mVidro} position={[0.34, altura / 2 + 0.2, 0]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 32]} />
      </mesh>
      <Brilho cor={cor} escala={1.6} opacidade={0.35} position={[0, -altura * 0.25, 0]} />
    </group>
  );
}

export function Pipeta({ position = [0, 0, 0] }: { position?: V3 }) {
  const m = useHolo(COR.azul, COR.branco, 0.95);
  return (
    <group position={position}>
      <mesh material={m} position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.13, 0.11, 1.2, 24]} />
      </mesh>
      <mesh material={m} position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 16]} />
      </mesh>
      <mesh material={m} position={[0, 0.25, 0]}>
        <coneGeometry args={[0.07, 0.65, 16, 1, true]} />
      </mesh>
    </group>
  );
}

/** Enzima (abre e fecha como mandíbula). */
export function Enzima({ cor = COR.ambar, abre = 0.5, position = [0, 0, 0], escala = 1 }: { cor?: THREE.Color; abre?: number; position?: V3; escala?: number }) {
  const m = useMemo(() => luz(cor, 0.92), [cor]);
  const a = 0.15 + 0.55 * abre;
  return (
    <group position={position} scale={escala}>
      <mesh material={m} rotation={[0, 0, a]}>
        <sphereGeometry args={[0.38, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m} rotation={[Math.PI, 0, -a]}>
        <sphereGeometry args={[0.38, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Brilho cor={cor} escala={1.4} opacidade={0.4} />
    </group>
  );
}

/** Proteína: aglomerado de esferas (como na referência). */
export function Proteina({ cor = COR.rosa, position = [0, 0, 0], escala = 1 }: { cor?: THREE.Color; position?: V3; escala?: number }) {
  const m = useMemo(() => luz(cor, 0.9), [cor]);
  const mc = useMemo(() => luz(COR.violeta), []);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return (
    <group position={position} scale={escala} ref={g}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} material={m} position={[Math.cos(a) * 0.17, Math.sin(a) * 0.17, (i % 2) * 0.08 - 0.04]}>
            <sphereGeometry args={[0.11, 16, 12]} />
          </mesh>
        );
      })}
      <mesh material={mc}>
        <sphereGeometry args={[0.1, 16, 12]} />
      </mesh>
      <Brilho cor={cor} escala={0.9} opacidade={0.35} />
    </group>
  );
}

/** Placa de cultura com colônias (n de 0 a 30). */
export function Placa({ r = 1.6, colonias = 0, destaque, position = [0, 0, 0] }: { r?: number; colonias?: number; destaque?: number; position?: V3 }) {
  const mVidro = useHolo(COR.branco, COR.teal, 0.9);
  const mAgar = useMemo(() => halo(COR.teal, 0.12), []);
  const mCol = useMemo(() => luz(COR.rosa), []);
  const mCol2 = useMemo(() => luz(COR.teal), []);
  const mAnelSel = useMemo(() => luz(COR.branco), []);
  const pts = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = i * 2.39996;
        const d = r * 0.85 * Math.sqrt((i + 0.5) / 30);
        return [Math.cos(a) * d, 0.1, Math.sin(a) * d] as V3;
      }),
    [r],
  );
  return (
    <group position={position}>
      <mesh material={mVidro}>
        <cylinderGeometry args={[r, r, 0.22, 64, 1, true]} />
      </mesh>
      <mesh material={mAgar} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 64]} />
      </mesh>
      {pts.slice(0, Math.round(colonias)).map((p, i) => (
        <mesh key={i} position={p} material={i % 3 === 0 ? mCol : mCol2} scale={i === destaque ? 1.6 : 1}>
          <sphereGeometry args={[0.07, 12, 8]} />
        </mesh>
      ))}
      {destaque !== undefined && destaque < colonias && (
        <mesh position={[pts[destaque][0], 0.12, pts[destaque][2]]} rotation={[-Math.PI / 2, 0, 0]} material={mAnelSel}>
          <ringGeometry args={[0.16, 0.2, 32]} />
        </mesh>
      )}
    </group>
  );
}

/** Gel de agarose com canaletas e bandas (posições ilustrativas). */
export function Gel({ progresso = 0, position = [0, 0, 0] }: { progresso?: number; position?: V3 }) {
  const mGel = useHolo(COR.azul, COR.branco, 0.8);
  const mLadder = useMemo(() => luz(COR.azul), []);
  const mAmostra = useMemo(() => luz(COR.rosa, 0.85), []);
  const mPoco = useMemo(() => halo(COR.branco, 0.35), []);
  return (
    <group position={position} rotation={[0.9, 0, 0]}>
      <mesh material={mGel}>
        <boxGeometry args={[3, 2.2, 0.16]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`p${i}`} position={[-1.15 + i * 0.58, 0.95, 0.09]} material={mPoco}>
          <boxGeometry args={[0.36, 0.06, 0.02]} />
        </mesh>
      ))}
      {[0.12, 0.25, 0.4, 0.58, 0.78].map((p, j) => (
        <mesh key={`l${j}`} position={[-1.15, 0.9 - p * 1.8 * progresso, 0.09]} material={mLadder}>
          <boxGeometry args={[0.36, 0.05, 0.02]} />
        </mesh>
      ))}
      {[1, 2, 3].map((i) => (
        <mesh key={`a${i}`} position={[-1.15 + i * 0.58, 0.9 - 0.48 * 1.8 * progresso, 0.09]} material={mAmostra}>
          <boxGeometry args={[0.36, 0.07, 0.02]} />
        </mesh>
      ))}
    </group>
  );
}

export function Rotor({ giro = 0, position = [0, 0, 0] }: { giro?: number; position?: V3 }) {
  const m = useHolo(COR.azul, COR.branco, 0.85);
  const mTubo = useMemo(() => luz(COR.violeta, 0.9), []);
  return (
    <group position={position} rotation={[0.55, 0, 0]}>
      <mesh material={m}>
        <cylinderGeometry args={[1.5, 1.5, 0.25, 64, 1, true]} />
      </mesh>
      <group rotation={[0, giro, 0]}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const tem = i % 4 === 0;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.05, 0.05, Math.sin(a) * 1.05]} material={tem ? mTubo : m}>
              <cylinderGeometry args={[0.16, 0.12, 0.3, 16]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** Partículas em fluxo de uma origem para destinos (componentes saindo do tubo, como na referência). */
export function Fluxo({ de, para, n = 60, cor = COR.violeta, progresso = 1, tamanho = 0.12 }: { de: V3; para: V3[]; n?: number; cor?: THREE.Color; progresso?: number; tamanho?: number }) {
  const ref = useRef<THREE.Points>(null);
  const dados = useMemo(() => Array.from({ length: n }, (_, i) => ({ alvo: para[i % para.length], fase: Math.random(), jit: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] })), [n, para]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  const mat = useMemo(() => new THREE.PointsMaterial({ map: brilho(), color: cor, size: tamanho, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true }), [cor, tamanho]);
  useFrame((st) => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const tt = st.clock.elapsedTime;
    dados.forEach((d, i) => {
      const k = ((tt * 0.25 + d.fase) % 1) * Math.max(0.05, progresso);
      const curv = Math.sin(k * Math.PI) * 0.5;
      pos.setXYZ(i, de[0] + (d.alvo[0] - de[0]) * k + d.jit[0] * 0.3 * k, de[1] + (d.alvo[1] - de[1]) * k + curv + d.jit[1] * 0.3 * k, de[2] + (d.alvo[2] - de[2]) * k + d.jit[2] * 0.3 * k);
    });
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}

export function Ribossomo({ position = [0, 0, 0] }: { position?: V3 }) {
  const m = useHolo(COR.violeta, COR.rosa, 0.95);
  return (
    <group position={position}>
      <mesh material={m} scale={[1.2, 0.75, 0.9]}>
        <sphereGeometry args={[0.5, 32, 20]} />
      </mesh>
      <mesh material={m} position={[0, 0.55, 0]} scale={[0.9, 0.55, 0.75]}>
        <sphereGeometry args={[0.5, 32, 20]} />
      </mesh>
    </group>
  );
}

export function Cas9({ position = [0, 0, 0] }: { position?: V3 }) {
  const m = useHolo(COR.violeta, COR.rosa, 1);
  return (
    <group position={position}>
      <mesh material={m} scale={[1.3, 0.85, 0.9]}>
        <sphereGeometry args={[0.6, 40, 24]} />
      </mesh>
      <Fita comp={1.1} cor={COR.teal} onda={0.08} position={[0, -0.25, 0.3]} />
      <Brilho cor={COR.violeta} escala={2.4} opacidade={0.3} />
    </group>
  );
}

/** Faísca de ligação/reparo. */
export function Faisca({ position = [0, 0, 0], intensidade = 1 }: { position?: V3; intensidade?: number }) {
  const m = useMemo(() => luz(COR.ambar), []);
  return (
    <group position={position} scale={intensidade}>
      <mesh material={m}>
        <sphereGeometry args={[0.09, 16, 12]} />
      </mesh>
      <Brilho cor={COR.ambar} escala={0.9} opacidade={0.8} />
    </group>
  );
}

/** Plataforma holográfica (anel de projeção sob a cena). */
export function Plataforma({ r = 3.2, y = -1.9 }: { r?: number; y?: number }) {
  const m1 = useMemo(() => halo(COR.violeta, 0.35), []);
  const m2 = useMemo(() => halo(COR.azul, 0.12), []);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.15;
  });
  return (
    <group position={[0, y, 0]} ref={g}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m1}>
        <ringGeometry args={[r * 0.97, r, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m2}>
        <circleGeometry args={[r, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m1}>
        <ringGeometry args={[r * 0.55, r * 0.565, 96, 1, 0, Math.PI * 1.4]} />
      </mesh>
    </group>
  );
}

/** Termociclador: bloco com poços, tampa e visor de temperatura (forma reconhecível, sem escala real). */
export function Termociclador({ tampa = 0.2, quente = 0, position = [0, 0, 0], escala = 1 }: { tampa?: number; quente?: number; position?: V3; escala?: number }) {
  const m = useHolo(COR.azul, COR.branco, 0.85);
  const mBloco = useHolo(COR.violeta, COR.branco, 0.9);
  const mVisor = useMemo(() => luz(COR.teal, 0.9), []);
  return (
    <group position={position} scale={escala}>
      <mesh material={m} position={[0, -0.35, 0]}>
        <boxGeometry args={[2.2, 0.7, 1.6]} />
      </mesh>
      <mesh material={mBloco} position={[0, 0.03, 0]}>
        <boxGeometry args={[1.5, 0.06, 1.0]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={mBloco} position={[-0.6 + (i % 6) * 0.24, 0.12, -0.25 + Math.floor(i / 6) * 0.5]}>
          <cylinderGeometry args={[0.07, 0.05, 0.16, 12]} />
        </mesh>
      ))}
      <group position={[0, 0.05, -0.8]} rotation={[-tampa * 1.6, 0, 0]}>
        <mesh material={m} position={[0, 0.06, 0.8]}>
          <boxGeometry args={[2.2, 0.12, 1.6]} />
        </mesh>
      </group>
      <mesh material={mVisor} position={[0.55, -0.32, 0.81]}>
        <planeGeometry args={[0.7, 0.28]} />
      </mesh>
      <Brilho cor={quente > 0.5 ? COR.rosa : COR.teal} escala={2.2} opacidade={0.12 + 0.25 * quente} position={[0, 0.1, 0]} />
    </group>
  );
}
