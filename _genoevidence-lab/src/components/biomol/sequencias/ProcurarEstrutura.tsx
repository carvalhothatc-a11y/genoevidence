"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { num } from "../comum";

type Achado = {
  entidade: string;
  pdbId: string;
  cadeias: string[];
  descricao?: string;
  organismo?: string;
  identidade: number;
  evalue: number;
  consultaInicio: number;
  consultaFim: number;
  consultaComprimento: number;
  alvoInicio: number;
  alvoFim: number;
  alvoComprimento: number;
  consultaAlinhada: string;
  alvoAlinhada: string;
  estrutura: { pdbId: string; titulo: string; metodo?: string; resolucao?: number; url: string } | null;
};

type Resposta = { encontrado: true; itens: Achado[] } | { encontrado: false; motivo: string };

/**
 * Procurar estruturas de proteínas PARECIDAS no PDB.
 *
 * Duas coisas que esta tela nunca faz: buscar sem a pessoa pedir (a sequência sai do GenoLab), e
 * apresentar o achado como "a estrutura da sua sequência". Ela mostra a identidade e o trecho que
 * se alinhou, e a pessoa decide se aquilo serve.
 */
export function ProcurarEstrutura({ proteina, origem }: { proteina: string; origem: string }) {
  const [estado, setEstado] = useState<"parado" | "confirmar" | "buscando" | "pronto" | "erro">("parado");
  const [resp, setResp] = useState<Resposta | null>(null);
  const [erro, setErro] = useState("");
  const limpa = proteina.replace(/\*+$/, "");

  // Outra proteína escolhida: o resultado anterior não vale mais.
  useEffect(() => {
    setEstado("parado");
    setResp(null);
  }, [limpa]);

  const buscar = async () => {
    setEstado("buscando");
    setErro("");
    try {
      const r = await fetch("/api/moleculas/sequencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proteina: limpa }) });
      const d = (await r.json().catch(() => ({}))) as Resposta & { error?: string };
      if (!r.ok) throw new Error(d.error ?? `O GenoLab respondeu com erro (${r.status}).`);
      setResp(d);
      setEstado("pronto");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível procurar agora.");
      setEstado("erro");
    }
  };

  if (limpa.length < 10) return <p className="text-xs text-muted">Com menos de 10 aminoácidos o PDB não faz busca por sequência.</p>;
  if (limpa.includes("*")) return <p className="text-xs text-muted">Esta proteína tem paradas (“*”) no meio; escolha uma ORF para procurar estruturas parecidas.</p>;

  return (
    <div className="grid gap-2" data-testid="procurar-estrutura">
      {estado === "parado" && (
        <button type="button" onClick={() => setEstado("confirmar")} className="ge-press justify-self-start rounded-full border border-line px-3.5 py-2 text-[13px] font-medium hover:bg-surface-2">
          Procurar estruturas parecidas no PDB…
        </button>
      )}
      {estado === "confirmar" && (
        <div className="grid gap-2 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="dialog" aria-label="Confirmar envio ao RCSB PDB">
          <p>
            Para procurar, a sequência de aminoácidos ({limpa.length} aa, de {origem}) será enviada ao <strong>RCSB PDB</strong>, um serviço público dos EUA. Só a
            sequência sai — sem nome, projeto ou DNA. Se ela for confidencial, não envie.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void buscar()} className="ge-press rounded-full bg-action px-4 py-2 text-[13px] font-semibold text-white" data-testid="confirmar-busca">
              Enviar e procurar
            </button>
            <button type="button" onClick={() => setEstado("parado")} className="ge-press rounded-full border border-line px-4 py-2 text-[13px]">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {estado === "buscando" && (
        <p className="text-sm text-muted" role="status">
          Procurando no RCSB PDB…
        </p>
      )}
      {estado === "erro" && (
        <p className="text-sm text-danger" role="alert">
          {erro}{" "}
          <button type="button" onClick={() => setEstado("confirmar")} className="underline">
            Tentar de novo
          </button>
        </p>
      )}
      {estado === "pronto" && resp && !resp.encontrado && (
        <p className="rounded-lg border border-line p-3 text-sm" role="status" data-testid="sem-estrutura">
          {resp.motivo} Isso não quer dizer que a proteína não tenha estrutura — só que nenhuma estrutura experimental depositada tem sequência parecida.
        </p>
      )}
      {estado === "pronto" && resp?.encontrado && (
        <div className="grid gap-2" data-testid="achados-sequencia">
          <p className="text-xs text-muted">
            Resultados do serviço de busca por sequência do RCSB (MMseqs2), do mais parecido para o menos. <strong>Uma estrutura parecida não é a estrutura da sua sequência</strong>
            : ela pertence à proteína depositada, e só vale para os trechos alinhados.
          </p>
          <ul className="grid gap-2">
            {resp.itens.map((a) => {
              const cobertura = (a.consultaFim - a.consultaInicio + 1) / a.consultaComprimento;
              const cadeia = a.cadeias[0];
              return (
                <li key={a.entidade} className="grid gap-1.5 rounded-xl border border-line p-3" data-achado={a.pdbId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {a.pdbId} <span className="font-normal text-muted">· {a.descricao ?? a.estrutura?.titulo ?? "sem descrição"}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {a.organismo ? `${a.organismo} · ` : ""}
                        {a.estrutura?.metodo ?? "método não informado"}
                        {a.estrutura?.resolucao ? ` · ${num(a.estrutura.resolucao, 2)} Å` : ""}
                        {a.cadeias.length ? ` · cadeia${a.cadeias.length > 1 ? "s" : ""} ${a.cadeias.join(", ")}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/moleculas?pdb=${a.pdbId}${cadeia ? `&cadeia=${encodeURIComponent(cadeia)}` : ""}`}
                      className="ge-press rounded-full bg-accent px-3 py-1.5 text-[13px] font-semibold text-white"
                      data-abrir-3d={a.pdbId}
                    >
                      Abrir em 3D
                    </Link>
                  </div>
                  <p className="text-sm">
                    <strong className="tabular-nums">{num(100 * a.identidade, 1)}%</strong> de identidade no trecho alinhado · cobre os aminoácidos {a.consultaInicio}–
                    {a.consultaFim} da sua sequência ({num(100 * cobertura, 0)}%) e {a.alvoInicio}–{a.alvoFim} da depositada · e-value {a.evalue.toExponential(1)}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-xs text-accent-ink">ver o trecho alinhado</summary>
                    <pre className="ge-mono mt-1 overflow-x-auto rounded-lg bg-panel p-2 text-[12px] leading-5">
                      {`sua      ${a.consultaAlinhada}\n         ${[...a.consultaAlinhada].map((c, i) => (c === a.alvoAlinhada[i] ? "|" : " ")).join("")}\n${a.pdbId.padEnd(9)}${a.alvoAlinhada}`}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
