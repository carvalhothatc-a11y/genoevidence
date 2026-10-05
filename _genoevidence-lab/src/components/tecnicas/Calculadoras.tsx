"use client";
import { useState } from "react";
import { ddct, formatarRazao, razaoCorrigida, validarCt, validarEficiencia, type CtPar } from "@/lib/models/qpcr";
import { EXEMPLO_FICTICIO, tpm, type GeneContagem } from "@/lib/models/rnaseq";
import { volumeParaMassa, MASSA_PADRAO_UG, TAMPAO_UL, TOTAL_SUGERIDO_UL } from "@/lib/models/proteina";
import { bandPosition, ILLUSTRATIVE_LADDER_BP } from "@/lib/models/pcr";
import type { CalculadoraId } from "@/lib/modules/tecnicas/tipos";
import type { ModelCard } from "@/lib/modules/contract";
import { SourceList } from "@/components/sources/SourceList";

const campo = "w-full rounded-lg border border-white/15 bg-[#060a13]/60 px-3 py-2 text-white";
const rotulo = "grid gap-1 text-[13px] text-[#c9d2e3]";

function Resultado({ children, aviso }: { children: React.ReactNode; aviso?: string | null }) {
  return (
    <div className="mt-3 grid gap-1 rounded-xl border border-[#b49cf5]/40 bg-[#7b4de0]/10 p-3" role="status">
      {children}
      {aviso && <p className="text-[12px] text-[#ffd08a]">{aviso}</p>}
    </div>
  );
}

