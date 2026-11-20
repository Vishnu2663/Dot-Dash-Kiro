# Design: UI refresh

## Tokens (`src/index.css`, `@theme`)
| Group | Tokens | Notes |
|---|---|---|
| Neutrals | `bg`, `surface`, `surface-2`, `surface-3`, `line`, `line-strong`, `text`, `muted` | `line` is for decorative dividers; `line-strong` is for interactive borders (3:1 or more) |
| Inverse | `inverse`, `on-inverse`, `on-inverse-muted` | Selected tiles and primary buttons: white with near-black text |
| Accent | `accent`, `accent-tint`, `accent-zone-dot`, `accent-zone-dash` | One blue, used only for dot/dash feedback |
| Status | `ok`, `warn`, `danger`, `on-status`, `ok-tint`, `warn-tint`, `danger-tint` | Each tint is a solid hex (15% over `surface`), so contrast can be computed |
| Focus | `focus` | Used by the global `:focus-visible` outline |
| Type | `--text-xs` … `--text-6xl` | Same values as before, now pinned, so nothing shrinks |
| Spacing | `--spacing: 0.25rem` | Allowed steps: 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12 |
| Radius | `control`, `tile`, `card`, `pill` | |
| Shadow | `card`, `raised` | |
| Motion | `--duration-gauge` 90 ms, `--duration-fast` 150 ms, `--duration-base` 220 ms, `--duration-slow` 320 ms, `--stagger-step` 30 ms, `--ease-standard` | All under 400 ms |

## Motion classes
`.anim-enter` (fade + 6 px rise), `.anim-symbol` (scale-in), `.anim-slide-in` (banner), `.anim-tile` (staggered
by `--i`), `.motion-progress` (exempt from reduced motion). Keyframes use `transform` and `opacity` only.

## Reduced motion
One rule, written twice: once under `@media (prefers-reduced-motion: reduce)` and once under
`:root[data-reduce-motion]`. It zeroes animation and transition durations on every element except
`.motion-progress`. `App` sets `data-reduce-motion` on `<html>` from `settings.reduceMotion`. In JS,
`motionReduced()` (in `src/lib/motion.ts`) gates smooth scrolling.

## Components
- `Button`, `Card`, `Badge`, `Notice`, `Coach`, `PageTitle`: tokens only. The Notice toast is pinned to
  the bottom of the viewport, so it can never cover the blink gauge, and it comes last in the DOM.
- `BlinkGauge` (replaces `BlinkBar`):
  - Static zone track, with labelled ticks at `naturalMax`, `dotMax` and `dashMax`.
  - A fill drawn with `transform: scaleX(closedFor / 3.5)`, using `--duration-gauge` linear. It is a `.motion-progress` element.
- `EyeMeter`: the fill uses `scaleX`, and is a `.motion-progress` element.
- `Composer`: each symbol is its own `<span>` in a wrapping flex row, with `.anim-symbol`. The message uses `.anim-enter`, either on the last letter alone or on the whole message when a sentence is chosen.
- `Suggestions`: tiles use `.anim-tile` only when no code is in progress. Non-matching tiles switch to muted colours instead of opacity.
- `MorseChart`: non-candidates use muted text, not opacity. It has an `id="morse-chart"` anchor.
- Easy tiles: the highlight is an inverse layer that fades and scales in (`transform` and `opacity`). The scan bar is driven by `scaleX` keyframes and is a `.motion-progress` element.
- `QuestionCard`: `.anim-slide-in`, placed at the top of the main column. Its column is not the one holding the gauge, and on phones it renders below the gauge.

## Layout
- **Order:** the DOM order is tracker, then main column, then chart, at every size. The grid only changes columns, never order.
  - Morse at `xl`: `[21rem 1fr 17rem]`.
  - Morse at `lg`: tracker and main side by side, chart full width below.
- **Navigation:** a 3-column grid on phones, a single row from `sm`.
- **Overflow:** long words wrap (`min-w-0`, `break-words`).

## Out of bounds
Unchanged: `src/lib/blink.ts`, `morse.ts`, `phrases.ts`, `suggest.ts`, `tracker.tsx`, `api.ts`, `useQuestion.ts`, and `api/`.

## Verification
- `tests/ui-tokens.test.ts`:
  - Every colour token is six-digit hex.
  - Each listed colour pair meets AA (4.5:1 for text, 3:1 for boundaries and marks).
  - No raw or palette colours appear in `src/**/*.tsx`.
  - No `animate-*` utilities, no `order-*`, no `backdrop-blur`.
  - Every motion duration token is under 400 ms.
  - Keyframes animate only `transform` and `opacity`.
- `src/lib/settings` test: `reduceMotion` defaults to off, persists, and is cleared by reset.
- Manual browser checklist: `manual-checklist.md`.
