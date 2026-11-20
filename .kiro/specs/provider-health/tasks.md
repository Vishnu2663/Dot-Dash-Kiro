# Tasks: Provider health

- [x] 1. `ProviderError`, `providerFailureLine` in `api/_lib.ts`; throw typed errors from `askGroq` / `askGemini`; log in the handler loop. _Req 1_
- [x] 2. Tests in `tests/provider-health.test.ts`: one test per reason with the exact line; a sweep over all failure types asserting no line contains the key, letters, recent sentence or prompt; success logs nothing; response still `{ suggestions: [] }`. _Req 1, 4_
- [x] 3. Default models `openai/gpt-oss-20b` and `gemini-3.6-flash`; Groq reasoning settings for GPT-OSS; 1024 output tokens for both; no Gemini thinking field. Tests check both request bodies, overrides, and that a refused model logs its status. _Req 2_
- [x] 4. README and Settings panel: model defaults, `GROQ_MODEL` / `GEMINI_MODEL`, unset `GEMINI_API_KEY` turns Gemini off, "check model retirement first", how to read the log line, attributed Google free-tier sentence. _Req 3_
- [x] 5. `npm run typecheck` and `npm test` pass. Do not push.
