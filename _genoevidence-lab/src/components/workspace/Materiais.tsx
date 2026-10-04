"use client";
/* eslint-disable @next/next/no-img-element -- prévias locais (object URL) e arquivos do projeto */
import { useMemo, useRef, useState } from "react";
import { CATEGORIA_NOME, OBJETOS, OBJETOS_POR_CATEGORIA, type Categoria, type ObjetoId } from "@/lib/cena/biblioteca";
import { interpretarRoteiro } from "@/lib/visual/roteiro";
import type { ElementoImagem, Material, MaterialImagem, MaterialRelatorio, MaterialTabela } from "@/lib/experimento/materiais";
import type { PapelColuna } from "@/lib/experimento/schema";
import { novoId, useExperimento } from "@/store/experimento";
import { abasPorMaterial, adicionarImagem, identificarImagem, trocarAba } from "./acoesMateriais";
import { EstadoFonteBadge, IC, Icone } from "./ui";

const PAPEL_NOME: Record<PapelColuna, string> = {
  ignorar: "ignorar",
  identificador: "identificador",
  amostra: "amostra",
  grupo: "grupo",
  replica: "réplica",
  condicao: "condição",
  valor: "valor medido",
  unidade: "unidade",
  tempo: "tempo medido",
};

function Cabecalho({ m, icone, estado, children }: { m: Material; icone: string; estado: React.ReactNode; children?: React.ReactNode }) {
  const rm = useExperimento((s) => s.rmMaterial);
  const nome = m.tipo === "referencia" ? m.titulo : m.nome;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[#cdbcff]">
        <Icone d={icone} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white" title={nome}>
          {nome}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">{estado}</div>
      </div>
      {children}
      <button type="button" onClick={() => rm(m.id)} className="ge-press rounded-lg p-1.5 text-[#a7b2c8] hover:bg-white/10 hover:text-white" title="Remover material" aria-label={`Remover ${nome}`}>
        <Icone d={IC.lixo} size={16} />
      </button>
    </div>
  );
}

function LinkOriginal({ m }: { m: Material }) {
  const arquivo = useExperimento((s) => s.arquivos[m.id]);
  const projetoId = useExperimento((s) => s.projetoId);
  const url = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  if (m.tipo === "referencia") return m.forma !== "bibliografica" ? <a className="text-[12px] text-[#9db4ff] underline" href={m.forma === "doi" ? `https://doi.org/${m.valor}` : m.valor} target="_blank" rel="noopener noreferrer">abrir fonte</a> : null;
  if (url) return <a className="text-[12px] text-[#9db4ff] underline" href={url} target="_blank" rel="noopener" download={m.tipo === "imagem" ? undefined : m.nome}>arquivo original</a>;
  if (m.arquivoId && projetoId) return <a className="text-[12px] text-[#9db4ff] underline" href={`/api/projects/${projetoId}/files/${m.arquivoId}?view=1`} target="_blank" rel="noopener">arquivo original (projeto)</a>;
  return <span className="text-[11px] text-[#7d8aa3]">original não disponível neste navegador</span>;
}

// ---------------------------------------------------------------- imagem

