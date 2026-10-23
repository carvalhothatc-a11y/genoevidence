import type { Metadata } from "next";
import { requirePageUser } from "@/lib/projects/server";
import { Sequencias } from "@/components/biomol/sequencias/Sequencias";

export const metadata: Metadata = { title: "Sequências · Moléculas" };

export default async function SequenciasPage() {
  await requirePageUser("/moleculas/sequencias");
  return <Sequencias />;
}
