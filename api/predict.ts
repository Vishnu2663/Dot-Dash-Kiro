import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, str } from "./_lib";

const LANGUAGES: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

/**
 * Suggests short sentences a patient might want to say. Uses any OpenAI-compatible
 * chat endpoint when LLM_API_KEY is set. Without it, returns an empty list and the
 * app falls back to its built-in phrase bank.
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

  const key = process.env.LLM_API_KEY;
  if (!key || letters.length < 2) return res.status(200).json({ suggestions: [] });

  const base = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const prompt =
    `A patient who cannot speak is spelling a message letter by letter. They have typed: "${letters}".\n` +
    `Give up to ${n} short, natural sentences in ${lang} that a bedridden patient might want to say. ` +
    `Every sentence MUST begin with exactly those letters (ignore case). ` +
    (recent.length ? `Sentences they said recently: ${recent.join(" | ")}. ` : "") +
    `Reply with only a JSON array of strings.`;

  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(200).json({ suggestions: [] });
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const json = content.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    const parsed: unknown = JSON.parse(json);
    const suggestions = Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string").map((s) => s.trim().slice(0, 140)).filter(Boolean).slice(0, n)
      : [];
    return res.status(200).json({ suggestions });
  } catch {
    return res.status(200).json({ suggestions: [] });
  }
}