function CartaoImagem({ m }: { m: MaterialImagem }) {
  const previa = useExperimento((s) => s.previas[m.id]);
  const temArquivo = useExperimento((s) => Boolean(s.arquivos[m.id]));
  const upd = useExperimento((s) => s.updMaterial);
  const rm = useExperimento((s) => s.rmMaterial);
  const [consentir, setConsentir] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const [novoObj, setNovoObj] = useState<ObjetoId>("microtubo");
  const inSub = useRef<HTMLInputElement>(null);
  const setEl = (fn: (els: ElementoImagem[]) => ElementoImagem[]) => upd(m.id, (x) => (x.tipo === "imagem" ? { ...x, elementos: fn(x.elementos) } : x));

  const identificar = async () => {
    setOcupado(true);
    setEstado("Enviando a foto reduzida para identificação…");
    const r = await identificarImagem(m.id);
    setOcupado(false);
    setConsentir(false);
    if (!r.ok) return setEstado(r.erro);
    setExtra(r.naoIdentificados ?? []);
    setEstado(r.descricao ? `Sugestões prontas: ${r.descricao} Confirme as que estão corretas.` : "Sugestões prontas. Confirme as que estão corretas.");
  };

  return (
    <li className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-material="imagem">
      <Cabecalho m={m} icone={IC.imagem} estado={<><EstadoFonteBadge estado={m.analisadaEm ? "analisado" : "enviado"} /><LinkOriginal m={m} /></>}>
        <button type="button" onClick={() => inSub.current?.click()} className="ge-press rounded-lg px-2 py-1 text-[12px] text-[#c9d2e3] hover:bg-white/10" title="Substituir a foto">
          Substituir
        </button>
        <input
          ref={inSub}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && adicionarImagem(f).ok) rm(m.id);
          }}
        />
      </Cabecalho>
      {previa ? <img src={previa} alt={`Prévia de ${m.nome}`} className="max-h-48 w-full rounded-lg border border-white/10 object-contain" /> : <p className="text-[11px] text-[#7d8aa3]">Prévia indisponível (a foto não fica guardada no navegador ao recarregar).</p>}
      <label className="grid gap-1 text-[12px]">
        <span className="text-[#a7b2c8]">Legenda (opcional): o que a foto mostra</span>
        <input value={m.legenda} onChange={(e) => upd(m.id, (x) => (x.tipo === "imagem" ? { ...x, legenda: e.target.value.slice(0, 300) } : x))} className="rounded-lg border border-white/12 bg-[#060a13]/60 px-2 py-1.5 text-[13px] text-white" placeholder="Ex.: tubos com master mix na estante" />
      </label>

      <fieldset className="grid gap-1.5">
        <legend className="text-[12px] font-semibold text-white">Elementos na foto</legend>
        {m.elementos.length === 0 && <p className="text-[11px] text-[#7d8aa3]">Nenhum elemento marcado. Marque abaixo ou peça a identificação automática.</p>}
        <ul className="grid gap-1">
          {m.elementos.map((el) => (
            <li key={el.id} className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 text-[12px] ${el.confirmado ? "border-[#3ccf8e]/30 bg-[#3ccf8e]/[0.05]" : "border-[#ffb23f]/35 bg-[#ffb23f]/[0.05]"}`} data-elemento={el.objeto}>
              <label className="flex flex-1 items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={el.confirmado} onChange={(e) => setEl((els) => els.map((x) => (x.id === el.id ? { ...x, confirmado: e.target.checked } : x)))} />
                <span className="min-w-0">
                  <span className="font-semibold text-white">{el.rotulo}</span> <span className="text-[#a7b2c8]">· {OBJETOS[el.objeto].nome}</span>
                  {el.origem === "ia" && <span className="ml-1 rounded-full border border-[#e679b5]/45 px-1 text-[10px] text-[#f3a9d1]">sugestão da IA</span>}
                  {el.nota && <span className="block text-[11px] text-[#a7b2c8]">{el.nota}</span>}
                  {!el.confirmado && <span className="block text-[11px] text-[#ffd08a]">não confirmado: fica fora da cena</span>}
                </span>
              </label>
              <select aria-label="Corrigir o elemento" value={el.objeto} onChange={(e) => setEl((els) => els.map((x) => (x.id === el.id ? { ...x, objeto: e.target.value as ObjetoId, rotulo: x.rotulo === OBJETOS[x.objeto].nome ? OBJETOS[e.target.value as ObjetoId].nome : x.rotulo } : x)))} className="max-w-[130px] rounded border border-white/12 bg-[#0b1221] px-1 py-0.5 text-[11px] text-white">
                {(Object.keys(OBJETOS_POR_CATEGORIA) as Categoria[]).map((c) => (
                  <optgroup key={c} label={CATEGORIA_NOME[c]}>
                    {OBJETOS_POR_CATEGORIA[c].map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="button" onClick={() => setEl((els) => els.filter((x) => x.id !== el.id))} className="rounded p-0.5 text-[#a7b2c8] hover:text-white" aria-label={`Remover ${el.rotulo}`}>
                <Icone d={IC.fechar} size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor={`novo-${m.id}`}>
            Elemento a marcar
          </label>
          <select id={`novo-${m.id}`} value={novoObj} onChange={(e) => setNovoObj(e.target.value as ObjetoId)} className="rounded-lg border border-white/12 bg-[#0b1221] px-2 py-1 text-[12px] text-white">
            {(Object.keys(OBJETOS_POR_CATEGORIA) as Categoria[]).map((c) => (
              <optgroup key={c} label={CATEGORIA_NOME[c]}>
                {OBJETOS_POR_CATEGORIA[c].map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={() => setEl((els) => [...els, { id: novoId("el"), objeto: novoObj, rotulo: OBJETOS[novoObj].nome, origem: "usuario", confirmado: true }])} className="ge-press rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-white hover:bg-white/10">
            Marcar na foto
          </button>
        </div>
      </fieldset>

      <div className="grid gap-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
        <label className="flex items-start gap-2 text-[12px] text-[#c9d2e3]">
          <input type="checkbox" className="mt-0.5" checked={consentir} onChange={(e) => setConsentir(e.target.checked)} disabled={!temArquivo || ocupado} />
          <span>Autorizo enviar esta foto (reduzida) à Anthropic para identificar os elementos visíveis. A foto não é guardada pelo GenoLab neste envio.</span>
        </label>
        <button type="button" onClick={() => void identificar()} disabled={!consentir || ocupado} className="ge-press justify-self-start rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40">
          {ocupado ? "Identificando…" : "Identificar elementos"}
        </button>
        {estado && <p className="text-[11px] text-[#c9d2e3]" role="status">{estado}</p>}
        {extra.length > 0 && <p className="text-[11px] text-[#a7b2c8]">Visto, mas sem representação na biblioteca: {extra.join(", ")}.</p>}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- tabela

function CartaoTabela({ m }: { m: MaterialTabela }) {
  const upd = useExperimento((s) => s.updMaterial);
  const [erro, setErro] = useState<string | null>(null);
  const abas = abasPorMaterial.get(m.id) ?? [];
  const setPapel = (i: number, p: PapelColuna) => upd(m.id, (x) => (x.tipo === "tabela" ? { ...x, papeis: x.papeis.map((q, j) => (j === i ? p : q)) } : x));
  const ausentes = m.linhas.reduce((n, l) => n + l.filter((c) => c === null || !String(c).trim()).length, 0);
  return (
    <li className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-material="tabela">
      <Cabecalho m={m} icone={IC.tabela} estado={<><EstadoFonteBadge estado={m.papeis.includes("valor") ? "analisado" : "enviado"} /><span className="text-[11px] text-[#a7b2c8]">{m.totalLinhas} linha(s) · {m.colunas.length} coluna(s){ausentes ? ` · ${ausentes} célula(s) vazia(s)` : ""}</span><LinkOriginal m={m} /></>} />
      {abas.length > 1 && (
        <label className="flex items-center gap-2 text-[12px] text-[#a7b2c8]">
          Aba
          <select value={m.aba ?? ""} onChange={(e) => void trocarAba(m.id, e.target.value).then((r) => setErro(r.ok ? null : r.erro))} className="rounded border border-white/12 bg-[#0b1221] px-2 py-1 text-[12px] text-white">
            {abas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      )}
      {m.avisos.map((a) => (
        <p key={a} className="text-[11px] text-[#ffd08a]">
          {a}
        </p>
      ))}
      {erro && <p className="text-[11px] text-[#ffb23f]">{erro}</p>}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-max text-left text-[11px]">
          <caption className="sr-only">Prévia e mapeamento das colunas de {m.nome}</caption>
          <thead>
            <tr className="bg-white/[0.04]">
              {m.colunas.map((c, i) => (
                <th key={i} scope="col" className="px-2 py-1.5 align-top font-semibold text-white">
                  <span className="block max-w-[140px] truncate" title={c}>
                    {c}
                  </span>
                  <label className="sr-only" htmlFor={`papel-${m.id}-${i}`}>
                    Papel da coluna {c}
                  </label>
                  <select id={`papel-${m.id}-${i}`} value={m.papeis[i] ?? "ignorar"} onChange={(e) => setPapel(i, e.target.value as PapelColuna)} className={`mt-1 rounded border bg-[#0b1221] px-1 py-0.5 text-[11px] font-normal ${m.papeis[i] === "valor" ? "border-[#ffb23f]/60 text-[#ffd08a]" : m.papeis[i] === "ignorar" ? "border-white/10 text-[#7d8aa3]" : "border-[#7d9dff]/50 text-[#b9c9ff]"}`} data-coluna={c}>
                    {(Object.keys(PAPEL_NOME) as PapelColuna[]).map((p) => (
                      <option key={p} value={p}>
                        {PAPEL_NOME[p]}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.linhas.slice(0, 6).map((l, r) => (
              <tr key={r} className="border-t border-white/5">
                {m.colunas.map((_, i) => (
                  <td key={i} className={`ge-mono px-2 py-1 ${l[i] === null || l[i] === "" ? "text-[#7d8aa3]" : "text-[#c9d2e3]"}`}>
                    {l[i] === null || l[i] === "" ? "∅" : l[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <label className="flex items-center gap-1.5 text-[#a7b2c8]">
          Unidade dos valores
          <input value={m.unidade ?? ""} onChange={(e) => upd(m.id, (x) => (x.tipo === "tabela" ? { ...x, unidade: e.target.value.slice(0, 24) || null } : x))} placeholder="ex.: ciclos, ng/µL" className="w-28 rounded border border-white/12 bg-[#060a13]/60 px-2 py-1 text-[12px] text-white" />
        </label>
        <span className="text-[11px] text-[#7d8aa3]">∅ = ausente (mantido como ausente). Valores são usados exatamente como enviados.</span>
      </div>
      {!m.papeis.includes("valor") && <p className="text-[11px] text-[#ffd08a]">Marque ao menos uma coluna como “valor medido” para usar estes dados.</p>}
    </li>
  );
}

// ---------------------------------------------------------------- relatório

function CartaoRelatorio({ m }: { m: MaterialRelatorio }) {
  const etapasDe = useExperimento((s) => s.etapasDe);
  const setEtapasDe = useExperimento((s) => s.setEtapasDe);
  const temTexto = useExperimento((s) => Boolean(s.texto.trim()));
  const [ver, setVer] = useState(false);
  const etapas = useMemo(() => (m.estado === "extraido" ? interpretarRoteiro(m.texto.slice(0, 20_000)).filter((p) => p.acao !== "generica").length : 0), [m.estado, m.texto]);
  return (
    <li className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-material="relatorio">
      <Cabecalho
        m={m}
        icone={IC.relatorio}
        estado={
          <>
            <EstadoFonteBadge estado={m.estado === "extraido" ? "analisado" : "indisponivel"} />
            <span className="text-[11px] text-[#a7b2c8]">{m.estado === "extraido" ? `texto extraído${m.paginas ? ` · ${m.paginas} página(s)` : ""}${etapas ? ` · ${etapas} etapa(s) reconhecida(s)` : ""}` : (m.aviso ?? "conteúdo não extraído")}</span>
            <LinkOriginal m={m} />
          </>
        }
      />
      {m.estado === "extraido" && (
        <>
          {m.aviso && <p className="text-[11px] text-[#ffd08a]">{m.aviso}</p>}
          <button type="button" onClick={() => setVer((v) => !v)} aria-expanded={ver} className="justify-self-start text-[12px] text-[#9db4ff] underline">
            {ver ? "Ocultar texto extraído" : "Ver texto extraído"}
          </button>
          {ver && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-2 text-[11px] text-[#c9d2e3]">{m.texto.slice(0, 4000)}{m.texto.length > 4000 ? "\n…" : ""}</pre>}
          {etapas > 0 && temTexto && (
            <fieldset className="grid gap-1 text-[12px]">
              <legend className="font-semibold text-white">Etapas mostradas na cena</legend>
              {(["descricao", "ambos", "relatorio"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 text-[#c9d2e3]">
                  <input type="radio" name={`etapas-${m.id}`} checked={etapasDe === v} onChange={() => setEtapasDe(v)} />
                  {v === "descricao" ? "Só as que eu descrevi (o relatório fornece parâmetros)" : v === "ambos" ? "As descritas e depois as do relatório" : "Só as do relatório"}
                </label>
              ))}
            </fieldset>
          )}
          {etapas > 0 && !temTexto && <p className="text-[11px] text-[#a7b2c8]">Sem descrição escrita: a cena usa as etapas do relatório.</p>}
        </>
      )}
    </li>
  );
}

export function Materiais() {
  const materiais = useExperimento((s) => s.materiais);
  if (!materiais.length) return null;
  return (
    <section aria-labelledby="titulo-materiais" className="ge-glass grid gap-2 p-4">
      <h2 id="titulo-materiais" className="text-[15px] font-semibold text-white">
        Materiais <span className="ge-mono text-[11px] font-normal text-[#a7b2c8]">{materiais.length}</span>
      </h2>
      <ul className="grid gap-2">
        {materiais.map((m) =>
          m.tipo === "imagem" ? (
            <CartaoImagem key={m.id} m={m} />
          ) : m.tipo === "tabela" ? (
            <CartaoTabela key={m.id} m={m} />
          ) : m.tipo === "relatorio" ? (
            <CartaoRelatorio key={m.id} m={m} />
          ) : (
            <li key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-material="referencia">
              <Cabecalho m={m} icone={IC.referencia} estado={<><EstadoFonteBadge estado="cadastrada" /><span className="text-[11px] text-[#a7b2c8]">{m.forma === "doi" ? `DOI ${m.valor}` : m.forma === "url" ? "link" : "referência bibliográfica"}</span><LinkOriginal m={m} /></>} />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
