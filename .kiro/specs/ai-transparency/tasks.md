# Tasks: AI transparency

- [x] 1. `Suggestion` types and pure helpers in `src/lib/suggest.ts`
  - Tests (`src/lib/suggest.test.ts`): built-in label, `parseRemote` keeps only server-marked AI, merge order, duplicate shown once as AI, non-matching AI dropped. _Req 2.3, 2.4, 4.5_
- [x] 2. `improveSuggestions` with 9 s fallback
  - Fake-timer tests: pending at 8 999 ms, falls back and aborts at 9 000 ms; fast answer; null, empty and throwing fetchers; all AI filtered out. _Req 4.2, 4.3_
- [x] 3. `cloudAi` setting and gate in `fetchSuggestions`
  - Tests (`src/lib/api.test.ts`): default on; off makes zero `fetch` calls; on sends exactly `{letters, recent, lang, n}` with no passcode; missing value loads as on. _Req 3.1, 3.2, 3.4, 1.2_
- [x] 4. `/api/predict` returns `source` and `provider`
  - Tests (`tests/predict.test.ts`): Groq answer labelled and Gemini not called; Gemini after Groq fails; Gemini when Groq has no key; empty list when both fail; prompt holds only letters, recent and language. _Req 1.5, 2.3, 4.2_
- [x] 5. Morse page and tiles: `Suggestion[]` state, "AI"/"Built-in" label with screen-reader text, fallback note in the list and the empty state. _Req 2.1, 2.2, 3.3, 4.1, 4.4_
- [x] 6. Settings page: toggle, "What is sent to the cloud" panel, other connections; Guide privacy sentence. _Req 1, 3.1, 3.5_
- [x] 7. README "AI used at runtime" section. _Req 5_
- [x] 8. Update `.kiro/steering/structure.md` with `src/lib/suggest.ts` and this spec.
- [x] 9. `npm test` and `npm run typecheck` pass.
