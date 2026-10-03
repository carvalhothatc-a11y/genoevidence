"use client";
import { ENTIDADE_NOME, type PassoVisual } from "@/lib/visual/roteiro";
import { COR } from "./materiais";
import { Ancora, Bacteria, Brilho, Cas9, CelulaEuc, Enzima, Faisca, Fita, Fluxo, Gel, Helice, Pipeta, Placa, Plasmideo, Plataforma, Proteina, Ribossomo, Rotor, Tubo } from "./primitivas";

/**
 * Procedimento em 3D (holográfico) para cada ação do roteiro. t ∈ [0,1] é o progresso da etapa.
 * ILUSTRAÇÃO DIDÁTICA: formas, escalas, cores e quantidades não são reais.
 */
type V3 = [number, number, number];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const seg = (t: number, a: number, b: number) => {
  const x = clamp((t - a) / (b - a));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export function Cena3D({ passo, t }: { passo: PassoVisual; t: number }) {
  return (
    <group>
      <Plataforma />
      <Acao passo={passo} t={t} />
    </group>
  );
}

function Acao({ passo, t }: { passo: PassoVisual; t: number }) {
  const r = passo.rotulos;
  const gene = r.gene ? `gene ${r.gene}` : undefined;
  const nomeOrigem = passo.origem ? ENTIDADE_NOME[passo.origem] : "Material";
  const k = passo.id; // chaves de rótulo únicas por etapa

  switch (passo.acao) {
    case "pipetar":
    case "misturar": {
      const sobe = seg(t, 0.15, 0.35);
      const vai = seg(t, 0.35, 0.75);
      const desce = seg(t, 0.75, 0.9);
      const px = lerp(-1.6, 1.6, vai);
      const py = 0.2 + 0.9 * sobe - 0.9 * desce;
      const corOrigem = passo.origem === "primer" ? COR.teal : COR.violeta;
      return (
        <group>
          <Tubo position={[-1.6, -0.6, 0]} nivel={0.45} cor={corOrigem} />
          <Tubo position={[1.6, -0.6, 0]} nivel={0.3 + 0.12 * seg(t, 0.85, 1)} cor={COR.azul} />
          <group position={[px, py, 0]}>
            <Pipeta position={[0, 0, 0]} />
            {t > 0.3 && t < 0.92 && <Faisca position={[0, -0.05, 0]} intensidade={0.8} />}
          </group>
          {passo.origem === "primer" && <Fita comp={0.7} cor={COR.teal} position={[-1.6, -1.05, 0.05]} />}
          <Ancora id={`${k}-o`} texto={`${nomeOrigem} (estoque)`} sub="retirado com a micropipeta" position={[-1.6, -0.2, 0]} dx={-150} dy={-30} />
          <Ancora id={`${k}-d`} texto={passo.destino ? ENTIDADE_NOME[passo.destino] : "Mistura de reação"} sub="recebe o volume pipetado" position={[1.6, -0.2, 0]} dx={140} dy={20} />
        </group>
      );
    }
    case "desnaturar":
    case "anelar":
    case "estender": {
      const sep = passo.acao === "desnaturar" ? seg(t, 0.1, 0.8) : passo.acao === "anelar" ? seg(t, 0, 0.35) : 1;
      const pk = passo.acao === "desnaturar" ? 0 : passo.acao === "anelar" ? seg(t, 0.45, 0.9) : 1;
      const ek = passo.acao === "estender" ? seg(t, 0.1, 0.95) : 0;
      return (
        <group>
          <Helice comp={5.2} sep={sep} novaFita={ek} girar={0.18} />
          {pk > 0 && (
            <>
              <Fita comp={0.8} cor={COR.teal} position={lerp3([1.2, 2.2, 0.4], [1.3, 0.75, 0.15], pk)} />
              <Fita comp={0.8} cor={COR.teal} position={lerp3([-1.2, -2.2, 0.4], [-1.3, -0.75, 0.15], pk)} />
            </>
          )}
          {ek > 0.05 && (
            <>
              <Enzima position={[lerp(1.3, -2.4, ek), 0.95, 0.35]} cor={COR.ambar} abre={(Math.sin(t * 30) + 1) / 2} escala={0.7} />
              <Enzima position={[lerp(-1.3, 2.4, ek), -0.95, 0.35]} cor={COR.ambar} abre={(Math.sin(t * 30 + 1) + 1) / 2} escala={0.7} />
            </>
          )}
          <Ancora id={`${k}-m`} texto="Fita molde" sub={gene} position={[-2.4, sep * 0.75, 0]} dx={-130} dy={-50} />
          {pk > 0.5 && <Ancora id={`${k}-p`} texto="Primers" sub="pareiam com a sequência complementar" position={[1.3, 0.75, 0.15]} dx={140} dy={-60} />}
          {ek > 0.3 && <Ancora id={`${k}-e`} texto="Polimerase" sub="sintetiza a nova fita" position={[lerp(-1.3, 2.4, ek), -0.95, 0.35]} dx={130} dy={60} />}
          {passo.acao === "desnaturar" && <Ancora id={`${k}-t`} texto={r.temperatura ? `Aquecimento a ${r.temperatura}` : "Aquecimento"} sub="as fitas se separam" position={[2.4, 0, 0]} dx={120} dy={40} />}
        </group>
      );
    }
    case "amplificar": {
      const n = t < 0.22 ? 1 : t < 0.47 ? 2 : t < 0.72 ? 4 : 8;
      const pos: V3[] = Array.from({ length: n }, (_, i) => {
        if (n === 1) return [0, 0, 0];
        const col = i % 2;
        const lin = Math.floor(i / 2);
        const linhas = Math.ceil(n / 2);
        return [col === 0 ? -1.7 : 1.7, (linhas - 1) * 0.55 - lin * 1.1, (lin % 2) * -0.6];
      });
      return (
        <group>
          {pos.map((p, i) => (
            <Helice key={i} comp={n > 4 ? 2.4 : 3} raio={n > 4 ? 0.2 : 0.26} voltas={3} position={p} girar={0.4 + i * 0.03} espessura={n > 4 ? 0.04 : 0.05} />
          ))}
          <Ancora id={`${k}-c`} texto={`${[1, 2, 4, 8].slice(0, [1, 2, 4, 8].indexOf(n) + 1).join(" → ")} cópias`} sub={`${gene ?? "região-alvo"} · ilustração; quantidades reais não são calculadas`} position={pos[0]} dx={-170} dy={-90} />
        </group>
      );
    }
    case "cortar": {
      const ek = seg(t, 0.05, 0.45);
      const ck = seg(t, 0.5, 0.9);
      const plas = passo.origem === "plasmideo" || passo.entidades.includes("plasmideo");
      return plas ? (
        <group>
          <Plasmideo abertura={ck} />
          <Enzima position={lerp3([-3, 2, 0.5], [0, 1.45, 0.3], ek)} abre={(Math.sin(t * 25) + 1) / 2} />
          <Ancora id={`${k}-e`} texto={r.enzima ?? "Enzima de restrição"} sub="reconhece o sítio e corta" position={[0, 1.45, 0.3]} dx={140} dy={-50} />
          <Ancora id={`${k}-p`} texto={ck > 0.5 ? "Plasmídeo aberto" : "Plasmídeo"} position={[-1.2, -0.3, 0]} dx={-140} dy={40} />
        </group>
      ) : (
        <group>
          <Helice comp={2.6} voltas={2} position={[-1.35 - 0.5 * ck, 0, 0]} girar={0.15} />
          <Helice comp={2.6} voltas={2} position={[1.35 + 0.5 * ck, 0, 0]} girar={0.15} />
          <Enzima position={lerp3([-3, 1.8, 0.6], [0, 0.65, 0.4], ek)} abre={(Math.sin(t * 25) + 1) / 2} />
          {ck > 0.2 && <Faisca position={[0, 0, 0.2]} intensidade={ck} />}
          <Ancora id={`${k}-e`} texto={r.enzima ?? "Enzima de restrição"} sub="corta no sítio de reconhecimento" position={[0, 0.65, 0.4]} dx={140} dy={-60} />
          {ck > 0.5 && <Ancora id={`${k}-x`} texto="Extremidades geradas pelo corte" position={[-0.6, -0.3, 0]} dx={-160} dy={70} />}
          <Ancora id={`${k}-d`} texto={nomeOrigem} sub={gene} position={[2.4, 0, 0]} dx={120} dy={50} />
        </group>
      );
    }
    case "inserir_vetor": {
      const mk = seg(t, 0.1, 0.65);
      const fk = seg(t, 0.65, 0.95);
      return (
        <group>
          <Plasmideo abertura={1 - fk} inserto={fk} />
          {fk < 0.98 && <Helice comp={1.2} raio={0.16} voltas={1.5} position={lerp3([3.4, 2.1, 0.5], [0, 1.25, 0], mk)} corA={COR.rosa} corB={COR.violeta} espessura={0.05} girar={0.6} />}
          {fk > 0.4 && (
            <>
              <Faisca position={[-0.7, 1.0, 0]} intensidade={fk} />
              <Faisca position={[0.7, 1.0, 0]} intensidade={fk} />
            </>
          )}
          <Ancora id={`${k}-i`} texto={passo.origem ? ENTIDADE_NOME[passo.origem] : "Inserto"} sub={gene ?? "fragmento de DNA"} position={lerp3([3.4, 2.1, 0.5], [0, 1.25, 0], mk)} dx={130} dy={-50} />
          <Ancora id={`${k}-p`} texto={fk > 0.6 ? "Plasmídeo recombinante" : "Plasmídeo (vetor) aberto"} position={[-1.2, -0.2, 0]} dx={-150} dy={30} />
          {fk > 0.5 && <Ancora id={`${k}-l`} texto="Ligação" sub="extremidades unidas (ligase)" position={[0.7, 1.0, 0]} dx={150} dy={10} />}
          <Ancora id={`${k}-r`} texto="Gene de resistência" sub="usado na seleção" position={[-0.4, -1.15, 0]} dx={140} dy={70} />
        </group>
      );
    }
    case "transformar":
    case "transfectar": {
      const ek = seg(t, 0.1, 0.7);
      const ik = passo.integracao ? seg(t, 0.72, 1) : 0;
      const euc = passo.acao === "transfectar";
      const pPos = lerp3([-3.4, 1.4, 0.6], [-0.6, 0.2, 0.1], ek);
      const plas = passo.origem === "virus" ? <Brilho cor={COR.rosa} escala={0.8} opacidade={0.8} position={pPos} /> : <Plasmideo r={0.42} inserto={0.9} position={pPos} girar={0.4} />;
      return (
        <group>
          {euc ? <CelulaEuc r={1.7} /> : <Bacteria />}
          {plas}
          {ek > 0.15 && ek < 0.95 && !euc && <Brilho cor={COR.ambar} escala={2.2} opacidade={0.25 * Math.sin(ek * Math.PI)} position={[-1.4, 0.6, 0]} />}
          {passo.integracao && ik > 0 && (
            <>
              <Fita comp={0.6} cor={COR.rosa} onda={0} position={lerp3([-0.6, 0.2, 0.1], [0.6, -0.3, 0.2], ik)} />
              <Ancora id={`${k}-g`} texto="Integração no cromossomo?" sub="só com estratégia específica — confira" position={[0.6, -0.3, 0.2]} dx={150} dy={80} />
            </>
          )}
          <Ancora id={`${k}-p`} texto={passo.origem === "virus" ? "Vetor viral" : "Plasmídeo recombinante"} position={pPos} dx={-150} dy={-60} />
          <Ancora id={`${k}-c`} texto={euc ? `Célula${r.organismo ? ` ${r.organismo}` : ""}` : `Bactéria${r.organismo ? ` (${r.organismo})` : ""}`} sub={euc ? "membrana e núcleo" : "membrana e parede"} position={[1.4, 0.9, 0]} dx={140} dy={-70} />
          {!euc && <Ancora id={`${k}-k`} texto="Cromossomo bacteriano" position={[0.9, 0.1, 0.2]} dx={150} dy={20} />}
        </group>
      );
    }
    case "cultivar":
    case "selecionar": {
      const n = lerp(0, 26, seg(t, 0.05, passo.acao === "selecionar" ? 0.35 : 0.95));
      const sel = passo.acao === "selecionar" && t > 0.5 ? 4 : undefined;
      return (
        <group rotation={[0.55, 0, 0]}>
          <Placa colonias={n} destaque={sel} />
          {sel !== undefined && <Tubo position={[2.6, 0.9, -0.4]} escala={0.6} nivel={0.5} cor={COR.teal} />}
          <Ancora id={`${k}-p`} texto={`Placa${r.antibiotico ? ` com ${r.antibiotico}` : ""}`} sub={r.antibiotico ? "só cresce quem tem o gene de resistência" : "antibiótico não informado"} position={[-1.4, 0.1, 0]} dx={-140} dy={-60} />
          <Ancora id={`${k}-c`} texto={passo.acao === "selecionar" ? "Colônia escolhida" : "Colônias"} sub="cada colônia vem de uma célula" position={[0.6, 0.15, 0.4]} dx={150} dy={60} />
        </group>
      );
    }
    case "expressar": {
      const tk = seg(t, 0.05, 0.5);
      const pk = seg(t, 0.4, 1);
      return (
        <group>
          <Bacteria>
            <Plasmideo r={0.42} inserto={0.9} position={[-0.8, 0.1, 0.1]} girar={0.3} />
            <Fita comp={0.9} cor={COR.rosa} onda={0.04} position={[0.15, 0.45, 0.2]} progresso={tk} />
          </Bacteria>
          {Array.from({ length: Math.round(8 * pk) }, (_, i) => (
            <Proteina key={i} position={[0.4 + (i % 4) * 0.35 + (i > 3 ? 0.9 * pk : 0), -0.3 + Math.floor(i / 4) * 0.45 + (i > 3 ? 0.9 * pk : 0), 0.3]} escala={0.8} />
          ))}
          <Ancora id={`${k}-g`} texto="Gene no plasmídeo" sub={gene} position={[-0.8, 0.5, 0.1]} dx={-150} dy={-70} />
          <Ancora id={`${k}-r`} texto="RNA mensageiro" position={[0.15, 0.45, 0.2]} dx={60} dy={-110} />
          {pk > 0.3 && <Ancora id={`${k}-p`} texto="Proteínas" sub={r.temperatura ? `indução a ${r.temperatura}` : "quantidade não prevista"} position={[1.1, -0.1, 0.3]} dx={150} dy={60} />}
        </group>
      );
    }
    case "transcrever": {
      const tk = seg(t, 0.15, 0.95);
      return (
        <group>
          <Helice comp={5} sep={0.45 * seg(t, 0, 0.2)} girar={0.12} />
          <Fita comp={3.4} cor={COR.rosa} onda={0.08} position={[-0.3, -1.4, 0.4]} progresso={tk} />
          <Ancora id={`${k}-g`} texto="Gene (DNA)" sub={gene} position={[-2.3, 0.4, 0]} dx={-130} dy={-50} />
          {tk > 0.3 && <Ancora id={`${k}-r`} texto="RNA mensageiro" sub="cópia de uma das fitas" position={[lerp(-2, 1.4, tk), -1.4, 0.4]} dx={140} dy={50} />}
        </group>
      );
    }
    case "traduzir": {
      const kk = seg(t, 0.05, 0.95);
      const x = lerp(-2.2, 2.2, kk);
      return (
        <group>
          <Fita comp={5.4} cor={COR.rosa} onda={0.05} position={[0, -0.9, 0]} />
          <Ribossomo position={[x, -0.6, 0.1]} />
          {Array.from({ length: Math.round(10 * kk) }, (_, i) => (
            <Brilho key={i} cor={i % 2 ? COR.teal : COR.ambar} escala={0.45} opacidade={0.95} position={[x - 0.25 - i * 0.28, 0.2 + Math.sin(i / 1.4) * 0.3, 0.1]} />
          ))}
          <Ancora id={`${k}-m`} texto="RNA mensageiro" position={[-2.4, -0.9, 0]} dx={-130} dy={60} />
          <Ancora id={`${k}-r`} texto="Ribossomo" sub="lê o RNA" position={[x, -0.1, 0.1]} dx={140} dy={-60} />
          {kk > 0.2 && <Ancora id={`${k}-a`} texto="Cadeia de aminoácidos" position={[x - 0.8, 0.3, 0.1]} dx={-150} dy={-70} />}
        </group>
      );
    }
    case "extrair":
    case "purificar": {
      const lk = seg(t, 0.05, 0.35);
      const sk = seg(t, 0.25, 0.9);
      const dnaPos: V3 = [2.2, 0.2, 0];
      const protPos: V3[] = [
        [1.5, 1.5, -0.2],
        [2.1, 1.75, 0.1],
        [1.8, 1.25, 0.3],
      ];
      const outros: V3[] = [
        [1.6, -1.2, 0.2],
        [2.2, -1.45, -0.1],
        [2.6, -1.1, 0.2],
      ];
      return (
        <group>
          <Tubo position={[-1.8, -0.3, 0]} rotation={[0, 0, -0.35]} nivel={0.55} cor={COR.violeta} escala={1.2} />
          {passo.acao === "extrair" &&
            lk < 1 &&
            [0, 1, 2].map((i) => (
              <group key={i} scale={1 - lk}>
                <Bacteria comp={0.9} raio={0.3} position={[-1.8 + (i - 1) * 0.25, -0.7 + i * 0.35, 0.2]} cromossomo={false} />
              </group>
            ))}
          <Fluxo de={[-1.6, 0.4, 0]} para={[dnaPos, ...protPos, ...outros]} n={70} cor={COR.violeta} progresso={sk} />
          <Helice comp={1.6} raio={0.2} voltas={2} position={lerp3([-1.6, 0.4, 0], dnaPos, sk)} escala={0.5 + 0.5 * sk} girar={0.5} />
          {protPos.map((p, i) => (
            <Proteina key={i} position={lerp3([-1.6, 0.4, 0], p, sk)} escala={0.5 + 0.5 * sk} />
          ))}
          {outros.map((p, i) => (
            <Brilho key={i} cor={COR.teal} escala={0.5} opacidade={0.9} position={lerp3([-1.6, 0.4, 0], p, sk)} />
          ))}
          {sk > 0.4 && (
            <>
              <Ancora id={`${k}-p`} texto="Proteínas" position={protPos[1]} dx={120} dy={-20} />
              <Ancora id={`${k}-d`} texto={passo.origem === "rna" ? "RNA" : "DNA"} sub="separado dos demais componentes" position={dnaPos} dx={130} dy={0} />
              <Ancora id={`${k}-o`} texto="Outros componentes" position={outros[2]} dx={120} dy={20} />
            </>
          )}
          <Ancora id={`${k}-t`} texto={passo.acao === "extrair" ? "Células rompidas (lise)" : "Mistura a purificar"} position={[-1.8, -0.3, 0]} dx={-140} dy={60} />
        </group>
      );
    }
    case "eletroforese":
      return (
        <group>
          <Gel progresso={seg(t, 0.1, 0.95)} />
          <Ancora id={`${k}-l`} texto="Marcador" sub="referência de tamanho" position={[-1.15, 0.6, 0.6]} dx={-130} dy={-60} />
          <Ancora id={`${k}-a`} texto="Amostras" sub="posições ilustrativas · não é resultado" position={[0.6, 0.1, 0.1]} dx={150} dy={50} />
          <Ancora id={`${k}-p`} texto="Polo positivo (+)" sub="o DNA migra para cá" position={[0, -0.6, -0.8]} dx={150} dy={40} />
        </group>
      );
    case "centrifugar":
      return (
        <group>
          <Rotor giro={t * 14} />
          <Ancora id={`${k}-r`} texto="Tubos em posições opostas" sub="rotor balanceado" position={[1.05, 0.3, 0]} dx={140} dy={-50} />
        </group>
      );
    case "incubar":
      return (
        <group>
          <Tubo nivel={0.45} cor={COR.violeta} escala={1.2} />
          <Brilho cor={COR.ambar} escala={3.2} opacidade={0.18 + 0.12 * Math.sin(t * 12)} position={[0, -0.5, -0.3]} />
          <Ancora id={`${k}-t`} texto={r.temperatura ?? "Temperatura não informada"} sub="reação mantida aquecida" position={[0.4, 0.4, 0]} dx={140} dy={-40} />
        </group>
      );
    case "sequenciar": {
      const seq = "ATGGCTAGCAAGGGCGAGGAGCTGTTC";
      const n = Math.round(seq.length * seg(t, 0.05, 0.95));
      return (
        <group>
          <Helice comp={5} girar={0.3} />
          <Ancora id={`${k}-s`} texto={seq.slice(0, Math.max(1, n))} sub="sequência ilustrativa — não é a do seu material" position={[0, -0.5, 0]} dx={-120} dy={110} />
        </group>
      );
    }
    case "editar_crispr": {
      const mk = seg(t, 0.05, 0.5);
      const ck = seg(t, 0.5, 0.75);
      const rk = seg(t, 0.8, 1);
      const abre = ck * (1 - rk);
      const cpos = lerp3([-2.6, 1.8, 0.6], [0, 0.6, 0.4], mk);
      return (
        <group>
          <Helice comp={2.8} voltas={2} position={[-1.45 - 0.3 * abre, 0, 0]} girar={0.12} />
          <Helice comp={2.8} voltas={2} position={[1.45 + 0.3 * abre, 0, 0]} girar={0.12} />
          <Cas9 position={cpos} />
          {rk > 0 && <Faisca position={[0, 0, 0.2]} intensidade={rk} />}
          <Ancora id={`${k}-c`} texto="Cas9 + RNA guia" sub={gene ? `alvo: ${r.gene}` : "alvo definido pelo guia"} position={cpos} dx={150} dy={-60} />
          <Ancora id={`${k}-g`} texto={rk > 0.5 ? "Corte reparado pela célula" : "Genoma"} position={[-2.2, -0.2, 0]} dx={-140} dy={60} />
        </group>
      );
    }
    case "detectar":
    case "quantificar": {
      const kk = seg(t, 0.1, 0.9);
      return (
        <group>
          {[0, 1, 2, 3, 4].map((i) => (
            <group key={i}>
              <Tubo position={[-2.4 + i * 1.2, -0.3, 0]} escala={0.7} nivel={0.4} cor={COR.violeta} />
              <Brilho cor={i % 2 ? COR.teal : COR.rosa} escala={1.1} opacidade={kk * (0.3 + 0.12 * i)} position={[-2.4 + i * 1.2, -0.9, 0.1]} />
            </group>
          ))}
          <Ancora id={`${k}-s`} texto={passo.acao === "quantificar" ? "Medição no equipamento" : "Sinal nas amostras"} sub="valores não são previstos" position={[0, -0.2, 0]} dx={-150} dy={-100} />
        </group>
      );
    }
    default:
      return (
        <group>
          <Tubo nivel={0.4} cor={COR.violeta} escala={1.1} />
          {passo.entidades.slice(0, 4).map((e, i) => {
            const a = (i / Math.max(1, passo.entidades.length)) * Math.PI * 2;
            const p: V3 = [Math.cos(a) * 2.4, Math.sin(a) * 1.2, 0];
            return (
              <group key={e}>
                <Brilho cor={i % 2 ? COR.teal : COR.rosa} escala={0.8} opacidade={0.8} position={p} />
                <Ancora id={`${k}-${e}`} texto={ENTIDADE_NOME[e]} position={p} dx={Math.cos(a) < 0 ? -110 : 110} dy={-20} />
              </group>
            );
          })}
        </group>
      );
  }
}
