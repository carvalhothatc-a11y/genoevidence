"use client";
import { BENCHES, BENCH_TOP, DESK_TOP } from "@/lib/lab/layout";
import { floorTexture, M } from "./materials";
import { useMemo } from "react";
import * as THREE from "three";
import { Box, Cyl, Label } from "./primitives";

/** Bancada com armários, tampo de resina epóxi escura, puxadores e prateleira superior opcional. */
export function Bench({ length, depth, height = BENCH_TOP, shelf = true, desk = false }: { length: number; depth: number; height?: number; shelf?: boolean; desk?: boolean }) {
  const topT = 0.03;
  const cabH = height - topT - 0.1;
  const doors = Math.max(2, Math.round(length / 0.6));
  const doorW = (length - 0.04) / doors;
  return (
    <group>
      {/* tampo */}
      <Box size={[length + 0.02, topT, depth + 0.02]} position={[0, height - topT / 2, 0]} material={desk ? M.shelf : M.benchTop} shadow />
      {desk ? (
        <>
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.04, height - topT, depth - 0.1]} position={[(s * (length - 0.1)) / 2, (height - topT) / 2, 0]} material={M.steelDark} />
          ))}
          <Box size={[length - 0.1, 0.04, 0.03]} position={[0, 0.35, -depth / 2 + 0.06]} material={M.steelDark} />
        </>
      ) : (
        <>
          {/* corpo do armário e rodapé recuado */}
          <Box size={[length, cabH, depth - 0.06]} position={[0, 0.1 + cabH / 2, -0.03]} material={M.cabinet} shadow />
          <Box size={[length - 0.04, 0.1, depth - 0.12]} position={[0, 0.05, -0.06]} material={M.kick} />
          {Array.from({ length: doors }, (_, i) => {
            const x = -length / 2 + 0.02 + doorW * (i + 0.5);
            const drawer = i % 3 === 1;
            return (
              <group key={i} position={[x, 0, depth / 2 - 0.055]}>
                {drawer ? (
                  [0, 1, 2].map((k) => (
                    <group key={k}>
                      <Box size={[doorW - 0.008, cabH / 3 - 0.008, 0.018]} position={[0, 0.1 + (cabH / 3) * (k + 0.5), 0]} material={M.cabinetDoor} />
                      <Box size={[doorW * 0.45, 0.012, 0.02]} position={[0, 0.1 + (cabH / 3) * (k + 0.5) + cabH / 6 - 0.04, 0.018]} material={M.steel} />
                    </group>
                  ))
                ) : (
                  <>
                    <Box size={[doorW - 0.008, cabH - 0.008, 0.018]} position={[0, 0.1 + cabH / 2, 0]} material={M.cabinetDoor} />
                    <Box size={[0.012, 0.14, 0.02]} position={[i % 2 ? -doorW / 2 + 0.05 : doorW / 2 - 0.05, 0.1 + cabH - 0.12, 0.018]} material={M.steel} />
                  </>
                )}
              </group>
            );
          })}
        </>
      )}
      {shelf && !desk && (
        <group>
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.035, 0.85, 0.035]} position={[(s * (length - 0.12)) / 2, height + 0.425, -depth / 2 + 0.06]} material={M.steel} />
          ))}
          <Box size={[length - 0.05, 0.022, 0.3]} position={[0, height + 0.62, -depth / 2 + 0.17]} material={M.shelf} shadow />
          {/* régua de tomadas sob a prateleira */}
          <Box size={[length * 0.6, 0.05, 0.04]} position={[0, height + 0.2, -depth / 2 + 0.03]} material={M.whitePlastic} />
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} size={[0.03, 0.03, 0.005]} position={[-length * 0.25 + (i * length * 0.5) / 5, height + 0.2, -depth / 2 + 0.052]} material={M.greyPlastic} />
          ))}
        </group>
      )}
    </group>
  );
}

/** Banqueta de laboratório (assento e base). */
function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cyl r={0.19} h={0.06} position={[0, 0.64, 0]} material={M.darkPlastic} />
      <Cyl r={0.025} h={0.6} position={[0, 0.32, 0]} material={M.steel} low />
      <Cyl r={0.2} h={0.012} position={[0, 0.28, 0]} material={M.steel} low />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Box key={i} size={[0.3, 0.02, 0.035]} position={[Math.cos(a) * 0.15, 0.03, Math.sin(a) * 0.15]} rotation={[0, -a, 0]} material={M.darkPlastic} />;
      })}
    </group>
  );
}

