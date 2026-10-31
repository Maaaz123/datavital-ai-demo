# Strategy — KPI Lineage

**BUILD_ID:** `v78-strategy-domain` · 48 owned KPIs · unique screen ownership enforced in `strategyOwnership.ts`.

Cross-domain rule: Strategy may **read** RCM net revenue, SC consumption, Surgery OR hours, OPD/appointment slots, and Beds staffed/occupied as **inputs**. It does **not** reassign primary KPI ownership from Domains 1–14.

| KPI ID | Full name | Owning screen | Numerator / input | Denominator / basis | Aggregation |
|---|---|---|---|---|---|
| kpi_st_operating_contribution | Operating Contribution | Command | Net revenue − eligible direct costs | — | Flow SAR |
| kpi_st_resource_utilization_index | Resource Utilization Index | Command | Composite used capacity | Available capacity | Index |
| kpi_st_capacity_constrained_sl | Capacity-Constrained Service Lines | Command | Lines demand > capacity | — | Count |
| kpi_st_service_line_cm | Service-Line Contribution Margin | Command | Aggregate CM | — | Flow SAR |
| kpi_st_avoidable_resource_cost | Avoidable Resource Cost Opportunity | Command | Scenario-linked avoidable | — | Modeled SAR |
| kpi_st_investment_opportunity_coverage | Investment Opportunity Coverage | Command | Documented candidates | Candidate set | Ratio |
| kpi_st_productive_clinical_hours | Productive Clinical Hours | Workforce | Productive hours | — | Flow hours |
| kpi_st_staffing_utilization | Staffing Utilization | Workforce | Productive hours | Staffed available hours | Ratio |
| kpi_st_overtime_exposure | Overtime Exposure | Workforce | OT hours × premium | — | Flow SAR |
| kpi_st_agency_staffing_cost | Agency Staffing Cost | Workforce | Agency spend | — | Flow SAR |
| kpi_st_staffing_capacity_gap | Staffing Capacity Gap | Workforce | Demand − staffed hours | — | Hours |
| kpi_st_workforce_allocation_opp | Workforce Allocation Opportunity | Workforce | Redeployable hours | — | Modeled hours |
| kpi_st_equipment_utilization | Equipment Utilization | Equipment | Used equip hours | Available operating hours | Ratio |
| kpi_st_available_operating_hours | Available Operating Hours | Equipment | Staffed+maintained hours | — | Flow hours |
| kpi_st_asset_downtime_exposure | Asset Downtime Exposure | Equipment | Downtime × opportunity cost | — | Modeled SAR |
| kpi_st_equipment_cost_per_proc | Equipment Cost per Eligible Procedure | Equipment | Maint + depreciation | Eligible procedures | Intensity |
| kpi_st_maintenance_cost_exposure | Maintenance Cost Exposure | Equipment | Maintenance spend | — | Flow SAR |
| kpi_st_equipment_capacity_gap | Equipment Capacity Gap | Equipment | Demand − available hours | — | Hours |
| kpi_st_effective_capacity | Effective Capacity | Capacity | Available after constraints | — | Hours |
| kpi_st_capacity_utilization | Capacity Utilization | Capacity | Used capacity | Effective available | Ratio |
| kpi_st_demand_capacity_gap | Demand-Capacity Gap | Capacity | Demand − effective capacity | — | Hours |
| kpi_st_redeployable_capacity | Redeployable Resource Capacity | Capacity | Unused eligible capacity | — | Hours |
| kpi_st_constrained_service_lines | Constrained Service Lines | Capacity | Hard-constrained lines | — | Count |
| kpi_st_allocation_opportunity | Allocation Opportunity | Capacity | Reallocable units | — | Modeled hours |
| kpi_st_net_revenue_by_sl | Net Revenue by Service Line | Service Lines | Recognized net revenue | — | Flow SAR |
| kpi_st_direct_cost_by_sl | Direct Cost by Service Line | Service Lines | Eligible direct costs | — | Flow SAR |
| kpi_st_sl_cm_rate | Service-Line CM Rate | Service Lines | Aggregate CM | Net revenue | Ratio |
| kpi_st_cost_per_eligible_encounter | Cost per Eligible Encounter | Service Lines | Direct cost | Encounters | Intensity |
| kpi_st_resource_cost_intensity | Resource Cost Intensity | Service Lines | Direct resource cost | Activity units | Index |
| kpi_st_sl_margin_variance | Service-Line Margin Variance | Service Lines | Actual CM − expected CM | — | Flow SAR |
| kpi_st_total_eligible_op_cost | Total Eligible Operating Cost | Cost Efficiency | Sum cost categories | — | Flow SAR |
| kpi_st_variable_cost_per_activity | Variable Cost per Activity | Cost Efficiency | Variable costs | Activity units | Intensity |
| kpi_st_fixed_cost_exposure | Fixed Cost Exposure | Cost Efficiency | Fixed/semi-fixed costs | — | Flow SAR |
| kpi_st_cost_variance | Cost Variance | Cost Efficiency | Actual − plan cost | — | Flow SAR |
| kpi_st_avoidable_cost_opportunity | Avoidable Cost Opportunity | Cost Efficiency | Scenario-linked avoidable | — | Modeled SAR |
| kpi_st_resource_efficiency_opp | Resource Efficiency Opportunity | Cost Efficiency | Utilization uplift model | — | Modeled SAR |
| kpi_st_candidate_expansion_ops | Candidate Expansion Opportunities | Expansion | Candidates under review | — | Count |
| kpi_st_estimated_capital_req | Estimated Capital Requirement | Expansion | Illustrative CapEx | — | Scenario SAR |
| kpi_st_incremental_opex | Incremental Operating Cost | Expansion | Illustrative OpEx | — | Scenario SAR |
| kpi_st_incremental_contribution | Incremental Contribution Potential | Expansion | Illustrative CM | — | Scenario SAR |
| kpi_st_capacity_benefit | Capacity Benefit | Expansion | Incremental capacity units | — | Scenario |
| kpi_st_investment_feasibility | Investment Feasibility | Expansion | Feasible candidates | Candidates | Ratio |
| kpi_st_addressable_contribution | Addressable Contribution Opportunity | Optimization | Scenario addressable CM | — | Modeled SAR |
| kpi_st_reallocation_potential | Reallocation Potential | Optimization | Reallocable hours | — | Modeled hours |
| kpi_st_scenario_capital_readiness | Scenario Capital Readiness | Optimization | Documented CapEx scenarios | Scenario set | Ratio |
| kpi_st_modeled_operating_impact | Modeled Operating Impact | Optimization | Scenario operating impact | — | Modeled SAR |
| kpi_st_decision_readiness | Decision Readiness | Optimization | Documented priority scenarios | Priority set | Ratio |
| kpi_st_priority_scenario_coverage | Priority Scenario Coverage | Optimization | Documented scenarios | Required set (10) | Ratio |

Ownership rule: Aggregate CM (SAR) is Command-only; Service Lines owns CM **rate** and by-line revenue/cost detail. Investment Feasibility is Expansion-only; Optimization owns Scenario Capital Readiness (distinct).
