"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { agrupar, detectarFormato, lerAtomos, type Atomo, type Cadeia } from "@/lib/biomol/estrutura";
import { angulo, diedro, distancia } from "@/lib/biomol/geometria";
import { nomeDeArquivo, paraCsv, paraJson } from "@/lib/biomol/exportar";
import { useUi } from "@/store/ui";
import { baixar, num } from "../comum";
import { MotorMolecular, type AtomoInfo, type Coloracao, type Representacao } from "./motor";
import { Rotulos3D, type Rotulo3D } from "./Rotulos3D";
import { NOME_ELEMENTO, nomeDoResiduo, tresLetras } from "./nomes";

export type FonteEstrutura = { tipo: "pdb"; id: string } | { tipo: "texto"; nome: string; texto: string; formato?: "mmcif" | "pdb" };

export type Carregado = { rotulo: string; cadeias: Cadeia[]; atomos: Atomo[] | null };

const SEM_ROTULOS: Rotulo3D[] = [];

/** Acima disso, o 3D funciona, mas a lista de resíduos e os cálculos próprios ficam desligados. */
const LIMITE_LEITURA = 15 * 1024 * 1024;

const REPRESENTACOES: { valor: Representacao; rotulo: string; dica: string }[] = [
  { valor: "cartoon", rotulo: "Cartoon", dica: "Fitas e hélices: mostra a estrutura secundária" },
  { valor: "bastoes", rotulo: "Bastões", dica: "Ligações como bastões finos" },
  { valor: "bola-bastao", rotulo: "Bola e bastão", dica: "Átomos e ligações" },
  { valor: "superficie", rotulo: "Superfície", dica: "Superfície molecular (acessível ao solvente)" },
  { valor: "esferas", rotulo: "Esferas", dica: "Cada átomo no seu raio de van der Waals" },
];
const CORES: { valor: Coloracao; rotulo: string }[] = [
  { valor: "cadeia", rotulo: "por cadeia" },
  { valor: "estrutura-secundaria", rotulo: "estrutura secundária" },
  { valor: "residuo", rotulo: "por resíduo / base" },
  { valor: "elemento", rotulo: "por elemento" },
  { valor: "hidrofobicidade", rotulo: "hidrofobicidade" },
];

type Medida = { id: number; tipo: "distância" | "ângulo" | "diedro"; atomos: AtomoInfo[]; valor: number; unidade: "Å" | "°" };

const rotuloAtomo = (a: AtomoInfo) => `${a.atomo} ${tresLetras(a.residuo)} ${a.numero}${a.insercao} ${a.cadeia}`;

async function textoDaFonte(f: FonteEstrutura): Promise<{ texto: string; formato: "mmcif" | "pdb"; rotulo: string }> {
  if (f.tipo === "texto") {
    const formato = f.formato ?? detectarFormato(f.texto);
    if (!formato) throw new Error(`“${f.nome}” não parece um arquivo PDB nem mmCIF.`);
    return { texto: f.texto, formato, rotulo: f.nome };
  }
  const r = await fetch(`/api/moleculas/estrutura?pdb=${encodeURIComponent(f.id)}`);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `Não foi possível baixar ${f.id} (${r.status}).`);
  }
  return { texto: await r.text(), formato: "mmcif", rotulo: f.id };
}

/**
 * Visualizador molecular da BioMol. Recebe uma ou mais estruturas e oferece: girar, aproximar e
 * mover; identificar átomo, resíduo e cadeia com um clique; trocar representação e cor; destacar e
 * isolar regiões; medir distância, ângulo e diedro; capturar imagem e exportar as medidas.
 */
