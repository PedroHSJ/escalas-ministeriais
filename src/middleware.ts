import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas que sempre podem ser acessadas sem autenticação
  const publicRoutes = ["/login", "/auth", "/api", "/_next", "/favicon.ico"];

  // Se for uma rota pública, permitir acesso direto
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Para desenvolvimento, permitir bypass com query param dev=true
  if (process.env.NODE_ENV === "development") {
    const devParam = request.nextUrl.searchParams.get("dev");
    if (devParam === "true") {
      return NextResponse.next();
    }
  }

  // Para todas as outras rotas, verificar autenticação através do updateSession
  return await updateSession(request);
}

//O matcher array permite que seu middleware seja executado
//apenas em rotas específicas. Isso reduz a carga de processamento
//desnecessária e melhora o desempenho do aplicativo.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
