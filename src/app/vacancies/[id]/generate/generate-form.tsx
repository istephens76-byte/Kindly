"use client";

import { useState } from "react";

const STAGES = [
  "CV / application review",
  "Phone screen",
  "First interview",
  "Final interview",
] as const;

const CLOSINGS = [
  { id: "active", label: "Actively encourage reapplying" },
  { id: "other", label: "Door open — other roles" },
  { id: "no", label: "Not right now" },
] as const;

interface ReasonOption {
  id: string;
  label: string;
  needs_skill: boolean;
}

interface StrengthOption {
  id: string;
  label: string;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white"
          : "rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
      }
    >
      {label}
    </button>
  );
}

export function GenerateForm({
  vacancyId,
  skills,
  reasons,
  strengths,
}: {
  vacancyId: string;
  skills: string[];
  reasons: ReasonOption[];
  strengths: StrengthOption[];
}) {
  const [candidateFirstName, setCandidateFirstName] = useState("");
  const [stage, setStage] = useState<(typeof STAGES)[number]>(STAGES[0]);
  const [reasonTaxonomyId, setReasonTaxonomyId] = useState<string | null>(
    null,
  );
  const [reasonSkill, setReasonSkill] = useState<string | null>(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [strengthTaxonomyId, setStrengthTaxonomyId] = useState<string | null>(
    null,
  );
  const [strengthDetail, setStrengthDetail] = useState("");
  const [closing, setClosing] = useState<(typeof CLOSINGS)[number]["id"]>(
    "other",
  );
  const [talentLinkIncluded, setTalentLinkIncluded] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailText, setEmailText] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [writtenInSeconds, setWrittenInSeconds] = useState<number | null>(
    null,
  );
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">(
    "idle",
  );

  const selectedReason = reasons.find((r) => r.id === reasonTaxonomyId);
  const canGenerate =
    candidateFirstName.trim().length > 0 &&
    reasonTaxonomyId !== null &&
    (!selectedReason?.needs_skill || reasonSkill !== null) &&
    strengthTaxonomyId !== null;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    setEmailText(null);
    setWrittenInSeconds(null);
    setCopyState("idle");
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId,
          candidateFirstName,
          stage,
          reasonTaxonomyId,
          reasonSkill: selectedReason?.needs_skill ? reasonSkill : undefined,
          reasonDetail: reasonDetail || undefined,
          strengthTaxonomyId,
          strengthDetail: strengthDetail || undefined,
          closing,
          talentLinkIncluded,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't write this one — try again.");
        return;
      }
      setEmailText(body.email);
      setGenerationId(body.id);
      setWrittenInSeconds(Math.round((Date.now() - startedAt) / 1000));
    } catch {
      setError("Couldn't write this one — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!emailText || !generationId) return;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(emailText);
      await fetch(`/api/generations/${generationId}/copied`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText: emailText }),
      });
      setCopyState("copied");
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          htmlFor="candidateFirstName"
        >
          Candidate first name
        </label>
        <input
          id="candidateFirstName"
          value={candidateFirstName}
          onChange={(e) => setCandidateFirstName(e.target.value)}
          placeholder="e.g. Priya"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Stage reached
        </p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Chip key={s} label={s} active={stage === s} onClick={() => setStage(s)} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Reason for rejection
        </p>
        <div className="flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <Chip
              key={reason.id}
              label={reason.label}
              active={reasonTaxonomyId === reason.id}
              onClick={() => {
                setReasonTaxonomyId(reason.id);
                setReasonSkill(null);
              }}
            />
          ))}
        </div>
        {selectedReason?.needs_skill && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Which requirement, specifically?
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  active={reasonSkill === skill}
                  onClick={() => setReasonSkill(skill)}
                />
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-ink-muted">
                  This vacancy has no skill chips yet — add some from the
                  vacancies list.
                </p>
              )}
            </div>
          </div>
        )}
        <textarea
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          placeholder="Optional nuance for this candidate…"
          rows={2}
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Their standout strength
        </p>
        <div className="flex flex-wrap gap-2">
          {strengths.map((strength) => (
            <Chip
              key={strength.id}
              label={strength.label}
              active={strengthTaxonomyId === strength.id}
              onClick={() => setStrengthTaxonomyId(strength.id)}
            />
          ))}
        </div>
        <textarea
          value={strengthDetail}
          onChange={(e) => setStrengthDetail(e.target.value)}
          placeholder="Optional detail…"
          rows={2}
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          How should it end?
        </p>
        <div className="flex flex-wrap gap-2">
          {CLOSINGS.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              active={closing === c.id}
              onClick={() => setClosing(c.id)}
            />
          ))}
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={talentLinkIncluded}
            onChange={(e) => setTalentLinkIncluded(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>
            Include the talent link
            <span className="block text-xs text-ink-muted">
              Adds your register-interest line and link before the sign-off.
            </span>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || generating}
        className="self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {generating ? "Writing…" : "Write the email"}
      </button>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {emailText && (
        <div className="rounded-2xl border border-border bg-white p-6">
          {writtenInSeconds !== null && (
            <p className="mb-3 text-xs font-semibold text-accent-dark">
              Written in {writtenInSeconds}s
            </p>
          )}
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={copyState === "copying"}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:border-accent disabled:opacity-50"
          >
            {copyState === "copied" ? "Copied" : "Copy to clipboard"}
          </button>
        </div>
      )}
    </div>
  );
}
