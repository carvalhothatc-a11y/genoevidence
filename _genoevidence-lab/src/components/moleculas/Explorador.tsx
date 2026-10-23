"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { VisualKindBadge } from "@/components/ui/Badges";
import type { FonteEstrutura } from "@/components/biomol/visor/VisorMolecular";

const VisorMolecular = dynamic(() => import("@/components/biomol/visor/VisorMolecular").then((m) => m.VisorMolecular), {
  ssr: false,
  loading: () => (
    <div className="grid h-[clamp(420px,66vh,760px)] place-items-center rounded-2xl border border-line bg-panel text-[13px] text-muted" role="status">
      Carregando o visualizador…
    </div>
  ),
});

const MAX_ARQUIVO_ESTRUTURA = 30 * 1024 * 1024;

type Proteina = { acesso: string; nome: string; genes: string[]; organismo: string; url: string };
type Composto = { cid: number; nome: string; formula?: string; massa?: string; imagem2d: string; url: string };
type Estrutura = { pdbId: string; titulo: string; metodo?: string; resolucao?: number; url: string };

type Achado =
  | { tipo: "proteina"; proteina: Proteina; estruturas: Estrutura[]; motivoEstruturas?: string }
  | { tipo: "composto"; composto: Composto }
  | { tipo: "pdb"; estrutura: Estrutura };

type Resposta = { encontrado: true; resultados: Achado[] } | { encontrado: false; motivo: string };

/** O que aparece antes de qualquer busca. A tela nunca abre vazia. */
const SUGESTOES = [
  { rotulo: "DNA", termo: "1BNA", dica: "a dupla-hélice" },
  { rotulo: "p53", termo: "p53", dica: "proteína do gene TP53" },
  { rotulo: "Taq", termo: "1TAQ", dica: "a polimerase da PCR" },
  { rotulo: "Cas9", termo: "4OO8", dica: "a tesoura do CRISPR" },
  { rotulo: "Anticorpo", termo: "1IGT", dica: "uma IgG inteira" },
  { rotulo: "Cafeína", termo: "caffeine", dica: "um composto pequeno" },
  { rotulo: "Insulina", termo: "insulin", dica: "um hormônio" },
];

/**
 * Explorador de moléculas: UMA caixa de busca e o 3D grande.
 *
 * Feito para quem abre com pressa: a tela já vem com uma molécula na frente, as sugestões são
 * clicáveis, e não é preciso dizer antes se o que você digitou é proteína, gene, composto ou
 * código de estrutura — o servidor descobre.
 *
 * Tudo que aparece aqui é estrutura DEPOSITADA por terceiros, com a fonte à vista. Nada é
 * desenhado, calculado ou aproximado.
 */
