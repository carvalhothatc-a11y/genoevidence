"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { moleculasCitadas, ROTULO_TIPO, type MoleculaCitada, type TipoMolecula } from "@/lib/cena/moleculas";

const MolstarViewer = dynamic(() => import("@/components/structures/MolstarViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[12px] text-[#a7b2c8]" role="status">
      Carregando o visualizador…
    </div>
  ),
});

type Proteina = { acesso: string; nome: string; genes: string[]; organismo: string; url: string };
type Composto = { cid: number; nome: string; formula?: string; massa?: string; smiles?: string; imagem2d: string; url: string };
type Estrutura = { pdbId: string; titulo: string; metodo?: string; resolucao?: number; url: string };
type Resposta =
  | { encontrado: true; tipo: string; proteina?: Proteina; alternativas?: Proteina[]; estruturas?: Estrutura[]; motivoEstruturas?: string; composto?: Composto; estrutura?: Estrutura }
  | { encontrado: false; tipo: string; motivo: string };

type Estado = { carregando: boolean; dados?: Resposta; erro?: string };

/**
 * Moléculas citadas no experimento. A busca nas bases só acontece quando a pessoa clica — é uma saída de
 * dados do GenoLab, então nunca é automática. A cena 3D continua sendo ILUSTRAÇÃO; o que aparece
 * aqui é dado real, de fonte identificada, e os dois ficam visivelmente separados.
 */
