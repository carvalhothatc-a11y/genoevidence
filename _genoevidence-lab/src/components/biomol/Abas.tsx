"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHidratarBioMol } from "./estado";

export const ABAS = [
  { href: "/moleculas", rotulo: "Estruturas 3D", dica: "procurar e explorar estruturas depositadas" },
  { href: "/moleculas/sequencias", rotulo: "Sequências", dica: "FASTA, fitas, tradução, ORFs e alinhamento" },
  { href: "/moleculas/acidos-nucleicos", rotulo: "DNA e RNA", dica: "dupla-hélice, bases e pareamento" },
  { href: "/moleculas/processos", rotulo: "Processos", dica: "replicação, transcrição e tradução" },
  { href: "/moleculas/comparar", rotulo: "Comparar estruturas", dica: "superposição e RMSD" },
] as const;

/** Navegação entre as ferramentas da BioMol. Também carrega o estado guardado na aba. */
export function AbasBioMol() {
  const caminho = usePathname();
  useHidratarBioMol();
  return (
    <nav aria-label="Ferramentas da BioMol" className="-mx-1 mb-6 overflow-x-auto pb-1">
      <ul className="flex min-w-max gap-1 border-b border-line px-1">
        {ABAS.map((a) => {
          const ativa = a.href === "/moleculas" ? caminho === "/moleculas" : caminho?.startsWith(a.href);
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                title={a.dica}
                aria-current={ativa ? "page" : undefined}
                data-aba={a.href}
                className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3.5 text-[14px] font-medium transition-colors ${
                  ativa ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {a.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
