"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REAGENT_ORDER } from "@/lib/lab/objects";
import { CAP_COLORS, capMaterial, M } from "./materials";
import { G } from "./geometry";
import { Box, Cyl, Label, useCanvasTexture } from "./primitives";

type V3 = [number, number, number];

// ---------------------------------------------------------------- Micropipetas

const PIPETTES = [
  { id: "P-10", button: "#8d969b", scale: 0.92 },
  { id: "P-20", button: "#e2b23a", scale: 0.95 },
  { id: "P-200", button: "#d9d9d4", scale: 1 },
  { id: "P-1000", button: "#3f7fd0", scale: 1.04 },
];

/** Micropipeta monocanal de deslocamento de ar (~26 cm), pendurada no suporte. */
export function Pipette({ button, scale = 1, label }: { button: string; scale?: number; label: string }) {
  const btn = useMemo(() => capMaterial(button), [button]);
  return (
    <group scale={scale}>
      {/* cone de acoplamento da ponteira */}
      <mesh geometry={G.pipetteShaft} material={M.greyPlastic} position={[0, 0, 0]} />
      {/* corpo / empunhadura */}
      <Cyl r={0.0125} h={0.115} position={[0, 0.142, 0]} material={M.whitePlastic} shadow />
      <Cyl r={0.0135} h={0.03} position={[0, 0.098, 0]} material={M.greyPlastic} />
      {/* gancho de apoio do dedo */}
      <Box size={[0.012, 0.012, 0.04]} position={[0, 0.192, -0.022]} rotation={[0.5, 0, 0]} material={M.whitePlastic} />
      {/* janela do volume */}
      <Box size={[0.012, 0.03, 0.004]} position={[0, 0.145, 0.0125]} material={M.screen} />
      {/* ejetor de ponteira */}
      <Box size={[0.006, 0.07, 0.006]} position={[0, 0.07, 0.012]} material={M.greyPlastic} />
      <Box size={[0.014, 0.012, 0.016]} position={[0, 0.205, 0.016]} material={M.greyPlastic} />
      {/* êmbolo e botão */}
      <Cyl r={0.003} h={0.03} position={[0, 0.214, 0]} material={M.steel} low />
      <Cyl r={0.009} h={0.012} position={[0, 0.232, 0]} material={btn} />
      <Label lines={[label]} width={0.024} height={0.009} position={[0, 0.118, 0.0128]} font={64} />
    </group>
  );
}

export function PipetteStand({ position, count = 4, onlyLast = false }: { position: V3; count?: number; onlyLast?: boolean }) {
  const list = onlyLast ? [PIPETTES[2]] : PIPETTES.slice(0, count);
  const w = 0.07 * list.length + 0.04;
  return (
    <group position={position}>
      <Box size={[w, 0.012, 0.11]} position={[0, 0.006, 0]} material={M.darkPlastic} shadow />
      <Box size={[0.03, 0.33, 0.03]} position={[0, 0.165, -0.04]} material={M.darkPlastic} />
      <Box size={[w, 0.02, 0.04]} position={[0, 0.3, -0.012]} material={M.darkPlastic} />
      {list.map((p, i) => (
        <group key={p.id} position={[-w / 2 + 0.04 + i * 0.07, 0.068, 0.012]}>
          {/* presilha de apoio na barra */}
          <Box size={[0.018, 0.016, 0.022]} position={[0, 0.224, -0.012]} material={M.darkPlastic} />
          <Pipette button={p.button} scale={p.scale} label={p.id} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- Caixas de ponteiras

export function TipBox({ position, tip, label, open = true }: { position: V3; tip: "clear" | "yellow" | "blue"; label: string; open?: boolean }) {
  const mat = tip === "clear" ? M.tipClear : tip === "yellow" ? M.tipYellow : M.tipBlue;
  const tipScale = tip === "blue" ? 1.35 : tip === "yellow" ? 1 : 0.7;
  const body = tip === "blue" ? M.bluePlastic : tip === "yellow" ? M.greyPlastic : M.whitePlastic;
  const h = 0.06 * tipScale;
  const matrices = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 12; c++) {
        const m = new THREE.Matrix4();
        m.compose(new THREE.Vector3(-0.0495 + c * 0.009, h + 0.003 - 0.058 * tipScale + 0.012, -0.0315 + r * 0.009), new THREE.Quaternion(), new THREE.Vector3(tipScale * 0.9, tipScale, tipScale * 0.9));
        arr.push(m);
      }
    return arr;
  }, [h, tipScale]);
  return (
    <group position={position}>
      <Box size={[0.122, h, 0.082]} position={[0, h / 2, 0]} material={body} shadow />
      <Box size={[0.118, 0.004, 0.078]} position={[0, h + 0.002, 0]} material={M.whitePlastic} />
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
          m.instanceMatrix.needsUpdate = true;
        }}
        args={[G.tip, mat, 96]}
      />
      {/* tampa articulada aberta para trás */}
      {open && (
        <group position={[0, h + 0.004, -0.041]} rotation={[-1.9, 0, 0]}>
          <Box size={[0.122, 0.002, 0.082]} position={[0, 0, 0.041]} material={M.acrylic} />
        </group>
      )}
      <Label lines={[label]} width={0.06} height={0.012} position={[0, h * 0.45, 0.0415]} font={60} />
    </group>
  );
}