export function Explorador() {
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [achados, setAchados] = useState<Achado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pdb, setPdb] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<Estrutura | null>(null);
  const [local, setLocal] = useState<{ nome: string; texto: string } | null>(null);
  const [erroArquivo, setErroArquivo] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  // Vindo de outra ferramenta (ex.: busca por sequência): ?pdb=1CRN&cadeia=A
  const pedidoPdb = (params.get("pdb") ?? "").toUpperCase();
  const pedidoCadeia = params.get("cadeia") ?? undefined;
  const inicialPdb = /^[0-9][A-Z0-9]{3}$/.test(pedidoPdb) ? pedidoPdb : "1BNA";

  const buscar = useCallback(async (q: string) => {
    const limpo = q.trim();
    if (!limpo) return;
    setBuscando(true);
    setErro(null);
    setLocal(null);
    try {
      const r = await fetch(`/api/moleculas/resolver?termo=${encodeURIComponent(limpo)}&tipo=auto`);
      const d = (await r.json().catch(() => ({}))) as Resposta & { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Não foi possível buscar agora.");
      if (!d.encontrado) {
        setAchados([]);
        setErro(d.motivo);
        return;
      }
      setAchados(d.resultados);
      // Um resultado só, com estrutura: já abre, para não exigir um clique extra de quem tem pressa.
      const unico = d.resultados.length === 1 ? d.resultados[0] : null;
      if (unico?.tipo === "pdb") abrir(unico.estrutura);
      else if (unico?.tipo === "proteina" && unico.estruturas[0]) abrir(unico.estruturas[0]);
      else setPdb(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível buscar agora.");
    } finally {
      setBuscando(false);
    }
  }, []);

  const abrir = (e: Estrutura) => {
    setLocal(null);
    setPdb(e.pdbId);
    setTitulo(e);
  };

  // Abre com a dupla-hélice já na tela (ou com a estrutura pedida no endereço). Não envolve nenhum
  // dado seu: é um arquivo público.
  useEffect(() => {
    void buscar(inicialPdb);
  }, [buscar, inicialPdb]);

  const abrirArquivo = async (f: File | undefined) => {
    setErroArquivo("");
    if (!f) return;
    if (f.size > MAX_ARQUIVO_ESTRUTURA) return setErroArquivo(`O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB; o limite aqui é 30 MB.`);
    const texto = await f.text();
    if (!/_atom_site\.|^(ATOM {2}|HETATM)/m.test(texto)) return setErroArquivo(`“${f.name}” não parece um arquivo PDB nem mmCIF (não achei átomos).`);
    setAchados(null);
    setErro(null);
    setPdb(null);
    setLocal({ nome: f.name, texto });
    if (arquivo.current) arquivo.current.value = "";
  };

  return (
    <div className="grid gap-4" data-testid="explorador">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(termo);
        }}
        className="grid gap-2"
      >
        <label htmlFor="busca-molecula" className="text-sm font-medium">
          Procure uma molécula
        </label>
        <div className="flex gap-2">
          <input
            id="busca-molecula"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="um nome, um gene ou um código do PDB — ex.: p53, cafeína, 1BNA"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/80 focus-visible:border-accent"
            autoComplete="off"
            data-testid="busca"
          />
          <button
            type="submit"
            disabled={buscando || !termo.trim()}
            className="ge-press rounded-full bg-action px-5 text-[14.5px] font-semibold text-white disabled:opacity-50"
          >
            {buscando ? "Procurando…" : "Procurar"}
          </button>
        </div>
        <p className="text-xs text-muted">
          Não precisa dizer o que é: proteína, gene, composto ou código de estrutura, tudo na mesma caixa. Ou{" "}
          <button type="button" onClick={() => arquivo.current?.click()} className="text-accent-ink underline" data-testid="abrir-arquivo-estrutura">
            abra um arquivo .pdb ou .cif do seu computador
          </button>{" "}
          — ele é lido aqui no navegador e não é enviado.
        </p>
        <input ref={arquivo} type="file" accept=".pdb,.ent,.cif,.mmcif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void abrirArquivo(e.target.files?.[0])} />
        {erroArquivo && (
          <p className="text-sm text-danger" role="alert">
            {erroArquivo}
          </p>
        )}
      </form>

      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted">Ou comece por uma destas:</p>
        <ul className="flex flex-wrap gap-1.5">
          {SUGESTOES.map((s) => (
            <li key={s.rotulo}>
              <button
                type="button"
                onClick={() => {
                  setTermo(s.rotulo);
                  void buscar(s.termo);
                }}
                title={s.dica}
                data-sugestao={s.rotulo}
                className="ge-press rounded-full border border-line px-3 py-1.5 text-[13px] hover:bg-surface-2"
              >
                {s.rotulo} <span className="text-muted">· {s.dica}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {erro && (
        <p className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="status" data-testid="sem-resultado">
          {erro}
        </p>
      )}

      {achados && achados.length > 1 && (
        <div className="grid gap-1.5 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" data-testid="ambiguo">
          <p>
            Esse nome existe em mais de uma base. São coisas diferentes — escolha qual você quer ver:
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {achados.map((a) => (
              <li key={a.tipo}>
                <button
                  type="button"
                  onClick={() => {
                    if (a.tipo === "proteina" && a.estruturas[0]) abrir(a.estruturas[0]);
                    if (a.tipo === "pdb") abrir(a.estrutura);
                    if (a.tipo === "composto") setPdb(null);
                    setAchados([a]);
                  }}
                  className="ge-press rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] hover:bg-surface-2"
                >
                  {a.tipo === "proteina" ? `a proteína ${a.proteina.nome}` : a.tipo === "composto" ? `o composto ${a.composto.nome}` : `a estrutura ${a.estrutura.pdbId}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {achados?.map((a) => (
        <Achadinho key={a.tipo} achado={a} aoAbrir={abrir} abertoPdb={pdb} />
      ))}

      {local ? (
        <Visor fonte={{ tipo: "texto", nome: local.nome, texto: local.texto }} chave={`arquivo:${local.nome}`} />
      ) : (
        pdb && titulo && <Visor fonte={{ tipo: "pdb", id: pdb }} chave={pdb} estrutura={titulo} cadeia={pdb === inicialPdb ? pedidoCadeia : undefined} />
      )}
    </div>
  );
}

function Achadinho({ achado, aoAbrir, abertoPdb }: { achado: Achado; aoAbrir: (e: Estrutura) => void; abertoPdb: string | null }) {
  if (achado.tipo === "composto") {
    const c = achado.composto;
    return (
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[140px_1fr]" data-testid="cartao-composto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.imagem2d} alt={`Estrutura plana de ${c.nome}`} width={140} height={140} className="rounded-lg bg-white" />
        <div className="grid content-start gap-1">
          <h2 className="font-semibold">{c.nome}</h2>
          <p className="text-sm text-muted">
            PubChem CID {c.cid}
            {c.formula ? ` · ${c.formula}` : ""}
            {c.massa ? ` · ${c.massa} g/mol` : ""}
          </p>
          <a href={c.url} target="_blank" rel="noreferrer noopener" className="text-sm text-accent-ink underline">
            Ver no PubChem
          </a>
          <p className="text-xs text-muted">
            Desenho plano, servido pelo GenoLab. Compostos pequenos nem sempre têm estrutura 3D medida; quando têm, ela está no PDB.
          </p>
        </div>
      </div>
    );
  }

  if (achado.tipo === "pdb") return null; // o visor abaixo já mostra tudo

  const p = achado.proteina;
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-surface p-4" data-testid="cartao-proteina">
      <div className="grid gap-0.5">
        <h2 className="font-semibold">{p.nome}</h2>
        <p className="text-sm text-muted">
          UniProt {p.acesso}
          {p.genes.length ? ` · gene ${p.genes.join(", ")}` : ""} · {p.organismo}
        </p>
        <a href={p.url} target="_blank" rel="noreferrer noopener" className="text-sm text-accent-ink underline">
          Ver no UniProt
        </a>
      </div>
      {achado.estruturas.length > 0 ? (
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted">Estruturas desta proteína, da melhor resolução para a pior:</p>
          <ul className="flex flex-wrap gap-1.5">
            {achado.estruturas.map((e) => (
              <li key={e.pdbId}>
                <button
                  type="button"
                  onClick={() => aoAbrir(e)}
                  title={e.titulo}
                  data-estrutura={e.pdbId}
                  className={`ge-press rounded-full border px-3 py-1.5 text-[13px] ${abertoPdb === e.pdbId ? "border-accent bg-accent-soft font-semibold" : "border-line hover:bg-surface-2"}`}
                >
                  {e.pdbId}
                  {e.resolucao ? <span className="text-muted"> · {e.resolucao} Å</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-warn">{achado.motivoEstruturas ?? "Nenhuma estrutura depositada para esta proteína."}</p>
      )}
    </div>
  );
}

function Visor({ fonte, chave, estrutura, cadeia }: { fonte: FonteEstrutura; chave: string; estrutura?: Estrutura; cadeia?: string }) {
  const pdb = fonte.tipo === "pdb" ? fonte.id : null;
  return (
    <figure className="grid gap-2" data-testid="visor" data-pdb={pdb ?? undefined} data-arquivo={fonte.tipo === "texto" ? fonte.nome : undefined}>
      <VisorMolecular
        key={chave}
        fontes={[fonte]}
        inicial={cadeia ? { cadeia } : undefined}
        selo={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <VisualKindBadge kind="dados" />
            <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
              {pdb ? `PDB ${pdb} · estrutura experimental` : "arquivo do seu computador"}
            </span>
          </span>
        }
        legenda={
          <figcaption className="grid gap-1 text-sm">
            {pdb && estrutura ? (
              <>
                <strong className="font-semibold">
                  {pdb} — {estrutura.titulo}
                </strong>
                <span className="text-muted">
                  {estrutura.metodo ?? "método não informado"}
                  {estrutura.resolucao ? ` · ${estrutura.resolucao} Å` : ""} ·{" "}
                  <a href={estrutura.url} target="_blank" rel="noreferrer noopener" className="text-accent-ink underline">
                    ver no RCSB PDB
                  </a>
                </span>
              </>
            ) : (
              <strong className="font-semibold">{fonte.tipo === "texto" ? fonte.nome : ""}</strong>
            )}
            <span className="text-xs text-muted">
              {fonte.tipo === "texto"
                ? "Lido no seu navegador; não foi enviado ao GenoLab. A origem e o método são os que o próprio arquivo declara — o GenoLab não confere. "
                : "Estrutura experimental depositada por terceiros. "}
              Mostra a unidade assimétrica, modelo 1. Girar é só para olhar: não é movimento calculado nem dinâmica molecular.
            </span>
          </figcaption>
        }
      />
    </figure>
  );
}
