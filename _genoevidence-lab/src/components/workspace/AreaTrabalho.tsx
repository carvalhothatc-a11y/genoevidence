"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OBJETOS } from "@/lib/cena/biblioteca";
import { formatarValor } from "@/lib/experimento/quantidades";
import { dataHora } from "@/lib/datas";
import { restaurarRascunho, useExperimento } from "@/store/experimento";
import { useIdeia } from "@/store/ideia";
import { LabSidebar } from "@/components/studio/LabSidebar";
import { Gaveta } from "@/components/studio/Resultados";
import { Geninho } from "@/components/assistant/Geninho";
import { GeninhoAvatar } from "@/components/assistant/GeninhoAvatar";
import { Plano } from "@/components/ideia/Plano";
import { Avaliacao } from "@/components/ideia/Avaliacao";
import { Comparar } from "@/components/ideia/Comparar";
import { Entrada } from "./Entrada";
import { Materiais } from "./Materiais";
import { Sintese } from "./Sintese";
import { Visualizacao } from "./Visualizacao";
import { ResultadosExp } from "./ResultadosExp";
import { Salvar, type ProjetoOpcao } from "./Salvar";
import { Versoes } from "./Versoes";
import { IC, Icone } from "./ui";

type Aviso = { tom: "ok" | "erro" | "aviso"; texto: string } | null;
const PODE = ["dono", "gestor", "editor"];

/** Síntese do experimento enviada ao Geninho (só com autorização na conversa). */
function contextoGeninho(): string {
  const s = useExperimento.getState();
  const e = s.versoes[s.atual];
  if (!e) return "";
  const etapa = s.cena?.etapas[s.idx];
  const linhas = [
    `Objetivo: ${e.objetivo?.texto ?? "não descrito"}`,
    "Etapas:",
    ...e.acoes.map((a) => {
      const ps = e.parametros.filter((p) => p.acaoId === a.id).map((p) => `${p.nome} ${formatarValor(p.valor, p.unidade)}`);
      return `${a.ordem}. ${a.titulo} — “${a.texto}”${ps.length ? ` [${ps.join("; ")}]` : ""}`;
    }),
    `Elementos: ${e.participantes.map((p) => `${p.rotulo}${p.inferido ? " (representação padrão)" : ""}`).join(", ") || "nenhum"}`,
    ...(e.dados.length ? [`Dados observados: ${e.dados.map((d) => `${d.variavel}${d.unidade ? ` (${d.unidade})` : ""}: ${d.grupos.map((g) => `${g.nome} n=${g.valores.filter((v) => v !== null).length}`).join(", ")}`).join(" | ")}`] : []),
    ...(e.conflitos.length ? [`Conflitos: ${e.conflitos.map((c) => `${c.nome}: ${c.valores.map((v) => formatarValor(v.valor, v.unidade)).join(" vs ")}${c.escolhido !== null ? " (resolvido)" : " (não resolvido)"}`).join("; ")}`] : []),
    `Informações ausentes: ${e.ausentes.map((a) => a.texto).slice(0, 8).join(" | ") || "nenhuma registrada"}`,
    `Fontes: ${e.fontes.map((f) => `${f.titulo} [${f.estado}]`).join("; ") || "nenhuma"}`,
    ...(etapa ? [`Etapa em exibição: ${etapa.ordem}. ${etapa.titulo}`] : []),
    ...(s.selecao ? [`Elemento selecionado: ${OBJETOS[s.selecao].nome}`] : []),
  ];
  return linhas.join("\n").slice(0, 6000);
}

