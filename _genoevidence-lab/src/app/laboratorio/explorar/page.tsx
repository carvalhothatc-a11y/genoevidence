import { redirect } from "next/navigation";

/** O fluxo “Explorar uma ideia” agora acontece dentro do laboratório (barra de comando). */
export default async function Page(props: PageProps<"/laboratorio/explorar">) {
  const sp = await props.searchParams;
  const projeto = typeof sp.projeto === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(sp.projeto) ? `&projeto=${sp.projeto}` : "";
  redirect(`/laboratorio?ideia=1${projeto}`);
}
