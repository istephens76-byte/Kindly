"use client";

import { useDraftShell } from "./use-draft-shell";

// The page-level "create a new template" entry point (see the discoverability
// fix following tester feedback: the only prior entry point, ShellEditor's
// "Draft in our voice" button, was buried below the whole Company profile
// section and used amber/secondary styling). Calls the same endpoint as that
// button, then scrolls to the shell section so the new draft is immediately
// visible.
export function NewTemplateButton() {
  const { draft, pending, error } = useDraftShell();

  async function handleClick() {
    const ok = await draft();
    if (ok) {
      document
        .getElementById("shell-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Drafting…" : "+ New template"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
