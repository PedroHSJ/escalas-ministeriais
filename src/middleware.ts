import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
    if (process.env.NODE_ENV === "development") {
    const { pathname } = request.nextUrl;

    // Rotas que sempre podem ser acessadas sem autenticação
    const publicRoutes = ["/login", "/auth", "/api", "/_next", "/favicon.ico"];

    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    process.env.NODE_ENV === "development"
      ? request.nextUrl.searchParams.set("dev", "true")
      : request.nextUrl.searchParams.delete("dev");
    // Se tem query param dev=true, permite acesso
    if (request.nextUrl.searchParams.get("dev") === "true") {
      return NextResponse.next();
    }

    // Para outras rotas em dev, verifica autenticação normalmente
    return await updateSession(request);
  }

  return await updateSession(request);
}

//O matcher array permite que seu middleware seja executado
//apenas em rotas específicas. Isso reduz a carga de processamento
//desnecessária e melhora o desempenho do aplicativo.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
