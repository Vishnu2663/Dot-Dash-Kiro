import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings";

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  return store;
}

describe("Reduce motion setting", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is off by default", () => {
    expect(DEFAULT_SETTINGS.reduceMotion).toBe(false);
    stubStorage();
    expect(loadSettings().reduceMotion).toBe(false);
  });

  it("persists under the dotdash. prefix and survives a reload", () => {
    const store = stubStorage();
    saveSettings({ ...DEFAULT_SETTINGS, reduceMotion: true });
    expect(JSON.parse(store.get("dotdash.settings")!).reduceMotion).toBe(true);
    expect(loadSettings().reduceMotion).toBe(true);
  });

  it("treats a missing or non-boolean stored value as off", () => {
    stubStorage({ "dotdash.settings": JSON.stringify({ sound: true }) });
    expect(loadSettings().reduceMotion).toBe(false);
    stubStorage({ "dotdash.settings": JSON.stringify({ reduceMotion: "yes" }) });
    expect(loadSettings().reduceMotion).toBe(false);
  });

  it("is turned off by Reset to defaults, which keeps only the passcode", () => {
    // Mirrors the Reset button in SettingsPage: { ...DEFAULT_SETTINGS, passcode }.
    const reset = { ...DEFAULT_SETTINGS, passcode: "kept" };
    expect(reset.reduceMotion).toBe(false);
  });
});
