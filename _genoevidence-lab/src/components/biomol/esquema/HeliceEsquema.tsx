"use client";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { heliceDupla, heliceSimples, type NtEsquema, type P3 } from "@/lib/biomol/helice";
import { corDoToken } from "../comum";

/** Å → unidades da cena. */
const K = 0.1;
const v3 = (p: P3) => new THREE.Vector3(p[0] * K, p[1] * K, p[2] * K);

export type Selecao = { fita: 1 | 2; indice: number } | null;

/** Cores das bases e das fitas, lidas dos tokens do tema (as mesmas do resto da BioMol). */
function useCores() {
  const [c, setC] = useState<Record<string, string>>({});
  useEffect(() => {
    setC({ A: corDoToken("ok"), T: corDoToken("danger"), U: corDoToken("danger"), G: corDoToken("warn"), C: corDoToken("accent"), f1: corDoToken("accent-ink"), f2: corDoToken("violet"), outro: corDoToken("muted") });
  }, []);
  return c;
}

function Bastao({ de, ate, raio, cor, emissivo = 0 }: { de: THREE.Vector3; ate: THREE.Vector3; raio: number; cor: string; emissivo?: number }) {
  const { pos, quat, comp } = useMemo(() => {
    const d = new THREE.Vector3().subVectors(ate, de);
    return {
      pos: new THREE.Vector3().addVectors(de, ate).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()),
      comp: d.length(),
    };
  }, [de, ate]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[raio, raio, comp, 14]} />
      <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={emissivo} roughness={0.35} metalness={0.05} />
    </mesh>
  );
}

function Esqueleto({ nts, cor }: { nts: NtEsquema[]; cor: string }) {
  const geo = useMemo(() => {
    if (nts.length < 2) return null;
    const curva = new THREE.CatmullRomCurve3(nts.map((n) => v3(n.esqueleto)));
    return new THREE.TubeGeometry(curva, Math.max(16, nts.length * 8), 0.16, 10, false);
  }, [nts]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={cor} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function Nucleotideo({ n, cores, selecionado, aoSelecionar, aoPassar }: { n: NtEsquema; cores: Record<string, string>; selecionado: boolean; aoSelecionar: () => void; aoPassar: (s: boolean) => void }) {
  const de = useMemo(() => v3(n.esqueleto), [n]);
  const ate = useMemo(() => v3(n.ponta), [n]);
  const cor = cores[n.base] ?? cores.outro ?? "#888888";
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        aoSelecionar();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        aoPassar(true);
      }}
      onPointerOut={() => aoPassar(false)}
    >
      <Bastao de={de} ate={ate} raio={selecionado ? 0.26 : 0.2} cor={cor} emissivo={selecionado ? 0.6 : 0.12} />
      <mesh position={de}>
        <sphereGeometry args={[selecionado ? 0.4 : 0.3, 18, 18]} />
        <meshStandardMaterial color={cores[n.fita === 1 ? "f1" : "f2"] ?? "#888888"} roughness={0.35} emissive={selecionado ? cor : "#000000"} emissiveIntensity={selecionado ? 0.5 : 0} />
      </mesh>
    </group>
  );
}

function Ponta({ p, texto, portal }: { p: P3; texto: string; portal: RefObject<HTMLElement> }) {
  return (
    <Html portal={portal} position={v3(p)} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <span className="ge-mono rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{texto}</span>
    </Html>
  );
}

/**
 * Esquema 3D de uma sequência: dupla-hélice (DNA) ou fita simples (RNA).
 * ILUSTRAÇÃO DIDÁTICA com medidas médias — não é a estrutura medida desta sequência.
 */
export function HeliceEsquema({
  fita1,
  fita2,
  tipo,
  selecao,
  aoSelecionar,
  girar,
}: {
  /** Fita dada, 5'→3'. */
  fita1: string;
  /** Complementar lida 3'→5' (só DNA). */
  fita2?: string;
  tipo: "dupla" | "simples";
  selecao: Selecao;
  aoSelecionar: (s: Selecao) => void;
  girar: boolean;
}) {
  const cores = useCores();
  const [passando, setPassando] = useState<Selecao>(null);
  const geo = useMemo(() => (tipo === "dupla" && fita2 ? heliceDupla(fita1, fita2) : { fita1: heliceSimples(fita1), fita2: [] as NtEsquema[] }), [fita1, fita2, tipo]);
  const n = geo.fita1.length;
  const comprimento = n * (tipo === "dupla" ? 3.38 : 2.8) * K;
  const distancia = Math.max(4.5, (comprimento / 2 / Math.tan((20 * Math.PI) / 180)) * 1.15);
  const destaque = passando ?? selecao;
  // camada fixa para os rótulos 5'/3' (ver CamadaHtml em processos/pecas)
  const camada = useRef<HTMLDivElement>(null);
  const portal = camada as RefObject<HTMLElement>;

  return (
    <>
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.5, distancia], fov: 40, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ background: "transparent" }}
      role="img"
      aria-label={`Esquema 3D da sequência (${n} ${tipo === "dupla" ? "pares de bases" : "nucleotídeos"}). Use a fita em texto abaixo para escolher uma base pelo teclado.`}
      onPointerMissed={() => aoSelecionar(null)}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 8]} intensity={1.15} />
      <directionalLight position={[-6, -3, -4]} intensity={0.35} />
      {/* eixo da hélice na horizontal: aproveita a largura da tela */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <Esqueleto nts={geo.fita1} cor={cores.f1 ?? "#9db4ff"} />
        <Esqueleto nts={geo.fita2} cor={cores.f2 ?? "#b49cf5"} />
        {geo.fita1.map((nt) => (
          <Nucleotideo
            key={`1-${nt.indice}`}
            n={nt}
            cores={cores}
            selecionado={Boolean(destaque && destaque.indice === nt.indice)}
            aoSelecionar={() => aoSelecionar({ fita: 1, indice: nt.indice })}
            aoPassar={(s) => setPassando(s ? { fita: 1, indice: nt.indice } : null)}
          />
        ))}
        {geo.fita2.map((nt) => (
          <Nucleotideo
            key={`2-${nt.indice}`}
            n={nt}
            cores={cores}
            selecionado={Boolean(destaque && destaque.indice === nt.indice)}
            aoSelecionar={() => aoSelecionar({ fita: 2, indice: nt.indice })}
            aoPassar={(s) => setPassando(s ? { fita: 2, indice: nt.indice } : null)}
          />
        ))}
        {n > 0 && (
          <>
            <Ponta portal={portal} p={geo.fita1[0].esqueleto} texto="5'" />
            <Ponta portal={portal} p={geo.fita1[n - 1].esqueleto} texto="3'" />
            {geo.fita2.length > 0 && (
              <>
                <Ponta portal={portal} p={geo.fita2[0].esqueleto} texto="3'" />
                <Ponta portal={portal} p={geo.fita2[n - 1].esqueleto} texto="5'" />
              </>
            )}
          </>
        )}
      </group>
      <OrbitControls makeDefault enablePan={false} enableDamping autoRotate={girar} autoRotateSpeed={0.6} minDistance={2} maxDistance={60} />
    </Canvas>
    <div ref={camada} className="pointer-events-none absolute inset-0" aria-hidden="true" />
    </>
  );
}
