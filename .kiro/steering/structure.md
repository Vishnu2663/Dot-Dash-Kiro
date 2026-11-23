---
inclusion: always
---
# Project structure

- `src/lib/` pure logic: `blink.ts` (detector + calibration fit), `morse.ts`, `phrases.ts`,
  `settings.ts`, `api.ts`, `audio.ts`, `speech.ts`, `tracker.tsx` (camera + MediaPipe provider),
  `suggest.ts` (suggestion source labels, merge and 9 s cloud-AI fallback), `motion.ts`
  (reduced-motion check and the `data-reduce-motion` switch).
- `src/components/` shared UI (cards, buttons, camera panel, eye meter, blink gauge, Morse chart).
- `src/pages/` one file per route: Home, Morse, Easy, Calibrate, Settings, Caregiver, Guide.
- `api/` serverless functions and `api/_lib.ts` shared helpers.
- `.kiro/specs/dot-dash/` requirements, design and tasks for the whole app.
- `.kiro/specs/ai-transparency/` what leaves the device, suggestion source labels, cloud AI switch.
- `.kiro/specs/provider-health/` failure log lines for `/api/predict`, current default models, suggestion casing.
- `tests/` tests for the `api/` functions (kept out of `api/` so they are not deployed), and
  `ui-tokens.test.ts` (contrast, token-only, motion and layout rules). Unit tests for `src/lib`
  sit next to the code (`*.test.ts`).
- `.kiro/hooks/` automation run during development.
- `.kiro/specs/ui-refresh/` design system, motion rules, reduced motion, layout, manual checklist.

## Design tokens (`src/index.css`, `@theme`)
Defined once there; components use only these (enforced by `tests/ui-tokens.test.ts`). Tailwind
scans app code only: `tests/`, `.kiro/` and `README.md` are excluded with `@source not`.
- **Colour** (six-digit hex):
  - Neutrals: `bg`, `surface`, `surface-2`, `surface-3`, `line` (decorative dividers), `line-strong` (interactive borders), `text`, `muted`.
  - Inverse: `inverse`, `on-inverse`, `on-inverse-muted`.
  - One accent for dot/dash feedback: `accent`, `accent-tint`, `accent-zone-dot`, `accent-zone-dash`.
  - Status, always with text or an icon: `ok`, `warn`, `danger`, `on-status`, `ok-tint`, `warn-tint`, `danger-tint`.
  - `focus`.
- **Type scale:** `text-xs` … `text-6xl`. Patient screens use `text-lg` or larger for body text.
- **Spacing:** `--spacing` 0.25rem. Steps 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12.
- **Radius:** `rounded-chip`, `rounded-control`, `rounded-tile`, `rounded-card`, `rounded-pill`.
- **Shadow:** `shadow-card`, `shadow-raised`.
- **Motion** (`:root`): `--duration-gauge` 90 ms, `--duration-fast` 150 ms, `--duration-base` 220 ms, `--duration-slow` 320 ms, `--stagger-step` 30 ms, `--ease-standard`.
- **Motion classes:** `anim-enter`, `anim-symbol`, `anim-slide-in`, `anim-toast`, `anim-tile` (stagger by `--i`). Animate `transform` and `opacity` only.
- **Progress indicators** carry `motion-progress` (transform transition at `--duration-gauge`; add
  `motion-progress-slow` for `--duration-slow`) and keep moving under reduced motion: the blink gauge,
  eye meter, scan bar and calibration bar.
- **Reduced motion:** `prefers-reduced-motion`, or `data-reduce-motion` on `<html>` (the Settings toggle).
