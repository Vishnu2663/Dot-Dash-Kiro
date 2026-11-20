# Design: Dot-Dash

## Data flow
Webcam -> MediaPipe Face Landmarker (blendshapes) -> mean(eyeBlinkLeft, eyeBlinkRight) ->
`TrackerProvider` fan-out -> `useBlinkInput` -> `BlinkDetector` -> events
(`symbol`, `letter-end`, `word-end`, `sos`) -> page logic (Morse, Easy, Calibrate).

## Modules
- `BlinkDetector`: debounced open/closed state machine (3 frames) producing events from timing.
- `fitTiming`: derives threshold, naturalMax, dotMax, dashMax from calibration samples.
- `TrackerProvider`: owns the hidden `<video>`, camera stream and model; pages subscribe to scores.
  The camera stops when the user leaves a page that needs it.
- Suggestions: local phrase bank answers instantly; `/api/predict` may improve it. Every
  suggestion is filtered to start with the typed letters before it is shown.

## API
| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/predict` | none | up to `n` sentences starting with `letters` (LLM if configured, else empty) |
| `POST /api/alert` | `x-dotdash-key` | Telegram message; SOS limited to 1 per 30 s |
| `POST /api/ask` | `x-dotdash-key` | `get`, `ask`, `answer`, `clear` for the caregiver question |

Question storage: Upstash Redis REST when configured, in-memory otherwise (single instance only).

## Security
Passcode compared with `timingSafeEqual`. Inputs are type-checked and length-limited. Secrets are
environment variables only. Telegram bot token never reaches the client.

## Error handling
Camera denied, no face, too few calibration blinks, alert failures and network errors each show a
specific on-screen message with a next step.
