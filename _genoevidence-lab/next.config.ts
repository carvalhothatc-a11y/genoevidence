import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Servidor autocontido para a imagem Docker (deploy/): só o necessário para rodar em produção.
  output: "standalone",
  // unpdf traz uma build do pdf.js para servidor; mantê-la fora do bundle evita reprocessamento.
  serverExternalPackages: ["unpdf"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // service worker sempre revalidado (atualizações chegam na próxima visita)
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};

export default nextConfig;
