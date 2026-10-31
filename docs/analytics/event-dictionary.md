# Event Dictionary

| Event | Trigger | Allowed properties | Privacy | Dedupe |
|---|---|---|---|---|
| `$pageview` | React Router path change after consent | `path`, `$pathname`, `domain_id`, `domain_name`, `screen_title`, `invite_id`, `invite_verified`, `identity_verified`, `demo_build_id` | No invite query, no prompts | 400ms path guard |
| `$pageleave` | SDK `capture_pageleave` | path metadata | sanitized URLs | SDK |
| `demo_session_started` | First consented boot / tab session | invite attribution, `session_id`, `demo_build_id` | no org/name | once per mount |
| `demo_domain_viewed` | First nav domain in session | `domain_id`, `domain_name`, `route_path`, `demo_build_id`, invite attribution | no purchase inference | `domainsSeen` |
| `demo_feature_explored` | Explicit feature helper (optional) | `interaction_type`, `control_id`, `route_path` | no inputs | caller |
| `demo_invitation_opened` | Landing with `?invite=` | opaque `invite_id`, `invite_verified`, `identity_verified=false` | no customer mapping | once per invite |
| `demo_return_visit` | Anonymous visit count > 1 | `prior_session_count` | no email | once when visits>1 |
| `demo_last_activity` | Throttled pointer activity | `path` | no content | 60s |
| `demo_consent_updated` | Accept consent | `consent` | — | on action |

**Forbidden everywhere:** question text, prompts, responses, patient IDs, emails, plaintext invite tokens, registry rows.
