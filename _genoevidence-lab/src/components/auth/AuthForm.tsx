"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

function safeReturn(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/entrar") && !v.startsWith("/cadastro") ? v : "/laboratorio";
}

export function AuthForm({ mode }: { mode: "entrar" | "cadastro" }) {
  const router = useRouter();
  const search = useSearchParams();
  const voltar = safeReturn(search.get("voltar"));
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const local: Record<string, string> = {};
    if (mode === "cadastro") {
      if (name.trim().length < 2) local.name = "Informe seu nome.";
      if (password.length < 10) local.password = "A senha precisa de pelo menos 10 caracteres.";
      if (confirm !== password) local.confirm = "As senhas não conferem.";
      if (!accept) local.acceptPrivacy = "É preciso concordar para continuar.";
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) local.email = "Informe um e-mail válido.";
    if (!password) local.password = local.password ?? "Informe a senha.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "cadastro" ? { name, institution: institution || undefined, email, password, acceptPrivacy: accept } : { email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {};
      for (const d of data.details ?? []) map[d.campo] = d.mensagem;
      setErrors(map);
      setMessage(data.error ?? "Não foi possível continuar.");
      return;
    }
    if (mode === "cadastro") {
      setDone(data.message ?? "Cadastro recebido.");
      setPassword("");
      setConfirm("");
      return;
    }
    router.replace(data.status === "autorizado" ? voltar : "/acesso/pendente");
    router.refresh();
  }

  const err = (k: string) => errors[k];
  if (done)
    return (
      <div className="grid gap-4" role="status">
        <Alert tone="ok" title={done}>
          Assim que a administração do GenoLab aprovar seu acesso, seus projetos ficam disponíveis. Por segurança, esta mensagem é a mesma para qualquer e-mail informado.
        </Alert>
        <Link className="font-semibold text-accent-ink underline" href={`/entrar?voltar=${encodeURIComponent(voltar)}`}>
          Ir para a tela de entrada
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-describedby="auth-status">
      {mode === "cadastro" && (
        <>
          <Field label="Nome completo" htmlFor="nome" error={err("name")}>
            <TextInput id="nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(err("name"))} />
          </Field>
          <Field label="Instituição (opcional)" htmlFor="instituicao">
            <TextInput id="instituicao" autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          </Field>
        </>
      )}
      <Field label="E-mail" htmlFor="email" error={err("email")}>
        <TextInput id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(err("email"))} />
      </Field>
      <Field label="Senha" htmlFor="senha" error={err("password")} hint={mode === "cadastro" ? "Pelo menos 10 caracteres." : undefined}>
        <div className="relative">
          <TextInput
            id="senha"
            type={show ? "text" : "password"}
            autoComplete={mode === "cadastro" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(err("password"))}
            className="pr-20"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-muted hover:bg-surface-2" aria-pressed={show}>
            {show ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </Field>
      {mode === "cadastro" && (
        <>
          <Field label="Confirmar senha" htmlFor="confirmar" error={err("confirm")}>
            <TextInput id="confirmar" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={Boolean(err("confirm"))} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} aria-invalid={Boolean(err("acceptPrivacy"))} />
            <span>
              Li e concordo com a{" "}
              <Link className="font-semibold text-accent-ink underline" href="/privacidade" target="_blank" rel="noopener">
                Política de privacidade
              </Link>
              , inclusive com o armazenamento da conta e dos projetos no servidor do laboratório, nos Estados Unidos. Entendo que o acesso depende de aprovação.
              {err("acceptPrivacy") && <span className="block text-xs font-medium text-danger">{err("acceptPrivacy")}</span>}
            </span>
          </label>
        </>
      )}
      <div id="auth-status" aria-live="polite">
        {message && <Alert tone="danger" title={message} />}
      </div>
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Aguarde…" : mode === "cadastro" ? "Solicitar acesso" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-body">
        {mode === "cadastro" ? (
          <>
            Já tem conta?{" "}
            <Link className="font-semibold text-accent-ink underline" href={`/entrar?voltar=${encodeURIComponent(voltar)}`}>
              Entrar
            </Link>
          </>
        ) : (
          <>
            Primeiro acesso?{" "}
            <Link className="font-semibold text-accent-ink underline" href={`/cadastro?voltar=${encodeURIComponent(voltar)}`}>
              Criar conta
            </Link>
          </>
        )}
      </p>
      <p className="text-center text-xs text-muted">
        <Link className="underline" href="/privacidade">
          Política de privacidade
        </Link>
      </p>
    </form>
  );
}
