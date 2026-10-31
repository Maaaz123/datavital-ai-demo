# Client Invitation Tracking

## Public link shape

```text
https://demo.datavital.io/enterprise-ai?invite=<opaque-token>
```

Generate tokens:

```bash
node scripts/generate-invite.mjs --org "Example Hospital" --name "CFO" --country SA
```

## Frontend behavior

1. Parse `invite` from the query string.
2. Strip `invite` (and other secrets) from the address bar immediately.
3. Store only an opaque hashed `invite_id` in `sessionStorage`.
4. Emit `demo_invitation_opened` after consent (never with plaintext token).
5. `identity_verified` is always `false` — a forwarded link is not proof of the named prospect.

## Secure mapping (backend required)

GitHub Pages cannot host a private registry. Organization/name mapping must live in an authenticated server (see `docs/client-engagement/backend-api.openapi.yaml`).

| Capability | Status |
|---|---|
| Opaque token in URL | Implemented |
| Strip token from URL / analytics | Implemented |
| Private org mapping | **Awaits backend** |
| Server-side validate → `invite_verified` | Spec only until `VITE_INVITE_API_BASE` is provisioned |
