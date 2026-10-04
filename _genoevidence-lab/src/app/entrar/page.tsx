import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { destinoSeguro } from "@/lib/navegacao";
import { Retomar } from "@/components/auth/Retomar";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage(props: PageProps<"/entrar">) {
  const sp = await props.searchParams;
  const voltar = destinoSeguro(typeof sp.voltar === "string" ? sp.voltar : null);
  const user = await getSessionUser();
  if (user?.status === "pendente") redirect("/acesso/pendente");
  if (user?.status === "suspenso") redirect("/acesso/suspenso");
  if (user?.status === "autorizado") {
    if (voltar) redirect(voltar);
    return <Retomar />;
  }
  return (
    <AuthShell title="Entre no" accent="laboratório." lead="Acesse seus projetos, experimentos e a bancada virtual.">
      <Suspense>
        <AuthForm mode="entrar" />
      </Suspense>
    </AuthShell>
  );
}
