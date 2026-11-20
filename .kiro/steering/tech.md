---
inclusion: always
---
# Tech stack and conventions

- Vite + React 19 + TypeScript (strict) + Tailwind CSS v4. No router library: hash routing.
- Eye tracking: MediaPipe Face Landmarker (blendshapes `eyeBlinkLeft` / `eyeBlinkRight`),
  WASM served from `/mediapipe-wasm` (copied by `scripts/prepare-assets.mjs`).
- Serverless API in `/api` (Vercel functions): `predict`, `alert`, `ask`.
- Secrets live only in environment variables. See `.env.example`. Never commit `.env`.
- Compare passcodes with a timing-safe comparison. Validate and length-limit all request input.
- Blink and Morse logic is pure TypeScript in `src/lib` and must stay free of React so it can be
  unit tested with Vitest.
- Settings persist in `localStorage` under the `dotdash.` prefix.
- Do not add a dependency when a few lines of code will do.
- API files run as native ES modules on Vercel, one file per function. Relative imports inside
  `api/` must include the `.js` extension (`import { x } from "./_lib.js"`), or the function
  crashes with ERR_MODULE_NOT_FOUND. Keep tests out of `api/` so they are not deployed as functions.
