# PostHog Dashboard — DataVital AI Client Engagement

**Project:** 701149 · US Cloud  
Dashboards are configured in the PostHog UI (no private API automation in this repo).

## A. Traffic Overview

- Insights → Trends: `$pageview` (Unique users / Total count)
- Trends: `demo_session_started`
- Trends: `demo_return_visit`
- Breakdown by day

## B. Geographic Breakdown

- `$pageview` broken down by `$geoip_country_name` / `$geoip_country_code`
- Optional city: `$geoip_city_name` (approximate; VPN/proxy caveat)
- Do **not** treat geo as identity

## C. Healthcare Domain Engagement

- Event `demo_domain_viewed`
- Breakdown by `domain_name` / `domain_id`
- Filter `domain_id = enterprise` for Enterprise AI interest

## D. Invitation Engagement

- Event `demo_invitation_opened` + `$pageview` filtered by `invite_id`
- Table: `invite_id`, session count, first/last seen
- Resolve `invite_id` → organization **only** in a private backend/admin tool — not in public PostHog property labels

## E. Referral Performance

- `$pageview` breakdown by `$referring_domain`, `utm_source`, `utm_medium`, `utm_campaign` (safe campaign tags only)

## Session Replay

Confirm **Project → Session replay** is disabled / not recording for this project.
