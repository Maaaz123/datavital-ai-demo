/**
 * Stage 4 — Constrained comparison / optimization.
 * Decision vars, objective, constraints (esp. no-additional-staffing-cost), feasibility, trade-offs.
 */
import type { ReportPeriod } from '../period';
import { compareInterventions, type InterventionComparison } from './simulation';
import { NO_STAFFING_COST_OPTIONS, STAFFING_COST_OPTIONS } from './toolsMeta';

export type OptimizationConstraint = {
  id: string;
  label: string;
  check: (optionId: string) => boolean;
};

export type OptimizationRequest = {
  hospital: string;
  year: number;
  period: ReportPeriod;
  decisionVariables: string[];
  objective: 'strongest_operational_improvement' | 'minimize_staffing_cost' | 'balanced';
  constraints?: OptimizationConstraint[];
  /** Default true for flagship path. */
  noAdditionalStaffingCost?: boolean;
};

export type OptimizationResult = {
  feasible: boolean;
  infeasibleReason?: string;
  objective: OptimizationRequest['objective'];
  selected: string | null;
  alternatives: string[];
  tradeoffs: string[];
  comparison: InterventionComparison;
  constraintsApplied: string[];
};

const DEFAULT_CONSTRAINTS: OptimizationConstraint[] = [
  {
    id: 'no-additional-staffing-cost',
    label: 'No additional staffing cost',
    check: (optionId) => !STAFFING_COST_OPTIONS.has(optionId),
  },
  {
    id: 'no-capex-auto-approve',
    label: 'No CapEx auto-approval',
    check: (optionId) => optionId !== 'st-expand-specialty' && optionId !== 'st-replace-downtime-asset',
  },
];

export function runOptimization(req: OptimizationRequest): OptimizationResult {
  const noStaff = req.noAdditionalStaffingCost !== false;
  const constraints = [
    ...(noStaff ? DEFAULT_CONSTRAINTS.filter((c) => c.id === 'no-additional-staffing-cost') : []),
    ...(req.constraints ?? DEFAULT_CONSTRAINTS.filter((c) => c.id !== 'no-additional-staffing-cost')),
  ];

  const variables = req.decisionVariables.length
    ? req.decisionVariables
    : [...NO_STAFFING_COST_OPTIONS];

  const surviving = variables.filter((id) => constraints.every((c) => c.check(id)));
  if (surviving.length === 0) {
    return {
      feasible: false,
      infeasibleReason:
        'No decision variable satisfies all constraints (especially no-additional-staffing-cost). Relax staffing or CapEx constraints, or choose a flow/supply intervention.',
      objective: req.objective,
      selected: null,
      alternatives: [],
      tradeoffs: [
        'Staffing uplift can reduce ICU gap but violates no-additional-staffing-cost.',
        'CapEx paths require human approval and are not auto-selected.',
      ],
      comparison: compareInterventions({
        hospital: req.hospital,
        year: req.year,
        period: req.period,
        optionIds: variables,
        noAdditionalStaffingCost: noStaff,
      }),
      constraintsApplied: constraints.map((c) => c.label),
    };
  }

  const comparison = compareInterventions({
    hospital: req.hospital,
    year: req.year,
    period: req.period,
    optionIds: surviving,
    noAdditionalStaffingCost: noStaff,
  });

  // Re-rank from real comparison scores with objective weighting (not a static best-option).
  const ranked = [...comparison.ranking].map((row) => {
    let score = row.score;
    if (req.objective === 'minimize_staffing_cost') {
      score += row.increasesStaffingCost ? -20 : 12;
      if (row.id === 'st-reduce-overtime') score += 8;
    } else if (req.objective === 'balanced') {
      if (row.id === 'st-supply-efficiency' || row.id === 'st-reduce-overtime') score += 4;
      if (row.id === 'ent-bed-assign-flow') score += 2;
    } else {
      // strongest_operational_improvement — prefer flow / denial / supply evidence-backed levers
      if (row.id === 'ent-bed-assign-flow' || row.id === 'ed-boarding-down') score += 6;
      if (row.id === 'rcm-denials-down') score += 3;
    }
    return { ...row, score };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  comparison.ranking = ranked;

  const selected = ranked[0]?.id ?? surviving[0] ?? null;
  const alternatives = ranked.slice(1, 3).map((r) => r.id);

  const tradeoffs: string[] = [
    'Flow-side bed assignment improves ED wait without adding FTEs; occupancy may rise slightly.',
    'Supply efficiency reduces stockout pressure with no staffing OpEx increase; does not directly cut ED wait.',
    'Overtime reduction lowers OpEx and may free capacity — overlaps with nurse reallocation (do not sum).',
  ];
  if (comparison.rejected.length) {
    tradeoffs.push(...comparison.rejected.map((r) => r.reason));
  }

  return {
    feasible: true,
    objective: req.objective,
    selected,
    alternatives,
    tradeoffs,
    comparison,
    constraintsApplied: constraints.map((c) => c.label),
  };
}
