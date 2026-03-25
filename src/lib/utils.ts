import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently — combines clsx + tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format pence (integer) into a human-readable GBP string.
 * e.g. 999 → "£9.99"
 */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/**
 * Format a draw month date string into a readable month/year.
 * e.g. "2026-03-01" → "March 2026"
 */
export function formatDrawMonth(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00Z");
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Get the first day of the current month (draw month key).
 */
export function getCurrentDrawMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Compute the prize split for a given pool total.
 */
export function computePrizeSplit(
  totalPoolPence: number,
  carriedOverJackpotPence = 0
) {
  const basePence = totalPoolPence - carriedOverJackpotPence;
  return {
    jackpot: Math.round(basePence * 0.4) + carriedOverJackpotPence,
    fourMatch: Math.round(basePence * 0.35),
    threeMatch: Math.round(basePence * 0.25),
  };
}

/**
 * Match a user's entry numbers against drawn numbers.
 * Returns match count and which numbers matched.
 */
export function computeMatchResult(
  entryNumbers: number[],
  drawnNumbers: number[]
): { matchCount: number; matchedNumbers: number[] } {
  const matched = entryNumbers.filter((n) => drawnNumbers.includes(n));
  return { matchCount: matched.length, matchedNumbers: matched };
}
