import { NextResponse, type NextRequest } from "next/server";

const ACCOUNT_COOKIE = "lv_conta";
const PUBLIC = ["/entrar", "/cadastro"];

/**
 * Verificação otimista: sem cookie de conta, redireciona para o login.
 * A validação completa da sessão acontece no servidor (getSessionUser) e nas rotas de API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (request.cookies.get(ACCOUNT_COOKIE)?.value) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = `?voltar=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|samples|brand|models).*)"],
};
