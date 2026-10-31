# Production Verification — PostHog

**BUILD_ID target:** `v95-posthog-token-fix`  
**Project ID:** `701149`  
**Host:** `https://us.i.posthog.com`

## Checklist

| Check | Status |
|---|---|
| Typecheck / analytics unit tests | See CI / local run |
| Bundle contains public `phc_` only (no personal API keys) | Verify after build |
| Live BUILD_ID matches | curl `refresh.html` |
| Consent banner appears | Browser |
| After Accept: network POST to `us.i.posthog.com` | Browser DevTools / CDP |
| Navigate ≥3 pages → `$pageview` + `demo_domain_viewed` | Observed in network / Activity |
| Country properties present when PostHog GeoIP enriches | PostHog Activity / Insights |
| Session Replay off | PostHog project settings + SDK flag |
| Invite query stripped from URL and payloads | Browser address bar + event props |
| UI unchanged aside from consent banner | Visual spot-check |

## Known limitations

- Invitation → organization mapping awaits secure backend.
- Historical pre-instrumentation traffic cannot be reconstructed.
- GeoIP is approximate (VPN/corporate egress).
- Ad blockers may suppress events without affecting the demo.
