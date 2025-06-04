import { type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

//O matcher array permite que seu middleware seja executado
//apenas em rotas específicas. Isso reduz a carga de processamento
//desnecessária e melhora o desempenho do aplicativo.
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
