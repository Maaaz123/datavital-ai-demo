# Setup Instructions — Client Engagement Tracking

## Current production posture (GitHub Pages)

| Item | Value |
|---|---|
| Analytics | **Disabled** by default |
| PostHog SDK in bundle | **Not added** |
| Invite registry in SPA | **None** |
| Admin dashboard in SPA | **None** |
| Invite query handling | Token stripped from URL on load |

Historical visits **cannot** be reconstructed without prior logs.

## Frontend env (only after approval)

Create `frontend/.env.local` (gitignored) — never commit secrets:

```bash
# Requires product + privacy approval before enabling in production Pages builds
VITE_ANALYTICS_ENABLED=true
VITE_POSTHOG_PROJECT_KEY=phc_xxxxxxxx   # public project key only
VITE_POSTHOG_HOST=https://us.i.posthog.com
# Optional — only when engagement API is deployed
VITE_INVITE_API_BASE=https://engagement-api.example.datavital.io
```

Rebuild and selectively deploy Pages assets. Without both `VITE_ANALYTICS_ENABLED=true` and a project key, capture remains a no-op.

### Consent

When analytics is enabled, the product must collect consent before `writeConsent('granted')`.  
Until a consent UI is approved, keep analytics **disabled** in production builds.

## Generate an invitation (operator workstation)

```bash
node scripts/generate-invite.mjs \
  --org "Example Hospital Group" \
  --name "Prospective CFO" \
  --country SA
```

Copy the printed `invitation_link` into your CRM. Persist the row via the **private** admin API (`POST /v1/admin/invites`) — do **not** commit plaintext tokens to git.

Example link shape:

`https://demo.datavital.io/enterprise-ai?invite=<opaque-token>`

## Backend dependency (required for PASS on secure requirements)

Provision (separately authorized):

1. Postgres (or managed SQL) for `invite-registry.schema.json`  
2. Authenticated API implementing `backend-api.openapi.yaml`  
3. Private admin dashboard per `admin-dashboard-spec.md`  
4. PostHog Cloud project (authorized) — project key for SPA; personal key for server rollups  
5. Coarse GeoIP on validate endpoint  
6. Retention/purge job wired to `POST /v1/admin/retention/purge`

Suggested hosts: Cloudflare Workers + D1/Postgres, AWS API Gateway + Lambda + RDS, or Fly.io — **not** GitHub Pages.

## Test project verification checklist

1. Create a PostHog **test** project (not production).  
2. Enable analytics only in a local/preview build with test project key.  
3. Grant consent in that build.  
4. Open `/enterprise-ai?invite=<token>` — confirm URL loses `invite=` and `demo_invitation_opened` appears in PostHog.  
5. Navigate domains — confirm `demo_page_viewed` / `demo_domain_visited` without invite in properties.  
6. Confirm no session recordings and autocapture disabled.  
7. Block network / use ad blocker — demo still loads.  
8. Revoke consent / clear storage — captures stop.

## Data retention & deletion

- Registry: `status=deleted` + hard delete API.  
- PostHog: server purge by `invite_id` / `distinct_id` using private API.  
- Browser: `clearAnalyticsLocalData()` + `clearConsent()`.
