import { redirect } from "next/navigation";

/** O fluxo “Explorar uma ideia” da PCR acontece na bancada 3D (barra de comando). */
export default async function Page(props: PageProps<"/laboratorio/explorar">) {
  const sp = await props.searchParams;
  const projeto = typeof sp.projeto === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(sp.projeto) ? `&projeto=${sp.projeto}` : "";
  redirect(`/laboratorio/bancada?ideia=1${projeto}`);
}
