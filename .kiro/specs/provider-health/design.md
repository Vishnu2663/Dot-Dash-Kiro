# Design: Provider health

## Failure model
`askGroq` and `askGemini` throw a `ProviderError { reason, status }` instead of a plain `Error`.
The handler catches it, logs one line, and tries the next provider. The response shape is unchanged.

| Situation | reason | status |
|---|---|---|
| Key env var empty or unset | `missing-key` | `none` |
| HTTP response not 2xx | `bad-status` | response status |
| `fetch` rejects with `TimeoutError` (from `AbortSignal.timeout(6000)`) | `timeout` | `none` |
| `fetch` rejects for any other reason | `network-error` | `none` |
| 2xx, but body is not JSON or `parseSuggestions` finds no strings | `unparseable-reply` | response status |

## Log line
`[predict] provider=<groq|gemini> status=<number|none> reason=<reason>`, written with `console.warn`
(Vercel shows it in the function's runtime logs). The line is built by one pure helper,
`providerFailureLine(provider, reason, status)` in `api/_lib.ts`, whose inputs are two closed enums and
a number. No free text can reach it, so keys, letters, sentences, the prompt and reply bodies can't
be logged. Error bodies from providers are never read into the log.

## Default models
Chosen from the official pages listed under Sources. Final values need the open questions below answered.

| Provider | Retired default | Replacement on the official page |
|---|---|---|
| Groq | `llama-3.1-8b-instant` (shutdown 08/16/26) | `openai/gpt-oss-20b` |
| Gemini | `gemini-2.0-flash` (shutdown June 1, 2026) | `gemini-3.6-flash` (no shutdown date announced) |

Both replacements are reasoning models. Reasoning output counts against the output limit, so the
current 300-token limit can produce empty text, which would be logged as `unparseable-reply`.
- Groq `gpt-oss-20b`: send `reasoning_effort: "low"` and `include_reasoning: false`, and raise the limit.
  Only send these when the model id starts with `openai/gpt-oss`, because other models reject or ignore them.
- Gemini `gemini-3.6-flash`: default thinking is "medium"; `minimal` is supported. Use the lowest level.

## Sources
- https://console.groq.com/docs/deprecations
- https://console.groq.com/docs/models
- https://console.groq.com/docs/reasoning
- https://ai.google.dev/gemini-api/docs/deprecations (redirects to https://aistudio.google.com/docs/deprecations)
- https://aistudio.google.com/docs/pricing
- https://aistudio.google.com/docs/thinking

## Open questions (need the owner's decision)
1. Groq free plan: the rate-limits page lists `openai/gpt-oss-20b` but labels the table "base limits for
   the Developer plan". Whether the free plan includes it is not confirmed.
2. Gemini free tier: Google's pricing page says free-tier content is "used to improve our products";
   the paid tier says it is not. This affects what the "What is sent to the cloud" panel should say.
3. Gemini thinking control: the docs show `thinking_level` for the newer Interactions API. The exact
   field for the `generateContent` endpoint this app uses is not confirmed.
