# Design: Dot-Dash

## Overview
Dot-Dash turns eye blinks into Morse code, text and speech in the browser. A webcam feeds MediaPipe Face
Landmarker; blink timing becomes dots, dashes, letters and words; the message is spoken aloud. A caregiver
can receive emergency alerts and ask yes/no questions. Video never leaves the device.

## Architecture
Webcam -> MediaPipe Face Landmarker (blendshapes) -> mean(eyeBlinkLeft, eyeBlinkRight) ->
`TrackerProvider` fan-out -> `useBlinkInput` -> `BlinkDetector` -> events
(`symbol`, `letter-end`, `word-end`, `sos`) -> page logic (Morse, Easy, Calibrate).

- Frontend: Vite, React, TypeScript, Tailwind. Hash routing; one page per route.
- Server: three Vercel functions in `api/` (table below). The app works without them, except alerts,
  caregiver questions and cloud suggestions.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/predict` | none | up to `n` sentences starting with `letters` (LLM if configured, else empty) |
| `POST /api/alert` | `x-dotdash-key` | Telegram message; SOS limited to 1 per 30 s |
| `POST /api/ask` | `x-dotdash-key` | `get`, `ask`, `answer`, `clear` for the caregiver question |

Question storage: Upstash Redis REST when configured, in-memory otherwise (single instance only).

## Components and Interfaces
- `BlinkDetector` (`src/lib/blink.ts`): debounced open/closed state machine (3 frames). `update(score, t)`
  returns the events produced by that frame.
- `fitTiming` (`src/lib/blink.ts`): derives threshold, naturalMax, dotMax, dashMax from calibration samples.
- `TrackerProvider` / `useBlinkInput` (`src/lib/tracker.tsx`): owns the hidden `<video>`, camera stream and
  model; pages subscribe to scores. The camera stops when the user leaves a page that needs it.
- Morse (`src/lib/morse.ts`): `decode`, `applyDecoded`, `lookahead`, `endsWithHelp`, `answerFor`.
- Phrases (`src/lib/phrases.ts`): Easy mode options, quick phrases, built-in sentence bank,
  `startsWithLetters`.
- Suggestions: the local phrase bank answers instantly; `/api/predict` may improve it. Every suggestion is
  filtered to start with the typed letters before it is shown.
- API client (`src/lib/api.ts`): `fetchSuggestions`, `sendAlert`, `askApi`.

## Data Models
- `Timing`: `threshold`, `naturalMax` (0.4 s), `dotMax` (1 s), `dashMax` (3 s), `letterGap` (1.5 s),
  `wordGap` (3 s), `debounceFrames` (3).
- `BlinkEvent`: `{ type: "symbol", symbol: "." | "-" }`, `letter-end`, `word-end`, `sos`.
- `Settings` (`localStorage` key `dotdash.settings`): `timing`, `lang` (`en`, `hi`, `kn`), `calibrated`,
  `passcode`, `scanMs` (1500–4000), `sound`. Later specs add `cloudAi` and `reduceMotion`.
- Recent sentences: up to 5 strings under `dotdash.recent`.
- `Question`: `id`, `text` (up to 120 chars), `askedAt`, `answer` (`yes`, `no` or null), `answeredAt`.

## Correctness Properties

### Property 1: Blink length maps to the right symbol
A closure shorter than `naturalMax` produces no event; between `naturalMax` and `dotMax` it produces a dot; from `dotMax` up to `dashMax` it produces a dash.

_Status: tested._ **Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Letters and words end on time
Open eyes for `letterGap` after a symbol produce exactly one `letter-end`; `wordGap` more produces one `word-end`.

_Status: tested._ **Validates: Requirements 1.4**

### Property 3: Long closure is SOS, not a symbol
Eyes closed past `dashMax` produce one `sos` and no symbol when they open.

_Status: tested._ **Validates: Requirements 5.1**

### Property 4: State changes are debounced
A change between open and closed needs `debounceFrames` consecutive frames.

_Status: tested._ **Validates: Requirements 1.1**

### Property 5: Quick phrases never collide with letters
No quick-phrase pattern is a letter or a control code.

_Status: tested._ **Validates: Requirements 3.4**

### Property 6: Suggestions match the typed letters
Every suggestion shown starts with the typed letters, and nothing is chosen without a blink or tap.

_Status: filtering tested; choosing is UI behaviour, not unit-tested._ **Validates: Requirements 3.3**

### Property 7: Alerts are rate-limited and protected
At most one SOS alert per 30 s, on client and server; protected endpoints compare the passcode with `timingSafeEqual`.

_Status: in code; not covered by unit tests._ **Validates: Requirements 5.2**

## Error Handling
Camera denied, no face, too few calibration blinks, alert failures and network errors each show a
specific on-screen message with a next step.

Security: inputs are type-checked and length-limited. Secrets are environment variables only. The
Telegram bot token never reaches the client.

## Testing Strategy
- Unit tests (Vitest) for the pure logic in `src/lib/logic.test.ts`: detector timing, debounce, SOS,
  `fitTiming`, Morse decoding, quick phrases, suggestion matching and merging.
- `/api/predict` is tested in `tests/` with mocked `fetch` (see the ai-transparency and
  provider-health specs). `/api/alert` and `/api/ask` have no unit tests.
- Camera, MediaPipe and speech need a real browser and are checked by hand.
