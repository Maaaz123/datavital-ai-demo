# Enterprise AI & Vital Assist — Context Routing Audit

**Baseline BUILD_ID:** `v90-decision-density` (HEAD `091bde1`)  
**Remediation BUILD_ID:** `v91-enterprise-routing`  
**Date:** 2026-10-31  
**UI/UX:** Frozen — behavioral remediation only

---

## Root cause

| Defect | Cause | Status |
|---|---|---|
| CEO “three biggest risks” → Emergency Director priorities | Vital Assist remapped `department === 'Enterprise'` → `answerQuestion(..., 'Emergency')`, which matches `/what should\|priorit/` → ED priorities pack | **FIXED** |
| Same CEO question on Enterprise AI composer → clarification, no top-3 risks | `AMBIGUOUS_RE` missed `biggest risks` / `what should management do` → `clarification` instead of `hospital_wide_risk` | **FIXED** |
| CFO claims denials → ED delay factors (Vital Assist) | Same Enterprise→Emergency remap | **FIXED** |
| CFO on Enterprise AI → preferred bed-flow / weak RCM scenario | Scenario regex required `denials?` / `denied claim` and missed `claims being denied`; `interventionCandidatesForQuestion` defaulted primary to `ent-bed-assign-flow` | **FIXED** |
| Stale ED investigation after topic change | Prior `decisionProposalId` reused when topic changed; Vital Assist had no enterprise prior-state reset on hospital/period | **FIXED** |

---

## Fixed code paths

| Path | Change |
|---|---|
| `frontend/src/core/Copilot.tsx` | Enterprise Ask uses `orchestrate` + `formatEnterpriseAssistBody`; clears prior state on hospital/year/period change |
| `frontend/src/core/enterpriseAi/focus.ts` | Expanded hospital-wide risk phrasing → `hospital_wide_risk` |
| `frontend/src/core/enterpriseAi/scenarioSelect.ts` | Denial / safety scenario regex; topic-aware candidate primary (no silent bed-flow) |
| `frontend/src/core/enterpriseAi/executiveResponse.ts` | Hospital-wide top-3 risks with owners/actions; “not yet measured” contract language |
| `frontend/src/core/enterpriseAi/orchestrator.ts` | Topic→scenario fallback; clear decision on topic change; hospital-wide keeps null focusMetricId |
| `frontend/src/core/enterpriseAi/enterpriseQuestionContext.ts` | Shared context contract + Vital Assist formatter |

---

## AI entry points

| Entry point | Route context | Handler after fix |
|---|---|---|
| Enterprise AI composer | `/enterprise-ai*` | `orchestrate` (unchanged entry, fixed routing) |
| Suggested / related / investigate buttons | `/enterprise-ai*` | `runQuery` → `orchestrate` with prior state |
| Vital Assist Ask on Enterprise AI / Executive / Command | Enterprise department | `orchestrate` (was Emergency `answerQuestion`) |
| Vital Assist Ask on Domains 1–15 | Domain department | Domain `answerQuestion` (unchanged) |
| Scenario / decision follow-ups | Enterprise AI | `orchestrate` + decision store; stale decision cleared on topic change |

---

## Context precedence (implemented)

1. Explicit question topic > prior conversation focus  
2. Explicit hospital/year/period > inherited filters  
3. Role changes presentation emphasis only  
4. Prior focus inherited only for genuine follow-ups (`applyFollowUp.inheritFocus`)  
5. Route provides background only — Enterprise no longer forces Emergency  
6. Default ED only for ED-specific or flagship multi-domain questions  
7. Broad hospital questions → `hospital_wide_risk` enterprise scope  

---

## Before / after (deterministic, H1 · year 2026)

### CEO

**Q:** What are the three biggest risks for this hospital and what should management do?

| | Before | After |
|---|---|---|
| Focus mode | `clarification` (composer) / Emergency priorities (Vital Assist) | `hospital_wide_risk` |
| Answer | Clarification / ED wait·boarding·LWBS | Top ranked cross-domain risks + owners/actions |
| Preferred | Clarification / ED | Highest-ranked period risk action (e.g. ICU flow) |

### CFO

**Q:** Why are claims being denied and what should our CFO prioritize?

| | Before | After |
|---|---|---|
| Focus | Often ED via Vital Assist; composer focus OK but scenario weak | `rcm.gross_denial_rate` |
| Scenario | Often `ent-bed-assign-flow` default | `rcm-denials-down` |
| Owner | Emergency ops | Revenue Cycle / CFO office |

---

## Remaining limitations

- Deterministic pattern scoring — not an unrestricted LLM  
- Demo synthetic data — no invented cash losses or clinical causality  
- Hospital-wide top-3 depends on `riskIntelligence` thresholds for the selected hospital/period  
- Domain 1–15 Vital Assist still uses domain-local `answerQuestion` (by design)  
