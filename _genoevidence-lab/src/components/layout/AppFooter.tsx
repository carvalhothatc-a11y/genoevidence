"use client";
import { usePathname } from "next/navigation";

/** Rodapé discreto; oculto nas telas imersivas (laboratório e módulo), onde o espaço é do ambiente. */
export function AppFooter({ appName, version }: { appName: string; version: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/laboratorio") || pathname.startsWith("/modulos/pcr") || pathname.startsWith("/entrar") || pathname.startsWith("/cadastro")) return null;
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted">
        <span className="ge-mono">
          {appName} · v{version}
        </span>
        <span className="ge-mono">Conteúdo educativo; não substitui a validação experimental. Projetos privados por padrão.</span>
      </div>
    </footer>
  );
}
