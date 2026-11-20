import { describe, expect, it } from "vitest";
import { parseSuggestions } from "../api/_lib.js";

describe("parseSuggestions", () => {
  it("reads a plain JSON array", () => {
    expect(parseSuggestions('["I want water.","I am cold."]', 6)).toEqual(["I want water.", "I am cold."]);
  });
  it("handles code fences and surrounding prose", () => {
    expect(parseSuggestions('Sure!\n```json\n["Yes."]\n```', 6)).toEqual(["Yes."]);
  });
  it("limits count and drops non-strings", () => {
    expect(parseSuggestions('["a",1,"b","c"]', 2)).toEqual(["a", "b"]);
  });
  it("returns [] for garbage", () => {
    expect(parseSuggestions("no json here", 6)).toEqual([]);
    expect(parseSuggestions("[oops", 6)).toEqual([]);
  });
});

import { afterEach, beforeEach, vi } from "vitest";
import handler from "../api/predict.js";

/** Minimal stand-ins for the Vercel request and response objects. */
function call(body: unknown) {
  const res = { code: 0, out: null as unknown, setHeader() {}, status(c: number) { res.code = c; return res; }, json(o: unknown) { res.out = o; return res; } };
  return handler({ method: "POST", headers: {}, body } as never, res as never).then(() => res);
}
const groqReply = (texts: string[]) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(texts) } }] }));
const geminiReply = (texts: string[]) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(texts) }] } }] }));

describe("/api/predict source labels and provider order", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GEMINI_API_KEY", "m");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("labels every sentence as AI from Groq, and does not call Gemini", async () => {
    fetchMock.mockResolvedValueOnce(groqReply(["Please call my son."]));
    const r = await call({ letters: "PL", lang: "en", n: 6 });
    expect(r.out).toEqual({ suggestions: [{ text: "Please call my son.", source: "ai", provider: "groq" }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api.groq.com");
  });

  it("asks Gemini when Groq fails, and labels it", async () => {
    fetchMock.mockResolvedValueOnce(new Response("down", { status: 503 })).mockResolvedValueOnce(geminiReply(["Please wait."]));
    const r = await call({ letters: "PL", lang: "en", n: 6 });
    expect(r.out).toEqual({ suggestions: [{ text: "Please wait.", source: "ai", provider: "gemini" }] });
    expect(String(fetchMock.mock.calls[1][0])).toContain("generativelanguage.googleapis.com");
  });

  it("asks Gemini when Groq has no key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    fetchMock.mockResolvedValueOnce(geminiReply(["Please wait."]));
    await call({ letters: "PL", lang: "en", n: 6 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("generativelanguage.googleapis.com");
  });

  it("returns an empty list when both providers fail", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const r = await call({ letters: "PL", lang: "en", n: 6 });
    expect(r.out).toEqual({ suggestions: [] });
  });

  it("puts only the letters, recent sentences and language into the prompt", async () => {
    fetchMock.mockResolvedValueOnce(groqReply(["Please wait."]));
    await call({ letters: "PL", recent: ["Yes."], lang: "hi", n: 6, video: "x", name: "Ravi" });
    const prompt: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('"PL"');
    expect(prompt).toContain("Yes.");
    expect(prompt).toContain("Hindi");
    expect(prompt).not.toContain("Ravi");
  });
});
