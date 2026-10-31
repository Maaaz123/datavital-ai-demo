# Enterprise AI — Governance

**Status:** Stage 6–7 + v82 executive UX remediation  
**BUILD_ID:** `v82-enterprise-ai-executive`  
**Routes:** `/enterprise-ai/governance`, decision panel on `/enterprise-ai`

## AI mode

| Mode | Public demo | Notes |
|---|---|---|
| `deterministic` | **Required** | Tool orchestration with explicit Analysis Mode label |
| `llm` | Disabled | Stubbed unless secure backend flag is set; no frontend API keys |

Disclosure string (UI + answers):

> Analysis Mode: Deterministic management analytics on illustrative hospital demo data — not an unrestricted live LLM. Numeric claims cite tool results from existing domain views only.

Technical IDs and tool result citations live in the expandable **Technical audit** panel — not flooded into the primary executive brief.

## Decision lifecycle

`Draft` → `Under Review` → `Approved` | `Rejected` | `Deferred` → `In Progress` → `Completed` → `Effectiveness Review`

Storage: `sessionStorage` / `localStorage` key `datavital.enterpriseAi.decisions.demo` with companion label `demo-session-state`.

**Hard rule:** Approval MUST NOT mutate historical KPI facts (verified for RCM NPR in tests).

## Outcomes

Expected vs simulated vs observed. Observed defaults to **“Outcome not yet measured”**.

## Guardrails

1. No patient-level clinical diagnosis or CDS claims
2. No CapEx auto-approval
3. Knowledge graph causal claims: `associative` | `operational-link` only
4. Investigation drivers never assert definitive root cause from correlation alone
5. Forecasts and what-ifs labeled illustrative / Scenario Only where appropriate
6. Cross-domain numeric answers should cite reconciliation gate
7. Focus metric and scenario ID derived from the question — never silent Emergency / `ent-ed-congestion` defaults for unrelated topics
8. No fabricated financial losses or clinical causality in executive sections
9. Role selector is presentation-only (no fake auth)
10. “Approve” phrasing opens confirmation — no silent approval; approval does not mutate KPI ledgers

## Human accountability

Enterprise AI proposes; humans Approve / Reject / Defer. Vital Assist remains a lightweight domain Q&A shell — full multi-step investigate path lives on `/enterprise-ai`.
