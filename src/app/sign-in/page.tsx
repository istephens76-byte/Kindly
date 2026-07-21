"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6">
        <h1 className="text-2xl font-bold text-ink">
          Kindly<span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sign in with a magic link — no password needed.
        </p>

        {status === "sent" ? (
          <p className="mt-6 text-sm text-ink">
            Check <strong>{email}</strong> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
              htmlFor="email"
            >
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-700">
                Couldn&apos;t send the link — try again.
              </p>
            )}
          </form>
        )}

        <Link
          href="/privacy"
          className="mt-6 block text-xs text-ink-muted hover:text-accent-dark hover:underline"
        >
          Privacy notice
        </Link>
      </div>
    </main>
  );
}
