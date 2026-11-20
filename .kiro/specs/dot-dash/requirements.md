# Requirements: Dot-Dash

## Introduction
Dot-Dash is a browser app that converts eye blinks into Morse code, text, and speech, with
caregiver alerts and a caregiver question channel.

### Requirement 1: Blink input
**User story:** As a patient, I want my blinks read from a webcam, so I can communicate without hands.
1. WHEN the eyes stay closed for less than 0.4 s THEN the system SHALL ignore it as a natural blink.
2. WHEN a closure is between 0.4 s and the dot/dash boundary (default 1 s) THEN the system SHALL emit a dot.
3. WHEN a closure is longer than the boundary and shorter than 3 s THEN the system SHALL emit a dash.
4. WHEN the eyes are open 1.5 s after a symbol THEN the system SHALL end the letter; after 3 s more it SHALL end the word.
5. Video SHALL be processed in the browser only and SHALL NOT be uploaded or stored.

### Requirement 2: Calibration
1. The system SHALL guide the user through eyes open, eyes closed, 3 short blinks, 3 long blinks.
2. WHEN calibration finishes THEN the system SHALL save threshold, dot/dash boundary and SOS time.
3. IF fewer than 2 short or 2 long blinks were recorded THEN nothing SHALL be saved and a retry message SHALL be shown.

### Requirement 3: Morse mode
1. The system SHALL decode letters A-Z and digits 0-9, show the letters a partial code could become, and show a live Morse chart.
2. `• • — —` SHALL delete the last letter. `• — • —` SHALL speak the message.
3. After 2 letters the system SHALL show up to 6 sentences that start with those letters, each numbered; blinking the number in Morse SHALL choose it. Nothing is chosen automatically.
4. Quick phrases (Water, Toilet, Pain, Turn me, Nurse, Yes, No) SHALL be spoken from a single pattern that is never a letter.

### Requirement 4: Easy mode
1. A highlight SHALL scan Water, Pain, Toilet, Turn me, Call nurse, Yes, No and Back to menu.
2. A blink while an option is highlighted SHALL speak it. Scan speed SHALL be configurable 1.5 to 4 s.

### Requirement 5: Emergency alert
1. WHEN the eyes stay closed for 3 s, or HELP is spelled, THEN the system SHALL send an alert and speak "I need help".
2. Alerts SHALL be limited to one per 30 s, on the client and on the server.
3. IF no passcode is configured THEN the user SHALL be told alerts are not set up.

### Requirement 6: Caregiver questions
1. A caregiver SHALL be able to ask a yes/no question; the patient answers with one short (yes) or one long (no) blink.
2. Spelling SHALL be paused while a question is open. The answer SHALL appear on the caregiver page.

### Requirement 7: Settings and guidance
1. The system SHALL provide sensitivity, scan speed, language (English, Hindi, Kannada), sound cues, passcode, and reset.
2. The system SHALL provide a Home setup walkthrough and a full Guide.
