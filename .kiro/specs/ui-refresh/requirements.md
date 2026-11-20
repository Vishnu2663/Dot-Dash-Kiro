# Requirements: UI refresh

## Introduction
A modern, polished interface with restrained motion that does not hurt usability for patients who are
tired, have limited vision, or use only blinks. Builds on the "ui polish" commit (887b83d); stash@{0}
adds nothing beyond HEAD and is not applied.

Out of scope, and unchanged: blink timing, Morse decoding, the caregiver channel, AI suggestion logic,
server code, and `src/lib/blink.ts`, `morse.ts`, `phrases.ts`, `suggest.ts`. No new dependencies.

## Glossary
- **Patient screens**: Morse mode, Easy mode, and the caregiver question banner.
- **Progress indicator**: an element whose motion shows timing: the blink gauge, the eye meter, the Easy
  mode scan bar, and the calibration step bar.
- **Decorative motion**: any other animation or transition.
- **Accent**: the one colour used for dot/dash feedback. **Status colours** (ok, warn, danger) mark state
  and are always paired with text or an icon.

### Requirement 1: Design system
1. The app shall define colour, spacing, radius, shadow, motion and type-scale tokens once, in the `@theme` block of `src/index.css`.
2. Components shall use only those tokens. They shall not use hex or `rgb()` values, or Tailwind palette colours such as `white`, `black` or `neutral-*`.
3. The theme shall be dark by default: black and white, one accent for dot/dash feedback, and status colours for ok, warn and danger.
4. Every colour token shall be a six-digit hex value, so that contrast can be checked automatically.

### Requirement 2: Contrast and size
1. All text shall meet WCAG AA (4.5:1) against its background. Large display text shall be held to the same 4.5:1 bar.
2. Interactive boundaries and progress-indicator marks shall meet 3:1 against their background.
3. The app shall not convey de-emphasis with opacity on text. It shall use the muted text token.
4. Text sizes and target sizes on patient screens shall not be smaller than before this spec.

### Requirement 3: Motion
1. While the eyes are closed, the blink gauge shall fill smoothly, and it shall mark the dot/dash boundary with a labelled tick.
2. When a dot or dash is recognised, the symbol shall appear with a short scale-in.
3. When a letter is added, that letter shall fade in. When a sentence or phrase is chosen, the message shall fade in.
4. When suggestion tiles appear, they shall enter with a short stagger. The whole sequence shall finish within 400 ms.
5. While a dot or dash is being blinked, suggestion tiles shall not animate.
6. In Easy mode, the scan highlight shall move clearly from tile to tile.
7. When a caregiver question arrives, the banner shall slide in. It shall not cover or move the blink gauge.
8. Every decorative animation shall last under 400 ms. Progress indicators are exempt.
9. Animation shall use CSS only. No animation library shall be added.

### Requirement 4: Reduced motion
1. While the operating system prefers reduced motion, decorative motion shall stop.
2. While "Reduce motion" is on in Settings, decorative motion shall stop.
3. While either is active, progress indicators shall keep working.
4. The "Reduce motion" setting shall persist under the `dotdash.` prefix, shall default to off, and shall be turned off by Reset to defaults.

### Requirement 5: Safe motion
1. Nothing shall flash more than 3 times per second.
2. Nothing shall animate in a way that could be mistaken for a blink cue. That rules out pulsing, blinking cursors and looping animations.
3. The Morse and Easy mode screens shall have no parallax, no flashing and no motion that plays on its own, other than the progress indicators.

### Requirement 6: Layout
1. The layout shall work from 360 px wide up to wide desktops, with no horizontal scrolling on any page.
2. Navigation shall wrap instead of scrolling sideways.
3. On small screens, Morse mode shall offer a link that jumps to the Morse chart.
4. All pages shall use the same card component and spacing tokens.

### Requirement 7: Focus and keyboard
1. Every interactive element shall show a visible focus outline that uses the focus token and has at least 3:1 contrast.
2. The tab order shall match the visual order at every breakpoint. CSS `order` shall not be used to reorder content.

### Requirement 8: Performance
1. Animated properties shall be `transform` and `opacity` only.
2. The app shall not use JavaScript animation loops. Animations shall be CSS, so they stay off the camera frame loop.
3. The app shall not use `backdrop-filter`.
4. The redesign shall not change the camera or blink-detection code.
