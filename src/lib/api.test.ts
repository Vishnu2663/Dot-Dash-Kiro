import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSuggestions } from "./api";
import { DEFAULT_SETTINGS } from "./settings";
function stubStorage(settings: Record<string, unknown> | null) {
  const store = new Map<string, string>();
  if (settings) store.set("dotdash.settings", JSON.stringify(settings));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
}
describe("cloud AI setting", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ suggestions: [{ text: "Please help.", source: "ai", provider: "groq" }] })));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("is on by default", () => {
    expect(DEFAULT_SETTINGS.cloudAi).toBe(true);
  });
  it("makes no network request when switched off", async () => {
    stubStorage({ ...DEFAULT_SETTINGS, cloudAi: false });
    expect(await fetchSuggestions("PL", ["Yes."], "en", 6)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends only letters, recent sentences, language and count when on", async () => {
    stubStorage({ ...DEFAULT_SETTINGS, cloudAi: true, passcode: "secret" });
    const out = await fetchSuggestions("PL", ["Yes."], "hi", 6);
    expect(out).toEqual([{ text: "Please help.", source: "ai", provider: "groq" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/predict");
    expect(JSON.parse(init.body)).toEqual({ letters: "PL", recent: ["Yes."], lang: "hi", n: 6 });
    expect(JSON.stringify(init)).not.toContain("secret");
  });
  it("treats a missing setting as on", async () => {
    stubStorage(null);
    await fetchSuggestions("PL", [], "en", 6);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