export function VisorMolecular({
  fontes,
  cores,
  selo,
  legenda,
  inicial,
  rotulosExtras = SEM_ROTULOS,
  aoCarregar,
  aoMotor,
  repInicial = "cartoon",
  corInicial = "cadeia",
  testid = "visor-molecular",
}: {
  fontes: FonteEstrutura[];
  /** Cor fixa por estrutura (comparação); sem isso, usa o esquema escolhido. */
  cores?: (number | undefined)[];
  selo: ReactNode;
  legenda?: ReactNode;
  inicial?: { cadeia?: string; numero?: number };
  rotulosExtras?: Rotulo3D[];
  aoCarregar?: (c: Carregado[]) => void;
  aoMotor?: (m: MotorMolecular | null) => void;
  repInicial?: Representacao;
  corInicial?: Coloracao;
  testid?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [motor, setMotor] = useState<MotorMolecular | null>(null);
  const [estado, setEstado] = useState<{ s: "iniciando" | "carregando" | "pronto" | "erro"; msg?: string }>({ s: "iniciando" });
  const [carregados, setCarregados] = useState<Carregado[]>([]);
  const [rep, setRep] = useState<Representacao>(repInicial);
  const [cor, setCor] = useState<Coloracao>(corInicial);
  const [modo, setModo] = useState<"explorar" | "medir">("explorar");
  const [girando, setGirando] = useState(false);
  const [sel, setSel] = useState<AtomoInfo | null>(null);
  const [passando, setPassando] = useState<AtomoInfo | null>(null);
  const [escolhidos, setEscolhidos] = useState<AtomoInfo[]>([]);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [aba, setAba] = useState<"cadeias" | "medidas">("cadeias");
  const [isolada, setIsolada] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const pausado = useUi((s) => s.paused);
  const modoRef = useRef(modo);
  modoRef.current = modo;
  const proximaMedida = useRef(1);

  // cria o Mol* uma vez
  useEffect(() => {
    let m: MotorMolecular | null = null;
    let vivo = true;
    MotorMolecular.criar(tela.current!, caixa.current!)
      .then((x) => {
        if (!vivo) return x.destruir();
        m = x;
        m.movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setMotor(m);
        aoMotor?.(m);
      })
      .catch((e: Error) => setEstado({ s: "erro", msg: e.message }));
    return () => {
      vivo = false;
      aoMotor?.(null);
      m?.destruir();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // carrega as estruturas
  const chave = fontes.map((f) => (f.tipo === "pdb" ? `pdb:${f.id}` : `txt:${f.nome}:${f.texto.length}`)).join("|") + `|${(cores ?? []).join(",")}`;
  useEffect(() => {
    if (!motor) return;
    let vivo = true;
    (async () => {
      setEstado({ s: "carregando" });
      setSel(null);
      setEscolhidos([]);
      setMedidas([]);
      setIsolada(null);
      setAviso("");
      try {
        await motor.limparMedidas();
        await motor.limpar();
        const lidos = await Promise.all(fontes.map(textoDaFonte));
        if (!vivo) return;
        const out: Carregado[] = [];
        for (let i = 0; i < lidos.length; i++) {
          const l = lidos[i];
          await motor.carregar(l.texto, l.formato, l.rotulo, cores?.[i]);
          let atomos: Atomo[] | null = null;
          if (l.texto.length <= LIMITE_LEITURA) {
            try {
              atomos = lerAtomos(l.texto, l.formato);
            } catch (e) {
              setAviso(`Não foi possível ler a lista de átomos de ${l.rotulo}: ${(e as Error).message}`);
            }
          } else setAviso(`${l.rotulo} é grande: o 3D funciona, mas a lista de resíduos e os cálculos próprios ficam desligados.`);
          out.push({ rotulo: l.rotulo, atomos, cadeias: atomos ? agrupar(atomos) : [] });
        }
        if (!vivo) return;
        await motor.representar(rep, cor);
        motor.granularidade(modoRef.current === "medir" ? "element" : "residue");
        setCarregados(out);
        aoCarregar?.(out);
        setEstado({ s: "pronto" });
        motor.enquadrar();
        if (inicial?.cadeia) {
          if (inicial.numero !== undefined) motor.focarResiduo(0, inicial.cadeia, inicial.numero);
          else motor.focarRegiao({ estrutura: 0, cadeia: inicial.cadeia });
        }
      } catch (e) {
        if (vivo) setEstado({ s: "erro", msg: (e as Error).message });
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, chave]);

  // clique e passagem do mouse
  useEffect(() => {
    if (!motor) return;
    const pararClique = motor.aoClicar((a) => {
      if (!a) return;
      if (modoRef.current === "medir") {
        setEscolhidos((atual) => {
          const novo = atual.length >= 4 ? [a] : [...atual, a];
          motor.marcar(novo);
          return novo;
        });
        setAba("medidas");
      } else {
        setSel(a);
        motor.focarResiduo(a.estrutura, a.cadeia, a.numero, a.insercao);
      }
    });
    let ultimo = 0;
    const pararPassar = motor.aoPassar((a) => {
      const t = performance.now();
      if (t - ultimo < 60) return;
      ultimo = t;
      setPassando(a);
    });
    return () => {
      pararClique();
      pararPassar();
    };
  }, [motor]);

  useEffect(() => {
    if (motor && estado.s === "pronto") void motor.representar(rep, cor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep, cor]);

  useEffect(() => {
    motor?.granularidade(modo === "medir" ? "element" : "residue");
    if (modo === "medir") motor?.limparFoco();
  }, [modo, motor]);

  useEffect(() => {
    motor?.girar(girando && !pausado);
  }, [girando, pausado, motor]);

  const medir = async (n: 2 | 3 | 4) => {
    if (!motor || escolhidos.length < n) return;
    const a = escolhidos.slice(0, n);
    const valor = n === 2 ? distancia(a[0], a[1]) : n === 3 ? angulo(a[0], a[1], a[2]) : diedro(a[0], a[1], a[2], a[3]);
    const tipo = n === 2 ? "distância" : n === 3 ? "ângulo" : "diedro";
    setMedidas((m) => [...m, { id: proximaMedida.current++, tipo, atomos: a, valor, unidade: n === 2 ? "Å" : "°" }]);
    await motor.desenharMedida(a);
    setEscolhidos([]);
    motor.marcar([]);
  };

  const rotulos = useMemo<Rotulo3D[]>(() => {
    const r: Rotulo3D[] = [...rotulosExtras];
    if (modo === "explorar" && sel) r.push({ id: "sel", texto: `${tresLetras(sel.residuo)} ${sel.numero}${sel.insercao} · ${sel.cadeia}`, x: sel.x, y: sel.y, z: sel.z, tom: "accent" });
    escolhidos.forEach((a, i) => r.push({ id: `m${i}`, texto: `${i + 1} · ${a.atomo} ${tresLetras(a.residuo)}${a.numero}`, x: a.x, y: a.y, z: a.z, tom: "warn" }));
    return r;
  }, [rotulosExtras, sel, escolhidos, modo]);

  const capturar = async () => {
    if (!motor) return;
    try {
      const uri = await motor.imagem();
      const a = document.createElement("a");
      a.href = uri;
      a.download = nomeDeArquivo(`genolab-${carregados.map((c) => c.rotulo).join("-")}`, "png");
      a.click();
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  const telaCheia = () => {
    const el = area.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const exportarMedidas = (fmt: "csv" | "json") => {
    const linhas = medidas.map((m) => ({
      n: m.id,
      tipo: m.tipo,
      valor: Number(m.valor.toFixed(3)),
      unidade: m.unidade,
      atomos: m.atomos.map((a) => `${carregados[a.estrutura]?.rotulo ?? a.estrutura}:${a.cadeia}:${a.residuo}${a.numero}${a.insercao}:${a.atomo}`).join(" ; "),
    }));
    const base = nomeDeArquivo(`medidas-${carregados.map((c) => c.rotulo).join("-")}`, fmt);
    if (fmt === "csv") baixar(base, paraCsv(["n", "tipo", "valor", "unidade", "atomos"], linhas), "text/csv");
    else
      baixar(
        base,
        paraJson({ gerado_por: "GenoLab BioMol", estruturas: carregados.map((c) => c.rotulo), observacao: "Calculado a partir das coordenadas do arquivo (modelo 1).", medidas: linhas }),
        "application/json",
      );
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid={testid} data-estado={estado.s}>
      <div className="grid gap-2">
        <div ref={area} className="relative h-[clamp(420px,66vh,760px)] overflow-hidden rounded-2xl border border-line bg-panel">
          <div ref={caixa} className="absolute inset-0">
            <canvas ref={tela} className="h-full w-full" aria-label="Estrutura em 3D. Arraste para girar, role para aproximar, clique com o botão direito e arraste para mover. A lista de cadeias e resíduos ao lado dá acesso aos mesmos elementos pelo teclado." />
          </div>
          <Rotulos3D motor={estado.s === "pronto" ? motor : null} rotulos={rotulos} />

          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
            <div className="pointer-events-auto">{selo}</div>
            <div className="pointer-events-auto flex flex-wrap gap-1.5" role="toolbar" aria-label="Câmera e imagem">
              <BotaoVidro onClick={() => motor?.enquadrar()}>Enquadrar</BotaoVidro>
              <BotaoVidro onClick={() => setGirando((g) => !g)} aria-pressed={girando} title="Gira a câmera em volta da molécula. É só para olhar: não é movimento da molécula.">
                {girando ? "Parar giro" : "Girar 360°"}
              </BotaoVidro>
              <BotaoVidro onClick={() => void capturar()} data-testid="capturar">
                Imagem
              </BotaoVidro>
              <BotaoVidro onClick={telaCheia}>Tela cheia</BotaoVidro>
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <div role="radiogroup" aria-label="Modo do clique" className="flex rounded-full border border-white/15 bg-black/55 p-0.5 backdrop-blur" data-testid="modo-visor">
                {(["explorar", "medir"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={modo === m}
                    onClick={() => setModo(m)}
                    data-valor={m}
                    className={`ge-press min-h-8 rounded-full px-3 text-[12.5px] font-semibold ${modo === m ? "bg-accent text-white" : "text-white/80 hover:text-white"}`}
                  >
                    {m === "explorar" ? "Explorar" : "Medir"}
                  </button>
                ))}
              </div>
              <div role="radiogroup" aria-label="Representação" className="flex flex-wrap rounded-full border border-white/15 bg-black/55 p-0.5 backdrop-blur" data-testid="representacao">
                {REPRESENTACOES.map((r) => (
                  <button
                    key={r.valor}
                    type="button"
                    role="radio"
                    aria-checked={rep === r.valor}
                    title={r.dica}
                    onClick={() => setRep(r.valor)}
                    data-valor={r.valor}
                    className={`ge-press min-h-8 rounded-full px-2.5 text-[12.5px] ${rep === r.valor ? "bg-white/90 font-semibold text-panel" : "text-white/80 hover:text-white"}`}
                  >
                    {r.rotulo}
                  </button>
                ))}
              </div>
            </div>
            {passando && (
              <p className="ge-mono rounded-lg bg-black/60 px-2.5 py-1 text-[12px] text-white/90 backdrop-blur" aria-live="off" data-testid="passando">
                {tresLetras(passando.residuo)} {passando.numero}
                {passando.insercao} · cadeia {passando.cadeia}
                {modo === "medir" ? ` · ${passando.atomo}` : ""}
              </p>
            )}
          </div>

          {estado.s !== "pronto" && (
            <div className="absolute inset-0 grid place-items-center bg-panel/70 p-6 text-center" role="status">
              {estado.s === "erro" ? (
                <p className="max-w-md rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-ink" role="alert">
                  {estado.msg}
                </p>
              ) : (
                <p className="ge-mono text-sm text-panel-muted">{estado.s === "iniciando" ? "preparando o visualizador…" : "carregando a estrutura…"}</p>
              )}
            </div>
          )}
        </div>
        {aviso && (
          <p className="text-xs text-warn" role="status">
            {aviso}
          </p>
        )}
        {legenda}
      </div>

      <aside className="grid content-start gap-3" aria-label="Painel do visualizador">
        <PainelSelecao
          sel={sel}
          rotulo={sel ? carregados[sel.estrutura]?.rotulo : undefined}
          modo={modo}
          atomosDoResiduo={
            sel
              ? (carregados[sel.estrutura]?.cadeias
                  .find((c) => c.id === sel.cadeia)
                  ?.residuos.find((r) => r.numero === sel.numero && r.insercao === sel.insercao)
                  ?.atomos.map((a) => a.nome) ?? [])
              : []
          }
          aoUsarAtomo={(nome) => {
            if (!motor || !sel) return;
            const a = motor.atomo(sel.estrutura, sel.cadeia, sel.numero, sel.insercao, nome);
            if (!a) return;
            setEscolhidos((atual) => {
              const novo = atual.length >= 4 ? [a] : [...atual, a];
              motor.marcar(novo);
              return novo;
            });
          }}
          nEscolhidos={escolhidos.length}
          aoVerMedidas={() => setAba("medidas")}
          aoIsolarCadeia={async () => {
            if (!motor || !sel) return;
            await motor.isolar({ estrutura: sel.estrutura, cadeia: sel.cadeia });
            setIsolada(`cadeia ${sel.cadeia}`);
          }}
          aoDestacar={async () => {
            if (!motor || !sel) return;
            await motor.destacar([{ estrutura: sel.estrutura, cadeia: sel.cadeia, de: sel.numero, ate: sel.numero }]);
          }}
          aoLimpar={() => {
            setSel(null);
            motor?.limparFoco();
          }}
        />

        <div role="tablist" aria-label="Painéis" className="flex gap-1 rounded-full border border-line p-1">
          {(
            [
              ["cadeias", "Cadeias"],
              ["medidas", `Medidas${medidas.length ? ` (${medidas.length})` : ""}`],
            ] as const
          ).map(([id, r]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              data-painel={id}
              className={`ge-press min-h-9 flex-1 rounded-full text-[13px] font-medium ${aba === id ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>

        {aba === "cadeias" && (
          <PainelCadeias
            carregados={carregados}
            aoFocar={(i, r) => {
              if (!motor) return;
              const a = r.atomos.find((x) => x.nome === "CA" || x.nome === "C4'") ?? r.atomos[0];
              motor.focarResiduo(i, r.cadeia, r.numero, r.insercao);
              setSel({ estrutura: i, cadeia: r.cadeia, numero: r.numero, insercao: r.insercao, residuo: r.nome, atomo: a.nome, elemento: a.elemento, x: a.x, y: a.y, z: a.z, b: a.b, tipo: r.tipo === "aminoacido" ? "proteina" : r.tipo === "nucleotideo" ? "acido-nucleico" : r.tipo === "agua" ? "agua" : "ligante" });
            }}
            aoRegiao={async (acao, i, cadeia, de, ate) => {
              if (!motor) return;
              const reg = { estrutura: i, cadeia, de, ate };
              if (acao === "isolar") {
                await motor.isolar(reg);
                setIsolada(`cadeia ${cadeia}${de !== undefined ? ` ${de}–${ate}` : ""}`);
              } else if (acao === "destacar") await motor.destacar([reg]);
              else motor.focarRegiao(reg);
            }}
          />
        )}

        {aba === "medidas" && (
          <PainelMedidas
            modo={modo}
            escolhidos={escolhidos}
            medidas={medidas}
            nomeEstrutura={(i) => carregados[i]?.rotulo ?? ""}
            aoModoMedir={() => setModo("medir")}
            aoMedir={(n) => void medir(n)}
            aoDesfazer={() => {
              setEscolhidos([]);
              motor?.marcar([]);
            }}
            aoLimpar={async () => {
              await motor?.limparMedidas();
              setMedidas([]);
            }}
            aoExportar={exportarMedidas}
          />
        )}

        <details className="rounded-xl border border-line p-3" data-testid="aparencia">
          <summary className="cursor-pointer text-sm font-semibold">Cores</summary>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Esquema de cores">
            {CORES.map((c) => (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={cor === c.valor}
                onClick={() => setCor(c.valor)}
                data-cor={c.valor}
                disabled={Boolean(cores?.some((x) => x !== undefined))}
                className={`ge-press min-h-8 rounded-full border px-2.5 text-[12.5px] disabled:opacity-50 ${cor === c.valor ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {c.rotulo}
              </button>
            ))}
          </div>
          {cores?.some((x) => x !== undefined) && <p className="mt-1 text-xs text-muted">Na comparação, cada estrutura tem uma cor fixa.</p>}
        </details>

        {isolada && (
          <button
            type="button"
            onClick={async () => {
              await motor?.isolar(null);
              setIsolada(null);
            }}
            className="ge-press rounded-full border border-accent px-3 py-2 text-[13px] font-medium"
            data-testid="mostrar-tudo"
          >
            Mostrar tudo de novo (agora só {isolada})
          </button>
        )}
      </aside>
    </div>
  );
}

function BotaoVidro({ children, className = "", ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`ge-press min-h-8 rounded-full border border-white/20 bg-black/55 px-3 text-[12.5px] font-medium text-white backdrop-blur hover:bg-black/75 aria-pressed:bg-accent ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- painéis

function PainelSelecao({
  sel,
  rotulo,
  modo,
  atomosDoResiduo,
  aoUsarAtomo,
  nEscolhidos,
  aoVerMedidas,
  aoIsolarCadeia,
  aoDestacar,
  aoLimpar,
}: {
  sel: AtomoInfo | null;
  rotulo?: string;
  modo: "explorar" | "medir";
  atomosDoResiduo: string[];
  aoUsarAtomo: (nome: string) => void;
  nEscolhidos: number;
  aoVerMedidas: () => void;
  aoIsolarCadeia: () => void;
  aoDestacar: () => void;
  aoLimpar: () => void;
}) {
  if (!sel)
    return (
      <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted" data-testid="sem-selecao">
        {modo === "explorar" ? "Clique num resíduo ou nucleotídeo no 3D — ou escolha um em Cadeias — para ver o que é." : "No modo Medir, os cliques vão para Medidas."}
      </p>
    );
  return (
    <section className="grid gap-2 rounded-xl border border-line p-3" data-testid="selecao" aria-live="polite">
      <h3 className="text-base font-semibold">
        {tresLetras(sel.residuo)} {sel.numero}
        {sel.insercao} <span className="font-normal text-muted">· cadeia {sel.cadeia}</span>
      </h3>
      <p className="text-sm">{nomeDoResiduo(sel.residuo)}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-muted">Estrutura</dt>
        <dd>{rotulo}</dd>
        <dt className="text-muted">Tipo</dt>
        <dd>{{ proteina: "proteína", "acido-nucleico": "ácido nucleico", agua: "água", ligante: "ligante / íon", outro: "outro" }[sel.tipo]}</dd>
        <dt className="text-muted">Átomo</dt>
        <dd>
          {sel.atomo} ({NOME_ELEMENTO[sel.elemento.toUpperCase()] ?? sel.elemento})
        </dd>
        <dt className="text-muted">Posição (Å)</dt>
        <dd className="ge-mono tabular-nums">
          {num(sel.x, 3)}, {num(sel.y, 3)}, {num(sel.z, 3)}
        </dd>
        <dt className="text-muted" title="Fator B: quanto a posição do átomo varia ou é incerta no experimento.">
          Fator B
        </dt>
        <dd className="tabular-nums">{Number.isFinite(sel.b) ? num(sel.b, 2) : "—"} Å²</dd>
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={aoIsolarCadeia} className="ge-press rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2">
          Isolar cadeia {sel.cadeia}
        </button>
        <button type="button" onClick={aoDestacar} className="ge-press rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2">
          Destacar este resíduo
        </button>
        <button type="button" onClick={aoLimpar} className="ge-press rounded-full px-3 py-1.5 text-[12.5px] text-muted hover:text-ink">
          Limpar
        </button>
      </div>
      {atomosDoResiduo.length > 0 && (
        <div className="grid gap-1">
          <p className="text-xs text-muted">Usar um átomo deste resíduo numa medida{nEscolhidos ? ` (${nEscolhidos} escolhido${nEscolhidos > 1 ? "s" : ""})` : ""}:</p>
          <div className="flex flex-wrap gap-1" data-testid="atomos-residuo">
            {atomosDoResiduo.map((n) => (
              <button key={n} type="button" onClick={() => aoUsarAtomo(n)} data-atomo={n} className="ge-mono ge-press rounded-md border border-line px-1.5 py-0.5 text-[11.5px] hover:border-warn hover:text-warn">
                + {n}
              </button>
            ))}
          </div>
          {nEscolhidos >= 2 && (
            <button type="button" onClick={aoVerMedidas} className="justify-self-start text-xs text-accent-ink underline">
              ir para Medidas
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-muted">O entorno (resíduos a até 5 Å) aparece em bastões. Posição e fator B vêm do arquivo depositado.</p>
    </section>
  );
}

function PainelCadeias({
  carregados,
  aoFocar,
  aoRegiao,
}: {
  carregados: Carregado[];
  aoFocar: (estrutura: number, r: Cadeia["residuos"][number]) => void;
  aoRegiao: (acao: "isolar" | "destacar" | "focar", estrutura: number, cadeia: string, de?: number, ate?: number) => void;
}) {
  const [ativa, setAtiva] = useState<{ e: number; c: string } | null>(null);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const todas = carregados.flatMap((c, e) => c.cadeias.filter((x) => x.tipo !== "outro").map((x) => ({ e, x, rotulo: c.rotulo })));
  const atual = todas.find((t) => ativa && t.e === ativa.e && t.x.id === ativa.c) ?? todas[0];
  if (!todas.length) return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">Sem cadeias de proteína ou ácido nucleico para listar.</p>;
  const polimero = atual.x.residuos.filter((r) => (atual.x.tipo === "proteina" ? r.tipo === "aminoacido" : r.tipo === "nucleotideo"));
  const n = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const valido = (de === "" || Number.isInteger(n(de))) && (ate === "" || Number.isInteger(n(ate)));
  return (
    <section className="grid gap-2 rounded-xl border border-line p-3" data-testid="cadeias">
      <ul className="flex flex-wrap gap-1.5">
        {todas.map((t) => (
          <li key={`${t.e}-${t.x.id}`}>
            <button
              type="button"
              onClick={() => {
                setAtiva({ e: t.e, c: t.x.id });
                aoRegiao("focar", t.e, t.x.id);
              }}
              aria-pressed={t === atual}
              data-cadeia={t.x.id}
              className={`ge-press rounded-full border px-2.5 py-1 text-[12.5px] ${t === atual ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}
            >
              {carregados.length > 1 ? `${t.rotulo} · ` : ""}
              {t.x.id} · {t.x.tipo === "proteina" ? "proteína" : t.x.tipo.toUpperCase()} · {t.x.sequencia.length}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Clique num resíduo para ir até ele. Numeração do autor, como nos artigos.</p>
      <div className="ge-mono flex max-h-56 flex-wrap gap-0.5 overflow-y-auto rounded-lg bg-panel p-2 text-[11.5px]" data-testid="sequencia-cadeia">
        {polimero.map((r) => (
          <button
            key={`${r.numero}${r.insercao}`}
            type="button"
            onClick={() => aoFocar(atual.e, r)}
            title={`${tresLetras(r.nome)} ${r.numero}${r.insercao}`}
            data-residuo={`${r.numero}${r.insercao}`}
            className="grid min-w-6 place-items-center rounded px-0.5 py-0.5 leading-tight text-ink hover:bg-accent hover:text-white"
          >
            <span>{r.letra}</span>
            {r.numero % 10 === 0 && <span className="text-[9px] text-panel-dim">{r.numero}</span>}
          </button>
        ))}
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="text-xs text-muted">Trecho da cadeia {atual.x.id} (vazio = cadeia inteira)</legend>
        <div className="flex flex-wrap items-end gap-1.5">
          <label className="grid text-[11px] text-muted">
            de
            <input value={de} onChange={(e) => setDe(e.target.value)} inputMode="numeric" className="min-h-8 w-20 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink" data-testid="regiao-de" />
          </label>
          <label className="grid text-[11px] text-muted">
            até
            <input value={ate} onChange={(e) => setAte(e.target.value)} inputMode="numeric" className="min-h-8 w-20 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink" data-testid="regiao-ate" />
          </label>
          <button type="button" disabled={!valido} onClick={() => aoRegiao("destacar", atual.e, atual.x.id, n(de), n(ate))} className="ge-press min-h-8 rounded-full border border-line px-2.5 text-[12.5px] hover:bg-surface-2 disabled:opacity-50">
            Destacar
          </button>
          <button type="button" disabled={!valido} onClick={() => aoRegiao("isolar", atual.e, atual.x.id, n(de), n(ate))} className="ge-press min-h-8 rounded-full border border-line px-2.5 text-[12.5px] hover:bg-surface-2 disabled:opacity-50" data-testid="isolar-regiao">
            Isolar
          </button>
        </div>
      </fieldset>
    </section>
  );
}

function PainelMedidas({
  modo,
  escolhidos,
  medidas,
  nomeEstrutura,
  aoModoMedir,
  aoMedir,
  aoDesfazer,
  aoLimpar,
  aoExportar,
}: {
  modo: "explorar" | "medir";
  escolhidos: AtomoInfo[];
  medidas: Medida[];
  nomeEstrutura: (i: number) => string;
  aoModoMedir: () => void;
  aoMedir: (n: 2 | 3 | 4) => void;
  aoDesfazer: () => void;
  aoLimpar: () => void;
  aoExportar: (f: "csv" | "json") => void;
}) {
  const varias = new Set(escolhidos.map((a) => a.estrutura)).size > 1 || new Set(medidas.flatMap((m) => m.atomos.map((a) => a.estrutura))).size > 1;
  return (
    <section className="grid gap-2 rounded-xl border border-line p-3" data-testid="medidas">
      {modo !== "medir" && !escolhidos.length ? (
        <>
          <button type="button" onClick={aoModoMedir} className="ge-press rounded-full bg-accent px-3 py-2 text-[13px] font-semibold text-white" data-testid="ir-medir">
            Começar a medir
          </button>
          <p className="text-xs text-muted">Ou escolha os átomos sem o mouse: Cadeias → resíduo → “+ átomo” na Seleção.</p>
        </>
      ) : (
        <p className="text-sm">Clique nos átomos, em ordem. 2 átomos = distância; 3 = ângulo (no 2º); 4 = diedro (em volta da ligação 2–3).</p>
      )}
      {escolhidos.length > 0 && (
        <ol className="grid gap-0.5 text-[13px]" data-testid="escolhidos">
          {escolhidos.map((a, i) => (
            <li key={i} className="ge-mono">
              <span className="text-warn">{i + 1}</span> {rotuloAtomo(a)}
              {varias ? <span className="text-muted"> ({nomeEstrutura(a.estrutura)})</span> : null}
            </li>
          ))}
        </ol>
      )}
      {(modo === "medir" || escolhidos.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={escolhidos.length < 2} onClick={() => aoMedir(2)} className="ge-press rounded-full border border-line px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2 disabled:opacity-40" data-testid="medir-distancia">
            Distância (1–2)
          </button>
          <button type="button" disabled={escolhidos.length < 3} onClick={() => aoMedir(3)} className="ge-press rounded-full border border-line px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2 disabled:opacity-40" data-testid="medir-angulo">
            Ângulo (1–2–3)
          </button>
          <button type="button" disabled={escolhidos.length < 4} onClick={() => aoMedir(4)} className="ge-press rounded-full border border-line px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2 disabled:opacity-40" data-testid="medir-diedro">
            Diedro (1–2–3–4)
          </button>
          {escolhidos.length > 0 && (
            <button type="button" onClick={aoDesfazer} className="px-2 text-[12.5px] text-muted underline">
              recomeçar
            </button>
          )}
        </div>
      )}
      {medidas.length > 0 && (
        <>
          <table className="w-full text-[13px]" data-testid="tabela-medidas">
            <tbody>
              {medidas.map((m) => (
                <tr key={m.id} className="border-b border-line/60 align-top">
                  <td className="py-1 pr-2 text-muted">{m.tipo}</td>
                  <td className="ge-mono py-1 text-[11.5px]">{m.atomos.map(rotuloAtomo).join(" · ")}</td>
                  <td className="py-1 pl-2 text-right font-semibold tabular-nums" data-valor-medida={m.valor.toFixed(3)}>
                    {num(m.valor, m.unidade === "Å" ? 2 : 1)} {m.unidade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => aoExportar("csv")} className="ge-press rounded-full border border-line px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2" data-testid="medidas-csv">
              Baixar .csv
            </button>
            <button type="button" onClick={() => aoExportar("json")} className="ge-press rounded-full border border-line px-2.5 py-1.5 text-[12.5px] hover:bg-surface-2">
              Baixar .json
            </button>
            <button type="button" onClick={aoLimpar} className="px-2 text-[12.5px] text-muted underline">
              apagar medidas
            </button>
          </div>
        </>
      )}
      <p className="text-xs text-muted">
        Valores calculados com as coordenadas do arquivo (modelo 1){varias ? "; entre estruturas diferentes, só fazem sentido depois de superpor" : ""}. Medir não altera a estrutura.
      </p>
    </section>
  );
}
