import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <AuthShell title="Crie sua" accent="conta." lead="Seus projetos ficam privados e associados à sua conta.">
      <Suspense>
        <AuthForm mode="cadastro" />
      </Suspense>
    </AuthShell>
  );
}
