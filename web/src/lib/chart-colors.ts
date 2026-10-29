// API rankings contain at most six entries. Sort IDs, not counts or translated
// labels, so rank/locale changes keep the same mapping for the displayed cohort.
const palette = [1, 2, 3, 4, 5, 6].map((index) => `var(--chart-${index})`);
export function categoryColors(ids: string[]): Record<string, string> {
  return Object.fromEntries(
    [...new Set(ids)].sort().map((id, index) => [id, palette[index % palette.length]]),
  );
}
