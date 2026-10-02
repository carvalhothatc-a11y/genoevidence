import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
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
  description: "GenoEvidence Lab: laboratório virtual de biologia molecular — projetos, experimentos, referências, dados e bancada 3D.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="pt-BR" className={`${unbounded.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <AppHeader appName={APP_NAME} user={user ? { name: user.name, email: user.email } : null} />
        <MotionProvider>
          <main id="conteudo" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </MotionProvider>
        <AppFooter appName={APP_NAME} version={APP_VERSION} />
      </body>
    </html>
  );
}
