/** Stable Strategy (Resource / Profitability / Expansion) KPI ownership — each primary ID has exactly one owning screen. */

export type StScreenId =
  | 'command'
  | 'workforce'
  | 'equipment'
  | 'capacity'
  | 'service-lines'
  | 'cost-efficiency'
  | 'expansion'
  | 'optimization';

export type StKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: StScreenId;
  route: string;
  decision: string;
};

export const ST_KPI_OWNERS: StKpiOwner[] = [
  // Command — executive resource & profitability health
  { id: 'kpi_st_operating_contribution', fullName: 'Operating Contribution', display: 'Operating Contribution', screen: 'command', route: '/strategy', decision: 'Recognized net revenue (RCM NPR) − eligible direct costs (contribution — not net profit). Zero-revenue lines yield zero contribution, not invented profit.' },
  { id: 'kpi_st_resource_utilization_index', fullName: 'Resource Utilization Index', display: 'Resource Utilization', screen: 'command', route: '/strategy', decision: 'Used capacity ÷ available capacity across workforce + equipment + clinical slots (composite index)' },
  { id: 'kpi_st_capacity_constrained_sl', fullName: 'Capacity-Constrained Service Lines', display: 'Constrained Lines', screen: 'command', route: '/strategy', decision: 'Service lines where demand exceeds available operational capacity at observation (executive count)' },
  { id: 'kpi_st_service_line_cm', fullName: 'Contribution Margin Rate', display: 'CM Rate', screen: 'command', route: '/strategy', decision: 'Operating contribution ÷ recognized net revenue (RCM NPR). Distinct from Operating Contribution SAR. ≠ net profit; ≠ fully allocated margin.' },
  { id: 'kpi_st_avoidable_resource_cost', fullName: 'Avoidable Resource Cost Opportunity', display: 'Avoidable Resource Cost', screen: 'command', route: '/strategy', decision: 'Illustrative avoidable overtime + idle-equipment + excess agency exposure in fictional SAR (scenario-linked — not measured savings)' },
  { id: 'kpi_st_investment_opportunity_coverage', fullName: 'Investment Opportunity Coverage', display: 'Investment Coverage', screen: 'command', route: '/strategy', decision: 'Candidate expansion opportunities with documented CapEx/OpEx assumptions ÷ total candidate opportunities (illustrative)' },

  // Workforce
  { id: 'kpi_st_productive_clinical_hours', fullName: 'Productive Clinical Hours', display: 'Productive Hours', screen: 'workforce', route: '/strategy/workforce', decision: 'Paid clinical hours excluding non-productive paid time (training, meeting, leave) in the period' },
  { id: 'kpi_st_staffing_utilization', fullName: 'Staffing Utilization', display: 'Staffing Utilization', screen: 'workforce', route: '/strategy/workforce', decision: 'Productive clinical hours ÷ staffed available hours (staffed ≠ installed roster headcount)' },
  { id: 'kpi_st_overtime_exposure', fullName: 'Overtime Exposure', display: 'Overtime Exposure', screen: 'workforce', route: '/strategy/workforce', decision: 'Overtime hours × overtime premium cost in fictional SAR (direct variable workforce cost)' },
  { id: 'kpi_st_agency_staffing_cost', fullName: 'Agency Staffing Cost', display: 'Agency Cost', screen: 'workforce', route: '/strategy/workforce', decision: 'Agency / locum spend in fictional SAR for eligible clinical roles in the period' },
  { id: 'kpi_st_staffing_capacity_gap', fullName: 'Staffing Capacity Gap', display: 'Staffing Gap', screen: 'workforce', route: '/strategy/workforce', decision: 'Enterprise-wide demand hours − staffed available hours (positive = shortfall). Distinct from ICU credentialed nurse-hour gap; enterprise surplus ≠ automatic ICU fill.' },
  { id: 'kpi_st_workforce_allocation_opp', fullName: 'Workforce Allocation Opportunity', display: 'Allocation Opportunity', screen: 'workforce', route: '/strategy/workforce', decision: 'Illustrative productive hours redeployable across eligible units under credentialing constraints — not measured FTE cut; not automatic ICU fill' },

  // Equipment
  { id: 'kpi_st_equipment_utilization', fullName: 'Equipment Utilization', display: 'Equipment Utilization', screen: 'equipment', route: '/strategy/equipment', decision: 'Used equipment hours ÷ available operating hours (available ≠ installed calendar hours)' },
  { id: 'kpi_st_available_operating_hours', fullName: 'Available Operating Hours', display: 'Available Hours', screen: 'equipment', route: '/strategy/equipment', decision: 'Staffed + maintained equipment hours available for clinical use (excludes downtime and unstaffed slots)' },
  { id: 'kpi_st_asset_downtime_exposure', fullName: 'Asset Downtime Exposure', display: 'Downtime Exposure', screen: 'equipment', route: '/strategy/equipment', decision: 'Unplanned + planned downtime hours × illustrative opportunity cost in fictional SAR' },
  { id: 'kpi_st_equipment_cost_per_proc', fullName: 'Equipment Cost per Eligible Procedure', display: 'Cost per Procedure', screen: 'equipment', route: '/strategy/equipment', decision: '(Maintenance + depreciation attributable to equipment) ÷ eligible procedures — direct equipment cost intensity' },
  { id: 'kpi_st_maintenance_cost_exposure', fullName: 'Maintenance Cost Exposure', display: 'Maintenance Cost', screen: 'equipment', route: '/strategy/equipment', decision: 'Period maintenance spend (planned + unplanned) in fictional SAR' },
  { id: 'kpi_st_equipment_capacity_gap', fullName: 'Equipment Capacity Gap', display: 'Equipment Gap', screen: 'equipment', route: '/strategy/equipment', decision: 'Demand equipment hours − available operating hours (positive = shortfall)' },

  // Capacity
  { id: 'kpi_st_effective_capacity', fullName: 'Effective Capacity', display: 'Effective Capacity', screen: 'capacity', route: '/strategy/capacity', decision: 'Operational available capacity after staffing, equipment readiness, and schedule constraints (≠ installed capacity)' },
  { id: 'kpi_st_capacity_utilization', fullName: 'Capacity Utilization', display: 'Capacity Utilization', screen: 'capacity', route: '/strategy/capacity', decision: 'Used capacity ÷ effective available capacity' },
  { id: 'kpi_st_demand_capacity_gap', fullName: 'Demand-Capacity Gap', display: 'Demand-Capacity Gap', screen: 'capacity', route: '/strategy/capacity', decision: 'Period demand units − effective capacity units (positive = unmet demand pressure)' },
  { id: 'kpi_st_redeployable_capacity', fullName: 'Redeployable Resource Capacity', display: 'Redeployable Capacity', screen: 'capacity', route: '/strategy/capacity', decision: 'Unused available capacity eligible for reallocation under credentialing / asset constraints' },
  { id: 'kpi_st_constrained_service_lines', fullName: 'Constrained Service Lines', display: 'Constrained Lines', screen: 'capacity', route: '/strategy/capacity', decision: 'Service lines with hard demand > available operational capacity (operational screen count — complements Command executive view)' },
  { id: 'kpi_st_allocation_opportunity', fullName: 'Allocation Opportunity', display: 'Allocation Opportunity', screen: 'capacity', route: '/strategy/capacity', decision: 'Illustrative capacity units reallocable to constrained lines under documented constraints' },

  // Service-lines — Command owns Operating Contribution (SAR) + CM Rate; this screen owns by-line revenue/cost detail + by-line rate/variance
  { id: 'kpi_st_net_revenue_by_sl', fullName: 'Net Revenue by Service Line', display: 'Net Revenue', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Recognized net revenue (allocated from RCM NPR) across service lines in fictional SAR (revenue ≠ profit)' },
  { id: 'kpi_st_direct_cost_by_sl', fullName: 'Direct Cost by Service Line', display: 'Direct Cost', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Eligible direct costs by service line (salaries, overtime, agency, consumables, drugs, maintenance, depreciation where attributable)' },
  { id: 'kpi_st_sl_cm_rate', fullName: 'Service-Line Contribution Margin Rate', display: 'By-Line CM Rate', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Weighted / by-line contribution margin rate = CM ÷ recognized net revenue. Command owns executive CM Rate; this screen owns by-line rate detail + variance. Zero revenue → rate treated as 0, not invented.' },
  { id: 'kpi_st_cost_per_eligible_encounter', fullName: 'Cost per Eligible Encounter', display: 'Cost per Encounter', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Eligible direct cost ÷ eligible encounters' },
  { id: 'kpi_st_resource_cost_intensity', fullName: 'Resource Cost Intensity', display: 'Cost Intensity', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Direct resource cost ÷ productive clinical activity units (intensity index)' },
  { id: 'kpi_st_sl_margin_variance', fullName: 'Service-Line Margin Variance', display: 'Margin Variance', screen: 'service-lines', route: '/strategy/service-lines', decision: 'Actual CM − expected CM under published intensity assumptions (fictional SAR)' },

  // Cost-efficiency
  { id: 'kpi_st_total_eligible_op_cost', fullName: 'Total Eligible Operating Cost', display: 'Eligible OpEx', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Sum of eligible operating cost categories in fictional SAR (not fully allocated hospital P&L)' },
  { id: 'kpi_st_variable_cost_per_activity', fullName: 'Variable Cost per Activity', display: 'Variable Cost / Activity', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Variable eligible costs ÷ activity units' },
  { id: 'kpi_st_fixed_cost_exposure', fullName: 'Fixed Cost Exposure', display: 'Fixed Cost Exposure', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Fixed / semi-fixed eligible costs (facility, depreciation, shared services share) in fictional SAR' },
  { id: 'kpi_st_cost_variance', fullName: 'Cost Variance', display: 'Cost Variance', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Actual eligible cost − plan / standard eligible cost in fictional SAR' },
  { id: 'kpi_st_avoidable_cost_opportunity', fullName: 'Avoidable Cost Opportunity', display: 'Avoidable Cost', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Illustrative avoidable overtime + wasteful consumable + excess agency cost (scenario-linked)' },
  { id: 'kpi_st_resource_efficiency_opp', fullName: 'Resource Efficiency Opportunity', display: 'Efficiency Opportunity', screen: 'cost-efficiency', route: '/strategy/cost-efficiency', decision: 'Illustrative efficiency gain from utilization uplift without claiming net-profit outcomes' },

  // Expansion
  { id: 'kpi_st_candidate_expansion_ops', fullName: 'Candidate Expansion Opportunities', display: 'Expansion Candidates', screen: 'expansion', route: '/strategy/expansion', decision: 'Documented expansion / CapEx candidates under review at observation' },
  { id: 'kpi_st_estimated_capital_req', fullName: 'Estimated Capital Requirement', display: 'Capital Requirement', screen: 'expansion', route: '/strategy/expansion', decision: 'Illustrative CapEx for candidate expansions in fictional SAR — not approved investment' },
  { id: 'kpi_st_incremental_opex', fullName: 'Incremental Operating Cost', display: 'Incremental OpEx', screen: 'expansion', route: '/strategy/expansion', decision: 'Illustrative incremental OpEx (workforce + consumables + facility) for candidates' },
  { id: 'kpi_st_incremental_contribution', fullName: 'Incremental Contribution Potential', display: 'Incremental Contribution', screen: 'expansion', route: '/strategy/expansion', decision: 'Illustrative incremental contribution (not net profit) under revenue and ramp-up assumptions' },
  { id: 'kpi_st_capacity_benefit', fullName: 'Capacity Benefit', display: 'Capacity Benefit', screen: 'expansion', route: '/strategy/expansion', decision: 'Illustrative incremental effective capacity units from candidates' },
  { id: 'kpi_st_investment_feasibility', fullName: 'Investment Feasibility', display: 'Investment Feasibility', screen: 'expansion', route: '/strategy/expansion', decision: 'Share of candidates meeting illustrative CapEx / OpEx / ramp / contribution feasibility gates' },

  // Optimization — Investment Feasibility owned on Expansion; this screen uses scenario readiness
  { id: 'kpi_st_addressable_contribution', fullName: 'Addressable Contribution Opportunity', display: 'Addressable Contribution', screen: 'optimization', route: '/strategy/optimization', decision: 'Illustrative contribution addressable under documented what-if assumptions — not measured improvement' },
  { id: 'kpi_st_reallocation_potential', fullName: 'Reallocation Potential', display: 'Reallocation Potential', screen: 'optimization', route: '/strategy/optimization', decision: 'Illustrative capacity / workforce hours reallocable without new CapEx' },
  { id: 'kpi_st_scenario_capital_readiness', fullName: 'Scenario Capital Readiness', display: 'Capital Readiness', screen: 'optimization', route: '/strategy/optimization', decision: 'Share of modeled investment scenarios with complete CapEx/OpEx/ramp documentation (distinct from Expansion Investment Feasibility)' },
  { id: 'kpi_st_modeled_operating_impact', fullName: 'Modeled Operating Impact', display: 'Modeled Impact', screen: 'optimization', route: '/strategy/optimization', decision: 'Illustrative operating impact (contribution or cost avoidance) under selected scenario assumptions' },
  { id: 'kpi_st_decision_readiness', fullName: 'Decision Readiness', display: 'Decision Readiness', screen: 'optimization', route: '/strategy/optimization', decision: 'Share of priority scenarios with owner, constraints, sensitivity, and opportunity-cost documented' },
  { id: 'kpi_st_priority_scenario_coverage', fullName: 'Priority Scenario Coverage', display: 'Scenario Coverage', screen: 'optimization', route: '/strategy/optimization', decision: 'Documented what-if scenarios with baseline capacity/demand ÷ required scenario set' },
];

export const ST_SCREEN_TITLES: Record<StScreenId, string> = {
  command: 'Strategic Resource & Profitability Command Center',
  workforce: 'Workforce & Staffing Economics',
  equipment: 'Equipment & Asset Productivity',
  capacity: 'Clinical Capacity & Resource Allocation',
  'service-lines': 'Service-Line Profitability',
  'cost-efficiency': 'Cost Drivers & Efficiency',
  expansion: 'Capital Planning & Expansion',
  optimization: 'Strategic Optimization & What-if',
};

export const ST_CHART_OWNERS: Array<{ id: string; title: string; screen: StScreenId; question: string }> = [
  { id: 'st_contrib_trend', title: 'Operating Contribution Trend', screen: 'command', question: 'How is operating contribution moving?' },
  { id: 'st_util_index', title: 'Resource Utilization Index', screen: 'command', question: 'Is composite utilization improving?' },
  { id: 'st_constrained_overview', title: 'Capacity-Constrained Service Lines', screen: 'command', question: 'Where are executive capacity constraints?' },
  { id: 'st_cm_overview', title: 'Contribution Margin Overview', screen: 'command', question: 'How do revenue, direct cost, and CM rate relate?' },
  { id: 'st_avoidable_resource', title: 'Avoidable Resource Cost Opportunity', screen: 'command', question: 'How large is avoidable resource cost?' },
  { id: 'st_investment_coverage', title: 'Investment Opportunity Coverage', screen: 'command', question: 'Are expansion candidates documented?' },
  { id: 'st_productive_hours', title: 'Productive Clinical Hours', screen: 'workforce', question: 'How are productive hours trending?' },
  { id: 'st_staffing_util', title: 'Staffing Utilization', screen: 'workforce', question: 'Is staffing utilization on target?' },
  { id: 'st_overtime', title: 'Overtime Exposure', screen: 'workforce', question: 'Where is overtime concentrated?' },
  { id: 'st_agency', title: 'Agency Staffing Cost', screen: 'workforce', question: 'How large is agency spend?' },
  { id: 'st_staffing_gap', title: 'Staffing Capacity Gap', screen: 'workforce', question: 'Where is workforce shortfall?' },
  { id: 'st_workforce_alloc', title: 'Workforce Allocation Opportunity', screen: 'workforce', question: 'What hours are reallocable?' },
  { id: 'st_equip_util', title: 'Equipment Utilization', screen: 'equipment', question: 'How utilized is equipment?' },
  { id: 'st_avail_hours', title: 'Available Operating Hours', screen: 'equipment', question: 'How many hours are available?' },
  { id: 'st_downtime', title: 'Asset Downtime Exposure', screen: 'equipment', question: 'Where is downtime costly?' },
  { id: 'st_equip_cost_proc', title: 'Equipment Cost per Eligible Procedure', screen: 'equipment', question: 'Is equipment cost intensity rising?' },
  { id: 'st_maintenance', title: 'Maintenance Cost Exposure', screen: 'equipment', question: 'How large is maintenance spend?' },
  { id: 'st_equip_gap', title: 'Equipment Capacity Gap', screen: 'equipment', question: 'Where is equipment shortfall?' },
  { id: 'st_effective_cap', title: 'Effective Capacity', screen: 'capacity', question: 'What is effective available capacity?' },
  { id: 'st_cap_util', title: 'Capacity Utilization', screen: 'capacity', question: 'Is capacity utilization tight?' },
  { id: 'st_demand_gap', title: 'Demand-Capacity Gap', screen: 'capacity', question: 'Where does demand exceed capacity?' },
  { id: 'st_redeploy', title: 'Redeployable Resource Capacity', screen: 'capacity', question: 'What capacity can be redeployed?' },
  { id: 'st_constrained_ops', title: 'Constrained Service Lines (Operational)', screen: 'capacity', question: 'Which lines are hard-constrained?' },
  { id: 'st_alloc_opp', title: 'Allocation Opportunity', screen: 'capacity', question: 'What allocation opportunity exists?' },
  { id: 'st_net_revenue', title: 'Net Revenue by Service Line', screen: 'service-lines', question: 'Where is net revenue concentrated?' },
  { id: 'st_direct_cost', title: 'Direct Cost by Service Line', screen: 'service-lines', question: 'Where is direct cost concentrated?' },
  { id: 'st_cm_rate', title: 'Service-Line Contribution Margin Rate', screen: 'service-lines', question: 'Which lines show stronger CM rates?' },
  { id: 'st_cost_encounter', title: 'Cost per Eligible Encounter', screen: 'service-lines', question: 'Is cost per encounter rising?' },
  { id: 'st_cost_intensity', title: 'Resource Cost Intensity', screen: 'service-lines', question: 'Where is resource intensity high?' },
  { id: 'st_margin_var', title: 'Service-Line Margin Variance', screen: 'service-lines', question: 'Where does margin miss expectation?' },
  { id: 'st_total_opex', title: 'Total Eligible Operating Cost', screen: 'cost-efficiency', question: 'How large is eligible OpEx?' },
  { id: 'st_var_cost', title: 'Variable Cost per Activity', screen: 'cost-efficiency', question: 'Is variable cost intensity rising?' },
  { id: 'st_fixed_cost', title: 'Fixed Cost Exposure', screen: 'cost-efficiency', question: 'How large is fixed cost exposure?' },
  { id: 'st_cost_var', title: 'Cost Variance', screen: 'cost-efficiency', question: 'Where is cost vs plan?' },
  { id: 'st_avoidable_cost', title: 'Avoidable Cost Opportunity', screen: 'cost-efficiency', question: 'How large is avoidable cost?' },
  { id: 'st_efficiency_opp', title: 'Resource Efficiency Opportunity', screen: 'cost-efficiency', question: 'What efficiency opportunity exists?' },
  { id: 'st_expansion_cands', title: 'Candidate Expansion Opportunities', screen: 'expansion', question: 'How many expansion candidates?' },
  { id: 'st_capex', title: 'Estimated Capital Requirement', screen: 'expansion', question: 'How large is CapEx ask?' },
  { id: 'st_inc_opex', title: 'Incremental Operating Cost', screen: 'expansion', question: 'What incremental OpEx is implied?' },
  { id: 'st_inc_contrib', title: 'Incremental Contribution Potential', screen: 'expansion', question: 'What contribution potential is modeled?' },
  { id: 'st_cap_benefit', title: 'Capacity Benefit', screen: 'expansion', question: 'What capacity benefit is modeled?' },
  { id: 'st_invest_feas', title: 'Investment Feasibility', screen: 'expansion', question: 'Which candidates clear feasibility gates?' },
  { id: 'st_addr_contrib', title: 'Addressable Contribution Opportunity', screen: 'optimization', question: 'How large is addressable contribution?' },
  { id: 'st_realloc_pot', title: 'Reallocation Potential', screen: 'optimization', question: 'What reallocation is feasible?' },
  { id: 'st_capital_ready', title: 'Scenario Capital Readiness', screen: 'optimization', question: 'Are investment scenarios documented?' },
  { id: 'st_modeled_impact', title: 'Modeled Operating Impact', screen: 'optimization', question: 'What operating impact is modeled?' },
  { id: 'st_decision_ready', title: 'Decision Readiness', screen: 'optimization', question: 'Are decisions ready for review?' },
  { id: 'st_scenario_cover', title: 'Priority Scenario Coverage', screen: 'optimization', question: 'Are required scenarios covered?' },
];

export function ownersForStScreen(screen: StScreenId): StKpiOwner[] {
  return ST_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueStOwnership(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of ST_KPI_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  return issues;
}

export function assertUniqueStCharts(): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const item of ST_CHART_OWNERS) {
    const prior = seen.get(item.id);
    if (prior) issues.push(`${item.id} chart owned by both ${prior} and ${item.screen}`);
    else seen.set(item.id, item.screen);
  }
  const titles = new Map<string, string>();
  for (const item of ST_CHART_OWNERS) {
    const key = `${item.screen}|${item.title}`;
    const prior = titles.get(key);
    if (prior) issues.push(`duplicate title ${item.title} on ${item.screen}`);
    else titles.set(key, item.id);
  }
  return issues;
}

/** Domains that must not appear as primary Strategy ownership. */
export const ST_CROSS_DOMAIN_FORBIDDEN = [
  'kpi_rcm_', 'kpi_px_', 'kpi_ed_', 'kpi_bed_', 'kpi_ipd_', 'kpi_opd_', 'kpi_appt_',
  'kpi_surg_', 'kpi_rad_', 'kpi_lab_', 'kpi_rx_', 'kpi_icu_', 'kpi_qs_', 'kpi_sc_',
] as const;
