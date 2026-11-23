# Design: Provider health

## Overview
Make `/api/predict` failures visible (one safe log line per failed provider call), move the defaults off
retired models to current free-tier ones, and keep suggestion text readable.

## Architecture
`askGroq` and `askGemini` throw a `ProviderError { reason, status }` instead of a plain `Error`. The handler
tries Groq, then Gemini. For each failed call it logs one line and moves on. The first usable answer is
returned; if none, `{ suggestions: [] }`. The response shape is unchanged.

## Components and Interfaces
- `ProviderError`, `toProviderError(e)` and `providerFailureLine(provider, reason, status)` in
  `api/_lib.ts`. The line is `[predict] provider=<groq|gemini> status=<number|none> reason=<reason>`,
  written with `console.warn` (Vercel shows it in the function's runtime logs).
- `groqBody(prompt, model)` in `api/predict.ts`: builds the Groq request.
- `fixLetterCase(sentence, letters)` in `api/_lib.ts`: runs on every parsed sentence before it is returned.
  It walks the words that cover the typed letters (one word per typed word when the letters contain spaces;
  otherwise word by word until the letter count is used up). It only rewrites the `^Lu Lu+ (?=Ll)` shape,
  keeping the first word's capital and lowering later words. The client's `startsWithLetters` match is
  case-insensitive, so filtering is unaffected.

## Data Models
| Situation | reason | status |
|---|---|---|
| Key env var empty or unset | `missing-key` | `none` |
| HTTP response not 2xx | `bad-status` | response status |
| `fetch` rejects with `TimeoutError` (from `AbortSignal.timeout(6000)`) | `timeout` | `none` |
| `fetch` rejects for any other reason | `network-error` | `none` |
| 2xx, but body is not JSON or `parseSuggestions` finds no strings | `unparseable-reply` | response status |

Default models (decided):

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

## Correctness Properties

### Property 1: One line per failure, none on success
Each failed provider call writes exactly one line in the fixed format; a successful call writes none.

_Status: tested._ **Validates: Requirements 1.1–1.6, 1.8**

### Property 2: Logs never leak keys or input
No log line contains an API key, the typed letters, recent sentences, the prompt or reply text, for any failure type. The line is built only from two closed enums and a number.

_Status: tested, including a planted leak that made the tests fail._ **Validates: Requirements 1.7**

### Property 3: Request bodies use the agreed settings
The Groq body carries the reasoning settings and the 1024-token limit; the Gemini `generationConfig` carries only `temperature` and `maxOutputTokens`.

_Status: tested._ **Validates: Requirements 2.4, 2.5, 2.6**

### Property 4: Copied capitals are corrected, nothing else
Copied capitals in the words covering the typed letters are corrected; all-capital and correct words are left alone.

_Status: tested._ **Validates: Requirements 5.2, 5.3**

## Error Handling
Every failure is caught per provider, logged, and followed by the next provider. The browser always gets
HTTP 200 with a (possibly empty) list, and the app falls back to built-in phrases.

Decisions on the earlier open questions:
1. Groq free plan: not proven from the docs. The owner tests with a real call; a refusal shows as
   `reason=bad-status` with the HTTP status in the log line.
2. Gemini stays as the fallback; the free-tier sentence is shown in the panel and README.
3. No Gemini thinking field is sent (see above).

Sources:
- https://console.groq.com/docs/deprecations
- https://console.groq.com/docs/models
- https://console.groq.com/docs/reasoning
- https://ai.google.dev/gemini-api/docs/deprecations (redirects to https://aistudio.google.com/docs/deprecations)
- https://aistudio.google.com/docs/pricing
- https://aistudio.google.com/docs/thinking

## Testing Strategy
- `tests/provider-health.test.ts`: one test per failure reason with the exact line, a sweep over all failure
  types for leaks, success logs nothing, request bodies, model overrides, and casing in handler output.
- `tests/predict.test.ts`: `fixLetterCase` cases, including the replies seen from the live model.
- A real call on the deployed site, with the result read in the Vercel function logs.
