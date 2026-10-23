"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { VisualKindBadge } from "@/components/ui/Badges";
import { emBlocos } from "@/lib/biomol/alinhamento";
import { compararCadeias, type Comparacao, type OpcoesComparacao } from "@/lib/biomol/comparar";
import { nomeDeArquivo, paraCsv, paraJson } from "@/lib/biomol/exportar";
import { baixar, BotaoLeve, corDoToken, num, Secao, Segmentado } from "../comum";
import type { Carregado, FonteEstrutura } from "../visor/VisorMolecular";
import type { MotorMolecular } from "../visor/motor";
import { tresLetras } from "../visor/nomes";

const VisorMolecular = dynamic(() => import("../visor/VisorMolecular").then((m) => m.VisorMolecular), {
  ssr: false,
  loading: () => <div className="grid h-[clamp(420px,66vh,760px)] place-items-center rounded-2xl border border-line bg-panel text-[13px] text-muted">Carregando o visualizador…</div>,
});

/** Pares de exemplo, todos conferidos no RCSB (título, método, cadeias). */
const EXEMPLOS = [
  { a: "1LYZ", b: "1LZ1", rotulo: "Lisozima: galinha × humana", dica: "mesma família, espécies diferentes — o alinhamento acha a inserção" },
  { a: "2HHB", b: "1HHO", rotulo: "Hemoglobina: sem O₂ × com O₂", dica: "a mesma proteína humana em dois estados" },
  { a: "1CRN", b: "1EJG", rotulo: "Crambina: duas medições", dica: "a mesma proteína, depositada em 1981 e em 2000" },
];

const IDENTIDADE = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const hexParaNumero = (h: string) => parseInt(h.replace("#", "").slice(0, 6), 16);

type Lado = { fonte: FonteEstrutura; texto: string };

