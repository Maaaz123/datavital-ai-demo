/**
 * Stage 4 — Simulation composing existing what-if engines.
 * Detect overlapping benefits; reject invalid combos; no double-counting.
 */
import type { ReportPeriod } from '../period';
import { buildStView, type StOpportunityId } from '../strategyView';
import { enterpriseWhatIf, runWhatIf, type DomainName, type WhatIfResult } from '@/showcase/whatIf';
import { buildEnterpriseView } from '../enterpriseView';
import { NO_STAFFING_COST_OPTIONS, STAFFING_COST_OPTIONS } from './toolsMeta';

export type SimulationRequest = {
  hospital: string;
  year: number;
  period: ReportPeriod;
  domain?: DomainName | string;
  kind?: string;
  amount?: number;
  opportunityId?: string;
};

export type SimulationResult = {
  id: string;
  title: string;
  domain: string;
  kind: string;
  increasesStaffingCost: boolean;
  whatIf: WhatIfResult;
  overlapGroup: string;
  illustrative: true;
};

/** Known overlap groups — members must not be summed. */
export const OVERLAP_GROUPS: Record<string, string[]> = {
  'workforce-hours': ['st-reallocate-nurses', 'st-reduce-overtime', 'st-staff-constrained-sl', 'ent-staffing-uplift', 'icu-staffing-uplift'],
  'capacity-flow': ['ent-bed-assign-flow', 'ed-boarding-down', 'beds-unblock-5', 'ipd-longstay-down'],
  'capex-vs-realloc': ['st-reallocate-vs-capital', 'st-expand-specialty', 'st-replace-downtime-asset'],
  'supply': ['st-supply-efficiency'],
  'revenue-ops': ['rcm-denials-down'],
};

function overlapGroupFor(kind: string): string {
  for (const [group, members] of Object.entries(OVERLAP_GROUPS)) {
    if (members.includes(kind)) return group;
  }
  return `solo:${kind}`;
}

export function getScenarioBaseline(args: {
  hospital: string;
  year: number;
  period: ReportPeriod;
  opportunityId?: string;
}): Record<string, unknown> {
  const ent = buildEnterpriseView(args.hospital, args.year, args.period);
  const st = buildStView(args.hospital, args.year, args.period);
  const opp = args.opportunityId
    ? st.opportunities.find((o) => o.id === args.opportunityId)
    : undefined;
  return {
    hospital: args.hospital,
    year: args.year,
    period: args.period,
    facts: {
      edWaitMedianMin: ent.facts.edWaitMedianMin,
      occupancy: ent.facts.occupancy,
      icuStaffingGapHours: ent.facts.icuStaffingGapHours,
      enterpriseStaffingGapHours: ent.facts.enterpriseStaffingGapHours,
      netPatientRevenue: ent.facts.netPatientRevenue,
      operatingContribution: ent.facts.operatingContribution,
    },
    opportunity: opp
      ? {
          id: opp.id,
          title: opp.title,
          baseline: opp.baseline,
          eligibleValue: opp.eligibleValue,
          assumption: opp.assumption,
          additive: opp.additive,
        }
      : null,
    note: 'Baseline reads buildEnterpriseView / buildStView — Scenario Only for modeled eligible values.',
  };
}

function resolveWhatIf(req: SimulationRequest): WhatIfResult {
  const amount = req.amount ?? 0.2;
  const kind = req.kind ?? 'ent-ed-congestion';
  const domain = (req.domain ?? 'Enterprise') as DomainName;

  if (kind === 'ent-bed-assign-flow' || kind === 'ent-staffing-uplift') {
    return enterpriseWhatIf(req.hospital, req.year, req.period, { kind: 'ent-ed-congestion', amount });
  }
  if (kind.startsWith('st-')) {
    return runWhatIf('Strategy', req.hospital, req.year, { kind, amount }, req.period);
  }
  if (kind.startsWith('ed-') || domain === 'Emergency') {
    return runWhatIf('Emergency', req.hospital, req.year, { kind, amount }, req.period);
  }
  if (kind.startsWith('rcm-') || domain === 'Revenue Cycle') {
    return runWhatIf('Revenue Cycle', req.hospital, req.year, { kind, amount }, req.period);
  }
  if (domain === 'Enterprise') {
    return enterpriseWhatIf(req.hospital, req.year, req.period, { kind, amount });
  }
  return runWhatIf(domain, req.hospital, req.year, { kind, amount }, req.period);
}

export function runSimulation(req: SimulationRequest): SimulationResult {
  const kind = req.kind ?? req.opportunityId ?? 'ent-ed-congestion';
  const whatIf = resolveWhatIf({ ...req, kind });
  return {
    id: `sim:${kind}:${req.hospital}:${req.year}`,
    title: whatIf.title,
    domain: String(req.domain ?? 'Enterprise'),
    kind,
    increasesStaffingCost: STAFFING_COST_OPTIONS.has(kind),
    whatIf,
    overlapGroup: overlapGroupFor(kind),
    illustrative: true,
  };
}

export type InterventionComparison = {
  ok: boolean;
  options: SimulationResult[];
  rejected: { optionIds: string[]; reason: string }[];
  ranking: { id: string; score: number; label: string; increasesStaffingCost: boolean }[];
  noAdditionalStaffingCost: boolean;
  note: string;
};

export function compareInterventions(args: {
  hospital: string;
  year: number;
  period: ReportPeriod;
  optionIds: string[];
  noAdditionalStaffingCost?: boolean;
}): InterventionComparison {
  const noStaff = args.noAdditionalStaffingCost !== false;
  const rejected: InterventionComparison['rejected'] = [];
  const options: SimulationResult[] = [];

  // Reject summing within the same overlap group.
  const seenGroups = new Map<string, string>();
  for (const optionId of args.optionIds) {
    if (noStaff && STAFFING_COST_OPTIONS.has(optionId)) {
      rejected.push({
        optionIds: [optionId],
        reason: `${optionId} increases staffing cost — excluded under no-additional-staffing-cost constraint.`,
      });
      continue;
    }
    const sim = runSimulation({
      hospital: args.hospital,
      year: args.year,
      period: args.period,
      kind: optionId,
      amount: 0.2,
    });
    const prior = seenGroups.get(sim.overlapGroup);
    if (prior && !sim.overlapGroup.startsWith('solo:')) {
      rejected.push({
        optionIds: [prior, optionId],
        reason: `Overlapping benefits in group "${sim.overlapGroup}" — do not sum; keep as alternatives.`,
      });
      // Keep first; skip additive second
      continue;
    }
    seenGroups.set(sim.overlapGroup, optionId);
    options.push(sim);
  }

  // Prefer known no-staffing options when ranking under constraint.
  const ranking = options.map((opt) => {
    const prefer = (NO_STAFFING_COST_OPTIONS as readonly string[]).includes(opt.kind) ? 10 : 0;
    const eligibleBoost = opt.kind.startsWith('st-') ? 2 : 0;
    const flowBoost = opt.overlapGroup === 'capacity-flow' ? 3 : 0;
    return {
      id: opt.kind,
      score: prefer + eligibleBoost + flowBoost + (opt.increasesStaffingCost ? -5 : 5),
      label: opt.title,
      increasesStaffingCost: opt.increasesStaffingCost,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    ok: options.length >= 1,
    options,
    rejected,
    ranking,
    noAdditionalStaffingCost: noStaff,
    note: 'Comparison uses existing what-if engines. Overlapping scenario benefits are not summed. Illustrative only.',
  };
}

export function isValidOpportunityId(id: string): id is StOpportunityId {
  return id.startsWith('st-');
}
