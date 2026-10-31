# Strategy — Data Readiness

**BUILD_ID:** `v80-mvp-v1-remediation` (was v78 at domain launch)  
**Overall readiness:** **Demo Available / Scenario Only**  
**Production Source Verified:** **No** — never claimed for this domain.

| Capability | Readiness | Evidence |
|---|---|---|
| Contribution Margin formula | Demo Available | `operatingContribution = recognizedNetRevenue(RCM NPR) − eligibleDirectCost` + `st-rcm-revenue.test.ts` |
| Revenue lineage (RCM → SL → CM) | Demo Available | `recognizedNetRevenue === rcm.netPatientRevenue`; allocation identity |
| Capacity ladder (installed→used) | Demo Available | `identities` + capacity methodology |
| Workforce OT / agency separation | Demo Available | Distinct cost ledgers |
| Enterprise vs ICU staffing scopes | Demo Available | `st-icu-staffing.test.ts`; surplus ≠ auto ICU fill |
| Equipment available ≠ installed | Demo Available | Equipment utilization = used ÷ available |
| Cross-domain capacity inputs | Demo Available | `crossDomain` from RCM/ICU/SC/Surgery/OPD/Appt/Beds |
| Synthetic cost categories (10+) | Demo Available / Scenario Only | salaries…shared services — never ERP verified |
| Ten what-if scenarios | Scenario Only | `ST_OPPORTUNITY_IDS` non-additive / illustrative |
| Real payroll / CapEx ledger | Missing | Not connected |
| Real overhead allocation engine | Missing | Fully allocated margin not claimed |
| Production Source Verified attestation | Missing | Explicitly not claimed |

## Use constraints

- Recognized net revenue is RCM NPR (not an independent Strategy invent). Costs remain synthetic.  
- Fictional SAR amounts.  
- Contribution ≠ net profit; revenue ≠ profit; CM Rate ≠ second SAR duplicate.  
- Modeled contribution / CapEx benefits are illustrative — not achieved investment outcomes.  
- Do not sum overlapping scenario benefits.  
- AI does not approve CapEx, change rosters, or reallocate staff alone.  
- Prior-domain operational facts are inputs only — ownership unchanged.  
- Enterprise staffing surplus is not automatically ICU-eligible without credentials.
