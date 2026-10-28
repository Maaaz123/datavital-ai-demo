import { MONTHS, type Lang } from '@/showcase/copy';
import { findKpi } from '@/showcase/engine';
import { scenarioFor, type AnnualFact, type Scenario } from '@/showcase/facts';
import { measure } from '@/showcase/measures';
import { allScreens } from './stories';

type Series = { name: string; values: number[] };

export type ChartType = 'bars' | 'line' | 'funnel' | 'flow' | 'waterfall';

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
    fig(c.domain, ['dialysis-sessions'], 'line', 'Dialysis sessions', c.months, [{ name: 'Sessions', values: monthSeries(c.scenario, 'dialysisSessions') }], 'sessions', 0, 'Labelled demo assumption. NMR names dialysis and does not list these columns.'),
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
    }], 'complaints', 0, 'Labelled demo assumption. Closing a case here is not a measured hospital result.'),
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
    fig(c.domain, ['hai'], 'line', 'Surveillance events', c.months, [{ name: 'Events', values: monthSeries(c.scenario, 'haiEvents') }], 'events', 0, 'Labelled demo assumption. Outbreak declarations are a separate valid zero.'),
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
    fig(c.domain, ['uptime'], 'line', 'Equipment uptime', c.months, [{ name: 'Uptime', values: monthSeries(c.scenario, 'equipmentUptime') }], 'percent', 1, 'Labelled demo assumption. No equipment dataset is in the source.'),
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
    fig(c.domain, ['morgue-release'], 'line', 'Release time', c.months, [{ name: 'Hours', values: monthSeries(c.scenario, 'morgueReleaseHours') }], 'hours', 1, 'Labelled demo assumption. Columns for morgue are not in the source.'),
    fig(c.domain, ['inpatient-deaths'], 'line', 'Inpatient deaths beside that assumption', c.months, [{ name: 'Deaths', values: monthSeries(c.scenario, 'deaths') }], 'deaths', 0, 'The inpatient death cohort. Not a patient-level morgue record.'),
  ],
  'maternal-neonatal': (c) => [
    fig(c.domain, ['births'], 'line', 'Birth encounters', c.months, [{ name: 'Births', values: monthSeries(c.scenario, 'births') }], 'births', 0, 'Labelled demo assumption. NMR names childbirth and does not list these columns.'),
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
    fig(c.domain, ['eligibility'], 'line', 'Eligibility checks', c.months, [{ name: 'Checks', values: monthSeries(c.scenario, 'eligibilityChecks') }], 'checks', 0, 'Labelled demo assumption. Not a claim disposition chart.'),
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
    fig(c.domain, ['simulated-signals'], 'bars', 'Signals behind simulated use cases', ['30-day readmission', '72-hour revisit', 'Denial rate'], [{
      name: 'Percent',
      values: [
        shown('kpi_readmission_30d_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_ed_72h_revisit_rate', c.scenario.hospital, c.scenario.year),
        shown('kpi_claim_denied_rate', c.scenario.hospital, c.scenario.year),
      ],
    }], 'percent', 1, 'Illustrative inputs for simulated use cases. Not model outputs.'),
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
    fig(c.domain, ['definitions'], 'bars', 'Definition inventory', ['Catalog', 'Registry labels', 'Demo assumptions'], [{
      name: 'Definitions',
      values: [192, 188, 12],
    }], 'definitions', 0, 'Source classifications, not hospital volumes. 392 definitions in total.'),
    fig(c.domain, ['freshness'], 'line', 'Modeled landing lag', c.months, [{ name: 'Hours', values: monthSeries(c.scenario, 'freshnessHours') }], 'hours', 1, 'One modeled lag of 6.5 hours. Defect counts of zero stay on the metric strip.'),
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

export function Chart({ figure }: { figure: Figure }) {
  const flat = figure.series.flatMap((item) => item.values);
  const allZero = flat.every((value) => value === 0);
  return (
    <figure className={`gc-chart is-${figure.type}`} data-chart-state={allZero ? 'zero' : 'ok'} data-chart-domain={figure.domain}>
      <figcaption>
        <strong>{figure.title}</strong>
        <span>{figure.note}</span>
        {figure.series.length > 1 ? (
          <ul className="gc-legend">
            {figure.series.map((item, index) => (
              <li key={item.name}><i style={{ background: index === 0 ? '#0f6e6a' : '#8c6a3d' }} />{item.name}</li>
            ))}
          </ul>
        ) : null}
      </figcaption>
      {figure.type === 'line' ? <LineChart figure={figure} /> : null}
      {figure.type === 'funnel' || figure.type === 'flow' ? <StageChart figure={figure} /> : null}
      {figure.type === 'waterfall' ? <WaterfallChart figure={figure} /> : null}
      {figure.type === 'bars' ? <BarChart figure={figure} /> : null}
      <ValueTable figure={figure} />
    </figure>
  );
}

function BarChart({ figure }: { figure: Figure }) {
  const { categories, series, digits, title, note } = figure;
  const flat = series.flatMap((item) => item.values);
  const max = Math.max(...flat.map((value) => Math.abs(value)), 1);
  const width = 720;
  const height = 240;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const groupW = innerW / Math.max(categories.length, 1);
  const barW = Math.max(4, Math.min(28, (groupW * 0.72) / series.length));
  const ticks = [0, max / 2, max];
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
      {categories.map((category, categoryIndex) =>
        series.map((item, seriesIndex) => {
          const value = item.values[categoryIndex] ?? 0;
          const h = (Math.abs(value) / max) * innerH;
          const x = padL + categoryIndex * groupW + (groupW - series.length * barW) / 2 + seriesIndex * barW;
          const y = padT + innerH - h;
          return <rect key={`${category}-${item.name}`} x={x} y={y} width={Math.max(barW - 3, 2)} height={Math.max(h, value === 0 ? 0 : 1.5)} rx="3" fill={seriesIndex === 0 ? '#0f6e6a' : '#8c6a3d'}><title>{`${category} ${item.name}: ${value}`}</title></rect>;
        }),
      )}
      {categories.map((category, index) => (
        <text key={category} x={padL + index * groupW + groupW / 2} y={height - 12} textAnchor="middle">
          {category.length > 16 ? `${category.slice(0, 14)}…` : category}
        </text>
      ))}
    </svg>
  );
}

