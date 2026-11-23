# Design: AI transparency

## Overview
Show users and judges exactly what leaves the device for sentence suggestions, label each suggestion "AI"
or "Built-in", let the user turn cloud AI off, and fall back to built-in phrases within 9 s.

## Architecture
1. 2+ letters typed: show `builtInSuggestions` at once.
2. If `cloudAi` is on: `improveSuggestions` runs. On "ai" the merged list replaces the built-in one. On
   "fallback" the built-in list stays and the note shows.
3. If `cloudAi` is off: step 2 is skipped. There is no loading text and no note.
4. A newer request makes older responses stale (`requestId`), so a late answer never overwrites them.

The client limit is 9 s. The worst case on the server is two providers at 6 s each, so the client timer
is the authority.

## Components and Interfaces
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
- `api/predict.ts`: tags results with `source` and `provider`.
- UI: `SettingsPage` (toggle and panel), `MorseParts.Suggestions` (label, fallback note in both the list and
  the empty state), `Morse` (state holds `Suggestion[]`; picks use `.text`).

## Data Models
```ts
type SuggestionSource = "ai" | "built-in";
interface Suggestion { text: string; source: SuggestionSource; provider?: "groq" | "gemini" }
```
`POST /api/predict` returns `{ suggestions: Suggestion[] }`. Each entry has `source: "ai"` and the provider
that answered. With no keys, or when both providers fail, it returns `{ suggestions: [] }`.

What is sent (verified in code):
- Browser to `/api/predict` (`src/lib/api.ts`): `letters`, `recent`, `lang`, `n`. No passcode header.
- Server limits (`api/predict.ts`): letters 60 chars, recent 5 × 120 chars, `n` clamped to 1..8,
  unknown `lang` treated as English. Other body fields are ignored.
- Server to provider: one prompt built from those fields only.
- Recent sentences come from `pushRecent` in `src/pages/Morse.tsx` (picked suggestion, quick phrase,
  `• — • —`). Easy mode and the Speak button do not add to them.
- The camera is opened with `audio: false` (`src/lib/tracker.tsx`).

Other connections (shown in the panel, unaffected by the setting):
- Face model: `storage.googleapis.com` (`src/lib/tracker.tsx`).
- `/api/alert` to Telegram; the SOS text is fixed (`api/alert.ts`).
- `/api/ask` for caregiver questions; Upstash Redis when configured (`api/_lib.ts`).

## Correctness Properties

### Property 1: The off switch sends nothing
While cloud AI is off, no request is made to `/api/predict`.

_Status: tested._ **Validates: Requirements 3.2**

### Property 2: The request carries only the listed fields
The request body holds only `letters`, `recent`, `lang` and `n`, with no passcode.

_Status: tested._ **Validates: Requirements 1.2, 1.3**

### Property 3: Labels come from the server
A sentence is labelled "AI" only when the server marked it `source: "ai"`; a duplicate shows once, as AI.

_Status: tested._ **Validates: Requirements 2.3, 2.4**

### Property 4: Fallback happens at 9 s, not before
With no usable answer within 9 000 ms, the result is the built-in list and the request is aborted; it is not decided before 9 000 ms.

_Status: tested with fake timers._ **Validates: Requirements 4.2, 4.3**

### Property 5: Suggestions match the typed letters
Every suggestion starts with the typed letters.

_Status: tested._ **Validates: Requirements 4.5**

## Error Handling
Network errors, non-2xx responses, malformed payloads and timeouts all become outcome "fallback": the
built-in list stays and the calm note "Using built-in suggestions for now." is announced politely.

Not claimed: provider-side retention, model speed, and whether the browser's speech voice is synthesised
locally or by an online service. None of these can be verified from this repo. One exception, attributed to
Google's pricing page: the free-tier sentence about Google using content sent to Gemini (see provider-health).

## Testing Strategy
- `src/lib/suggest.test.ts`: labels, `parseRemote`, merge order and dedup, and fallback timing with fake
  timers. The timer uses `setTimeout` (not `AbortSignal.timeout`) so fake timers can check the exact
  boundary.
- `src/lib/api.test.ts`: the cloud AI switch makes zero `fetch` calls when off; the request body when on.
- `tests/predict.test.ts`: provider order, source labels, prompt contents.
- The Settings panel text and tile labels are checked by hand in a browser.