function ShelfContents({ x0, label }: { x0: number; label: string }) {
  // Consumíveis coerentes com a bancada (caixas identificadas); não clicáveis.
  return (
    <group position={[x0, BENCH_TOP + 0.64, -3.85]}>
      {[0, 1, 2].map((i) => (
        <Box key={i} size={[0.22, 0.12, 0.16]} position={[i * 0.26, 0.06, 0]} material={i === 1 ? M.whitePlastic : M.shelf} />
      ))}
      <Label lines={[label]} width={0.6} height={0.05} position={[0.26, 0.06, 0.081]} font={56} />
    </group>
  );
}

function Floor({ W, D }: { W: number; D: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.8 }), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow material={mat}>
      <planeGeometry args={[W, D]} />
    </mesh>
  );
}

export function Room({ projectName }: { projectName?: string }) {
  const W = 12.6;
  const D = 9;
  return (
    <group>
      {/* piso e paredes */}
      <Floor W={W} D={D} />
      <mesh position={[0, 1.6, -4]} material={M.wall} receiveShadow>
        <planeGeometry args={[W, 3.2]} />
      </mesh>
      <mesh position={[-W / 2, 1.6, 0.5]} rotation={[0, Math.PI / 2, 0]} material={M.wall} receiveShadow>
        <planeGeometry args={[D, 3.2]} />
      </mesh>
      <mesh position={[W / 2, 1.6, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={M.wall} receiveShadow>
        <planeGeometry args={[D, 3.2]} />
      </mesh>
      <Box size={[W, 0.08, 0.015]} position={[0, 0.04, -3.99]} material={M.baseboard} />
      <Box size={[0.015, 0.08, D]} position={[-W / 2 + 0.008, 0.04, 0.5]} material={M.baseboard} />
      <Box size={[0.015, 0.08, D]} position={[W / 2 - 0.008, 0.04, 0.5]} material={M.baseboard} />
      {/* divisória baixa entre preparo e amplificação (separação visual das zonas) */}
      <Box size={[0.04, 1.8, 0.9]} position={[-0.95, 0.9, -3.55]} material={M.shelf} shadow />

      {/* bancadas */}
      <group position={BENCHES.pre.center}>
        <Bench length={BENCHES.pre.length} depth={BENCHES.pre.depth} />
      </group>
      <group position={BENCHES.amp.center}>
        <Bench length={BENCHES.amp.length} depth={BENCHES.amp.depth} />
      </group>
      <group position={BENCHES.pos.center} rotation={[0, BENCHES.pos.rotationY, 0]}>
        <Bench length={BENCHES.pos.length} depth={BENCHES.pos.depth} />
      </group>
      <group position={BENCHES.analise.center} rotation={[0, BENCHES.analise.rotationY, 0]}>
        <Bench length={BENCHES.analise.length} depth={BENCHES.analise.depth} height={DESK_TOP} desk shelf={false} />
      </group>
      <ShelfContents x0={-5.0} label="Caixas de ponteiras e tubos (estoque)" />

      <Stool position={[-2.35, 0, -3.0]} />
      <Stool position={[4.95, 0, -0.9]} />
      {/* cadeira da estação de análise */}
      <group position={[-5.15, 0, -0.5]}>
        <Box size={[0.46, 0.06, 0.46]} position={[0, 0.48, 0]} material={M.fabric} />
        <Box size={[0.06, 0.45, 0.42]} position={[0.22, 0.78, 0]} material={M.fabric} />
        <Cyl r={0.025} h={0.45} position={[0, 0.24, 0]} material={M.steel} low />
        <Cyl r={0.24} h={0.015} position={[0, 0.02, 0]} material={M.darkPlastic} low />
      </group>

      {/* sinalização das zonas — faixa em gradiente Geno Evidence e numeração em mono */}
      <Label lines={["§01 · PRÉ-PCR", "Preparo de reações", "Sem produtos amplificados nesta área"]} width={1.7} height={0.36} position={[-3.4, 2.15, -3.985]} accent="marca" />
      <Label lines={["§02 · AMPLIFICAÇÃO", "Termociclador", "Somente tubos fechados"]} width={1.3} height={0.36} position={[1.1, 2.15, -3.985]} accent="marca" />
      <Label lines={["§03 · PÓS-PCR", "Eletroforese", "Produtos de PCR abertos só aqui"]} width={1.7} height={0.36} position={[6.285, 2.15, -0.9]} rotation={[0, -Math.PI / 2, 0]} accent="marca" />
      <Label lines={["§04 · ANÁLISE", "Dados e fontes", projectName ? `Projeto: ${projectName}` : "Projetos, gráficos e estruturas"]} width={1.5} height={0.36} position={[-6.285, 2.0, -0.5]} rotation={[0, Math.PI / 2, 0]} accent="marca" />
    </group>
  );
}
