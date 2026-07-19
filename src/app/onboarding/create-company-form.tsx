"use client";

import { useActionState } from "react";
import { createCompany, type CreateCompanyState } from "./actions";

const initialState: CreateCompanyState = {};

export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(
    createCompany,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
        htmlFor="companyName"
      >
        Company name
      </label>
      <input
        id="companyName"
        name="companyName"
        required
        placeholder="e.g. Screwfix"
        className="rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create company"}
      </button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
