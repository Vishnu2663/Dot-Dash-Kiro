import { localSuggestions, startsWithLetters } from "./phrases";
export type SuggestionSource = "ai" | "built-in";
export type Provider = "groq" | "gemini";
export interface Suggestion {
  text: string;
  source: SuggestionSource;
  provider?: Provider;
}
/** The app stops waiting for cloud AI after this long and keeps the built-in phrases. */
export const FALLBACK_MS = 9000;
export const FALLBACK_NOTE = "Using built-in suggestions for now.";
export const SOURCE_LABEL: Record<SuggestionSource, string> = { ai: "AI", "built-in": "Built-in" };
export const builtInSuggestions = (typed: string, n: number): Suggestion[] =>
  localSuggestions(typed, n).map((text) => ({ text, source: "built-in" }));
/** Validates the `/api/predict` payload. Only entries the server marked `source: "ai"` are kept. */
export function parseRemote(data: unknown): Suggestion[] | null {
  const list = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list)) return null;
  const out: Suggestion[] = [];
  for (const item of list) {
    const o = item as { text?: unknown; source?: unknown; provider?: unknown } | null;
    if (!o || typeof o.text !== "string" || !o.text.trim() || o.source !== "ai") continue;
    const provider = o.provider === "groq" || o.provider === "gemini" ? o.provider : undefined;
    out.push({ text: o.text.trim(), source: "ai", provider });
  }
  return out;
}
/** AI sentences first, then built-in ones. Keeps only sentences that start with the letters; no duplicates. */
export function mergeSuggestions(typed: string, remote: Suggestion[], n: number): Suggestion[] {
  const out: Suggestion[] = [];
  for (const s of [...remote, ...builtInSuggestions(typed, n * 2)]) {
    if (out.length >= n) break;
    if (startsWithLetters(typed, s.text) && !out.some((o) => o.text.toLowerCase() === s.text.toLowerCase())) out.push(s);
  }
  return out;
}
export interface ImproveResult {
  suggestions: Suggestion[];
  outcome: "ai" | "fallback";
}
/**
 * Asks the cloud for sentences and merges them with the built-in bank. Never rejects.
 * After `timeoutMs` it aborts the request and returns the built-in list with outcome "fallback".
 */
export async function improveSuggestions(opts: {
  typed: string;
  n: number;
  fetchRemote: (signal: AbortSignal) => Promise<Suggestion[] | null>;
  timeoutMs?: number;
}): Promise<ImproveResult> {
  const { typed, n, fetchRemote, timeoutMs = FALLBACK_MS } = opts;
  const fallback: ImproveResult = { suggestions: builtInSuggestions(typed, n), outcome: "fallback" };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  try {
    const remote = await Promise.race([fetchRemote(controller.signal).catch(() => null), timeout]);
    if (!remote?.length) return fallback;
    const suggestions = mergeSuggestions(typed, remote, n);
    return suggestions.some((s) => s.source === "ai") ? { suggestions, outcome: "ai" } : fallback;
  } finally {
    clearTimeout(timer);
  }
}
