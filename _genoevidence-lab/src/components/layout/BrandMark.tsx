import Image from "next/image";
import Link from "next/link";

/**
 * Marca do GenoLab no mesmo padrão do .logo do site GenoEvidence (símbolo + nome em Unbounded).
 * O símbolo é o arquivo original da marca, sem alterações.
 */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="GenoLab, início">
      <Image src="/brand/geno-evidence-simbolo-64.png" alt="" width={30} height={30} priority />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink [font-family:var(--font-display)]">GenoLab</span>
          <span className="ge-mono mt-1 text-[10px] text-muted">por GenoEvidence</span>
        </span>
      )}
    </Link>
  );
}
