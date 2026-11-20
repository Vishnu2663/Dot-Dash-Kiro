# Design: AI transparency

## Data
```ts
type SuggestionSource = "ai" | "built-in";
interface Suggestion { text: string; source: SuggestionSource; provider?: "groq" | "gemini" }
```
`POST /api/predict` returns `{ suggestions: Suggestion[] }`. Each entry has `source: "ai"` and the provider
that answered. With no keys, or when both providers fail, it returns `{ suggestions: [] }`.

## Modules
- `src/lib/suggest.ts` (pure: no React, no `fetch`):
  - `builtInSuggestions(typed, n)`: built-in matches, labelled `built-in`.
  - `parseRemote(data)`: validates the server payload; keeps only entries marked `source: "ai"`.
  - `mergeSuggestions(typed, remote, n)`: AI first, then built-in; drops anything that does not start
    with the typed letters; removes case-insensitive duplicates, keeping the AI copy.
  - `improveSuggestions({ typed, n, fetchRemote, timeoutMs = 9000 })`: never rejects. Races the injected
    `fetchRemote(signal)` against a `setTimeout`. On timeout it aborts the signal. Returns
    `{ suggestions, outcome: "ai" | "fallback" }`; "fallback" when nothing usable arrived.
- `src/lib/api.ts`: `fetchSuggestions(letters, recent, lang, n, signal?)` returns `null` without calling
  `fetch` when `loadSettings().cloudAi` is false. The gate lives here, below the UI, so no caller can
  bypass it. It sends no passcode header.
- `src/lib/settings.ts`: `cloudAi: boolean`, default `true`; a missing stored value loads as `true`.
- `api/predict.ts`: tags results with `source` and `provider`. Provider order, prompt, per-provider
  timeouts and input limits are unchanged.
- UI: `SettingsPage` (toggle and panel), `MorseParts.Suggestions` (label, fallback note in both the list and
  the empty state), `Morse` (state holds `Suggestion[]`; picks use `.text`).

## Flow
1. 2+ letters typed: show `builtInSuggestions` at once.
2. If `cloudAi` is on: `improveSuggestions` runs. On "ai" the merged list replaces the built-in one. On
   "fallback" the built-in list stays and the note shows.
3. If `cloudAi` is off: step 2 is skipped. There is no loading text and no note.
4. A newer request makes older responses stale (`requestId`), so a late answer never overwrites them.

## Timing
The client limit is 9 s. The worst case on the server is two providers at 6 s each, so the client timer
is the authority. The timer uses `setTimeout` (not `AbortSignal.timeout`) so Vitest fake timers can
check the exact boundary: not done at 8 999 ms, fallen back and aborted at 9 000 ms.

## What is sent (verified in code)
- Browser to `/api/predict` (`src/lib/api.ts`): `letters`, `recent`, `lang`, `n`. No passcode header.
- Server limits (`api/predict.ts`): letters 60 chars, recent 5 × 120 chars, `n` clamped to 1..8,
  unknown `lang` treated as English. Other body fields are ignored.
- Server to provider: one prompt built from those fields only.
- Recent sentences come from `pushRecent` in `src/pages/Morse.tsx` (picked suggestion, quick phrase,
  `• — • —`). Easy mode and the Speak button do not add to them.
- The camera is opened with `audio: false` (`src/lib/tracker.tsx`).

## Other connections (shown in the panel, unaffected by the setting)
- Face model: `storage.googleapis.com` (`src/lib/tracker.tsx`).
- `/api/alert` to Telegram; the SOS text is fixed (`api/alert.ts`).
- `/api/ask` for caregiver questions; Upstash Redis when configured (`api/_lib.ts`).

## Not claimed
Provider-side retention, model speed, and whether the browser's speech voice is synthesised locally or by
an online service. None of these can be verified from this repo.

One exception, attributed to Google's pricing page: the free-tier sentence about Google using content sent to Gemini (see provider-health).
