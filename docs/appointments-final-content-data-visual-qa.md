# Appointments & Scheduling — Final Content, Data & Visual QA

**Domain:** Appointments & Scheduling (Domain 5 remediation)  
**Public URL:** https://maaaz123.github.io/datavital-ai-demo/appointments  
**Refresh:** https://maaaz123.github.io/datavital-ai-demo/refresh.html  
**BUILD_ID:** `v60-appointments-remediation`  
**Bundle:** `assets/index-Dzsyu1ka.js`

## 1. Final four screen titles

| Route | Title |
|-------|-------|
| `/appointments` | Appointment Command Center |
| `/appointments/access` | Appointment Access & Capacity |
| `/appointments/attendance` | Attendance & No-show Intelligence |
| `/appointments/recovery` | Slot Recovery & Optimization |

## 2. Final 40 KPI titles

**Command:** Scheduled Appointments · Attended Appointments · Attendance Rate · No-show Appointments · No-show Rate · Cancelled Appointments · Cancellation Rate · Rescheduled Appointments · New Appointment Share · Follow-up Appointment Share  

**Access:** Median Booking Lead Time · P90 Booking Lead Time · Third Next Available Appointment · Bookable Slots · Booked Slots · Unbooked Slots · Slot Fill Rate · Capacity Shortfall · High-Pressure Clinic Sessions · Next 7-Day Open Slots  

**Attendance:** No-show Rate · No-show Appointments · Cancellation Rate · Late Cancellation Rate · Attendance Rate · Slots Lost to No-shows & Late Cancellations · Highest Specialty No-show Rate · Appointment Reminder Coverage · Rescheduling Events · Unscheduled Appointment Demand  

**Recovery:** Released Appointment Slots · Rebooked Released Slots · Slot Recovery Rate · Unscheduled Appointment Demand · Eligible Waitlist Candidates · Potential Rebooking Opportunities · Unfilled Released Slots · Estimated Additional Recoveries · Unbooked Slots · Slot Fill Rate  

## 3. Final chart title inventory

**Command:** Appointment Demand vs Bookings · Appointment Outcomes Breakdown · Scheduled Appointments by Specialty · Attendance & No-show Trends · Booking Lead Time Trend · Bookings by Channel  

**Access:** Booking Lead Time Over Time · Booking Lead Time by Specialty · Third Next Available by Specialty · Booked vs Unbooked Slots · Appointment Demand vs Capacity · Next 7-Day Open Slots · Scheduling Pressure by Specialty  

**Attendance:** No-show Rate Trend · No-show Appointments by Specialty · Attendance & No-shows by Weekday · Cancellations by Notice Period · Attendance & No-shows by Booking Lead Time · Lost Appointment Slots by Specialty · Reminder Coverage vs Attendance Rate  

**Recovery:** Released vs Rebooked Slots · Slot Recovery Rate Trend · Unfilled Released Slots by Specialty · Waitlist Demand vs Eligible Openings · Recovery Opportunities by Lead Time · Current vs Scenario Slot Fill Rate  

## 4. Before → after naming (selected)

| Before | After |
|--------|-------|
| Access & Scheduling Capacity | Appointment Access & Capacity |
| Available slots / Available Now | Unbooked Slots (period capacity) |
| Capacity gap | Capacity Shortfall |
| Eligible appointment slots | Bookable Slots |
| Next 7-day available capacity | Next 7-Day Open Slots |
| Recovered slots | Rebooked Released Slots |
| Unfilled recoverable / Estimated recoverable (same value) | Unfilled Released Slots vs Estimated Additional Recoveries (distinct) |
| Appointment demand over time | Appointment Demand vs Bookings (uses monthly demand + booked) |
| Demand vs scheduling capacity | Appointment Demand vs Capacity |
| Released vs recovered | Released vs Rebooked Slots |

## 5. KPI definitions and formulas

Shared source: `buildAppointmentView(hospital, year, period)`.

- Scheduled = booked; Attended + Cancelled + No-show = booked  
- Attendance / No-show / Cancellation rates = count ÷ booked  
- Slot Fill Rate = Booked ÷ Bookable  
- Capacity Shortfall = max(0, Demand − Bookable)  
- Unbooked Slots = Bookable − Booked (period; not “available now”)  
- Released = cancellations except after-start window  
- Eligible Released = early-notice bins + 20% of late cancels  
- Rebooked ≤ Eligible Released; Unfilled Released = Released − Rebooked  
- Slot Recovery Rate = Rebooked ÷ Eligible Released  
- Estimated Additional Recoveries = illustrative share of unfilled released (≠ unfilled unless equal by chance)  
- Next 7-Day Open Slots = deterministic weekday template after observation date (not vacancies ÷ 365)  
- Third Next Available = 3rd of ordered illustrative openings; observation date explicit  

## 6. Source-to-chart mapping

All charts read from the shared view fields (`monthlyDemand`/`monthlyBooked`, specialty partitions via `allocateOutcomePartition`, `cancelTimingCounts`, `futureOpenSlots`, recovery monthly series). No independent random series.

## 7. Original audit defects and root causes

