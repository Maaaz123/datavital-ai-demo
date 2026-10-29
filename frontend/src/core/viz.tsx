import { useState, type MouseEvent, type ReactNode } from 'react';
import { MONTHS, type Lang } from '@/showcase/copy';
import { findKpi } from '@/showcase/engine';
import { scenarioFor, type AnnualFact, type Scenario } from '@/showcase/facts';
import { measure } from '@/showcase/measures';
import { allScreens } from './stories';

type Series = { name: string; values: number[] };

export type ChartType = 'bars' | 'line' | 'funnel' | 'flow' | 'waterfall' | 'area' | 'stacked' | 'heatmap' | 'pareto' | 'bullet';

export type Figure = {
  title: string;
  categories: string[];
  series: Series[];
  unit: string;
  digits: number;
  note: string;
  type: ChartType;
  domain: string;
  subjects: string[];
  rows?: string[];
  matrix?: number[][];
};

function labels(lang: Lang): string[] {
  return MONTHS[lang];
}

function num(fact: AnnualFact, field: keyof AnnualFact): number {
  const value = fact[field];
  return typeof value === 'number' ? value : 0;
}

function fig(
  domain: string,
  subjects: string[],
  type: ChartType,
  title: string,
  categories: string[],
  series: Series[],
  unit: string,
  digits: number,
  note: string,
): Figure {
  return { domain, subjects, type, title, categories, series, unit, digits, note };
}

function monthSeries(scenario: Scenario, field: keyof AnnualFact): number[] {
  return scenario.months.map((month) => num(month, field));
}

function pair(ctx: Ctx, title: string, left: string, right: string, a: number, b: number, unit: string, digits: number, note: string, subjects: string[], type: ChartType = 'bars'): Figure {
  return fig(ctx.domain, subjects, type, title, [left, right], [{ name: unit, values: [a, b] }], unit, digits, note);
}

type Ctx = { id: string; domain: string; scenario: Scenario; prior: Scenario; lang: Lang; months: string[] };

function shown(key: string, hospital: string, year: number): number {
  const kpi = findKpi(key);
  if (!kpi) throw new Error(`Chart references missing KPI ${key}`);
  const item = measure(kpi, hospital, year, 'All');
  return item.kind === 'rate' ? item.value * 100 : item.value;
}

function ratePct(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : 0;
}

