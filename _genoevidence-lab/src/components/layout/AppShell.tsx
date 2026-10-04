"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { hydrateUiPrefs } from "@/store/ui";
import { LabSidebar } from "@/components/studio/LabSidebar";
import { AppFooter } from "./AppFooter";

type Usuario = { name: string; email: string; role: string; status: string } | null;

/**
 * Moldura comum a TODAS as páginas, com a identidade do laboratório e da área de trabalho:
 * fundo escuro, barra lateral, painéis de vidro. Dentro de .ge-dark os componentes existentes
 * trocam de papel de cor (globals.css) sem duplicar código. As telas imersivas do laboratório
 * já desenham a própria moldura e passam direto.
 */
export function AppShell({ user, appName, version, children }: { user: Usuario; appName: string; version: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    hydrateUiPrefs();
  }, []);

  if (pathname.startsWith("/laboratorio")) return <>{children}</>;

  const autorizado = user?.status === "autorizado";
  if (autorizado && user)
    return (
      <div className="ge-dark ge-fundo flex min-h-dvh flex-col lg:flex-row">
        <LabSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <AppFooter appName={appName} version={version} />
        </div>
      </div>
    );

  // visitante, conta pendente ou suspensa: sem navegação interna
  const sair = async () => {
    await fetch("/api/auth/sair", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  };
  const authPage = pathname.startsWith("/entrar") || pathname.startsWith("/cadastro");
  return (
    <div className="ge-dark ge-fundo flex min-h-dvh flex-col">
      <header className={`flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 ${authPage ? "lg:hidden" : ""}`}>
        <Link href={user ? "/acesso/pendente" : "/entrar"} className="flex items-center gap-2.5" aria-label={`${appName}, início`}>
          <Image src="/brand/geno-evidence-simbolo-64.png" alt="" width={32} height={32} priority className="drop-shadow-[0_0_14px_rgba(123,77,224,0.55)]" />
          <span className="flex flex-col leading-none">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-white [font-family:var(--font-display)]">{appName}</span>
            <span className="mt-0.5 text-[11px] text-[#a7b2c8]">por GenoEvidence</span>
          </span>
        </Link>
        <nav aria-label="Acesso" className="flex items-center gap-1 text-[13px]">
          {user ? (
            <button type="button" onClick={sair} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[#c9d2e3] hover:bg-white/10">
              Sair
            </button>
          ) : (
            !authPage && (
              <>
                <Link href="/entrar" className="ge-press rounded-full px-3 py-1.5 text-[#c9d2e3] hover:bg-white/10">
                  Entrar
                </Link>
                <Link href="/cadastro" className="ge-press rounded-full bg-action px-3 py-1.5 font-semibold text-white">
                  Criar conta
                </Link>
              </>
            )
          )}
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      {!authPage && <AppFooter appName={appName} version={version} />}
    </div>
  );
}