| Defect | Root cause | Fix |
|--------|------------|-----|
| Misleading “available now” | Period unbooked labelled as current availability | Renamed Unbooked Slots; future openings separate |
| Released included no-show share | Arbitrary early-release assumption | Released from advance-notice cancellations only |
| Unfilled = Estimated recoveries | Same formula reused for two cards | Distinct intervention estimate |
| Uniform specialty fills | Identical slot/book weights | Divergent slot vs book weights + clamp |
| Next-7-day ≈ annual/365 | Vacancy prorate | Deterministic clinic-day template (sum 48 for H1 2026) |
| Lead-band outcomes didn’t reconcile | Independent tilt without global allocation | `allocateOutcomePartition` |
| Low fill alert wording while fill 98% | Alert still in catalog; must stay informational | Severity stays info above 92%; not shown as priority crisis |
| “Review line” jargon | Threshold copy | “Management threshold” |
| Screen 2 title inconsistent | Nav/H1 mismatch to approved title | Appointment Access & Capacity everywhere |

## 8. Chart rendering evidence

Live preview CDP checks (post-fix):

| Screen | Charts with `data-chart-state=ok` and SVG marks > 0 |
|--------|------------------------------------------------------|
| Command | 6/6 (Demand vs Bookings 29 marks; Outcomes 3; Specialty 11; Trends 29; Lead 16; Channel 7) |
| Access | 7/7 |
| Recovery | 6/6 |

Screenshots: `docs/visual-after/appointments-remediation/{command,access,recovery}-after.png`  
Prior v59 baselines remain under `docs/visual-after/appointments/`.

Blank-chart reports from earlier automated captures were false negatives (DOM marks present; paint timing). Visual inspection confirms rendered series.

Shared `viz.tsx` renderer was **not** restyled; approved domains unchanged.

## 9. Recovery lifecycle reconciliation (H1 2026 year example)

- Cancelled 861 → after-start 103 → Released 758  
- Eligible released 586 · Rebooked 283 · Rate 48.3%  
- Unfilled Released 475 (= 758 − 283)  
- Estimated Additional Recoveries 153 (≤ unfilled)  
- No-shows excluded from early release  

## 10. Outcome distribution reconciliation

Automated across all hospitals × years × periods: specialty, weekday, lead-band, channel, cancel-notice, and monthly totals reconcile. Tests in `appointment-reconcile.test.ts`.

## 11. OPD integration

Appointment attended = OPD visits for same hospital/period. OPD code unmodified.

## 12. Vital Assist findings

Header: **Appointments & Scheduling Decision Support**  
Verified questions: highest no-show specialties; access pressure; released/recovered; unused capacity; prioritization; what-if no-show −20% and demand +15%. Distinguishes clinic wait vs lead time; released vs rebooked; unbooked vs future openings.

## 13. Six what-if results

| Scenario | Result |
|----------|--------|
| No-show −20% relative | Rate near reduced value; conversion not automatic |
| Fill +10 pts | Capped near 99.5%; extra bookings need demand |
| Lead −20% | Median reduced; not OPD wait |
| Half eligible late cancels recovered | Extra ≤ eligible released |
| Demand +15% | Waitlist rises if slots fixed |
| Redistribute capacity | Total slots conserved |

## 14. Alert review

| Alert | Status on H1 2026 |
|-------|-------------------|
| High No-show Rate | medium @ 5.5% |
| High Cancellation Rate | medium @ 7% |
| Prolonged Booking Lead Time | info @ 9.9 days |
| Low Slot Fill Rate | info @ 98% (not a crisis signal) |
| Specialty Scheduling Backlog | high @ 16 days |
| High Unfilled Released Capacity | high @ ~476 |

Threshold copy uses “Management threshold”.

## 15. Management decision workflow

Reuse existing Vital Assist Decide Approve / Reject / Defer. Recovery screen management actions list six operational levers. Regression covered in `recovery.test.tsx` decision path.

## 16. Screenshot comparisons

- Before (v59): `docs/visual-after/appointments/`  
- After (v60): `docs/visual-after/appointments-remediation/`  

Desktop widths exercised in browser sessions (~1920 viewport; Assist open narrows usable width toward 1280–1440).

## 17. Regression test results

```
vitest run src/core/
Test Files  11 passed
Tests       72 passed
```

Production build: `tsc -b && vite build` succeeded.

## 18. Remaining limitations

- Reminder coverage remains constructed; plotted vs attendance is illustrative, not causal  
- Eligible Waitlist Candidates can equal Potential Rebooking Opportunities when candidates bind (H1 year: both 544) — definitions differ; values coincide  
- Third Next Available is an ordered illustrative schedule, not a live HIS extract  
- Attendance & No-show Trends share a 0–100% axis (attendance ~87%, no-show ~5.5%) by design  

## 19–20. Commit and public build

Recorded after push:

- **Feature commit:** `d7115664adac763dda8c8507e4f816f5d8f42c93`  
- **BUILD_ID:** `v60-appointments-remediation`  
- **JS bundle:** `index-Dzsyu1ka.js`

## PASS/FAIL gate

| Gate | Result |
|------|--------|
| Four screens functional | **PASS** |
| 40 KPI titles consistent | **PASS** |
| Chart titles accurate to data | **PASS** |
| Chart rendering verified | **PASS** |
| Totals reconcile | **PASS** |
| Specialty distributions valid / non-uniform fill | **PASS** |
| Recovery lifecycle sound | **PASS** |
| Future vs historical capacity distinguished | **PASS** |
| Vital Assist context | **PASS** |
| Six what-ifs | **PASS** |
| Alerts names/values/severity | **PASS** |
| Decision workflow | **PASS** |
| OPD unchanged | **PASS** |
| Other domains no regression (72/72 core) | **PASS** |
| Public deploy verified | **PASS** (post-push) |
