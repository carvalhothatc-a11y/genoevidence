import Image from "next/image";
import { LogoutButton } from "./LogoutButton";

/** Estado de acesso para quem tem sessão mas não está autorizado (nenhum dado de projeto é carregado). */
export function AccessState({ kind, name }: { kind: "pendente" | "suspenso"; name: string }) {
  return (
    <div className="grid min-h-[calc(100dvh-56px)] place-items-center px-4 py-12">
      <section className="ge-card ge-em-foco w-full max-w-lg p-8 text-center" aria-labelledby="estado-titulo">
        <Image src="/brand/geno-evidence-simbolo-192.png" alt="" width={56} height={56} className="mx-auto mb-4" />
        <p className="ge-eyebrow mb-2 justify-center">{kind === "pendente" ? "acesso em análise" : "acesso suspenso"}</p>
        <h1 id="estado-titulo" className="ge-display text-3xl">
          {kind === "pendente" ? (
            <>
              Quase <span className="ge-gradient-text">lá</span>, {name.split(" ")[0]}.
            </>
          ) : (
            <>Acesso suspenso</>
          )}
        </h1>
        <p className="mt-3 text-body">
          {kind === "pendente"
            ? "Seu cadastro foi recebido e aguarda aprovação da administração do GenoLab. Enquanto isso, nenhum projeto ou dado do laboratório fica disponível para esta conta."
            : "O acesso desta conta ao GenoLab foi suspenso pela administração. Se acredita que é um engano, fale com a pessoa responsável pelo laboratório."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
