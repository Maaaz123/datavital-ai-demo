# Domain 16 — Management Question Evaluation (80+)

**BUILD_ID:** `v82-enterprise-ai-executive`  
**Fixture:** `docs/enterprise-ai-management-questions.json`  
**Automated runner:** `frontend/src/core/enterpriseAi/enterpriseAi-management-eval.test.ts`  
**Also retained:** 50-question pack `docs/enterprise-ai-eval-questions.json` (249/249 criteria)

---

## Purpose

Evaluate executive management questions for:
1. Focus metric derivation (topic → registry metric; finance ≠ ED)
2. Ambiguous queries not silently defaulting to Emergency Waiting Time
3. Distinct scenario IDs for distinct interventions
4. Executive sections A–G when requested
5. Governance refusals (clinical / CapEx auto / unsupported ROI)
6. Sample orchestrate transcripts (finance, supply, flagship)

---

## Pack size

| Item | Count |
|---|---|
| Management questions (M01–M85) | **85** (≥80 required) |
| Roles covered | CEO/Board, COO, CFO, CMO/CNO |

---

## Method

Deterministic only:
- `resolveFocusFromQuestion(question)`
- `selectScenarioFromQuestion(question)`
- `classifyIntent(question)`
- Sample `orchestrate(...)` for flagship / sections / transcripts

Scoring: PASS/FAIL per expectation field. No invented quality percentages.

---

## Results (automated)

| Check | Result |
|---|---|
| Pack loads ≥80 questions | PASS |
| Focus/scenario/intent/refuse/section expectations | PASS (vitest) |
| Sample transcripts M01 (finance), M06 (supply), M18 (flagship) | PASS |
| Prior 50-question eval (249 criteria) | PASS |

Re-run:

```bash
cd frontend && npx vitest run src/core/enterpriseAi/enterpriseAi-management-eval.test.ts src/core/enterpriseAi/enterpriseAi-eval.test.ts
```

---

## Sample transcript expectations

| ID | Question theme | Expected focus / scenario |
|---|---|---|
| M01 | Denials rising | `rcm.*` ≠ `ed.wait.median_min` |
| M06 | Supply efficiency what-if | scenario `st-supply-efficiency` |
| M07 | Overtime reduction | scenario `st-reduce-overtime` |
| M04 | Denial reduction | scenario `rcm-denials-down` |
| M16/M17 | Ambiguous overview | clarification or hospital-wide risk — not silent ED |
| M18 | Flagship | multi-domain + executive A–G + no-staff preferred option |

---

## Limitations

- Pattern-based intent/focus — not unrestricted LLM NLU
- Scenario coverage limited to existing what-if engines
- Browser executive readability: see six-page browser QA (may be NOT TESTED until manual pass)
