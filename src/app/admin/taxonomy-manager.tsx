"use client";

import { useActionState, useState, useTransition } from "react";
import type { TaxonomyKind } from "@/lib/supabase/database.types";
import { addTaxonomy, setTaxonomyArchived, type ActionState } from "./actions";

export interface TaxonomyRow {
  id: string;
  kind: TaxonomyKind;
  label: string;
  needs_skill: boolean;
  archived: boolean;
}

const initialState: ActionState = {};

function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setTaxonomyArchived(id, !archived);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-semibold text-ink-muted hover:text-accent disabled:opacity-50"
      >
        {archived ? "Restore" : "Archive"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

function AddTaxonomyForm({ kind }: { kind: TaxonomyKind }) {
  const [state, formAction, pending] = useActionState(
    addTaxonomy,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input
        name="label"
        placeholder={kind === "reason" ? "New reason…" : "New strength…"}
        required
        className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
      {kind === "reason" && (
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input type="checkbox" name="needsSkill" className="accent-accent" />
          Needs a skill chip
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

function TaxonomyList({
  kind,
  rows,
}: {
  kind: TaxonomyKind;
  rows: TaxonomyRow[];
}) {
  const filtered = rows.filter((r) => r.kind === kind);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-ink">
        {kind === "reason" ? "Reasons" : "Strengths"}
      </h3>
      <ul className="flex flex-col gap-2">
        {filtered.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className={row.archived ? "text-ink-muted line-through" : "text-ink"}>
              {row.label}
              {row.needs_skill && (
                <span className="ml-2 text-xs text-ink-muted">(needs skill)</span>
              )}
            </span>
            <ArchiveButton id={row.id} archived={row.archived} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-ink-muted">None yet.</li>
        )}
      </ul>
      <AddTaxonomyForm kind={kind} />
    </div>
  );
}

export function TaxonomyManager({ rows }: { rows: TaxonomyRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <TaxonomyList kind="reason" rows={rows} />
      <TaxonomyList kind="strength" rows={rows} />
    </div>
  );
}
