"use client";
import { useState } from "react";
import { OBJETOS } from "@/lib/cena/biblioteca";
import { chaveTrecho } from "@/lib/experimento/correcoes";
import { formatarValor } from "@/lib/experimento/quantidades";
import type { Experimento, Origem } from "@/lib/experimento/schema";
import { ACAO_TITULO, ACOES_DISPONIVEIS, type Acao } from "@/lib/visual/roteiro";
import { useExperimento } from "@/store/experimento";
import { EstadoFonteBadge, IC, Icone, OrigemChip, Secao } from "./ui";

function Origens({ os }: { os: Origem[] }) {
  const materiais = useExperimento((s) => s.materiais);
  const nome = (id?: string) => {
    const m = materiais.find((x) => x.id === id);
    return m ? (m.tipo === "referencia" ? m.titulo : m.nome) : undefined;
  };
  const vistos = new Set<string>();
  return (
    <span className="flex flex-wrap gap-1">
      {os
        .filter((o) => {
          const k = `${o.tipo}|${o.materialId ?? ""}`;
          return vistos.has(k) ? false : (vistos.add(k), true);
        })
        .slice(0, 4)
        .map((o, i) => (
          <OrigemChip key={i} o={o} nomeMaterial={o.materialId ? nome(o.materialId) : undefined} />
        ))}
    </span>
  );
}

function ParametroEditavel({ p }: { p: Experimento["parametros"][number] }) {
  const corrigir = useExperimento((s) => s.corrigir);
  const [valor, setValor] = useState(String(p.valor).replace(".", ","));
  const fator = p.valor !== 0 ? p.valorCanonico / p.valor : 1;
  const aplicar = (conferido: boolean) => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v)) return;
    corrigir((c) => ({ ...c, parametros: { ...c.parametros, [p.chave]: { valor: v, unidade: p.unidade, valorCanonico: Math.round(v * fator * 1e6) / 1e6, conferido } } }));
  };
  return (
    <li className="grid gap-1 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5" data-parametro={p.nome}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[12px] text-white">{p.nome}</span>
        <label className="sr-only" htmlFor={`par-${p.id}`}>
          Valor de {p.nome}
        </label>
        <input id={`par-${p.id}`} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={() => Number(valor.replace(",", ".")) !== p.valor && aplicar(p.conferido)} inputMode="decimal" className="ge-mono w-20 rounded border border-white/12 bg-[#060a13]/60 px-1.5 py-0.5 text-right text-[12px] text-white" />
        <span className="ge-mono text-[12px] text-[#a7b2c8]">{p.unidade}</span>
        <label className="flex items-center gap-1 text-[11px] text-[#a7b2c8]" title="Marque depois de conferir valor e unidade">
          <input type="checkbox" checked={p.conferido} onChange={(e) => aplicar(e.target.checked)} />
          conferido
        </label>
      </div>
      <Origens os={p.origens} />
    </li>
  );
}

