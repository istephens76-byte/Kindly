import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

// Service-role client. Bypasses RLS entirely — never expose this to the
// client, and never call it in response to unauthenticated or unvalidated
// input. Reserved for privileged server-only writes (e.g. creating the
// `users` row for a new company on signup) where RLS would otherwise
// legitimately block the write. `import "server-only"` makes any accidental
// client import a build error rather than a runtime credential leak.
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
