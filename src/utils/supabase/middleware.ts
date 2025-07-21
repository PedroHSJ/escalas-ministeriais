import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Redirecionar rota raiz para /login
  if (request.nextUrl.pathname === "/") {
    console.log("Redirecting root to /login");
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Definir rotas públicas que não necessitam autenticação
  const publicRoutes = ["/login", "/auth"];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Se for uma rota pública, permitir acesso
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Para todas as outras rotas, verificar autenticação
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Se não houver usuário autenticado ou houver erro, redirecionar para login
    if (!user || error) {
      console.log("User not authenticated, redirecting to /login", { error: error?.message });
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Se há usuário autenticado mas está tentando acessar /login, redirecionar para dashboard
    if (user && request.nextUrl.pathname === "/login") {
      console.log("Authenticated user accessing login, redirecting to dashboard");
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
    
  } catch (error) {
    console.error("Error checking authentication:", error);
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}
