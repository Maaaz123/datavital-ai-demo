import { demoValue, findKpi, HOSPITALS, type KpiDef } from './engine';

export type AssistantAnswer = {
  title: string;
  evidence: string;
  rationale: string;
  action: string;
  role: string;
  benefit: string;
  approval: string;
  outcome: string;
};

const PROMPTS = [
  'Why is emergency waiting time increasing?',
  'Which hospital has the greatest capacity pressure?',
  'What factors are associated with lower patient satisfaction?',
  'Which operational interventions should be reviewed?',
  'Where are claim denials increasing?',
  'What improvements could reduce avoidable delays?',
];

export const ASSISTANT_PROMPTS = PROMPTS;

export function answerQuestion(question: string, hospital: string, year: number, department: string): AssistantAnswer {
  const q = question.toLowerCase();
  const site = HOSPITALS.find((item) => item.code === hospital)?.name ?? hospital;
  const wait = metric('kpi_ed_avg_los_hours', hospital, year, department);
  const beds = metric('kpi_bed_occupancy_rate', hospital, year, department);
  const denial = metric('kpi_claim_denied_rate', hospital, year, department);
  const satisfaction = metric('demo_satisfaction_index', hospital, year, department);

  if (q.includes('wait') || q.includes('emergency') || q.includes('طوار')) {
    return pack(
      `Emergency time at ${site} in ${year}`,
      `Synthetic ED length of stay is ${wait}. Department filter is ${department}.`,
      'The scenario ties the rise to arrival mix and boarding, not to a proven clinical cause.',
      'Review a simulated midday staffing overlap for the emergency queue.',
      'Emergency operations lead',
      'Illustrative reduction in the scenario wait series. Not a forecast guarantee.',
    );
  }
  if (q.includes('capacity') || q.includes('bed') || q.includes('hospital')) {
    const ranked = ['H1', 'H2', 'H3', 'H4', 'H5']
      .map((code) => ({ code, value: demoValue(must('kpi_bed_occupancy_rate'), code, year, 'All') }))
      .sort((a, b) => b.value - a.value);
    const top = HOSPITALS.find((item) => item.code === ranked[0].code);
    return pack(
      `${top?.name ?? ranked[0].code} shows the highest synthetic occupancy`,
      `Compared occupancy values are ${ranked.map((item) => `${item.code} ${(item.value * 100).toFixed(1)}%`).join(', ')}.`,
      'Capacity pressure in this scenario follows occupancy, not a live census.',
      'Review a simulated discharge-planning huddle at the highest hospital.',
      'Capacity office',
      'Illustrative easing of the occupancy series after the simulated huddle.',
    );
  }
  if (q.includes('satisfaction') || q.includes('patient')) {
    return pack(
      `Satisfaction scenario at ${site}`,
      `Synthetic satisfaction index is ${satisfaction}. Open complaints are a separate labelled assumption.`,
      'Lower scores in the scenario line up with discharge waits and unclear instructions.',
      'Review a simulated service-recovery callback for PX-2402.',
      'Patient experience lead',
      'Illustrative lift in the satisfaction index. Not a survey result from a hospital.',
    );
  }
  if (q.includes('denial') || q.includes('claim')) {
    return pack(
      `Claim denial scenario at ${site}`,
      `Synthetic denial rate is ${denial}. Authorization volume remains a catalog label with a synthetic number.`,
      'The scenario associates denials with missing authorization context, not with a payer file.',
      'Review a simulated pre-authorization checklist before submission.',
      'Revenue cycle manager',
      'Illustrative drop in the denial series. Not a paid-claims outcome.',
    );
  }
  return pack(
    `Scenario for ${site}, ${year}, ${department}`,
    `Synthetic ED length of stay is ${wait}. Synthetic occupancy is ${beds}.`,
    'Avoidable delay in this scenario clusters where boarding and discharge timing overlap.',
    'Review a simulated afternoon discharge slot and an emergency queue huddle.',
    'Hospital operations director',
    'Illustrative shorter delay in the next period of the scenario.',
  );
}

function metric(key: string, hospital: string, year: number, department: string): string {
  const kpi = must(key);
  const value = demoValue(kpi, hospital, year, department);
  if (kpi.unit === 'ratio' || kpi.unit.includes('rate')) return `${(value * 100).toFixed(1)}%`;
  return `${value} ${kpi.unit}`;
}

function must(key: string): KpiDef {
  const kpi = findKpi(key);
  if (!kpi) throw new Error(key);
  return kpi;
}

function pack(title: string, evidence: string, rationale: string, action: string, role: string, benefit: string): AssistantAnswer {
  return {
    title,
    evidence,
    rationale,
    action,
    role,
    benefit,
    approval: 'Simulated approval by the named role. Stored only in this browser when you approve on the KPI page.',
    outcome: 'Simulated outcome appears after approval. It is an illustration, not a measured hospital result.',
  };
}