const BUILDERS: Record<string, (ctx: Ctx) => Figure[]> = {
  emergency: (c) => [
    fig(c.domain, ['door-to-provider'], 'line', 'Door-to-provider wait', c.months, [
      { name: 'Median', values: monthSeries(c.scenario, 'edWaitMedianMin') },
      { name: 'P90', values: monthSeries(c.scenario, 'edWaitP90Min') },
    ], 'minutes', 0, 'Median and P90 are separate. The average stay is not this chart.'),
    fig(c.domain, ['triage'], 'funnel', 'Triage distribution', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{
      name: 'Arrivals',
      values: [c.scenario.focus.acuity1, c.scenario.focus.acuity2, c.scenario.focus.acuity3, c.scenario.focus.acuity4, c.scenario.focus.acuity5],
    }], 'arrivals', 0, 'The five acuity counts sum to emergency arrivals.'),
  ],
  beds: (c) => [
    fig(c.domain, ['beds'], 'flow', 'Staffed bed snapshot', ['Occupied', 'Available', 'Blocked'], [{
      name: 'Beds',
      values: [c.scenario.focus.occupiedBeds, c.scenario.focus.availableBeds, c.scenario.focus.blockedBeds],
    }], 'beds', 0, 'Occupied, available, and blocked beds sum to staffed beds.'),
    fig(c.domain, ['occupancy'], 'line', 'Monthly occupancy', c.months, [{
      name: 'Occupancy',
      values: c.scenario.months.map((month) => (month.staffedBeds ? (month.occupiedBeds / month.staffedBeds) * 100 : 0)),
    }], 'percent', 1, 'Occupied beds divided by staffed beds for each month.'),
  ],
  inpatient: (c) => [
    fig(c.domain, ['length-of-stay'], 'line', 'Inpatient stay', c.months, [
      { name: 'Median days', values: monthSeries(c.scenario, 'ipLosDays') },
      { name: 'P90 days', values: monthSeries(c.scenario, 'ipLosP90Days') },
    ], 'days', 1, 'Median and P90. The average is a separate measure and is not plotted here.'),
    fig(c.domain, ['census'], 'bars', 'Admissions and discharges', c.months, [
      { name: 'Admissions', values: monthSeries(c.scenario, 'admissions') },
      { name: 'Discharges', values: monthSeries(c.scenario, 'discharges') },
    ], 'stays', 0, 'Monthly census flow for this hospital. Deaths and transfers sit in the identity, not in this pair.'),
  ],
  outpatient: (c) => [
    fig(c.domain, ['clinic-wait'], 'line', 'Clinic waiting time', c.months, [
      { name: 'Median', values: monthSeries(c.scenario, 'opWaitMedianMin') },
      { name: 'P90', values: monthSeries(c.scenario, 'opWaitP90Min') },
    ], 'minutes', 0, 'Outpatient wait. This is not the emergency door-to-provider wait.'),
    fig(c.domain, ['clinic-flow'], 'funnel', 'Clinic throughput', ['Demand', 'Booked', 'Attended'], [{
      name: 'Appointments',
      values: [c.scenario.focus.apptDemand, c.scenario.focus.apptBooked, c.scenario.focus.apptAttended],
    }], 'appointments', 0, 'Attended does not exceed booked, and booked does not exceed demand.'),
  ],
  appointments: (c) => [
    fig(c.domain, ['appointment-funnel'], 'funnel', 'Appointment outcome', ['Booked', 'Attended', 'Cancelled', 'No-show'], [{
      name: 'Appointments',
      values: [c.scenario.focus.apptBooked, c.scenario.focus.apptAttended, c.scenario.focus.apptCancelled, c.scenario.focus.apptNoShow],
    }], 'appointments', 0, 'Attended, cancelled, and no-show sum to booked.'),
    fig(c.domain, ['appointment-volume'], 'line', 'Booked appointments', c.months, [{ name: 'Booked', values: monthSeries(c.scenario, 'apptBooked') }], 'appointments', 0, 'Monthly booked appointments.'),
  ],
  surgery: (c) => [
    fig(c.domain, ['theatre-cases'], 'flow', 'Surgical cases', ['Requested', 'Completed', 'Cancelled'], [{
      name: 'Cases',
      values: [c.scenario.focus.surgRequests, c.scenario.focus.surgCompleted, c.scenario.focus.surgCancelled],
    }], 'cases', 0, 'Completed plus cancelled equals requested.'),
    fig(c.domain, ['turnover'], 'line', 'Cancellation rate', c.months, [{
      name: 'Cancelled',
      values: c.scenario.months.map((month) => (month.surgRequests ? (month.surgCancelled / month.surgRequests) * 100 : 0)),
    }], 'percent', 1, 'Cancelled cases divided by requested cases. Volume stays in the case chart so a small count is not drawn on the volume scale.'),
  ],
  laboratory: (c) => [
    fig(c.domain, ['lab-tat'], 'line', 'Laboratory turnaround', c.months, [
      { name: 'Median', values: monthSeries(c.scenario, 'labTatMedianMin') },
      { name: 'P90', values: monthSeries(c.scenario, 'labTatP90Min') },
    ], 'minutes', 0, 'Median and P90 report time. The average is not this line.'),
    fig(c.domain, ['lab-orders'], 'bars', 'Orders and results', ['Ordered', 'Resulted', 'Cancelled'], [{
      name: 'Tests',
      values: [c.scenario.focus.labOrders, c.scenario.focus.labResulted, c.scenario.focus.labCancelled],
    }], 'tests', 0, 'Resulted and cancelled are parts of the laboratory order workload.'),
  ],
  radiology: (c) => [
    fig(c.domain, ['imaging-tat'], 'line', 'Report turnaround', c.months, [
      { name: 'Median', values: monthSeries(c.scenario, 'radTatMedianMin') },
      { name: 'P90', values: monthSeries(c.scenario, 'radTatP90Min') },
    ], 'minutes', 0, 'Imaging report time, not clinic wait.'),
    fig(c.domain, ['modalities'], 'bars', 'Examination mix', ['X-ray', 'CT', 'Ultrasound', 'MR'], [{
      name: 'Exams',
      values: [c.scenario.focus.radXr, c.scenario.focus.radCt, c.scenario.focus.radUs, c.scenario.focus.radMr],
    }], 'exams', 0, 'Modalities sum to radiology orders.'),
  ],
  pharmacy: (c) => [
    fig(c.domain, ['medication-flow'], 'flow', 'Medication workflow', ['Ordered', 'Dispensed', 'Administered'], [{
      name: 'Orders',
      values: [c.scenario.focus.pharmOrders, c.scenario.focus.pharmDispensed, c.scenario.focus.pharmAdmin],
    }], 'orders', 0, 'Administered does not exceed dispensed, and dispensed does not exceed ordered.'),
    fig(c.domain, ['medication-workload'], 'line', 'Pharmacy workload', c.months, [{ name: 'Orders', values: monthSeries(c.scenario, 'pharmOrders') }], 'orders', 0, 'Monthly medication orders. This is pharmacy workload, not the inpatient census.'),
  ],
  rcm: ledger,
  revenue: ledger,
  'billing-collections': ledger,
  claims: claims,
  'claims-processing': claims,
  workforce: (c) => [
    fig(c.domain, ['staffing'], 'bars', 'Required and filled staffing', ['Required', 'Filled'], [{
      name: 'FTE',
      values: [c.scenario.focus.requiredFte, c.scenario.focus.filledFte],
    }], 'FTE', 1, 'Vacancy is required FTE minus filled FTE.'),
    fig(c.domain, ['overtime'], 'line', 'Overtime hours', c.months, [{ name: 'Overtime', values: monthSeries(c.scenario, 'overtimeHours') }], 'hours', 0, 'Monthly overtime. This is not a bed chart.'),
  ],
  experience: experience,
  'patient-experience': experience,
  journey: (c) => [
    fig(c.domain, ['journey-minutes'], 'flow', 'Waiting points, in minutes', ['Door to provider', 'ED stay', 'Clinic wait'], [{
      name: 'Median minutes',
      values: [c.scenario.focus.edWaitMedianMin, c.scenario.focus.edLosMedianMin, c.scenario.focus.opWaitMedianMin],
    }], 'minutes', 0, 'Three different waits. Inpatient stay is days and is the chart beside this one.'),
    fig(c.domain, ['length-of-stay'], 'line', 'Inpatient median stay', c.months, [{ name: 'Days', values: monthSeries(c.scenario, 'ipLosDays') }], 'days', 1, 'Kept on its own scale so days are not drawn against minutes.'),
  ],
  dialysis: (c) => [
    fig(c.domain, ['dialysis-sessions'], 'line', 'Dialysis sessions', c.months, [{ name: 'Sessions', values: monthSeries(c.scenario, 'dialysisSessions') }], 'sessions', 0, 'Working figure for this reporting period. NMR names dialysis and does not list these columns.'),
    pair(c, 'Sessions versus the prior year', String(c.scenario.year), String(c.prior.year), c.scenario.focus.dialysisSessions, c.prior.focus.dialysisSessions, 'sessions', 0, 'Same hospital, prior year in the scenario.', ['dialysis-sessions']),
  ],
  mortality: (c) => [
    fig(c.domain, ['mortality-cohorts'], 'bars', 'Mortality by cohort', ['ED / arrivals', 'Inpatient / discharges', 'Surgical / completed'], [{
      name: 'Percent',
      values: [
        shown('kpi_ed_mortality_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_dx_in_hospital_mortality_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_surg_30d_mortality_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 2, 'Three different denominators. None of these is an individual prediction.'),
    fig(c.domain, ['inpatient-deaths'], 'line', 'Inpatient deaths', c.months, [{ name: 'Deaths', values: monthSeries(c.scenario, 'deaths') }], 'deaths', 0, 'The inpatient census cohort only.'),
  ],
  diagnoses: (c) => [
    fig(c.domain, ['documentation'], 'bars', 'Documentation and outcomes', ['Documentation', '30-day readmission', 'In-hospital mortality'], [{
      name: 'Percent',
      values: [
        shown('kpi_dx_documentation_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_dx_30d_readmission_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_dx_in_hospital_mortality_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'Documentation uses encounters. Mortality and readmission use discharges. Cohort review only.'),
    fig(c.domain, ['encounters'], 'bars', 'Encounters', c.months, [{ name: 'Encounters', values: monthSeries(c.scenario, 'encounters') }], 'encounters', 0, 'The documentation denominator over the year.'),
  ],
  registry: (c) => [
    fig(c.domain, ['patients'], 'bars', 'People in scope', ['Active patients', 'New patients'], [{
      name: 'People',
      values: [c.scenario.focus.activePatients, Math.round(c.scenario.focus.activePatients * 0.18)],
    }], 'people', 0, 'Active patients are an annual snapshot. New patients are 18% of that snapshot in this story.'),
    fig(c.domain, ['encounters'], 'line', 'Encounters', c.months, [{ name: 'Encounters', values: monthSeries(c.scenario, 'encounters') }], 'encounters', 0, 'Monthly encounters. People are not summed across months.'),
  ],
  hub: hospitals,
  command: hospitals,
  comparison: hospitals,
  stability: (c) => [
    fig(c.domain, ['door-to-provider'], 'line', 'Door-to-provider wait', c.months, [
      { name: 'Median', values: monthSeries(c.scenario, 'edWaitMedianMin') },
      { name: 'P90', values: monthSeries(c.scenario, 'edWaitP90Min') },
    ], 'minutes', 0, 'Stability of the wait, separate from occupancy.'),
    occupancy(c),
  ],
  risk: (c) => [
    fig(c.domain, ['risk-rates'], 'bars', 'Signals a leader can review', ['Boarding > 4h', 'Occupancy', '30-day readmission', 'Claim denial'], [{
      name: 'Percent',
      values: [
        shown('kpi_ed_boarding_gt_4h_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_bed_occupancy_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_readmission_30d_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_claim_denied_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'Four different cohorts. Each percentage uses its own denominator.'),
    fig(c.domain, ['door-to-provider'], 'line', 'Where the wait moved', c.months, [{ name: 'Median minutes', values: monthSeries(c.scenario, 'edWaitMedianMin') }], 'minutes', 0, 'The emergency wait behind the boarding signal.'),
  ],
  actions: (c) => [
    fig(c.domain, ['complaints'], 'funnel', 'Open work a person can review', ['Complaints opened', 'Complaints closed'], [{
      name: 'Complaints',
      values: [c.scenario.focus.complaintsOpened, c.scenario.focus.complaintsClosed],
    }], 'complaints', 0, 'Working figure for this reporting period. Closing a case here is not a measured hospital result.'),
    fig(c.domain, ['staffing'], 'bars', 'Staffing room to act', ['Vacancy', 'Coverage'], [{
      name: 'Percent',
      values: [
        shown('kpi_wf_vacancy_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_wf_staffing_coverage', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'Vacancy and coverage are complements of the same FTE snapshot.'),
  ],
  'clinical-quality': (c) => [
    fig(c.domain, ['safety-rates'], 'bars', 'Cohort safety signals', ['Post-op complication', '30-day readmission', 'In-hospital mortality'], [{
      name: 'Percent',
      values: [
        shown('kpi_surg_postop_complication_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_readmission_30d_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_dx_in_hospital_mortality_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'Each bar has its own denominator: completed cases or discharges.'),
    fig(c.domain, ['medication-safety'], 'bars', 'Medication safety events', ['Events'], [{
      name: 'Events',
      values: [shown('kpi_med_safety_event_volume', c.scenario.hospital, c.scenario.year)],
    }], 'events', 0, '0.4% of administrations. A count, not a patient-level alert.'),
  ],
  'infection-prevention': (c) => [
    fig(c.domain, ['hai'], 'line', 'Surveillance events', c.months, [{ name: 'Events', values: monthSeries(c.scenario, 'haiEvents') }], 'events', 0, 'Working figure for this reporting period. Outbreak declarations are a separate valid zero.'),
    pair(c, 'Surveillance versus the prior year', String(c.scenario.year), String(c.prior.year), c.scenario.focus.haiEvents, c.prior.focus.haiEvents, 'events', 0, 'Same hospital. Not an admission chart.', ['hai']),
  ],
  'supply-chain': (c) => [
    fig(c.domain, ['medication-demand'], 'flow', 'Demand fulfilled', ['Ordered', 'Dispensed'], [{
      name: 'Medication orders',
      values: [c.scenario.focus.pharmOrders, c.scenario.focus.pharmDispensed],
    }], 'orders', 0, 'This is medication demand, not a stock balance. A warehouse ledger is not in the scenario.'),
    fig(c.domain, ['medication-demand'], 'line', 'Monthly medication demand', c.months, [{ name: 'Orders', values: monthSeries(c.scenario, 'pharmOrders') }], 'orders', 0, 'Pharmacy orders stand in for demand. Laboratory orders are not redrawn as stock.'),
  ],
  'biomedical-equipment': (c) => [
    fig(c.domain, ['uptime'], 'line', 'Equipment uptime', c.months, [{ name: 'Uptime', values: monthSeries(c.scenario, 'equipmentUptime') }], 'percent', 1, 'Working figure for this reporting period. No equipment dataset is in the source.'),
    fig(c.domain, ['downtime'], 'bars', 'Downtime events', c.months, [{ name: 'Events', values: monthSeries(c.scenario, 'downtimeEvents') }], 'events', 0, 'A month can be a valid zero. The axis stays visible.'),
  ],
  'ward-transfer': (c) => [
    fig(c.domain, ['transfers'], 'bars', 'Transfers in and out', c.months, [
      { name: 'In', values: monthSeries(c.scenario, 'transfersIn') },
      { name: 'Out', values: monthSeries(c.scenario, 'transfersOut') },
    ], 'transfers', 0, 'Events, not the net census. Net census change is zero by identity.'),
    pair(c, 'Transfer events this year', 'In', 'Out', c.scenario.focus.transfersIn, c.scenario.focus.transfersOut, 'transfers', 0, 'Annual totals of the monthly series.', ['transfers']),
  ],
  morgue: (c) => [
    fig(c.domain, ['morgue-release'], 'line', 'Release time', c.months, [{ name: 'Hours', values: monthSeries(c.scenario, 'morgueReleaseHours') }], 'hours', 1, 'Working figure for this reporting period. Columns for morgue are not in the source.'),
    fig(c.domain, ['inpatient-deaths'], 'line', 'Inpatient deaths beside that assumption', c.months, [{ name: 'Deaths', values: monthSeries(c.scenario, 'deaths') }], 'deaths', 0, 'The inpatient death cohort. Not a patient-level morgue record.'),
  ],
  'maternal-neonatal': (c) => [
    fig(c.domain, ['births'], 'line', 'Birth encounters', c.months, [{ name: 'Births', values: monthSeries(c.scenario, 'births') }], 'births', 0, 'Working figure for this reporting period. NMR names childbirth and does not list these columns.'),
    pair(c, 'Births versus the prior year', String(c.scenario.year), String(c.prior.year), c.scenario.focus.births, c.prior.focus.births, 'births', 0, 'Same hospital. Not an occupancy chart.', ['births']),
  ],
  'assessments-vitals': (c) => [
    fig(c.domain, ['vital-signs'], 'line', 'Vital-sign sets', c.months, [{
      name: 'Sets',
      values: c.scenario.months.map((month) => month.admissions * 12),
    }], 'sets', 0, 'Twelve sets per admission in this story. Individual vital values are not modeled.'),
    fig(c.domain, ['length-of-stay'], 'line', 'Stay that those sets sit inside', c.months, [{ name: 'Median days', values: monthSeries(c.scenario, 'ipLosDays') }], 'days', 1, 'Inpatient median stay. Not an admission-volume chart.'),
  ],
  eligibility: (c) => [
    fig(c.domain, ['eligibility'], 'line', 'Eligibility checks', c.months, [{ name: 'Checks', values: monthSeries(c.scenario, 'eligibilityChecks') }], 'checks', 0, 'Working figure for this reporting period. Not a claim disposition chart.'),
    pair(c, 'Checks versus the prior year', String(c.scenario.year), String(c.prior.year), c.scenario.focus.eligibilityChecks, c.prior.focus.eligibilityChecks, 'checks', 0, 'Same hospital.', ['eligibility']),
  ],
  'pre-authorization': (c) => [
    fig(c.domain, ['authorization'], 'funnel', 'Authorization requests', ['Requested', 'Denied'], [{
      name: 'Requests',
      values: [c.scenario.focus.preauthRequested, c.scenario.focus.preauthDenied],
    }], 'requests', 0, 'Denied requests are a subset of requested authorizations.'),
    fig(c.domain, ['authorization'], 'line', 'Requests through the year', c.months, [{ name: 'Requested', values: monthSeries(c.scenario, 'preauthRequested') }], 'requests', 0, 'Monthly pre-authorization requests.'),
  ],
  access: trust,
  audit: trust,
  quality: trust,
  'quality-detail': trust,
  metadata: trust,
  'kpi-catalog': trust,
  'semantic-views': trust,
  'verified-queries': trust,
  'ai-governance': (c) => [
    trust(c)[0],
    fig(c.domain, ['freshness'], 'line', 'Modeled landing lag', c.months, [{ name: 'Hours', values: monthSeries(c.scenario, 'freshnessHours') }], 'hours', 1, 'One modeled lag of 6.5 hours for every stream. Not a live integration.'),
  ],
  'ai-overview': hospitals,
  'ai-cases': (c) => [
    fig(c.domain, ['simulated-signals'], 'bars', 'Signals behind decision support', ['30-day readmission', '72-hour revisit', 'Denial rate'], [{
      name: 'Percent',
      values: [
        shown('kpi_readmission_30d_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_ed_72h_revisit_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_claim_denied_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'These rates are inputs to the decision review. They are not model outputs.'),
    fig(c.domain, ['lab-tat'], 'line', 'A delay a use case can reference', c.months, [{ name: 'Median minutes', values: monthSeries(c.scenario, 'labTatMedianMin') }], 'minutes', 0, 'Laboratory median turnaround, one operational input.'),
  ],
  'ai-case': (c) => BUILDERS.emergency(c),
  predictions: (c) => [
    fig(c.domain, ['admissions'], 'line', 'Admission series used for the illustration', c.months, [{ name: 'Admissions', values: monthSeries(c.scenario, 'admissions') }], 'admissions', 0, 'The forecast screen is about this series. It is not a validated forecast.'),
    pair(c, 'Admissions versus the prior year', String(c.scenario.year), String(c.prior.year), c.scenario.focus.admissions, c.prior.focus.admissions, 'admissions', 0, 'Continuation would be an illustration, not a model output.', ['admissions']),
  ],
  insights: (c) => [
    fig(c.domain, ['door-to-provider'], 'line', 'Wait that changed', c.months, [{ name: 'Median minutes', values: monthSeries(c.scenario, 'edWaitMedianMin') }], 'minutes', 0, 'One change worth opening.'),
    occupancy(c),
  ],
  assistant: (c) => BUILDERS.emergency(c),
};

function ledger(c: Ctx): Figure[] {
  const f = c.scenario.focus;
  return [
    fig(c.domain, ['revenue-identity'], 'waterfall', 'Revenue identity', ['Billed', 'Adjustment', 'Allowed'], [{
      name: 'SAR',
      values: [f.billed, f.adjustment, f.allowed],
    }], 'SAR', 0, 'Billed minus adjustment equals allowed. The next chart shows where allowed went.'),
    fig(c.domain, ['collections'], 'bars', 'Where allowed went', ['Payer', 'Patient', 'Write-off', 'Outstanding'], [{
      name: 'SAR',
      values: [f.payerPaid, f.patientPaid, f.writeoff, f.outstanding],
    }], 'SAR', 0, 'These four amounts sum to allowed.'),
  ];
}

function claims(c: Ctx): Figure[] {
  const f = c.scenario.focus;
  return [
    fig(c.domain, ['claims'], 'funnel', 'Claim disposition', ['Submitted', 'Paid', 'Denied', 'Pending'], [{
      name: 'Claims',
      values: [f.claimsSubmitted, f.claimsPaid, f.claimsDenied, f.claimsPending],
    }], 'claims', 0, 'Paid, denied, and pending sum to submitted.'),
    fig(c.domain, ['denials'], 'line', 'Denial rate by month', c.months, [{
      name: 'Denial rate',
      values: c.scenario.months.map((month) => (month.claimsSubmitted ? (month.claimsDenied / month.claimsSubmitted) * 100 : 0)),
    }], 'percent', 1, 'Denied claims divided by submitted claims. Counts stay in the disposition chart so the two scales are not crushed together.'),
  ];
}

function experience(c: Ctx): Figure[] {
  const f = c.scenario.focus;
  return [
    fig(c.domain, ['satisfaction'], 'line', 'Satisfaction through the year', c.months, [{ name: 'Index', values: monthSeries(c.scenario, 'satisfaction') }], 'index', 1, 'Labelled demo index, not an official survey score.'),
    fig(c.domain, ['experience-rates'], 'bars', 'Response, closure, and satisfaction', ['Survey response', 'Complaint closure', 'Satisfaction'], [{
      name: 'Score',
      values: [ratePct(f.surveysReturned, f.surveysSent), ratePct(f.complaintsClosed, f.complaintsOpened), f.satisfaction],
    }], 'percent or index', 1, `Responses ${f.surveysReturned.toLocaleString('en-US')} of ${f.surveysSent.toLocaleString('en-US')}. Closed ${f.complaintsClosed.toLocaleString('en-US')} of ${f.complaintsOpened.toLocaleString('en-US')}. Labelled assumptions.`),
  ];
}

function occupancy(c: Ctx): Figure {
  const sites = scenarioFor('ALL', c.scenario.year).sites;
  return fig(c.domain, ['occupancy'], 'bars', 'Occupancy across five hospitals', ['North', 'South', 'East', 'West', 'Central'], [{
    name: 'Occupancy',
    values: sites.map((site) => (site.annual.staffedBeds ? (site.annual.occupiedBeds / site.annual.staffedBeds) * 100 : 0)),
  }], 'percent', 1, 'Occupied beds divided by staffed beds.');
}

function hospitals(c: Ctx): Figure[] {
  const sites = scenarioFor('ALL', c.scenario.year).sites;
  return [
    occupancy(c),
    fig(c.domain, ['door-to-provider'], 'bars', 'Door-to-provider by hospital', ['North', 'South', 'East', 'West', 'Central'], [{
      name: 'Median minutes',
      values: sites.map((site) => site.annual.edWaitMedianMin),
    }], 'minutes', 0, 'The same wait measure on every site. Not a second occupancy chart.'),
  ];
}

function trust(c: Ctx): Figure[] {
  return [
    fig(c.domain, ['definitions'], 'bars', 'Reporting coverage', ['Defined measures', 'Named measures', 'Working figures'], [{
      name: 'Measures',
      values: [192, 188, 12],
    }], 'measures', 0, '392 performance measures in total. Calculation detail is opened from the indicator library when it was supplied.'),
    fig(c.domain, ['freshness'], 'line', 'Reporting lag', c.months, [{ name: 'Hours', values: monthSeries(c.scenario, 'freshnessHours') }], 'hours', 1, 'The same 6.5 hour lag is shown for every month. This is not a live feed.'),
  ];
}

export function screenCharts(id: string, hospital: string, year: number, lang: Lang = 'en'): Figure[] {
  const build = BUILDERS[id];
  if (!build) throw new Error(`Missing chart configuration for ${id}`);
  const scenario = scenarioFor(hospital, year);
  const prior = scenarioFor(hospital, Math.max(2024, year - 1));
  const charts = build({ id, domain: id, scenario, prior, lang, months: labels(lang) });
  if (charts.length < 2) throw new Error(`Screen ${id} needs a primary and a secondary chart`);
  if (charts.some((chart) => chart.series.some((series) => series.values.some((value) => !Number.isFinite(value))))) {
    throw new Error(`Screen ${id} produced a non-finite chart value`);
  }
  return charts;
}

export function configuredScreenIds(): string[] {
  return Object.keys(BUILDERS);
}

export function requiredScreenIds(): string[] {
  return allScreens().map((screen) => screen.id);
}

function formatTick(value: number, digits: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function Chart({ figure, compact = false, action }: { figure: Figure; compact?: boolean; action?: ReactNode }) {
  const flat = figure.series.flatMap((item) => item.values);
  const allZero = flat.length > 0 && flat.every((value) => value === 0);
  return (
    <figure className={`gc-chart is-${figure.type}`} data-chart-state={allZero ? 'zero' : 'ok'} data-chart-domain={figure.domain}>
      <figcaption className="gc-chart-head">
        <div className="gc-chart-copy">
          <strong>{figure.title}</strong>
          <span>{figure.note}</span>
          {figure.type === 'pareto' ? (
            <ul className="gc-legend">
              <li><i style={{ background: PALETTE[0] }} />{figure.series[0]?.name ?? 'Count'}</li>
              <li><i style={{ background: '#8c6a3d' }} />Cumulative %</li>
            </ul>
          ) : figure.series.length > 1 && figure.type !== 'heatmap' ? (
            <ul className="gc-legend">
              {figure.series.map((item, index) => (
                <li key={item.name}><i style={{ background: PALETTE[index % PALETTE.length] }} />{item.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {action}
      </figcaption>
      <ChartStage>
        {figure.type === 'line' || figure.type === 'area' ? <LineChart figure={figure} area={figure.type === 'area'} compact={compact} /> : null}
        {figure.type === 'funnel' ? <StageChart figure={figure} compact={compact} /> : null}
        {figure.type === 'flow' ? <JourneyChart figure={figure} compact={compact} /> : null}
        {figure.type === 'waterfall' ? <WaterfallChart figure={figure} /> : null}
        {figure.type === 'bars' || figure.type === 'pareto' ? <BarChart figure={figure} pareto={figure.type === 'pareto'} compact={compact} /> : null}
        {figure.type === 'stacked' ? <StackedChart figure={figure} compact={compact} /> : null}
        {figure.type === 'heatmap' ? <HeatmapChart figure={figure} /> : null}
        {figure.type === 'bullet' ? <BulletChart figure={figure} /> : null}
      </ChartStage>
      {compact ? null : <ValueTable figure={figure} />}
    </figure>
  );
}

export function ChartStage({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ x: number; y: number; title: string; value: string } | null>(null);
  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as Element | null)?.closest?.('[data-tip-title]') as HTMLElement | null;
    if (!target) {
      setTip(null);
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    setTip({
      x: Math.min(Math.max(event.clientX - box.left, 12), box.width - 12),
      y: Math.max(event.clientY - box.top - 12, 8),
      title: target.getAttribute('data-tip-title') || '',
      value: target.getAttribute('data-tip-value') || '',
    });
  };
  return (
    <div className="gc-chart-stage" onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
      {children}
      {tip ? (
        <div className="gc-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <strong>{tip.title}</strong>
          <span>{tip.value}</span>
        </div>
      ) : null}
    </div>
  );
}

function tipValue(value: number, digits: number, unit: string, series?: string): string {
  const amount = value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits > 0 && Math.abs(value) < 10 ? digits : 0 });
  const label = series ? `${series}: ${amount}` : amount;
  return unit ? `${label} ${unit}` : label;
}

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74', '#9a5b4a'];

const CHART_WIDTH = 720;
const CHART_PAD_L = 56;
const CHART_PAD_R = 14;

function orderPareto(figure: Figure): { categories: string[]; series: Figure['series'] } {
  if (figure.type !== 'pareto') return { categories: figure.categories, series: figure.series };
  const primary = figure.series[0]?.values ?? [];
  const order = figure.categories
    .map((category, index) => ({ category, index, value: primary[index] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  return {
    categories: order.map((item) => item.category),
    series: figure.series.map((item) => ({
      ...item,
      values: order.map((entry) => item.values[entry.index] ?? 0),
    })),
  };
}

function BarChart({ figure, pareto = false, compact = false }: { figure: Figure; pareto?: boolean; compact?: boolean }) {
  const ordered = pareto ? orderPareto(figure) : { categories: figure.categories, series: figure.series };
  const { categories, series } = ordered;
  const { digits, title, note } = figure;
  const flat = series.flatMap((item) => item.values);
  const max = axisMax(flat.map((value) => Math.abs(value)));
  const width = CHART_WIDTH;
  const height = compact ? 148 : 240;
  const padL = CHART_PAD_L;
  const padR = pareto ? 40 : CHART_PAD_R;
  const padT = compact ? 8 : 16;
  const padB = compact ? 26 : 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const groupW = innerW / Math.max(categories.length, 1);
  const barW = Math.max(4, Math.min(28, (groupW * 0.72) / series.length));
  const ticks = [0, max / 2, max];
  const pctTicks = [0, 50, 100];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${note}`}>
      <title>{title}</title>
      {ticks.map((tick, index) => {
        const y = padT + innerH - (tick / max) * innerH;
        return (
          <g key={`${index}-${tick}`}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} />
            <text x={padL - 8} y={y + 4} textAnchor="end">{formatTick(tick, digits)}</text>
          </g>
        );
      })}
      {pareto ? pctTicks.map((tick) => {
        const y = padT + innerH - (tick / 100) * innerH;
        return (
          <text key={`pct-${tick}`} x={width - padR + 6} y={y + 4} textAnchor="start" fill="#8c6a3d">{`${tick}%`}</text>
        );
      }) : null}
      {categories.map((category, categoryIndex) =>
        series.map((item, seriesIndex) => {
          const value = item.values[categoryIndex] ?? 0;
          const h = (Math.abs(value) / max) * innerH;
          const x = padL + categoryIndex * groupW + (groupW - series.length * barW) / 2 + seriesIndex * barW;
          const y = padT + innerH - h;
          return (
            <rect
              key={`${category}-${item.name}`}
              className="gc-mark"
              x={x}
              y={y}
              width={Math.max(barW - 3, 2)}
              height={Math.max(h, value === 0 ? 0 : 1.5)}
              rx="3"
              fill={PALETTE[seriesIndex % PALETTE.length]}
              data-tip-title={category}
              data-tip-value={tipValue(value, digits, figure.unit, item.name)}
            />
          );
        }),
      )}
      {pareto ? <ParetoLine categories={categories} values={series[0]?.values ?? []} padL={padL} padT={padT} innerH={innerH} groupW={groupW} /> : null}
      {categories.map((category, index) => (
        <text key={category} x={padL + index * groupW + groupW / 2} y={height - 10} textAnchor="middle">
          {category.length > 16 ? `${category.slice(0, 14)}…` : category}
        </text>
      ))}
    </svg>
  );
}

function ParetoLine({ categories, values, padL, padT, innerH, groupW }: { categories: string[]; values: number[]; padL: number; padT: number; innerH: number; groupW: number }) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let running = 0;
  const points = values.map((value, index) => {
    running += value;
    const pct = (running / total) * 100;
    const x = padL + index * groupW + groupW / 2;
    const y = padT + innerH - (pct / 100) * innerH;
    return { x, y, pct, category: categories[index] ?? `Step ${index + 1}` };
  });
  return (
    <g>
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#8c6a3d" strokeWidth="2" />
      {points.map((point) => (
        <circle
          key={`${point.category}-cum`}
          className="gc-mark"
          cx={point.x}
          cy={point.y}
          r="3.5"
          fill="#8c6a3d"
          data-tip-title={point.category}
          data-tip-value={`Cumulative share: ${point.pct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`}
        />
      ))}
    </g>
  );
}

function StackedChart({ figure, compact = false }: { figure: Figure; compact?: boolean }) {
  const { categories, series, digits, title, note } = figure;
  const totals = categories.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
  const max = axisMax(totals);
  const width = CHART_WIDTH;
  const height = compact ? 148 : 240;
  const padL = CHART_PAD_L;
  const padR = CHART_PAD_R;
  const padT = compact ? 8 : 16;
  const padB = compact ? 26 : 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const groupW = innerW / Math.max(categories.length, 1);
  const barW = Math.min(28, groupW * 0.62);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${note}`}>
      <title>{title}</title>
      {[0, max / 2, max].map((tick) => {
        const y = padT + innerH - (tick / max) * innerH;
        return <g key={tick}><line x1={padL} x2={width - padR} y1={y} y2={y} /><text x={padL - 8} y={y + 4} textAnchor="end">{formatTick(tick, digits)}</text></g>;
      })}
      {categories.map((category, categoryIndex) => {
        let stack = 0;
        return series.map((item, seriesIndex) => {
          const value = item.values[categoryIndex] ?? 0;
          const h = (value / max) * innerH;
          const y = padT + innerH - stack - h;
          stack += h;
          const x = padL + categoryIndex * groupW + (groupW - barW) / 2;
          return (
            <rect
              key={`${category}-${item.name}`}
              className="gc-mark"
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0)}
              fill={PALETTE[seriesIndex % PALETTE.length]}
              data-tip-title={category}
              data-tip-value={tipValue(value, digits, figure.unit, item.name)}
            />
          );
        });
      })}
      {categories.map((category, index) => (
        <text key={category} x={padL + index * groupW + groupW / 2} y={height - 12} textAnchor="middle">{category}</text>
      ))}
    </svg>
  );
}

function HeatmapChart({ figure }: { figure: Figure }) {
  const rows = figure.rows ?? [];
  const matrix = figure.matrix ?? [];
  const peak = Math.max(...matrix.flat(), 1);
  const cols = Math.max(figure.categories.length, 1);
  const cellW = 52;
  const cellH = 20;
  const padL = 36;
  const width = padL + cols * cellW + 8;
  const height = 26 + rows.length * cellH;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      <title>{figure.title}</title>
      {figure.categories.map((block, index) => (
        <text key={block} x={padL + index * cellW + cellW / 2} y="12" textAnchor="middle">{block}</text>
      ))}
      {rows.map((day, row) => (
        <g key={day}>
          <text x="2" y={22 + row * cellH + 12}>{day}</text>
          {(matrix[row] ?? []).map((value, column) => {
            const tone = 0.15 + 0.85 * (value / peak);
            return (
              <rect
                key={`${day}-${figure.categories[column]}`}
                className="gc-mark"
                x={padL + column * cellW}
                y={20 + row * cellH}
                width={cellW - 4}
                height={cellH - 4}
                rx="3"
                fill={`rgba(15,110,106,${tone.toFixed(2)})`}
                data-tip-title={`${day} · ${figure.categories[column]}:00`}
                data-tip-value={tipValue(value, 0, figure.unit)}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function BulletChart({ figure }: { figure: Figure }) {
  const required = figure.series[0]?.values ?? [];
  const filled = figure.series[1]?.values ?? [];
  const max = Math.max(...required, ...filled, 1);
  const width = 720;
  const row = 32;
  const height = 20 + figure.categories.length * row;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      <title>{figure.title}</title>
      {figure.categories.map((category, index) => {
        const y = 8 + index * row;
        const need = ((required[index] ?? 0) / max) * 460;
        const have = ((filled[index] ?? 0) / max) * 460;
        return (
          <g key={category}>
            <text x="8" y={y + 16}>{category}</text>
            <rect x="168" y={y + 6} width={need} height="14" rx="3" fill="#d7e4e2" />
            <rect x="168" y={y + 8} width={have} height="10" rx="3" fill="#0f6e6a" />
            <text x={176 + need} y={y + 17}>{`${filled[index] ?? 0} / ${required[index] ?? 0}`}</text>
          </g>
        );
      })}
    </svg>
  );
}

function niceStep(padded: number): number {
  if (padded <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(padded));
  const fraction = padded / power;
  const nice = fraction <= 1 ? 1
    : fraction <= 1.25 ? 1.25
    : fraction <= 1.5 ? 1.5
    : fraction <= 2 ? 2
    : fraction <= 2.5 ? 2.5
    : fraction <= 3 ? 3
    : fraction <= 3.5 ? 3.5
    : fraction <= 4 ? 4
    : fraction <= 5 ? 5
    : fraction <= 6 ? 6
    : fraction <= 7 ? 7
    : fraction <= 8 ? 8
    : fraction <= 9 ? 9
    : 10;
  return nice * power;
}

export function axisMax(values: number[]): number {
  const peak = Math.max(...values, 0);
  if (peak <= 0) return 1;
  // Nice scale around the actual peak. Do not force 0–100 — that flattens day/hour
  // charts (LOS ≈ 4–8). Prefer tight headroom so plots fill the panel instead of
  // leaving an empty band under a jumped-up nice number (e.g. 800 → 1000).
  return niceStep(peak * 1.06);
}

function axisMin(floor: number, peak: number): number {
  if (floor <= 0 || peak <= 0) return 0;
  // Snap down to a readable tick below the data floor.
  const pad = Math.max(peak - floor, peak * 0.04);
  const target = Math.max(0, floor - pad);
  if (target === 0) return 0;
  const power = 10 ** Math.floor(Math.log10(target));
  return Math.floor(target / power) * power;
}

/** Line/area domain: zoom when the series is flat so it does not sit as a hairline with empty sky/floor. */
export function lineDomain(values: number[]): { min: number; max: number } {
  const peak = Math.max(...values, 0);
  const floor = Math.min(...values, peak);
  if (peak <= 0) return { min: 0, max: 1 };
  const dataSpan = peak - floor;
  // Bars keep a zero baseline elsewhere. Lines with low relative variance can zoom,
  // but keep at least ~20% of peak as span so flat series are not over-amplified.
  if (dataSpan > 0 && dataSpan < peak * 0.4) {
    const min = axisMin(floor, peak);
    const needed = Math.max(dataSpan * 1.35, peak * 0.2);
    const max = niceStep(Math.max(peak * 1.06, min + needed));
    return { min, max: Math.max(max, min + 1) };
  }
  return { min: 0, max: axisMax(values) };
}

export const CHART_VIEW = { width: CHART_WIDTH, padL: CHART_PAD_L, padR: CHART_PAD_R, compactHeight: 148 } as const;

function LineChart({ figure, area = false, compact = false }: { figure: Figure; area?: boolean; compact?: boolean }) {
  const { categories, series, digits, title, note } = figure;
  const flat = series.flatMap((item) => item.values);
  const { min, max } = lineDomain(flat);
  const span = Math.max(max - min, 1);
  const width = CHART_WIDTH;
  const height = compact ? 148 : 240;
  const padL = CHART_PAD_L;
  const padR = CHART_PAD_R;
  const padT = compact ? 10 : 18;
  const padB = compact ? 26 : 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const step = innerW / Math.max(categories.length - 1, 1);
  const yOf = (value: number) => padT + innerH - ((value - min) / span) * innerH;
  const gradId = `gc-area-${title.replace(/\W+/g, '').toLowerCase()}`;
  return (
    <svg className="gc-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${note}`}>
      <title>{title}</title>
      <defs>
        {series.map((item, seriesIndex) => (
          <linearGradient key={`${item.name}-grad`} id={`${gradId}-${seriesIndex}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE[seriesIndex % PALETTE.length]} stopOpacity="0.28" />
            <stop offset="100%" stopColor={PALETTE[seriesIndex % PALETTE.length]} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {[min, min + span / 2, max].map((tick, index) => (
        <g key={`${index}-${tick}`} className="gc-axis">
          <line x1={padL} x2={width - padR} y1={yOf(tick)} y2={yOf(tick)} />
          <text x={padL - 8} y={yOf(tick) + 4} textAnchor="end">{formatTick(tick, digits)}</text>
        </g>
      ))}
      {series.map((item, seriesIndex) => {
        const points = item.values.map((value, index) => `${padL + index * step},${yOf(value)}`).join(' ');
        const baseline = item.values.map((_, index) => `${padL + index * step},${yOf(min)}`).reverse().join(' ');
        return (
          <g key={item.name}>
            {area ? <polygon className="gc-mark-soft" points={`${points} ${baseline}`} fill={`url(#${gradId}-${seriesIndex})`} /> : null}
            <polyline
              className="gc-mark-line"
              points={points}
              fill="none"
              stroke={PALETTE[seriesIndex % PALETTE.length]}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {item.values.map((value, index) => (
              <circle
                key={`${item.name}-${categories[index]}`}
                className="gc-mark gc-line-dot"
                cx={padL + index * step}
                cy={yOf(value)}
                r="3.5"
                fill="#fff"
                stroke={PALETTE[seriesIndex % PALETTE.length]}
                strokeWidth="2.25"
                data-tip-title={categories[index]}
                data-tip-value={tipValue(value, digits, figure.unit, item.name)}
              />
            ))}
          </g>
        );
      })}
      {categories.map((category, index) => (
        <text key={category} className="gc-axis-label" x={padL + index * step} y={height - 10} textAnchor={index === 0 ? 'start' : index === categories.length - 1 ? 'end' : 'middle'}>{category}</text>
      ))}
    </svg>
  );
}

function JourneyChart({ figure, compact = false }: { figure: Figure; compact?: boolean }) {
  const values = figure.series[0]?.values ?? [];
  const peak = Math.max(...values, 1);
  const nodes = figure.categories.map((name, index) => {
    const value = values[index] ?? 0;
    const tone = index === 0
      ? 'source'
      : /left|before|after/i.test(name)
        ? 'alert'
        : /admit/i.test(name)
          ? 'watch'
          : /triage|discharg/i.test(name)
            ? 'good'
            : 'mid';
    return { name, value, tone: tone as 'source' | 'mid' | 'good' | 'watch' | 'alert', share: value / peak };
  });

  return (
    <div className={`gc-journey ${compact ? 'is-compact' : ''}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      {nodes.map((node, index) => (
        <div key={node.name} className="gc-journey-step" style={{ animationDelay: `${index * 60}ms` }}>
          {index > 0 ? <span className="gc-journey-rail" aria-hidden="true" /> : null}
          <div
            className={`gc-journey-node is-${node.tone}`}
            data-tip-title={node.name}
            data-tip-value={tipValue(node.value, 0, figure.unit)}
          >
            <strong>{node.name}</strong>
            <span>{node.value.toLocaleString('en-US')}</span>
            <i className="gc-journey-meter" style={{ width: `${Math.max(12, node.share * 100)}%` }} aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StageChart({ figure, compact = false }: { figure: Figure; compact?: boolean }) {
  const values = figure.series[0]?.values ?? [];
  const max = Math.max(...values, 1);
  const width = 720;
  const row = compact ? 26 : 36;
  const height = 16 + values.length * row;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      <title>{figure.title}</title>
      {figure.categories.map((category, index) => {
        const value = values[index] ?? 0;
        const bar = Math.max(8, (value / max) * (compact ? 420 : 460));
        const y = index * row + 2;
        const barH = compact ? 14 : 18;
        return (
          <g key={category}>
            <text x="8" y={y + barH}>{category}</text>
            <rect
              className="gc-mark"
              x={compact ? 156 : 210}
              y={y + 2}
              width={bar}
              height={barH}
              rx="7"
              fill={index === 0 ? '#0f6e6a' : '#1e3a5f'}
              data-tip-title={category}
              data-tip-value={tipValue(value, figure.digits, figure.unit)}
            />
            <text x={(compact ? 164 : 220) + bar} y={y + barH}>{value.toLocaleString('en-US', { maximumFractionDigits: figure.digits })}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WaterfallChart({ figure }: { figure: Figure }) {
  const values = figure.series[0]?.values ?? [];
  const billed = values[0] ?? 0;
  const adjustment = values[1] ?? 0;
  const allowed = values[2] ?? billed - adjustment;
  const max = Math.max(billed, 1);
  const width = 720;
  const height = 240;
  const padL = 64;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const innerH = height - padT - padB;
  const yOf = (value: number) => padT + innerH - (value / max) * innerH;
  const slots = [billed, adjustment, allowed];
  const groupW = (width - padL - padR) / slots.length;
  const barW = Math.min(72, groupW * 0.46);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      <title>{figure.title}</title>
      {[0, max / 2, max].map((tick, index) => {
        const y = yOf(tick);
        return (
          <g key={`${index}-${tick}`}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} />
            <text x={padL - 8} y={y + 4} textAnchor="end">{formatTick(tick, 0)}</text>
          </g>
        );
      })}
      {slots.map((value, index) => {
        const top = index === 1 ? billed : value;
        const bottom = index === 1 ? allowed : 0;
        const x = padL + index * groupW + (groupW - barW) / 2;
        const y = yOf(top);
        const h = Math.max(yOf(bottom) - y, 1.5);
        return (
          <g key={figure.categories[index] ?? index}>
            <rect
              className="gc-mark"
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="3"
              fill={index === 1 ? '#8c6a3d' : '#0f6e6a'}
              data-tip-title={figure.categories[index] ?? String(index)}
              data-tip-value={tipValue(value, 0, figure.unit)}
            />
            <text x={x + barW / 2} y={height - 12} textAnchor="middle">{figure.categories[index]}</text>
          </g>
        );
      })}
      <line x1={padL + groupW * 0.5 + barW / 2} x2={padL + groupW * 1.5 - barW / 2} y1={yOf(billed)} y2={yOf(billed)} stroke="#8aa0b8" strokeDasharray="4 4" />
      <line x1={padL + groupW * 1.5 + barW / 2} x2={padL + groupW * 2.5 - barW / 2} y1={yOf(allowed)} y2={yOf(allowed)} stroke="#8aa0b8" strokeDasharray="4 4" />
    </svg>
  );
}

function ValueTable({ figure }: { figure: Figure }) {
  return (
    <table>
      <caption>{`${figure.title} (${figure.unit})`}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          {figure.series.map((item) => <th key={item.name} scope="col">{item.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {figure.categories.map((category, index) => (
          <tr key={category}>
            <th scope="row">{category}</th>
            {figure.series.map((item) => (
              <td key={item.name}>{(item.values[index] ?? 0).toLocaleString('en-US', { maximumFractionDigits: figure.digits })}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
