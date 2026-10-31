# Event Dictionary — Demo Engagement

All events are emitted only when `VITE_ANALYTICS_ENABLED=true`, a public PostHog project key is configured, **and** consent is `granted`.

Autocapture: **off**. Session recording: **off**.

## Events

| Event name | When | Allowed properties | Forbidden |
|---|---|---|---|
| `demo_invitation_opened` | First load that contained `?invite=` (token already stripped from URL) | `invite_id`, `invite_verified`, `identity_verified`, `path`, `country_code` | client name, org, email, question text |
| `demo_session_started` | First consented session boot | `invite_id`, `invite_verified`, `identity_verified`, `session_id`, `country_code` | registry rows |
| `demo_page_viewed` | SPA route change | `path` (sanitized), `domain_id`, `screen_title`, invite attribution, `country_code` | raw `invite` query, question text |
| `demo_domain_visited` | First hit to a nav domain in the session | `domain_id`, `path`, invite attribution | PHI |
| `demo_interaction` | Coarse CTA/nav/filter (optional callers) | `interaction_type`, `path`, `control_id`, invite attribution | message / question bodies |
| `demo_return_visit` | Visit count > 1 (anonymous distinct id) | `prior_session_count`, invite attribution | email |
| `demo_last_activity` | Throttled activity heartbeat | `path`, invite attribution | question text |
| `demo_consent_updated` | Consent grant/deny | `consent` | PII |

## Property notes

- `invite_id`: opaque hash of the token — **not** reversible to the registry without the private store.  
- `invite_verified`: `true` only after server `POST /v1/invites/validate` succeeds.  
- `identity_verified`: always `false` in the public client (forwarded links are not identity).  
- `country_code`: ISO-3166 alpha-2 from **server GeoIP** when available; client never sends lat/lng.  
- `path`: invite/auth query keys removed via `sanitizeUrlForAnalytics`.

## Non-events (explicitly out of scope)

- Enterprise AI / Vital Assist question text  
- Decision rationale free text  
- Patient / clinical identifiers  
- Full client registry dumps  
- Session recordings / rage clicks / input text capture  
