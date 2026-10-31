# Private Admin Analytics Dashboard — Specification

**Status:** Specified only — **not** implemented in the public GitHub Pages SPA.  
**Reason:** Admin analytics requires authentication, authorization, private registry access, and PostHog **private** API keys. None of these may ship in the demo bundle.

## Goals

Show per-prospect engagement for invitation campaigns:

| Column / panel | Source |
|---|---|
| Client / organization | Private invite registry |
| Invitation status | Registry (`active` / `revoked` / …) |
| Visits & sessions | PostHog query API (server) filtered by `invite_id` |
| First / last visit | Min/max event timestamps |
| Country | Coarse GeoIP on validate + `$geoip_country_code` if PostHog provides it server-side |
| Pages visited | Distinct sanitized `path` values |
| Return visits | `demo_return_visit` count / visit_count |
| Engagement timeline | Ordered events for `invite_id` |

## Non-goals

- No admin UI route under `demo.datavital.io` without a separate authenticated origin.  
- No “fake secure” localStorage registry.  
- No display of question text, chat payloads, or PHI.  
- No treating `invite_verified` as personal identity proof.

## UX outline (future authenticated app)

1. Login via SSO / IdP.  
2. Table of invitations with status chips.  
3. Detail drawer: timeline sparkline + page list.  
4. Actions: revoke invite, copy link (regenerate only via create API), request deletion.  
5. Banner: “Attribution only — forwarded links are not verified identity.”

## Security

- Deploy on a private origin (VPN / IP allowlist / SSO).  
- Server-side authorization on every admin route.  
- PostHog personal API key only in server secrets manager.  
- Audit log admin reads/exports.
