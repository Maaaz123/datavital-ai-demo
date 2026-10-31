# Enterprise AI — Data Readiness

**Status:** Partial acceptance (Stages 1–7). Full acceptance deferred to Stage 8 deploy.

| Asset | Readiness | Evidence |
|---|---|---|
| Metric registry (≥30 metrics, 15+ domains) | Demo Available | `metricRegistry.ts` + registry tests |
| Knowledge graph edges | Demo Available | `knowledgeGraph.ts`; causalClaim guard |
| Reconciliation gate | Demo Available | RCM↔ST, ICU↔ST, SC bounds |
| Tool contracts (16 tools) | Demo Available | `tools.ts` + tools tests |
| Intent classifier (12) | Demo Available | Deterministic patterns; disclosed |
| Orchestrator + flagship path | Demo Available | `orchestrator.ts` + orchestrator test |
| Investigation RCA | Demo Available | Driver statuses; no false causality |
| Simulation / optimization | Scenario Only | Existing what-ifs; overlap rejection |
| Forecast hybrid | Demo Available / illustrative | Sparse → illustrative label |
| Decisions / outcomes | Scenario Only (demo state) | session/localStorage labeled |
| UX `/enterprise-ai*` | Demo Available | Pages + routes tests |
| LLM gateway | Disabled in public demo | Stub without backend |

## Acceptance draft checklist

- [x] Stages 2–7 code on `domain-16-enterprise-ai`
- [x] Tests for tools, intent, investigation, simulation, forecast, decisions, orchestrator, pages
- [x] Registry Stage 1 tests still green
- [x] Mode disclosure visible on UI
- [x] Stage 8 production deploy / BUILD_ID bump (`v81-enterprise-ai-domain`)
- [ ] Live hard-refresh verification on demo.datavital.io
