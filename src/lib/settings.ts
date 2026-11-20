import { DEFAULT_TIMING, type Timing } from "./blink";

export type Lang = "en" | "hi" | "kn";

export interface Settings {
  timing: Timing;
  lang: Lang;
  calibrated: boolean;
  passcode: string;
  /** Easy mode: how long each option stays highlighted (ms). */
  scanMs: number;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  timing: DEFAULT_TIMING,
  lang: "en",
  calibrated: false,
  passcode: "",
  scanMs: 1500,
  sound: true,
};

const SETTINGS_KEY = "dotdash.settings";
const RECENT_KEY = "dotdash.recent";

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (raw) {
      return {
        timing: { ...DEFAULT_TIMING, ...raw.timing },
        lang: raw.lang === "hi" || raw.lang === "kn" ? raw.lang : "en",
        calibrated: !!raw.calibrated,
        passcode: typeof raw.passcode === "string" ? raw.passcode : "",
        scanMs: Math.min(4000, Math.max(1500, Number(raw.scanMs) || 1500)),
        sound: raw.sound !== false,
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function pushRecent(sentence: string) {
  const next = [sentence, ...loadRecent().filter((x) => x !== sentence)].slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}
