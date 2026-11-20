import { loadSettings } from "./settings";
import { FALLBACK_MS, parseRemote, type Suggestion } from "./suggest";

const post = async (url: string, body: unknown, headers: Record<string, string>, timeoutMs: number) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

/**
 * Ask the server for sentences. Returns null on any failure so callers fall back to the built-in list.
 * Makes no network request at all when "Use cloud AI for suggestions" is off.
 */
export async function fetchSuggestions(
  letters: string, recent: string[], lang: string, n = 6, signal?: AbortSignal,
): Promise<Suggestion[] | null> {
  if (!loadSettings().cloudAi) return null;
  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ letters, recent, lang, n }),
      signal: signal ?? AbortSignal.timeout(FALLBACK_MS),
    });
    if (!res.ok) return null;
    return parseRemote(await res.json());
  } catch {
    return null;
  }
}
export type AlertResult = "sent" | "cooldown" | "unauthorized" | "not-configured" | "no-chat" | "rejected" | "failed";
const ALERT_COOLDOWN_MS = 30_000;
let lastSos = 0;

export async function sendAlert(type: "SOS" | "message", text?: string): Promise<AlertResult> {
  const key = loadSettings().passcode;
  if (!key) return "unauthorized";
  if (type === "SOS") {
    const now = Date.now();
    if (now - lastSos < ALERT_COOLDOWN_MS) return "cooldown";
    lastSos = now;
  }
  try {
    const res = await post("/api/alert", { type, text }, { "x-dotdash-key": key }, 8000);
    if (res.status === 401) {
      if (type === "SOS") lastSos = 0;
      return "unauthorized";
    }
    if (res.status === 429) return "cooldown";
    if (res.ok) return "sent";
    if (type === "SOS") lastSos = 0;
    if (res.status === 503) return "not-configured";
    if (res.status === 409) return "no-chat";
    if (res.status === 502) return "rejected";
    return "failed";
  } catch {
    /* handled below */
  }
  if (type === "SOS") lastSos = 0;
  return "failed";
}

export const ALERT_MESSAGES: Record<AlertResult, string> = {
  sent: "🚨 Alert sent to your caregiver",
  cooldown: "An alert was just sent. Please wait a moment.",
  unauthorized: "Alerts are not set up. A caregiver must enter the passcode in Settings.",
  "not-configured": "Alerts are not set up on the server. Please call for help another way.",
  "no-chat": "The caregiver has not pressed Start in the Telegram bot yet. Please call for help another way.",
  rejected: "Telegram did not accept the alert. Please call for help another way.",
  failed: "The alert could not be sent. Please call for help another way.",
};

export interface Question {
  id: string;
  text: string;
  askedAt: number;
  answer: "yes" | "no" | null;
  answeredAt?: number;
}

export type AskResult =
  | { status: "ok"; question: Question | null; store: "redis" | "memory" }
  | { status: "unauthorized" | "failed" };

export async function askApi(
  passcode: string,
  action: "get" | "ask" | "answer" | "clear",
  extra: Record<string, unknown> = {},
): Promise<AskResult> {
  if (!passcode) return { status: "unauthorized" };
  try {
    const res = await post("/api/ask", { action, ...extra }, { "x-dotdash-key": passcode }, 6000);
    if (res.status === 401) return { status: "unauthorized" };
    if (!res.ok) return { status: "failed" };
    const data = await res.json();
    return { status: "ok", question: data.question ?? null, store: data.store === "redis" ? "redis" : "memory" };
  } catch {
    return { status: "failed" };
  }
}
