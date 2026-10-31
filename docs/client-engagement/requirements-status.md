# Client Engagement Tracking — Requirements Status

**Date:** 2026-10-31  
**Repo:** Maaaz123/datavital-ai-demo  
**Production host:** https://demo.datavital.io (GitHub Pages — static)  
**Instrumentation BUILD_ID:** `v92-engagement-instrumentation` (analytics still **disabled** in production env)  
**Bundle:** `index-DtcK8ZJS.js` · no `posthog-js` dependency · no project key baked in  
**Legend:** PASS / FAIL / NOT TESTED  

**Infrastructure dependency:** Secure invite registry, invite validation API, authenticated admin dashboard, GeoIP, and PostHog private-key rollups are **not** available on GitHub Pages. Those items are specified; production enablement requires authorized backend provisioning.

| # | Requirement | Status | Evidence / notes |
|---|---|---|---|
| 1 | Integrate PostHog securely via env-based project config | **PASS** (instrumentation) | `resolveAnalyticsConfig`; disabled unless `VITE_ANALYTICS_ENABLED` + public project key. HTTP capture only — no private keys in SPA. Production enablement **NOT TESTED** (flag off). |
| 2 | Cryptographically random invitation tokens | **PASS** | `generateInviteToken` + `scripts/generate-invite.mjs` (`crypto.randomBytes` / `getRandomValues`). |
| 3 | Private server-side registry (name, org, country, id, date, status) | **FAIL** (runtime) / **PASS** (schema) | Schema: `invite-registry.schema.json`. No private DB on Pages — cannot store registry securely in-repo for production. |
| 4 | Invitation links `…?invite=<opaque-token>` | **PASS** | CLI prints link; frontend reads/strips `invite`. |
| 5 | Server-side token validation; no registry in Pages bundle | **PASS** (bundle) / **FAIL** (live validate) | No registry in SPA. Validate API OpenAPI specified; live server **not** deployed → validation falls back to `invite_verified=false`. |
| 6 | Consent-permitted events (opened, session, page, domain, interaction, return, last activity) | **PASS** (code + dictionary) | `ENGAGEMENT_EVENTS` + `EngagementBootstrap`. Live PostHog emission **NOT TESTED** (analytics disabled in prod). |
| 7 | Coarse GeoIP country only | **PASS** (design) / **FAIL** (runtime) | Client sets `country_code: null`; server GeoIP in OpenAPI. No GeoIP service provisioned. |
| 8 | Private admin analytics dashboard | **FAIL** (runtime) / **PASS** (spec) | `admin-dashboard-spec.md` + OpenAPI admin routes. Not shipped in public SPA (correct). |
| 9 | Attribution ≠ verified identity | **PASS** | `identity_verified` always `false`; docs warn on forwarded links. |
| 10 | No patient data / question text / sensitive inputs | **PASS** | `FORBIDDEN_EVENT_PROPERTY_KEYS` + scrubber tests. |
| 11 | No session recordings / unrestricted autocapture; respect consent | **PASS** | Config forces both off; `mayCapture` gate. Consent UI for prod **NOT TESTED** (analytics off). |
| 12 | Admin protected by real auth + server authZ | **FAIL** (runtime) / **PASS** (spec) | OpenAPI `bearerAuth`. No admin origin deployed. |
| 13 | No PostHog private API keys / admin credentials in frontend | **PASS** | Only optional public project key via env; no personal keys in code. |
| 14 | Retention and deletion controls | **PASS** (spec + local clear) / **FAIL** (server purge runtime) | `clearAnalyticsLocalData`, OpenAPI purge. Server purge **not** deployed. |
| 15 | Prevent invite tokens leaking in analytics URLs/referrers | **PASS** | `sanitizeUrlForAnalytics` + `stripSensitiveParamsFromLocation` on boot; unit tested. |
| 16 | Disabled tracking / ad blockers / network failures must not break demo | **PASS** | Capture swallows errors; default disabled; tests cover network failure. |
| 17 | Do not add tracking SDKs unless configured and approved | **PASS** | No `posthog-js` dependency added. |
| 18 | Do not provision paid services without authorization | **PASS** | No PostHog/cloud resources provisioned by this change. |
| 19 | Preserve existing UI/UX | **PASS** | Silent `EngagementBootstrap` (`null` render); no CSS/layout changes to domains. |
| 20 | Unit/integration/privacy/browser tests; verify in test project before production | **PASS** (unit/privacy) / **NOT TESTED** (PostHog test project + browser E2E) | `analytics-privacy.test.ts`. Live PostHog test project verification requires approved project. |

## Overall

| Gate | Status |
|---|---|
| Safe static-site instrumentation (default off) | **PASS** |
| Secure end-to-end engagement platform on production | **FAIL** until backend + approved PostHog + admin auth are provisioned |
| Historical visit reconstruction | **NOT TESTED** / **N/A** — cannot reconstruct without prior logs |

**Recommended next authorization ask:** provision engagement API + PostHog test project + SSO admin app, then re-run requirement matrix for items marked FAIL (runtime).
