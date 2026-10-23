"use client";
import { useMemo } from "react";
import { estadoReplicacao } from "@/lib/biomol/processos";
import { complemento } from "@/lib/biomol/sequencias";
import { Base, Blob, CameraSegue, Esqueleto, Etiqueta, Letra, PASSO, suave, xDe, type Paleta } from "./pecas";

const DUPLEX = 0.32; // meia distância entre os esqueletos de um par
const SEPARA = 1.1; // quanto cada fita molde se afasta quando aberta
const BASE = 0.28;

/**
 * Replicação esquemática. Fita 1 (a dada) em cima, 5'→3' da esquerda para a direita; fita 2 (a
 * complementar) embaixo, 3'→5'. A forquilha abre da esquerda para a direita.
 */
export function CenaReplicacao({ fita1, t, F, paleta, movimento }: { fita1: string; t: number; F: number; paleta: Paleta; movimento: boolean }) {
  const n = fita1.length;
  const fita2 = useMemo(() => complemento(fita1, "dna"), [fita1]);
  const e = estadoReplicacao(n, t, F);
  const frac = movimento ? t - Math.floor(t) : 1;
  const garfo = Math.min(n, t); // posição contínua da forquilha
  // abertura de cada posição: 0 = dupla-hélice, 1 = fitas separadas (rampa suave perto da forquilha)
  const ab = (i: number) => suave((garfo - i) / 2.2);
  const yCima = (i: number) => DUPLEX + SEPARA * ab(i);
  const yBaixo = (i: number) => -DUPLEX - SEPARA * ab(i);
  const qz = Math.round(garfo * 20) / 20; // reconstruir os tubos só quando a forquilha anda
  const ptsCima = useMemo<[number, number, number][]>(() => Array.from({ length: n }, (_, i) => [xDe(i, n), DUPLEX + SEPARA * suave((qz - i) / 2.2), 0]), [n, qz]);
  const ptsBaixo = useMemo<[number, number, number][]>(() => Array.from({ length: n }, (_, i) => [xDe(i, n), -DUPLEX - SEPARA * suave((qz - i) / 2.2), 0]), [n, qz]);

  // trechos contínuos das fitas novas (um tubo por trecho)
  const trechos = (feito: boolean[], grupo: number[] | null) => {
    const r: number[][] = [];
    let atual: number[] = [];
    for (let i = 0; i < n; i++) {
      const mesmo = atual.length && grupo ? grupo[i] === grupo[atual[atual.length - 1]] : true;
      if (feito[i] && mesmo) atual.push(i);
      else {
        if (atual.length) r.push(atual);
        atual = feito[i] ? [i] : [];
      }
    }
    if (atual.length) r.push(atual);
    return r;
  };
  const lider = trechos(e.lider, null);
  const atrasada = trechos(e.atrasada, e.ligados ? null : e.fragmento);

  const proxLider = e.polLider >= 0 && e.polLider < n && t >= 1 ? e.polLider : -1;
  const proxAtrasada = e.polAtrasada;
  const xGarfo = xDe(Math.min(n - 1, Math.max(0, garfo - 0.5)), n);

  return (
    <group>
      <CameraSegue x={xGarfo - 1.2} distancia={9} suave={movimento} />
      {/* fitas moldes (velhas) */}
      <Esqueleto pontos={ptsCima} cor={paleta.f1} />
      <Esqueleto pontos={ptsBaixo} cor={paleta.f2} />
      {[...fita1].map((b, i) => (
        <Base key={`c${i}`} x={xDe(i, n)} y={yCima(i)} para={-1} cor={paleta[b as "A"] ?? paleta.f1} comprimento={BASE} destaque={i === proxAtrasada} />
      ))}
      {[...fita2].map((b, i) => (
        <Base key={`b${i}`} x={xDe(i, n)} y={yBaixo(i)} para={1} cor={paleta[b as "A"] ?? paleta.f2} comprimento={BASE} destaque={i === proxLider} />
      ))}

      {/* fita nova contínua (líder), pareada com a fita 2 */}
      {lider.map((tr) => (
        <group key={`l${tr[0]}`}>
          <Esqueleto pontos={tr.map((i) => [xDe(i, n), yBaixo(i) + 2 * DUPLEX, 0] as [number, number, number])} cor={paleta.nova} />
          {tr.map((i) => (
            <Base key={i} x={xDe(i, n)} y={yBaixo(i) + 2 * DUPLEX} para={-1} cor={paleta[fita1[i] as "A"]} comprimento={BASE} />
          ))}
        </group>
      ))}
      {/* fita nova descontínua (atrasada), pareada com a fita 1, em fragmentos */}
      {atrasada.map((tr) => (
        <group key={`a${tr[0]}`}>
          <Esqueleto pontos={tr.map((i) => [xDe(i, n), yCima(i) - 2 * DUPLEX, 0] as [number, number, number])} cor={paleta.nova} />
          {tr.map((i) => (
            <Base key={i} x={xDe(i, n)} y={yCima(i) - 2 * DUPLEX} para={1} cor={paleta[fita2[i] as "A"]} comprimento={BASE} />
          ))}
          {/* o primer fica no começo (5') do fragmento: a ponta da direita */}
          {!e.ligados && (
            <mesh position={[xDe(tr[tr.length - 1], n), yCima(tr[tr.length - 1]) - 2 * DUPLEX - 0.02, 0]}>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial color={paleta.primer} emissive={paleta.primer} emissiveIntensity={0.5} />
            </mesh>
          )}
        </group>
      ))}

      {/* nucleotídeos chegando (suave) */}
      {proxLider >= 0 && (
        <group position={[0, -1.6 * (1 - suave(frac)), 0]}>
          <Base x={xDe(proxLider, n)} y={yBaixo(proxLider) + 2 * DUPLEX} para={-1} cor={paleta[fita1[proxLider] as "A"]} comprimento={BASE} opacidade={0.4 + 0.6 * frac} destaque />
          <Letra posicao={[xDe(proxLider, n), yBaixo(proxLider) + 2 * DUPLEX + 0.25, 0.3]} letra={fita1[proxLider]} cor={paleta.texto} />
        </group>
      )}
      {proxAtrasada >= 0 && (
        <group position={[0, 1.6 * (1 - suave(frac)), 0]}>
          <Base x={xDe(proxAtrasada, n)} y={yCima(proxAtrasada) - 2 * DUPLEX} para={1} cor={paleta[fita2[proxAtrasada] as "A"]} comprimento={BASE} opacidade={0.4 + 0.6 * frac} destaque />
        </group>
      )}

      {/* enzimas */}
      {garfo < n && (
        <group rotation={[0, Math.PI / 2, 0]} position={[xDe(Math.min(n - 1, garfo), n), 0, 0]}>
          <Blob posicao={[0, 0, 0]} escala={[0.62, 0.62, 0.62]} cor={paleta.enzima2} forma="anel" opacidade={0.38} />
        </group>
      )}
      {proxLider >= 0 && <Blob posicao={[xDe(proxLider, n) - PASSO * 0.6, yBaixo(proxLider) + DUPLEX, 0]} escala={[0.7, 0.55, 0.55]} cor={paleta.enzima} />}
      {proxAtrasada >= 0 && <Blob posicao={[xDe(proxAtrasada, n) + PASSO * 0.6, yCima(proxAtrasada) - DUPLEX, 0]} escala={[0.7, 0.55, 0.55]} cor={paleta.enzima} />}

      {/* etiquetas */}
      {garfo < n && <Etiqueta posicao={[xDe(Math.min(n - 1, garfo), n), 0.75, 0]} texto="Helicase" sub="separa as fitas" tom="violet" />}
      {proxLider >= 0 && <Etiqueta posicao={[xDe(proxLider, n), yBaixo(proxLider) - 0.25, 0]} texto="DNA polimerase" sub="fita contínua · 5'→3'" lado="baixo" />}
      {proxAtrasada >= 0 && <Etiqueta posicao={[xDe(proxAtrasada, n), yCima(proxAtrasada) + 0.3, 0]} texto="DNA polimerase" sub={`fragmento de Okazaki ${e.fragmento[proxAtrasada + 1] >= 0 ? e.fragmento[proxAtrasada + 1] + 1 : ""}`} />}
      {e.ligados && <Etiqueta posicao={[xDe(Math.floor(n / 2), n), yCima(Math.floor(n / 2)) + 0.3, 0]} texto="DNA ligase" sub="uniu os fragmentos" tom="ok" />}

      {/* pontas 5'/3' */}
      <Letra posicao={[xDe(0, n) - 0.45, yCima(0), 0]} letra="5'" cor={paleta.f1} />
      <Letra posicao={[xDe(n - 1, n) + 0.45, yCima(n - 1), 0]} letra="3'" cor={paleta.f1} />
      <Letra posicao={[xDe(0, n) - 0.45, yBaixo(0), 0]} letra="3'" cor={paleta.f2} />
      <Letra posicao={[xDe(n - 1, n) + 0.45, yBaixo(n - 1), 0]} letra="5'" cor={paleta.f2} />
    </group>
  );
}
