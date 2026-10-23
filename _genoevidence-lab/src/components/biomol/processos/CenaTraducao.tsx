"use client";
import { useMemo } from "react";
import { estadoTraducao, type RoteiroTraducao } from "@/lib/biomol/processos";
import { AMINOACIDOS } from "@/lib/biomol/sequencias";
import { Base, Blob, CameraSegue, Esqueleto, Etiqueta, Letra, PASSO, RotuloAa, suave, xDe, type Paleta } from "./pecas";

const BASE = 0.3;
const Y_ANTI = 0.62; // esqueleto do anticódon (as bases descem até o códon)
const ALTURA_TRNA = 1.35;

/**
 * Tradução esquemática. O mRNA corre da esquerda (5') para a direita (3'). O ribossomo lê de três
 * em três; cada tRNA traz o aminoácido do códon, pareando o anticódon com o códon; a cadeia passa
 * para o tRNA novo (ligação peptídica) e o ribossomo anda um códon.
 */
export function CenaTraducao({ mrna, roteiro, t, paleta, movimento }: { mrna: string; roteiro: RoteiroTraducao; t: number; paleta: Paleta; movimento: boolean }) {
  const n = mrna.length;
  const e = estadoTraducao(roteiro, t);
  const f = movimento ? e.frac : 1;
  const ptsMrna = useMemo<[number, number, number][]>(() => Array.from({ length: n }, (_, i) => [xDe(i, n), 0, 0]), [n]);
  const meio = (pos: number) => xDe(pos + 1, n); // centro de um códon

  const passos = roteiro.passos;
  const codonP = e.p >= 0 ? passos[e.p] : null;
  const codonA = e.a >= 0 ? passos[e.a] : null;

  // posição do ribossomo (centro no sítio P): varre até o AUG; depois anda um códon por passo
  let xRibo: number;
  if (e.fase === "varredura") xRibo = xDe(0, n) + (meio(roteiro.inicio) - xDe(0, n)) * suave(f);
  else if (e.fase === "alongamento") {
    const de = meio(passos[Math.max(0, e.a >= 0 ? e.a - 1 : e.p - 1)].pos);
    const para = meio(passos[e.a >= 0 ? e.a : e.p].pos);
    xRibo = de + (para - de) * suave((f - 0.55) / 0.45);
  } else if (e.fase === "inicio") xRibo = meio(roteiro.inicio);
  else xRibo = codonP ? meio(codonP.pos) : meio(passos[passos.length - 1].pos);
  const xA = xRibo + 3 * PASSO;
  const grandeJunta = e.fase === "varredura" ? 0 : e.fase === "inicio" ? suave(f) : e.fase === "fim" ? 1 - suave(f) : 1;
  const separa = e.fase === "fim" ? suave(f) : 0;

  // cadeia: presa ao tRNA do P (ou ao do A, depois da ligação); solta no fim
  // o tRNA fica sempre pareado com o seu códon; quem anda é o ribossomo
  const xP = codonP ? meio(codonP.pos) : xRibo;
  const pontaCadeia: [number, number, number] = e.liberado ? [xRibo - 1.5, 2.9 + 0.8 * (e.fase === "fim" ? f : 0), 0.6] : [xP, Y_ANTI + ALTURA_TRNA + 0.12, 0];
  const cadeia = [...e.peptideo].reverse(); // do mais novo (preso ao tRNA) para o mais antigo
  const posAa = (k: number): [number, number, number] => [pontaCadeia[0] - 0.36 * k * 0.85, pontaCadeia[1] + 0.26 * k + 0.12 * Math.sin(k * 1.3), pontaCadeia[2] + 0.1 * Math.cos(k * 1.1)];

  const tRna = (p: (typeof passos)[number], x: number, y0: number, opacidade = 1, chave: string) => (
    <group key={chave} position={[x, y0, 0]}>
      {/* anticódon: três bases pareando com o códon, escrito 3'→5' da esquerda para a direita */}
      <Esqueleto
        pontos={[
          [-PASSO, Y_ANTI, 0],
          [0, Y_ANTI, 0],
          [PASSO, Y_ANTI, 0],
        ]}
        cor={paleta.enzima2}
        opacidade={opacidade}
      />
      {[...p.anticodon]
        .reverse()
        .map((b, k) => (
          <Base key={k} x={(k - 1) * PASSO} y={Y_ANTI} para={-1} cor={paleta[b as "A"]} comprimento={BASE * 0.95} opacidade={opacidade} />
        ))}
      <mesh position={[0, Y_ANTI + ALTURA_TRNA / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.14, ALTURA_TRNA, 16]} />
        <meshPhysicalMaterial color={paleta.enzima2} roughness={0.3} clearcoat={0.7} transparent opacity={0.85 * opacidade} />
      </mesh>
    </group>
  );

  return (
    <group>
      <CameraSegue x={xRibo + 0.6} y={0.9} distancia={9} suave={movimento} />
      <Esqueleto pontos={ptsMrna} cor={paleta.rna} raio={0.08} />
      {[...mrna].map((b, i) => {
        const noP = codonP && i >= codonP.pos && i < codonP.pos + 3;
        const noA = codonA && i >= codonA.pos && i < codonA.pos + 3;
        return <Base key={i} x={xDe(i, n)} y={0} para={1} cor={paleta[b as "A"]} comprimento={BASE} destaque={Boolean(noP || noA)} />;
      })}

      {/* ribossomo: subunidade pequena (sempre) e grande (junta-se no início) */}
      <Blob posicao={[xRibo + 0.75, -0.55 - 0.8 * separa, 0]} escala={[2.0, 0.5, 1.0]} cor={paleta.enzima} opacidade={0.28} />
      {grandeJunta > 0.01 && <Blob posicao={[xRibo + 0.75, 1.45 + 1.2 * (1 - grandeJunta) + 0.8 * separa, 0]} escala={[2.3, 1.15, 1.2]} cor={paleta.enzima} opacidade={0.18 * grandeJunta} />}

      {/* tRNAs */}
      {codonP && e.fase !== "fim" && tRna(codonP, xP, 0, e.fase === "terminacao" ? 1 - suave(f) : 1, `p${e.p}`)}
      {codonA && tRna(codonA, xA, 2.2 * (1 - suave(f / 0.35)), Math.min(1, f / 0.2 + 0.2), `a${e.a}`)}
      {/* tRNA que acabou de ceder a cadeia sai pelo sítio E */}
      {e.fase === "alongamento" && e.a < 0 && e.p >= 1 && tRna(passos[e.p - 1], meio(passos[e.p - 1].pos) - 0.6 * suave((f - 0.55) / 0.45), 1.4 * suave((f - 0.55) / 0.45), 1 - suave((f - 0.55) / 0.45), `e${e.p - 1}`)}

      {/* fator de liberação no códon de parada */}
      {e.fase === "terminacao" && roteiro.parada && <Blob posicao={[meio(roteiro.parada.pos), 1.2 + 1.6 * (1 - suave(f / 0.5)), 0]} escala={[0.32, 0.6, 0.32]} cor={paleta.primer} opacidade={0.75} />}

      {/* cadeia polipeptídica */}
      {cadeia.length > 1 && <Esqueleto pontos={cadeia.map((_, k) => posAa(k))} cor={paleta.aa} raio={0.05} />}
      {cadeia.map((aa, k) => (
        <group key={`${cadeia.length - k}`} position={posAa(k)}>
          <mesh>
            <sphereGeometry args={[0.17, 20, 20]} />
            <meshPhysicalMaterial color={paleta.aa} roughness={0.25} clearcoat={0.8} emissive={paleta.aa} emissiveIntensity={k === 0 ? 0.5 : 0.12} />
          </mesh>
          {k < 10 && <RotuloAa letra={aa} />}
        </group>
      ))}

      {/* etiquetas */}
      {e.fase === "varredura" && <Etiqueta posicao={[xRibo, -1.1, 0]} texto="Subunidade pequena" sub="procura o primeiro AUG" lado="baixo" />}
      {codonP && e.fase !== "fim" && (
        <Etiqueta posicao={[xP, -0.95, 0]} texto={`P · ${codonP.codon}`} sub={`${AMINOACIDOS[codonP.aa]?.tres ?? codonP.aa} · anticódon 3'-${[...codonP.anticodon].reverse().join("")}-5'`} lado="baixo" tom="ok" />
      )}
      {codonA && f > 0.2 && <Etiqueta posicao={[xA, 2.6, 0]} texto={`A · ${codonA.codon}`} sub={`tRNA traz ${AMINOACIDOS[codonA.aa]?.nome ?? codonA.aa}`} tom="violet" />}
      {e.fase === "terminacao" && roteiro.parada && <Etiqueta posicao={[meio(roteiro.parada.pos), 2.4, 0]} texto={`Parada · ${roteiro.parada.codon}`} sub="fator de liberação" tom="warn" />}
      {e.liberado && <Etiqueta posicao={posAa(Math.min(cadeia.length - 1, 3))} texto="Polipeptídeo liberado" sub={`${e.peptideo.length} aminoácidos`} tom="violet" />}

      <Letra posicao={[xDe(0, n) - 0.45, 0, 0]} letra="5'" cor={paleta.rna} />
      <Letra posicao={[xDe(n - 1, n) + 0.45, 0, 0]} letra="3'" cor={paleta.rna} />
    </group>
  );
}
