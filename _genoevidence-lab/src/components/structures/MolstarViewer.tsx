"use client";
import { useEffect, useRef, useState } from "react";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import type { Expression } from "molstar/lib/mol-script/language/expression";
import { Script } from "molstar/lib/mol-script/script";
import { StructureSelection } from "molstar/lib/mol-model/structure";
import { Color } from "molstar/lib/mol-util/color";
import { setSubtreeVisibility } from "molstar/lib/mol-plugin/behavior/static/state";

export type ResidueRef = { chain: string; residueNumber: number; insertionCode?: string };

export type ViewerCommand =
  | { type: "reset" }
  | { type: "focusChain"; chain: string }
  | { type: "focusResidue"; residue: ResidueRef }
  | { type: "isolate"; chain: string | null };

const BRAND_BLUE = Color(0x2f5bea);
const BACKGROUND = Color(0x0b1221);

function chainExpr(chain: string): Expression {
  return MS.struct.generator.atomGroups({ "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]) });
}
function residueExpr(r: ResidueRef): Expression {
  const tests: Expression[] = [MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), r.residueNumber])];
  if (r.insertionCode) tests.push(MS.core.rel.eq([MS.struct.atomProperty.macromolecular.pdbx_PDB_ins_code(), r.insertionCode]));
  return MS.struct.generator.atomGroups({
    "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), r.chain]),
    "residue-test": tests.length > 1 ? MS.core.logic.and(tests) : tests[0],
  });
}

/**
 * Visualizador Mol* sem a interface padrão (controles próprios e acessíveis).
 * Carrega o arquivo ORIGINAL do projeto; destaques são apenas visuais.
 */
export default function MolstarViewer({
  url,
  format,
  highlights,
  command,
  reducedMotion,
  onStatus,
}: {
  url: string;
  format: "pdb" | "mmcif";
  highlights: ResidueRef[];
  command: (ViewerCommand & { nonce: number }) | null;
  reducedMotion: boolean;
  onStatus: (s: { state: "carregando" | "pronto" | "erro"; message?: string }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const plugin = useRef<PluginContext | null>(null);
  const isolatedRef = useRef<string | null>(null);
  const highlightRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Inicialização e carga do arquivo
  useEffect(() => {
    let disposed = false;
    const p = new PluginContext(DefaultPluginSpec());
    plugin.current = p;
    (async () => {
      try {
        onStatus({ state: "carregando" });
        await p.init();
        const ok = await p.initViewerAsync(canvas.current!, container.current!);
        if (!ok) throw new Error("WebGL indisponível para o visualizador molecular.");
        p.canvas3d?.setProps({ renderer: { backgroundColor: BACKGROUND } });
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Não foi possível ler o arquivo (${res.status}).`);
        const text = await res.text();
        if (disposed) return;
        const data = await p.builders.data.rawData({ data: text, label: "estrutura" });
        const traj = await p.builders.structure.parseTrajectory(data, format === "pdb" ? "pdb" : "mmcif");
        await p.builders.structure.hierarchy.applyPreset(traj, "default");
        if (disposed) return;
        setReady(true);
        onStatus({ state: "pronto" });
      } catch (err) {
        if (!disposed) onStatus({ state: "erro", message: (err as Error).message });
      }
    })();
    return () => {
      disposed = true;
      plugin.current = null;
      p.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, format]);

  const structure = () => plugin.current?.managers.structure.hierarchy.current.structures[0];

  // Destaques de resíduos (bolas e bastões no azul da marca)
  useEffect(() => {
    const p = plugin.current;
    const st = structure();
    if (!p || !ready || !st) return;
    (async () => {
      if (highlightRef.current) {
        await p.build().delete(highlightRef.current).commit();
        highlightRef.current = null;
      }
      if (!highlights.length) return;
      const expr = highlights.length === 1 ? residueExpr(highlights[0]) : MS.struct.combinator.merge(highlights.map(residueExpr));
      const comp = await p.builders.structure.tryCreateComponentFromExpression(st.cell, expr, `destaques-${Date.now()}`, { label: "Resíduos destacados" });
      if (comp) {
        await p.builders.structure.representation.addRepresentation(comp, { type: "ball-and-stick", color: "uniform", colorParams: { value: BRAND_BLUE } });
        highlightRef.current = comp.ref;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(highlights)]);

  // Comandos de câmera, foco e isolamento
  useEffect(() => {
    const p = plugin.current;
    const st = structure();
    if (!p || !ready || !st || !command) return;
    const duration = reducedMotion ? 0 : 450;
    const data = st.cell.obj?.data;
    (async () => {
      if (command.type === "reset") {
        p.managers.camera.reset(undefined, duration);
        return;
      }
      if (command.type === "isolate") {
        const others = st.components.filter((c) => c.cell.transform.ref !== isolatedRef.current && c.cell.transform.ref !== highlightRef.current);
        if (isolatedRef.current) {
          await p.build().delete(isolatedRef.current).commit();
          isolatedRef.current = null;
        }
        for (const c of others) setSubtreeVisibility(p.state.data, c.cell.transform.ref, Boolean(command.chain));
        if (command.chain) {
          const comp = await p.builders.structure.tryCreateComponentFromExpression(st.cell, chainExpr(command.chain), `isolada-${Date.now()}`, { label: `Cadeia ${command.chain}` });
          if (comp) {
            await p.builders.structure.representation.addRepresentation(comp, { type: "cartoon" });
            isolatedRef.current = comp.ref;
          }
          if (data) {
            const loci = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(chainExpr(command.chain), data));
            p.managers.camera.focusLoci(loci, { durationMs: duration });
          }
        } else p.managers.camera.reset(undefined, duration);
        return;
      }
      if (!data) return;
      const expr = command.type === "focusChain" ? chainExpr(command.chain) : residueExpr(command.residue);
      const loci = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(expr, data));
      p.managers.interactivity.lociHighlights.highlightOnly({ loci });
      p.managers.camera.focusLoci(loci, { durationMs: duration });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.nonce, ready]);

  return (
    <div ref={container} className="absolute inset-0">
      <canvas ref={canvas} className="h-full w-full" aria-label="Visualização 3D da estrutura (Mol*). Use os controles e a tabela de cadeias ao lado." />
    </div>
  );
}
