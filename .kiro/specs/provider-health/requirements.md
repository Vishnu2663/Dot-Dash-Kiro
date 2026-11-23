# Requirements: Provider health for /api/predict

## Introduction
Both default models are retired: Groq `llama-3.1-8b-instant` (shutdown 08/16/26) and Gemini
`gemini-2.0-flash` (shutdown June 1, 2026). Every call now fails, the server swallows the error, and
suggestions fall back to built-in phrases with no trace in the logs. This spec adds failure logging,
moves the defaults to current models available on each provider's free tier, and documents how to
diagnose it.

Out of scope, and unchanged: blink timing, the caregiver channel, alerts, and all security rules.

## Constraints
- Only free AI services. The defaults shall be models offered on each provider's free tier.
- The model choice shall come from the official deprecation pages (see design.md, Sources).

## Glossary
- **Provider call**: one attempt by `/api/predict` to get sentences from Groq or Gemini.
- **Failure reason**: one of `missing-key`, `bad-status`, `timeout`, `network-error`, `unparseable-reply`.

### Requirement 1: Failure log line
**User story:** As the maintainer, I want one log line per failed provider call, so I can see why suggestions fell back.

1. When a provider has no API key configured, the server shall log one line with the provider name, status `none` and reason `missing-key`.
2. When a provider answers with a non-2xx HTTP status, the server shall log one line with the provider name, that status and reason `bad-status`.
3. When a provider call exceeds its 6 s limit, the server shall log one line with the provider name, status `none` and reason `timeout`.
4. When a provider call fails for another network reason, the server shall log one line with the provider name, status `none` and reason `network-error`.
5. When a provider answers 2xx but no sentences can be read from the reply, the server shall log one line with the provider name, the status and reason `unparseable-reply`.
6. The log line shall have a fixed format: `[predict] provider=<groq|gemini> status=<number|none> reason=<reason>`.
7. The log line shall not contain an API key, the typed letters, recent sentences, the prompt, or any part of the provider's reply body.
8. When a provider call succeeds, the server shall not log anything for that call.
9. The response to the browser shall not change: still HTTP 200 with `{ suggestions: [] }` when every provider fails.

### Requirement 2: Current default models
**User story:** As the maintainer, I want defaults that work today on free tiers, so suggestions work without extra setup.

1. The default Groq model shall be one listed as a production model and not deprecated on Groq's official pages, and available on Groq's free plan.
2. The default Gemini model shall be one with no shutdown date announced on Google's official deprecation page, and "Free of charge" on the free tier.
3. `GROQ_MODEL` and `GEMINI_MODEL` shall still override the defaults.
4. While the Groq model is a GPT-OSS model, the request shall send `reasoning_effort: "low"` and `include_reasoning: false`, and shall not send them to other models.
5. Both providers shall allow 1024 output tokens (Groq `max_completion_tokens`, Gemini `maxOutputTokens`).
6. The Gemini request shall not include any thinking field that is not confirmed for the `generateContent` endpoint.
7. When `GEMINI_API_KEY` is unset, Gemini shall not be called.

### Requirement 3: README
1. The README shall name both default models.
2. The README shall say they can be replaced with `GROQ_MODEL` and `GEMINI_MODEL`.
3. The README shall say that model retirement is the first thing to check when suggestions only show "Built-in", and how to read the log line.
4. The README and the "What is sent to the cloud" panel shall say: "On Google's free tier, Google may use content sent to Gemini to improve its products.", attributed to Google's pricing page. They shall make no other claim about how Groq or Google store text.
5. The README shall say that leaving `GEMINI_API_KEY` unset turns Gemini off.

### Requirement 4: Tests
1. Tests shall cover each failure reason and check the exact log line.
2. Tests shall check that no log line, across all failure types, contains the API key or any input text.
3. Tests shall check that a successful call logs nothing.

### Requirement 5: Readable suggestion text
**User story:** As a patient, I want suggestions written like normal sentences, so they are easy to read and sound right when spoken.

Found after the first live call: the model copied the typed capitals ("PLease help me get a drink.", "PLs I need more water.").
1. The prompt shall ask for normal sentence case, full words, and no abbreviations or text-speak.
2. When a sentence word covering the typed letters has the copied-capitals shape ("PLease"), the server shall rewrite it to sentence case ("Please"; later words become lower case: "I WAnt" becomes "I want").
3. The server shall leave all-capital words ("I", "ICU"), already-correct words, and words after the typed letters unchanged.

