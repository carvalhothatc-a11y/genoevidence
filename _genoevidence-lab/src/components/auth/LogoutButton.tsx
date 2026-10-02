"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await fetch("/api/auth/sair", { method: "POST" });
        router.replace("/entrar");
        router.refresh();
      }}
    >
      Sair
    </Button>
  );
}
