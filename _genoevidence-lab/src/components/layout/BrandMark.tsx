import Image from "next/image";
import Link from "next/link";

/**
 * Lockup do GenoEvidence (recortado dos arquivos da marca, sem redesenho) seguido do rótulo “Lab”.
 * Nome do produto: “GenoEvidence Lab”.
 */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="GenoEvidence Lab, início">
      {compact ? (
        <Image src="/brand/geno-evidence-simbolo-64.png" alt="" width={30} height={30} priority />
      ) : (
        <Image src="/brand/geno-evidence-lockup.png" alt="" width={138} height={30} priority className="h-[30px] w-auto" />
      )}
      <span className="ge-mono rounded-md bg-ink px-1.5 py-0.5 text-[12px] font-semibold leading-none text-white">Lab</span>
    </Link>
  );
}