// ---------------------------------------------------------------- Tubos

export function MicroTube({ position, cap = "#f4f4f2", rotation, liquid = true, capOpen = false }: { position: V3; cap?: string; rotation?: V3; liquid?: boolean; capOpen?: boolean }) {
  const capMat = capMaterial(cap);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={G.microTube} material={M.tubePlastic} />
      {liquid && <mesh geometry={G.microTubeLiquid} material={M.liquid} />}
      <group position={[0, 0.0405, -0.0062]} rotation={[capOpen ? -2.2 : 0, 0, 0]}>
        <Cyl r={0.0062} h={0.004} position={[0, 0.002, 0.0062]} material={capMat} low />
      </group>
      <Box size={[0.003, 0.004, 0.003]} position={[0, 0.039, -0.0068]} material={capMat} />
    </group>
  );
}

export function PcrTube({ position, cap = "#f2efe4" }: { position: V3; cap?: string }) {
  return (
    <group position={position}>
      <mesh geometry={G.pcrTube} material={M.tubePlastic} />
      <Cyl r={0.0036} h={0.003} position={[0, 0.023, 0]} material={capMaterial(cap)} low />
    </group>
  );
}

/** Tira de 8 tubos de 0,2 mL (passo de 9 mm, como em placas de 96 poços). */
export function PcrStrip({ position, rotation }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: 8 }, (_, i) => (
        <PcrTube key={i} position={[-0.0315 + i * 0.009, 0, 0]} />
      ))}
      <Box size={[0.068, 0.0015, 0.003]} position={[0, 0.0205, 0]} material={M.tubePlastic} />
    </group>
  );
}

/** Rack para microtubos (4 × 5 posições). */
export function MicroTubeRack({ position, children }: { position: V3; children?: React.ReactNode }) {
  return (
    <group position={position}>
      <Box size={[0.13, 0.004, 0.065]} position={[0, 0.002, 0]} material={M.bluePlastic} />
      <Box size={[0.13, 0.004, 0.065]} position={[0, 0.03, 0]} material={M.bluePlastic} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.004, 0.032, 0.065]} position={[(s * 0.13) / 2, 0.016, 0]} material={M.bluePlastic} />
      ))}
      {children}
    </group>
  );
}

// ---------------------------------------------------------------- Balde de gelo com reagentes

const REAGENT_SHORT: Record<string, string> = {
  agua: "H₂O",
  tampao: "10X",
  dntps: "dNTP",
  mgcl2: "Mg",
  "primer-f": "F",
  "primer-r": "R",
  molde: "DNA",
  polimerase: "Taq",
};

