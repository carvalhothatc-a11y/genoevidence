"use client";
import { useEffect, useState } from "react";
import type { MolecularPhase } from "@/lib/modules/contract";
import type { CyclingProgram } from "@/lib/models/pcr";

export type TickerState = { cycle: number; phase: MolecularPhase; tempC: number; label: string };

const PHASES: { phase: MolecularPhase; key: "denaturation" | "annealing" | "extension"; label: string }[] = [
  { phase: "desnaturacao", key: "denaturation", label: "Desnaturação" },
  { phase: "anelamento", key: "annealing", label: "Anelamento" },
  { phase: "extensao", key: "extension", label: "Extensão" },
];

/**
 * Avança as fases do programa em ritmo DIDÁTICO (1,6 s por fase), não em tempo real.
 * Pausa quando as animações estão pausadas. Sincroniza termociclador e escala molecular.
 */
export function useProgramTicker(running: boolean, paused: boolean, program: CyclingProgram, stepMs = 1600): TickerState {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!running) setI(0);
  }, [running]);
  useEffect(() => {
    if (!running || paused) return;
    const total = program.cycles * 3;
    const t = setInterval(() => setI((x) => (x + 1 >= total ? x : x + 1)), stepMs);
    return () => clearInterval(t);
  }, [running, paused, program.cycles, stepMs]);
  const cycle = Math.floor(i / 3) + 1;
  const p = PHASES[i % 3];
  return { cycle, phase: p.phase, tempC: program[p.key].tempC, label: p.label };
}