export function Sintese() {
  const s = useExperimento();
  const exp = s.versoes[s.atual];
  const [editObj, setEditObj] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  if (!exp) return null;
  const corrigir = s.corrigir;
  const perguntas = exp.ausentes.filter((a) => a.impacto === "representacao");
  const limites = exp.ausentes.filter((a) => a.impacto === "avaliacao");
  const abertos = exp.conflitos.filter((c) => c.escolhido === null);
  const reais = exp.participantes.filter((p) => !p.inferido);
  const inferidos = exp.participantes.filter((p) => p.inferido);

  return (
    <section aria-labelledby="titulo-sintese" className="ge-glass grid gap-2 p-4" data-testid="sintese">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-sintese" className="text-[15px] font-semibold text-white">
          Como entendemos <span className="ge-mono text-[11px] font-normal text-[#a7b2c8]">versão {exp.versao}</span>
        </h2>
        {s.atual !== s.versoes.length - 1 && <span className="rounded-full border border-[#ffb23f]/50 px-2 py-0.5 text-[11px] text-[#ffd08a]">vendo versão anterior</span>}
      </div>

      {exp.mudancas.length > 0 && (
        <div className="rounded-lg border border-[#7b4de0]/40 bg-[#7b4de0]/10 p-2 text-[12px]" data-testid="mudancas">
          <p className="font-semibold text-white">O que mudou desde a versão {exp.versao - 1}</p>
          <ul className="mt-1 list-disc pl-4 text-[#cdbcff]">
            {exp.mudancas.slice(0, 8).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {(abertos.length > 0 || perguntas.length > 0) && (
        <div className="grid gap-2 rounded-lg border border-[#ffb23f]/40 bg-[#ffb23f]/[0.07] p-2.5" data-testid="perguntas">
          <p className="text-[12px] font-semibold text-[#ffd08a]">Precisamos da sua confirmação</p>
          {abertos.map((c) => (
            <fieldset key={c.id} className="grid gap-1 text-[12px]" data-conflito={c.nome}>
              <legend className="text-white">
                {c.nome}: os materiais trazem valores diferentes. Qual vale?
              </legend>
              {c.valores.map((v, i) => (
                <label key={i} className="flex flex-wrap items-center gap-2 text-[#c9d2e3]">
                  <input type="radio" name={`conf-${c.id}`} onChange={() => corrigir((x) => ({ ...x, conflitos: { ...x.conflitos, [c.chave]: i } }))} />
                  <span className="ge-mono text-white">{formatarValor(v.valor, v.unidade)}</span>
                  <Origens os={[v.origem]} />
                  {v.origem.trecho && <span className="truncate text-[11px] italic text-[#a7b2c8]" title={v.origem.trecho}>“{v.origem.trecho.slice(0, 70)}”</span>}
                </label>
              ))}
            </fieldset>
          ))}
          {perguntas.map((p) => (
            <p key={p.id} className="text-[12px] text-[#c9d2e3]">
              {p.texto}
            </p>
          ))}
        </div>
      )}

      <Secao id="objetivo" titulo="Objetivo">
        {editObj ? (
          <div className="grid gap-1.5">
            <textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={2} className="rounded-lg border border-white/12 bg-[#060a13]/60 px-2 py-1.5 text-[13px] text-white" aria-label="Objetivo" />
            <div className="flex gap-2">
              <button type="button" onClick={() => (corrigir((c) => ({ ...c, objetivo: objetivo.trim() || null })), setEditObj(false))} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1 text-[12px] font-semibold text-white">
                Guardar
              </button>
              <button type="button" onClick={() => setEditObj(false)} className="ge-press rounded-full px-3 py-1 text-[12px] text-[#c9d2e3] hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className={exp.objetivo ? "text-white" : "text-[#a7b2c8]"}>{exp.objetivo?.texto ?? "Não descrito."}</p>
            <button type="button" onClick={() => (setObjetivo(exp.objetivo?.texto ?? ""), setEditObj(true))} className="shrink-0 text-[12px] text-[#9db4ff] underline">
              editar
            </button>
          </div>
        )}
        {exp.objetivo && <Origens os={exp.objetivo.origens} />}
      </Secao>

      <Secao id="etapas" titulo="Ações e ordem" contagem={exp.acoes.length}>
        {exp.acoes.length === 0 && <p className="text-[#a7b2c8]">Nenhuma ação reconhecida. Descreva o que é feito (ex.: pipetar, centrifugar, correr o gel).</p>}
        <ol className="grid gap-1.5">
          {exp.acoes.map((a) => (
            <li key={a.id} className={`grid gap-1 rounded-lg border px-2 py-1.5 ${s.idx === a.ordem - 1 ? "border-[#e679b5]/50 bg-[#7b4de0]/10" : "border-white/10 bg-black/15"}`} data-acao={a.tipo}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => s.setIdx(a.ordem - 1)} className="ge-mono shrink-0 text-[12px] text-[#e679b5] hover:underline" title="Ver na cena">
                  {String(a.ordem).padStart(2, "0")}
                </button>
                <label className="sr-only" htmlFor={`acao-${a.id}`}>
                  Ação da etapa {a.ordem}
                </label>
                <select id={`acao-${a.id}`} value={a.tipo} onChange={(e) => corrigir((c) => ({ ...c, acoes: { ...c.acoes, [chaveTrecho(a.texto)]: e.target.value as Acao } }))} className="min-w-0 flex-1 rounded border border-white/12 bg-[#0b1221] px-1.5 py-0.5 text-[12px] font-semibold text-white">
                  {ACOES_DISPONIVEIS.map((x) => (
                    <option key={x} value={x}>
                      {ACAO_TITULO[x]}
                    </option>
                  ))}
                </select>
                {a.confianca === "conferir" && <span className="shrink-0 rounded-full border border-[#ffb23f]/50 px-1.5 text-[10px] text-[#ffd08a]">conferir</span>}
                <button type="button" onClick={() => corrigir((c) => ({ ...c, removidas: [...c.removidas, chaveTrecho(a.texto)] }))} className="shrink-0 rounded p-0.5 text-[#a7b2c8] hover:text-white" aria-label={`Remover a etapa ${a.ordem}`} title="Tirar esta etapa da cena">
                  <Icone d={IC.fechar} size={14} />
                </button>
              </div>
              <p className="text-[11px] italic text-[#a7b2c8]">“{a.texto}”</p>
              <Origens os={a.origens} />
            </li>
          ))}
        </ol>
        {s.correcoes.removidas.length > 0 && (
          <button type="button" onClick={() => corrigir((c) => ({ ...c, removidas: [] }))} className="justify-self-start text-[12px] text-[#9db4ff] underline">
            Restaurar {s.correcoes.removidas.length} etapa(s) removida(s)
          </button>
        )}
      </Secao>

      <Secao id="elementos" titulo="Elementos participantes" contagem={reais.length}>
        <ul className="grid gap-1">
          {reais.map((p) => (
            <li key={`${p.id}-${p.objeto}-${p.rotulo}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5" data-participante={p.objeto}>
              <label className="sr-only" htmlFor={`part-${p.id}`}>
                Nome de {OBJETOS[p.objeto].nome}
              </label>
              <input id={`part-${p.id}`} defaultValue={p.rotulo} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== p.rotulo && corrigir((c) => ({ ...c, participantes: { ...c.participantes, [p.objeto]: e.target.value.trim().slice(0, 80) } }))} className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-[12px] font-semibold text-white hover:border-white/15 focus:border-[#b49cf5]" />
              <span className="text-[11px] text-[#a7b2c8]">{OBJETOS[p.objeto].nome}</span>
              <Origens os={p.origens} />
            </li>
          ))}
        </ul>
        {inferidos.length > 0 && <p className="text-[11px] text-[#a7b2c8]">Representação padrão (não citada nos materiais): {inferidos.map((p) => p.rotulo).join(", ")}.</p>}
      </Secao>

      <Secao id="parametros" titulo="Parâmetros e unidades" contagem={exp.parametros.length}>
        {exp.parametros.length === 0 ? <p className="text-[#a7b2c8]">Nenhum valor com unidade reconhecido.</p> : <ul className="grid gap-1">{exp.parametros.map((p) => <ParametroEditavel key={`${p.id}-${p.valor}`} p={p} />)}</ul>}
      </Secao>

      {exp.dados.length > 0 && (
        <Secao id="dados" titulo="Dados observados" contagem={exp.dados.length}>
          <ul className="grid gap-1">
            {exp.dados.map((d) => (
              <li key={d.id} className="rounded-lg border border-white/10 bg-black/15 px-2 py-1.5 text-[12px]">
                <span className="font-semibold text-white">{d.variavel}</span>
                {d.unidade && <span className="text-[#a7b2c8]"> ({d.unidade})</span>}
                <span className="text-[#a7b2c8]"> · {d.grupos.length} grupo(s) · {d.linhas} linha(s){d.ausentes ? ` · ${d.ausentes} ausente(s)` : ""}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao id="fontes" titulo="Fontes" contagem={exp.fontes.length} aberta={false}>
        {exp.fontes.length === 0 ? (
          <p className="text-[#a7b2c8]">Nenhuma fonte ainda.</p>
        ) : (
          <ul className="grid gap-1">
            {exp.fontes.map((f) => (
              <li key={f.id} className="grid gap-0.5 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5 text-[12px]" data-fonte={f.estado}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <EstadoFonteBadge estado={f.estado} />
                  <span className="text-white">{f.titulo}</span>
                </span>
                {f.observacao && <span className="text-[11px] text-[#a7b2c8]">{f.observacao}</span>}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {limites.length > 0 && (
        <Secao id="ausentes" titulo="Informações ausentes" contagem={limites.length} aberta={false}>
          <p className="text-[11px] text-[#a7b2c8]">Não impedem a ilustração; limitam a avaliação.</p>
          <ul className="list-disc space-y-1 pl-4">
            {limites.map((a) => (
              <li key={a.id}>{a.texto}</li>
            ))}
          </ul>
        </Secao>
      )}
    </section>
  );
}
