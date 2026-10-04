"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { ObjetoId } from "@/lib/cena/biblioteca";
import type { PassoVisual } from "@/lib/visual/roteiro";
import { Cena3D } from "./Cena3D";
import { useRotulos } from "./primitivas";
import { projetarRotulos, registrarCaixa, rotulosVisiveis } from "./rotulos";

/** Função de captura do quadro atual do holograma (para exportar a imagem). */
let capturar: (() => string | null) | null = null;
export function capturarHolo(): { imagem: string | null; rotulos: ReturnType<typeof rotulosVisiveis>; largura: number; altura: number } {
  const el = document.getElementById("holo-canvas-wrap");
  return { imagem: capturar?.() ?? null, rotulos: rotulosVisiveis(), largura: el?.clientWidth ?? 0, altura: el?.clientHeight ?? 0 };
}

/** Controles de câmera expostos à interface (aproximar, afastar, reiniciar visão). */
let camControles: { zoom: (f: number) => void; reset: () => void } | null = null;
export const zoomHolo = (f: number) => camControles?.zoom(f);
export const reiniciarVisaoHolo = () => camControles?.reset();

type Orbit = { target: THREE.Vector3; update: () => void; saveState: () => void; reset: () => void; minDistance: number; maxDistance: number };

function Camera() {
  const controls = useThree((s) => s.controls) as unknown as Orbit | null;
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!controls) return;
    controls.saveState();
    camControles = {
      zoom: (f) => {
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, dir.length() * f));
        camera.position.copy(controls.target).add(dir.setLength(d));
        controls.update();
        invalidate();
      },
      reset: () => {
        controls.reset();
        invalidate();
      },
    };
    return () => {
      camControles = null;
    };
  }, [controls, camera, invalidate]);
  return null;
}

function Projetor() {
  const invalidate = useThree((st) => st.invalidate);
  const itens = useRotulos((st) => st.itens);
  // com a animação pausada (frameloop "demand"), novos rótulos pedem um quadro para serem posicionados
  useEffect(() => {
    const a = requestAnimationFrame(() => {
      invalidate();
      requestAnimationFrame(() => invalidate());
    });
    return () => cancelAnimationFrame(a);
  }, [itens, invalidate]);
  useFrame(({ camera, size }) => projetarRotulos(camera, size.width, size.height));
  return null;
}

function Captura() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    capturar = () => {
      gl.render(scene, camera);
      const el = gl.domElement;
      projetarRotulos(camera, el.clientWidth, el.clientHeight);
      return el.toDataURL("image/png");
    };
    return () => {
      capturar = null;
    };
  }, [gl, scene, camera]);
  return null;
}

/** Posição do cursor sobre a cena (-1 a 1); zera quando o cursor sai. */
const ponteiro = { x: 0, y: 0, dentro: false };

/**
 * Leve flutuação da cena (holograma “vivo”) e giro suave na direção do cursor ao passar o mouse.
 * Desligados com movimento reduzido; o giro com o cursor é amortecido e limitado.
 */
function Flutuar({ children, ativo, seguir }: { children: React.ReactNode; ativo: boolean; seguir: boolean }) {
  const g = useRef<THREE.Group>(null);
  const invalidate = useThree((st) => st.invalidate);
  useFrame((st, dt) => {
    if (!g.current) return;
    const k = 1 - Math.exp(-dt * 4);
    const alvoY = (ativo ? Math.sin(st.clock.elapsedTime * 0.25) * 0.12 : 0) + (seguir && ponteiro.dentro ? ponteiro.x * 0.45 : 0);
    const alvoX = seguir && ponteiro.dentro ? -ponteiro.y * 0.18 : 0;
    g.current.position.y = ativo ? Math.sin(st.clock.elapsedTime * 0.8) * 0.06 : 0;
    g.current.rotation.y += (alvoY - g.current.rotation.y) * k;
    g.current.rotation.x += (alvoX - g.current.rotation.x) * k;
    // com a animação pausada (frameloop "demand"), continua pedindo quadros até assentar
    if (Math.abs(alvoY - g.current.rotation.y) > 0.002 || Math.abs(alvoX - g.current.rotation.x) > 0.002) invalidate();
  });
  return <group ref={g}>{children}</group>;
}

function SensorPonteiro({ ativo }: { ativo: boolean }) {
  const gl = useThree((st) => st.gl);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    if (!ativo) {
      ponteiro.dentro = false;
      return;
    }
    const el = document.getElementById("holo-canvas-wrap") ?? gl.domElement;
    const mover = (e: PointerEvent) => {
      if (e.buttons) return; // arrastando: quem gira é o controle orbital
      const r = el.getBoundingClientRect();
      ponteiro.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ponteiro.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      ponteiro.dentro = true;
      invalidate();
    };
    const sair = () => {
      ponteiro.dentro = false;
      invalidate();
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", sair);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
      ponteiro.dentro = false;
    };
  }, [ativo, gl, invalidate]);
  return null;
}

