# Design: UI refresh

## Overview
A modern, consistent interface with restrained motion that stays usable for patients who are tired, have
limited vision, or use only blinks. Design tokens are defined once; motion only explains what is happening;
progress indicators keep working under reduced motion.

## Architecture
- Tokens live in the `@theme` block of `src/index.css`; components use only those tokens.
- Motion is CSS only (keyframes and transitions on `transform` and `opacity`), so it never runs in the
  camera frame loop.
- Reduced motion: one rule, written twice: once under `@media (prefers-reduced-motion: reduce)` and once
  under `:root[data-reduce-motion]`. It zeroes animation and transition durations on every element except
  `.motion-progress`. `App` sets `data-reduce-motion` on `<html>` from `settings.reduceMotion`. In JS,
  `motionReduced()` (in `src/lib/motion.ts`) gates smooth scrolling.
- Tailwind does not scan `tests/`, `.kiro/` or `README.md` (`@source not`), so no unused utility classes
  (such as `.transition` or `.backdrop-blur`) reach the build.

Layout:
- **Order:** the DOM order is tracker, then main column, then chart, at every size. The grid only changes
  columns, never order.
  - Morse at `xl`: `[20rem minmax(0,1fr) 17rem]`.
  - Morse at `lg`: tracker and main side by side, chart full width below.
- **Navigation:** a 3-column grid on phones, a single row from `sm`.
- **Overflow:** long words wrap (`min-w-0`, `break-words`).

## Components and Interfaces
- `Button`, `Card`, `Badge`, `Notice`, `Coach`, `PageTitle`: tokens only. The Notice toast is pinned to
  the bottom of the viewport, so it can never cover the blink gauge, and it comes last in the DOM.
- `BlinkGauge` (replaces `BlinkBar`):
  - Static zone track, with labelled ticks at `naturalMax`, `dotMax` and `dashMax`.
  - A fill drawn with `transform: scaleX(closedFor / 3.5)`. It is a `.motion-progress` element.
- `EyeMeter`: the fill uses `scaleX`, and is a `.motion-progress` element.
- `Composer`: each symbol is its own `<span>` in a wrapping flex row, with `.anim-symbol`. The message uses
  `.anim-enter`, either on the last letter alone or on the whole message when a sentence is chosen.
- `Suggestions`: tiles use `.anim-tile` only when no code is in progress. Non-matching tiles switch to muted
  colours instead of opacity.
- `MorseChart`: non-candidates use muted text, not opacity. It has an `id="morse-chart"` anchor.
- Easy tiles: the highlight is an inverse layer that fades and scales in (`transform` and `opacity`). The
  scan bar is driven by `scaleX` keyframes and is a `.motion-progress` element.
- `QuestionCard`: `.anim-slide-in`, placed at the top of the main column. Its column is not the one holding
  the gauge, and on phones it renders below the gauge.

Motion classes: `.anim-enter` (fade + 6 px rise), `.anim-symbol` (scale-in), `.anim-slide-in` (banner),
`.anim-tile` (staggered by `--i`), `.motion-progress` (exempt from reduced motion; carries the transform
transition, with `.motion-progress-slow` for the calibration timer).

## Data Models
| Group | Tokens | Notes |
|---|---|---|
| Neutrals | `bg`, `surface`, `surface-2`, `surface-3`, `line`, `line-strong`, `text`, `muted` | `line` is for decorative dividers; `line-strong` is for interactive borders (3:1 or more) |
| Inverse | `inverse`, `on-inverse`, `on-inverse-muted` | Selected tiles and primary buttons: white with near-black text |
| Accent | `accent`, `accent-tint`, `accent-zone-dot`, `accent-zone-dash` | One blue, used only for dot/dash feedback |
| Status | `ok`, `warn`, `danger`, `on-status`, `ok-tint`, `warn-tint`, `danger-tint` | Each tint is a solid hex (15% over `surface`), so contrast can be computed |
| Focus | `focus` | Used by the global `:focus-visible` outline |
| Type | `--text-xs` … `--text-6xl` | Same values as before, now pinned, so nothing shrinks |
| Spacing | `--spacing: 0.25rem` | Allowed steps: 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12 |
| Radius | `chip`, `control`, `tile`, `card`, `pill` | |
| Shadow | `card`, `raised` | |
| Motion | `--duration-gauge` 90 ms, `--duration-fast` 150 ms, `--duration-base` 220 ms, `--duration-slow` 320 ms, `--stagger-step` 30 ms, `--ease-standard` | All under 400 ms |

Setting: `reduceMotion: boolean` in `Settings`, default `false`, persisted under `dotdash.settings`.

## Correctness Properties

### Property 1: Every token pair meets WCAG AA
Every listed text/background token pair is at least 4.5:1; every boundary, focus and indicator pair is at least 3:1.

_Status: tested._ **Validates: Requirements 2.1, 2.2**

### Property 2: Components use tokens only
Components use no hex, `rgb()` or Tailwind palette colours, no default radii and no partial opacity.

_Status: tested._ **Validates: Requirements 1.2, 2.3**

### Property 3: Motion stays short and cheap
Every motion duration is under 400 ms, the longest tile stagger finishes in 370 ms, and keyframes animate only `transform` and `opacity`.

_Status: tested._ **Validates: Requirements 3.4, 3.8, 8.1**

### Property 4: No distracting or costly effects
No looping animation, no `backdrop-filter`, no `animate-*` utilities, no CSS `order`.

_Status: tested._ **Validates: Requirements 5.1, 5.2, 7.2, 8.3**

### Property 5: Reduced motion keeps progress indicators
Reduced motion exempts `.motion-progress`, in both the media query and the app setting.

_Status: tested._ **Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: It looks and moves right on screen
Layout, smoothness, focus visibility and tab order on a real screen.

_Status: not unit-testable; see the manual checklist._ **Validates: Requirements 6, 7**

## Error Handling
Out of bounds and unchanged: `src/lib/blink.ts`, `morse.ts`, `phrases.ts`, `suggest.ts`, `tracker.tsx`,
`api.ts`, `useQuestion.ts`, and `api/`. A stored `reduceMotion` that is missing or not a boolean loads as
`false`.

## Testing Strategy
- `tests/ui-tokens.test.ts`: token format, contrast pairs, token-only lint, motion limits, reduced-motion
  rule, layout and focus rules, blink-gauge zones.
- `src/lib/settings.test.ts`: `reduceMotion` defaults to off, persists, and is cleared by reset.
- Manual browser checklist: `manual-checklist.md`.
