import Link from "next/link";

// Public route, no auth guard — brief §7's "Privacy notice page." Static
// content only; nothing here is company-specific because Kindly is a
// multi-tenant processor (see the note on controller/processor below), not
// a per-company deployment.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-bold text-ink">
          Kindly<span className="text-accent">.</span>
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">Privacy notice</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What Kindly stores about a rejected candidate, and for how long.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">
          First name only, nothing else
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Kindly is a tool employers use to write and send candidate
          rejection emails. The only piece of personal information it
          stores about a candidate is the first name a recruiter typed in
          when writing their email — no surname, no email address, no CV,
          no other contact details. Everything else Kindly records is about
          the decision itself: the role, the stage reached, the reason
          selected, the closing chosen, and whether a link was included —
          not the candidate as a person.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">
          The 180-day wipe
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          A scheduled job runs daily and permanently clears the candidate
          first name from any record older than 180 days. The rest of that
          record — what decision was made, when, and how it was
          guardrail-checked — is kept as an audit trail, but it can no
          longer be tied to a named individual.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">
          The register-interest link
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Some rejection emails include a link inviting the candidate to
          register interest in similar roles in future. In this version of
          Kindly that link is informational only — following it does not
          send any data back to Kindly or the employer, and no consent or
          contact details are captured through it.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">
          Who&apos;s responsible for this data
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          The employer using Kindly is the data controller for candidate
          information under UK GDPR; Kindly acts as their data processor.
          If you have a question about a specific rejection email, contact
          the company you applied to directly. For questions about how
          Kindly itself handles data as a processor, contact{" "}
          <a
            href="mailto:privacy@kindly.example"
            className="font-semibold text-accent-dark hover:underline"
          >
            privacy@kindly.example
          </a>
          .
        </p>
      </section>
    </main>
  );
}
