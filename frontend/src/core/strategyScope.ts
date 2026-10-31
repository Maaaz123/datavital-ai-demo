import type { StView } from './strategyView';

export type Indicator = {
  screen: string;
  name: string;
  unit: string;
  formula: string;
  cohort: string;
  aggregation: string;
  scope: string;
  classification: 'constructed' | 'scenario' | 'unavailable';
  limitations: string;
  method: string;
};

function row(screen: string, name: string, fields: Omit<Indicator, 'screen' | 'name'>): Indicator {
  return { screen, name, ...fields };
}

export function stIndicatorsFor(view: StView): Indicator[] {
  const scope = view.periodLabel;
  const at = view.observationDate;
  const m = view.methodology;
  return [
    row('Command', 'Operating Contribution', {
      unit: 'fictional SAR', formula: 'Recognized net revenue − eligible direct costs', cohort: 'Service lines with recognized revenue',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.contribution, method: m.contribution,
    }),
    row('Command', 'Resource Utilization Index', {
      unit: 'index', formula: 'Mean of staffing, equipment, and capacity utilization', cohort: 'Workforce + equipment + clinical slots',
      aggregation: 'Composite', scope, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Command', 'Capacity-Constrained Service Lines', {
      unit: 'lines', formula: 'Service lines with demand > available capacity', cohort: 'Service lines',
      aggregation: 'Count', scope: at, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Command', 'Service-Line Contribution Margin', {
      unit: 'fictional SAR', formula: 'Aggregate CM (same identity as Operating Contribution)', cohort: 'Eligible direct-cost service lines',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: 'CM ≠ net profit. Not fully allocated margin.', method: m.contribution,
    }),
    row('Command', 'Avoidable Resource Cost Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative avoidable overtime + idle-equipment + agency', cohort: 'Scenario-linked',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Command', 'Investment Opportunity Coverage', {
      unit: 'rate', formula: 'Documented expansion candidates ÷ candidates', cohort: 'Expansion pipeline',
      aggregation: 'Ratio', scope: at, classification: 'constructed', limitations: m.expansion, method: m.expansion,
    }),
    row('Workforce', 'Productive Clinical Hours', {
      unit: 'hours', formula: 'Paid clinical hours excluding non-productive paid time', cohort: 'Clinical workforce',
      aggregation: 'Sum (flow)', scope, classification: 'constructed', limitations: m.workforce, method: m.workforce,
    }),
    row('Workforce', 'Staffing Utilization', {
      unit: 'rate', formula: 'Productive hours ÷ staffed available hours', cohort: 'Staffed clinical hours',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.workforce, method: m.workforce,
    }),
    row('Workforce', 'Overtime Exposure', {
      unit: 'fictional SAR', formula: 'Overtime hours × overtime premium', cohort: 'Overtime ledger',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.workforce, method: m.cost,
    }),
    row('Workforce', 'Agency Staffing Cost', {
      unit: 'fictional SAR', formula: 'Agency / locum spend', cohort: 'Agency ledger',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.workforce, method: m.cost,
    }),
    row('Workforce', 'Staffing Capacity Gap', {
      unit: 'hours', formula: 'Demand hours − staffed available hours', cohort: 'Constrained units',
      aggregation: 'Gap', scope, classification: 'constructed', limitations: m.workforce, method: m.capacity,
    }),
    row('Workforce', 'Workforce Allocation Opportunity', {
      unit: 'hours', formula: 'Illustrative redeployable productive hours', cohort: 'Credentialed eligible units',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Equipment', 'Equipment Utilization', {
      unit: 'rate', formula: 'Used equipment hours ÷ available operating hours', cohort: 'Clinical equipment',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.equipment, method: m.equipment,
    }),
    row('Equipment', 'Available Operating Hours', {
      unit: 'hours', formula: 'Staffed + maintained hours available for use', cohort: 'Equipment fleet',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.equipment, method: m.equipment,
    }),
    row('Equipment', 'Asset Downtime Exposure', {
      unit: 'fictional SAR', formula: 'Downtime hours × opportunity cost', cohort: 'Downtime events',
      aggregation: 'Modeled', scope, classification: 'constructed', limitations: m.equipment, method: m.cost,
    }),
    row('Equipment', 'Equipment Cost per Eligible Procedure', {
      unit: 'fictional SAR / procedure', formula: '(Maintenance + depreciation) ÷ eligible procedures', cohort: 'Eligible procedures',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.equipment, method: m.cost,
    }),
    row('Equipment', 'Maintenance Cost Exposure', {
      unit: 'fictional SAR', formula: 'Planned + unplanned maintenance spend', cohort: 'Maintenance ledger',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Equipment', 'Equipment Capacity Gap', {
      unit: 'hours', formula: 'Demand equipment hours − available operating hours', cohort: 'Equipment demand',
      aggregation: 'Gap', scope, classification: 'constructed', limitations: m.equipment, method: m.capacity,
    }),
    row('Capacity', 'Effective Capacity', {
      unit: 'hours', formula: 'Available capacity after staffing / readiness / schedule', cohort: 'Clinical capacity',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Capacity', 'Capacity Utilization', {
      unit: 'rate', formula: 'Used ÷ effective available capacity', cohort: 'Effective capacity',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Capacity', 'Demand-Capacity Gap', {
      unit: 'hours', formula: 'Demand − effective capacity', cohort: 'Period demand',
      aggregation: 'Gap', scope, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Capacity', 'Redeployable Resource Capacity', {
      unit: 'hours', formula: 'Unused available capacity eligible for reallocation', cohort: 'Eligible unused capacity',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.capacity, method: m.capacity,
    }),
    row('Capacity', 'Constrained Service Lines', {
      unit: 'lines', formula: 'Lines with hard demand > available capacity', cohort: 'Service lines',
      aggregation: 'Count', scope: at, classification: 'constructed', limitations: 'Operational count; Command owns executive Constrained Lines KPI.', method: m.capacity,
    }),
    row('Capacity', 'Allocation Opportunity', {
      unit: 'hours', formula: 'Illustrative reallocable capacity units', cohort: 'Constrained + surplus lines',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Service-lines', 'Net Revenue by Service Line', {
      unit: 'fictional SAR', formula: 'Recognized net revenue (by-line in charts)', cohort: 'Service lines',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: 'Revenue ≠ profit.', method: m.contribution,
    }),
    row('Service-lines', 'Direct Cost by Service Line', {
      unit: 'fictional SAR', formula: 'Eligible direct costs by service line', cohort: 'Direct cost ledger',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Service-lines', 'Service-Line Contribution Margin Rate', {
      unit: 'rate', formula: 'Aggregate CM ÷ recognized net revenue', cohort: 'Revenue-positive service lines',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Rate view; Command owns SAR CM. Zero revenue → 0.', method: m.contribution,
    }),
    row('Service-lines', 'Cost per Eligible Encounter', {
      unit: 'fictional SAR / encounter', formula: 'Eligible direct cost ÷ eligible encounters', cohort: 'Eligible encounters',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Service-lines', 'Resource Cost Intensity', {
      unit: 'index', formula: 'Direct resource cost ÷ productive clinical hours', cohort: 'Productive hours',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.cost, method: m.workforce,
    }),
    row('Service-lines', 'Service-Line Margin Variance', {
      unit: 'fictional SAR', formula: 'Actual CM − expected CM under intensity assumptions', cohort: 'Service lines',
      aggregation: 'Variance', scope, classification: 'constructed', limitations: m.contribution, method: m.contribution,
    }),
    row('Cost-efficiency', 'Total Eligible Operating Cost', {
      unit: 'fictional SAR', formula: 'Sum of eligible operating cost categories', cohort: 'Cost ledger',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: 'Not fully allocated hospital P&L. Not from real ERP.', method: m.cost,
    }),
    row('Cost-efficiency', 'Variable Cost per Activity', {
      unit: 'fictional SAR / activity', formula: 'Variable eligible costs ÷ activity units', cohort: 'Variable cost categories',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Cost-efficiency', 'Fixed Cost Exposure', {
      unit: 'fictional SAR', formula: 'Fixed / semi-fixed eligible costs', cohort: 'Fixed cost categories',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Cost-efficiency', 'Cost Variance', {
      unit: 'fictional SAR', formula: 'Actual eligible cost − plan / standard', cohort: 'Plan vs actual',
      aggregation: 'Variance', scope, classification: 'constructed', limitations: m.cost, method: m.cost,
    }),
    row('Cost-efficiency', 'Avoidable Cost Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative avoidable overtime + agency + consumables', cohort: 'Scenario-linked',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Cost-efficiency', 'Resource Efficiency Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative efficiency gain from utilization uplift', cohort: 'Scenario-linked',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Expansion', 'Candidate Expansion Opportunities', {
      unit: 'candidates', formula: 'Documented expansion / CapEx candidates', cohort: 'Expansion pipeline',
      aggregation: 'Count', scope: at, classification: 'constructed', limitations: m.expansion, method: m.expansion,
    }),
    row('Expansion', 'Estimated Capital Requirement', {
      unit: 'fictional SAR', formula: 'Illustrative CapEx for candidates', cohort: 'Candidates',
      aggregation: 'Sum', scope, classification: 'scenario', limitations: 'Not approved investment.', method: m.expansion,
    }),
    row('Expansion', 'Incremental Operating Cost', {
      unit: 'fictional SAR', formula: 'Illustrative incremental OpEx', cohort: 'Candidates',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.expansion, method: m.expansion,
    }),
    row('Expansion', 'Incremental Contribution Potential', {
      unit: 'fictional SAR', formula: 'Illustrative incremental contribution (not net profit)', cohort: 'Candidates',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.contribution, method: m.expansion,
    }),
    row('Expansion', 'Capacity Benefit', {
      unit: 'hours', formula: 'Illustrative incremental effective capacity', cohort: 'Candidates',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.capacity, method: m.expansion,
    }),
    row('Expansion', 'Investment Feasibility', {
      unit: 'rate', formula: 'Candidates clearing CapEx/OpEx/ramp/CM gates', cohort: 'Candidates',
      aggregation: 'Ratio', scope, classification: 'scenario', limitations: m.expansion, method: m.expansion,
    }),
    row('Optimization', 'Addressable Contribution Opportunity', {
      unit: 'fictional SAR', formula: 'Illustrative addressable contribution under what-if assumptions', cohort: 'Scenario set',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Reallocation Potential', {
      unit: 'hours', formula: 'Illustrative reallocable capacity / workforce hours', cohort: 'Eligible surplus',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Scenario Capital Readiness', {
      unit: 'rate', formula: 'Investment scenarios with complete CapEx/OpEx/ramp docs', cohort: 'Investment scenarios',
      aggregation: 'Ratio', scope, classification: 'scenario', limitations: 'Distinct from Expansion Investment Feasibility.', method: m.optimization,
    }),
    row('Optimization', 'Modeled Operating Impact', {
      unit: 'fictional SAR', formula: 'Illustrative operating impact under scenario assumptions', cohort: 'Selected scenarios',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Decision Readiness', {
      unit: 'rate', formula: 'Priority scenarios with owner/constraints/sensitivity/opportunity cost', cohort: 'Priority scenarios',
      aggregation: 'Ratio', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Priority Scenario Coverage', {
      unit: 'rate', formula: 'Documented what-if scenarios ÷ required set', cohort: 'What-if catalog',
      aggregation: 'Ratio', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
  ];
}

export const ST_AI_CASES = [
  { title: 'Relieve capacity-constrained service lines', owner: 'Chief Strategy Officer', followUp: 'Capacity-Constrained Service Lines' },
  { title: 'Compare nurse reallocation vs CapEx', owner: 'Chief Nursing Officer / Capital Planning', followUp: 'Reallocation Potential' },
  { title: 'Reduce avoidable overtime and agency spend', owner: 'Workforce Planning', followUp: 'Overtime Exposure' },
  { title: 'Prioritize expansion candidates with documented CM assumptions', owner: 'Capital Planning Committee', followUp: 'Investment Feasibility' },
] as const;