function axisMax(values: number[]): number {
  const peak = Math.max(...values, 0);
  if (peak <= 0) return 1;
  const padded = peak * 1.18;
  const power = 10 ** Math.floor(Math.log10(padded));
  const fraction = padded / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

function LineChart({ figure }: { figure: Figure }) {
  const { categories, series, digits, title, note } = figure;
  const flat = series.flatMap((item) => item.values);
  const max = axisMax(flat);
  const min = 0;
  const span = Math.max(max - min, 1);
  const width = 720;
  const height = 240;
  const padL = 58;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const step = innerW / Math.max(categories.length - 1, 1);
  const yOf = (value: number) => padT + innerH - ((value - min) / span) * innerH;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${note}`}>
      <title>{title}</title>
      {[min, min + span / 2, max].map((tick, index) => (
        <g key={`${index}-${tick}`}>
          <line x1={padL} x2={width - padR} y1={yOf(tick)} y2={yOf(tick)} />
          <text x={padL - 8} y={yOf(tick) + 4} textAnchor="end">{formatTick(tick, digits)}</text>
        </g>
      ))}
      {series.map((item, seriesIndex) => {
        const points = item.values.map((value, index) => `${padL + index * step},${yOf(value)}`).join(' ');
        return (
          <g key={item.name}>
            <polyline points={points} fill="none" stroke={seriesIndex === 0 ? '#0f6e6a' : '#8c6a3d'} strokeWidth="2.5" />
            {item.values.map((value, index) => <circle key={`${item.name}-${categories[index]}`} cx={padL + index * step} cy={yOf(value)} r="3.2" fill={seriesIndex === 0 ? '#0f6e6a' : '#8c6a3d'}><title>{`${categories[index]} ${item.name}: ${value}`}</title></circle>)}
          </g>
        );
      })}
      {categories.map((category, index) => (
        <text key={category} x={padL + index * step} y={height - 12} textAnchor={index === 0 ? 'start' : index === categories.length - 1 ? 'end' : 'middle'}>{category}</text>
      ))}
    </svg>
  );
}

function StageChart({ figure }: { figure: Figure }) {
  const values = figure.series[0]?.values ?? [];
  const max = Math.max(...values, 1);
  const width = 720;
  const row = 36;
  const height = 28 + values.length * row;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${figure.title}. ${figure.note}`}>
      <title>{figure.title}</title>
      {figure.categories.map((category, index) => {
        const value = values[index] ?? 0;
        const bar = Math.max(8, (value / max) * 460);
        const y = 16 + index * row;
        return (
          <g key={category}>
            <text x="8" y={y + 16} fontSize="13">{category}</text>
            <rect x="210" y={y + 4} width={bar} height="18" rx="9" fill={index === 0 ? '#0f6e6a' : '#1e3a5f'} />
            <text x={220 + bar} y={y + 17} fontSize="13">{value.toLocaleString('en-US', { maximumFractionDigits: figure.digits })}</text>
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
            <rect x={x} y={y} width={barW} height={h} rx="3" fill={index === 1 ? '#8c6a3d' : '#0f6e6a'} />
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
