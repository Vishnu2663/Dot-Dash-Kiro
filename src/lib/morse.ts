export const MORSE: Record<string, string> = {
  ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G",
  "....": "H", "..": "I", ".---": "J", "-.-": "K", ".-..": "L", "--": "M", "-.": "N",
  "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T", "..-": "U",
  "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z",
  "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4",
  ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9",
};

/** Control codes. Neither is a letter, so spelling is not affected. */
export const DELETE_CODE = "..--";
export const SPEAK_CODE = ".-.-";

export type Decoded =
  | { kind: "char"; value: string }
  | { kind: "delete" }
  | { kind: "send" }
  | { kind: "unknown" };

export function decode(code: string): Decoded {
  if (code === DELETE_CODE) return { kind: "delete" };
  if (code === SPEAK_CODE) return { kind: "send" };
  const value = MORSE[code];
  return value ? { kind: "char", value } : { kind: "unknown" };
}

export function applyDecoded(text: string, d: Decoded): string {
  switch (d.kind) {
    case "char": return text + d.value;
    case "delete": return text.slice(0, -1);
    case "unknown": return text + "?";
    default: return text;
  }
}

export const endsWithHelp = (text: string) => /(^|\s)HELP$/.test(text.trim().toUpperCase());

/** Letters the current partial code could still become. */
export function lookahead(code: string): { exact: string | null; more: string[] } {
  if (!code) return { exact: null, more: [] };
  return {
    exact: MORSE[code] ?? null,
    more: Object.entries(MORSE)
      .filter(([c]) => c.length > code.length && c.startsWith(code))
      .map(([, ch]) => ch),
  };
}

/** Dots and dashes as symbols, e.g. ".-" -> "• —". */
export const pretty = (code: string, sep = " ") =>
  [...code].map((c) => (c === "." ? "•" : "—")).join(sep);

export const codeFor = (ch: string): string | null =>
  Object.entries(MORSE).find(([, v]) => v === ch)?.[0] ?? null;

/** Short blink = yes, long blink = no. */
export const answerFor = (code: string): "yes" | "no" | null =>
  code === "." ? "yes" : code === "-" ? "no" : null;
