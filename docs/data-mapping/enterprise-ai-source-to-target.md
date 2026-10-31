# Enterprise AI — Source to Target Mapping

**Status:** Stages 1–7  
**Rule:** Targets are semantic registry ids; sources are existing Domain 1–15 builders. No second warehouse.

| Target metric id | Source builder / field | Join keys | Notes |
|---|---|---|---|
| ed.wait.median_min | `buildEnterpriseView` → `facts.edWaitMedianMin` | hospital, year, period | ED door-to-provider |
| ed.arrivals | enterprise facts `edArrivals` | hospital, year, period | Flow total |
| ed.boarding.gt4h_rate | `boardingCount` / occupancy proxy | hospital, year | Year uses derived boarding |
| beds.occupancy | enterprise `facts.occupancy` | hospital, year, period | Beds stocks |
| beds.available / blocked | enterprise available/blocked | hospital, year, period | Period-end stock |
| icu.staffing_gap_hours | `buildIcuView.staffingGapHours` | hospital, year, period | Credentialed scope |
| st.icu_staffing_gap_hours | `buildStView.icuStaffingGapHours` | hospital, year, period | Must equal ICU (P1-005) |
| st.enterprise_staffing_gap_hours | Strategy enterprise gap | hospital, year, period | Distinct scope |
| rcm.net_patient_revenue | `buildRcmView.netPatientRevenue` | hospital, year, period | Authoritative NPR |
| st.recognized_net_revenue | `buildStView.recognizedNetRevenue` | hospital, year, period | === RCM NPR (P0-001) |
| ent.net_patient_revenue | enterprise facts NPR | hospital, year, period | Mirror — not third ledger |
| sc.supply_availability | `buildScView.supplyAvailability` | hospital, year, period | Rate ∈ [0,1] |
| sc.critical_stockouts | `buildScView.criticalStockouts` | hospital, year, period | Count |
| qs.* / px.* / surg.* / … | respective `build*View` | hospital, year, period | See metricRegistry |

## Tool / simulation sources

| Consumer | Source |
|---|---|
| `run_what_if` / simulation | `showcase/whatIf.ts` domain engines |
| Strategy opportunities | `buildStView().opportunities` (`ST_OPPORTUNITY_IDS`) |
| Forecast series | scenario months / enterprise monthly occupancy |
| Alerts | `alertsFor(hospital, year, period)` |
| Decisions / outcomes | sessionStorage/localStorage demo state only |
