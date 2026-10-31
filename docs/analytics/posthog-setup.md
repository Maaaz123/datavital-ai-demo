# PostHog Setup — DataVital AI Demo

| Item | Value |
|---|---|
| Project ID | `701149` |
| Region | US Cloud |
| Ingestion host | `https://us.i.posthog.com` |
| UI host | `https://us.posthog.com` |
| Token type | Public project token (`phc_…`) — write-only, safe for browser |
| BUILD_ID | `v94-posthog-capture-fix` |

## Environment

`frontend/.env.production`:

```bash
VITE_ANALYTICS_ENABLED=true
VITE_POSTHOG_KEY=phc_…   # public project token only
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_PROJECT_ID=701149
```

Never place Personal API Keys or Project **secret** API keys in Vite env or the SPA.

## SDK

- Package: `posthog-js`
- Module: `frontend/src/analytics/posthog.ts`
- Bootstrap: `EngagementBootstrap` (consent-gated)
- Autocapture: **off**
- Session recording: **disabled**
- Automatic pageviews: **off** (manual SPA `$pageview` via `routeTracking.ts`)
- Compression: **disabled** (`disable_compression: true`) to avoid gzip-js / CompressionStream HTTP 400 failures in some browsers

## Consent

Analytics initializes only after the visitor accepts the consent banner. Decline keeps the demo fully functional with zero captures.
