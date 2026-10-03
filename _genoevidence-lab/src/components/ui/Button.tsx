import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

/** Botões em pílula, na linguagem do Geno Evidence (ação principal em carmim). */
const base =
  "ge-press inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-[13.5px]",
  md: "min-h-11 px-[18px] text-[14.5px]",
  lg: "min-h-12 px-6 text-base",
};
const variants: Record<Variant, string> = {
  primary: "bg-action text-white hover:opacity-90",
  accent: "bg-accent text-white hover:bg-accent-ink",
  secondary: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/** Sobretítulo monoespaçado em carmim com marcador quadrado (padrão da marca). */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ge-eyebrow ${className}`}>{children}</p>;
}
