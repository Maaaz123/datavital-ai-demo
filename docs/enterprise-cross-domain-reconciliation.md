# Enterprise Cross-Domain Reconciliation Report

**BUILD_ID:** `v79-enterprise-integration`  
**Scope:** Domains 1–15 + Enterprise Executive / Command surfaces  
**Rule:** Do not force totals to match when grains or populations differ. Document valid differences.  
**Data class:** Synthetic demonstration — **Demo Available**. **Not** Production Source Verified.

## Status legend

PASS = relationship validated or intentionally documented  
FAIL = unresolved contradictory totals  
NOT APPLICABLE = relationship not claimed in this release  
NOT TESTED = no automated or documented check in this phase

---

## 1. Inventory of domains

| # | Domain | Canonical view | Product-owner |
|---|---|---|---|
| 1 | Emergency | `four.tsx` / ED focus facts | Approved |
| 2 | Beds & Capacity | Beds census stocks | Approved |
| 3 | Inpatient Care | `ipdView` | Approved |
| 4 | Outpatient (OPD) | `opdView` | Approved |
| 5 | Appointments | `appointmentView` | Approved |
| 6 | Surgery | `surgeryView` | Approved |
| 7 | Radiology | `radiologyView` | Approved |
| 8 | Laboratory | `laboratoryView` | Approved |
| 9 | Pharmacy | `pharmacyView` | Approved |
| 10 | ICU | `icuView` | Approved |
| 11 | Patient Experience | `pxView` | Approved |
| 12 | Revenue Cycle (RCM) | `rcmView` | **NOT RECORDED** |
| 13 | Quality & Safety | `qsView` | **NOT RECORDED** |
| 14 | Supply Chain | `scView` | **NOT RECORDED** |
| 15 | Strategy | `stView` | **NOT RECORDED** |

Enterprise Executive (`/executive`) and Hospital Command (`/command`) **read** the above views. They do **not** own primary KPI definitions.

---

## 2. Relationship matrix (Part H §29 examples)

| Relationship | Expected link | Grain difference (intentional) | Result |
|---|---|---|---|
| ED admissions vs inpatient transfers / admissions | ED admitted count informs IPD inflow share | ED admissions ≠ all IPD admissions (elective / transfer-in excluded from ED) | **PASS** — documented difference |
| Bed census vs occupancy | Occupancy = occupied ÷ staffed (Beds) | Stocks (period-end / average) ≠ admission flows | **PASS** |
| Procedure volume vs operating theatre activity | Surgery completed cases ↔ OR hours / utilization | Cases ≠ OR hours; turnover and overtime separate | **PASS** |
| Diagnostic workload vs clinical referrals | Lab/Rad orders vs referring domain activity | Orders ≠ completed exams ≠ signed reports | **PASS** |
| Pharmacy consumption vs eligible medication events | Pharmacy dispense / admin vs clinical medication events | Dispense ≠ administration ≠ billed drug lines | **PASS** (domain-owned; not forced equal) |
| ICU patient-days vs eligible occupancy | ICU patient-days vs occupied / staffed beds | Patient-days ≠ admissions ≠ completed stays | **PASS** |
| RCM recognized revenue vs service-line revenue | Strategy reads RCM NPR as input; ST owns contribution | RCM NPR ≠ ST contribution; revenue ≠ profit | **PASS** |
| Supply consumption vs eligible cost allocation | ST may reference SC clinical consumption | Inventory value ≠ available units ≠ allocated cost | **PASS** |
| Staffing capacity vs clinical activity | ST staffing util / ICU staffing gap vs activity | Productive hours ≠ census; ratios descriptive | **PASS** |
| Equipment availability vs utilization | ST / Rad / Lab equipment hours | Installed ≠ staffed ≠ available ≠ used | **PASS** |
| Quality surveillance denominators vs eligible activity | QS events ÷ discharges / device-days | Surveillance denominators ≠ every clinical grain | **PASS** |
| Strategic resource costs vs direct / allocated pools | ST cost categories synthetic | Fully allocated margin not invented without overhead | **PASS** |

---

## 3. Executive / Command derivation checks

| Check | Result |
|---|---|
| Executive signals cite source domain + route + formula | **PASS** (`enterpriseSignalsAreDomainDerived`) |
| Priorities 3–5 with evidence + href | **PASS** (`enterprisePrioritiesAreEvidenceLinked`) |
| NPR / denial / QS / SC / ST / PX facts equal domain views | **PASS** (`enterprise-reconcile.test.ts`) |
| No independent fabricated executive totals | **PASS** |
| Command Center does not claim real-time | **PASS** (disclosure) |

---

## 4. Filter consistency (Part H §30)

| Rule | Result |
|---|---|
| Shared H1–H5 / All Hospitals / 2024–2026 / Full year / Q1–Q4 | **PASS** (existing showcase filters) |
| Flows aggregate over period | **PASS** (domain views) |
| Stocks use period-end / observation snapshots | **PASS** (Beds, SC inventory, AR closing) |
| Rates use eligible numerators / denominators | **PASS** |
| System rates not average of hospital % | **PASS** (weighted / ledger identities in domains) |
| Missing ≠ silent zero without status | **PASS** / domain-specific (see domain acceptance) |

---

## 5. Explicit non-equalities (do not “fix”)

1. ED arrivals ≠ inpatient admissions.  
2. Occupancy % ≠ patient volume.  
3. Gross charges ≠ net patient revenue ≠ cash ≠ contribution ≠ net profit.  
4. Inventory value ≠ available units.  
5. Purchase orders ≠ receipts ≠ payments.  
6. Safety reports ≠ validated harm.  
7. Contribution margin ≠ net profit.  
8. Domain what-if benefits are non-additive across overlapping scenarios.  
9. Strategy addressable contribution ≠ realized ROI.  
10. Executive ribbon values are pointers into domains — not a second ledger.

---

## 6. Open gaps

| Gap | Status |
|---|---|
| Record-level cross-domain patient identifiers | **NOT APPLICABLE** (aggregate synthetic demo) |
| Production source attestation | **NOT APPLICABLE** — never claimed |
| Domains 12–15 product-owner sign-off | **NOT RECORDED** |
| Live multi-hospital weighted enterprise roll-up beyond showcase “All” | Partially covered by domain views; enterprise page uses selected hospital scope |

---

## 7. Verdict

**PASS** for documented synthetic cross-domain reconciliation suitable for demonstration.  
**NOT** enterprise-ready for live hospital operations based on synthetic data alone.
