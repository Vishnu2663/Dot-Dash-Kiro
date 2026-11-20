import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, parseSuggestions, str } from "./_lib.js";

const LANGUAGES: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

async function askGroq(prompt: string, key: string): Promise<string> {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`groq ${r.status}`);
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function askGemini(prompt: string, key: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Suggests short sentences a patient might want to say. Tries Groq first (fast), then Gemini.
 * With no keys, or if both fail, returns an empty list and the app uses its built-in phrase bank.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }
  const body = bodyOf(req);
  const letters = str(body.letters, 60);
  const lang = LANGUAGES[str(body.lang, 4)] ?? "English";
  const n = Math.min(8, Math.max(1, Number(body.n) || 6));
  const recent = Array.isArray(body.recent)
    ? body.recent.filter((r): r is string => typeof r === "string").slice(0, 5).map((r) => r.slice(0, 120))
    : [];
  if (letters.length < 2) return res.status(200).json({ suggestions: [] });

  const prompt =
    `A patient who cannot speak is spelling a message letter by letter. They have typed: "${letters}".\n` +
    `Give up to ${n} short, natural sentences in ${lang} that a bedridden patient might want to say. ` +
    `Every sentence MUST begin with exactly those letters (ignore case). ` +
    (recent.length ? `Sentences they said recently: ${recent.join(" | ")}. ` : "") +
    `Reply with only a JSON array of strings.`;

  const providers: [string | undefined, (p: string, k: string) => Promise<string>, "groq" | "gemini"][] = [
    [process.env.GROQ_API_KEY, askGroq, "groq"],
    [process.env.GEMINI_API_KEY, askGemini, "gemini"],
  ];
  for (const [key, ask, provider] of providers) {
    if (!key) continue;
    try {
      const texts = parseSuggestions(await ask(prompt, key), n);
      // Every sentence says where it came from, so the app can label it.
      if (texts.length) return res.status(200).json({ suggestions: texts.map((text) => ({ text, source: "ai", provider })) });
    } catch {
      /* try the next provider */
    }
  }
  return res.status(200).json({ suggestions: [] });
}
