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

## Default models (decided)
| Provider | Retired default | New default | Request settings |
|---|---|---|---|
| Groq | `llama-3.1-8b-instant` (shutdown 08/16/26) | `openai/gpt-oss-20b` | `max_completion_tokens: 1024`; for `openai/gpt-oss*` only: `reasoning_effort: "low"`, `include_reasoning: false` |
| Gemini | `gemini-2.0-flash` (shutdown June 1, 2026) | `gemini-3.6-flash` | `maxOutputTokens: 1024`; no thinking field |

- The defaults are `GROQ_DEFAULT_MODEL` and `GEMINI_DEFAULT_MODEL` in `api/predict.ts`. `GROQ_MODEL` and
  `GEMINI_MODEL` replace them; an empty value falls back to the default.
- Reasoning fields go only to GPT-OSS models, because Groq's docs list `low` and `include_reasoning` per
  model family. A `GROQ_MODEL` override to another family gets neither.
- Gemini thinking is left at the model's default. The thinking docs show `thinking_level` only for the
  Interactions API, and the field for `generateContent` was not confirmed, so it is not sent.
- Privacy text: one sentence from Google's pricing page about the free tier, attributed. No other
  provider-side claim.

## Sources
- https://console.groq.com/docs/deprecations
- https://console.groq.com/docs/models
- https://console.groq.com/docs/reasoning
- https://ai.google.dev/gemini-api/docs/deprecations (redirects to https://aistudio.google.com/docs/deprecations)
- https://aistudio.google.com/docs/pricing
- https://aistudio.google.com/docs/thinking

## Decisions on the earlier open questions
1. Groq free plan: not proven from the docs. The owner tests with a real call; a refusal shows as
   `reason=bad-status` with the HTTP status in the log line.
2. Gemini stays as the fallback; the free-tier sentence is shown in the panel and README.
3. No Gemini thinking field is sent (see above).
