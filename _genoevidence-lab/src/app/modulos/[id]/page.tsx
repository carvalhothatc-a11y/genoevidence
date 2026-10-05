import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/projects/server";
import { obterTecnica, TECNICAS } from "@/lib/modules/tecnicas";
import { ModuloTecnica } from "@/components/tecnicas/ModuloTecnica";

export async function generateMetadata(props: PageProps<"/modulos/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const t = obterTecnica(id);
  return { title: t ? t.titulo : "Técnica" };
}

export default async function TecnicaPage(props: PageProps<"/modulos/[id]">) {
  const { id } = await props.params;
  const tecnica = obterTecnica(id);
  if (!tecnica) notFound();
  await requirePageUser(`/modulos/${id}`);
  return <ModuloTecnica tecnica={tecnica} />;
}

/** Ids válidos (a página é dinâmica; isto só documenta o conjunto). */
export const dynamicParams = true;
export function generateStaticParams() {
  return TECNICAS.map((t) => ({ id: t.id }));
}
