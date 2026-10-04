import Image from "next/image";
import type { ReactNode } from "react";

const SEQS = ["ATGGCCTAC", "TGGCCCTAA", "GCTTTAGGCTAA", "GCCATGGCTAA", "TGGCCCTAA", "ATGGCCTAC", "TGGCCCTAA", "CGTACGATCG", "GGATCCAAGCTT", "ATGAAACGCATT"];

/** Painel de console escuro com o motivo de sequências da marca (decorativo, oculto de leitores de tela). */
export function AuthShell({ children, title, accent, lead }: { children: ReactNode; title: string; accent: string; lead: string }) {
  return (
    <div className="grid min-h-[calc(100dvh-56px)] lg:min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-panel text-white lg:block">
        <div className="ge-seq-field absolute inset-0" aria-hidden="true">
          {Array.from({ length: 18 }, (_, r) => (
            <p key={r} className="ge-mono whitespace-nowrap text-[13px] tracking-[0.2em]" style={{ opacity: 0.05 + ((r * 37) % 9) / 90, transform: `translateX(${-((r * 53) % 120)}px)` }}>
              {Array.from({ length: 8 }, (_, k) => SEQS[(r + k) % SEQS.length]).join("   ")}
            </p>
          ))}
        </div>
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #7b4de0 0%, transparent 65%)" }} />
        <div aria-hidden="true" className="absolute -right-32 top-10 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #e0385a 0%, transparent 65%)" }} />
        {/* véu para o texto se destacar das sequências ao fundo */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_55%_at_30%_58%,rgba(6,10,19,0.88),rgba(6,10,19,0.35)_70%,transparent)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3" aria-hidden="true">
            <Image src="/brand/geno-evidence-simbolo-192.png" alt="" width={44} height={44} />
            <span className="ge-mono text-sm text-panel-muted">GenoLab</span>
          </div>
          <div className="max-w-lg">
            <p className="ge-mono mb-4 text-xs text-[#ff8aa4]">▪ a ciência por trás das evidências</p>
            {/* cor explícita: a regra global de títulos (h1–h4 com var(--ink)) não pode escurecer este texto */}
            <h2 className="text-[44px] font-extrabold leading-[1.04] tracking-tight [text-shadow:0_2px_24px_rgba(6,10,19,0.9)] xl:text-[52px]" style={{ color: "#ffffff" }}>
              Planeje, execute e registre experimentos <span className="ge-gradient-text-claro [text-shadow:none]">antes da bancada real</span>.
            </h2>
            <ul className="mt-8 grid gap-3 text-[15px] text-[#c9d2e3]" aria-hidden="true">
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
          <p className="mb-6 text-[22px] font-extrabold leading-tight tracking-tight lg:hidden" style={{ color: "#ffffff" }}>
            Planeje, execute e registre experimentos <span className="ge-gradient-text-claro">antes da bancada real</span>.
          </p>
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
