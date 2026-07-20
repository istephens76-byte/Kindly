import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Kindly<span className="text-accent">.</span>
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-ink-muted">
        Rejection emails that respect the candidate — reviewed by a human,
        written in your voice, defensible on the record.
      </p>
      <Link
        href="/sign-in"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Sign in
      </Link>
    </main>
  );
}
