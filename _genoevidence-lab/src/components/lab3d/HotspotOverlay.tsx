"use client";
import { getLabObject, ZONES, type ZoneId } from "@/lib/lab/objects";
import { ZONE_OF_OBJECT } from "@/lib/lab/layout";
import { useLab } from "@/store/lab";
import { hotspotPosition, objectsOfZone, registerHotspot, ZONE_ANCHOR } from "./hotspots";

const ZONE_IDS: ZoneId[] = ["pre", "amp", "pos", "analise"];

/**
 * Pontos de interesse como botões DOM sobre o canvas (navegáveis por teclado e leitores de tela).
 * Na visão geral mostra as zonas; dentro de uma zona, os equipamentos daquela zona.
 */
export function HotspotOverlay({ onSelect, emphasize }: { onSelect: (id: string) => void; emphasize?: string[] }) {
  const view = useLab((s) => s.view);
  const selected = useLab((s) => s.selected);
  const setView = useLab((s) => s.setView);
  const zone: ZoneId | null = ZONE_IDS.find((z) => z === view) ?? ZONE_OF_OBJECT[view] ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Pontos de interesse">
      {!zone
        ? ZONE_IDS.map((z, i) => (
            <button
              key={`z-${z}`}
              ref={(el) => registerHotspot(`z-${z}`, el, ZONE_ANCHOR[z])}
              type="button"
              style={{ visibility: "hidden", animationDelay: `${120 + i * 90}ms` }}
              className="lab-hotspot lab-hotspot-zone pointer-events-auto absolute left-0 top-0"
              onClick={() => setView(z)}
              aria-label={`Ir para ${ZONES[z].label}`}
            >
              <span className="ge-mono text-[10px] opacity-70">0{i + 1}</span> {ZONES[z].short}
            </button>
          ))
        : objectsOfZone(zone, view).map((id, i) => {
            const obj = getLabObject(id);
            if (!obj) return null;
            const dim = emphasize && !emphasize.includes(id);
            return (
              <button
                key={`o-${id}`}
                ref={(el) => registerHotspot(`o-${id}`, el, hotspotPosition(id))}
                type="button"
                style={{ visibility: "hidden", animationDelay: `${i * 60}ms` }}
                className={`lab-hotspot pointer-events-auto absolute left-0 top-0 ${selected === id ? "is-selected" : ""} ${dim ? "is-dim" : ""}`}
                onClick={() => onSelect(id)}
                aria-pressed={selected === id}
              >
                {obj.name.split(" (")[0]}
              </button>
            );
          })}
    </div>
  );
}