export function Moleculas({ texto }: { texto: string }) {
  const citadas = moleculasCitadas(texto, 8);
  const [aberta, setAberta] = useState<string | null>(null);
  const [tipos, setTipos] = useState<Record<string, TipoMolecula>>({});
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  if (!citadas.length) return null;

  const chave = (m: MoleculaCitada) => `${m.termo}:${tipos[m.termo] ?? m.tipo}`;

  const buscar = async (m: MoleculaCitada) => {
    const tipo = tipos[m.termo] ?? m.tipo;
    const k = chave(m);
    setAberta(k);
    if (estados[k]?.dados || estados[k]?.carregando) return;
    setEstados((e) => ({ ...e, [k]: { carregando: true } }));
    try {
      const consulta = tipo === "composto" ? m.consulta : m.termo;
      const r = await fetch(`/api/moleculas/resolver?termo=${encodeURIComponent(consulta)}&tipo=${tipo}`);
      const d = (await r.json().catch(() => ({}))) as Resposta & { error?: string };
      if (!r.ok) throw new Error(d.error ?? "falha na busca");
      setEstados((e) => ({ ...e, [k]: { carregando: false, dados: d } }));
    } catch (err) {
      setEstados((e) => ({ ...e, [k]: { carregando: false, erro: err instanceof Error ? err.message : "Não foi possível buscar agora." } }));
    }
  };

  return (
    <section className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3" aria-label="Moléculas citadas no experimento" data-testid="moleculas-citadas">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-white">Moléculas citadas</h3>
        <span className="text-[11px] text-[#7d8aa3]">a cena é ilustração; aqui vem o dado real</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {citadas.map((m) => {
          const tipo = tipos[m.termo] ?? m.tipo;
          const k = chave(m);
          const st = estados[k];
          return (
            <li key={m.termo}>
              <button
                type="button"
                onClick={() => void buscar(m)}
                aria-expanded={aberta === k}
                className={`ge-press rounded-full border px-3 py-1.5 text-[12px] ${aberta === k ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 text-[#c9d2e3] hover:bg-white/10"}`}
                data-molecula={m.termo}
              >
                {m.termo} <span className="text-[#a7b2c8]">· {ROTULO_TIPO[tipo]}</span>
                {st?.carregando ? " …" : ""}
              </button>
            </li>
          );
        })}
      </ul>

      {citadas.map((m) => {
        const tipo = tipos[m.termo] ?? m.tipo;
        const k = chave(m);
        if (aberta !== k) return null;
        const st = estados[k];
        return (
          <div key={k} className="grid gap-2 rounded-xl border border-white/10 bg-[#0b1221] p-3 text-[12px] text-[#c9d2e3]">
            {m.ambiguo && (
              <div className="grid gap-1.5 rounded-lg border border-[#ffb23f]/40 bg-[#ffb23f]/10 p-2">
                <p className="text-[#ffd08a]">
                  “{m.termo}” pode ser o gene ou a proteína que ele codifica. São objetos diferentes e a estrutura muda. Qual você quer?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(["gene", "proteina"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => (setTipos((x) => ({ ...x, [m.termo]: t })), setAberta(`${m.termo}:${t}`))}
                      className={`ge-press rounded-full border px-2.5 py-1 ${tipo === t ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 hover:bg-white/10"}`}
                    >
                      {t === "gene" ? `o gene ${m.termo}` : `a proteína de ${m.termo}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {st?.carregando && <p role="status">Buscando…</p>}
            {st?.erro && <p role="alert" className="text-[#ff8aa4]">{st.erro}</p>}
            {st?.dados && !st.dados.encontrado && <p className="text-[#ffd08a]">{st.dados.motivo}</p>}
            {st?.dados?.encontrado && <Resultado d={st.dados} tipo={tipo} termo={m.termo} />}
          </div>
        );
      })}
    </section>
  );
}

function Resultado({ d, tipo, termo }: { d: Extract<Resposta, { encontrado: true }>; tipo: TipoMolecula; termo: string }) {
  const [pdb, setPdb] = useState<string | null>(null);

  if (d.composto)
    return (
      <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.composto.imagem2d} alt={`Estrutura plana de ${d.composto.nome}`} width={110} height={110} className="rounded-lg bg-white" loading="lazy" />
        <div className="grid content-start gap-0.5">
          <strong className="text-[13px] text-white">{d.composto.nome}</strong>
          <span className="text-[#a7b2c8]">
            PubChem CID {d.composto.cid}
            {d.composto.formula ? ` · ${d.composto.formula}` : ""}
            {d.composto.massa ? ` · ${d.composto.massa} g/mol` : ""}
          </span>
          <a href={d.composto.url} target="_blank" rel="noreferrer noopener" className="text-[#9db4ff] underline">
            Ver no PubChem
          </a>
          <span className="text-[#7d8aa3]">Desenho 2D do PubChem, servido pelo GenoLab.</span>
        </div>
      </div>
    );

  if (!d.proteina) return <p className="text-[#a7b2c8]">Sem dados para mostrar.</p>;

  return (
    <div className="grid gap-2">
      <div className="grid gap-0.5">
        <strong className="text-[13px] text-white">{d.proteina.nome}</strong>
        <span className="text-[#a7b2c8]">
          UniProt {d.proteina.acesso}
          {d.proteina.genes.length ? ` · gene ${d.proteina.genes.join(", ")}` : ""} · {d.proteina.organismo}
        </span>
        <a href={d.proteina.url} target="_blank" rel="noreferrer noopener" className="text-[#9db4ff] underline">
          Ver no UniProt
        </a>
        {tipo === "gene" && (
          <span className="text-[#ffd08a]">
            Você pediu o gene {termo}. O que existe no banco de estruturas é a <strong>proteína</strong> que ele codifica — a sequência do gene não tem estrutura 3D resolvida.
          </span>
        )}
      </div>

      {d.estruturas && d.estruturas.length > 0 ? (
        <div className="grid gap-1.5">
          <p className="text-[11px] uppercase tracking-wide text-[#7d8aa3]">Estruturas no RCSB PDB</p>
          <ul className="flex flex-wrap gap-1.5">
            {d.estruturas.slice(0, 5).map((e) => (
              <li key={e.pdbId}>
                <button
                  type="button"
                  onClick={() => setPdb(pdb === e.pdbId ? null : e.pdbId)}
                  title={e.titulo}
                  className={`ge-press rounded-full border px-2.5 py-1 ${pdb === e.pdbId ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 hover:bg-white/10"}`}
                >
                  {e.pdbId}
                  {e.resolucao ? <span className="text-[#a7b2c8]"> · {e.resolucao} Å</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#7d8aa3]">
            Só estruturas que contêm esta proteína (procuradas pelo acesso UniProt), da melhor resolução para a pior. Muitas são fragmentos ou complexos: leia o título.
          </p>
          {pdb && <Visor pdb={pdb} estrutura={d.estruturas.find((e) => e.pdbId === pdb)!} />}
        </div>
      ) : (
        <p className="text-[#ffd08a]">{d.motivoEstruturas ?? "Nenhuma estrutura encontrada no RCSB PDB para esta proteína."}</p>
      )}
    </div>
  );
}

function Visor({ pdb, estrutura }: { pdb: string; estrutura: Estrutura }) {
  const [reduzido, setReduzido] = useState(false);
  const [estado, setEstado] = useState<{ state: "carregando" | "pronto" | "erro"; message?: string }>({ state: "carregando" });
  useEffect(() => setReduzido(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return (
    <figure className="grid gap-1" data-testid="visor-molecula" data-pdb={pdb}>
      <div className="relative h-[280px] overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <MolstarViewer url={`/api/moleculas/estrutura?pdb=${pdb}`} format="mmcif" highlights={[]} command={null} reducedMotion={reduzido} onStatus={setEstado} />
      </div>
      <figcaption className="grid gap-0.5 text-[11px] text-[#a7b2c8]">
        <span className="text-[#c9d2e3]">
          {pdb} — {estrutura.titulo}
        </span>
        <span>
          {estrutura.metodo ?? "método não informado"}
          {estrutura.resolucao ? ` · ${estrutura.resolucao} Å` : ""} ·{" "}
          <a href={estrutura.url} target="_blank" rel="noreferrer noopener" className="text-[#9db4ff] underline">
            ver no RCSB PDB
          </a>
        </span>
        {estado.state === "erro" && <span className="text-[#ff8aa4]" role="alert">{estado.message ?? "Não foi possível carregar a estrutura."}</span>}
        <span>Estrutura experimental depositada por terceiros. Girar a molécula é só para olhar: não é movimento calculado nem dinâmica molecular.</span>
      </figcaption>
    </figure>
  );
}
