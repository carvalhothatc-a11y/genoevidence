import type { Metadata } from "next";
import { requirePageUser } from "@/lib/projects/server";
import { AcidosNucleicos } from "@/components/biomol/acidos/AcidosNucleicos";

export const metadata: Metadata = { title: "DNA e RNA · Moléculas" };

export default async function AcidosNucleicosPage() {
  await requirePageUser("/moleculas/acidos-nucleicos");
  return <AcidosNucleicos />;
}
