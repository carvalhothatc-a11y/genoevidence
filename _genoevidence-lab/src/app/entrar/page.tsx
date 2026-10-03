import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthShell title="Entre no" accent="laboratório." lead="Acesse seus projetos, experimentos e a bancada virtual.">
      <Suspense>
        <AuthForm mode="entrar" />
      </Suspense>
    </AuthShell>
  );
}
