# Inpatient volume content & scale fix (v54)

**Build ID:** `v54-ipd-dest-nonhome`  
**Verified:** local preview `http://127.0.0.1:4190/datavital-ai-demo/` via `refresh.html`

## Corrections

1. **Inpatient volume context** — bars are Transfers in / Transfers out only (shared zero baseline). Admissions & discharges remain on ribbon KPIs + admissions-over-time.
2. **Episode volume summary** — replaced with **Non-home episode exits** (Transfer out, Rehab/step-down, AMA, deaths) so the card answers a different management question.
3. **Discharge destinations (Stay)** — non-home destination **shares of discharges** (%); Home share stated in the note so transfer/rehab/AMA bars stay readable.
4. **Outcomes** — no further change; dual-series already split onto independent scales.

## Screenshots

| File | Screen |
|---|---|
| `before-ipd-snapshot.png` | Snapshot before (mixed large/small bars + duplicate volume) |
| `after-ipd-snapshot-v54.png` | Snapshot after |
| `after-ipd-stay-v54.png` | Stay after (destinations %) |
| `after-ipd-outcomes-v54.png` | Outcomes checked — no content change |

## Live measurements (preview)

| Chart | Y ticks | Bar heights (px) | Values |
|---|---|---|---|
| Volume context | 0 / 1,000 / 2,000 | 80.7 / 71.7 | 1,416 / 1,258 transfers |
| Non-home exits | 0 / 1,250 / 2,500 | 57.4 / 100.2 / 25.8 / 10.6 | 1,258 / 2,198 / 565 / 232 |
| Discharge destinations | 0 / 4 / 8 % | 57 / 99.8 / 25.7 | 4% / 7% / 2% (Home 87.2% in note) |
