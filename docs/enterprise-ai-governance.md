# Enterprise AI — Governance

**Status:** Stage 6–7 partial acceptance  
**Routes:** `/enterprise-ai/governance`, decision panel on `/enterprise-ai`

## AI mode

| Mode | Public demo | Notes |
|---|---|---|
| `deterministic` | **Required** | Tool orchestration with explicit label |
| `llm` | Disabled | Stubbed unless secure backend flag is set; no frontend API keys |

Disclosure string (UI + answers):

> AI mode: Deterministic tool orchestration (labeled). No unrestricted LLM reasoning in the public demo. Numeric claims cite tool results from existing domain views only.

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

## Human accountability

Enterprise AI proposes; humans Approve / Reject / Defer. Vital Assist remains a lightweight domain Q&A shell — full multi-step investigate path lives on `/enterprise-ai`.
