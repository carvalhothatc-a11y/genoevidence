import type { MetadataRoute } from "next";

/**
 * Manifesto do aplicativo: permite instalar o GenoLab no computador ou no celular (janela própria,
 * ícone no Dock/menu Iniciar). O app continua usando o servidor: projetos ficam protegidos e
 * sincronizados; sem internet aparece só uma página de aviso.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/laboratorio",
    name: "GenoLab — laboratório virtual da GenoEvidence",
    short_name: "GenoLab",
    description: "Descreva seu experimento, envie materiais e veja o processo em 3D, com fontes e dados privados.",
    start_url: "/laboratorio",
    scope: "/",
    display: "standalone",
    background_color: "#060a13",
    theme_color: "#0b1221",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["education", "science", "productivity"],
    icons: [
      { src: "/brand/geno-evidence-simbolo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/geno-evidence-simbolo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Área de trabalho", url: "/laboratorio", icons: [{ src: "/brand/geno-evidence-simbolo-192.png", sizes: "192x192" }] },
      { name: "Projetos", url: "/projetos", icons: [{ src: "/brand/geno-evidence-simbolo-192.png", sizes: "192x192" }] },
      { name: "Técnicas", url: "/modulos", icons: [{ src: "/brand/geno-evidence-simbolo-192.png", sizes: "192x192" }] },
    ],
  };
}
