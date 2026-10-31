# Enterprise AI — Knowledge Graph

**Status:** Stages 1–7 (graph consumed by investigation + tools)  
**Code:** `frontend/src/core/enterpriseAi/knowledgeGraph.ts`  
**Consumers:** `retrieve_cross_domain_evidence`, `investigation.ts` driver statuses  
**Causal claims allowed:** `associative` \| `operational-link` only — **never** patient-level clinical causality.

## Edge schema

| Field | Meaning |
|---|---|
| `from` / `to` | Metric registry ids |
| `direction` | `→` or `↔` |
| `scope` | Hospital / period / cohort boundaries |
| `evidence` | Why the link exists in this demo |
| `join` | How domains are aligned (never invent encounter joins) |
| `interpretation` | Decision-safe reading |
| `confounders` | Known confounders |
| `causalClaim` | `associative` or `operational-link` |

## Seed edges (Stage 1)

1. **ED boarding ↔ Beds occupancy** — capacity pressure / placement (`ed-boarding-beds`)
2. **ED wait ↔ Beds occupancy** — associative pressure (`ed-wait-beds`)
3. **ICU required hours → ICU staffing gap** — credentialed nursing (`icu-demand-nursing-capacity`)
4. **ICU gap ↔ Enterprise staffing gap** — dual scopes, never force equality (`icu-gap-vs-enterprise-gap`)
5. **Surgery OR utilization → Beds occupancy** — postop capacity (`surgery-theatre-postop-beds`)
6. **Surgeries completed ↔ IPD admissions** — overlapping cohorts (`surgery-completed-ipd`)
7. **RCM NPR → Strategy contribution** — revenue → SL → CM (`revenue-sl-contribution`)
8. **Recognized revenue → CM rate** — rate ≠ SAR (`revenue-sl-cm-rate`)
9. **Supply availability ↔ Critical stockouts** — ops constraints (`supply-ops-constraints`)
10. **Stockouts ↔ Strategy contribution** — units vs synthetic SAR (`supply-strategy-consumption`)
11. **Validated events → Overdue CAPA** — investigation → action (`quality-investigation-capa`)
12. **CLABSI ↔ CAPA** — associative safety (`quality-clabsi-surveillance`)
13. **ED wait ↔ PX satisfaction** — correlation ≠ causation (`px-wait-satisfaction`)
14. **Denial rate ↔ NPR** — finance association (`denial-revenue-pressure`)

## Guardrail

Assist / what-if / future tools must cite `causalClaim` and refuse language that implies patient-level causality.
