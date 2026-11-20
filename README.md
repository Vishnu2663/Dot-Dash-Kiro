# Dot-Dash

**Talk with your eyes.** Dot-Dash turns eye blinks into Morse code, suggests sentences that start with the letters you spelled, and speaks them aloud. It runs in the browser. Video never leaves the device.

> Built with [Kiro](https://kiro.dev) for the **Kiroween** hackathon, in the **Resurrection** category: Morse code is a retired technology, and Dot-Dash brings it back as an assistive interface for people who cannot speak or use their hands (ALS, stroke, ICU, locked-in syndrome).

## What it does

| Feature | How it works |
|---|---|
| **Blink to Morse** | A short blink (0.4 – 1 s) is a dot, a long blink (1 – 3 s) is a dash. Open your eyes for 1.5 s to finish a letter, 3 s more for a new word. |
| **Calibration** | A one-minute guided flow (eyes open, eyes closed, 3 short blinks, 3 long blinks) fits the thresholds to the user. |
| **Morse mode** | Live chart, "could become" letters, delete (`• • — —`), speak (`• — • —`), numbered sentence suggestions chosen by blinking the number in Morse. Nothing is ever chosen automatically. |
| **Quick phrases** | One pattern speaks Water, Toilet, Pain, Turn me, Nurse, Yes or No. None of the patterns is a letter. |
| **Easy mode** | A highlight scans Water, Pain, Toilet, Turn me, Call nurse, Yes, No. One blink picks the highlighted option. |
| **Emergency alert** | Eyes closed 3 s, or spelling `HELP`, sends a Telegram alert. One alert per 30 s, enforced on client and server. |
| **Caregiver questions** | A caregiver asks a yes/no question from another device. The patient answers with one short (yes) or long (no) blink. |
| **Settings** | Sensitivity, scan speed, language (English, Hindi, Kannada), sound cues, passcode, reset. |

## Architecture

```
Webcam -> MediaPipe Face Landmarker (eyeBlinkLeft/Right) -> BlinkDetector -> Morse / Easy / Calibrate
                                                                      |
                                              Vercel functions: /api/predict  /api/alert  /api/ask
```

- Frontend: Vite, React 19, TypeScript (strict), Tailwind CSS v4.
- Eye tracking runs fully client-side. The MediaPipe WASM runtime is served from this app; only the model file is fetched from Google Cloud Storage.
- Pure logic (`src/lib/blink.ts`, `morse.ts`, `phrases.ts`) has unit tests.
- Serverless API in `api/`: passcode checked with a timing-safe compare, inputs validated and length-limited, secrets only in environment variables.

## Run it

Requires Node 20+ and Chrome (camera access needs `localhost` or HTTPS).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type-check and production build
```

The app works with no configuration: Easy mode, Morse mode, calibration and spoken output need no server. The optional features need environment variables (see `.env.example`):

| Variable | Enables |
|---|---|
| `ALERT_PASSCODE` | Required for alerts and caregiver questions. The caregiver types it into Settings. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram alerts. If the chat id is empty, the chat that last sent `/start` to the bot is used. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shares caregiver questions between two devices. Without it, one server instance holds them in memory. |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Smarter sentence suggestions from any OpenAI-compatible endpoint. Without it, a built-in phrase bank is used. |

To run the API locally, use `npx vercel dev`. To deploy, import the repo into Vercel and set the variables above.

## How Kiro was used

Everything in this repo was built in Kiro. The `.kiro/` directory is committed so the process can be inspected.

- **Spec-driven development** (`.kiro/specs/dot-dash/`): `requirements.md` (user stories with EARS-style acceptance criteria for blink timing, calibration, Morse, Easy mode, alerts, caregiver questions), `design.md` (data flow, modules, API, security) and `tasks.md` (the implementation plan that was followed in order).
- **Steering docs** (`.kiro/steering/`): `product.md` (privacy, safety and accessibility principles), `tech.md` (stack and conventions, secrets handling), `structure.md` (where code lives). They kept generated code consistent across sessions, for example logic stays free of React so it can be tested.
- **Agent hooks** (`.kiro/hooks/`): one runs the unit tests when blink, Morse or phrase logic is saved, so timing rules cannot regress. The other checks edited source files for hard-coded secrets.
- **Vibe coding**: used for the UI pages and for iterating on the calibration and blink-timing behaviour.

## Privacy and safety

- Video is analysed in the browser and is never uploaded or stored.
- Settings and the passcode stay in `localStorage` on the device.
- Dot-Dash is an assistive tool, not a medical device. Keep another way to call for help nearby.

## License

[MIT](LICENSE)
