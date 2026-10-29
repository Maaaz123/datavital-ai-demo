import { scenarioFor, wardRows } from './facts';
import { peakHours } from '@/core/derived';

export type DomainName = 'Emergency' | 'Beds' | 'Inpatient';

export type WhatIfResult = {
  id: string;
  title: string;
  current: string;
  change: string;
  estimated: string;
  assumptions: string;
  implications: string;
  followUp: string;
  owner: string;
};

export const WHAT_IF_PROMPTS: Record<DomainName, string[]> = {
  Emergency: [
    'What could happen if patient arrivals increase by 15%?',
    'What if boarding beyond 4 hours fell by 20%?',
    'Which action could have the greatest operational impact?',
  ],
  Beds: [
    'What happens if five blocked beds become available?',
    'What happens if bed demand increases by 10%?',
    'What if bed assignment median improved by 15 minutes?',
  ],
  Inpatient: [
    'What would happen if prolonged stays decreased by 10%?',
    'What if delayed discharges fell by 25%?',
    'What if average length of stay decreased by 0.5 days?',
  ],
};

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function parseWhatIfIntent(question: string): { kind: string; amount: number } | null {
  const q = question.toLowerCase();
  if (!/(what if|what happens|what could happen|what would happen|increase by|decrease by|fell by|become available|improved by|greatest.*impact)/.test(q)) {
    return null;
  }
  const percent = q.match(/(\d+(?:\.\d+)?)\s*%/);
  const days = q.match(/(\d+(?:\.\d+)?)\s*days?/);
  const minutes = q.match(/(\d+(?:\.\d+)?)\s*minutes?/);
  const fiveBeds = /five|5\b/.test(q) && /block/.test(q);

  if (/arriv|demand|patient/.test(q) && /increas/.test(q)) return { kind: 'ed-arrivals-up', amount: percent ? Number(percent[1]) / 100 : 0.15 };
  if (/board/.test(q) && /(fell|decreas|reduc|improv)/.test(q)) return { kind: 'ed-boarding-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
  if (/greatest.*impact|priorit/.test(q) && /emergency|ed |waiting|board|arrival/.test(q)) return { kind: 'ed-priority-impact', amount: 0.15 };
  if (/greatest.*impact/.test(q)) return { kind: 'generic-priority', amount: 0.1 };
  if (fiveBeds || (/block/.test(q) && /available|ready|open/.test(q))) return { kind: 'beds-unblock-5', amount: 5 };
  if (/bed demand|demand increases|capacity pressure/.test(q) && /increas|10%/.test(q)) return { kind: 'beds-demand-up', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/assign/.test(q) && /(improv|reduc|faster|fell)/.test(q)) return { kind: 'beds-assign-faster', amount: minutes ? Number(minutes[1]) : 15 };
  if (/prolong|long.?stay/.test(q) && /(decreas|fell|reduc)/.test(q)) return { kind: 'ipd-longstay-down', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/delay.*discharge|ready but|discharge delay/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'ipd-delay-down', amount: percent ? Number(percent[1]) / 100 : 0.25 };
  if (/length of stay|los|average stay/.test(q) && /(decreas|fell|reduc)/.test(q)) return { kind: 'ipd-los-down', amount: days ? Number(days[1]) : 0.5 };
  if (/arriv|waiting|board|ed /.test(q)) return { kind: 'ed-arrivals-up', amount: percent ? Number(percent[1]) / 100 : 0.15 };
  if (/bed|occup|block|assign/.test(q)) return { kind: 'beds-demand-up', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/stay|discharge|readmit|inpatient/.test(q)) return { kind: 'ipd-longstay-down', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  return null;
}

export function runWhatIf(domain: DomainName, hospital: string, year: number, intent?: { kind: string; amount: number } | null): WhatIfResult {
  const fact = scenarioFor(hospital, year).focus;
  const resolved = intent ?? defaultIntent(domain);
  if (domain === 'Emergency') return emergencyWhatIf(hospital, year, fact, resolved);
  if (domain === 'Beds') return bedsWhatIf(fact, resolved);
  return inpatientWhatIf(fact, resolved);
}

function defaultIntent(domain: DomainName): { kind: string; amount: number } {
  if (domain === 'Emergency') return { kind: 'ed-arrivals-up', amount: 0.15 };
  if (domain === 'Beds') return { kind: 'beds-unblock-5', amount: 5 };
  return { kind: 'ipd-longstay-down', amount: 0.1 };
}

function emergencyWhatIf(
  hospital: string,
  year: number,
  fact: ReturnType<typeof scenarioFor>['focus'],
  intent: { kind: string; amount: number },
): WhatIfResult {
  const wait = fact.edWaitMedianMin;
  const arrivals = fact.edArrivals;
  const boardingShare = (fact.edAdmitted * (0.05 + (fact.occupiedBeds / Math.max(fact.staffedBeds, 1)) * 0.06)) / Math.max(fact.edAdmitted, 1);
  const leftRate = fact.edLeft / Math.max(arrivals, 1);
  const peaks = peakHours(hospital, year).slice(0, 2).map((item) => item.name).join(' and ');

  if (intent.kind === 'ed-boarding-down') {
    const nextShare = boardingShare * (1 - intent.amount);
    const freed = Math.round(fact.edAdmitted * (boardingShare - nextShare));
    return {
      id: intent.kind,
      title: 'Boarding reduction scenario',
      current: `Boarding beyond 4 hours ${pct(boardingShare)} of ${num(fact.edAdmitted)} emergency admissions · door-to-provider ${num(wait, 1)} minutes`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in boarding share`,
      estimated: `Boarding share near ${pct(nextShare)} · about ${num(freed)} fewer long-boarding admissions in the year story`,
      assumptions: 'Assumes the same admission volume and that freed ED capacity is usable for new arrivals. Not a validated forecast.',
      implications: 'Lower boarding can free emergency bays during peak hours and ease door-to-provider pressure indirectly.',
      followUp: 'Boarding beyond 4 hours rate and door-to-provider median after the next peak week',
      owner: 'Emergency operations lead',
    };
  }

  if (intent.kind === 'ed-priority-impact' || intent.kind === 'generic-priority') {
    const peakLift = Math.round(wait * 0.08);
    const boardLift = Math.round(fact.edAdmitted * boardingShare * 0.15);
    return {
      id: 'ed-priority-impact',
      title: 'Highest-impact ED action (illustrative)',
      current: `Door-to-provider ${num(wait, 1)} minutes · boarding ${pct(boardingShare)} · left without care ${pct(leftRate)} · peaks ${peaks}`,
      change: 'Compare covering peak arrival hours versus clearing long-boarding cases',
      estimated: `Peak-hour coverage scenario: about ${num(peakLift, 1)} minutes off the median wait story. Boarding clearance scenario: about ${num(boardLift)} fewer long-boarding admissions.`,
      assumptions: 'Both paths use the same hospital figures. Relative ranking is a demonstration heuristic, not a measured A/B result.',
      implications: 'If wait is above the 60-minute review line, peak-hour coverage is the first management lever; if boarding is high, clear admitted patients still in ED first.',
      followUp: 'Door-to-provider median, boarding beyond 4 hours, and left-without-care rate',
      owner: 'Emergency operations lead',
    };
  }

  const lift = intent.amount;
  const nextArrivals = Math.round(arrivals * (1 + lift));
  const nextWait = wait * (1 + lift * 0.45);
  const nextLeft = leftRate * (1 + lift * 0.35);
  return {
    id: 'ed-arrivals-up',
    title: 'Arrival demand increase scenario',
    current: `${num(arrivals)} visits · door-to-provider ${num(wait, 1)} minutes · left without care ${pct(leftRate)} · peak hours ${peaks}`,
    change: `Illustrative ${pct(lift, 0)} rise in emergency arrivals`,
    estimated: `About ${num(nextArrivals)} visits · wait near ${num(nextWait, 1)} minutes · left-without-care near ${pct(nextLeft)}`,
    assumptions: 'Wait scales at 45% of the arrival increase and walkaways at 35% — demonstration elasticities only. Not a validated forecast.',
    implications: 'Peak hours absorb most pressure. Without coverage or flow action, boarding and left-without-care risk both rise.',
    followUp: 'Hourly arrivals, door-to-provider median, and left-without-care rate',
    owner: 'Emergency operations lead',
  };
}

function bedsWhatIf(fact: ReturnType<typeof scenarioFor>['focus'], intent: { kind: string; amount: number }): WhatIfResult {
  const occ = fact.occupiedBeds / Math.max(fact.staffedBeds, 1);
  const assign = Math.round(42 + occ * 18);
  const wards = wardRows(fact).slice().sort((a, b) => b.occupied / Math.max(b.staffed, 1) - a.occupied / Math.max(a.staffed, 1));
  const top = wards[0];

  if (intent.kind === 'beds-unblock-5') {
    const freed = Math.min(intent.amount, fact.blockedBeds);
    const nextBlocked = fact.blockedBeds - freed;
    const nextVacant = fact.availableBeds + freed;
    const nextOcc = fact.occupiedBeds / Math.max(fact.staffedBeds, 1);
    return {
      id: intent.kind,
      title: 'Blocked beds returned to vacant',
      current: `Occupied ${num(fact.occupiedBeds)} · vacant ${num(fact.availableBeds)} · blocked ${num(fact.blockedBeds)} · occupancy ${pct(occ)}`,
      change: `Illustrative return of ${num(freed)} blocked beds to the vacant ready pool`,
      estimated: `Vacant ${num(nextVacant)} · blocked ${num(nextBlocked)} · occupancy still ${pct(nextOcc)} of staffed beds (occupied unchanged)`,
      assumptions: 'Beds move from blocked to vacant only. No change in admissions or discharges. Cleaning capacity is assumed available.',
      implications: `More ready beds can shorten assignment waits on pressure wards such as ${top?.id ?? 'the fullest ward'}.`,
      followUp: 'Blocked bed share, vacant ready beds, and assignment median',
      owner: 'Bed management lead',
    };
  }

  if (intent.kind === 'beds-assign-faster') {
    const nextAssign = Math.max(20, assign - intent.amount);
    return {
      id: intent.kind,
      title: 'Faster bed assignment scenario',
      current: `Assignment median ${num(assign)} minutes · vacant ${num(fact.availableBeds)} · blocked ${num(fact.blockedBeds)}`,
      change: `Illustrative ${num(intent.amount)}-minute improvement in assignment median`,
      estimated: `Assignment median near ${num(nextAssign)} minutes if the ready pool stays at least ${num(fact.availableBeds)} vacant beds`,
      assumptions: 'Improvement requires vacant ready beds and prioritized pending requests. AI does not assign a bed alone.',
      implications: 'Faster assignment reduces placement backlog and can ease emergency boarding pressure labeled as a Beds outcome only when bed clocks improve.',
      followUp: 'Assignment median and pending request count',
      owner: 'Bed management lead',
    };
  }

  const lift = intent.amount;
  const extraDemand = Math.max(1, Math.round(fact.admissions / 365 * lift * 7));
  const shortfall = Math.max(0, extraDemand - fact.availableBeds);
  return {
    id: 'beds-demand-up',
    title: 'Bed demand increase scenario',
    current: `Occupancy ${pct(occ)} · vacant ${num(fact.availableBeds)} · blocked ${num(fact.blockedBeds)} · tightest ward ${top?.id ?? 'n/a'}`,
    change: `Illustrative ${pct(lift, 0)} rise in near-term bed demand`,
    estimated: `About ${num(extraDemand)} extra placement requests in a week sketch · shortfall near ${num(shortfall)} if vacant stays at ${num(fact.availableBeds)}`,
    assumptions: 'Weekly demand is a sketch from annual admissions. Not a 4–48 hour validated forecast.',
    implications: 'If vacant beds are thin, blocked-bed recovery and discharge releases become the first levers before adding staffed beds.',
    followUp: 'Occupancy, vacant beds, blocked beds, and expected releases',
    owner: 'Bed management lead',
  };
}

function inpatientWhatIf(
  fact: ReturnType<typeof scenarioFor>['focus'],
  intent: { kind: string; amount: number },
): WhatIfResult {
  const los = fact.ipLosDays;
  const longStayRate = Math.min(0.22, 0.06 + (fact.ipLosP90Days - los) * 0.035);
  const longStayCount = Math.round(fact.discharges * longStayRate);
  const ready = Math.max(1, Math.round(fact.occupiedBeds * 0.08));
  const specialties = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children'];
  const longest = specialties.map((id, index) => ({ id, los: Math.round((los * (0.85 + index * 0.06)) * 10) / 10 }))
    .sort((a, b) => b.los - a.los)[0];

  if (intent.kind === 'ipd-delay-down') {
    const nextReady = Math.max(0, Math.round(ready * (1 - intent.amount)));
    return {
      id: intent.kind,
      title: 'Delayed discharge reduction scenario',
      current: `Medically ready, not discharged ~${num(ready)} · median stay ${num(los, 1)} days · discharges ${num(fact.discharges)}`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in ready-but-not-discharged count`,
      estimated: `Ready-but-not-discharged near ${num(nextReady)} patients · earlier bed release for planned admissions`,
      assumptions: 'Medical readiness remains a clinician decision. AI does not discharge a patient. Delay clocks are not fully stored in this demo.',
      implications: 'Clearing confirmed discharge barriers frees census without changing bed ownership metrics.',
      followUp: 'Ready-but-not-discharged count and median length of stay',
      owner: 'Inpatient operations lead',
    };
  }

  if (intent.kind === 'ipd-los-down') {
    const nextLos = Math.max(1, los - intent.amount);
    const extraDischarges = Math.round(fact.occupiedBeds * (intent.amount / Math.max(los, 1)));
    return {
      id: intent.kind,
      title: 'Length of stay reduction scenario',
      current: `Median stay ${num(los, 1)} days · average ${num(fact.ipLosAvgDays, 1)} · P90 ${num(fact.ipLosP90Days, 1)} · longest specialty ${longest.id} ${num(longest.los, 1)} days`,
      change: `Illustrative ${num(intent.amount, 1)}-day reduction in median stay`,
      estimated: `Median near ${num(nextLos, 1)} days · roughly ${num(extraDischarges)} additional discharge capacity in the census story`,
      assumptions: 'Case-mix severity is held constant. Observed-to-expected LOS is not available. Illustrative only.',
      implications: 'Shorter stays reduce prolonged-stay pressure and support planned elective admissions.',
      followUp: 'Median, average, and P90 length of stay by specialty',
      owner: 'Inpatient operations lead',
    };
  }

  const nextRate = longStayRate * (1 - intent.amount);
  const nextCount = Math.round(fact.discharges * nextRate);
  const freed = longStayCount - nextCount;
  return {
    id: 'ipd-longstay-down',
    title: 'Prolonged stay reduction scenario',
    current: `Long-stay share ~${pct(longStayRate)} (${num(longStayCount)} discharges) · median ${num(los, 1)} days · focus specialty ${longest.id}`,
    change: `Illustrative ${pct(intent.amount, 0)} reduction in prolonged-stay share`,
    estimated: `Long-stay share near ${pct(nextRate)} · about ${num(freed)} fewer long-stay discharges in the year story`,
    assumptions: 'Uses the 14-day review line in this demonstration. Specialty severity is not adjusted.',
    implications: `Targeting ${longest.id} long-stay lists first concentrates management attention where stay days accumulate.`,
    followUp: 'Long-stay rate, specialty median stay, and ready-but-not-discharged count',
    owner: 'Inpatient operations lead',
  };
}

export function formatWhatIfAnswer(result: WhatIfResult): {
  observation: string;
  evidence: string;
  explanation: string;
  action: string;
  benefit: string;
  outcome: string;
  role: string;
} {
  return {
    observation: `Current scenario: ${result.current}`,
    evidence: `Proposed change: ${result.change}. Estimated outcome: ${result.estimated}`,
    explanation: `Assumptions: ${result.assumptions}`,
    action: `Management implication: ${result.implications} Owner: ${result.owner}.`,
    benefit: result.implications,
    outcome: `Illustrative scenario only. Follow up with: ${result.followUp}. Not a validated forecast.`,
    role: result.owner,
  };
}
