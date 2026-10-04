"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useExperimento, entradaDe } from "@/store/experimento";

export type ProjetoOpcao = { id: string; title: string; role: string };
const PODE = ["dono", "gestor", "editor"];

export function tituloSugerido(): string {
  const s = useExperimento.getState();
  const exp = s.versoes[s.atual];
  const base = s.titulo || exp?.objetivo?.texto || s.texto.split(/[.\n]/)[0] || "Experimento";
  return base.trim().slice(0, 80) || "Experimento";
}

/** Salvar o rascunho num projeto (novo ou existente): arquivos originais + todas as versões. */
export function Salvar({ projetos, onFeito }: { projetos: ProjetoOpcao[]; onFeito: (msg: string) => void }) {
  const router = useRouter();
  const s = useExperimento();
  const editaveis = projetos.filter((p) => PODE.includes(p.role));
  const atual = editaveis.find((p) => p.id === s.projetoId);
  const [modo, setModo] = useState<"existente" | "novo">(atual || editaveis.length ? "existente" : "novo");
  const [projetoId, setProjetoId] = useState(atual?.id ?? editaveis[0]?.id ?? "");
  const [nomeProjeto, setNomeProjeto] = useState(tituloSugerido());
  const [titulo, setTitulo] = useState(s.titulo || tituloSugerido());
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const pendentes = s.materiais.filter((m) => m.tipo !== "referencia" && s.arquivos[m.id] && !s.arquivosSalvos[m.id]);
  const semOriginal = s.materiais.filter((m) => m.tipo !== "referencia" && !s.arquivos[m.id] && !s.arquivosSalvos[m.id]);

  const salvar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      let pid = projetoId;
      if (modo === "novo") {
        setEstado("Criando o projeto…");
        const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: nomeProjeto.trim(), objective: useExperimento.getState().versoes.at(-1)?.objetivo?.texto ?? "", description: "Criado na área de trabalho do GenoLab." }) });
        const d = (await r.json().catch(() => ({}))) as { project?: { id: string }; error?: string };
        if (!r.ok || !d.project) throw new Error(d.error ?? "Não foi possível criar o projeto.");
        pid = d.project.id;
      }
      if (!pid) throw new Error("Escolha um projeto.");
      const arquivos: Record<string, string> = {};
      for (const [i, m] of pendentes.entries()) {
        setEstado(`Enviando arquivo ${i + 1} de ${pendentes.length}: ${m.tipo === "referencia" ? "" : m.nome}`);
        const fd = new FormData();
        fd.append("file", s.arquivos[m.id]);
        fd.append("role", `material:${m.tipo}`);
        const r = await fetch(`/api/projects/${pid}/files`, { method: "POST", body: fd });
        const d = (await r.json().catch(() => ({}))) as { file?: { id: string }; error?: string };
        if (!r.ok || !d.file) throw new Error(`${m.tipo === "referencia" ? "" : m.nome}: ${d.error ?? "falha no envio"}`);
        arquivos[m.id] = d.file.id;
      }
      setEstado("Salvando o experimento e as versões…");
      const st = useExperimento.getState();
      const todos = { ...st.arquivosSalvos, ...arquivos };
      const entrada = entradaDe(st);
      entrada.materiais = entrada.materiais.map((m) => (m.tipo !== "referencia" && todos[m.id] ? { ...m, arquivoId: todos[m.id] } : m));
      const r = await fetch(`/api/projects/${pid}/experimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: st.rascunhoId, titulo: titulo.trim() || "Experimento", entrada, correcoes: st.correcoes, versoes: st.versoes, arquivos: todos }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Não foi possível salvar o experimento.");
      st.setTitulo(titulo.trim());
      st.marcarSalvo(pid, arquivos, new Date().toISOString());
      router.replace(`/laboratorio?projeto=${pid}&experimento=${st.rascunhoId}`, { scroll: false });
      onFeito(`Salvo no projeto${modo === "novo" ? ` “${nomeProjeto.trim()}”` : ""}. Reabra pelo projeto ou por este endereço.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setOcupado(false);
      setEstado(null);
    }
  };

  return (
    <div className="grid max-w-xl gap-4 text-[14px] text-[#c9d2e3]" data-testid="salvar">
      <label className="grid gap-1">
        <span className="font-semibold text-white">Nome do experimento</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} className="rounded-lg border border-white/15 bg-[#060a13]/60 px-3 py-2 text-white" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="font-semibold text-white">Onde salvar</legend>
        {editaveis.length > 0 && (
          <label className="flex items-start gap-2">
            <input type="radio" name="onde" className="mt-1" checked={modo === "existente"} onChange={() => setModo("existente")} />
            <span className="grid flex-1 gap-1">
              Projeto existente
              <select value={projetoId} onChange={(e) => (setProjetoId(e.target.value), setModo("existente"))} className="rounded-lg border border-white/15 bg-[#0b1221] px-2 py-1.5 text-white" aria-label="Projeto">
                {editaveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
        <label className="flex items-start gap-2">
          <input type="radio" name="onde" className="mt-1" checked={modo === "novo"} onChange={() => setModo("novo")} />
          <span className="grid flex-1 gap-1">
            Novo projeto
            <input value={nomeProjeto} onChange={(e) => (setNomeProjeto(e.target.value), setModo("novo"))} minLength={3} maxLength={200} className="rounded-lg border border-white/15 bg-[#060a13]/60 px-2 py-1.5 text-white" aria-label="Nome do novo projeto" />
          </span>
        </label>
      </fieldset>
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-[12px]">
        <p>
          Serão guardados: a descrição, {s.materiais.length} material(is), {s.versoes.length} versão(ões) e as suas correções. {pendentes.length ? `${pendentes.length} arquivo(s) original(is) será(ão) enviado(s) ao projeto.` : ""}
        </p>
        <p className="mt-1 text-[#a7b2c8]">Projetos são privados: só você e quem receber acesso ao projeto veem os arquivos. Nada é enviado a serviços externos ao salvar.</p>
        {semOriginal.length > 0 && <p className="mt-1 text-[#ffd08a]">{semOriginal.length} material(is) sem o arquivo original neste navegador (a página foi recarregada): o conteúdo extraído é salvo, mas o original não. Reenvie se quiser guardá-lo.</p>}
      </div>
      {estado && <p role="status" className="text-[13px] text-white">{estado}</p>}
      {erro && <p role="alert" className="text-[13px] text-[#ff8aa4]">{erro}</p>}
      <button type="button" onClick={() => void salvar()} disabled={ocupado || (modo === "novo" ? nomeProjeto.trim().length < 3 : !projetoId)} className="ge-press justify-self-start rounded-full bg-action px-5 py-2.5 font-semibold text-white disabled:opacity-40">
        {ocupado ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
