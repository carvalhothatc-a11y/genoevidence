"use client";
import { useMemo } from "react";
import { estadoTranscricao } from "@/lib/biomol/processos";
import { complemento } from "@/lib/biomol/sequencias";
import { Base, Blob, CameraSegue, Esqueleto, Etiqueta, Letra, suave, xDe, type Paleta } from "./pecas";

const DUPLEX = 0.32;
const BASE = 0.28;

/**
 * Transcrição esquemática. Em cima, a fita codificante (5'→3' da esquerda para a direita); embaixo,
 * a fita molde (3'→5'). A RNA polimerase anda para a direita, abre uma bolha, e o RNA cresce 5'→3'
 * pareado com a fita molde; atrás dela, o RNA se solta e o DNA volta a se fechar.
 */
export function CenaTranscricao({ codificante, rna, t, paleta, movimento }: { codificante: string; rna: string; t: number; paleta: Paleta; movimento: boolean }) {
  const n = codificante.length;
  const molde = useMemo(() => complemento(codificante, "dna"), [codificante]);
  const e = estadoTranscricao(rna, t);
  const frac = movimento ? t - Math.floor(t) : 1;
  const pc = Math.min(n, t); // posição contínua da polimerase
  const [b0, b1] = e.bolha;
  // quanto a fita codificante sobe em cada posição (rampas suaves nas bordas da bolha)
  const sobe = (i: number) => (e.terminou ? 0 : Math.min(suave((i - b0 + 1) / 2), suave((b1 - i) / 2)));
  const yCod = (i: number) => DUPLEX + 0.95 * sobe(i);
  const qb = `${b0}-${b1}-${e.terminou}`;
  const ptsCod = useMemo<[number, number, number][]>(
    () => Array.from({ length: n }, (_, i) => [xDe(i, n), DUPLEX + 0.95 * (e.terminou ? 0 : Math.min(suave((i - b0 + 1) / 2), suave((b1 - i) / 2))), 0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n, qb],
  );
  const ptsMolde = useMemo<[number, number, number][]>(() => Array.from({ length: n }, (_, i) => [xDe(i, n), -DUPLEX, 0]), [n]);

  // RNA: o trecho híbrido fica pareado com a molde; o resto sai em diagonal, para cima e para trás
  const inicioHibrido = e.pos - e.hibrido;
  const posRna = (i: number): [number, number, number] => {
    if (e.terminou) {
      // solto: uma fita livre acima do DNA
      return [xDe(i, n), 2.3 + 0.08 * Math.sin(i * 0.9), 0.4];
    }
    if (i >= inicioHibrido) return [xDe(i, n), DUPLEX, 0];
    const d = inicioHibrido - i;
    return [xDe(inicioHibrido, n) - 0.3 * d, DUPLEX + 0.42 * d, 0.18 * d];
  };
  const ptsRna = e.rna.length >= 2 ? [...e.rna].map((_, i) => posRna(i)) : [];
  const proximo = !e.terminou && e.pos < n ? e.pos : -1;

  return (
    <group>
      <CameraSegue x={xDe(Math.min(n - 1, pc), n) - 1} y={0.4} distancia={8.5} suave={movimento} />
      <Esqueleto pontos={ptsCod} cor={paleta.f1} />
      <Esqueleto pontos={ptsMolde} cor={paleta.f2} />
      {[...codificante].map((b, i) => (
        <Base key={`c${i}`} x={xDe(i, n)} y={yCod(i)} para={-1} cor={paleta[b as "A"]} comprimento={BASE} opacidade={sobe(i) > 0.5 ? 0.55 : 1} />
      ))}
      {[...molde].map((b, i) => (
        <Base key={`m${i}`} x={xDe(i, n)} y={-DUPLEX} para={1} cor={paleta[b as "A"]} comprimento={BASE} destaque={i === proximo} />
      ))}

      {ptsRna.length >= 2 && <Esqueleto pontos={ptsRna} cor={paleta.rna} raio={0.08} />}
      {[...e.rna].map((b, i) => {
        const p = posRna(i);
        return <Base key={`r${i}`} x={p[0]} y={p[1]} para={-1} cor={paleta[b as "A"]} comprimento={BASE} />;
      })}
      {proximo >= 0 && t >= 0.2 && (
        <group position={[0, 1.4 * (1 - suave(frac)), 0.9 * (1 - suave(frac))]}>
          <Base x={xDe(proximo, n)} y={DUPLEX} para={-1} cor={paleta[rna[proximo] as "A"]} comprimento={BASE} opacidade={0.4 + 0.6 * frac} destaque />
          <Letra posicao={[xDe(proximo, n), DUPLEX + 0.3, 0.3]} letra={rna[proximo]} cor={paleta.texto} />
        </group>
      )}

      {!e.terminou && <Blob posicao={[xDe(Math.min(n - 1, pc), n) - 0.6, 0.25, 0]} escala={[2.1, 1.25, 1.1]} cor={paleta.enzima} opacidade={0.22} />}
      {!e.terminou && <Etiqueta posicao={[xDe(Math.min(n - 1, pc), n), 1.5, 0]} texto="RNA polimerase" sub="lê a fita molde 3'→5'" />}
      {proximo >= 0 && <Etiqueta posicao={[xDe(proximo, n), -0.7, 0]} texto={`molde: ${molde[proximo]}`} sub={`entra ${rna[proximo]} no RNA`} lado="baixo" tom="ok" />}
      {e.rna.length > 3 && !e.terminou && <Etiqueta posicao={posRna(0)} texto="RNA 5'" sub="sai da polimerase" tom="violet" />}
      {e.terminou && <Etiqueta posicao={posRna(0)} texto="mRNA pronto" sub="5'→3'" tom="violet" />}

      <Letra posicao={[xDe(0, n) - 0.45, DUPLEX, 0]} letra="5'" cor={paleta.f1} />
      <Letra posicao={[xDe(n - 1, n) + 0.45, DUPLEX, 0]} letra="3'" cor={paleta.f1} />
      <Letra posicao={[xDe(0, n) - 0.45, -DUPLEX, 0]} letra="3'" cor={paleta.f2} />
      <Letra posicao={[xDe(n - 1, n) + 0.45, -DUPLEX, 0]} letra="5'" cor={paleta.f2} />
    </group>
  );
}
