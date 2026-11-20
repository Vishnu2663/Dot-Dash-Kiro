# Manual browser checklist: UI refresh

Nobody has looked at this redesign in a browser yet. These checks cover what the automated tests can't see.

**Setup.** Run `npm run dev` and open http://localhost:5173 in Chrome (the camera works on localhost). For
the "before" comparison, use the deployed site https://dot-dash-kiro.vercel.app, which still runs the
pre-refresh UI. Tick each box, or note what you saw.

## 1. Widths and horizontal scrolling (Req 6)
In DevTools, open the device toolbar and test **360**, **768**, **1024**, **1280** and **1920** px wide, on every page:
Home, Morse, Easy mode, Caregiver, Guide, Settings and Calibrate.
- [ ] No horizontal scrollbar on any page, at any width. Swipe sideways on a phone or touch emulator; nothing should move.
- [ ] 360 px:
  - [ ] The navigation shows as 3 × 2 buttons.
  - [ ] The header is not stuck to the top.
  - [ ] Nothing is cut off.
- [ ] Morse, while blinking a long code such as `.-.-.-` (Nurse): the dots and dashes wrap onto a second line instead of running off-screen.
- [ ] Morse at 360 px with a long suggestion (spell `IW`, look for "I want to watch television."): the text wraps inside the tile.
- [ ] Morse below 1280 px: "Morse chart ↓" scrolls to the chart and does **not** take you to Home.
- [ ] Morse at 1280 px and up: three columns, from left to right camera/gauge, message, chart.

## 2. Contrast and size (Req 2)
- [ ] Nothing on the Morse, Easy and question-banner screens looks smaller than on the deployed site. Compare side by side at the same width.
- [ ] Letters in the Morse chart that the current code can no longer become are grey but easy to read, not faded.
- [ ] In the browser zoom menu, set 200%: text reflows and nothing overlaps or gets cut off.
- [ ] Optional: run DevTools Lighthouse, Accessibility. Note any contrast failures.

## 3. Motion (Req 3, 5)
- [ ] **Blink gauge:**
  - [ ] Close your eyes: the blue fill grows smoothly from the left.
  - [ ] "• dot | dash —" sits above the thicker tick, which is the dot/dash boundary.
  - [ ] The ticks stay visible when the fill passes over them.
  - [ ] Past 3 s, the fill turns red.
- [ ] **Symbols:** each new dot or dash pops in quickly. Earlier symbols don't move.
- [ ] **Letters:** when a letter appears in "Your message", only that letter fades in.
- [ ] **Sentences:** when you pick a sentence (blink its number, or click it), the whole message fades in once.
- [ ] **Suggestion tiles:** they slide in one after another, all done in well under half a second.
  - [ ] While you are blinking a code, tiles don't re-animate.
  - [ ] When a letter ends, tiles that were already showing don't replay their animation.
- [ ] **Easy mode:**
  - [ ] The white highlight visibly moves from tile to tile.
  - [ ] The bar along the bottom of the active tile fills across, once per tile.
  - [ ] Text in the active tile is black on white straight away, never faint mid-change.
- [ ] **Question banner:** in a second window, open Caregiver, enter the passcode and ask a question.
  - [ ] On Morse, the banner slides in at the top of the message column.
  - [ ] The camera and blink gauge don't move, and aren't covered (check at both 360 px and desktop).
- [ ] **Toasts:** alerts and answers appear at the **bottom** of the screen and never cover the gauge.
- [ ] **No distracting motion:**
  - [ ] Nothing flashes.
  - [ ] Nothing pulses or loops on the Morse or Easy screens.
  - [ ] The message caret is a still bar, not blinking.

## 4. Reduced motion (Req 4)
- [ ] Settings, turn "Reduce motion" on:
  - [ ] Symbols, letters, tiles and the banner appear with no animation.
  - [ ] The **blink gauge still fills**, and the **Easy mode scan bar still runs**.
- [ ] Reload the page: "Reduce motion" is still on.
- [ ] Reset to defaults: "Reduce motion" is off again, and the alert passcode is kept.
- [ ] With the app setting off, turn on the OS setting (macOS: System Settings → Accessibility → Display → Reduce motion). The same thing happens: decorative motion stops, and the gauge and scan bar keep working.

## 5. Focus and keyboard (Req 7)
- [ ] Press Tab from the top of each page.
  - [ ] Every button, link, input and tile shows a clear white outline with a dark gap, including white buttons.
- [ ] Tab order follows what you see.
  - [ ] Header, nav, then the page.
  - [ ] Morse: camera/gauge area, then message buttons, then suggestions, then the chart, at 360 px **and** at 1280 px.
- [ ] Text inputs (Caregiver question, Settings passcode) show the same white outline when focused.
- [ ] "Skip to content" appears on the first Tab and jumps to the page.

## 6. Performance (Req 8)
- [ ] **Smoothness:** in DevTools, open More tools → Rendering and tick **Frame Rendering Stats**. On Morse, blink normally for 30 s; the frame rate stays steady. Compare it with the deployed site.
- [ ] **No long tasks:** DevTools → Performance → Record for about 10 s while blinking. Main-thread tasks should stay short, with no red triangles appearing during animations.
- [ ] **Detection unchanged:** blink detection feels the same as on the deployed site. Run Calibrate and use Morse; dots and dashes register as before.

## 7. Screen reader spot check (optional)
- [ ] macOS VoiceOver (Cmd+F5) on Morse: the gauge is read as "Blink length" with its zone text.
- [ ] Each suggestion tile is read with "Source: AI" or "Source: Built-in".
- [ ] The question banner is announced when it arrives.

## Notes
Write down anything that looks wrong, with the page, the width and a screenshot.
