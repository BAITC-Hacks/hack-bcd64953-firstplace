import { NextResponse, type NextRequest } from "next/server";
import { serverAuth } from "@/auth/server";
import { safePath } from "@/validators/navigation";
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const next = safePath(query.get("next"));
  const auth = await serverAuth();
  if (auth) {
    try {
      const code = query.get("code"),
        token = query.get("token_hash"),
        type = query.get("type");
      if (code) {
        const { error } = await auth.auth.exchangeCodeForSession(code);
        if (!error)
          return NextResponse.redirect(
            new URL(
              next === "/reset-password"
                ? next
                : "/complete-profile?next=" + encodeURIComponent(next),
              request.url,
            ),
          );
      }
      if (
        token &&
        (type === "email" ||
          type === "signup" ||
          type === "recovery" ||
          type === "invite" ||
          type === "email_change")
      ) {
        const { error } = await auth.auth.verifyOtp({
          token_hash: token,
          type,
        });
        if (!error)
          return NextResponse.redirect(
            new URL(
              type === "recovery"
                ? "/reset-password"
                : "/complete-profile?next=" + encodeURIComponent(next),
              request.url,
            ),
          );
      }
    } catch {
      /* A generic callback error never reflects tokens or provider messages. */
    }
  }
  return NextResponse.redirect(new URL("/login?error=callback", request.url));
}
