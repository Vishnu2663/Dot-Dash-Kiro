---
inclusion: always
---
# Project structure

- `src/lib/` pure logic: `blink.ts` (detector + calibration fit), `morse.ts`, `phrases.ts`,
  `settings.ts`, `api.ts`, `audio.ts`, `speech.ts`, `tracker.tsx` (camera + MediaPipe provider).
- `src/components/` shared UI (cards, buttons, camera panel, eye meter, blink bar, Morse chart).
- `src/pages/` one file per route: Home, Morse, Easy, Calibrate, Settings, Caregiver, Guide.
- `api/` serverless functions and `api/_lib.ts` shared helpers.
- `.kiro/specs/dot-dash/` requirements, design and tasks for the whole app.
- `.kiro/hooks/` automation run during development.
