import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { APP_NAME, APP_VERSION } from "@/lib/config";
import { getSessionUser } from "@/lib/session";
import { IBM_Plex_Mono, IBM_Plex_Sans, Unbounded } from "next/font/google";
import "./globals.css";

// Fontes do site GenoEvidence (assets/css/shell.css), servidas pelo próprio app (sem requisição do navegador ao Google).
const unbounded = Unbounded({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-unbounded", display: "swap" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "GenoLab: laboratório virtual de biologia molecular — projetos, experimentos, referências, dados e bancada 3D.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1221", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="pt-BR" className={`${unbounded.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-[#060a13]">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <MotionProvider>
          <AppShell appName={APP_NAME} version={APP_VERSION} user={user ? { name: user.name, email: user.email, role: user.role, status: user.status } : null}>
            <main id="conteudo" tabIndex={-1} className="outline-none">
              {children}
            </main>
          </AppShell>
        </MotionProvider>
      </body>
    </html>
  );
}
