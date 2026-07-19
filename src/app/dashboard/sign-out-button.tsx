"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted hover:border-accent"
    >
      Sign out
    </button>
  );
}
