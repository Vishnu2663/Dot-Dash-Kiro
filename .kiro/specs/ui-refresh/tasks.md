# Tasks: UI refresh

Each task ends with `npm run typecheck` and `npm test` before the next one starts, and is committed on its own.

- [x] a. Design tokens and base styles in `src/index.css`. Remove the unused polish effects (aurora, glows, gradient text, glass, shimmer, glow-pulse, stagger, view-transition CSS). Add the reduced-motion rule and the motion classes. Document the tokens in `.kiro/steering/structure.md`. _Req 1, 4.1, 5, 8.1, 8.3_
- [x] b. Shared components: Button, Card, Badge, Coach, Notice, PageTitle, input style; BlinkGauge; EyeMeter; CameraPanel. Tokens only, transform/opacity only. _Req 1.2, 2, 3.1, 7.1, 8_
- [x] c. Navigation and layout shell: wrapping nav, solid header, logo using tokens, footer, skip link. _Req 6.1, 6.2, 7_
- [x] d. Home and Guide pages on tokens. _Req 1.2, 6.4_
- [x] e. Morse and Easy mode screens:
  - **Morse:** DOM order matches the visual order; symbol scale-in; letter and sentence fade-in; staggered tiles; question banner placement; muted non-matches; chart anchor.
  - **Easy:** clear scan highlight; `scaleX` scan bar.
  - **Calibrate:** progress bar on `scaleX`.

  _Req 2, 3, 5, 6, 7.2_
- [x] f. Settings and Caregiver pages on tokens; the "Reduce motion" toggle (setting, persistence, reset, `data-reduce-motion`); `motionReduced()` for smooth scrolling. _Req 4_
- [x] g. Accessibility pass: `tests/ui-tokens.test.ts` (contrast pairs, token-only lint, motion limits). _Req 1.4, 2.1, 2.2, 3.8, 5, 8.1, 8.3_
- [x] h. Manual browser checklist `manual-checklist.md`. _All_