/** Cartão do modelo: equação, parâmetros, pressupostos, limites e o que NÃO prevê. */
export function CartaoModelo({ m }: { m: ModelCard }) {
  return (
    <details className="rounded-xl border border-[#b49cf5]/30 bg-[#7b4de0]/[0.07] p-3 text-[13px] text-[#c9d2e3]">
      <summary className="cursor-pointer font-semibold text-white">Cartão do modelo: {m.name}</summary>
      <dl className="mt-2 grid gap-2">
        <div>
          <dt className="font-semibold text-white">Equação</dt>
          <dd className="ge-mono text-[12px]">{m.equation}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Parâmetros</dt>
          <dd>
            <ul className="list-disc pl-5">
              {m.parameters.map((p) => (
                <li key={p.id}>
                  {p.label}
                  {p.unit ? ` (${p.unit})` : ""} — {p.range} ({p.source === "usuario" ? "informado por você" : p.source === "fixo" ? "fixo no modelo" : "da referência"})
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Pressupostos</dt>
          <dd>
            <ul className="list-disc pl-5">{m.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Domínio de validade</dt>
          <dd>{m.validity}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Limitações</dt>
          <dd>
            <ul className="list-disc pl-5">{m.limitations.map((a) => <li key={a}>{a}</li>)}</ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Não prevê</dt>
          <dd>{m.doesNotPredict.join("; ")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Implementação</dt>
          <dd className="ge-mono text-[12px]">{m.implementation}</dd>
        </div>
        {m.refs && m.refs.length > 0 && (
          <div>
            <dt className="font-semibold text-white">Fontes</dt>
            <dd>
              <SourceList refs={m.refs} compact />
            </dd>
          </div>
        )}
      </dl>
    </details>
  );
}

// ---------------------------------------------------------------- ΔΔCt e razão corrigida

function Ddct() {
  const [a, setA] = useState<CtPar>({ alvo: 22.5, referencia: 19.8 });
  const [r, setR] = useState<CtPar>({ alvo: 24.1, referencia: 19.6 });
  const [corrigir, setCorrigir] = useState(false);
  const [eAlvo, setEAlvo] = useState(0.95);
  const [eRef, setERef] = useState(0.88);
  const erros = [a.alvo, a.referencia, r.alvo, r.referencia].map(validarCt).filter(Boolean) as string[];
  const errosEf = corrigir ? ([eAlvo, eRef].map(validarEficiencia).filter(Boolean) as string[]) : [];
  const ok = !erros.length && !errosEf.length;
  const res = ok ? ddct(a, r) : null;
  const razao = ok && corrigir ? razaoCorrigida(a, r, eAlvo, eRef) : null;
  const num = (v: number, set: (n: number) => void, label: string, step = 0.1) => (
    <label className={rotulo}>
      <span>{label}</span>
      <input type="number" step={step} value={v} onChange={(e) => set(Number(e.target.value))} className={campo} />
    </label>
  );
  return (
    <div className="grid gap-3" data-testid="calc-ddct">
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="grid gap-2 rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-[13px] font-semibold text-white">Amostra-alvo (ex.: tratada)</legend>
          {num(a.alvo, (n) => setA({ ...a, alvo: n }), "Ct do gene-alvo")}
          {num(a.referencia, (n) => setA({ ...a, referencia: n }), "Ct do gene de referência")}
        </fieldset>
        <fieldset className="grid gap-2 rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-[13px] font-semibold text-white">Amostra de referência (ex.: controle)</legend>
          {num(r.alvo, (n) => setR({ ...r, alvo: n }), "Ct do gene-alvo")}
          {num(r.referencia, (n) => setR({ ...r, referencia: n }), "Ct do gene de referência")}
        </fieldset>
      </div>
      <label className="flex items-start gap-2 text-[13px] text-[#c9d2e3]">
        <input type="checkbox" className="mt-1" checked={corrigir} onChange={(e) => setCorrigir(e.target.checked)} data-testid="usar-eficiencia" />
        <span>Também calcular a razão corrigida pelas eficiências que eu medi</span>
      </label>
      {corrigir && (
        <div className="grid gap-3 sm:grid-cols-2">
          {num(eAlvo, setEAlvo, "Eficiência do gene-alvo (1 = 100%)", 0.01)}
          {num(eRef, setERef, "Eficiência do gene de referência (1 = 100%)", 0.01)}
        </div>
      )}
      {erros.length > 0 && <p className="text-[13px] text-[#ff8aa4]" role="alert">{erros[0]}</p>}
      {errosEf.length > 0 && <p className="text-[13px] text-[#ff8aa4]" role="alert">{errosEf[0]}</p>}
      {res && (
        <Resultado aviso={corrigir && razao !== null ? "Os dois números vêm de pressupostos diferentes. Se eles divergem muito, a hipótese de eficiência de 100% não se sustenta para os seus dados." : null}>
          <p className="text-[13px] text-[#c9d2e3]">
            ΔCt da amostra-alvo: <strong className="text-white">{formatarRazao(res.dctAmostra)}</strong> · ΔCt da amostra de referência: <strong className="text-white">{formatarRazao(res.dctReferencia)}</strong> · ΔΔCt:{" "}
            <strong className="text-white">{formatarRazao(res.ddct)}</strong>
          </p>
          <p className="text-[15px] text-white" data-testid="resultado-ddct">
            2^−ΔΔCt = <strong>{formatarRazao(res.mudanca)}</strong> <span className="text-[13px] text-[#a7b2c8]">(eficiência de 100% em todas as reações)</span>
          </p>
          {razao !== null && (
            <p className="text-[15px] text-white" data-testid="resultado-razao">
              Razão corrigida = <strong>{formatarRazao(razao)}</strong> <span className="text-[13px] text-[#a7b2c8]">(com as eficiências informadas)</span>
            </p>
          )}
          <p className="text-[12px] text-[#a7b2c8]">É uma mudança relativa, sem unidade. Não é porcentagem de sucesso, nem significância estatística.</p>
        </Resultado>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- volume de extrato (Western)

function VolumeProteina() {
  const [massa, setMassa] = useState(MASSA_PADRAO_UG);
  const [conc, setConc] = useState(2.5);
  const [total, setTotal] = useState(TOTAL_SUGERIDO_UL);
  const valido = massa > 0 && conc > 0 && total > 0;
  const res = valido ? volumeParaMassa(massa, conc, total, TAMPAO_UL) : null;
  return (
    <div className="grid gap-3" data-testid="calc-volume">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={rotulo}>
          <span>Massa por poço (µg)</span>
          <input type="number" step={1} min={0} value={massa} onChange={(e) => setMassa(Number(e.target.value))} className={campo} />
        </label>
        <label className={rotulo}>
          <span>Concentração medida (µg/µL)</span>
          <input type="number" step={0.1} min={0} value={conc} onChange={(e) => setConc(Number(e.target.value))} className={campo} />
        </label>
        <label className={rotulo}>
          <span>Volume total por canaleta (µL)</span>
          <input type="number" step={1} min={0} value={total} onChange={(e) => setTotal(Number(e.target.value))} className={campo} />
        </label>
      </div>
      {!valido && <p className="text-[13px] text-[#ff8aa4]" role="alert">Informe números maiores que zero.</p>}
      {res && (
        <Resultado aviso={res.cabe ? null : "Com esses valores o extrato não cabe na canaleta: concentre a amostra ou use um volume total maior."}>
          <p className="text-[15px] text-white" data-testid="resultado-volume">
            Extrato: <strong>{res.volumeExtratoUl.toFixed(1).replace(".", ",")} µL</strong>
            {res.aguaUl !== null && (
              <>
                {" "}· tampão de amostra: <strong>{TAMPAO_UL} µL</strong> · água: <strong>{res.aguaUl.toFixed(1).replace(".", ",")} µL</strong>
              </>
            )}
          </p>
          <p className="text-[12px] text-[#a7b2c8]">Conta de proporção. Não prevê a intensidade do sinal nem corrige erro na medida da concentração.</p>
        </Resultado>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- TPM

function Tpm() {
  const [genes, setGenes] = useState<GeneContagem[]>(EXEMPLO_FICTICIO);
  const mudar = (i: number, campoNome: keyof GeneContagem, valor: string) =>
    setGenes(genes.map((g, j) => (j === i ? { ...g, [campoNome]: campoNome === "id" ? valor : Number(valor) } : g)));
  let linhas: ReturnType<typeof tpm> | null = null;
  let erro: string | null = null;
  try {
    linhas = tpm(genes);
  } catch (e) {
    erro = e instanceof Error ? e.message : "Confira os valores.";
  }
  return (
    <div className="grid gap-3" data-testid="calc-tpm">
      <div className="grid gap-2">
        {genes.map((g, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <label className={rotulo}>
              <span className="sr-only">Nome do gene {i + 1}</span>
              <input value={g.id} onChange={(e) => mudar(i, "id", e.target.value)} className={campo} aria-label={`Nome do gene ${i + 1}`} />
            </label>
            <label className={rotulo}>
              <span className="sr-only">Leituras do gene {i + 1}</span>
              <input type="number" min={0} step={1} value={g.leituras} onChange={(e) => mudar(i, "leituras", e.target.value)} className={`${campo} sm:w-36`} aria-label={`Leituras do gene ${i + 1}`} />
            </label>
            <label className={rotulo}>
              <span className="sr-only">Comprimento do gene {i + 1} em pares de base</span>
              <input type="number" min={1} step={1} value={g.comprimentoPb} onChange={(e) => mudar(i, "comprimentoPb", e.target.value)} className={`${campo} sm:w-36`} aria-label={`Comprimento do gene ${i + 1} em pares de base`} />
            </label>
          </div>
        ))}
        <p className="text-[12px] text-[#a7b2c8]">Colunas: nome · leituras mapeadas · comprimento (pb). Os valores iniciais são fictícios, só para ensino.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setGenes([...genes, { id: `GENE_${genes.length + 1} (fictício)`, leituras: 100, comprimentoPb: 1000 }])} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
            Acrescentar gene
          </button>
          {genes.length > 1 && (
            <button type="button" onClick={() => setGenes(genes.slice(0, -1))} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
              Remover o último
            </button>
          )}
        </div>
      </div>
      {erro && <p className="text-[13px] text-[#ff8aa4]" role="alert">{erro}</p>}
      {linhas && (
        <Resultado aviso="Estes TPM valem dentro deste conjunto de genes. Numa amostra real o cálculo usa todos os genes anotados, e valores de amostras diferentes não são comparáveis só por serem TPM.">
          <table className="w-full text-left text-[13px] text-[#c9d2e3]">
            <thead>
              <tr className="text-[12px] text-[#a7b2c8]">
                <th scope="col" className="py-1">Gene</th>
                <th scope="col">Leituras por kb</th>
                <th scope="col">TPM</th>
              </tr>
            </thead>
            <tbody data-testid="resultado-tpm">
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-white/10">
                  <td className="py-1 pr-2">{l.id}</td>
                  <td className="pr-2">{l.taxa.toFixed(1).replace(".", ",")}</td>
                  <td className="font-semibold text-white">{Math.round(l.tpm).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Resultado>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- posição de banda no gel

function PosicaoBanda() {
  const [bp, setBp] = useState(500);
  const pos = bandPosition(bp);
  const maior = Math.max(...ILLUSTRATIVE_LADDER_BP);
  const menor = Math.min(...ILLUSTRATIVE_LADDER_BP);
  const W = 260;
  const H = 300;
  const y = (f: number) => 20 + f * (H - 50);
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr]" data-testid="calc-banda">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-[220px]" role="img" aria-label={`Gel ilustrativo com marcador de ${menor} a ${maior} pares de base e a posição hipotética de ${bp} pares de base.`}>
        <rect x={16} y={14} width={W - 32} height={H - 40} rx={8} fill="rgba(77,124,255,0.10)" stroke="rgba(255,255,255,0.25)" />
        <text x={W - 24} y={28} fontSize={12} fill="#a7b2c8" textAnchor="end">−</text>
        <text x={W - 24} y={H - 32} fontSize={12} fill="#e679b5" textAnchor="end">+</text>
        {ILLUSTRATIVE_LADDER_BP.map((b) => {
          const f = bandPosition(b)!;
          return (
            <g key={b}>
              <rect x={30} y={y(f) - 2} width={70} height={4} rx={2} fill="#9db4ff" opacity={0.9} />
              <text x={104} y={y(f) + 4} fontSize={10} fill="#a7b2c8">{b}</text>
            </g>
          );
        })}
        {pos !== null && <rect x={150} y={y(pos) - 3} width={70} height={6} rx={3} fill="none" stroke="#e679b5" strokeWidth={1.6} strokeDasharray="4 3" />}
        <text x={65} y={H - 12} fontSize={10} fill="#a7b2c8" textAnchor="middle">marcador</text>
        <text x={185} y={H - 12} fontSize={10} fill="#a7b2c8" textAnchor="middle">amostra</text>
      </svg>
      <div className="grid content-start gap-3">
        <label className={rotulo}>
          <span>Tamanho do fragmento (pb)</span>
          <input type="number" min={1} step={10} value={bp} onChange={(e) => setBp(Number(e.target.value))} className={campo} />
        </label>
        {pos === null ? (
          <p className="text-[13px] text-[#ffd08a]" role="status" data-testid="resultado-banda">
            {bp} pb está fora da faixa do marcador ilustrativo ({menor}–{maior} pb): a posição não é desenhada.
          </p>
        ) : (
          <Resultado>
            <p className="text-[15px] text-white" data-testid="resultado-banda">
              Uma banda de <strong>{bp} pb</strong> apareceria a cerca de <strong>{Math.round(pos * 100)}%</strong> do caminho entre o poço e o fim do gel.
            </p>
            <p className="text-[12px] text-[#a7b2c8]">Contorno tracejado: onde a banda estaria SE o fragmento estivesse presente. Presença e intensidade não são previstas.</p>
          </Resultado>
        )}
      </div>
    </div>
  );
}

const TITULO: Record<CalculadoraId, string> = {
  ddct: "Calcular ΔCt, ΔΔCt e a razão",
  volume_proteina: "Calcular o volume de extrato por poço",
  tpm: "Calcular TPM a partir de contagens",
  posicao_banda: "Estimar a posição da banda no gel",
};

export function Calculadora({ id, modelos }: { id: CalculadoraId; modelos: ModelCard[] }) {
  const m = modelos.find((x) => x.id === id || (id === "ddct" && x.id === "razao_corrigida"));
  return (
    <section className="grid gap-3 rounded-2xl border border-white/12 bg-[#0f182b]/70 p-4" aria-label={TITULO[id]} data-calculadora={id}>
      <h3 className="text-[15px] font-semibold text-white">{TITULO[id]}</h3>
      {id === "ddct" && <Ddct />}
      {id === "volume_proteina" && <VolumeProteina />}
      {id === "tpm" && <Tpm />}
      {id === "posicao_banda" && <PosicaoBanda />}
      <div className="grid gap-2">
        {modelos
          .filter((x) => (id === "ddct" ? x.id === "ddct" || x.id === "razao_corrigida" : x.id === id))
          .map((x) => (
            <CartaoModelo key={x.id} m={x} />
          ))}
        {!m && <p className="text-[12px] text-[#a7b2c8]">Sem cartão de modelo cadastrado para esta conta.</p>}
      </div>
    </section>
  );
}
