import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, parseSuggestions, providerFailureLine, ProviderError, str, toProviderError, type Provider } from "./_lib.js";

const LANGUAGES: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

/** One provider reply: the text the model produced and the HTTP status it came with. */
interface Reply {
  text: string;
  status: number;
}

/** Reads a 2xx JSON body. A body that is not JSON counts as an unparseable reply. */
async function readJson<T>(r: Response): Promise<T> {
  try {
    return (await r.json()) as T;
  } catch {
    throw new ProviderError("unparseable-reply", r.status);
  }
}

async function askGroq(prompt: string, key: string): Promise<Reply> {
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
  if (!r.ok) throw new ProviderError("bad-status", r.status);
  const data = await readJson<{ choices?: { message?: { content?: string } }[] }>(r);
  return { text: data.choices?.[0]?.message?.content ?? "", status: r.status };
}

async function askGemini(prompt: string, key: string): Promise<Reply> {
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
  if (!r.ok) throw new ProviderError("bad-status", r.status);
  const data = await readJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(r);
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "", status: r.status };
}

/**
 * Suggests short sentences a patient might want to say. Tries Groq first, then Gemini.
 * With no keys, or if both fail, returns an empty list and the app uses its built-in phrase bank.
 * Each failed provider call writes one log line (see providerFailureLine).
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

  const providers: [Provider, string | undefined, (p: string, k: string) => Promise<Reply>][] = [
    ["groq", process.env.GROQ_API_KEY, askGroq],
    ["gemini", process.env.GEMINI_API_KEY, askGemini],
  ];
  for (const [provider, key, ask] of providers) {
    let texts: string[];
    try {
      if (!key) throw new ProviderError("missing-key");
      const reply = await ask(prompt, key);
      texts = parseSuggestions(reply.text, n);
      if (!texts.length) throw new ProviderError("unparseable-reply", reply.status);
    } catch (e) {
      // One line per failure. Only the provider, a closed reason and the status are logged.
      const err = toProviderError(e);
      console.warn(providerFailureLine(provider, err.reason, err.status));
      continue;
    }
    // Every sentence says where it came from, so the app can label it.
    return res.status(200).json({ suggestions: texts.map((text) => ({ text, source: "ai", provider })) });
  }
  return res.status(200).json({ suggestions: [] });
}
