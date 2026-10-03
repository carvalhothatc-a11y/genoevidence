"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { hydrateUiPrefs, useUi } from "@/store/ui";
import { BrandMark } from "./BrandMark";

const NAV = [
  { href: "/laboratorio", label: "Laboratório" },
  { href: "/projetos", label: "Projetos" },
  { href: "/modulos", label: "Técnicas" },
  { href: "/integracoes", label: "Integrações" },
  { href: "/ajuda", label: "Ajuda" },
];

/** Barra superior compacta (56 px). */
export function AppHeader({ appName, user }: { appName: string; user: { name: string; email: string; role: string; status: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const authPage = pathname.startsWith("/entrar") || pathname.startsWith("/cadastro");
  async function logout() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  }
  const paused = useUi((s) => s.paused);
  const togglePaused = useUi((s) => s.togglePaused);

  useEffect(() => {
    hydrateUiPrefs();
  }, []);

  // O laboratório usa a própria barra lateral (tela imersiva).
  if (pathname.startsWith("/laboratorio")) return null;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-6 px-4">
        <div className="hidden sm:block">
          <BrandMark />
        </div>
        <div className="sm:hidden">
          <BrandMark compact />
        </div>
        {!authPage && user && user.status === "autorizado" && (
        <nav aria-label="Navegação principal" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`ge-press relative block whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                      active ? "font-semibold text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {item.label}
                    {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[9px] h-[3px] rounded-full bg-action-brand" />}
                  </Link>
                </li>
              );
            })}
            {user.role === "admin" && (
              <li>
                <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className={`ge-press block whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${pathname.startsWith("/admin") ? "font-semibold text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                  Administração
                </Link>
              </li>
            )}
          </ul>
        </nav>
        )}
        {(authPage || !user || user.status !== "autorizado") && <div className="flex-1" />}
        {!authPage && user && (
        <button
          type="button"
          onClick={togglePaused}
          aria-pressed={paused}
          className="ge-press hidden min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink hover:bg-surface-2 md:inline-flex"
        >
          <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
          {paused ? "Retomar animações" : "Pausar animações"}
        </button>
        )}
        {!authPage && user && (
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-right text-xs leading-tight lg:block" title={user.email}>
              <span className="block font-semibold text-ink">{user.name}</span>
              <span className="ge-mono text-[11px] text-muted">{user.email}</span>
            </span>
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: "var(--ge-gradient)" }}>
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <button type="button" onClick={logout} className="ge-press rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
              Sair
            </button>
          </div>
        )}
        {authPage && (
          <a href={pathname.startsWith("/entrar") ? "/cadastro" : "/entrar"} className="ge-press rounded-full border-[1.5px] border-ink/80 px-4 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2">
            {pathname.startsWith("/entrar") ? "Criar conta" : "Entrar"}
          </a>
        )}
      </div>
    </header>
  );
}