/** Caixas de rótulo (DOM) com linhas de chamada, no estilo da referência. Rótulos com alvo são botões. */
function Rotulos({ onSelecionar, selecionado, origemDe }: { onSelecionar?: (o: ObjetoId) => void; selecionado?: ObjetoId | null; origemDe?: (o: ObjetoId) => string | null }) {
  const itens = useRotulos((s) => s.itens);
  const linhas = useRef(new Map<string, SVGLineElement | null>());
  const pontos = useRef(new Map<string, SVGCircleElement | null>());
  const caixas = useRef(new Map<string, HTMLDivElement | null>());
  const ids = Object.keys(itens);
  useLayoutEffect(() => {
    for (const id of ids) registrarCaixa(id, caixas.current.get(id) ?? null, linhas.current.get(id) ?? null, pontos.current.get(id) ?? null);
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="false">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {ids.map((id) => (
          <g key={id}>
            <line ref={(el) => void linhas.current.set(id, el)} stroke="rgba(201,210,227,0.75)" strokeWidth={1} style={{ visibility: "hidden" }} />
            <circle ref={(el) => void pontos.current.set(id, el)} r={3.5} fill="#e679b5" style={{ visibility: "hidden" }} />
          </g>
        ))}
      </svg>
      {ids.map((id) => {
        const it = itens[id];
        const alvo = it.alvo;
        const origem = alvo && origemDe ? origemDe(alvo) : null;
        const ativo = Boolean(alvo && selecionado === alvo);
        const conteudo = (
          <>
            <span className="block text-[14px] font-semibold leading-tight text-white">{it.texto}</span>
            {it.sub && <span className="block text-[11px] leading-snug text-[#c9d2e3]">{it.sub}</span>}
            {origem && <span className="mt-0.5 inline-block rounded-full border border-white/20 bg-black/40 px-1.5 text-[10px] font-semibold text-[#c9d2e3] [text-shadow:none]">{origem}</span>}
          </>
        );
        return alvo && onSelecionar ? (
          <button
            key={id}
            type="button"
            ref={(el) => void caixas.current.set(id, el as unknown as HTMLDivElement)}
            data-texto={it.texto}
            data-sub={it.sub ?? ""}
            data-rotulo={id}
            data-alvo={alvo}
            aria-pressed={ativo}
            onClick={() => onSelecionar(alvo)}
            title="Ver o que é, para que serve e de onde veio"
            className={`pointer-events-auto absolute left-0 top-0 max-w-[230px] whitespace-normal rounded-lg px-2 py-1 text-left [text-shadow:0_1px_8px_rgba(0,0,0,0.95)] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e679b5] ${ativo ? "bg-[#7b4de0]/35 ring-1 ring-[#e679b5]" : ""}`}
            style={{ visibility: "hidden" }}
          >
            {conteudo}
          </button>
        ) : (
          <div
            key={id}
            ref={(el) => void caixas.current.set(id, el)}
            data-texto={it.texto}
            data-sub={it.sub ?? ""}
            className="absolute left-0 top-0 max-w-[230px] whitespace-normal rounded-lg px-2 py-1 [text-shadow:0_1px_8px_rgba(0,0,0,0.95)]"
            style={{ visibility: "hidden" }}
            data-rotulo={id}
          >
            {conteudo}
          </div>
        );
      })}
    </div>
  );
}

/** Procedimento em 3D (holograma) sobre o laboratório. */
export function Holo3D({
  passo,
  t,
  pausado,
  reduzido,
  onSelecionar,
  selecionado,
  origemDe,
}: {
  passo: PassoVisual;
  t: number;
  pausado: boolean;
  reduzido: boolean;
  onSelecionar?: (o: ObjetoId) => void;
  selecionado?: ObjetoId | null;
  origemDe?: (o: ObjetoId) => string | null;
}) {
  return (
    <div id="holo-canvas-wrap" className="absolute inset-0" data-holo3d={passo.acao}>
      <Canvas
        dpr={[1, 2]}
        frameloop={pausado ? "demand" : "always"}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        camera={{ position: [0, 0.8, 7.4], fov: 38, near: 0.1, far: 60 }}
        style={{ background: "transparent" }}
        aria-label={`Procedimento em 3D: ${passo.titulo}. ${passo.mostra}`}
        role="img"
      >
        <Flutuar ativo={!reduzido && !pausado} seguir={!reduzido}>
          <Cena3D key={passo.id} passo={passo} t={t} />
        </Flutuar>
        <OrbitControls makeDefault enablePan={false} enableDamping minDistance={5} maxDistance={12} minPolarAngle={0.6} maxPolarAngle={2.2} />
        <Projetor />
        <Captura />
        <Camera />
        <SensorPonteiro ativo={!reduzido} />
      </Canvas>
      <Rotulos onSelecionar={onSelecionar} selecionado={selecionado} origemDe={origemDe} />
    </div>
  );
}

