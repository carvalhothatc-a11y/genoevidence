"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BENCH_TOP, DESK_TOP, OBJECT_POS, PORTRAIT_VIEWS, VIEWS, viewFor, type Vec3 } from "@/lib/lab/layout";
import { useLab } from "@/store/lab";
import type { Quality } from "@/store/ui";
import { G } from "./geometry";
import { projectHotspots, setHotspotInvalidator } from "./hotspots";
import { setLabCapture } from "./capture";
import { M } from "./materials";
import { Room } from "./Room";
import {
  Cable,
  Computer,
  GelTank,
  IceBucket,
  Microcentrifuge,
  MicroTube,
  MicroTubeRack,
  PipetteStand,
  PowerSupply,
  Thermocycler,
  TipBox,
  type ThermoDisplay,
} from "./equipment";

export type LabCanvasProps = {
  quality: Quality;
  paused: boolean;
  reducedMotion: boolean;
  /** Controles de órbita (desligados no celular: enquadramentos fixos). */
  orbit: boolean;
  projectName?: string;
  computerLines: string[];
  thermoDisplay: ThermoDisplay;
  onSelect: (id: string, part?: string | null) => void;
  /** "noite": estúdio imersivo escuro (cores da marca); padrão: laboratório claro. */
  ambiente?: "dia" | "noite";
};

// ---------------------------------------------------------------- ambiente e câmera

function RoomEnv({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!enabled) {
      scene.environment = null;
      return;
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [enabled, gl, scene]);
  return null;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function CameraRig({ instant }: { instant: boolean }) {
  const intro = useLab((s) => s.intro);
  const labView = useLab((s) => s.view);
  const view = intro === "pendente" ? "intro" : labView;
  const nonce = useLab((s) => s.cameraNonce);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef<{ fp: THREE.Vector3; tp: THREE.Vector3; ft: THREE.Vector3; tt: THREE.Vector3; t: number } | null>(null);

  const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height));
  useEffect(() => {
    const portrait = aspect < 1;
    const persp = camera as THREE.PerspectiveCamera;
    const fov = portrait ? 60 : 50;
    if (persp.fov !== fov) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    const preset = portrait ? PORTRAIT_VIEWS[view] : undefined;
    const v = preset ?? viewFor(view);
    const tp = new THREE.Vector3(...v.position);
    const tt = new THREE.Vector3(...v.target);
    // Telas estreitas: afasta a câmera para manter o enquadramento (exceto nos enquadramentos de retrato prontos).
    if (!preset && aspect < 1.5) tp.sub(tt).multiplyScalar(Math.pow(1.5 / aspect, portrait ? 0.55 : 0.85)).add(tt);
    // Retrato: o painel inferior ocupa a parte de baixo; mira abaixo do objeto para que ele apareça no alto da tela.
    if (!preset && portrait) {
      const lower = tp.distanceTo(tt) * 0.22;
      tt.y -= lower;
      tp.y -= lower * 0.4;
    }
    if (!controls) {
      camera.position.copy(tp);
      camera.lookAt(tt);
      invalidate();
      return;
    }
    if (instant) {
      camera.position.copy(tp);
      controls.target.copy(tt);
      controls.update();
      anim.current = null;
      invalidate();
      return;
    }
    anim.current = { fp: camera.position.clone(), tp, ft: controls.target.clone(), tt, t: 0 };
    invalidate();
  }, [view, nonce, controls, camera, instant, invalidate, aspect]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.9);
    const k = ease(a.t);
    camera.position.lerpVectors(a.fp, a.tp, k);
    if (controls) {
      controls.target.lerpVectors(a.ft, a.tt, k);
      controls.update();
    } else camera.lookAt(a.tt);
    if (a.t >= 1) anim.current = null;
    else invalidate();
  });
  return null;
}

// ---------------------------------------------------------------- seleção

/** Anel de seleção: pulso curto (~180 ms) ao selecionar; sem animação contínua. */
function SelectionRing({ ring, selected }: { ring: number; selected: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    t.current = 0;
    invalidate();
  }, [selected, invalidate]);
  useFrame((_, dt) => {
    if (!ref.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 0.18);
    const k = 1 - Math.pow(1 - t.current, 3);
    ref.current.scale.setScalar(ring * (1.22 - 0.22 * k));
    invalidate();
  });
  return <mesh ref={ref} geometry={G.ring} material={selected ? M.selection : M.hover} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={ring} renderOrder={2} />;
}

function Selectable({ id, children, ring = 0.12, position, rotation, onSelect }: { id: string; children: ReactNode; ring?: number; position?: Vec3; rotation?: Vec3; onSelect: (id: string) => void }) {
  const selected = useLab((s) => s.selected === id);
  const hovered = useLab((s) => s.hovered === id);
  const setHovered = useLab((s) => s.setHovered);
  return (
    <group
      position={position ?? OBJECT_POS[id]}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = "";
      }}
    >
      {children}
      {(selected || hovered) && <SelectionRing ring={ring} selected={selected} />}
    </group>
  );
}

