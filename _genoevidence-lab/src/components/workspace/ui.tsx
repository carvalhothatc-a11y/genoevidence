"use client";
import type { ReactNode } from "react";
import type { EstadoFonte, Origem, TipoOrigem } from "@/lib/experimento/schema";

export const ORIGEM_NOME: Record<TipoOrigem, string> = {
  texto: "texto",
  voz: "áudio",
  imagem: "foto",
  relatorio: "relatório",
  tabela: "tabela",
  referencia: "referência",
  biblioteca: "representação padrão",
  ia: "sugestão da IA",
  usuario: "corrigido por você",
};

const ORIGEM_COR: Record<TipoOrigem, string> = {
  texto: "border-[#7d9dff]/40 text-[#b9c9ff]",
  voz: "border-[#7d9dff]/40 text-[#b9c9ff]",
  imagem: "border-[#3ccf8e]/40 text-[#8de8bf]",
  relatorio: "border-[#b49cf5]/45 text-[#cdbcff]",
  tabela: "border-[#ffb23f]/45 text-[#ffd08a]",
  referencia: "border-[#e679b5]/45 text-[#f3a9d1]",
  biblioteca: "border-white/20 text-[#a7b2c8]",
  ia: "border-[#e679b5]/45 text-[#f3a9d1]",
  usuario: "border-white/30 text-white",
};

/** Etiqueta de origem: de qual material veio a informação (o trecho aparece ao passar o mouse). */
export function OrigemChip({ o, nomeMaterial }: { o: Origem; nomeMaterial?: string }) {
  const titulo = [nomeMaterial, o.local, o.trecho ? `“${o.trecho}”` : null].filter(Boolean).join(" · ");
  return (
    <span title={titulo || undefined} className={`inline-flex shrink-0 items-center rounded-full border bg-black/20 px-1.5 py-px text-[10px] font-semibold ${ORIGEM_COR[o.tipo]}`}>
      {ORIGEM_NOME[o.tipo]}
      {nomeMaterial ? <span className="ml-1 max-w-[110px] truncate font-normal opacity-80">{nomeMaterial}</span> : null}
    </span>
  );
}

export const ESTADO_FONTE: Record<EstadoFonte, { rotulo: string; cls: string; dica: string }> = {
  enviado: { rotulo: "arquivo enviado", cls: "border-white/25 text-[#c9d2e3]", dica: "O arquivo está aqui, mas o conteúdo ainda não foi usado." },
  analisado: { rotulo: "documento analisado", cls: "border-[#3ccf8e]/45 text-[#8de8bf]", dica: "O conteúdo foi extraído e usado na interpretação." },
  cadastrada: { rotulo: "referência cadastrada", cls: "border-[#e679b5]/45 text-[#f3a9d1]", dica: "Registrada, mas o conteúdo não foi lido." },
  indisponivel: { rotulo: "conteúdo não obtido", cls: "border-[#ffb23f]/50 text-[#ffd08a]", dica: "Não foi possível extrair o conteúdo deste arquivo." },
  catalogo: { rotulo: "catálogo verificado", cls: "border-[#7d9dff]/40 text-[#b9c9ff]", dica: "Fonte do catálogo do GenoLab, conferida no PubMed." },
};

export function EstadoFonteBadge({ estado }: { estado: EstadoFonte }) {
  const e = ESTADO_FONTE[estado];
  return (
    <span title={e.dica} className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold ${e.cls}`}>
      {e.rotulo}
    </span>
  );
}

export function Secao({ id, titulo, contagem, children, aberta = true, acao }: { id: string; titulo: string; contagem?: number | string; children: ReactNode; aberta?: boolean; acao?: ReactNode }) {
  return (
    <details open={aberta} className="group rounded-xl border border-white/10 bg-white/[0.025]" data-secao={id}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[13px] font-semibold text-white [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#7d8aa3] transition-transform group-open:rotate-90">›</span>
          {titulo}
          {contagem !== undefined && <span className="ge-mono rounded-full bg-white/10 px-1.5 text-[10px] font-normal text-[#c9d2e3]">{contagem}</span>}
        </span>
        {acao}
      </summary>
      <div className="grid gap-2 px-3 pb-3 text-[13px] text-[#c9d2e3]">{children}</div>
    </details>
  );
}

export function Icone({ d, size = 18, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

export const IC = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  imagem: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01",
  tabela: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  relatorio: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  referencia: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
  play: "M8 5v14l11-7z",
  pausa: "M8 5v14M16 5v14",
  reiniciar: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  mais: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  visao: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  fechar: "M6 6l12 12M18 6L6 18",
  lixo: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
  salvar: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  versoes: "M12 8v4l3 2M4 12a8 8 0 1 0 8-8",
  comparar: "M8 4v16M16 4v16M4 8h4M16 16h4",
  faisca: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
};
