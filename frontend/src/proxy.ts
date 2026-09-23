import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, env } from "@/config/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!authConfigured) return response;
  const auth = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    await auth.auth.getClaims();
  } catch {
    /* The guarded UI shows auth/service failure. FastAPI authorizes every API request. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/business/:path*",
    "/student/:path*",
    "/complete-profile",
    "/auth/:path*",
    "/reset-password",
  ],
};
