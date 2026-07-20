// Edit distance between the generated email and what the recruiter actually
// copied (brief §6a step 9), stored as generations.edit_distance — a proxy
// for how much editing AI output needed.
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );

  for (let i = 0; i < rows; i += 1) distances[i][0] = i;
  for (let j = 0; j < cols; j += 1) distances[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        distances[i][j] = distances[i - 1][j - 1];
      } else {
        distances[i][j] =
          1 +
          Math.min(
            distances[i - 1][j - 1],
            distances[i - 1][j],
            distances[i][j - 1],
          );
      }
    }
  }

  return distances[rows - 1][cols - 1];
}
