# Supply Chain — Data Readiness

**BUILD_ID:** `v80-mvp-v1-remediation` (was v77 at domain launch)  
**Overall readiness:** **Demo Available / Scenario Only**  
**Production Source Verified:** **No** — never claimed for this domain.  
**MVP note:** Rate bounds ≤100%, DOS units, inventory roll-forward hardened in remediation Phases 1–4.

| Capability | Readiness | Evidence |
|---|---|---|
| Inventory period-end snapshot | Demo Available | `buildScView` closing stocks |
| Stock movement flows | Demo Available | receipts, issues, returns, write-offs |
| PO / receipt / invoice / payment separation | Demo Available | Distinct counters + methodology text |
| Days of Supply unit formula | Demo Available | usable ÷ forecast daily demand + tests |
| Supplier OTD vs fill ownership | Demo Available | Ownership registry + tests |
| Waste disposition separation | Demo Available | disposition rows + Waste screen |
| Eight what-if scenarios | Scenario Only | `SC_OPPORTUNITY_IDS` non-additive |
| Real ERP / MMIS / AP feed | Missing | Not connected |
| Real contract repository | Missing | Not connected |
| Real barcode / lot/serial genealogy | Missing | Not connected |
| Production Source Verified attestation | Missing | Explicitly not claimed |

## Use constraints

- Synthetic aggregate ledger for demonstration.  
- Fictional SAR amounts.  
- Modeled recovery / avoidance is illustrative — not measured savings.  
- AI does not place POs, change safety stock, or approve suppliers alone.  
- Never cut clinically critical safety stock solely for carrying cost.