export function IceBucket({
  position,
  highlight,
  showStrip,
  onPick,
}: {
  position: V3;
  highlight: string | null;
  showStrip: boolean;
  onPick?: (id: string, part?: string) => void;
}) {
  return (
    <group position={position}>
      {/* balde retangular de isopor com gelo picado */}
      <RoundedBox args={[0.3, 0.1, 0.22]} radius={0.012} position={[0, 0.05, 0]} material={M.styrofoam} castShadow />
      <Box size={[0.276, 0.004, 0.196]} position={[0, 0.088, 0]} material={M.ice} />
      {/* reagentes no gelo (fila de trás) */}
      {REAGENT_ORDER.map((r, i) => (
        <group
          key={r}
          position={[-0.105 + i * 0.03, 0.068, -0.055]}
          onClick={(e) => {
            if (!onPick) return;
            e.stopPropagation();
            onPick("reagentes", r);
          }}
        >
          <MicroTube position={[0, 0, 0]} cap={CAP_COLORS[r]} />
          {highlight === r && <mesh geometry={G.ring} material={M.selection} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]} scale={0.012} />}
          <Label lines={[REAGENT_SHORT[r]]} width={0.022} height={0.009} position={[0, 0.03, 0.0065]} font={70} />
        </group>
      ))}
      {/* placa de 96 poços apoiada no gelo, servindo de suporte para a tira de PCR (Lorenz 2012, §4) */}
      <group position={[0.04, 0.09, 0.045]}>
        <Box size={[0.128, 0.01, 0.086]} position={[0, 0.005, 0]} material={M.whitePlastic} />
        {showStrip && (
          <group
            onClick={(e) => {
              if (!onPick) return;
              e.stopPropagation();
              onPick("tubos-pcr");
            }}
          >
            <PcrStrip position={[0, 0.002, 0]} />
          </group>
        )}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Microcentrífuga

export function Microcentrifuge({ position, open, slots, spinning, paused }: { position: V3; open: boolean; slots: number[]; spinning: boolean; paused: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, dt) => {
    if (spinning && !paused && rotor.current) {
      rotor.current.rotation.y += dt * 30;
      invalidate();
    }
  });
  return (
    <group position={position}>
      <Cyl r={0.085} h={0.07} position={[0, 0.035, 0]} material={M.whitePlastic} shadow />
      <Cyl r={0.088} h={0.008} position={[0, 0.004, 0]} material={M.greyPlastic} />
      {/* painel frontal */}
      <Box size={[0.07, 0.03, 0.02]} position={[0, 0.03, 0.082]} material={M.darkPlastic} />
      <AssetTag id="CF-01" position={[0.06, 0.05, 0.062]} rotation={[0, 0.75, 0]} />
      <Cyl r={0.006} h={0.004} position={[0.018, 0.03, 0.093]} rotation={[Math.PI / 2, 0, 0]} material={M.rubberRed} low />
      {/* rotor com 8 posições */}
      <group ref={rotor} position={[0, 0.072, 0]}>
        <Cyl r={0.055} h={0.008} material={M.aluminum} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.04, 0.004, Math.sin(a) * 0.04]}>
              <Cyl r={0.0045} h={0.003} material={M.charcoal} low />
              {slots.includes(i) && <PcrTube position={[0, -0.012, 0]} />}
            </group>
          );
        })}
      </group>
      {/* tampa transparente articulada */}
      <group position={[0, 0.074, -0.08]} rotation={[open ? -1.6 : 0, 0, 0]}>
        <mesh position={[0, 0.0, 0.08]} scale={[0.082, 0.03, 0.082]} material={M.acrylic}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Termociclador

export type ThermoDisplay = { title: string; line: string; temp?: string };

