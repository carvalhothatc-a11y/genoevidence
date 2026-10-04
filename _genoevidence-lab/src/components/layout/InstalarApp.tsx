"use client";
import { useEffect, useState } from "react";

type PedidoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let pedidoGuardado: PedidoInstalacao | null = null;
const ouvintes = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedidoGuardado = e as PedidoInstalacao;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    pedidoGuardado = null;
    ouvintes.forEach((f) => f());
  });
}

/** Registra o service worker mínimo (página “sem conexão”); só em produção. */
export function registrarServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

function useInstalacao() {
  const [, forcar] = useState(0);
  const [instalado, setInstalado] = useState(false);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    const mq = window.matchMedia("(display-mode: standalone)");
    const on = () => setInstalado(mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    on();
    mq.addEventListener("change", on);
    return () => {
      ouvintes.delete(f);
      mq.removeEventListener("change", on);
    };
  }, []);
  return { pedido: pedidoGuardado, instalado };
}

function plataforma(): "ios" | "mac-safari" | "android" | "firefox" | "chromium" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua)) return "mac-safari";
  return "chromium";
}

const INSTRUCOES: Record<ReturnType<typeof plataforma>, string> = {
  chromium: "No Chrome ou no Edge: clique no ícone de instalar na barra de endereço (um monitor com seta) ou abra o menu ⋮ e escolha “Instalar GenoLab”.",
  "mac-safari": "No Safari do Mac: menu Arquivo → “Adicionar ao Dock”.",
  ios: "No iPhone ou iPad (Safari): toque em Compartilhar e depois em “Adicionar à Tela de Início”.",
  android: "No Android (Chrome): abra o menu ⋮ e toque em “Instalar app” ou “Adicionar à tela inicial”.",
  firefox: "O Firefox não instala aplicativos da web no computador. Abra o GenoLab no Chrome, no Edge ou no Safari para instalar.",
};

/**
 * Botão “Instalar o GenoLab”: usa a instalação do navegador quando disponível; senão mostra como
 * instalar em cada navegador. Some quando o app já está instalado e aberto como aplicativo.
 */
export function InstalarApp({ variante = "barra" }: { variante?: "barra" | "pagina" }) {
  const { pedido, instalado } = useInstalacao();
  const [ajuda, setAjuda] = useState<string | null>(null);
  if (instalado)
    return variante === "pagina" ? <p className="text-sm text-[#8de8bf]">O GenoLab já está instalado e aberto como aplicativo neste dispositivo.</p> : null;
  const instalar = async () => {
    if (pedido) {
      await pedido.prompt();
      const escolha = await pedido.userChoice.catch(() => null);
      if (escolha?.outcome === "accepted") pedidoGuardado = null;
      return;
    }
    setAjuda(INSTRUCOES[plataforma()]);
  };
  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        onClick={() => void instalar()}
        className={variante === "barra" ? "ge-press flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-[#c9d2e3] hover:bg-white/5 hover:text-white" : "ge-press justify-self-start rounded-full bg-action px-4 py-2 text-sm font-semibold text-white"}
        data-testid="instalar-app"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={variante === "barra" ? "" : "hidden"}>
          <path d="M12 4v10m0 0-4-4m4 4 4-4M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
        </svg>
        Instalar o GenoLab
      </button>
      {ajuda && (
        <p role="status" className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] leading-snug text-[#c9d2e3] ${variante === "barra" ? "mx-1" : ""}`}>
          {ajuda}
        </p>
      )}
    </div>
  );
}
