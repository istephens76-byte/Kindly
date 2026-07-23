"use client";

import { useActionState, useState, useTransition } from "react";
import type { ShellStatus } from "@/lib/supabase/database.types";
import {
  activateShell,
  updateShellDraft,
  type ActionState,
} from "./actions";
import { useDraftShell } from "./use-draft-shell";

export interface ShellRow {
  id: string;
  version: number;
  status: ShellStatus;
  warm_line: string;
  closing_active: string;
  closing_other: string;
  closing_no: string;
  talent_line: string;
  created_at: string;
}

const REVIEW_NUDGE_DAYS = 182;

function DraftShellButton({ hasAnyShell }: { hasAnyShell: boolean }) {
  const { draft, pending, error } = useDraftShell();

  return (
    <div>
      <button
        onClick={draft}
        disabled={pending}
        className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
      >
        {pending
          ? "Drafting…"
          : hasAnyShell
            ? "Draft another version in our voice"
            : "Draft in our voice"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const initialState: ActionState = {};

function ShellDraftEditor({ shell }: { shell: ShellRow }) {
  const boundUpdate = updateShellDraft.bind(null, shell.id);
  const [state, formAction, pending] = useActionState(
    boundUpdate,
    initialState,
  );
  const [activating, startActivating] = useTransition();
  const [activateError, setActivateError] = useState<string | null>(null);

  function handleActivate() {
    setActivateError(null);
    startActivating(async () => {
      const result = await activateShell(shell.id);
      if (result.error) {
        setActivateError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Warm line
          </label>
          <textarea
            name="warmLine"
            defaultValue={shell.warm_line}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Closing — actively encourage reapplying
          </label>
          <textarea
            name="closingActive"
            defaultValue={shell.closing_active}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Closing — door open, other roles
          </label>
          <textarea
            name="closingOther"
            defaultValue={shell.closing_other}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Closing — not right now
          </label>
          <textarea
            name="closingNo"
            defaultValue={shell.closing_no}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Talent link invitation
          </label>
          <textarea
            name="talentLine"
            defaultValue={shell.talent_line}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:border-accent disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {activating ? "Activating…" : "Activate this version"}
          </button>
        </div>

        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-accent-dark">Saved.</p>
        )}
        {activateError && (
          <p className="text-sm text-red-700">{activateError}</p>
        )}
      </form>
    </div>
  );
}

function ShellVersionHeader({ shell }: { shell: ShellRow }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-sm font-semibold text-ink">
        Version {shell.version}
      </span>
      <span
        className={
          shell.status === "active"
            ? "rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white"
            : "rounded-full bg-border px-2 py-0.5 text-xs font-semibold text-ink-muted"
        }
      >
        {shell.status === "active"
          ? "Active"
          : shell.status === "superseded"
            ? "Superseded"
            : "Draft"}
      </span>
    </div>
  );
}

const READ_ONLY_LINES: { label: string; field: keyof ShellRow }[] = [
  { label: "Warm line", field: "warm_line" },
  { label: "Closing — actively encourage reapplying", field: "closing_active" },
  { label: "Closing — door open, other roles", field: "closing_other" },
  { label: "Closing — not right now", field: "closing_no" },
  { label: "Talent link invitation", field: "talent_line" },
];

function ReadOnlyShellSummary({ shell }: { shell: ShellRow }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {READ_ONLY_LINES.map(({ label, field }) => (
        <div key={field}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </p>
          <p className="mt-1 text-sm text-ink">{shell[field]}</p>
        </div>
      ))}
    </div>
  );
}

function reviewNudge(activeShell: ShellRow | undefined): string | null {
  if (!activeShell) return null;
  const daysSince =
    (Date.now() - new Date(activeShell.created_at).getTime()) / 86_400_000;
  if (daysSince < REVIEW_NUDGE_DAYS) return null;
  const reviewedDate = new Date(activeShell.created_at).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
  return `Shell last reviewed ${reviewedDate} — it's been over six months, worth another look.`;
}

export function ShellEditor({ shells }: { shells: ShellRow[] }) {
  const activeShell = shells.find((s) => s.status === "active");
  const draftShell = shells.find((s) => s.status === "draft");
  const previousShells = shells.filter(
    (s) => s.id !== activeShell?.id && s.id !== draftShell?.id,
  );
  const nudge = reviewNudge(activeShell);

  return (
    <div className="flex flex-col gap-4">
      {nudge && (
        <p className="rounded-lg border border-amber bg-amber-light px-3 py-2 text-sm text-ink">
          {nudge}
        </p>
      )}

      <DraftShellButton hasAnyShell={shells.length > 0} />

      {shells.length === 0 && (
        <p className="text-sm text-ink-muted">
          No shell drafted yet. Save the company profile above, then draft
          one in your voice.
        </p>
      )}

      {draftShell && (
        <div>
          <ShellVersionHeader shell={draftShell} />
          <ShellDraftEditor shell={draftShell} />
        </div>
      )}

      {activeShell && (
        <div>
          <ShellVersionHeader shell={activeShell} />
          <ReadOnlyShellSummary shell={activeShell} />
        </div>
      )}

      {previousShells.length > 0 && (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink-muted hover:text-accent-dark">
            Previous versions ({previousShells.length})
          </summary>
          <div className="flex flex-col gap-3 border-t border-border p-4">
            {previousShells.map((shell) => (
              <div key={shell.id}>
                <ShellVersionHeader shell={shell} />
                <ReadOnlyShellSummary shell={shell} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
