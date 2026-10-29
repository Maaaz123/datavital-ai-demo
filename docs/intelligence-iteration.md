# DataVital AI — Intelligence & Business Experience Enhancement

## Delivery

| Item | Value |
|---|---|
| Commit | c9c589d05157126d8819384d33f6cc9779fc33be |
| Live URL | https://maaaz123.github.io/datavital-ai-demo/ |
| Hard refresh | https://maaaz123.github.io/datavital-ai-demo/refresh.html |
| Build ID | `v31-intelligence-ux` |
| Tests | 98/98 passed |
| CSS asset hash | unchanged (`index-BwUO8Xov.css`) — layout/theme freeze held |

## 1. Business terminology changes

| Before | After |
|---|---|
| Indicator scope | Performance indicators |
| Live / Built / Blank | Available / Estimated / Not available |
| Charted | Concrete business text (e.g. peak hours · see chart) |
| Not in scenario | Not available |
| 5 live · 1 blank · 5/6 counters | Removed from management screens |
| AI use cases + 10/10 / 12/12 meters | AI decision support (no coverage counters) |
| Current scope (Vital Assist home) | Decision support |

Disclosure preserved: *Illustrative hospital data and simulated AI insights — not live clinical or financial records.*

## 2. AI use cases improved

- Vital Assist **Review** now shows an 8-part investigation: What happened, Why it matters, Supporting evidence, Potential drivers, What may happen next, Recommended actions, Human review, Outcome monitoring.
- **Actions** includes problem, evidence, expected effect honesty, owner, priority, approval status, follow-up indicator, review timing.
- **Forecast** states horizon, inputs, method, range/uncertainty, limitations — no invented confidence scores.
- **Decide** supports Approve / Reject / Defer / Review; approvals isolated by hospital · year · domain · KPI; approval ≠ measured improvement.
- Ask tab uses prepared domain logic (not a live LLM) with suggested management questions.

## 3. Example investigations

**Emergency — door-to-provider wait**
- What happened: observed median vs full-year threshold (60 / 90).
- Drivers: peak arrival hours and acuity mix (hypotheses).
- Action: review peak hours against door-to-provider median.
- Owner: Emergency operations lead.

**Beds — occupancy / blocked / assignment**
- What happened: occupancy, vacant, blocked reconciliation; assignment median.
- Drivers: tightest wards and blocked share (hypotheses).
- Action: prioritize unallocated requests; accelerate blocked-bed readiness.
- Owner: Bed management lead.

**Inpatient — median LOS / 30-day returns**
- What happened: LOS distribution and ready-but-not-discharged sketch.
- Drivers: specialty long stays and discharge barriers (hypotheses).
- Guardrail: AI never declares medical readiness alone.

## 4. Domain-aware AI evidence

- Path → domain mapping: `/`, `/emergency/*` → Emergency; `/beds/*` → Beds; `/inpatient/*` → Inpatient.
- Out-of-domain questions are refused with ownership explanation (no silent KPI substitution).
- Cross-domain mentions are labeled; ownership does not move.

## 5. Recommendation & approval lifecycle

1. Alert opens → Review (8 steps).
2. Actions → structured recommendation.
3. Decide → Approve / Reject / Defer / Review.
4. Outcome → monitor follow-up indicator separately from estimated impact.
5. Switching hospital clears the other site’s decision isolation (verified in recovery test).

## 6. Visual freeze

- No new screens, no nav redesign, no palette/typography/layout CSS redesign.
- Primary stylesheet hash unchanged after rebuild.
- Baseline screenshot: `docs/visual-baseline/01-emergency-snapshot.png` (captured pre-change).
- After screenshot: `docs/visual-after/01-emergency-snapshot.png`.

## 7. Remaining limitations

- Prepared question matching, not a live LLM.
- Forecasts and what-if sketches are illustrative scenario logic only.
- Care-plan / consult / documentation clocks remain unavailable in IPD (honest blanks).
- Alert engine still evaluates **full-year** thresholds; period is labeled “Full year YYYY”.
- No validated predictive model accuracy is claimed.
