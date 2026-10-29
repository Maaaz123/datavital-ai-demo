import { scenarioFor, wardRows } from './facts';
import { peakHours } from '@/core/derived';
import { buildIpdView } from '@/core/ipdView';
import { buildOpdView } from '@/core/opdView';
import { buildAppointmentView } from '@/core/appointmentView';
import { type ReportPeriod } from '@/core/period';

export type DomainName = 'Emergency' | 'Beds' | 'Inpatient' | 'Outpatient' | 'Appointments';

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
    'What if median length of stay decreased by 0.5 days?',
  ],
  Outpatient: [
    'What could happen if outpatient arrivals increase by 15%?',
    'What if median waiting time fell by 20%?',
    'What if consultation duration decreased by 10%?',
    'What if clinic session utilization improved by 10 percentage points?',
    'What if incomplete visit documentation decreased by 25%?',
    'What if pending clinical referrals decreased by 20%?',
  ],
  Appointments: [
    'What if the no-show rate decreases by 20%?',
    'What if slot fill rate improves by 10 percentage points?',
    'What if booking lead time decreases by 20%?',
    'What if half of eligible late-cancelled slots are recovered?',
    'What could happen if appointment demand increases by 15%?',
    'What if scheduling capacity is redistributed across specialties?',
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

  // Outpatient intents before ED arrival/demand so "outpatient arrivals" is not classified as ED.
  if (/no-?show/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'appt-noshow-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
  if (/slot fill|fill rate/.test(q) && /(improv|increas)/.test(q)) return { kind: 'appt-fill-up', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/lead time|booking lead|access wait/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'appt-lead-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
  if (/late.?cancel|recover/.test(q) && /(half|50%|recover)/.test(q)) return { kind: 'appt-recover-half', amount: 0.5 };
  if (/appointment demand|scheduling demand/.test(q) && /increas/.test(q)) return { kind: 'appt-demand-up', amount: percent ? Number(percent[1]) / 100 : 0.15 };
  if (/redistribut|rebalance|capacity.*specialt/.test(q)) return { kind: 'appt-redistribute', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/outpatient|clinic/.test(q) && /arriv|demand/.test(q) && /increas/.test(q)) return { kind: 'opd-demand-up', amount: percent ? Number(percent[1]) / 100 : 0.15 };
  if (/outpatient|clinic/.test(q) && /wait/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'opd-wait-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
  if (/consult(ation)? duration/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'opd-consult-down', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/session utilization|utilization/.test(q) && /(improv|increas)/.test(q)) return { kind: 'opd-util-up', amount: percent ? Number(percent[1]) / 100 : 0.1 };
  if (/document/.test(q) && /(fell|decreas|reduc|incomplete)/.test(q)) return { kind: 'opd-doc-down', amount: percent ? Number(percent[1]) / 100 : 0.25 };
  if (/referral/.test(q) && /(fell|decreas|reduc)/.test(q)) return { kind: 'opd-referral-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
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
  if (/appointment|no-?show|slot|lead time|waitlist|schedul/.test(q)) return { kind: 'appt-noshow-down', amount: percent ? Number(percent[1]) / 100 : 0.2 };
  if (/outpatient|clinic|wait|referral|document/.test(q)) return { kind: 'opd-demand-up', amount: percent ? Number(percent[1]) / 100 : 0.15 };
  return null;
}

export function runWhatIf(
  domain: DomainName,
  hospital: string,
  year: number,
  intent?: { kind: string; amount: number } | null,
  period: ReportPeriod = 'year',
): WhatIfResult {
  const fact = scenarioFor(hospital, year).focus;
  const resolved = intent ?? defaultIntent(domain);
  if (domain === 'Emergency') return emergencyWhatIf(hospital, year, fact, resolved);
  if (domain === 'Beds') return bedsWhatIf(fact, resolved);
  if (domain === 'Outpatient') return outpatientWhatIf(hospital, year, period, resolved);
  if (domain === 'Appointments') return appointmentsWhatIf(hospital, year, period, resolved);
  return inpatientWhatIf(hospital, year, period, resolved);
}

function defaultIntent(domain: DomainName): { kind: string; amount: number } {
  if (domain === 'Emergency') return { kind: 'ed-arrivals-up', amount: 0.15 };
  if (domain === 'Beds') return { kind: 'beds-unblock-5', amount: 5 };
  if (domain === 'Outpatient') return { kind: 'opd-demand-up', amount: 0.15 };
  if (domain === 'Appointments') return { kind: 'appt-noshow-down', amount: 0.2 };
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
      current: `ED boarding beyond 4 hours ${pct(boardingShare)} of ${num(fact.edAdmitted)} emergency admissions · door-to-provider time ${num(wait, 1)} minutes`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in boarding share`,
      estimated: `Boarding share near ${pct(nextShare)} · about ${num(freed)} fewer long-boarding admissions in the year story`,
      assumptions: 'Assumes the same admission volume and that freed ED capacity is usable for new arrivals. Not a validated forecast.',
      implications: 'Lower boarding can free emergency bays during peak hours and ease door-to-provider time pressure indirectly.',
      followUp: 'ED boarding beyond 4 hours rate and door-to-provider time (median) after the next peak week',
      owner: 'Emergency operations lead',
    };
  }

  if (intent.kind === 'ed-priority-impact' || intent.kind === 'generic-priority') {
    const peakLift = Math.round(wait * 0.08);
    const boardLift = Math.round(fact.edAdmitted * boardingShare * 0.15);
    return {
      id: 'ed-priority-impact',
      title: 'Highest-impact ED action (illustrative)',
      current: `Door-to-provider time ${num(wait, 1)} minutes · ED boarding beyond 4 hours ${pct(boardingShare)} · LWBS ${pct(leftRate)} · peaks ${peaks}`,
      change: 'Compare covering peak arrival hours versus clearing long-boarding cases',
      estimated: `Peak-hour coverage scenario: about ${num(peakLift, 1)} minutes off the median wait story. Boarding clearance scenario: about ${num(boardLift)} fewer long-boarding admissions.`,
      assumptions: 'Both paths use the same hospital figures. Relative ranking is a demonstration heuristic, not a measured A/B result.',
      implications: 'If door-to-provider time is above the 60-minute review line, peak-hour coverage is the first management lever; if boarding is high, clear admitted patients still in ED first.',
      followUp: 'Door-to-provider time (median), ED boarding beyond 4 hours, and left without being seen (LWBS)',
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
    current: `ED visit volume ${num(arrivals)} · door-to-provider time ${num(wait, 1)} minutes · LWBS ${pct(leftRate)} · peak hours ${peaks}`,
    change: `Illustrative ${pct(lift, 0)} rise in emergency arrivals`,
    estimated: `About ${num(nextArrivals)} visits · door-to-provider time near ${num(nextWait, 1)} minutes · LWBS near ${pct(nextLeft)}`,
    assumptions: 'Wait scales at 45% of the arrival increase and LWBS at 35% — demonstration elasticities only. Not a validated forecast.',
    implications: 'Peak hours absorb most pressure. Without coverage or flow action, ED boarding and LWBS risk both rise.',
    followUp: 'Hourly arrivals, door-to-provider time (median), and left without being seen (LWBS)',
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
      implications: `More ready beds can shorten bed allocation time on pressure wards such as ${top?.id ?? 'the fullest ward'}.`,
      followUp: 'Blocked bed share, vacant ready beds, and bed allocation time (median)',
      owner: 'Bed management lead',
    };
  }

  if (intent.kind === 'beds-assign-faster') {
    const nextAssign = Math.max(20, assign - intent.amount);
    return {
      id: intent.kind,
      title: 'Faster bed allocation scenario',
      current: `Bed allocation time (median) ${num(assign)} minutes · vacant ${num(fact.availableBeds)} · blocked ${num(fact.blockedBeds)}`,
      change: `Illustrative ${num(intent.amount)}-minute improvement in bed allocation time (median)`,
      estimated: `Bed allocation time near ${num(nextAssign)} minutes if the ready pool stays at least ${num(fact.availableBeds)} vacant beds`,
      assumptions: 'Improvement requires vacant ready beds and prioritized pending requests. AI does not allocate a bed alone.',
      implications: 'Faster allocation reduces placement backlog and can ease emergency boarding pressure labeled as a Beds outcome only when bed clocks improve.',
      followUp: 'Bed allocation time (median) and pending bed requests',
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
  hospital: string,
  year: number,
  period: ReportPeriod,
  intent: { kind: string; amount: number },
): WhatIfResult {
  const view = buildIpdView(hospital, year, period);
  const longest = [...view.specialties].sort((a, b) => b.los - a.los)[0];

  if (intent.kind === 'ipd-delay-down') {
    const nextReady = Math.max(0, Math.round(view.readyNotDischarged * (1 - intent.amount)));
    return {
      id: intent.kind,
      title: 'Delayed discharge reduction scenario',
      current: `Medically ready, not discharged ~${num(view.readyNotDischarged)} · median stay ${num(view.losMedian, 1)} days · discharges ${num(view.discharges)} (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in ready-but-not-discharged count`,
      estimated: `Ready-but-not-discharged near ${num(nextReady)} patients · earlier bed release for planned admissions`,
      assumptions: `Uses ${view.periodLabel} census and discharge totals. Medical readiness remains a clinician decision. AI does not discharge a patient. Delay duration clocks are not available.`,
      implications: 'Clearing confirmed discharge barriers frees census without changing bed ownership metrics.',
      followUp: 'Ready-but-not-discharged count and median length of stay',
      owner: 'Inpatient operations lead',
    };
  }

  if (intent.kind === 'ipd-los-down') {
    const nextLos = Math.max(1, view.losMedian - intent.amount);
    const extraDischarges = Math.round(view.census * (intent.amount / Math.max(view.losMedian, 1)));
    return {
      id: intent.kind,
      title: 'Length of stay reduction scenario',
      current: `Median stay ${num(view.losMedian, 1)} days · average ${num(view.losAvg, 1)} · P90 ${num(view.losP90, 1)} · longest specialty ${longest.id} ${num(longest.los, 1)} days (${view.periodLabel})`,
      change: `Illustrative ${num(intent.amount, 1)}-day reduction in median stay`,
      estimated: `Median near ${num(nextLos, 1)} days · roughly ${num(extraDischarges)} additional discharge capacity in the census story`,
      assumptions: `Uses ${view.periodLabel} LOS measures. Case-mix severity is held constant. Observed-to-expected LOS is not available. Illustrative only.`,
      implications: 'Shorter stays reduce prolonged-stay pressure and support planned elective admissions.',
      followUp: 'Median, average, and P90 length of stay by specialty',
      owner: 'Inpatient operations lead',
    };
  }

  const nextRate = view.longStayRate * (1 - intent.amount);
  const nextCount = Math.round(view.discharges * nextRate);
  const freed = view.longStayCount - nextCount;
  return {
    id: 'ipd-longstay-down',
    title: 'Prolonged stay reduction scenario',
    current: `Long-stay share ~${pct(view.longStayRate)} (${num(view.longStayCount)} discharges) · median ${num(view.losMedian, 1)} days · focus specialty ${longest.id} (${view.periodLabel})`,
    change: `Illustrative ${pct(intent.amount, 0)} reduction in prolonged-stay share`,
    estimated: `Long-stay share near ${pct(nextRate)} · about ${num(freed)} fewer long-stay discharges in the ${view.periodLabel} story`,
    assumptions: `Uses the 7-day review line and ${view.periodLabel} discharge total. Specialty severity is not adjusted.`,
    implications: `Targeting ${longest.id} long-stay lists first concentrates management attention where stay days accumulate.`,
    followUp: 'Long-stay rate, specialty median stay, and ready-but-not-discharged count',
    owner: 'Inpatient operations lead',
  };
}

function outpatientWhatIf(
  hospital: string,
  year: number,
  period: ReportPeriod,
  intent: { kind: string; amount: number },
): WhatIfResult {
  const view = buildOpdView(hospital, year, period);
  const hot = [...view.specialties].sort((a, b) => b.waitMedian - a.waitMedian)[0];
  const busiest = [...view.specialties].sort((a, b) => b.visits - a.visits)[0];

  if (intent.kind === 'opd-wait-down') {
    const nextWait = Math.max(8, view.waitMedian * (1 - intent.amount));
    const nextExceed = Math.max(0, Math.round(view.exceedingWait * (1 - intent.amount * 0.8)));
    return {
      id: intent.kind,
      title: 'Clinic waiting reduction scenario',
      current: `Median arrival-to-provider ${num(view.waitMedian, 1)} min · P90 ${num(view.waitP90, 1)} · ${num(view.exceedingWait)} visits over threshold (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in median patient waiting time`,
      estimated: `Median near ${num(nextWait, 1)} minutes · about ${num(view.exceedingWait - nextExceed)} fewer threshold breaches`,
      assumptions: `Uses ${view.periodLabel} clinic waiting clocks. Consultation duration held constant. Not a validated queueing model.`,
      implications: `Shorter waits protect completion and on-time starts, especially in ${hot.id}.`,
      followUp: 'Median and P90 arrival-to-provider; visits exceeding waiting threshold',
      owner: 'Outpatient operations lead',
    };
  }

  if (intent.kind === 'opd-consult-down') {
    const nextConsult = Math.max(10, view.consultDuration * (1 - intent.amount));
    const nextCycle = Math.round((view.waitMedian + nextConsult) * 10) / 10;
    return {
      id: intent.kind,
      title: 'Consultation duration scenario',
      current: `Consultation duration ${num(view.consultDuration, 1)} min · median cycle ${num(view.cycleMedian, 1)} min (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} shorter consultation duration without assuming reduced care quality`,
      estimated: `Consultation near ${num(nextConsult, 1)} minutes · median cycle near ${num(nextCycle, 1)} minutes`,
      assumptions: 'Care quality and clinical content are held constant by assumption. Throughput gains are illustrative only.',
      implications: 'Modest consult-time gains free session capacity when waiting is already controlled.',
      followUp: 'Consultation duration and median clinic cycle time',
      owner: 'Outpatient operations lead',
    };
  }

  if (intent.kind === 'opd-util-up') {
    const nextUtil = Math.min(0.98, view.sessionUtilization + intent.amount);
    const extraVisits = Math.round(view.clinicSessions * view.visitsPerSession * (nextUtil - view.sessionUtilization));
    return {
      id: intent.kind,
      title: 'Session utilization scenario',
      current: `Clinic session utilization ${pct(view.sessionUtilization)} · ${num(view.visitsPerSession, 1)} visits/session (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} point rise in session utilization, subject to capacity`,
      estimated: `Utilization near ${pct(nextUtil)} · about ${num(Math.max(0, extraVisits))} additional attended visits in the period sketch`,
      assumptions: 'Utilization cannot exceed practical clinic capacity. Staffing and room availability are assumed sufficient.',
      implications: 'Higher utilization absorbs demand without adding sessions, but waiting may rise if starts slip.',
      followUp: 'Clinic session utilization and median arrival-to-provider',
      owner: 'Outpatient operations lead',
    };
  }

  if (intent.kind === 'opd-doc-down') {
    const gap = 1 - view.docCompletionRate;
    const nextGap = gap * (1 - intent.amount);
    const nextRate = 1 - nextGap;
    return {
      id: intent.kind,
      title: 'Documentation backlog scenario',
      current: `Documentation completion ${pct(view.docCompletionRate)} · incomplete share ${pct(gap)} (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in incomplete documentation`,
      estimated: `Documentation completion near ${pct(nextRate)}`,
      assumptions: 'Documentation rates are illustrative constructed shares, not extracted chart documents.',
      implications: 'Closing documentation gaps supports safer follow-up handoffs without inventing clinical findings.',
      followUp: 'Clinical documentation completion rate and consultation note completion rate',
      owner: 'Outpatient operations lead',
    };
  }

  if (intent.kind === 'opd-referral-down') {
    const nextPending = Math.max(0, Math.round(view.pendingReferrals * (1 - intent.amount)));
    return {
      id: intent.kind,
      title: 'Pending referral reduction scenario',
      current: `Pending clinical referrals ${num(view.pendingReferrals)} · referral completion ${pct(view.referralCompletionRate)} (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in pending clinical referrals`,
      estimated: `Pending referrals near ${num(nextPending)}`,
      assumptions: 'Referral pathways are illustrative. Specialty receiving systems are not linked.',
      implications: 'Clearing open referrals reduces outstanding clinical actions and follow-up coordination risk.',
      followUp: 'Pending clinical referrals and referral completion rate',
      owner: 'Outpatient operations lead',
    };
  }

  const lift = intent.amount;
  const extra = Math.round(view.visits * lift);
  const nextWait = Math.round((view.waitMedian * (1 + lift * 0.35)) * 10) / 10;
  return {
    id: 'opd-demand-up',
    title: 'Outpatient demand increase scenario',
    current: `Attended visits ${num(view.visits)} · median wait ${num(view.waitMedian, 1)} min · utilization ${pct(view.sessionUtilization)} (${view.periodLabel})`,
    change: `Illustrative ${pct(lift, 0)} rise in outpatient arrivals/attended demand`,
    estimated: `About ${num(extra)} additional visits · median wait near ${num(nextWait, 1)} minutes if session capacity is unchanged`,
    assumptions: `Uses ${view.periodLabel} attended-visit baseline. Booking no-shows stay outside OPD. Not a calibrated forecast.`,
    implications: `Demand growth pressures ${busiest.id} first unless session starts and utilization recover.`,
    followUp: 'Total outpatient visits, median arrival-to-provider, and clinic session utilization',
    owner: 'Outpatient operations lead',
  };
}

function appointmentsWhatIf(
  hospital: string,
  year: number,
  period: ReportPeriod,
  intent: { kind: string; amount: number },
): WhatIfResult {
  const view = buildAppointmentView(hospital, year, period);
  const hotNoShow = [...view.specialties].sort((a, b) => b.noShowRate - a.noShowRate)[0];
  const hotAccess = [...view.specialties].sort((a, b) => b.leadMedian - a.leadMedian)[0];

  if (intent.kind === 'appt-fill-up') {
    const nextFill = Math.min(0.995, view.slotFillRate + intent.amount);
    const extraBooked = Math.round(view.slots * (nextFill - view.slotFillRate));
    return {
      id: intent.kind,
      title: 'Slot fill improvement scenario',
      current: `Slot Fill Rate ${pct(view.slotFillRate)} · Unbooked Slots ${num(view.unbookedSlots)} · Unscheduled Demand ${num(view.waitlistDemand)} (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} point rise in Slot Fill Rate, capped near 99.5%`,
      estimated: `Fill near ${pct(nextFill)} · about ${num(Math.max(0, extraBooked))} additional bookings if waitlist candidates convert`,
      assumptions: `Uses ${view.periodLabel} Bookable Slots. Extra bookings require eligible demand. Not a validated forecast.`,
      implications: 'Higher fill reduces idle capacity but may not shorten lead time if demand still exceeds slots.',
      followUp: 'Slot Fill Rate, Unbooked Slots, and Unscheduled Appointment Demand',
      owner: 'Clinic scheduling lead',
    };
  }

  if (intent.kind === 'appt-lead-down') {
    const nextLead = Math.max(3, view.leadMedian * (1 - intent.amount));
    return {
      id: intent.kind,
      title: 'Booking lead-time reduction scenario',
      current: `Median Booking Lead Time ${num(view.leadMedian, 1)} days · P90 ${num(view.leadP90, 1)} · Third Next Available ${num(view.thirdNextAvailable)} days (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} reduction in Median Booking Lead Time`,
      estimated: `Median lead near ${num(nextLead, 1)} days if specialty templates and openings improve`,
      assumptions: `Observation date ${view.observationDate}. Lead time is not OPD clinic waiting. Illustrative only.`,
      implications: `Shorter access waits help ${hotAccess.id} first and may lower no-show tilt in long-lead bands.`,
      followUp: 'Median Booking Lead Time and Third Next Available Appointment',
      owner: 'Clinic scheduling lead',
    };
  }

  if (intent.kind === 'appt-recover-half') {
    const eligibleLate = Math.round(view.lateCancellations * 0.2); // minority of late cancels still rebookable
    const recoveredExtra = Math.round(eligibleLate * intent.amount);
    const nextRecovered = Math.min(view.eligibleReleasedSlots, view.recoveredSlots + recoveredExtra);
    return {
      id: intent.kind,
      title: 'Late-cancel recovery scenario',
      current: `Late cancellations ${num(view.lateCancellations)} · Rebooked ${num(view.recoveredSlots)} of ${num(view.eligibleReleasedSlots)} eligible released (${view.periodLabel})`,
      change: `Illustrative recovery of ${pct(intent.amount, 0)} of eligible late-cancelled slots`,
      estimated: `About ${num(recoveredExtra)} additional recoveries · rebooked near ${num(nextRecovered)} (still ≤ eligible released)`,
      assumptions: 'A released slot is recovered only when rebooked. No-shows do not release early. Waitlist candidates are assumed contactable.',
      implications: 'Recovering late cancels protects fill without adding clinic sessions.',
      followUp: 'Rebooked Released Slots, Unfilled Released Slots, and Slot Recovery Rate',
      owner: 'Outpatient access manager',
    };
  }

  if (intent.kind === 'appt-demand-up') {
    const extra = Math.round(view.demand * intent.amount);
    const nextWaitlist = Math.max(0, view.waitlistDemand + extra - view.unbookedSlots);
    return {
      id: intent.kind,
      title: 'Appointment demand increase scenario',
      current: `Demand ${num(view.demand)} · Bookable Slots ${num(view.slots)} · Unscheduled Demand ${num(view.waitlistDemand)} (${view.periodLabel})`,
      change: `Illustrative ${pct(intent.amount, 0)} rise in appointment demand`,
      estimated: `About ${num(extra)} additional requests · unscheduled demand near ${num(nextWaitlist)} if slots stay fixed`,
      assumptions: `Uses ${view.periodLabel} demand baseline. Slot supply held constant unless templates change.`,
      implications: 'Demand growth without fill or recovery improvements lengthens lead time.',
      followUp: 'Appointment Demand, Unscheduled Appointment Demand, and Median Booking Lead Time',
      owner: 'Outpatient access manager',
    };
  }

  if (intent.kind === 'appt-redistribute') {
    const moved = Math.round(view.slots * 0.05);
    return {
      id: intent.kind,
      title: 'Specialty capacity redistribution scenario',
      current: `Bookable Slots ${num(view.slots)} · fill ${pct(view.slotFillRate)} · longest access ${hotAccess.id} (${view.periodLabel})`,
      change: `Illustrative redistribution of about ${num(moved)} slots toward higher-pressure specialties (total capacity conserved)`,
      estimated: `Hospital slot total remains ${num(view.slots)} · ${hotAccess.id} access pressure eases if openings move there`,
      assumptions: 'Total eligible capacity is conserved. Staffing and room constraints are assumed feasible.',
      implications: 'Redistribution helps access without claiming new capacity was created.',
      followUp: 'Third Next Available by Specialty and specialty Slot Fill Rate',
      owner: 'Clinic scheduling lead',
    };
  }

  const nextNoShow = view.noShowRate * (1 - intent.amount);
  const saved = Math.round(view.booked * (view.noShowRate - nextNoShow));
  return {
    id: 'appt-noshow-down',
    title: 'No-show reduction scenario',
    current: `No-show Rate ${pct(view.noShowRate)} (${num(view.noShow)} of ${num(view.booked)}) · focus specialty ${hotNoShow.id} (${view.periodLabel})`,
    change: `Illustrative ${pct(intent.amount, 0)} relative reduction in No-show Rate`,
    estimated: `No-show Rate near ${pct(nextNoShow)} · about ${num(saved)} additional attended visits if those patients convert`,
    assumptions: `Uses ${view.periodLabel} booked denominator. Conversion assumes outreach succeeds; not automatic attendance.`,
    implications: `Focusing ${hotNoShow.id} reminders and confirmation pathways concentrates impact where no-shows accumulate.`,
    followUp: 'No-show Rate, Attendance Rate, and Slots Lost to No-shows & Late Cancellations',
    owner: 'Outpatient access manager',
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
