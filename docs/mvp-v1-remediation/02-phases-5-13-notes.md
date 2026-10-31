# MVP V1 Remediation — Phases 5–13 Notes

**Branch:** `mvp-v1-remediation`  
**Depends on:** Phases 0–4 (`e2e3b95` area)

---

## Phase 5 — Quality & Safety

- Incident hierarchy intact: reported ≥ validated ≥ near-miss / harm; severe ≤ withHarm.
- CLABSI/CAUTI = events ÷ device-days × 1000; SSI = events ÷ procedures.
- Zero device-days / zero procedures → `incidenceDensity` / `procedureIncidence` return **null** (UI rate 0 + missing flags).
- CAPA methodology states closure ≠ harm reduction; effectiveness ≤ closed ≤ decided.
- SIR remains unavailable (not fabricated).
- Tests extended in `qs-reconcile.test.ts`.

## Phase 6 — Strategy cost model

- Revenue = RCM NPR (P0-001).
- Direct costs remain **synthetic**, documented in methodology; not ERP.
- SC clinical consumption linked as input units — **not** double-counted into ST consumables SAR.
- CapEx scenarios retain CapEx / OpEx / ramp / assumptions labels in opportunity meta.
- Lineage / readiness docs updated (Demo Available / Scenario Only — never Production Source Verified).

## Phase 7 — Cross-domain reconciliation

- CSV: `cross-domain-reconciliation.csv` (15 mandatory pairs).
- Test: `enterprise-cross-domain.test.ts` — H1–H5+ALL × 2024–2026 × year; sampled quarters.

## Phases 8–9 — Executive / Command

- Net Revenue / denial / contribution / QS CAPA / SC availability read from owners.
- Staffing exceptions show ICU + enterprise scopes.
- Disclosure: not live real-time; not Production Source Verified.

## Phase 10 — Vital Assist

- Enterprise department grounded via `answerEnterprise`.
- Classification in `ai-capability-evidence.md`.

## Phase 11 — What-if

- Matrix: `what-if-test-matrix.csv` (8 QS + 8 SC + 10 ST + enterprise demo).
- Enterprise scenario `ent-ed-congestion` implemented.

## Phase 12 — UI/UX

- 80 primary screen routes counted (index + 79 paths).
- SC axis truncation improved.
- `visual-qa-matrix.csv` — 80 × 3 viewports = 240 rows; honest NOT TESTED pending browser.

## Phase 13 — Lineage

- Strategy / SC / enterprise readiness: Demo Available | Partially Mapped | Missing | Scenario Only only.
