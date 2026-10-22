"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { assuntoDoDia, corpoDoDia } from "@/lib/caderno/email";
import type { Registro } from "@/lib/caderno/tipos";

type Estado = { configurado: boolean; soParaDonaDaConta: boolean; motivo?: string };

/**
 * Enviar o registro do dia para o e-mail de quem está usando.
 *
 * O destinatário nunca é escolhido aqui nem vai no pedido: o servidor lê da sessão. Esta tela não
 * serve para mandar mensagem a outra pessoa.
 *
 * Quando o servidor não tem o envio configurado, o botão NÃO finge que envia: abre o programa de
 * e-mail da pessoa com tudo preenchido, para ela mesma apertar enviar. É a diferença entre uma
 * integração que existe e um botão que parece existir.
 */
export function EnviarPorEmail({ registro }: { registro: Registro }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const r = await fetch("/api/caderno/estado-email").catch(() => null);
      const d = (await r?.json().catch(() => null)) as Estado | null;
      if (vivo && d) setEstado(d);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const enviar = async () => {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/caderno/${registro.id}/enviar`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { para?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Não foi possível enviar.");
      setMsg({ tom: "ok", texto: `Enviado para ${d.para}. Se não aparecer, confira a caixa de spam.` });
    } catch (e) {
      setMsg({ tom: "erro", texto: e instanceof Error ? e.message : "Não foi possível enviar." });
    } finally {
      setEnviando(false);
    }
  };

  const abrirNoMeuEmail = () => {
    const corpo = corpoDoDia(registro);
    const url = `mailto:?subject=${encodeURIComponent(assuntoDoDia(registro))}&body=${encodeURIComponent(corpo)}`;
    window.location.href = url;
  };

  const documento = async (enviar: boolean) => {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/caderno/${registro.id}/documento${enviar ? "?enviar=1" : ""}`, { method: "POST" });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Não foi possível gerar o documento.");
      }
      if (enviar) {
        const d = (await r.json()) as { para: string; reescrito: boolean; motivo?: string };
        setMsg({
          tom: "ok",
          texto: d.reescrito
            ? `Documento enviado para ${d.para}. Ele foi reescrito em linguagem de relatório, e a sua anotação original está no fim dele.`
            : `Documento enviado para ${d.para}, com o seu texto como você escreveu. ${d.motivo ?? ""}`.trim(),
        });
        return;
      }
      const bytes = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(bytes);
      a.download = `registro-${registro.dia}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg({
        tom: "ok",
        texto: r.headers.get("X-Reescrito") === "1" ? "Documento baixado. Foi reescrito em relatório; o seu texto original está no fim dele." : "Documento baixado com o seu texto como você escreveu.",
      });
    } catch (e) {
      setMsg({ tom: "erro", texto: e instanceof Error ? e.message : "Não foi possível gerar o documento." });
    } finally {
      setEnviando(false);
    }
  };

  const baixar = () => {
    const nome = `caderno-${registro.dia}.txt`;
    const blob = new Blob([`${assuntoDoDia(registro)}\n\n${corpoDoDia(registro)}`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid gap-1.5" data-testid="enviar-email">
      <div className="flex flex-wrap gap-2">
        {estado?.configurado ? (
          <Button size="sm" variant="secondary" onClick={() => void enviar()} disabled={enviando} data-testid="enviar-agora">
            {enviando ? "Enviando…" : "Enviar para o meu e-mail"}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={abrirNoMeuEmail} data-testid="abrir-no-email">
            Abrir no meu e-mail
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => void documento(false)} disabled={enviando} data-testid="baixar-word">
          {enviando ? "Montando…" : "Baixar em Word"}
        </Button>
        {estado?.configurado && (
          <Button size="sm" variant="secondary" onClick={() => void documento(true)} disabled={enviando} data-testid="enviar-word">
            Enviar o Word por e-mail
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={baixar} data-testid="baixar-dia">
          Baixar como texto
        </Button>
      </div>

      <p className="text-xs text-muted">
        O documento em Word é reescrito em linguagem de relatório, e a sua anotação original vai no fim dele, sem alteração.
      </p>

      {estado && !estado.configurado && (
        <p className="text-xs text-muted">
          O envio automático não está ligado neste servidor, então o botão abre o seu próprio programa de e-mail com o registro
          preenchido — você confere e aperta enviar.
        </p>
      )}
      {estado?.configurado && estado.soParaDonaDaConta && (
        <p className="text-xs text-muted">
          O serviço de e-mail está no modo de teste: entrega só para o endereço da conta cadastrada nele.
        </p>
      )}
      {msg && (
        <p className={`text-xs ${msg.tom === "ok" ? "text-ok" : "text-danger"}`} role={msg.tom === "erro" ? "alert" : "status"}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
