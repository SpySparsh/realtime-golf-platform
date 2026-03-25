import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// This was formerly `middleware.ts`. Next.js renamed the file convention
// to `proxy.ts` and the export to `proxy`. See:
// https://nextjs.org/docs/messages/middleware-to-proxy
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Standard @supabase/ssr session refresh.
  // Do NOT add logic between createServerClient and supabase.auth.getUser().
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — keeps auth cookies alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Auth guard ────────────────────────────────────────────────────────────
  // Redirect unauthenticated users away from protected routes.
  // NOTE: is_admin check is NOT here — database queries are unsupported in
  // the Edge runtime. That guard lives in src/app/admin/layout.tsx instead.
  const protectedPaths = ["/dashboard", "/admin", "/subscribe/success"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth page redirect ────────────────────────────────────────────────────
  // Redirect already logged-in users away from login/register pages
  const authPaths = ["/auth/login", "/auth/register"];
  if (user && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
