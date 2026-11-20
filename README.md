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

The app works with no configuration: Easy mode, Morse mode, calibration and spoken output need no server. Everything below is optional, and each feature turns on only when its variables are set. Put them in a local `.env` file (git-ignored, never committed). On Vercel, add the same names under Project Settings > Environment Variables. No `.env.example` file is in the repo, so this table is the list of names.

| Variable | What it is for | Needed for |
|---|---|---|
| `ALERT_PASSCODE` | Passcode the caregiver types into Settings. Without it, `/api/alert` and `/api/ask` reject every request. | Alerts and caregiver questions (required for those features) |
| `TELEGRAM_BOT_TOKEN` | Lets the server send Telegram messages as your bot. | Alerts (required for that feature) |
| `TELEGRAM_CHAT_ID` | The chat that receives alerts. If empty, the chat that last sent `/start` to the bot is used. | Optional |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shares the caregiver question between two devices. Without them, one server instance holds it in memory. | Optional |
| `GROQ_API_KEY` | Groq, tried first for sentence suggestions. | Optional. With neither AI key, built-in phrases are used. |
| `GEMINI_API_KEY` | Google Gemini, tried only if Groq is not configured, fails, or returns nothing usable. Leave it unset to turn Gemini off. | Optional |
| `GROQ_MODEL`, `GEMINI_MODEL` | Replace the default models (`openai/gpt-oss-20b` and `gemini-3.6-flash`). | Optional |

To run the API locally, use `npx vercel dev`. To deploy, import the repo into Vercel and set the variables above.

## Notice for judges: external services and why
No `.env` or `.env.example` file is committed (both are git-ignored). Every key is read from `process.env` on the server (Vercel functions in `api/`) and never reaches the browser. The core app (blink detection, Morse, Easy mode, speech) works with none of these.

| Service | Variable(s) | Why we use it |
|---|---|---|
| **Groq** | `GROQ_API_KEY` | First choice for sentence suggestions (default model `openai/gpt-oss-20b`, replaceable with `GROQ_MODEL`). Note: this is Groq, the inference provider, not xAI's Grok. |
| **Google Gemini** | `GEMINI_API_KEY` | Fallback if Groq fails or is not configured (default model `gemini-3.6-flash`, replaceable with `GEMINI_MODEL`; leave the key unset to turn Gemini off). Suggestions are filtered to start with the letters the patient spelled, and nothing is chosen automatically. |
| **Telegram Bot API** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Sends the emergency alert (eyes closed 3 s, or spelling `HELP`) to a caregiver's phone. The token lets the server post as our bot. The chat id is the caregiver's chat that receives it. If it is empty, the chat that last sent `/start` is used. |
| Alert passcode | `ALERT_PASSCODE` | Stops strangers from triggering alerts or asking caregiver questions. Checked with a timing-safe compare. |
| Upstash Redis (optional) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shares caregiver questions across two devices. |

Only the data listed under "AI used at runtime" goes to Groq or Gemini. Video and camera frames are never sent anywhere.

## AI used at runtime
Cloud AI is used for one thing: suggesting sentences that start with the letters a patient has spelled. Blink detection, Morse decoding, speech and alerts do not use it.
**Services.** The browser calls this app's own `POST /api/predict` (a Vercel function). That function asks **Groq** (default model `openai/gpt-oss-20b`) first and **Google Gemini** (default model `gemini-3.6-flash`) only if Groq is not configured, fails, or returns nothing usable. Both defaults can be replaced with `GROQ_MODEL` and `GEMINI_MODEL`. Leaving `GEMINI_API_KEY` unset turns Gemini off.
**What they receive.** One text prompt built from: the letters typed so far (up to 60 characters), up to 5 sentences recently said in Morse mode, meaning a picked suggestion, a quick phrase or a message spoken with `• — • —` (up to 120 characters each), the language (English, Hindi or Kannada), and how many sentences to return. Nothing else is in the request: no video, camera images, audio (the camera is opened with audio off) or alert passcode. Other body fields are ignored by the server. The app has no name or profile field, but letters and recent sentences are sent as typed, so a spelled name would be sent. On Google's free tier, Google may use content sent to Gemini to improve its products. (Source: [Google's Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing).) We make no other claim about how Groq or Google store or use the text; see their own policies.
**When suggestions only say "Built-in".** Check model retirement first: providers retire model ids, and requests to a retired id fail. Compare the defaults above with the [Groq deprecations](https://console.groq.com/docs/deprecations) and [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations) pages, and set `GROQ_MODEL` or `GEMINI_MODEL` to a current model if needed. Then read the function's runtime logs in Vercel. Each failed provider call writes one line, for example `[predict] provider=groq status=404 reason=bad-status`:
- `reason=missing-key`: that provider's key is not set for this deployment.
- `reason=bad-status`: the provider refused the request. `status` is its HTTP status. A 404 usually means the model id is not available to your account (for example, retired), 401 or 403 a key problem, and 429 a rate or quota limit.
- `reason=timeout`: no answer within 6 seconds.
- `reason=network-error`: the request did not reach the provider.
- `reason=unparseable-reply`: the provider answered, but not with a list of sentences.

The line never contains keys, typed letters, sentences or the provider's reply.
**Labels.** Every suggestion tile says "AI" or "Built-in". The server marks AI sentences in its response, and the app never labels a sentence "AI" on its own.
**Off switch.** Settings > "Use cloud AI for suggestions" (on by default). When off, the app sends no request to `/api/predict` and uses only built-in phrases. Unit tests check that no `fetch` happens when it is off, and that the request body holds only those four fields when it is on.
**If they are down.** Groq is tried, then Gemini (6 s limit for each). If neither answers, a provider is not configured, or nothing usable arrives within 9 s, the app keeps the built-in phrases, which are shown instantly before any cloud answer, and shows the note "Using built-in suggestions for now." Every suggestion, from either source, must start with the typed letters, and nothing is chosen without a blink.
**Spoken output.** Speech uses the browser's built-in speech synthesis, not Groq or Gemini. Depending on your browser and the voice you choose, spoken text may be processed by an online voice service. Choose an offline voice in your system settings if you want to avoid that.
**Kiro.** Kiro was used to build this app. Kiro is not part of the running app. The specs, steering and hooks in `.kiro/` show how.

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
