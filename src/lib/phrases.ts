import { answerFor } from "./morse";

export interface EasyOption {
  label: string;
  say: string;
  icon: string;
}

/** Options scanned in Easy mode. */
export const EASY_OPTIONS: EasyOption[] = [
  { label: "Water", say: "I would like some water", icon: "💧" },
  { label: "Pain", say: "I am in pain", icon: "😣" },
  { label: "Toilet", say: "I want to use the toilet", icon: "🚻" },
  { label: "Turn me", say: "Please help me turn over", icon: "🔄" },
  { label: "Call nurse", say: "Please call the nurse", icon: "🧑‍⚕️" },
  { label: "Yes", say: "Yes", icon: "✅" },
  { label: "No", say: "No", icon: "❌" },
];

const sayFor = (label: string) => EASY_OPTIONS.find((o) => o.label === label)!.say;

export interface QuickPhrase {
  id: string;
  label: string;
  say: string;
  code: string;
  how: string;
  match: (code: string) => boolean;
  /** Code is open-ended (keep blinking), so it is shown with an ellipsis. */
  open?: boolean;
}

/** One-pattern phrases. None of these codes is ever a letter. */
export const QUICK_PHRASES: QuickPhrase[] = [
  { id: "water", label: "Water", say: sayFor("Water"), code: "......", how: "keep blinking short", open: true, match: (c) => /^\.{6,}$/.test(c) },
  { id: "toilet", label: "Toilet", say: sayFor("Toilet"), code: "----", how: "4 long blinks", match: (c) => c === "----" },
  { id: "pain", label: "Pain", say: sayFor("Pain"), code: "------", how: "keep blinking long", open: true, match: (c) => /^-{6,}$/.test(c) },
  { id: "turn", label: "Turn me", say: sayFor("Turn me"), code: "-.-.-.", how: "long, short, ×3", match: (c) => c === "-.-.-." },
  { id: "nurse", label: "Nurse", say: sayFor("Call nurse"), code: ".-.-.-", how: "short, long, ×3", match: (c) => c === ".-.-.-" },
  { id: "yes", label: "Yes", say: sayFor("Yes"), code: ".-.-.", how: "short, long, short, long, short", match: (c) => c === ".-.-." },
  { id: "no", label: "No", say: sayFor("No"), code: "-.-.-", how: "long, short, long, short, long", match: (c) => c === "-.-.-" },
];

export const matchQuickPhrase = (code: string) =>
  code ? QUICK_PHRASES.find((p) => p.match(code)) ?? null : null;

/** Quick phrases the partial code is on its way to, or already matches. */
export function candidateQuickPhrases(code: string): QuickPhrase[] {
  if (!code) return [];
  return QUICK_PHRASES.filter(
    (p) =>
      p.match(code) ||
      p.code.startsWith(code) ||
      (p.id === "water" && /^\.+$/.test(code)) ||
      (p.id === "pain" && /^-+$/.test(code)),
  );
}

export { answerFor };

/** Questions a caregiver can ask with one tap. */
export const CAREGIVER_QUESTIONS = [
  "Are you in pain?",
  "Do you need water?",
  "Do you need the toilet?",
  "Do you want to be turned?",
  "Are you too hot?",
  "Are you too cold?",
  "Do you want the light off?",
  "Do you want me to stay with you?",
];

/** Built-in sentence bank used for instant, offline suggestions. */
export const SENTENCES = [
  "I would like some water.", "I am thirsty.", "I am in pain.", "I have chest pain.",
  "I have a headache.", "I want to use the toilet.", "Please help me turn over.",
  "Please call the nurse.", "Please call the doctor.", "I need help.", "Yes.", "No.",
  "I am cold.", "I am hot.", "I am tired.", "I want to sleep.", "I want to see my family.",
  "Please call my family.", "I cannot breathe.", "I feel sick.", "I am hungry.",
  "I would like something to eat.", "Please adjust my pillow.", "Please raise my bed.",
  "Please lower my bed.", "Please turn on the light.", "Please turn off the light.",
  "Please open the window.", "I am scared.", "Thank you.", "Please stay with me.",
  "I love you.", "I am okay.", "I am not okay.", "Please give me my medicine.",
  "My arm hurts.", "My leg hurts.", "My back hurts.", "I need to cough.",
  "I need suction, please.", "Please wipe my face.", "I want to sit up.", "I want to lie down.",
  "Please change my position.", "I want to talk to someone.", "Please wait.",
  "Please come here.", "Where is my family?", "What time is it?", "I want to watch television.",
];

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ");

/**
 * True when `sentence` starts with the typed letters. With spaces, each typed word is a prefix
 * of the matching sentence word ("i wa" matches "I want"). Without spaces, letters run across words.
 */
export function startsWithLetters(typed: string, sentence: string): boolean {
  const t = normalize(typed);
  if (!t) return false;
  const s = normalize(sentence);
  if (!t.includes(" ")) return s.replace(/ /g, "").startsWith(t);
  const tw = t.split(" ");
  const sw = s.split(" ");
  return tw.length <= sw.length && tw.every((w, i) => sw[i].startsWith(w));
}

export const localSuggestions = (typed: string, n = 3) =>
  SENTENCES.filter((s) => startsWithLetters(typed, s)).slice(0, n);

/** Merge remote suggestions (first) with local ones, keeping only sentences that match the letters. */
export function mergeSuggestions(typed: string, remote: string[], n: number): string[] {
  const out: string[] = [];
  for (const s of [...remote, ...localSuggestions(typed, n * 2)]) {
    if (out.length >= n) break;
    if (startsWithLetters(typed, s) && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out;
}
