"use client";
import { Html, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { corDoToken } from "../comum";

/**
 * Peças das animações esquemáticas: fitas, bases, enzimas e etiquetas.
 * Formas e escalas são didáticas — não representam a forma real das moléculas.
 */

/**
 * Camada HTML fixa para os rótulos. O `Html` do drei, sem isso, escolhe o elemento-alvo sozinho — e
 * ele muda quando o 3D conecta os eventos, o que faz o React tentar remover nós que já saíram.
 */
export const CamadaHtml = createContext<RefObject<HTMLDivElement | null> | null>(null);
const usePortal = () => (useContext(CamadaHtml) ?? undefined) as RefObject<HTMLElement> | undefined;

export const PASSO = 0.5; // distância entre nucleotídeos vizinhos, em unidades da cena
export const xDe = (i: number, total: number) => (i - (total - 1) / 2) * PASSO;

export type Paleta = Record<"A" | "C" | "G" | "T" | "U" | "f1" | "f2" | "nova" | "primer" | "rna" | "enzima" | "enzima2" | "aa" | "texto", string>;

export function usePaleta(): Paleta | null {
  const [p, setP] = useState<Paleta | null>(null);
  useEffect(() => {
    setP({
      A: corDoToken("ok"),
      C: corDoToken("accent"),
      G: corDoToken("warn"),
      T: corDoToken("danger"),
      U: corDoToken("danger"),
      f1: corDoToken("accent-ink"),
      f2: corDoToken("panel-muted"),
      nova: corDoToken("ok"),
      primer: corDoToken("violet"),
      rna: corDoToken("violet"),
      enzima: corDoToken("accent"),
      enzima2: corDoToken("violet"),
      aa: corDoToken("violet"),
      texto: corDoToken("ink"),
    });
  }, []);
  return p;
}

/** Esqueleto de uma fita, passando pelos pontos dados (tubo liso). */
export const Esqueleto = memo(function Esqueleto({ pontos, cor, raio = 0.07, opacidade = 1 }: { pontos: [number, number, number][]; cor: string; raio?: number; opacidade?: number }) {
  const geo = useMemo(() => {
    if (pontos.length < 2) return null;
    const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curva, Math.max(8, pontos.length * 6), raio, 10, false);
  }, [pontos, raio]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color={cor} roughness={0.35} clearcoat={0.6} transparent={opacidade < 1} opacity={opacidade} />
    </mesh>
  );
});

/** Uma base: bloco arredondado que sai do esqueleto na direção `para` (+1 sobe, −1 desce). */
export const Base = memo(function Base({
  x,
  y,
  para,
  cor,
  destaque = false,
  opacidade = 1,
  comprimento = 0.42,
}: {
  x: number;
  y: number;
  para: 1 | -1;
  cor: string;
  destaque?: boolean;
  opacidade?: number;
  comprimento?: number;
}) {
  return (
    <group position={[x, y + (para * comprimento) / 2, 0]}>
      <RoundedBox args={[0.3, comprimento, 0.3]} radius={0.07} smoothness={3}>
        <meshPhysicalMaterial color={cor} roughness={0.28} clearcoat={0.8} emissive={cor} emissiveIntensity={destaque ? 0.55 : 0.08} transparent={opacidade < 1} opacity={opacidade} />
      </RoundedBox>
      <mesh position={[0, (-para * comprimento) / 2, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={cor} roughness={0.4} transparent={opacidade < 1} opacity={opacidade} />
      </mesh>
    </group>
  );
});

/** Enzima ou ribossomo: forma lisa e translúcida, para não esconder as fitas. */
export function Blob({ posicao, escala, cor, opacidade = 0.32, forma = "esfera" }: { posicao: [number, number, number]; escala: [number, number, number]; cor: string; opacidade?: number; forma?: "esfera" | "anel" }) {
  return (
    <group position={posicao} scale={escala}>
      <mesh>
        {forma === "anel" ? <torusGeometry args={[1, 0.38, 20, 48]} /> : <sphereGeometry args={[1, 40, 40]} />}
        <meshPhysicalMaterial color={cor} roughness={0.15} clearcoat={1} transparent opacity={opacidade} depthWrite={false} emissive={cor} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/** Etiqueta presa a um ponto, com linha de chamada (estilo painel científico discreto). */
export function Etiqueta({ posicao, texto, sub, lado = "cima", tom = "accent" }: { posicao: [number, number, number]; texto: string; sub?: string; lado?: "cima" | "baixo"; tom?: "accent" | "violet" | "ok" | "warn" }) {
  const cor = `var(--${tom === "accent" ? "accent" : tom})`;
  const portal = usePortal();
  return (
    <Html portal={portal} position={posicao} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="relative" style={{ transform: `translate(-6px, ${lado === "cima" ? "-100%" : "0"})` }}>
        <div
          className="ge-mono whitespace-nowrap rounded-md border bg-black/75 px-2 py-1 text-[11px] leading-tight text-white shadow-lg backdrop-blur"
          style={{ borderColor: cor, marginBottom: lado === "cima" ? 26 : 0, marginTop: lado === "baixo" ? 26 : 0 }}
        >
          <span className="font-semibold">{texto}</span>
          {sub && <span className="block text-white/70">{sub}</span>}
        </div>
        <span className="absolute left-[6px] w-px" style={{ background: cor, height: 24, [lado === "cima" ? "bottom" : "top"]: 0 }} />
        <span className="absolute left-[3px] size-[7px] rounded-full border-2" style={{ borderColor: cor, [lado === "cima" ? "bottom" : "top"]: -3 }} />
      </div>
    </Html>
  );
}

/** Letra da base, pequena, só perto da ação (para não poluir). */
export function Letra({ posicao, letra, cor }: { posicao: [number, number, number]; letra: string; cor: string }) {
  const portal = usePortal();
  return (
    <Html portal={portal} position={posicao} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
      <span className="ge-mono text-[12px] font-bold" style={{ color: cor, textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>
        {letra}
      </span>
    </Html>
  );
}

/** Câmera que acompanha a ação com suavidade (ou salta, se o movimento estiver reduzido). */
export function CameraSegue({ x, y = 0, distancia = 8.5, suave = true }: { x: number; y?: number; distancia?: number; suave?: boolean }) {
  const { camera } = useThree();
  const alvo = useRef(new THREE.Vector3(x, y, 0));
  useFrame((_, dt) => {
    const k = suave ? 1 - Math.exp(-dt * 2.2) : 1;
    alvo.current.x += (x - alvo.current.x) * k;
    alvo.current.y += (y - alvo.current.y) * k;
    camera.position.x += (alvo.current.x + distancia * 0.12 - camera.position.x) * k;
    camera.position.y += (alvo.current.y + 1.2 - camera.position.y) * k;
    camera.position.z += (distancia - camera.position.z) * k;
    camera.lookAt(alvo.current);
  });
  return null;
}

/** Rótulo de aminoácido na cadeia (usa a mesma camada fixa). */
export function RotuloAa({ letra }: { letra: string }) {
  const portal = usePortal();
  return (
    <Html portal={portal} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
      <span className="ge-mono text-[10.5px] font-bold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>
        {letra}
      </span>
    </Html>
  );
}

/** Suavização de 0 a 1 (começa e termina devagar). */
export const suave = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
