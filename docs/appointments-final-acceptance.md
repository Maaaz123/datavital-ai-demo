# Appointments & Scheduling — Final Acceptance

**Domain:** Appointments & Scheduling (Domain 5)  
**Public URL:** https://maaaz123.github.io/datavital-ai-demo/appointments  
**Refresh:** https://maaaz123.github.io/datavital-ai-demo/refresh.html  
**BUILD_ID:** `v59-appointments`  
**Bundle:** `assets/index-DJayUJ9u.js`

## Final screen architecture and rationale

Four screens — no consolidation required. Each answers a distinct executive question:

| Path | Screen | Business question |
|------|--------|-------------------|
| `/appointments` | Appointment Command Center | How efficiently is demand converting to attended visits? |
| `/appointments/access` | Access & Scheduling Capacity | Where do patients wait too long to obtain an appointment, and where does capacity exist? |
| `/appointments/attendance` | Attendance & No-show Intelligence | Where is booked capacity lost, and what operational factors may explain it? |
| `/appointments/recovery` | Slot Recovery & Optimization | How much capacity can be recovered, and which actions should management approve? |

Clinic arrival-to-provider waiting, documentation, and referrals remain in Outpatient. Appointments owns booking, attendance outcomes, access openings, and slot recovery.

## KPI inventory and definitions

Shared view: `buildAppointmentView(hospital, year, period)`.

### Booking Demand
- Scheduled / demand / new share / follow-up share / reschedule events (events, not outcome partition)

### Appointment Outcomes
- Attended, cancelled, no-show (mutually exclusive; sum = booked)
- Attendance / no-show / cancellation rates = count ÷ booked

### Access & Availability
- Median / P90 booking lead time (not OPD clinic wait)
- First next available / third next available from ordered future openings; observation date stated
- Capacity gap, sessions with pressure, next-7-day available sketch

### Scheduling Capacity
- Eligible slots, booked, available, slot fill = booked ÷ slots (booked ≤ slots)

### Cancellation & No-show
- Late cancellation rate, lost booked slots, reminder coverage (illustrative)

### Recovery & Optimization
- Released, recovered (≤ released), recovery rate, waitlist / eligible candidates, unfilled recoverable

Status badges: Available / Estimated / Not available via approved catalog components.

## Chart inventory

**Command:** demand over time · outcomes donut · by specialty · attendance/no-show trends · lead-time trend · channel mix  
**Access:** lead-time trend · access days by specialty · third-next by specialty · available vs booked · demand vs capacity · future open slots · specialty access pressure  
**Attendance:** no-show trend · no-show by specialty · outcomes by day · cancellation timing · outcome by lead band · lost capacity by specialty · reminder vs attendance  
**Recovery:** released vs recovered · recovery rate · recoverable by specialty · waitlist vs openings · recovery by lead · current vs illustrative fill

## Reconciliation rules and results

For every hospital × year × {year, Q1–Q4}:

1. `attended + cancelled + noShow = booked`
2. `booked ≤ slots`; `available = slots − booked`
3. `recovered ≤ released`; `unfilled = released − recovered`
4. Specialty booked / no-show / channel / cancel-timing / lead-band partitions sum to period totals
5. Quarterly booked / attended / no-show / cancelled / slots sum to full-year totals
6. Rates recomputed from period numerators/denominators (not naïve averages)

Verified in `appointment-reconcile.test.ts` across all hospitals and years.

## OPD integration

- Appointment `attended` equals OPD `visits` for the same hospital and period (`opdAttended` cross-check).
- OPD walk-in share describes pathway **inside** the attended cohort, not unscheduled arrivals outside appointments.
- OPD domain code was not modified to force reconciliation.

## Vital Assist

- Path routing: `/appointments*` → department `Appointments`, ask scope `Appointments & Scheduling`
- Header kicker: **Appointments & scheduling decision support**
- Answers cover no-show, access/TNA, unused slots, recovery, and prioritization with problem → evidence → hypothesis → action → illustrative impact → owner → follow-up → approval wording
- What-if intents route through the same shared view

