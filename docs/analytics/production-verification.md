# Production Verification — PostHog

**BUILD_ID target:** `v95-posthog-token-fix`  
**Commit:** `a1e1cff`  
**Project ID:** `701149`  
**Host:** `https://us.i.posthog.com`  
**Verified:** 2026-10-31

## Checklist

| Check | Status | Evidence |
|---|---|---|
| Typecheck / analytics unit tests | **PASS** | `vitest` analytics-privacy 13/13 |
| Bundle contains public `phc_` only (no personal API keys) | **PASS** | `assets/index-DkfYYw3n.js` contains only project `phc_` token |
| Live BUILD_ID matches | **PASS** | `refresh.html` → `v95-posthog-token-fix`; shell loads `index-DkfYYw3n.js` |
| Consent banner appears | **PASS** | Accept / Decline on first visit |
| After Accept: network POST to `us.i.posthog.com` | **PASS** | Multiple `/i/v0/e/` and `/e/` responses **HTTP 200** |
| Navigate ≥3 pages → `$pageview` + domain events | **PASS** | `/executive` → `/command` → `/enterprise-ai` → `/emergency`; capture queue flushed with 200 |
| Country properties (GeoIP) | **PASS** *(server-side)* | PostHog GeoIP enrichment on ingestion; no browser GPS |
| Session Replay off | **PASS** | SDK `disable_session_recording: true`; remote config `sessionRecording: false` |
| Invite query stripped from URL and payloads | **PASS** | `?invite=` removed via `history.replaceState`; not in `$current_url` |
| UI unchanged aside from consent banner | **PASS** | Spot-check Executive / Command / Enterprise AI / Emergency |
| Secure invitation → org identity mapping | **BLOCKED** | Awaits authenticated backend registry (not shippable on GitHub Pages) |

## Fixes applied during verification

1. **v94** — `disable_compression: true` (mitigate gzip-js failures in some browsers).
2. **v95** — stop deleting PostHog event property `token` inside `sanitize_properties` (was causing HTTP 400 ingestion failures).

## Known limitations

- Invitation → organization mapping awaits secure backend.
- Historical pre-instrumentation traffic cannot be reconstructed.
- GeoIP is approximate (VPN/corporate egress).
- Ad blockers may suppress events without affecting the demo.

## Final acceptance matrix

| Requirement | Status |
|---|---|
| PostHog initialized correctly | **PASS** |
| Production pageviews received (HTTP 200 to ingestion) | **PASS** |
| Country reporting available via GeoIP | **PASS** |
| Domain events recorded | **PASS** |
| Client invitation attribution (opaque invite_id) | **PASS** (frontend) |
| Secure invite → customer identity mapping | **BLOCKED** (backend required) |
| Privacy / consent controls | **PASS** |
| Session Replay disabled | **PASS** |
| No sensitive prompts / PHI in events | **PASS** |
| Existing demo functionality / UI freeze | **PASS** |
