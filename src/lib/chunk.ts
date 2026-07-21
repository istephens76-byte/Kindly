// Splits triage candidates into batches of ~15 for chunked prompting
// (brief §6b step 2) — one model call per chunk rather than one huge call
// for up to 50 candidates.
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be positive");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
