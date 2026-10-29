# Appointments — KPI Deduplication & Text-Fit QA

**BUILD_ID:** `v61-appointments-dedup`  
**JS bundle:** `index-CvBkVSyj.js`  
**Local preview verified:** `http://127.0.0.1:4194/datavital-ai-demo/`  
**Screenshots:** `docs/visual-after/appointments-dedup/`

---

## 1. Screen-by-screen KPI inventory

### Command Center (`/appointments`)

| Before (display) | Classification | After (display) | Full business name |
|---|---|---|---|
| Scheduled Appointments | KEEP (shorten) | Scheduled | Scheduled Appointments |
| Attended Appointments | KEEP (shorten) | Attended | Attended Appointments |
| Attendance Rate | KEEP | Attendance Rate | Attendance Rate |
| No-show Appointments | REMOVE FROM DISPLAY | — (rate + Outcomes chart) | remains in indicator catalog / Assist |
| No-show Rate | KEEP | No-show Rate | No-show Rate |
| Cancelled Appointments | REMOVE FROM DISPLAY | — (rate + Outcomes chart) | remains in indicator catalog |
| Cancellation Rate | KEEP | Cancellation Rate | Cancellation Rate |
| Rescheduled Appointments | KEEP (shorten) | Rescheduled | Rescheduled Appointments |
| New Appointment Share | KEEP (shorten) | New Appt. Share | New Appointment Share |
| Follow-up Appointment Share | KEEP (shorten) | Follow-up Share | Follow-up Appointment Share |

**Final KPI count:** 8

### Access & Capacity (`/appointments/access`)

| Before | Classification | After | Full business name |
|---|---|---|---|
| Median Booking Lead Time | KEEP (shorten) | Median Lead Time | Median Booking Lead Time |
| P90 Booking Lead Time | KEEP (shorten) | P90 Lead Time | P90 Booking Lead Time |
| Third Next Available Appointment | KEEP (shorten) | 3rd Next Available | Third Next Available Appointment |
| Bookable Slots | KEEP | Bookable Slots | Bookable Slots |
| Booked Slots | REMOVE FROM DISPLAY | — (duplicates Command Scheduled; retained in Booked vs Unbooked chart + catalog) | Booked Slots |
| Unbooked Slots | KEEP | Unbooked Slots | Unbooked Slots (period unused ≠ 7-day openings) |
| Slot Fill Rate | KEEP | Slot Fill Rate | Slot Fill Rate |
| Capacity Shortfall | KEEP | Capacity Shortfall | Capacity Shortfall |
| High-Pressure Clinic Sessions | KEEP (shorten) | Pressure Sessions | High-Pressure Clinic Sessions |
| Next 7-Day Open Slots | KEEP (shorten) | 7-Day Open Slots | Next 7-Day Open Slots |

**Final KPI count:** 9

### Attendance & No-show (`/appointments/attendance`)

| Before | Classification | After | Notes |
|---|---|---|---|
| No-show Rate | KEEP | No-show Rate | Primary attendance-loss signal (also on Command) |
| No-show Appointments | KEEP (shorten) | No-show Count | Distinct volume drill-down for this screen |
| Cancellation Rate | REMOVE FROM DISPLAY | — | Owned by Command |
| Late Cancellation Rate | KEEP (shorten) | Late Cancel Rate | Distinct analytical purpose |
| Attendance Rate | REMOVE FROM DISPLAY | — | Owned by Command |
| Slots Lost to No-shows & Late Cancellations | KEEP (shorten) | Lost Slots | Full definition in KPI detail |
| Highest Specialty No-show Rate | KEEP (shorten) | Highest No-show Rate | Specialty name in delta + detail |
| Appointment Reminder Coverage | KEEP (shorten) | Reminder Coverage | |
| Rescheduling Events | REMOVE FROM DISPLAY | — | Owned by Command |
| Unscheduled Appointment Demand | REMOVE FROM DISPLAY | — | Owned by Recovery |

**Final KPI count:** 6

### Slot Recovery (`/appointments/recovery`)

| Before | Classification | After | Notes |
|---|---|---|---|
| Released Appointment Slots | KEEP (shorten) | Released Slots | |
| Rebooked Released Slots | KEEP (shorten) | Rebooked Slots | |
| Slot Recovery Rate | KEEP (shorten) | Recovery Rate | |
| Unscheduled Appointment Demand | KEEP (shorten) | Unscheduled Demand | Waitlist/recovery demand |
| Eligible Waitlist Candidates | KEEP (shorten) | Eligible Waitlist | |
| Potential Rebooking Opportunities | KEEP (shorten) | Rebooking Potential | Distinct rule; may equal waitlist in scenario |
| Unfilled Released Slots | KEEP (shorten) | Unfilled Releases | |
| Estimated Additional Recoveries | KEEP (shorten) | Potential Recoveries | Distinct from Unfilled Releases |
| Unbooked Slots | REMOVE FROM DISPLAY | — | Owned by Access; remains in Waitlist vs Openings chart |
| Slot Fill Rate | REMOVE FROM DISPLAY | — | Owned by Access; remains in Current vs Scenario Fill |

