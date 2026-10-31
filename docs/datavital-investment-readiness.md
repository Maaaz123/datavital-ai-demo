# DataVital AI — Investment Readiness

**BUILD_ID:** `v79-enterprise-integration`  
**Date:** 2026-10-30  
**Honesty rule:** Do **not** invent customer traction, funding raised, revenue, pilot ROI, or regulatory approvals.

---

## 1. Product problem statement

Medium-sized hospitals run on fragmented operational, clinical, financial, experience, quality, and supply systems. Leaders see delayed, inconsistent, or siloed metrics and struggle to move from observation to governed action. DataVital AI is a **hospital decision-intelligence layer**: Data → Intelligence → Decision → Action → Outcome — with human approval and explicit data limitations.

It is **not** an EMR replacement, autonomous clinical decision maker, or traditional BI dashboard wall.

---

## 2. Customer personas

| Persona | Primary need | Primary surfaces |
|---|---|---|
| CEO / Board | 30-second hospital condition + priorities | `/executive` |
| CFO | Revenue integrity, contribution discipline | `/rcm`, `/strategy` |
| COO / Ops Director | Actionable exceptions | `/command` + flow domains |
| CMO / CNO / Quality | Safety signals, overdue CAPA, HAI surveillance | `/quality` |
| Patient Experience lead | Satisfaction, complaints, journey | `/patient-experience` |
| Supply / procurement | Stockouts, OTD, waste | `/supply-chain` |
| Strategy / planning | Capacity, contribution, CapEx options | `/strategy` |

---

## 3. Differentiation hypothesis (unvalidated commercially)

1. **Cross-domain reconciliation** with documented grain differences rather than forced equality.  
2. **Decision workflow** (Vital Assist) that ends in human approval — not auto-action.  
3. **Honest AI posture**: what-ifs are illustrative; measured outcomes are separate.  
4. **Enterprise executive / COO surfaces** that cite owning domains instead of inventing totals.  
5. **Coverage breadth** across ops, diagnostics, pharmacy, ICU, PX, RCM, quality, supply, strategy in one demo architecture.

Competitive validation against incumbent BI, EMR analytics, and RCM vendors is **still required**.

---

## 4. Competitive validation needs

| Need | Status |
|---|---|
| Head-to-head feature / price comparison | Open |
| Buyer interviews (CEO/COO/CFO) | Open |
| Win/loss evidence | None recorded |
| Switching-cost analysis vs EMR native analytics | Open |

---

## 5. Product maturity

| Layer | Maturity |
|---|---|
| Synthetic multi-domain demonstration | High (15 domains + enterprise) |
| Technical acceptance packs | High for Domains 13–15; prior packs for 1–12 |
| Product-owner approval | Domains 1–11 approved; **12–15 NOT RECORDED** |
| Production source integrations | Not verified |
| Paid pilots / revenue | **Not claimed** |
| Regulatory clearances as a medical device | **Not claimed** |

---

## 6. Demonstrated AI capabilities (validated in demo)

| Capability | Evidence |
|---|---|
| Alert detection from KPI thresholds | Domain alert rules + Assist |
| Guided investigation narrative | Assist Investigate tab |
| Deterministic what-if sketches | Domain what-if libraries |
| Human approve / defer / reject | Assist Approvals |
| Cross-domain priority composition | Enterprise view from canonical facts |

---

## 7. Unvalidated AI capabilities

| Claim | Status |
|---|---|
| Predictive ML / certified forecasting | **Not validated** — what-ifs are deterministic sketches |
| Autonomous clinical recommendations | **Out of scope / not claimed** |
| Guaranteed infection / harm reduction from process uplifts | **Not validated** |
| Guaranteed cash recovery from RCM scenarios | **Not validated** (illustrative ≠ cash) |
| Achieved CapEx ROI from Strategy scenarios | **Not validated** |
| Production LLM grounded on real PHI with safety certification | **Not validated** in this demo |

---

## 8. Pilot requirements (investment-relevant)

See `docs/datavital-pilot-readiness.md`. Minimum: mapped HIS/ADT + at least one of RCM, quality, or supply for a scoped use case; security/privacy agreement; explicit product-owner domain approvals.

---

## 9. Deployment risks

| Risk | Mitigation direction |
|---|---|
| Data quality / identity joins | Dictionary + reconciliation gates before go-live |
| Over-claiming real-time | Keep period-scoped language until refresh proven |
| Clinical safety misinterpretation | Hard disclosures; no autonomous orders |
| Financial misinterpretation | Revenue ≠ profit; CM ≠ net profit |
| Scope creep across 15 domains | Pilot one vertical first |
| Silent “approval” of Domains 12–15 | Keep **NOT RECORDED** until PO signs |

---

## 10. Evidence needed for ROI claims

| Evidence | Required before ROI marketing |
|---|---|
| Baseline vs post-intervention KPI with same grain | Yes |
| Confounding controls / seasonality note | Yes |
| Cash / contribution measured from finance systems | Yes for financial ROI |
| Customer attestation | Yes |
| Exclusion of modeled what-if as “achieved” | Mandatory |

No ROI figure is published in this repository.

---

## 11. Commercialization dependencies

- Product-owner acceptance for Domains 12–15 and enterprise surfaces.  
- At least one reference pilot with measurable KPIs.  
- Security / privacy / contracting pack.  
- Pricing model (not defined here).  
- Support / implementation capacity.  
- Clear medical-device / decision-support regulatory posture for target markets.

---

## 12. Technical scalability considerations

| Topic | Note |
|---|---|
| Current architecture | Static GitHub Pages SPA + synthetic in-browser scenario engine |
| Path to production | Separate authenticated app + governed data platform (not this demo host) |
| Multi-hospital | Scenario already supports H1–H5 / ALL; real tenancy TBD |
| Performance | Aggregate ledgers scale differently than record-level EHR extracts |
| Extensibility | Ownership registries + additive domain pattern |

---

## 13. Open risks before investment fundraising

1. No recorded paid traction / revenue in this repo.  
2. Domains 12–15 PO approval **NOT RECORDED**.  
3. No Production Source Verified integrations.  
4. Competitive differentiation unvalidated with buyers.  
5. Regulatory pathway not finalized.  
6. Demo maturity must not be equated with enterprise production readiness.

---

## Recommendation

DataVital AI presents a **coherent synthetic enterprise demonstration** suitable for storytelling and pilot scoping under BUILD_ID `v79-enterprise-integration`. It is **not** investment-grade proof of traction, ROI, or regulatory readiness on its own. Fundraising materials must preserve these distinctions.
