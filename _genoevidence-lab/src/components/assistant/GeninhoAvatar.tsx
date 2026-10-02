import Image from "next/image";

/** Avatar do Geninho (arte fornecida pela responsável: public/brand/geninho-*). */
export function GeninhoAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  const src = size > 64 ? "/brand/geninho-rosto-256.png" : "/brand/geninho-rosto-96.png";
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full p-[2px] ${className}`} style={{ width: size, height: size, background: "var(--ge-gradient)" }} aria-hidden="true">
      <Image src={src} alt="" width={size - 4} height={size - 4} className="rounded-full bg-white" />
    </span>
  );
}

/** Ilustração de corpo inteiro (apresentação do assistente). */
export function GeninhoCorpo({ className = "" }: { className?: string }) {
  return <Image src="/brand/geninho-corpo.jpg" alt="Geninho, o mascote lilás do GenoLab, de jaleco branco com uma hélice de DNA bordada no bolso." width={720} height={720} className={className} />;
}
