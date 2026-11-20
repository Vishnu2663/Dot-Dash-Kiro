import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_MS, builtInSuggestions, improveSuggestions, mergeSuggestions, parseRemote, type Suggestion } from "./suggest";
const ai = (text: string, provider: "groq" | "gemini" = "groq"): Suggestion => ({ text, source: "ai", provider });
describe("suggestion data", () => {
  it("labels built-in sentences as built-in", () => {
    const list = builtInSuggestions("PL", 6);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.source === "built-in")).toBe(true);
  });
  it("keeps only entries the server marked as AI", () => {
    const parsed = parseRemote({
      suggestions: [{ text: "Please call my son.", source: "ai", provider: "gemini" }, { text: "x", source: "built-in" }, "plain", { text: "  " , source: "ai" }, null],
    });
    expect(parsed).toEqual([{ text: "Please call my son.", source: "ai", provider: "gemini" }]);
  });
  it("rejects a payload without a suggestions array", () => {
    expect(parseRemote({})).toBeNull();
    expect(parseRemote(null)).toBeNull();
  });
  it("puts AI first, labels each by origin and shows a duplicate once, as AI", () => {
    const out = mergeSuggestions("PL", [ai("Please leave the light on."), ai("please call the nurse.")], 6);
    expect(out[0]).toMatchObject({ text: "Please leave the light on.", source: "ai" });
    const nurse = out.filter((s) => s.text.toLowerCase() === "please call the nurse.");
    expect(nurse).toHaveLength(1);
    expect(nurse[0].source).toBe("ai");
    expect(out.some((s) => s.source === "built-in")).toBe(true);
  });
  it("drops AI sentences that do not start with the typed letters", () => {
    expect(mergeSuggestions("PL", [ai("Hello there")], 6).some((s) => s.text === "Hello there")).toBe(false);
  });
});
describe("improveSuggestions fallback timing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("falls back to built-in at 9 s, and aborts the request", async () => {
    let signal!: AbortSignal;
    const fetchRemote = (s: AbortSignal) => {
      signal = s;
      return new Promise<Suggestion[] | null>(() => {}); // never answers
    };
    let done = false;
    const p = improveSuggestions({ typed: "PL", n: 6, fetchRemote }).then((r) => ((done = true), r));
    await vi.advanceTimersByTimeAsync(FALLBACK_MS - 1);
    expect(done).toBe(false);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const r = await p;
    expect(FALLBACK_MS).toBe(9000);
    expect(r.outcome).toBe("fallback");
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.every((s) => s.source === "built-in")).toBe(true);
    expect(signal.aborted).toBe(true);
  });
  it("uses the AI answer when it arrives in time", async () => {
    const r = await improveSuggestions({ typed: "PL", n: 6, fetchRemote: async () => [ai("Please open the window.")] });
    expect(r.outcome).toBe("ai");
    expect(r.suggestions[0]).toMatchObject({ text: "Please open the window.", source: "ai" });
  });
  it("falls back at once when the request fails or returns nothing", async () => {
    for (const fetchRemote of [async () => null, async () => [], async () => { throw new Error("boom"); }]) {
      const r = await improveSuggestions({ typed: "PL", n: 6, fetchRemote });
      expect(r.outcome).toBe("fallback");
      expect(r.suggestions.every((s) => s.source === "built-in")).toBe(true);
    }
  });
  it("falls back when every AI sentence is filtered out", async () => {
    const r = await improveSuggestions({ typed: "PL", n: 6, fetchRemote: async () => [ai("Hello there")] });
    expect(r.outcome).toBe("fallback");
  });
});
