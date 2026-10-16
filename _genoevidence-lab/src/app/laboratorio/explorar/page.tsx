import { redirect } from "next/navigation";
import { BANCADA_3D_ATIVA } from "@/lib/config";

/** O fluxo “Explorar uma ideia” da PCR acontece na bancada 3D (barra de comando). */
export default async function Page(props: PageProps<"/laboratorio/explorar">) {
  const sp = await props.searchParams;
  const projeto = typeof sp.projeto === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(sp.projeto) ? `&projeto=${sp.projeto}` : "";
  // Com a bancada fora do ar, este atalho levaria a um 404: vai para a área de trabalho.
  if (!BANCADA_3D_ATIVA) redirect("/laboratorio");
  redirect(`/laboratorio/bancada?ideia=1${projeto}`);
}