// ---------------------------------------------------------------- pontos de interesse

/** Atualiza a posição dos botões DOM a cada quadro renderizado (só renderiza quando algo muda). */
function HotspotProjector() {
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    setHotspotInvalidator(invalidate);
    invalidate();
    return () => setHotspotInvalidator(null);
  }, [invalidate]);
  useFrame(({ camera, size }) => projectHotspots(camera, size.width, size.height));
  return null;
}

/** Registra a função de captura do quadro atual (usada para gerar a imagem da cena descrita). */
function CaptureRegistrar() {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    setLabCapture(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => setLabCapture(null);
  }, [gl, scene, camera]);
  return null;
}

// ---------------------------------------------------------------- cena

/** Nível de luz animado na entrada (0,35 → 1). Renderiza só enquanto muda. */
function useLightLevel() {
  const intro = useLab((s) => s.intro);
  const level = useRef(intro === "concluida" ? 1 : 0.35);
  const invalidate = useThree((s) => s.invalidate);
  const target = intro === "pendente" ? 0.35 : 1;
  useFrame((_, dt) => {
    if (Math.abs(level.current - target) > 0.002) {
      level.current += (target - level.current) * Math.min(1, dt * 3.2);
      invalidate();
    }
  });
  return level;
}

function LightsNoite({ shadows, quality }: { shadows: boolean; quality: Quality }) {
  const level = useLightLevel();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = level.current;
    if (hemi.current) hemi.current.intensity = 0.5 * l;
    if (key.current) key.current.intensity = 1.25 * l;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#a9b8ff", "#1b2742", 0.5]} />
      <ambientLight intensity={0.16} color="#c9d2ff" />
      <directionalLight
        ref={key}
        position={[2.5, 6.5, 3.5]}
        intensity={1.25}
        color="#f1f3ff"
        castShadow={shadows}
        shadow-mapSize={[quality === "alta" ? 2048 : 1024, quality === "alta" ? 2048 : 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight position={[-5, 3, 2]} intensity={0.45} color="#7b4de0" />
      <pointLight position={[-3.4, 2.6, -3.2]} intensity={5} distance={6} decay={2} color="#7b4de0" />
      <pointLight position={[1.1, 2.6, -3.2]} intensity={4} distance={5} decay={2} color="#4d7cff" />
      <pointLight position={[5.4, 2.4, -0.9]} intensity={3.5} distance={5} decay={2} color="#e679b5" />
      <pointLight position={[-5.4, 2.2, -0.5]} intensity={3} distance={5} decay={2} color="#4d7cff" />
    </>
  );
}

function Lights({ shadows, quality }: { shadows: boolean; quality: Quality }) {
  const level = useLightLevel();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = level.current;
    if (hemi.current) hemi.current.intensity = 0.42 * l;
    if (key.current) key.current.intensity = 1.35 * l;
    if (fill.current) fill.current.intensity = 0.35 * l;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#f4f6fb", "#7d8496", 0.42]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        ref={key}
        position={[2.5, 6.5, 3.5]}
        intensity={1.35}
        castShadow={shadows}
        shadow-mapSize={[quality === "alta" ? 2048 : 1024, quality === "alta" ? 2048 : 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight ref={fill} position={[-4, 3.5, 2]} intensity={0.35} />
    </>
  );
}

function Scene(props: LabCanvasProps) {
  const thermocyclerOpen = useLab((s) => s.thermocyclerOpen);
  const tubes = useLab((s) => s.tubes);
  const centrifugeOpen = useLab((s) => s.centrifugeOpen);
  const rotorSlots = useLab((s) => s.rotorSlots);
  const spinning = useLab((s) => s.spinning);
  const highlightReagent = useLab((s) => s.highlightReagent);
  const shadows = props.quality !== "baixa";
  const P = OBJECT_POS;
  const posRot: Vec3 = [0, -Math.PI / 2, 0];
  const anaRot: Vec3 = [0, Math.PI / 2, 0];
  const cableFrom = useMemo<Vec3>(() => [P["fonte-eletroforese"][0] - 0.11, BENCH_TOP + 0.075, P["fonte-eletroforese"][2] - 0.06], [P]);

  return (
    <>
      <color attach="background" args={[props.ambiente === "noite" ? "#0b1221" : "#d9dde4"]} />
      {props.ambiente === "noite" && <fog attach="fog" args={["#0b1221", 10, 24]} />}
      {props.ambiente === "noite" ? <LightsNoite shadows={shadows} quality={props.quality} /> : <Lights shadows={shadows} quality={props.quality} />}
      <RoomEnv enabled={props.quality !== "baixa"} />
      <CameraRig instant={props.reducedMotion} />

      <Room projectName={props.projectName} noite={props.ambiente === "noite"} />

      {/* Zona 1 — preparo (pré-PCR) */}
      <Selectable id="micropipetas" ring={0.2} onSelect={props.onSelect}>
        <PipetteStand position={[0, 0, 0]} />
      </Selectable>
      <Selectable id="ponteiras" ring={0.22} onSelect={props.onSelect}>
        <TipBox position={[-0.14, 0, 0]} tip="clear" label="10 µL" />
        <TipBox position={[0, 0, 0]} tip="yellow" label="200 µL" />
        <TipBox position={[0.14, 0, 0]} tip="blue" label="1000 µL" />
      </Selectable>
      <Selectable id="balde-gelo" ring={0.2} onSelect={props.onSelect}>
        <IceBucket position={[0, 0, 0]} highlight={highlightReagent} showStrip={tubes === "gelo"} onPick={(id, part) => props.onSelect(id, part ?? null)} />
      </Selectable>
      <Selectable id="tubo-master-mix" ring={0.1} onSelect={props.onSelect}>
        <MicroTubeRack position={[0, 0, 0]}>
          <MicroTube position={[-0.026, 0.004, 0]} cap="#f4f4f2" />
          <MicroTube position={[0, 0.004, 0]} cap="#f4f4f2" liquid={false} />
        </MicroTubeRack>
      </Selectable>
      <Selectable id="microcentrifuga" ring={0.12} onSelect={props.onSelect}>
        <Microcentrifuge position={[0, 0, 0]} open={centrifugeOpen} slots={tubes === "centrifuga" ? rotorSlots : []} spinning={spinning} paused={props.paused} />
      </Selectable>

      {/* Zona 2 — amplificação */}
      <Selectable id="termociclador" ring={0.26} onSelect={props.onSelect}>
        <Thermocycler position={[0, 0, 0]} open={thermocyclerOpen} tubesInside={tubes === "termociclador"} display={props.thermoDisplay} />
      </Selectable>

      {/* Zona 3 — eletroforese (pós-PCR), bancada na parede direita */}
      <Selectable id="cuba-eletroforese" ring={0.2} rotation={posRot} onSelect={props.onSelect}>
        <GelTank position={[0, 0, 0]} />
      </Selectable>
      <Selectable id="fonte-eletroforese" ring={0.16} rotation={posRot} onSelect={props.onSelect}>
        <PowerSupply position={[0, 0, 0]} />
      </Selectable>
      <Cable from={cableFrom} to={[P["cuba-eletroforese"][0] + 0.06, BENCH_TOP + 0.095, P["cuba-eletroforese"][2] + 0.15]} color="red" />
      <Cable from={[cableFrom[0], cableFrom[1], cableFrom[2] + 0.025]} to={[P["cuba-eletroforese"][0] + 0.06, BENCH_TOP + 0.095, P["cuba-eletroforese"][2] - 0.15]} color="black" />
      <Selectable id="micropipeta-pos" ring={0.12} rotation={posRot} onSelect={props.onSelect}>
        <PipetteStand position={[0, 0, 0]} onlyLast />
        <MicroTubeRack position={[0.13, 0, 0.02]}>
          <MicroTube position={[-0.026, 0.004, 0]} cap="#4a5650" />
        </MicroTubeRack>
      </Selectable>

      {/* Zona 4 — análise */}
      <Selectable id="computador" ring={0.32} rotation={anaRot} position={[P.computador[0], DESK_TOP, P.computador[2]]} onSelect={props.onSelect}>
        <Computer position={[0, 0, 0]} lines={props.computerLines} />
      </Selectable>

      <HotspotProjector />
      <CaptureRegistrar />

      <OrbitControls
        makeDefault
        enabled={props.orbit}
        enableDamping={false}
        minDistance={0.25}
        maxDistance={11}
        maxPolarAngle={Math.PI * 0.49}
        target={VIEWS.geral.target}
      />
    </>
  );
}

export default function LabCanvas(props: LabCanvasProps) {
  const dpr: [number, number] = props.quality === "alta" ? [1, 2] : props.quality === "media" ? [1, 1.5] : [1, 1];
  return (
    <Canvas
      frameloop="demand"
      shadows={props.quality !== "baixa" ? "percentage" : false}
      dpr={dpr}
      camera={{ fov: 50, near: 0.02, far: 60, position: VIEWS.geral.position }}
      gl={{ antialias: props.quality !== "baixa", powerPreference: "high-performance", preserveDrawingBuffer: false, toneMappingExposure: 0.92 }}
      onPointerMissed={() => useLab.getState().select(null)}
    >
      <Scene {...props} />
    </Canvas>
  );
}