export function Thermocycler({ position, open, tubesInside, display }: { position: V3; open: boolean; tubesInside: boolean; display: ThermoDisplay }) {
  const lid = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const targetAngle = open ? -1.25 : 0;
  useFrame((_, dt) => {
    if (!lid.current) return;
    const cur = lid.current.rotation.x;
    if (Math.abs(cur - targetAngle) > 0.001) {
      lid.current.rotation.x = cur + (targetAngle - cur) * Math.min(1, dt * 6);
      invalidate();
    }
  });
  const screen = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = "#0e1f26";
      ctx.fillRect(0, 0, w, h);
      const fit = (text: string, max: number, size: number, weight: number) => {
        let s = size;
        do {
          ctx.font = `${weight} ${s}px system-ui, sans-serif`;
          s -= 2;
        } while (ctx.measureText(text).width > max && s > 14);
      };
      ctx.fillStyle = "#9fe3d2";
      fit(display.title, w - 48, 44, 600);
      ctx.fillText(display.title, 24, 62);
      ctx.fillStyle = "#d6efe9";
      fit(display.line, w - 48, 34, 400);
      ctx.fillText(display.line, 24, 118);
      if (display.temp) {
        ctx.fillStyle = "#ffffff";
        fit(display.temp, w - 48, 70, 700);
        ctx.fillText(display.temp, 24, 212);
      }
    },
    `${display.title}|${display.line}|${display.temp}`,
    512,
    256,
  );
  const wells = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 12; c++) arr.push(new THREE.Matrix4().makeTranslation(-0.0495 + c * 0.009, 0, -0.0315 + r * 0.009));
    return arr;
  }, []);
  return (
    <group position={position}>
      {/* corpo */}
      <RoundedBox args={[0.27, 0.16, 0.4]} radius={0.015} position={[0, 0.08, 0]} material={M.whitePlastic} castShadow receiveShadow />
      <Box size={[0.272, 0.02, 0.402]} position={[0, 0.01, 0]} material={M.greyPlastic} />
      {/* grade de ventilação lateral */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[0.002, 0.008, 0.18]} position={[0.136, 0.05 + i * 0.016, -0.05]} material={M.darkPlastic} />
      ))}
      {/* painel frontal inclinado com tela */}
      <group position={[0, 0.098, 0.212]} rotation={[-0.35, 0, 0]}>
        <Box size={[0.25, 0.1, 0.01]} material={M.darkPlastic} />
        <mesh position={[0, 0.005, 0.0055]}>
          <planeGeometry args={[0.14, 0.07]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
      {/* bloco de 96 poços */}
      <group position={[0, 0.162, -0.02]}>
        <Box size={[0.13, 0.006, 0.09]} position={[0, -0.003, 0]} material={M.aluminum} />
        <instancedMesh
          args={[G.wellCylinder, M.charcoal, 96]}
          ref={(m) => {
            if (!m) return;
            wells.forEach((mx, i) => m.setMatrixAt(i, mx));
            m.instanceMatrix.needsUpdate = true;
          }}
        />
        {tubesInside && <PcrStrip position={[0, -0.012, -0.0315 + 3 * 0.009]} />}
      </group>
      {/* tampa aquecida articulada na parte de trás */}
      <group ref={lid} position={[0, 0.162, -0.2]}>
        <RoundedBox args={[0.25, 0.05, 0.3]} radius={0.01} position={[0, 0.025, 0.15]} material={M.greyPlastic} castShadow />
        <Box size={[0.12, 0.01, 0.03]} position={[0, 0.03, 0.305]} material={M.darkPlastic} />
      </group>
      <Label lines={["Termociclador"]} width={0.12} height={0.02} position={[-0.05, 0.03, 0.2015]} font={64} bg="#f3f3ef" />
      <AssetTag id="TC-01" position={[0.1375, 0.11, 0.12]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- Eletroforese

export function GelTank({ position, rotation }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* cuba de acrílico */}
      <Box size={[0.32, 0.075, 0.16]} position={[0, 0.0375, 0]} material={M.acrylic} />
      <Box size={[0.32, 0.006, 0.16]} position={[0, 0.003, 0]} material={M.acrylic} />
      {/* tampão de corrida */}
      <Box size={[0.31, 0.05, 0.15]} position={[0, 0.03, 0]} material={M.buffer} />
      {/* gel na bandeja central */}
      <Box size={[0.15, 0.008, 0.12]} position={[0, 0.03, 0]} material={M.agarose} />
      {/* poços (perto do cátodo, à esquerda) */}
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} size={[0.003, 0.005, 0.009]} position={[-0.055, 0.0345, -0.045 + i * 0.013]} material={M.charcoal} />
      ))}
      {/* eletrodos de platina (fios) */}
      <Box size={[0.002, 0.002, 0.14]} position={[-0.145, 0.008, 0]} material={M.steel} />
      <Box size={[0.002, 0.002, 0.14]} position={[0.145, 0.008, 0]} material={M.steel} />
      {/* tampa com conectores: preto (cátodo, lado dos poços) e vermelho (ânodo) */}
      <Box size={[0.325, 0.006, 0.165]} position={[0, 0.079, 0]} material={M.acrylic} />
      <Cyl r={0.007} h={0.02} position={[-0.15, 0.09, 0.06]} material={M.rubberBlack} low />
      <Cyl r={0.007} h={0.02} position={[0.15, 0.09, 0.06]} material={M.rubberRed} low />
      <Label lines={["−  cátodo"]} width={0.05} height={0.012} position={[-0.12, 0.083, 0.07]} rotation={[-Math.PI / 2, 0, 0]} font={70} />
      <Label lines={["+  ânodo"]} width={0.05} height={0.012} position={[0.12, 0.083, 0.07]} rotation={[-Math.PI / 2, 0, 0]} font={70} />
    </group>
  );
}

