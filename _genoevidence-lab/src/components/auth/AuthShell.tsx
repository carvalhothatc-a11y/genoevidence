import Image from "next/image";
import type { ReactNode } from "react";

const SEQS = ["ATGGCCTAC", "TGGCCCTAA", "GCTTTAGGCTAA", "GCCATGGCTAA", "TGGCCCTAA", "ATGGCCTAC", "TGGCCCTAA", "CGTACGATCG", "GGATCCAAGCTT", "ATGAAACGCATT"];

/** Painel de console escuro com o motivo de sequências da marca (decorativo, oculto de leitores de tela). */
export function AuthShell({ children, title, accent, lead }: { children: ReactNode; title: string; accent: string; lead: string }) {
  return (
    <div className="grid min-h-[calc(100dvh-56px)] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-panel text-white lg:block" aria-hidden="true">
        <div className="ge-seq-field absolute inset-0">
          {Array.from({ length: 18 }, (_, r) => (
            <p key={r} className="ge-mono whitespace-nowrap text-[13px] tracking-[0.2em]" style={{ opacity: 0.05 + ((r * 37) % 9) / 90, transform: `translateX(${-((r * 53) % 120)}px)` }}>
              {Array.from({ length: 8 }, (_, k) => SEQS[(r + k) % SEQS.length]).join("   ")}
            </p>
          ))}
        </div>
        <div className="absolute -bottom-40 -left-24 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #7b4de0 0%, transparent 65%)" }} />
        <div className="absolute -right-32 top-10 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #e0385a 0%, transparent 65%)" }} />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Image src="/brand/geno-evidence-simbolo-192.png" alt="" width={44} height={44} />
            <span className="ge-mono text-sm text-panel-muted">GenoLab</span>
          </div>
          <div className="max-w-md">
            <p className="ge-mono mb-4 text-xs text-[#ff8aa4]">▪ a ciência por trás das evidências</p>
            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white">
              Planeje, execute e registre experimentos <span className="ge-gradient-text">antes da bancada real</span>.
            </h2>
            <ul className="mt-8 grid gap-3 text-sm text-panel-muted">
              <li className="flex gap-3">
                <span className="ge-mono text-[#8fa6ff]">01</span> Formulário de experimento com validação por campo
              </li>
              <li className="flex gap-3">
                <span className="ge-mono text-[#8fa6ff]">02</span> Bancada 3D, processo molecular e resultados sincronizados
              </li>
              <li className="flex gap-3">
                <span className="ge-mono text-[#8fa6ff]">03</span> Fontes por seção, dados privados e histórico de alterações
              </li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 rounded-full border border-panel-line bg-panel-2/70 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3ccf8e]" />
              <span className="ge-mono text-[11px] text-panel-muted">armazenamento local · projetos privados</span>
            </span>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <p className="ge-eyebrow mb-2">acesso</p>
          <h1 className="ge-display text-4xl">
            {title} <span className="ge-gradient-text">{accent}</span>
          </h1>
          <p className="mt-2 text-body">{lead}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
