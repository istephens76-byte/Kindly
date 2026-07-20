"use client";

import { useActionState } from "react";
import { saveProfile, type ActionState } from "./actions";

const initialState: ActionState = {};

export interface ProfileFormValues {
  about: string;
  values: string;
  voice: string;
  senderName: string;
  talentLinkUrl: string;
}

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const [state, formAction, pending] = useActionState(
    saveProfile,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="about"
        >
          About the company
        </label>
        <textarea
          id="about"
          name="about"
          defaultValue={initial.about}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="values"
        >
          Values &amp; behaviours
        </label>
        <textarea
          id="values"
          name="values"
          defaultValue={initial.values}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="voice"
        >
          Employer brand voice &amp; style
        </label>
        <textarea
          id="voice"
          name="voice"
          defaultValue={initial.voice}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="senderName"
        >
          Sign-off name
        </label>
        <input
          id="senderName"
          name="senderName"
          defaultValue={initial.senderName}
          placeholder="e.g. The Talent Team"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="talentLinkUrl"
        >
          Talent link URL
        </label>
        <input
          id="talentLinkUrl"
          name="talentLinkUrl"
          type="url"
          defaultValue={initial.talentLinkUrl}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-accent-dark">Saved.</p>
      )}
    </form>
  );
}