export function AreaTrabalho({
  user,
  projetos,
  geninho,
  abrir,
}: {
  user: { name: string; email: string; role: string };
  projetos: ProjetoOpcao[];
  geninho: { configured: boolean; motivo?: string };
  abrir: { projetoId: string | null; experimentoId: string | null };
}) {
  const s = useExperimento();
  const ideia = useIdeia();
  const [aviso, setAviso] = useState<Aviso>(null);
  const [gaveta, setGaveta] = useState<null | "salvar" | "versoes" | "geninho">(null);
  const [pergunta, setPergunta] = useState<string | undefined>(undefined);
  const [carregando, setCarregando] = useState(Boolean(abrir.experimentoId));
  const gerado = s.versoes.length > 0;
  const projetoAtual = projetos.find((p) => p.id === s.projetoId) ?? null;

  // abrir experimento salvo (?projeto=&experimento=) ou restaurar o rascunho local
  useEffect(() => {
    if (abrir.projetoId && abrir.experimentoId) {
      fetch(`/api/projects/${abrir.projetoId}/experimentos?id=${encodeURIComponent(abrir.experimentoId)}`)
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error ?? "Não foi possível abrir o experimento.");
          useExperimento.getState().carregar(d.experimento, abrir.projetoId!);
          setAviso({ tom: "ok", texto: `“${d.experimento.titulo}” aberto: ${d.experimento.versoes.length} versão(ões) preservada(s).` });
        })
        .catch((e: Error) => setAviso({ tom: "erro", texto: e.message }))
        .finally(() => setCarregando(false));
      return;
    }
    const st = useExperimento.getState();
    if (!st.texto && !st.materiais.length && !st.versoes.length && restaurarRascunho()) setAviso({ tom: "aviso", texto: "Rascunho restaurado deste navegador. Arquivos originais não ficam guardados ao recarregar: reenvie-os se quiser salvá-los no projeto." });
    if (abrir.projetoId && !useExperimento.getState().projetoId) useExperimento.setState({ projetoId: abrir.projetoId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // aviso ao sair com arquivos ainda não salvos
  const arquivosNaoSalvos = s.materiais.filter((m) => m.tipo !== "referencia" && s.arquivos[m.id] && !s.arquivosSalvos[m.id]).length;
  useEffect(() => {
    if (!arquivosNaoSalvos) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [arquivosNaoSalvos]);

  const criar = useCallback(() => {
    setAviso(null);
    const r = useExperimento.getState().criar();
    if (!r) return setAviso({ tom: "aviso", texto: "Nada para visualizar ainda: descreva o que é feito ou adicione um material com conteúdo." });
    const exp = useExperimento.getState().versoes.at(-1);
    if (exp && !exp.acoes.length) setAviso({ tom: "aviso", texto: "Nenhuma ação foi reconhecida. Os dados e fontes foram organizados; descreva o que é feito (verbo da ação) para gerar a cena." });
    else if (r.mudancas.length) setAviso({ tom: "ok", texto: `Versão ${r.versao} criada. A anterior foi preservada.` });
  }, []);

  const perguntar = (q: string) => {
    setPergunta(q);
    setGaveta("geninho");
  };

  const avaliarPcr = (texto: string) => {
    const st = useIdeia.getState();
    st.setTexto(texto.slice(0, 8000), "texto");
    if (s.projetoId) st.setProjeto(s.projetoId);
    st.interpretar();
  };
  const gavetaIdeia = ideia.passo === "conferir" ? "plano" : ideia.passo === "avaliar" ? "avaliacao" : ideia.passo === "comparar" ? "comparar" : null;
  const fecharIdeia = () => useIdeia.getState().setPasso(ideia.cenarios.length ? "visualizar" : "descrever");

  const estadoSalvo = useMemo(() => {
    if (s.salvoEm && !s.alterado) return projetoAtual ? `Salvo em “${projetoAtual.title}” · ${dataHora(s.salvoEm)}` : `Salvo · ${dataHora(s.salvoEm)}`;
    if (s.salvoEm && s.alterado) return "Alterações não salvas";
    return gerado || s.texto || s.materiais.length ? "Rascunho neste navegador (ainda não salvo)" : "";
  }, [s.salvoEm, s.alterado, projetoAtual, gerado, s.texto, s.materiais.length]);

  return (
    <div className="ge-dark fixed inset-0 z-30 flex flex-col bg-[#060a13] lg:flex-row">
      <LabSidebar user={user} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* barra superior */}
        <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor="titulo-exp" className="sr-only">
              Nome do experimento
            </label>
            <input id="titulo-exp" value={s.titulo} onChange={(e) => s.setTitulo(e.target.value)} placeholder={gerado ? "Experimento sem nome" : "Novo experimento"} className="min-w-0 max-w-[420px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[17px] font-semibold text-white placeholder:text-[#7d8aa3] hover:border-white/10 focus:border-[#b49cf5] focus:outline-none" />
            {estadoSalvo && (
              <span className="hidden truncate text-[12px] text-[#a7b2c8] md:inline" data-testid="estado-salvo">
                {estadoSalvo}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {gerado && (
              <button type="button" onClick={() => setGaveta("versoes")} className="ge-press inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-[#c9d2e3] hover:bg-white/10 hover:text-white">
                <Icone d={IC.versoes} size={15} />
                Versões <span className="ge-mono text-[11px]">{s.versoes.length}</span>
              </button>
            )}
            <button type="button" onClick={() => setGaveta("salvar")} disabled={!gerado} className="ge-press inline-flex items-center gap-1.5 rounded-full bg-action px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40" title={gerado ? "Salvar num projeto" : "Crie a visualização para salvar"}>
              <Icone d={IC.salvar} size={15} />
              Salvar
            </button>
            <button type="button" onClick={() => (setPergunta(undefined), setGaveta("geninho"))} className="ge-press flex items-center gap-2 rounded-full border border-white/15 py-0.5 pl-0.5 pr-3 text-[13px] font-semibold text-white hover:border-[#e679b5]/60">
              <GeninhoAvatar size={28} />
              Geninho
            </button>
            {(gerado || s.texto || s.materiais.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (arquivosNaoSalvos && !window.confirm("Há arquivos ainda não salvos num projeto. Começar um novo experimento mesmo assim?")) return;
                  useExperimento.getState().novo();
                  setAviso(null);
                  window.history.replaceState(null, "", "/laboratorio");
                }}
                className="ge-press rounded-full px-3 py-1.5 text-[13px] text-[#c9d2e3] hover:bg-white/10"
              >
                Novo
              </button>
            )}
          </div>
        </header>

        <main id="area-trabalho" className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <div className={`grid gap-3 p-3 sm:p-4 lg:h-full ${gerado ? "lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(380px,1fr)_minmax(0,1fr)]"}`}>
            {/* informações e arquivos */}
            <div className="grid min-h-0 content-start gap-3 lg:overflow-y-auto lg:pr-1" aria-label="Descrição e materiais">
              {aviso && (
                <p role={aviso.tom === "erro" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-[13px] ${aviso.tom === "erro" ? "border-[#ff5470]/50 bg-[#ff5470]/10 text-[#ffb3c0]" : aviso.tom === "aviso" ? "border-[#ffb23f]/50 bg-[#ffb23f]/10 text-[#ffd08a]" : "border-[#3ccf8e]/40 bg-[#3ccf8e]/10 text-[#8de8bf]"}`}>
                  {aviso.texto}
                </p>
              )}
              {carregando && <p role="status" className="text-[13px] text-[#a7b2c8]">Abrindo o experimento salvo…</p>}
              <Entrada compacta={gerado} onCriar={criar} onAviso={setAviso} />
              <Materiais />
              {s.pendente && gerado && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#7b4de0]/50 bg-[#1b1440]/95 px-3 py-2 text-[13px] text-white backdrop-blur" data-testid="correcoes-pendentes">
                  Você corrigiu a síntese.
                  <button type="button" onClick={criar} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold">
                    Atualizar visualização
                  </button>
                </div>
              )}
              <Sintese />
              {!gerado && (
                <p className="px-1 text-[12px] text-[#7d8aa3]">
                  Prefere explorar uma técnica completa? Veja as <Link href="/modulos" className="underline">técnicas educativas</Link> ou a <Link href="/laboratorio/bancada" className="underline">bancada 3D</Link>.
                </p>
              )}
            </div>

            {/* visualização */}
            <div className="grid min-h-0 content-start gap-3 lg:overflow-y-auto lg:pl-1" aria-label="Visualização do experimento">
              <div className={gerado ? "h-[min(72vh,640px)] min-h-[420px]" : "min-h-[320px] lg:h-full"}>
                <Visualizacao onPerguntar={perguntar} />
              </div>
              {gerado && <ResultadosExp onAvaliarPcr={avaliarPcr} />}
              {gerado && ideia.cenarios.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => ideia.setPasso("avaliar")} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
                    Avaliação completa da PCR
                  </button>
                  <button type="button" onClick={() => ideia.setPasso("comparar")} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white hover:bg-white/10">
                    Comparar cenários da PCR
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Gaveta aberta={gaveta === "salvar"} titulo="Salvar o experimento" onFechar={() => setGaveta(null)} id="gaveta-salvar">
        <Salvar projetos={projetos} onFeito={(msg) => (setGaveta(null), setAviso({ tom: "ok", texto: msg }))} />
      </Gaveta>
      <Gaveta aberta={gaveta === "versoes"} titulo="Versões e comparação" onFechar={() => setGaveta(null)} id="gaveta-versoes">
        <Versoes onVer={() => setGaveta(null)} />
      </Gaveta>
      <Gaveta aberta={gaveta === "geninho"} titulo="Geninho" onFechar={() => setGaveta(null)} id="gaveta-geninho">
        <Geninho
          configured={geninho.configured}
          isAdmin={user.role === "admin"}
          motivo={geninho.motivo}
          contexto={gerado ? contextoGeninho() : undefined}
          pergunta={pergunta}
          sugestoes={gerado ? ["Explique a etapa em exibição.", "Que informações estão faltando e por que importam?", "Quais são as incertezas deste procedimento?"] : undefined}
        />
      </Gaveta>
      <Gaveta aberta={gavetaIdeia === "plano"} titulo="Conferir os parâmetros da PCR" onFechar={() => ideia.setPasso("descrever")} id="gaveta-plano">
        <Plano />
      </Gaveta>
      <Gaveta aberta={gavetaIdeia === "avaliacao"} titulo="Avaliação fundamentada e previsões" onFechar={fecharIdeia} id="gaveta-avaliacao">
        <Avaliacao podeEditar={Boolean(projetoAtual && PODE.includes(projetoAtual.role))} />
      </Gaveta>
      <Gaveta aberta={gavetaIdeia === "comparar"} titulo="Comparar cenários da PCR" onFechar={fecharIdeia} id="gaveta-comparar">
        <Comparar />
      </Gaveta>
    </div>
  );
}
