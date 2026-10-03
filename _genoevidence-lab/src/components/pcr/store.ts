"use client";
import { create } from "zustand";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import { DEFAULT_PROGRAM, type CyclingProgram, type Polymerase } from "@/lib/models/pcr";

export type Scale = "bancada" | "molecular" | "resultados";
export type LaneContent = "vazio" | "marcador" | "amostra" | "ntc" | "positivo";
export type TubeContent = "vazio" | "amostra" | "ntc" | "positivo";

export type Choice = { at: string; stepId: string; parameterId: string; value: string; label: string };

type PcrState = {
  mode: "guiado" | "exploratorio";
  stepId: string;
  scale: Scale;
  visited: string[];
  choices: Choice[];
  questions: { at: string; stepId: string; text: string }[];
  /** Opção escolhida em cada parâmetro exploratório. */
  params: Record<string, string>;
  program: CyclingProgram;
  tmC: number | null;
  ampliconBp: number | null;
  polymerase: Polymerase;
  N0: number;
  efficiency: number;
  reagentsAdded: string[];
  tubes: TubeContent[];
  lanes: LaneContent[];
  primaryReferenceId: string | null;
  scenarios: { name: string; params: Record<string, string> }[];
  startedAt: string;
  setMode: (m: PcrState["mode"]) => void;
  goTo: (stepId: string) => void;
  next: () => void;
  prev: () => void;
  setScale: (s: Scale) => void;
  choose: (stepId: string, parameterId: string, value: string, label: string) => void;
  addQuestion: (text: string) => void;
  removeQuestion: (i: number) => void;
  setProgram: (p: CyclingProgram) => void;
  setInputs: (p: Partial<Pick<PcrState, "tmC" | "ampliconBp" | "polymerase" | "N0" | "efficiency">>) => void;
  addReagent: (id: string) => void;
  resetReagents: () => void;
  setTube: (i: number, c: TubeContent) => void;
  setLane: (i: number, c: LaneContent) => void;
  setPrimaryReference: (id: string | null) => void;
  saveScenario: (name: string) => void;
  clearScenarios: () => void;
  load: (s: Partial<PcrState>) => void;
};

const now = () => new Date().toISOString();
const order = PCR_MODULE.steps.map((s) => s.id);

export const usePcr = create<PcrState>((set, get) => ({
  mode: "guiado",
  stepId: order[0],
  scale: "bancada",
  visited: [order[0]],
  choices: [],
  questions: [],
  params: Object.fromEntries(PCR_MODULE.parameters.map((p) => [p.id, p.defaultValue])),
  program: DEFAULT_PROGRAM,
  tmC: null,
  ampliconBp: null,
  polymerase: "taq",
  N0: 1000,
  efficiency: 1,
  reagentsAdded: [],
  tubes: ["amostra", "amostra", "ntc", "positivo", "vazio", "vazio", "vazio", "vazio"],
  lanes: ["marcador", "amostra", "amostra", "ntc", "positivo", "vazio", "vazio", "vazio"],
  primaryReferenceId: null,
  scenarios: [],
  startedAt: now(),
  setMode: (mode) => set({ mode }),
  goTo: (stepId) => set((s) => ({ stepId, visited: s.visited.includes(stepId) ? s.visited : [...s.visited, stepId] })),
  next: () => {
    const i = order.indexOf(get().stepId);
    if (i < order.length - 1) get().goTo(order[i + 1]);
  },
  prev: () => {
    const i = order.indexOf(get().stepId);
    if (i > 0) get().goTo(order[i - 1]);
  },
  setScale: (scale) => set({ scale }),
  choose: (stepId, parameterId, value, label) =>
    set((s) => ({ params: { ...s.params, [parameterId]: value }, choices: [...s.choices, { at: now(), stepId, parameterId, value, label }] })),
  addQuestion: (text) => set((s) => ({ questions: [...s.questions, { at: now(), stepId: s.stepId, text }] })),
  removeQuestion: (i) => set((s) => ({ questions: s.questions.filter((_, k) => k !== i) })),
  setProgram: (program) => set({ program }),
  setInputs: (p) => set(p),
  addReagent: (id) => set((s) => ({ reagentsAdded: s.reagentsAdded.includes(id) ? s.reagentsAdded : [...s.reagentsAdded, id] })),
  resetReagents: () => set({ reagentsAdded: [] }),
  setTube: (i, c) => set((s) => ({ tubes: s.tubes.map((t, k) => (k === i ? c : t)) })),
  setLane: (i, c) => set((s) => ({ lanes: s.lanes.map((t, k) => (k === i ? c : t)) })),
  setPrimaryReference: (primaryReferenceId) => set({ primaryReferenceId }),
  saveScenario: (name) => set((s) => ({ scenarios: [...s.scenarios.slice(-2), { name, params: { ...s.params } }] })),
  clearScenarios: () => set({ scenarios: [] }),
  load: (s) => set(s),
}));

export const STEP_ORDER = order;
