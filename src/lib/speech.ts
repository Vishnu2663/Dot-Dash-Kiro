import type { Lang } from "./settings";

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === LOCALE[lang]) ??
    voices.find((v) => v.lang.startsWith(lang)) ??
    (lang === "en" ? voices.find((v) => v.lang.startsWith("en")) : undefined)
  );
}

export function speak(text: string, lang: Lang = "en") {
  if (!text.trim() || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang];
  u.rate = 0.9;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export const YES_NO: Record<"yes" | "no", Record<Lang, string>> = {
  yes: { en: "Yes", hi: "हाँ", kn: "ಹೌದು" },
  no: { en: "No", hi: "नहीं", kn: "ಇಲ್ಲ" },
};
