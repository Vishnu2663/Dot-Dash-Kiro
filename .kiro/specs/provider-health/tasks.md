# Tasks: Provider health

- [x] 1. `ProviderError`, `providerFailureLine` in `api/_lib.ts`; throw typed errors from `askGroq` / `askGemini`; log in the handler loop. _Req 1_
- [x] 2. Tests in `tests/provider-health.test.ts`: one test per reason with the exact line; a sweep over all failure types asserting no line contains the key, letters, recent sentence or prompt; success logs nothing; response still `{ suggestions: [] }`. _Req 1, 4_
- [ ] 3. Default models and reasoning limits, after the open questions in design.md are answered. _Req 2_
- [ ] 4. README: model defaults, `GROQ_MODEL` / `GEMINI_MODEL`, "check model retirement first", how to read the log line. _Req 3_
- [ ] 5. `npm run typecheck` and `npm test` pass. Do not push.
