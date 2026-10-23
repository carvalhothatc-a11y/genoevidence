import type { Metadata } from "next";
import { requirePageUser } from "@/lib/projects/server";
import { Comparar } from "@/components/biomol/comparar/Comparar";

export const metadata: Metadata = { title: "Comparar estruturas · Moléculas" };

export default async function CompararPage() {
  await requirePageUser("/moleculas/comparar");
  return <Comparar />;
}
