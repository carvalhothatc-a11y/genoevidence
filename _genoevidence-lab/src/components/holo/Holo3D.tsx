"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef } from "react";
import type * as THREE from "three";
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

/** Leve flutuação da cena inteira (holograma “vivo”), desligada com movimento reduzido. */
function Flutuar({ children, ativo }: { children: React.ReactNode; ativo: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!g.current) return;
    g.current.position.y = ativo ? Math.sin(st.clock.elapsedTime * 0.8) * 0.06 : 0;
    g.current.rotation.y = ativo ? Math.sin(st.clock.elapsedTime * 0.25) * 0.12 : 0;
  });
  return <group ref={g}>{children}</group>;
}

/** Caixas de rótulo (DOM) com linhas de chamada, no estilo da referência. */
function Rotulos() {
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
      {ids.map((id) => (
        <div
          key={id}
          ref={(el) => void caixas.current.set(id, el)}
          data-texto={itens[id].texto}
          data-sub={itens[id].sub ?? ""}
          className="absolute left-0 top-0 max-w-[230px] whitespace-normal rounded-lg px-2 py-1 [text-shadow:0_1px_8px_rgba(0,0,0,0.95)]"
          style={{ visibility: "hidden" }}
          data-rotulo={id}
        >
          <span className="block text-[14px] font-semibold leading-tight text-white">{itens[id].texto}</span>
          {itens[id].sub && <span className="block text-[11px] leading-snug text-[#c9d2e3]">{itens[id].sub}</span>}
        </div>
      ))}
    </div>
  );
}

/** Procedimento em 3D (holograma) sobre o laboratório. */
export function Holo3D({ passo, t, pausado, reduzido }: { passo: PassoVisual; t: number; pausado: boolean; reduzido: boolean }) {
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
        <Flutuar ativo={!reduzido && !pausado}>
          <Cena3D key={passo.id} passo={passo} t={t} />
        </Flutuar>
        <OrbitControls makeDefault enablePan={false} enableDamping minDistance={5} maxDistance={12} minPolarAngle={0.6} maxPolarAngle={2.2} />
        <Projetor />
        <Captura />
      </Canvas>
      <Rotulos />
    </div>
  );
}

