---
inclusion: always
---
# Product: Dot-Dash

Dot-Dash lets people who cannot speak or use their hands communicate with eye blinks. A webcam
reads blinks in the browser, turns them into Morse code, and speaks the result aloud.

## Hackathon category
Kiroween: **Resurrection**. Morse code is a retired technology. Dot-Dash brings it back as an
assistive interface for patients (ALS, stroke, ICU, locked-in syndrome).

## Principles
- Privacy first: video is analysed in the browser and never uploaded or stored.
- Safety first: an emergency alert (eyes closed 3 s, or spelling HELP) must always work and
  never be blocked by other UI state. Alerts are rate-limited to one per 30 s.
- Accessibility first: large text, high contrast black theme, no reliance on colour alone,
  `aria-live` on anything that changes without user input.
- Never choose anything on the patient's behalf. Suggestions are picked only by an explicit blink.
- The app is an assistive tool, not a medical device. The footer says so.
