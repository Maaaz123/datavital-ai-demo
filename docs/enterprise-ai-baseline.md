# Domain 16 — Enterprise AI Baseline

**Branch:** `domain-16-enterprise-ai`  
**Baseline SHA:** `a3e9035a48c84e13d9067de72d9dcbfa1d701fc4` (`a3e9035` — merge of `mvp-v1-remediation` into `main`)  
**Production BUILD_ID:** `v80-mvp-v1-remediation` (verified via `https://demo.datavital.io/refresh.html`)  
**Local BUILD_ID:** `v80-mvp-v1-remediation` (`refresh.html`, `frontend/public/refresh.html`, `frontend/src/pwa.ts`)  
**Stage:** 1 — foundation only (registry / knowledge graph / reconciliation gate). No full UI. No deploy.

---

## Git state at branch creation

| Item | Value |
|---|---|
| Prior working branch | `mvp-v1-remediation` @ `d1f960f` |
| `main` after pull | `a3e9035` Merge PR #1 (`mvp-v1-remediation`) |
| Remediation merged to main? | **Yes** |
| New branch | `domain-16-enterprise-ai` from `main` @ `a3e9035` |

## Remediation presence (P0 / P1)

Confirmed on baseline tip:

| ID | Evidence |
|---|---|
| P0-001 Strategy revenue = RCM NPR | `strategyView.ts` assemble uses `buildRcmView(...).netPatientRevenue`; `st-rcm-revenue.test.ts` |
| P1-001 / P1-002 SC rate bounds + DOS | `supplyChainView.ts` identities; `sc-rate-bounds.test.ts` |
| P1-005 ICU vs enterprise staffing scopes | `st-icu-staffing.test.ts`; Strategy mirrors ICU gap + distinct enterprise gap |
| Cross-domain 15-pair matrix | `enterprise-cross-domain.test.ts` |

## Existing AI / decision surfaces inspected

| Surface | Path | Notes |
|---|---|---|
| Vital Assist | `frontend/src/showcase/assistant.ts` | Domain-grounded Q&A; calls `build*View` |
| Copilot shell | `frontend/src/core/Copilot.tsx` + `components/copilot/*` | Screen-scoped ask UX |
| What-if | `frontend/src/showcase/whatIf.ts` | Illustrative scenarios; ED→Beds→ICU→Finance demo |
| KPI engine | `frontend/src/showcase/engine.ts` | Catalog + assumption KPI defs |
| Bind | `frontend/src/showcase/bind.ts` | KPI → `Raw` from scenario / views |
| Enterprise view | `frontend/src/core/enterpriseView.ts` | Cross-domain facts from domain builders |

## Stage 1 deliverables

| Package | Path |
|---|---|
| Metric registry | `frontend/src/core/enterpriseAi/metricRegistry.ts` |
| Knowledge graph | `frontend/src/core/enterpriseAi/knowledgeGraph.ts` |
| Reconciliation gate | `frontend/src/core/enterpriseAi/reconciliation.ts` |
| Tests | `frontend/src/core/enterpriseAi/enterpriseAi-registry.test.ts` |
| Data dictionary stub | `docs/data-dictionary/enterprise-ai-data-dictionary.md` |
| Knowledge graph doc | `docs/enterprise-ai-knowledge-graph.md` |
| Tool contracts stub (Stage 2) | `docs/enterprise-ai-tool-contracts.md` |

## Explicit non-goals (this stage)

- No full Enterprise AI UI
- No production deploy / rsync
- No second independent metric ledger
- No patient-level clinical causality claims

---

*Baseline recorded for Domain 16 Stage 1 kickoff.*
