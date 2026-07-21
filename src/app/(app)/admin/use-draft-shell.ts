"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Shared by NewTemplateButton (the page-level "create" entry point) and
// ShellEditor's in-section button (iterating on an existing draft) so the
// POST /api/draft-shell call and its pending/error handling live in one
// place rather than two near-identical copies.
export function useDraftShell() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft(): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/draft-shell", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't draft the shell — try again.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Couldn't draft the shell — try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  return { draft, pending, error };
}
