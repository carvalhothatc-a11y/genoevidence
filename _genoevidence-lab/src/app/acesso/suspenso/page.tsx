import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AccessState } from "@/components/auth/AccessState";

export const metadata: Metadata = { title: "Acesso suspenso" };

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  if (user.status === "autorizado") redirect("/laboratorio");
  if (user.status !== "suspenso") redirect(`/acesso/${user.status}`);
  return <AccessState kind="suspenso" name={user.name} />;
}
