# Privacy and Consent

## Defaults

- Consent required before any PostHog init or capture.
- Autocapture disabled.
- Session Replay / session recording disabled (`disable_session_recording: true`).
- `person_profiles: 'identified_only'` — invitation open does **not** call `identify()` with a customer name.
- Form inputs and text masked at SDK level; application also never sends prompts/questions.
- Coarse GeoIP via PostHog server-side properties only — no browser GPS.
- Sensitive query keys stripped from `$current_url` / analytics paths.

## Consent UI

Minimal bottom banner (Accept / Decline) using existing `gc-chip-btn` classes. Decline leaves analytics offline for that browser profile.

## Lawful basis note

Public B2B demo analytics is consent-gated. Product/legal can revisit configuration after review; code defaults remain opt-in.
