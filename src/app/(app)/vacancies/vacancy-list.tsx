"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { VacancySkillSource } from "@/lib/supabase/database.types";
import { addSkill, removeSkill, type ActionState } from "./actions";

export interface SkillChip {
  id: string;
  label: string;
  source: VacancySkillSource;
}

export interface VacancyRow {
  id: string;
  title: string;
  created_at: string;
  skills: SkillChip[];
}

function RemoveSkillButton({ skillId }: { skillId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await removeSkill(skillId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <span>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-label="Remove skill"
        className="ml-1.5 text-ink-muted hover:text-red-700 disabled:opacity-50"
      >
        ×
      </button>
      {error && <span className="ml-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}

const initialState: ActionState = {};

function AddSkillForm({ vacancyId }: { vacancyId: string }) {
  const boundAdd = addSkill.bind(null, vacancyId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="label"
        placeholder="Add a skill…"
        required
        className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && (
        <span className="text-xs text-red-700">{state.error}</span>
      )}
    </form>
  );
}

function VacancyCard({ vacancy }: { vacancy: VacancyRow }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{vacancy.title}</h3>
        <span className="text-xs text-ink-muted">
          {new Date(vacancy.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {vacancy.skills.map((skill) => (
          <span
            key={skill.id}
            className="flex items-center rounded-full border border-border bg-[var(--color-paper)] px-3 py-1 text-xs font-medium text-ink"
          >
            {skill.label}
            <RemoveSkillButton skillId={skill.id} />
          </span>
        ))}
        {vacancy.skills.length === 0 && (
          <span className="text-sm text-ink-muted">No skills yet.</span>
        )}
      </div>

      <div className="mt-3">
        <AddSkillForm vacancyId={vacancy.id} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href={`/vacancies/${vacancy.id}/generate`}
          className="text-sm font-semibold text-accent-dark hover:underline"
        >
          Write a rejection email →
        </Link>
        <Link
          href={`/vacancies/${vacancy.id}/triage`}
          className="text-sm font-semibold text-accent-dark hover:underline"
        >
          Triage a batch of CVs →
        </Link>
      </div>
    </div>
  );
}

export function VacancyList({ vacancies }: { vacancies: VacancyRow[] }) {
  if (vacancies.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No vacancies yet — paste a job description above to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {vacancies.map((vacancy) => (
        <VacancyCard key={vacancy.id} vacancy={vacancy} />
      ))}
    </div>
  );
}
