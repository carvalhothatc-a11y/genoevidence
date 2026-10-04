import { NextResponse, type NextRequest } from "next/server";

const ACCOUNT_COOKIE = "lv_conta";
const PUBLIC = ["/entrar", "/cadastro", "/privacidade"];

/**
 * Política de segurança de conteúdo com nonce por requisição. O Next.js lê o nonce do cabeçalho
 * da requisição e o aplica aos próprios scripts; 'strict-dynamic' autoriza os pedaços que eles
 * carregam. Estilos precisam de 'unsafe-inline' (atributos style do React, Motion e Mol*).
 * Todas as páginas são dinâmicas (o layout lê a sessão), condição para o nonce funcionar.
 */
function politica(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Verificação otimista: sem cookie de conta, redireciona para o login.
 * A validação completa da sessão acontece no servidor (getSessionUser) e nas rotas de API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const publica = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!publica && !request.cookies.get(ACCOUNT_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?voltar=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const nonce = btoa(crypto.randomUUID());
  const csp = politica(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|samples|brand|models|manifest.webmanifest|sw.js|offline.html).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
