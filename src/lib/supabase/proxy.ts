import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Refreshes the Supabase auth session on every navigation. Called from
// src/proxy.ts (Next.js 16 renamed middleware.ts to proxy.ts; same
// mechanism). Keeping this in lib/ so proxy.ts itself stays a thin file
// that only wires up the matcher.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Must call getUser() (not getSession()) so the token is actually
  // revalidated with Supabase rather than trusted from the cookie as-is.
  await supabase.auth.getUser();

  return response;
}
