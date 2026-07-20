"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function NewVacancyForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, jdText }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't extract skills — try again.");
        return;
      }
      setTitle("");
      setJdText("");
      router.refresh();
    } catch {
      setError("Couldn't extract skills — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="vacancyTitle"
        >
          Role title
        </label>
        <input
          id="vacancyTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Social Media Manager"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="vacancyJd"
        >
          Job description
        </label>
        <textarea
          id="vacancyJd"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          required
          rows={8}
          placeholder="Paste the job description here…"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Extracting skills…" : "Extract skills"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
