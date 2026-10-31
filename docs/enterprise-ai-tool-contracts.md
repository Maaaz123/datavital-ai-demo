# Enterprise AI — Tool Contracts (Stage 2 stub)

**Status:** Skeleton only — Stage 2  
**Depends on:** Stage 1 registry, knowledge graph, reconciliation gate  
**Code (future):** tools that wrap `resolveMetric`, `listKnowledgeEdges`, `runStage1ReconciliationGate`

## Principles

1. Tools read **only** registry / existing `build*View` values.
2. Every numeric answer cites `metric.id`, hospital, year, period.
3. Cross-domain answers must pass or disclose reconciliation gate results.
4. Causal language limited to graph `causalClaim` (`associative` | `operational-link`).
5. What-if remains illustrative — never mutate historical domain ledgers.

## Planned tools (not implemented in Stage 1)

| Tool | Intent | Inputs | Outputs |
|---|---|---|---|
| `lookup_metric` | Resolve one registry metric | `id`, hospital, year, period | value + definition + readiness |
| `compare_metrics` | Same-scope comparison | ids[], scope | values + permittedComparisons check |
| `explain_edge` | Knowledge-graph hop | edge id or from/to | evidence, confounders, causalClaim |
| `reconcile_domains` | Run gate helpers | hospital, year, period | `{ ok, checks[] }` |
| `list_domain_metrics` | Catalog by owningDomain | domain | metric defs |

## Non-goals

- No free-form SQL against a second warehouse
- No clinical decision support / patient causality
- No production write-back

## Open questions for Stage 2

- Assist vs Copilot ownership of tool routing
- Whether what-if scenarios register as `Scenario Only` readiness automatically
- UI surface for gate failures (banner vs Assist refusal)