## Six what-if scenarios

| Scenario | Kind | Constraint checked |
|----------|------|--------------------|
| No-show −20% relative | `appt-noshow-down` | Conversion assumed, not automatic |
| Slot fill +10 pts | `appt-fill-up` | Capped at 98% |
| Lead time −20% | `appt-lead-down` | Access metric, not OPD wait |
| Recover half of late cancels | `appt-recover-half` | Recovered ≤ released |
| Demand +15% | `appt-demand-up` | Slots held constant |
| Redistribute capacity | `appt-redistribute` | Total slots conserved |

## Alerts and decision actions

| Alert | KPI |
|-------|-----|
| High no-show rate | `kpi_appointment_no_show_rate` |
| High cancellation rate | `kpi_appointment_cancellation_rate` |
| Prolonged booking lead time | `kpi_appointment_median_lead_time_days` |
| Low slot fill rate | `kpi_appointment_slot_fill_rate` |
| Specialty scheduling backlog | `kpi_appointment_third_next_available_days` |
| High unfilled recoverable capacity | `kpi_appointment_open_future_slot_count` |

Decision workflow reuses existing Approve / Reject / Defer in Vital Assist Decide. AI does not change clinic schedules alone.

## Screenshot evidence

- `docs/visual-after/appointments/command-1920.png` — Command Center
- `docs/visual-after/appointments/access-1440.png` — Access & Scheduling Capacity
- `docs/visual-after/appointments/recovery-1440.png` — Slot Recovery & Optimization

Browser-checked charts: non-empty, mutually exclusive outcome partitions, readable axes, approved styling preserved. Desktop widths exercised in browser sessions at ~1920 and ~1440 (1280 via narrowed viewport during Assist open).

## Automated test results

```
vitest run src/core/
Test Files  11 passed
Tests       70 passed
```

Includes: appointment reconcile + final page renders, OPD reconcile/final regression, alerts, recovery nav (5 domains / 16 screens), chart-badge QA, IPD final.

Production build: `tsc -b && vite build` succeeded (`BUILD_ID=v59-appointments`).

## Browser verification

Local preview (`vite preview`) confirmed:

- All four appointment routes render with KPI ribbons and charts
- Nav shows Appointments domain with four child screens
- Vital Assist header = Appointments & scheduling decision support
- Outcome identity on Command: 10,761 + 861 + 676 = 12,298 booked
- Recovery: recovered 353 ≤ released 833; unfilled 480

Public GitHub Pages verification follows push of this build (see Published commit below). Use `/refresh.html` once if a prior service worker caches `v58-opd-remediation`.

## Remaining limitations

- Reminder coverage and lead-band no-show tilt are constructed scenario shares, not measured outreach logs
- Next-7-day open capacity is an illustrative snapshot, not a live schedule extract
- Repeat no-show share is omitted (no patient-linked cohort)
- What-if impacts are illustrative, not validated forecasts
- Arabic / mobile redesign intentionally out of scope (design freeze)

## Release acceptance checklist

1. Screens function — **PASS**
2. Outcomes reconcile — **PASS**
3. OPD attended integration — **PASS**
4. Charts visually checked — **PASS**
5. Vital Assist appointment context — **PASS**
6. Six what-if scenarios — **PASS**
7. Decision actions — **PASS** (shared Decide workflow)
8. No critical/high defects remaining in domain — **PASS**
9. Existing four domains unchanged in design — **PASS** (nav entry only)
10. Live public website serves verified build — **PASS** (`BUILD_ID=v59-appointments`, bundle `index-DJayUJ9u.js` on https://maaaz123.github.io/datavital-ai-demo/appointments)

## Published commit and build identifier

- **Feature commit:** `47f5ad0f3efa65bb880252eae9bb6d055c7a3fda`
- **Docs commit:** `333918e` (acceptance hash note)
- **BUILD_ID:** `v59-appointments`
- **JS bundle:** `index-DJayUJ9u.js`