**Final KPI count:** 8

---

## 2. Removed duplicate KPI cards

- Command: No-show Count, Cancelled Count (rates + Outcomes donut retain the story)
- Access: Booked Slots (equals Command Scheduled)
- Attendance: Attendance Rate, Cancellation Rate, Rescheduled, Unscheduled Demand
- Recovery: Unbooked Slots, Slot Fill Rate

Underlying calculations in `buildAppointmentView` are unchanged.

---

## 3. Removed duplicate charts

| Removed | Screen | Reason | Retained owner |
|---|---|---|---|
| Booking Lead Time Trend | Command | Same monthly median lead series | Access → Lead Time Trend |

Command pack reflow: Attendance & No-show Trend paired with Bookings by Channel (no empty panel).

---

## 4–5. Final counts

| Screen | KPIs | Charts |
|---|---:|---:|
| Command Center | 8 | 5 (Demand vs Bookings, Outcomes, Specialty, Attendance & No-show Trend, Channel) |
| Access & Capacity | 9 | 7 |
| Attendance & No-show | 6 | 7 |
| Slot Recovery | 8 | 6 |
| **Total** | **31** | **25** |

---

## 6–7. Short-title and full-name mapping

Short titles are ribbon labels. Full business names, formulas, and limitations open in KPI Details (`data-testid="kpi-detail"`).

Verified: clicking **3rd Next Available** opens detail titled **Third Next Available Appointment** with illustrative-schedule limitation.

---

## 8. Comparison label changes

| Before | After |
|---|---|
| `No change vs baseline` | `No change` |
| `+X.X%` (prior-year relative) | `+X.X% YoY` |
| `+X.X pts` / signed rate delta | `+X.X pts` / `−X.X pts` |
| `Scenario share` | `Illustrative` |
| `Specialty max` | Specialty id in delta (e.g. `Ophthalmology`) |

---

## 9–10. Screenshot & text-fit evidence

| File | Width | Screen |
|---|---|---|
| `command-1440.png` | 1440 | Command |
| `access-1440.png` | 1440 | Access |
| `attendance-1440.png` | 1440 | Attendance |
| `recovery-1440.png` | 1440 | Recovery |
| `access-1280.png` | 1280 | Access (tightest ribbon) |

**CDP measure at 1280px Access ribbon:** all 9 titles = 1 line; all deltas `scrollWidth ≤ clientWidth`; no `vs bas…` ellipsis. Example: `3rd Next Available` / `No change` fully visible.

---

## 11. Calculation consistency

`appointment-reconcile.test.ts` — **PASS** (7). Outcome partition, specialty/weekday/lead bands, release ≤ recover, OPD attended match, what-if bounds, alert terminology unchanged in meaning.

---

## 12. Vital Assist regression

- KPI IDs / `buildAppointmentView` metrics unchanged.
- Alert investigation strings updated to shortened chart titles.
- What-if baselines still reference Slot Fill / Unbooked / Lead metrics even when Recovery ribbon no longer shows fill/unbooked cards.
- Assist header remains **Appointments & Scheduling Decision Support** (prior remediation).

---

## 13. Cross-domain regression

`recovery.test.tsx` — **PASS** (10): Emergency, Beds, Inpatient, Outpatient child pages still render. No approved-domain source edits in this cycle.

---

## 14–15. Deployment

| Item | Value |
|---|---|
| Feature commit | `aeb46f9` |
| BUILD_ID | `v61-appointments-dedup` |
| Bundle | `index-CvBkVSyj.js` |
| Production | https://maaaz123.github.io/datavital-ai-demo/ |
| Refresh | https://maaaz123.github.io/datavital-ai-demo/refresh.html |

Production verification: **PASS** — Pages serves `index-CvBkVSyj.js` / `v61-appointments-dedup`. Live Access shows `3rd Next Available` / `No change` with no clipping after refresh.

---

## 16. Remaining known issues / notes

- **Eligible Waitlist** and **Rebooking Potential** can equal in the current scenario (544). Definitions differ; values are not force-split.
- **No-show Rate** remains on both Command and Attendance by design (overview vs deep-dive primary signal).
- Performance Indicator catalog still shows full business names (correct — not ribbon headlines).

---

## PASS/FAIL gate

| Criterion | Result |
|---|---|
| Distinct KPI purpose per remaining card | **PASS** |
| No unnecessary duplicate headline KPIs | **PASS** |
| No duplicate lead-time chart on Command | **PASS** |
| Titles ≤ 2 lines (measured 1 line @1280) | **PASS** |
| Comparison labels fully visible | **PASS** |
| Chart titles match plotted series | **PASS** (incl. Cancellations by Lead Time) |
| Calculations reconcile | **PASS** |
| Vital Assist / alerts / what-if IDs stable | **PASS** |
| Approved domains untouched | **PASS** |
| Automated tests (26 appointment/recovery) | **PASS** |
| Live public build verified | **PASS** (`index-CvBkVSyj.js`, Access KPIs remapped) |
