import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, fixLetterCase, parseSuggestions, providerFailureLine, ProviderError, str, toProviderError, type Provider } from "./_lib.js";

const LANGUAGES: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

/**
 * Default models, chosen from the providers' deprecation pages. Both can be replaced with
 * GROQ_MODEL and GEMINI_MODEL. If suggestions only say "Built-in", check these are not retired.
 */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";
export const GEMINI_DEFAULT_MODEL = "gemini-3.6-flash";
/** Reasoning tokens count against this limit, so it is set well above the ~300 tokens the answer needs. */
export const MAX_OUTPUT_TOKENS = 1024;

/**
 * Groq request body. GPT-OSS models get low reasoning effort and no reasoning text in the reply
 * (Groq reasoning docs). Other models get neither field, because Groq does not accept them for every model.
 */
export function groqBody(prompt: string, model: string) {
  const reasoning = model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {};
  return {
    model,
    temperature: 0.3,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    ...reasoning,
    messages: [{ role: "user", content: prompt }],
  };
}

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
    body: JSON.stringify(groqBody(prompt, process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL)),
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new ProviderError("bad-status", r.status);
  const data = await readJson<{ choices?: { message?: { content?: string } }[] }>(r);
  return { text: data.choices?.[0]?.message?.content ?? "", status: r.status };
}

async function askGemini(prompt: string, key: string): Promise<Reply> {
  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUTPUT_TOKENS },
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
    `Write normal sentence case (for example "Please...", never "PLease..."), with full words and no abbreviations or text-speak. ` +
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
      texts = parseSuggestions(reply.text, n).map((t) => fixLetterCase(t, letters));
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
