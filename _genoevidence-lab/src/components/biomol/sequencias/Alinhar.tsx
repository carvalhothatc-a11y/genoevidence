"use client";
import { useEffect, useMemo, useState } from "react";
import { alinhar, emBlocos, ESQUEMA_DNA, ESQUEMA_PROTEINA, MAX_CELULAS, type Esquema, type ResultadoAlinhamento } from "@/lib/biomol/alinhamento";
import { NOME_TIPO } from "@/lib/biomol/sequencias";
import { nomeDeArquivo, paraJson } from "@/lib/biomol/exportar";
import { useBioMol, type SeqSalva } from "../estado";
import { baixar, BotaoLeve, num, Secao, Segmentado } from "../comum";

const compativel = (a: SeqSalva, b: SeqSalva) => (a.tipo === "proteina") === (b.tipo === "proteina");

export function Alinhar({ s }: { s: SeqSalva }) {
  const sequencias = useBioMol((x) => x.sequencias);
  const opcoes = sequencias.filter((x) => x.id !== s.id && compativel(s, x));
  const [outra, setOutra] = useState<string>(opcoes[0]?.id ?? "");
  const [modo, setModo] = useState<"global" | "local">("global");
  const proteina = s.tipo === "proteina";
  const [esquema, setEsquema] = useState<Esquema>(proteina ? ESQUEMA_PROTEINA : ESQUEMA_DNA);
  const [res, setRes] = useState<{ r: ResultadoAlinhamento; nomes: [string, string] } | null>(null);
  const [erro, setErro] = useState("");

  // Trocou o tipo da sequência ativa: o esquema de pontuação muda junto.
  useEffect(() => {
    setEsquema(proteina ? ESQUEMA_PROTEINA : ESQUEMA_DNA);
    setRes(null);
  }, [proteina]);
  useEffect(() => {
    if (!opcoes.some((o) => o.id === outra)) setOutra(opcoes[0]?.id ?? "");
  }, [opcoes, outra]);

  const b = opcoes.find((o) => o.id === outra) ?? null;
  const celulas = b ? (s.seq.length + 1) * (b.seq.length + 1) : 0;

  const rodar = () => {
    if (!b) return;
    setErro("");
    // RNA × DNA: compara-se com U lido como T, para não contar U×T como diferença
    const norm = (x: SeqSalva) => (x.tipo === "rna" ? x.seq.replace(/U/g, "T") : x.seq);
    try {
      setRes({ r: alinhar(norm(s), norm(b), modo, esquema), nomes: [s.nome, b.nome] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alinhar.");
    }
  };

  const texto = useMemo(() => (res ? emBlocos(res.r, res.nomes) : ""), [res]);

  return (
    <Secao titulo="Alinhar duas sequências" id="alinhar">
      {opcoes.length === 0 ? (
        <p className="text-sm text-muted">
          Para alinhar, adicione mais uma sequência do mesmo tipo ({proteina ? "proteína" : "DNA ou RNA"}). O exemplo fictício já traz duas.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm">
              <span className="text-muted">Sequência A:</span> <strong>{s.nome}</strong> ({s.seq.length} {proteina ? "aa" : "nt"})
            </p>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Sequência B:</span>
              <select value={outra} onChange={(e) => setOutra(e.target.value)} className="min-h-9 max-w-full rounded-lg border border-line bg-surface px-2 text-[13px]" data-testid="alinhar-b">
                {opcoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} ({NOME_TIPO[o.tipo]}, {o.seq.length})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmentado
              rotulo="Tipo de alinhamento"
              valor={modo}
              aoMudar={(v) => {
                setModo(v);
                setRes(null);
              }}
              opcoes={[
                { valor: "global", rotulo: "Global (Needleman–Wunsch)", dica: "As duas sequências inteiras, de ponta a ponta." },
                { valor: "local", rotulo: "Local (Smith–Waterman)", dica: "Só o melhor trecho em comum." },
              ]}
              testid="modo-alinhamento"
            />
          </div>
          <fieldset className="flex flex-wrap items-end gap-3 text-sm">
            <legend className="mb-1 text-xs text-muted">
              Pontuação {proteina ? "— matriz BLOSUM62" : "— nucleotídeos"} (padrões do EMBOSS needle; uma lacuna de comprimento L custa abertura + (L − 1) × extensão)
            </legend>
            {esquema.tipo === "nucleotideo" && (
              <>
                <Campo rotulo="Igual" valor={esquema.acerto} aoMudar={(v) => setEsquema({ ...esquema, acerto: v })} />
                <Campo rotulo="Diferente" valor={esquema.erro} aoMudar={(v) => setEsquema({ ...esquema, erro: v })} />
              </>
            )}
            <Campo rotulo="Abrir lacuna" valor={esquema.abertura} min={0} aoMudar={(v) => setEsquema({ ...esquema, abertura: v })} />
            <Campo rotulo="Estender lacuna" valor={esquema.extensao} min={0} aoMudar={(v) => setEsquema({ ...esquema, extensao: v })} />
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={rodar}
              disabled={!b || celulas > MAX_CELULAS}
              className="ge-press min-h-10 rounded-full bg-action px-5 text-[14px] font-semibold text-white disabled:opacity-50"
              data-testid="alinhar"
            >
              Alinhar
            </button>
            {celulas > MAX_CELULAS && <span className="text-xs text-warn">Grandes demais para alinhar no navegador ({s.seq.length} × {b?.seq.length}).</span>}
          </div>
          {erro && (
            <p className="text-sm text-danger" role="alert">
              {erro}
            </p>
          )}
          {res && (
            <div className="grid gap-2" data-testid="resultado-alinhamento">
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                <Dado rotulo="Pontuação" valor={num(res.r.pontuacao, res.r.pontuacao % 1 ? 1 : 0)} />
                <Dado rotulo="Identidade" valor={`${num(res.r.identidade, 1)}%`} nota={`${res.r.identicos}/${res.r.comprimento}`} testid="identidade" />
                {proteina && <Dado rotulo="Similaridade" valor={`${num(res.r.similaridade, 1)}%`} nota={`${res.r.similares}/${res.r.comprimento}`} />}
                <Dado rotulo="Lacunas" valor={`${res.r.lacunas}`} nota={`de ${res.r.comprimento} colunas`} />
                {res.r.modo === "local" && <Dado rotulo="Trecho" valor={`A ${res.r.inicioA}–${res.r.fimA}`} nota={`B ${res.r.inicioB}–${res.r.fimB}`} />}
              </dl>
              {res.r.comprimento === 0 ? (
                <p className="text-sm text-muted">Nenhum trecho em comum com pontuação positiva.</p>
              ) : (
                <pre className="ge-mono max-h-[28rem] overflow-auto rounded-lg bg-panel p-3 text-[12px] leading-5" data-testid="alinhamento-texto">
                  {texto}
                </pre>
              )}
              <p className="text-xs text-muted">
                “|” letras idênticas{proteina ? "; “:” diferentes, mas com pontuação positiva na BLOSUM62 (parecidas)" : ""}. Identidade e similaridade são sobre o
                comprimento do alinhamento, contando as lacunas, como no EMBOSS. Pode haver outros alinhamentos com a mesma pontuação.
              </p>
              <div className="flex flex-wrap gap-2">
                <BotaoLeve onClick={() => baixar(nomeDeArquivo(`alinhamento-${res.nomes[0]}-${res.nomes[1]}`, "txt"), cabecalho(res.r, esquema, res.nomes) + texto)}>Baixar .txt</BotaoLeve>
                <BotaoLeve
                  onClick={() =>
                    baixar(nomeDeArquivo(`alinhamento-${res.nomes[0]}-${res.nomes[1]}`, "json"), paraJson({ gerado_por: "GenoLab BioMol", sequencias: res.nomes, esquema, ...res.r }), "application/json")
                  }
                >
                  Baixar .json
                </BotaoLeve>
              </div>
            </div>
          )}
        </>
      )}
    </Secao>
  );
}

function cabecalho(r: ResultadoAlinhamento, e: Esquema, nomes: [string, string]): string {
  return [
    `# GenoLab BioMol — alinhamento ${r.modo === "global" ? "global (Needleman–Wunsch)" : "local (Smith–Waterman)"}, lacunas afins (Gotoh)`,
    `# A: ${nomes[0]}`,
    `# B: ${nomes[1]}`,
    `# Pontuação: ${e.tipo === "blosum62" ? "BLOSUM62" : `igual ${e.acerto}, diferente ${e.erro}`}; abrir lacuna ${e.abertura}; estender ${e.extensao}`,
    `# Score: ${r.pontuacao}  Identidade: ${r.identicos}/${r.comprimento} (${r.identidade.toFixed(1)}%)  Similaridade: ${r.similares}/${r.comprimento} (${r.similaridade.toFixed(1)}%)  Lacunas: ${r.lacunas}`,
    "",
    "",
  ].join("\n");
}

function Campo({ rotulo, valor, aoMudar, min }: { rotulo: string; valor: number; aoMudar: (v: number) => void; min?: number }) {
  return (
    <label className="grid gap-0.5 text-xs text-muted">
      {rotulo}
      <input
        type="number"
        step="0.5"
        min={min}
        value={valor}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) aoMudar(v);
        }}
        className="min-h-9 w-24 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink tabular-nums"
      />
    </label>
  );
}

function Dado({ rotulo, valor, nota, testid }: { rotulo: string; valor: string; nota?: string; testid?: string }) {
  return (
    <div className="rounded-lg border border-line p-2" data-testid={testid}>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="font-semibold tabular-nums">{valor}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  );
}
