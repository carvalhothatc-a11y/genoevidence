"use client";
import { useEffect } from "react";
import { useVoz, LIMITE_VOZ_MS } from "@/components/workspace/useVoz";
import { Button } from "@/components/ui/Button";

/**
 * Ditar o registro do dia em vez de escrever.
 *
 * O que fica claro na tela, porque muda o que a pessoa deve dizer em voz alta:
 *
 * - o microfone só liga quando ela clica, e desliga sozinho em 2 minutos;
 * - o GenoLab **não guarda áudio** — recebe o texto já reconhecido pelo navegador;
 * - no Chrome, quem faz o reconhecimento é o Google, então o áudio passa por lá. Isso é dito
 *   ANTES de gravar, não depois.
 *
 * O texto ditado é ACRESCENTADO ao que já está escrito, nunca substitui.
 */
export function Ditado({ aoDitar, desabilitado }: { aoDitar: (texto: string) => void; desabilitado?: boolean }) {
  const voz = useVoz();

  // Ao parar, entrega o que foi reconhecido e limpa, para a próxima gravação começar do zero.
  useEffect(() => {
    if (!voz.gravando && voz.transcricao.trim()) {
      aoDitar(voz.transcricao.trim());
      voz.limpar();
    }
  }, [voz.gravando, voz.transcricao, voz, aoDitar]);

  if (!voz.suporte)
    return (
      <p className="text-xs text-muted">
        Este navegador não reconhece voz (funciona no Chrome e no Edge). Escreva o registro.
      </p>
    );

  const restante = Math.max(0, Math.round(LIMITE_VOZ_MS / 1000 - voz.segundos));

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={voz.gravando ? "danger" : "secondary"}
          onClick={() => (voz.gravando ? voz.parar() : voz.iniciar())}
          disabled={desabilitado}
          data-testid="ditar"
        >
          {voz.gravando ? `Parar (${restante}s)` : "Falar em vez de escrever"}
        </Button>
        {voz.gravando && (
          <span className="flex items-center gap-1.5 text-xs text-danger" role="status">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-danger" /> gravando
          </span>
        )}
      </div>

      {voz.gravando && voz.parcial && (
        <p className="rounded-lg bg-surface-2 p-2 text-[13px] text-muted" aria-live="polite">
          {voz.parcial}…
        </p>
      )}
      {voz.erro && (
        <p className="text-xs text-danger" role="alert">
          {voz.erro}
        </p>
      )}

      <p className="text-xs text-muted">
        O microfone só liga quando você clica e desliga sozinho em 2 minutos. O GenoLab não guarda o áudio: recebe só o texto. No
        Chrome, quem reconhece a fala é o Google — o áudio passa por lá.
      </p>
    </div>
  );
}