export function PowerSupply({ position, rotation }: { position: V3; rotation?: V3 }) {
  const screen = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = "#101a10";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#b8f5a8";
      ctx.font = "700 96px ui-monospace, monospace";
      ctx.fillText("--- V", 40, 150);
      ctx.font = "400 34px system-ui, sans-serif";
      ctx.fillText("desligada", 44, 220);
    },
    "fonte",
    512,
    256,
  );
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.24, 0.1, 0.22]} radius={0.008} position={[0, 0.05, 0]} material={M.greyPlastic} castShadow />
      <AssetTag id="FT-03" position={[0.121, 0.075, 0.0]} rotation={[0, Math.PI / 2, 0]} />
      <group position={[0, 0.06, 0.111]}>
        <mesh position={[-0.04, 0, 0.001]}>
          <planeGeometry args={[0.09, 0.045]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <Cyl r={0.007} h={0.012} position={[0.06, 0.012, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={M.rubberRed} low />
        <Cyl r={0.007} h={0.012} position={[0.085, 0.012, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={M.rubberBlack} low />
        <Cyl r={0.012} h={0.012} position={[0.07, -0.022, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={M.darkPlastic} low />
      </group>
    </group>
  );
}

/** Cabo entre a fonte e a cuba (curva simples). */
export function Cable({ from, to, color }: { from: V3; to: V3; color: "red" | "black" }) {
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().lerp(b, 0.5);
    mid.y = Math.min(a.y, b.y) - 0.01;
    const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y + 0.03), mid, b.clone().lerp(mid, 0.5).setY(b.y + 0.03), b]);
    return new THREE.TubeGeometry(curve, 40, 0.0028, 6, false);
  }, [from, to]);
  return <mesh geometry={geom} material={color === "red" ? M.rubberRed : M.rubberBlack} />;
}

// ---------------------------------------------------------------- Computador

export function Computer({ position, rotation, lines }: { position: V3; rotation?: V3; lines: string[] }) {
  const screen = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = "#f7f7f4";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0f6b5c";
      ctx.fillRect(0, 0, w, 70);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 38px system-ui, sans-serif";
      ctx.fillText("Estação de análise", 28, 48);
      ctx.fillStyle = "#17201c";
      lines.forEach((l, i) => {
        ctx.font = `${i === 0 ? 600 : 400} 32px system-ui, sans-serif`;
        ctx.fillText(l.length > 46 ? l.slice(0, 45) + "…" : l, 28, 130 + i * 52);
      });
    },
    lines.join("|"),
    1024,
    600,
  );
  return (
    <group position={position} rotation={rotation}>
      {/* monitor */}
      <Box size={[0.58, 0.36, 0.025]} position={[0, 0.33, 0]} material={M.charcoal} shadow />
      <mesh position={[0, 0.33, 0.0131]}>
        <planeGeometry args={[0.55, 0.32]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      <Box size={[0.04, 0.14, 0.03]} position={[0, 0.08, -0.02]} material={M.steelDark} />
      <Box size={[0.2, 0.012, 0.16]} position={[0, 0.006, -0.01]} material={M.steelDark} />
      {/* teclado e mouse */}
      <Box size={[0.42, 0.016, 0.13]} position={[0, 0.008, 0.25]} material={M.darkPlastic} />
      <Box size={[0.4, 0.004, 0.11]} position={[0, 0.017, 0.25]} material={M.greyPlastic} />
      <RoundedBox args={[0.06, 0.025, 0.1]} radius={0.012} position={[0.3, 0.012, 0.26]} material={M.darkPlastic} />
    </group>
  );
}

/** Etiqueta de patrimônio (identificação do equipamento no laboratório) com a faixa da marca. */
export function AssetTag({ id, position, rotation }: { id: string; position: V3; rotation?: V3 }) {
  return <Label lines={[`§GE · ${id}`]} width={0.07} height={0.018} position={position} rotation={rotation} accent="marca" font={78} />;
}
