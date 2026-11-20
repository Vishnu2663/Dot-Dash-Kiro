# Requirements: AI transparency

## Introduction
Dot-Dash suggests sentences from the letters a patient has spelled. The server tries Groq first, then
Gemini; the app falls back to its built-in phrase bank. This spec makes clear to users, caregivers and
judges what leaves the device, where each suggestion came from, and lets the user turn cloud AI off.

Out of scope, and unchanged: blink timing, the caregiver question channel, alerts, and all security
rules (passcode checks, input limits, secrets handling).

## Glossary
- **Cloud AI**: the `/api/predict` server function and the providers it calls (Groq, Google Gemini).
- **Built-in phrases**: the sentence bank in `src/lib/phrases.ts`, matched on the device.
- **Recent sentences**: up to 5 sentences said in Morse mode (a picked suggestion, a quick phrase, or a
  message spoken with `• — • —`), stored in `localStorage` under `dotdash.recent`.

### Requirement 1: "What is sent to the cloud" panel
**User story:** As a caregiver, I want to know exactly what the AI services receive, so I can decide whether to use them.

1. The Settings page shall show a panel titled "What is sent to the cloud", in plain language.
2. While cloud AI is on, the panel shall list everything a suggestion request contains: the letters typed so far (up to 60 characters), up to 5 recent sentences, the language, and the number of suggestions requested.
3. While cloud AI is on, the panel shall state that video, camera images, audio, the alert passcode and settings are not sent with suggestion requests.
4. The panel shall state that Dot-Dash has no name or profile field, and that spelled letters are sent as typed, so a spelled name would be sent.
5. The panel shall name the services and their order: the app's own server, which asks Groq first, and Google Gemini only if Groq is not configured, fails, or returns nothing usable.
6. While cloud AI is off, the panel shall state that nothing is sent for suggestions.
7. The panel shall list the other connections that happen regardless of this setting: the face-model download, alerts to Telegram, and caregiver questions through the app's server.

### Requirement 2: Suggestion source label
**User story:** As a caregiver, I want to see where each suggestion came from, so I understand why suggestions differ.

1. Each suggestion tile shall show a text label, "AI" or "Built-in".
2. The label shall be text, not colour alone, and shall be announced by screen readers as "Source: AI" or "Source: Built-in".
3. The source shall be part of the suggestion data returned by `POST /api/predict`. The client shall label a sentence "AI" only if the server marked it `source: "ai"`.
4. When a sentence is both built-in and returned by cloud AI, the app shall show it once, labelled "AI".

### Requirement 3: Cloud AI setting
**User story:** As a patient or caregiver, I want to turn cloud AI off, so that nothing I spell leaves the device for suggestions.

1. Settings shall include "Use cloud AI for suggestions", on by default.
2. While the setting is off, the app shall not send any request to `/api/predict`.
3. While the setting is off, the app shall suggest built-in phrases only, with no loading text and no fallback note.
4. The setting shall persist in `localStorage` under the `dotdash.` prefix. If the stored value is missing, the app shall treat the setting as on.
5. When the user chooses Reset to defaults, the app shall turn the setting back on.

### Requirement 4: Fallback
**User story:** As a patient, I want suggestions to keep working when the AI services are down, so that I am never left waiting.

1. When the user has spelled 2 or more letters, the app shall show built-in suggestions at once, before any cloud answer.
2. If both providers fail, are not configured, or return nothing usable, then the app shall keep the built-in suggestions.
3. If no usable cloud answer arrives within 9 seconds, then the app shall cancel the request and keep the built-in suggestions.
4. When the app falls back, it shall show the note "Using built-in suggestions for now." in an `aria-live="polite"` region, never as an alert. The note shall also show when no built-in sentence matches.
5. Every suggestion shall start with the typed letters, and shall be chosen only by an explicit blink or tap.

### Requirement 5: README
1. The README shall have an "AI used at runtime" section stating the services, the data they receive, what happens when they are down, and a plain statement that Kiro was used to build the app.
2. Every claim in that section shall be traceable to code in this repo. It shall not make claims about provider-side data retention or speed.
