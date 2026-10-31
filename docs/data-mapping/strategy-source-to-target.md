# Strategy — Source to Target Mapping

**Domain 15** · BUILD_ID `v78-strategy-domain` · Demo Available (not Production Source Verified)

| Source domain / system | Source fact (input) | Strategy target | Join / grain | Notes |
|---|---|---|---|---|
| Revenue Cycle | Recognized net patient revenue | `netRevenue` / service-line revenue | hospital × period | Input only — RCM retains ownership |
| Supply Chain | Clinical consumption, avoidable procurement | Cost / efficiency opportunities | hospital × period | Input only — SC retains ownership |
| Surgery / OR | OR demand & capacity context | Effective capacity, OR-hour scenarios | hospital × period | Context — Surgery retains ownership |
| OPD / Appointments | Clinic demand / sessions | Clinic session scenarios | hospital × period | Context — OPD/Appts retain ownership |
| Beds / IPD / ICU | Census & acuity context | Capacity pressure | hospital × period | Context only |
| Radiology / Lab / Pharmacy | Diagnostic / meds intensity | Equipment & consumable cost intensity | hospital × period | Context only |
| ED / PX / Quality | Access, experience, safety constraints | Expansion clinical constraints | hospital × period | Context only |
| Synthetic cost model | Salaries…Other direct | Direct / operating cost | hospital × period | Auditable demo assumptions — not ERP |
| HR / roster (synthetic) | Productive, overtime, agency hours | Workforce KPIs | hospital × period | Not live payroll |
| Biomed (synthetic) | Installed / serviceable / downtime hours | Equipment KPIs | hospital × period | Installed ≠ serviceable |

Strategy does **not** reassign primary KPI ownership from Domains 1–14.