export function Comparar() {
  const [a, setA] = useState<Lado>({ fonte: { tipo: "pdb", id: "1LYZ" }, texto: "1LYZ" });
  const [b, setB] = useState<Lado>({ fonte: { tipo: "pdb", id: "1LZ1" }, texto: "1LZ1" });
  const [carregados, setCarregados] = useState<Carregado[]>([]);
  const [motor, setMotor] = useState<MotorMolecular | null>(null);
  const [cadA, setCadA] = useState("");
  const [cadB, setCadB] = useState("");
  const [opcoes, setOpcoes] = useState<OpcoesComparacao>({ modo: "global", pares: "alinhados" });
  const [res, setRes] = useState<Comparacao | null>(null);
  const [aplicada, setAplicada] = useState(false);
  const [erro, setErro] = useState("");
  const [cores, setCores] = useState<[number, number] | undefined>(undefined);

  useEffect(() => setCores([hexParaNumero(corDoToken("accent")), hexParaNumero(corDoToken("violet"))]), []);

  const cadeiasA = carregados[0]?.cadeias.filter((c) => c.tipo !== "outro") ?? [];
  const cadeiasB = carregados[1]?.cadeias.filter((c) => c.tipo !== "outro") ?? [];
  useEffect(() => {
    setRes(null);
    setAplicada(false);
    setCadA(cadeiasA[0]?.id ?? "");
    const mesmoTipo = cadeiasB.find((c) => (c.tipo === "proteina") === (cadeiasA[0]?.tipo === "proteina"));
    setCadB(mesmoTipo?.id ?? cadeiasB[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregados]);

  const fontes = useMemo(() => [a.fonte, b.fonte], [a.fonte, b.fonte]);

  const superporAgora = async () => {
    setErro("");
    const ca = cadeiasA.find((c) => c.id === cadA);
    const cb = cadeiasB.find((c) => c.id === cadB);
    if (!ca || !cb) return setErro("Escolha uma cadeia de cada estrutura.");
    try {
      const r = compararCadeias(ca, cb, opcoes);
      setRes(r);
      if (r.superposicao && motor) {
        await motor.transformar(1, r.superposicao.matriz);
        motor.enquadrar();
        setAplicada(true);
      }
    } catch (e) {
      setRes(null);
      setErro((e as Error).message);
    }
  };

  const desfazer = async () => {
    if (!motor) return;
    await motor.transformar(1, IDENTIDADE);
    motor.enquadrar();
    setAplicada(false);
  };

  const nomeA = carregados[0]?.rotulo ?? "A";
  const nomeB = carregados[1]?.rotulo ?? "B";

  return (
    <div className="grid gap-4" data-testid="comparar">
      <Secao titulo="Escolha as duas estruturas" id="comparar-escolha">
        <ul className="flex flex-wrap gap-1.5">
          {EXEMPLOS.map((e) => (
            <li key={e.a + e.b}>
              <button
                type="button"
                title={e.dica}
                onClick={() => {
                  setA({ fonte: { tipo: "pdb", id: e.a }, texto: e.a });
                  setB({ fonte: { tipo: "pdb", id: e.b }, texto: e.b });
                }}
                data-exemplo={`${e.a}-${e.b}`}
                className="ge-press rounded-full border border-line px-3 py-1.5 text-[13px] hover:bg-surface-2"
              >
                {e.rotulo} <span className="text-muted">· {e.a} × {e.b}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <EscolhaLado titulo="Estrutura A (fica parada)" tom="accent" lado={a} aoMudar={setA} testid="lado-a" />
          <EscolhaLado titulo="Estrutura B (é movida sobre a A)" tom="violet" lado={b} aoMudar={setB} testid="lado-b" />
        </div>
      </Secao>

      {cores && (
        <VisorMolecular
          fontes={fontes}
          cores={cores}
          aoCarregar={setCarregados}
          aoMotor={setMotor}
          testid="visor-comparar"
          selo={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <VisualKindBadge kind="dados" />
              <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
                <span className="text-accent-ink">■</span> {nomeA} · <span className="text-violet">■</span> {nomeB}
                {aplicada ? " · B superposta" : " · como depositadas"}
              </span>
            </span>
          }
          legenda={
            <p className="text-xs text-muted">
              Azul: {nomeA} (parada). Violeta: {nomeB}
              {aplicada ? ", girada e deslocada pela superposição. Só a posição de B mudou; a forma de cada uma é a do arquivo." : ", na posição em que foi depositada (cada arquivo tem seu próprio referencial)."}
            </p>
          }
        />
      )}

      <Secao titulo="Superposição e RMSD" id="comparar-rmsd">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="grid gap-0.5 text-xs text-muted">
            Cadeia de {nomeA}
            <select value={cadA} onChange={(e) => setCadA(e.target.value)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink" data-testid="cadeia-a">
              {cadeiasA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.tipo === "proteina" ? "proteína" : c.tipo.toUpperCase()} · {c.sequencia.length}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-0.5 text-xs text-muted">
            Cadeia de {nomeB}
            <select value={cadB} onChange={(e) => setCadB(e.target.value)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink" data-testid="cadeia-b">
              {cadeiasB.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.tipo === "proteina" ? "proteína" : c.tipo.toUpperCase()} · {c.sequencia.length}
                </option>
              ))}
            </select>
          </label>
          <Segmentado
            rotulo="Alinhamento"
            valor={opcoes.modo}
            aoMudar={(modo) => setOpcoes({ ...opcoes, modo })}
            opcoes={[
              { valor: "global", rotulo: "global", dica: "Needleman–Wunsch: as cadeias inteiras" },
              { valor: "local", rotulo: "local", dica: "Smith–Waterman: o melhor trecho em comum" },
            ]}
          />
          <Segmentado
            rotulo="Pares usados"
            valor={opcoes.pares}
            aoMudar={(pares) => setOpcoes({ ...opcoes, pares })}
            opcoes={[
              { valor: "alinhados", rotulo: "todos os alinhados" },
              { valor: "identicos", rotulo: "só idênticos" },
            ]}
          />
          <button
            type="button"
            onClick={() => void superporAgora()}
            disabled={!cadA || !cadB}
            className="ge-press min-h-10 rounded-full bg-action px-5 text-[14px] font-semibold text-white disabled:opacity-50"
            data-testid="superpor"
          >
            Superpor
          </button>
          {aplicada && (
            <BotaoLeve onClick={() => void desfazer()} data-testid="desfazer-superposicao">
              Voltar às posições depositadas
            </BotaoLeve>
          )}
        </div>
        <p className="text-xs text-muted">
          Como funciona: as sequências das duas cadeias são alinhadas; cada posição alinhada vira um par de átomos (Cα nas proteínas, C4' nos ácidos nucleicos); então B
          é girada e deslocada para ficar o mais perto possível de A (superposição de Kabsch/Horn). O RMSD é a distância média quadrática entre os pares depois disso —
          nenhum par é descartado.
        </p>
        {erro && (
          <p className="text-sm text-danger" role="alert">
            {erro}
          </p>
        )}
        {res && <Resultado res={res} nomes={[nomeA, nomeB]} motor={motor} />}
      </Secao>
    </div>
  );
}

function EscolhaLado({ titulo, tom, lado, aoMudar, testid }: { titulo: string; tom: "accent" | "violet"; lado: Lado; aoMudar: (l: Lado) => void; testid: string }) {
  const [texto, setTexto] = useState(lado.texto);
  const [erro, setErro] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);
  useEffect(() => setTexto(lado.texto), [lado.texto]);
  return (
    <form
      className="grid gap-1.5 rounded-xl border border-line p-3"
      data-testid={testid}
      onSubmit={(e) => {
        e.preventDefault();
        const id = texto.trim().toUpperCase();
        if (!/^[0-9][A-Z0-9]{3}$/.test(id)) return setErro("Código PDB tem 4 caracteres e começa por número (ex.: 1LYZ).");
        setErro("");
        aoMudar({ fonte: { tipo: "pdb", id }, texto: id });
      }}
    >
      <p className="text-sm font-semibold">
        <span className={tom === "accent" ? "text-accent-ink" : "text-violet"}>■</span> {titulo}
      </p>
      <div className="flex gap-1.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="código PDB"
          aria-label={`${titulo}: código PDB`}
          className="ge-mono min-h-9 w-28 rounded-lg border border-line bg-surface px-2 text-[13px] uppercase text-ink"
        />
        <button type="submit" className="ge-press rounded-full border border-line px-3 text-[13px] hover:bg-surface-2">
          Carregar
        </button>
        <button type="button" onClick={() => arquivo.current?.click()} className="ge-press rounded-full border border-line px-3 text-[13px] hover:bg-surface-2">
          Arquivo…
        </button>
        <input
          ref={arquivo}
          type="file"
          accept=".pdb,.ent,.cif,.mmcif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 30 * 1024 * 1024) return setErro("Arquivo acima de 30 MB.");
            aoMudar({ fonte: { tipo: "texto", nome: f.name, texto: await f.text() }, texto: f.name });
            e.target.value = "";
          }}
        />
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      {lado.fonte.tipo === "texto" && <p className="text-xs text-muted">Arquivo lido no navegador, não enviado.</p>}
    </form>
  );
}

function Resultado({ res, nomes, motor }: { res: Comparacao; nomes: [string, string]; motor: MotorMolecular | null }) {
  const s = res.superposicao;
  const [par, setPar] = useState<number | null>(null);
  const texto = useMemo(() => emBlocos(res.alinhamento, [nomes[0], nomes[1]]), [res, nomes]);

  const escolher = async (i: number) => {
    setPar(i);
    const p = res.pares[i];
    if (!motor) return;
    await motor.destacar([
      { estrutura: 0, cadeia: p.a.cadeia, de: p.a.numero, ate: p.a.numero },
      { estrutura: 1, cadeia: p.b.cadeia, de: p.b.numero, ate: p.b.numero },
    ]);
    motor.focarRegiao({ estrutura: 0, cadeia: p.a.cadeia, de: p.a.numero, ate: p.a.numero });
  };

  const exportar = (fmt: "csv" | "json") => {
    const linhas = res.pares.map((p, i) => ({
      n: i + 1,
      cadeia_a: p.a.cadeia,
      residuo_a: `${p.a.nome}${p.a.numero}${p.a.insercao}`,
      cadeia_b: p.b.cadeia,
      residuo_b: `${p.b.nome}${p.b.numero}${p.b.insercao}`,
      identico: p.identico,
      desvio_angstrom: s ? Number(s.desvios[i].toFixed(3)) : null,
    }));
    const base = nomeDeArquivo(`superposicao-${nomes[0]}-${nomes[1]}`, fmt);
    if (fmt === "csv") baixar(base, paraCsv(["n", "cadeia_a", "residuo_a", "cadeia_b", "residuo_b", "identico", "desvio_angstrom"], linhas), "text/csv");
    else
      baixar(
        base,
        paraJson({
          gerado_por: "GenoLab BioMol",
          estruturas: { a: nomes[0], b: nomes[1], movida: "b" },
          metodo: { correspondencia: `alinhamento ${res.alinhamento.modo}`, atomo: res.atomo, superposicao: "quatérnio de Horn (equivalente a Kabsch)" },
          rmsd_angstrom: s?.rmsd ?? null,
          rmsd_antes_angstrom: s?.rmsdAntes ?? null,
          pares: res.pares.length,
          identidade_pct: res.alinhamento.identidade,
          matriz_4x4_colunas: s?.matriz ?? null,
          avisos: res.avisos,
          correspondencia: linhas,
        }),
        "application/json",
      );
  };

  return (
    <div className="grid gap-3" data-testid="resultado-superposicao">
      {s ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Numero rotulo="RMSD depois de superpor" valor={`${num(s.rmsd, 2)} Å`} nota={`sobre ${s.n} pares de ${res.atomo}`} testid="rmsd" destaque />
          <Numero rotulo="Antes (como depositadas)" valor={`${num(s.rmsdAntes, 2)} Å`} nota="cada arquivo tem seu referencial" />
          <Numero rotulo="Identidade no alinhamento" valor={`${num(res.alinhamento.identidade, 1)}%`} nota={`${res.alinhamento.identicos}/${res.alinhamento.comprimento}`} />
          <Numero rotulo={`Cobertura de ${nomes[0]}`} valor={`${num(100 * res.coberturaA, 0)}%`} />
          <Numero rotulo={`Cobertura de ${nomes[1]}`} valor={`${num(100 * res.coberturaB, 0)}%`} />
        </dl>
      ) : null}
      {res.avisos.map((a) => (
        <p key={a} className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="status" data-testid="aviso-superposicao">
          {a}
        </p>
      ))}
      {s && <Desvios res={res} escolhido={par} aoEscolher={(i) => void escolher(i)} />}
      {par !== null && s && (
        <p className="text-sm" aria-live="polite">
          Par {par + 1}: {tresLetras(res.pares[par].a.nome)} {res.pares[par].a.numero} ({nomes[0]}) ↔ {tresLetras(res.pares[par].b.nome)} {res.pares[par].b.numero} ({nomes[1]}) —{" "}
          {num(s.desvios[par], 2)} Å depois de superpor.
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-accent-ink">Ver o alinhamento que definiu os pares</summary>
        <pre className="ge-mono mt-2 max-h-80 overflow-auto rounded-lg bg-panel p-3 text-[12px] leading-5" data-testid="alinhamento-superposicao">
          {texto}
        </pre>
      </details>
      <div className="flex flex-wrap gap-2">
        <BotaoLeve onClick={() => exportar("csv")} data-testid="superposicao-csv">
          Baixar pares e desvios (.csv)
        </BotaoLeve>
        <BotaoLeve onClick={() => exportar("json")}>Baixar tudo (.json)</BotaoLeve>
      </div>
    </div>
  );
}

function Numero({ rotulo, valor, nota, testid, destaque }: { rotulo: string; valor: string; nota?: string; testid?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${destaque ? "border-accent" : "border-line"}`} data-testid={testid}>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  );
}

/** Desvio de cada par depois da superposição, na ordem do alinhamento. Uma série só: sem legenda. */
function Desvios({ res, escolhido, aoEscolher }: { res: Comparacao; escolhido: number | null; aoEscolher: (i: number) => void }) {
  const d = res.superposicao!.desvios;
  const max = Math.max(...d, 1);
  const L = 1000;
  const H = 150;
  const w = (L - 50) / d.length;
  const marcas = [0, max / 2, max];
  return (
    <figure className="grid gap-1">
      <figcaption className="text-sm font-semibold">Distância entre os pares depois de superpor (Å), ao longo da cadeia</figcaption>
      <svg viewBox={`0 0 ${L} ${H + 24}`} className="w-full" role="img" aria-label={`Desvio por par: de ${num(Math.min(...d), 2)} a ${num(max, 2)} Å`} data-testid="grafico-desvios">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={44} x2={L} y1={H - (m / max) * (H - 8)} y2={H - (m / max) * (H - 8)} stroke="var(--line)" />
            <text x={38} y={H - (m / max) * (H - 8) + 4} textAnchor="end" fontSize="11" className="fill-muted" fontFamily="var(--font-mono)">
              {num(m, 1)}
            </text>
          </g>
        ))}
        {d.map((v, i) => {
          const h = Math.max(1, (v / max) * (H - 8));
          return (
            <g key={i} onClick={() => aoEscolher(i)} className="cursor-pointer">
              <title>{`${res.pares[i].a.nome} ${res.pares[i].a.numero} ↔ ${res.pares[i].b.nome} ${res.pares[i].b.numero}: ${num(v, 2)} Å`}</title>
              <rect x={50 + i * w} y={0} width={Math.max(w, 2)} height={H} fill="transparent" />
              <rect x={50 + i * w + Math.min(1, w * 0.15)} y={H - h} width={Math.max(w - Math.min(2, w * 0.3), 1)} height={h} rx={Math.min(2, w / 3)} fill={escolhido === i ? "var(--warn)" : "var(--accent)"} />
            </g>
          );
        })}
        <text x={50} y={H + 18} fontSize="11" className="fill-muted" fontFamily="var(--font-mono)">
          par 1
        </text>
        <text x={L} y={H + 18} textAnchor="end" fontSize="11" className="fill-muted" fontFamily="var(--font-mono)">
          par {d.length}
        </text>
      </svg>
      <p className="text-xs text-muted">Barras altas = regiões onde as duas estruturas diferem mais (alças móveis, pontas, trocas de aminoácido). Clique numa barra para ver o par no 3D.</p>
    </figure>
  );
}
