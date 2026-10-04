"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hydrateUiPrefs, useUi } from "@/store/ui";

const I = {
  lab: (
    <path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.6L14 9.2V3M7.5 14h9" />
  ),
  pasta: <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v9.3A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />,
  livro: <path d="M12 6.5C10.3 5.2 7.8 4.6 4 4.8v13.4c3.8-.2 6.3.4 8 1.7m0-13.4c1.7-1.3 4.2-1.9 8-1.7v13.4c-3.8-.2-6.3.4-8 1.7m0-13.4v13.4" />,
  tecnicas: <path d="M7 4c0 4 10 4 10 8s-10 4-10 8M17 4c0 4-10 4-10 8s10 4 10 8M8.5 7h7M8.5 17h7" />,
  ajuda: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.4-11.6a2.6 2.6 0 0 1 5 .9c0 1.7-2.6 2.2-2.6 3.7M12 17.2v.01" />,
  integracoes: <path d="M9 7H6a3 3 0 0 0 0 6h3m6-6h3a3 3 0 0 1 0 6h-3m-6-3h6M9 17l-1 3m7-3 1 3" />,
  admin: <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.4 7.5 9.5 4.4-1.1 7.5-5.1 7.5-9.5V6zM9 12l2 2 4-4" />,
  pausa: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sair: <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h10" />,
};

function Icon({ d }: { d: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}

type User = { name: string; email: string; role: string };

const NAV = [
  { href: "/laboratorio", rotulo: "Área de trabalho", icone: I.lab },
  { href: "/laboratorio/bancada", rotulo: "Bancada 3D", icone: I.tecnicas },
  { href: "/projetos", rotulo: "Projetos", icone: I.pasta },
  { href: "/referencias", rotulo: "Referências", icone: I.livro },
  { href: "/modulos", rotulo: "Técnicas", icone: I.tecnicas },
  { href: "/integracoes", rotulo: "Integrações", icone: I.integracoes },
  { href: "/ajuda", rotulo: "Ajuda e Geninho", icone: I.ajuda },
];

/** Barra lateral do estúdio imersivo (substitui o cabeçalho no laboratório). */
export function LabSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const paused = useUi((s) => s.paused);
  const togglePaused = useUi((s) => s.togglePaused);
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    hydrateUiPrefs();
  }, []);
  const sair = async () => {
    await fetch("/api/auth/sair", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  };
  const itens = user.role === "admin" ? [...NAV, { href: "/admin", rotulo: "Administração", icone: I.admin }] : NAV;

  const conteudo = (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Link href="/" className="flex items-center gap-3 px-1" aria-label="GenoLab, início">
        <Image src="/brand/geno-evidence-simbolo-64.png" alt="" width={44} height={44} priority className="drop-shadow-[0_0_18px_rgba(123,77,224,0.55)]" />
        <span className="flex flex-col leading-none">
          <span className="text-[22px] font-semibold tracking-[-0.03em] text-white [font-family:var(--font-display)]">GenoLab</span>
          <span className="mt-1 text-[12px] text-[#a7b2c8]">por GenoEvidence</span>
        </span>
      </Link>
      <nav aria-label="Navegação principal">
        <ul className="grid gap-1.5">
          {itens.map((it) => {
            const ativo = it.href === "/laboratorio" ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={ativo ? "page" : undefined}
                  onClick={() => setAberta(false)}
                  className={`ge-press relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] ${ativo ? "ge-nav-ativo font-semibold text-white" : "text-[#c9d2e3] hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon d={it.icone} />
                  {it.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto grid gap-3">
        <button type="button" onClick={togglePaused} aria-pressed={paused} className="ge-press flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-[#c9d2e3] hover:bg-white/5">
          <Icon d={paused ? I.play : I.pausa} />
          {paused ? "Retomar animações" : "Pausar animações"}
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: "var(--ge-gradient)" }}>
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
            <span className="block truncate text-[11px] text-[#a7b2c8]">{user.email}</span>
          </span>
          <button type="button" onClick={sair} className="ge-press rounded-lg p-1.5 text-[#c9d2e3] hover:bg-white/10 hover:text-white" title="Sair">
            <Icon d={I.sair} />
            <span className="sr-only">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="ge-sidebar hidden h-dvh w-[268px] shrink-0 lg:block">{conteudo}</aside>
      {/* Celular/tablet: barra superior com menu */}
      <div className="ge-sidebar flex h-14 items-center justify-between px-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2" aria-label="GenoLab, início">
          <Image src="/brand/geno-evidence-simbolo-64.png" alt="" width={30} height={30} />
          <span className="text-[17px] font-semibold text-white [font-family:var(--font-display)]">GenoLab</span>
        </Link>
        <button type="button" onClick={() => setAberta(!aberta)} aria-expanded={aberta} aria-controls="menu-lab" className="ge-press rounded-lg p-2 text-white hover:bg-white/10">
          <Icon d={I.menu} />
          <span className="sr-only">Menu</span>
        </button>
      </div>
      {aberta && (
        <div id="menu-lab" className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar menu" onClick={() => setAberta(false)} />
          <aside className="ge-sidebar absolute inset-y-0 left-0 w-[280px]">{conteudo}</aside>
        </div>
      )}
    </>
  );
}
