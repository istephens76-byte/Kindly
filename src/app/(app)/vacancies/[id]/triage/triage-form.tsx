"use client";

import { useState } from "react";
import { ROLE_CHANGED_SENTINEL } from "@/lib/prompts";

const CLOSINGS = [
  { id: "other", label: "Door open — other roles" },
  { id: "no", label: "Not right now" },
] as const;

const MAX_CANDIDATES = 50;

interface TriageRow {
  name: string;
  skillOrChanged: string; // "" = not yet decided
  closing: (typeof CLOSINGS)[number]["id"];
  talentLinkIncluded: boolean;
}

interface TriageResult {
  name: string;
  id?: string;
  email?: string;
  needsManualAttention?: boolean;
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
          ? "rounded-full border border-accent bg-accent px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-ink hover:border-accent"
      }
    >
      {label}
    </button>
  );
}

export function TriageForm({
  vacancyId,
  roleTitle,
  skills,
  companyName,
}: {
  vacancyId: string;
  roleTitle: string;
  skills: string[];
  companyName: string;
}) {
  const [namesText, setNamesText] = useState("");
  const [talentAll, setTalentAll] = useState(false);
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [results, setResults] = useState<TriageResult[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writtenInSeconds, setWrittenInSeconds] = useState<number | null>(
    null,
  );
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  const decidedCount = rows.filter((r) => r.skillOrChanged).length;

  function buildGrid() {
    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, MAX_CANDIDATES);
    setRows(
      names.map((name) => ({
        name,
        skillOrChanged: "",
        closing: "no",
        talentLinkIncluded: talentAll,
      })),
    );
    setResults(null);
    setError(null);
  }

  function updateRow(index: number, patch: Partial<TriageRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function setAllTalent(value: boolean) {
    setTalentAll(value);
    setRows((prev) => prev.map((row) => ({ ...row, talentLinkIncluded: value })));
  }

  function newBatch() {
    setNamesText("");
    setRows([]);
    setResults(null);
    setError(null);
    setWrittenInSeconds(null);
    setCopiedAll(false);
    setCopiedIds(new Set());
  }

  async function handleGenerate() {
    const decided = rows.filter((r) => r.skillOrChanged);
    if (decided.length === 0) return;
    setGenerating(true);
    setError(null);
    setResults(null);
    setCopiedAll(false);
    setCopiedIds(new Set());
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/generate-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId,
          candidates: decided.map((r) => ({
            name: r.name,
            skillOrChanged: r.skillOrChanged,
            closing: r.closing,
            talentLinkIncluded: r.talentLinkIncluded,
          })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't write these — try again.");
        return;
      }
      setResults(body.results);
      setWrittenInSeconds(Math.round((Date.now() - startedAt) / 1000));
    } catch {
      setError("Couldn't write these — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function recordCopy(id: string, text: string) {
    try {
      await fetch(`/api/generations/${id}/copied`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText: text }),
      });
      setCopiedIds((prev) => new Set(prev).add(id));
    } catch {
      // Copy already succeeded client-side; audit capture failing silently
      // shouldn't block the recruiter.
    }
  }

  async function handleCopyOne(result: TriageResult) {
    if (!result.id || !result.email) return;
    await navigator.clipboard.writeText(result.email);
    await recordCopy(result.id, result.email);
  }

  async function handleCopyAll() {
    if (!results) return;
    const successful = results.filter((r) => r.id && r.email);
    if (successful.length === 0) return;
    const combined = successful
      .map((r) => `${r.name}\n\n${r.email}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(combined);
    await Promise.all(
      successful.map((r) => recordCopy(r.id as string, r.email as string)),
    );
    setCopiedAll(true);
  }

  const needsAttentionCount = results
    ? results.filter((r) => r.needsManualAttention).length
    : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[480px_1fr] lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-muted self-start">
          {companyName} · {roleTitle} · CV stage
        </div>

        {rows.length === 0 ? (
          <>
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                htmlFor="namesText"
              >
                Who are you rejecting at CV stage?
              </label>
              <textarea
                id="namesText"
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder={"One first name per line, e.g.\nPriya\nMarcus\nSofia\nJake"}
                rows={10}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={talentAll}
                onChange={(e) => setTalentAll(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                Include the register-interest link for everyone by default
                <span className="block text-xs text-ink-muted">
                  You can still switch it per candidate in the grid.
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={buildGrid}
              disabled={!namesText.trim()}
              className="self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Build the triage grid
            </button>
            <p className="text-xs text-ink-muted">
              Up to {MAX_CANDIDATES} names per batch. One tap per candidate:
              which requirement did the decision come down to? Your tap is
              the record of human review — it&apos;s what lets the email
              honestly say a person read the application.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Tap the deciding requirement
              </p>
              <span className="text-xs font-semibold text-accent-dark">
                {decidedCount}/{rows.length} decided
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={talentAll}
                onChange={(e) => setAllTalent(e.target.checked)}
                className="accent-accent"
              />
              Register-interest link for all
            </label>

            <div className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={
                    row.skillOrChanged
                      ? "rounded-xl border border-accent bg-accent-light/20 p-3"
                      : "rounded-xl border border-border p-3"
                  }
                >
                  <p className="text-sm font-semibold text-ink">{row.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        active={row.skillOrChanged === skill}
                        onClick={() => updateRow(i, { skillOrChanged: skill })}
                      />
                    ))}
                    <Chip
                      label="role changed / paused"
                      active={row.skillOrChanged === ROLE_CHANGED_SENTINEL}
                      onClick={() =>
                        updateRow(i, { skillOrChanged: ROLE_CHANGED_SENTINEL })
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-ink-muted">Ends:</span>
                    {CLOSINGS.map((c) => (
                      <Chip
                        key={c.id}
                        label={c.label}
                        active={row.closing === c.id}
                        onClick={() => updateRow(i, { closing: c.id })}
                      />
                    ))}
                    <label className="ml-2 flex items-center gap-1.5 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={row.talentLinkIncluded}
                        onChange={(e) =>
                          updateRow(i, { talentLinkIncluded: e.target.checked })
                        }
                        className="accent-accent"
                      />
                      similar roles
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={decidedCount === 0 || generating}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {generating
                  ? "Writing…"
                  : `Write ${decidedCount} email${decidedCount === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                onClick={newBatch}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-ink-muted hover:border-accent"
              >
                New batch
              </button>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 lg:sticky lg:top-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-ink">
            {results ? "Ready to send" : "Emails appear here"}
          </h2>
          <div className="flex items-center gap-3">
            {writtenInSeconds !== null && results && (
              <span className="text-xs font-semibold text-accent-dark">
                {results.filter((r) => r.email).length} emails in{" "}
                {writtenInSeconds}s
              </span>
            )}
            {results && results.some((r) => r.email) && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {copiedAll ? "Copied" : "Copy all"}
              </button>
            )}
          </div>
        </div>

        {!results ? (
          <p className="text-sm italic text-ink-muted">
            Each candidate gets an individual email naming the requirement
            their review came down to, the closing you chose, and — where
            ticked — an invitation to register interest in similar roles,
            plus the line every applicant deserves: &ldquo;Your application
            was individually reviewed by our recruitment team against the
            requirements for this role.&rdquo;
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {needsAttentionCount > 0 && (
              <p className="rounded-lg border border-amber bg-amber-light px-3 py-2 text-sm text-ink">
                {needsAttentionCount} candidate
                {needsAttentionCount === 1 ? "" : "s"} need manual attention
                — write {needsAttentionCount === 1 ? "it" : "them"}{" "}
                individually.
              </p>
            )}
            {results.map((result, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-ink">
                    {result.name}
                  </span>
                  {result.id && result.email && (
                    <button
                      type="button"
                      onClick={() => handleCopyOne(result)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent"
                    >
                      {copiedIds.has(result.id) ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                {result.needsManualAttention ? (
                  <p className="text-sm italic text-ink-muted">
                    Needs manual attention — write this one individually.
                  </p>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
                    {result.email}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
