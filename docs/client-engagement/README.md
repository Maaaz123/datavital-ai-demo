# Client Engagement Tracking — Overview

**Product:** DataVital AI demo · https://demo.datavital.io  
**Hosting constraint:** GitHub Pages (static) — **no private database or admin API on Pages**.  
**Analytics default:** **DISABLED** (`VITE_ANALYTICS_ENABLED` unset).  
**SDK policy:** No PostHog JavaScript SDK is bundled. Capture uses HTTP only when explicitly enabled.  
**Paid services:** Not provisioned in this change. PostHog Cloud requires separate authorization.

## What shipped in-repo

| Deliverable | Location |
|---|---|
| Frontend instrumentation (flagged off) | `frontend/src/analytics/` |
| Invite token CLI (operator) | `scripts/generate-invite.mjs` |
| Event dictionary | `docs/client-engagement/event-dictionary.md` |
| Private registry schema | `docs/client-engagement/invite-registry.schema.json` |
| Backend / admin API OpenAPI | `docs/client-engagement/backend-api.openapi.yaml` |
| Admin dashboard specification | `docs/client-engagement/admin-dashboard-spec.md` |
| Setup instructions | `docs/client-engagement/setup.md` |
| Requirement status matrix | `docs/client-engagement/requirements-status.md` |
| Privacy / unit tests | `frontend/src/analytics/analytics-privacy.test.ts` |

## What requires infrastructure (not on GitHub Pages)

1. **Private invite registry** (Postgres or equivalent) — client name, org, country, hashed token, status.  
2. **Authenticated invite validation API** — `POST /v1/invites/validate`.  
3. **Authenticated admin analytics API + dashboard** — real authZ; never ship admin to the public SPA.  
4. **Coarse GeoIP** — server-side only (country code).  
5. **Retention / deletion jobs** — purge events + registry rows on request.  
6. **Approved PostHog project** — public project key only in frontend env; private keys server-side.

Until those exist, the demo continues to work with analytics **no-op**, invite query params **stripped** from the URL, and no client registry in the public bundle.

## Attribution ≠ identity

`?invite=<token>` provides **invitation attribution** only. A forwarded link must **not** be treated as verified proof that the named prospect visited. Server validation sets `invite_verified`; `identity_verified` remains `false` in the public client.
