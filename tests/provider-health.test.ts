import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/predict.js";
import { providerFailureLine } from "../api/_lib.js";

// Distinctive values so a leak into a log line is easy to spot.
const GROQ_KEY = "gsk_TESTKEY_groq_7f3a9c";
const GEMINI_KEY = "AIzaTESTKEY_gemini_51d2e8";
const LETTERS = "PLZQ";
const RECENT = "Fetch my blue blanket";
const SECRET_REPLY = "Please call Dr Ravi now";

function call(body: unknown = { letters: LETTERS, recent: [RECENT], lang: "en", n: 6 }) {
  const res = {
    code: 0,
    out: null as unknown,
    setHeader() {},
    status(c: number) { res.code = c; return res; },
    json(o: unknown) { res.out = o; return res; },
  };
  return handler({ method: "POST", headers: {}, body } as never, res as never).then(() => res);
}

const groqOk = (texts: string[]) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(texts) } }] }), { status: 200 });
const timeoutError = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");

describe("provider failure log lines", () => {
  const fetchMock = vi.fn();
  let warn: ReturnType<typeof vi.spyOn>;
  const lines = () => warn.mock.calls.map((args) => args.map(String).join(" "));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GROQ_API_KEY", GROQ_KEY);
    vi.stubEnv("GEMINI_API_KEY", GEMINI_KEY);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("formats the line from provider, status and reason only", () => {
    expect(providerFailureLine("groq", "bad-status", 404)).toBe("[predict] provider=groq status=404 reason=bad-status");
    expect(providerFailureLine("gemini", "timeout", null)).toBe("[predict] provider=gemini status=none reason=timeout");
  });

  it("missing-key: logs both providers and makes no request", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const r = await call();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(lines()).toEqual([
      "[predict] provider=groq status=none reason=missing-key",
      "[predict] provider=gemini status=none reason=missing-key",
    ]);
    expect(r.out).toEqual({ suggestions: [] });
  });

  it("bad-status: logs the provider's HTTP status, not its error body", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(`{"error":"model ${SECRET_REPLY} decommissioned"}`, { status: 404 }))
      .mockResolvedValueOnce(new Response("quota", { status: 429 }));
    await call();
    expect(lines()).toEqual([
      "[predict] provider=groq status=404 reason=bad-status",
      "[predict] provider=gemini status=429 reason=bad-status",
    ]);
  });

  it("timeout: logs reason timeout with no status", async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await call();
    expect(lines()).toEqual([
      "[predict] provider=groq status=none reason=timeout",
      "[predict] provider=gemini status=none reason=timeout",
    ]);
  });

  it("network-error: logs any other fetch failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await call();
    expect(lines()).toEqual([
      "[predict] provider=groq status=none reason=network-error",
      "[predict] provider=gemini status=none reason=network-error",
    ]);
  });

  it("unparseable-reply: 2xx with prose, empty text or a non-JSON body", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: `Sure! ${SECRET_REPLY}` } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response("<html>not json</html>", { status: 200 }));
    await call();
    expect(lines()).toEqual([
      "[predict] provider=groq status=200 reason=unparseable-reply",
      "[predict] provider=gemini status=200 reason=unparseable-reply",
    ]);
  });

  it("logs nothing when the first provider succeeds", async () => {
    fetchMock.mockResolvedValueOnce(groqOk(["Please wait."]));
    const r = await call({ letters: "PL", lang: "en", n: 6 });
    expect(warn).not.toHaveBeenCalled();
    expect(r.out).toEqual({ suggestions: [{ text: "Please wait.", source: "ai", provider: "groq" }] });
  });

  it("logs only the failed provider when the fallback succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '["Please wait."]' }] } }] }), { status: 200 }));
    await call({ letters: "PL", lang: "en", n: 6 });
    expect(lines()).toEqual(["[predict] provider=groq status=404 reason=bad-status"]);
  });

  it("never logs a key, the letters, recent sentences, the prompt or the reply, for any failure type", async () => {
    const failures: (() => void)[] = [
      () => { vi.stubEnv("GROQ_API_KEY", ""); vi.stubEnv("GEMINI_API_KEY", ""); },
      () => fetchMock.mockResolvedValue(new Response(`${GROQ_KEY} ${LETTERS} ${RECENT} ${SECRET_REPLY}`, { status: 500 })),
      () => fetchMock.mockRejectedValue(timeoutError()),
      () => fetchMock.mockRejectedValue(new Error(`boom ${GROQ_KEY} ${LETTERS}`)),
      () => fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: `${LETTERS} ${RECENT} ${SECRET_REPLY}` } }] }), { status: 200 })),
    ];
    const forbidden = [GROQ_KEY, GEMINI_KEY, LETTERS, RECENT, SECRET_REPLY, "patient", "Bearer"];
    for (const setup of failures) {
      fetchMock.mockReset();
      vi.stubEnv("GROQ_API_KEY", GROQ_KEY);
      vi.stubEnv("GEMINI_API_KEY", GEMINI_KEY);
      warn.mockClear();
      setup();
      await call();
      expect(lines().length).toBe(2);
      for (const line of lines()) {
        expect(line).toMatch(/^\[predict\] provider=(groq|gemini) status=(\d{3}|none) reason=[a-z-]+$/);
        for (const f of forbidden) expect(line).not.toContain(f);
      }
    }
  });
});

describe("default models and request bodies", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GROQ_API_KEY", GROQ_KEY);
    vi.stubEnv("GEMINI_API_KEY", GEMINI_KEY);
    vi.stubEnv("GROQ_MODEL", "");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const sentBody = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

  it("sends Groq the new default model with low reasoning, no reasoning text and 1024 tokens", async () => {
    fetchMock.mockResolvedValueOnce(groqOk(["Please wait."]));
    await call({ letters: "PL", lang: "en", n: 6 });
    const body = sentBody(0);
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
    expect(body.max_completion_tokens).toBe(1024);
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("reasoning_format"); // not supported on GPT-OSS
  });

  it("sends Gemini the new default model with 1024 output tokens and no thinking field", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '["Please wait."]' }] } }] })));
    await call({ letters: "PL", lang: "en", n: 6 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/models/gemini-3.6-flash:generateContent");
    const config = sentBody(0).generationConfig;
    expect(config.maxOutputTokens).toBe(1024);
    expect(Object.keys(config).sort()).toEqual(["maxOutputTokens", "temperature"]);
  });

  it("still lets GROQ_MODEL and GEMINI_MODEL replace the defaults", async () => {
    vi.stubEnv("GROQ_MODEL", "qwen/qwen3.8-27b");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
    await call({ letters: "PL", lang: "en", n: 6 });
    const groq = sentBody(0);
    expect(groq.model).toBe("qwen/qwen3.8-27b");
    // Reasoning fields are only sent to GPT-OSS models.
    expect(groq).not.toHaveProperty("reasoning_effort");
    expect(groq).not.toHaveProperty("include_reasoning");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/models/gemini-3.8-flash:generateContent");
  });

  it("logs the HTTP status when the account cannot use the model", async () => {
    fetchMock.mockResolvedValueOnce(new Response("model not found", { status: 404 })).mockResolvedValueOnce(new Response("denied", { status: 403 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await call({ letters: "PL", lang: "en", n: 6 });
    expect(warn.mock.calls.map((a) => a[0])).toEqual([
      "[predict] provider=groq status=404 reason=bad-status",
      "[predict] provider=gemini status=403 reason=bad-status",
    ]);
  });
});
