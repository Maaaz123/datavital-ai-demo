import type { IcuView } from './icuView';

export type Indicator = {
  domain: string;
  name: string;
  summary: string;
  status: 'constructed' | 'scenario' | 'unavailable';
  unit?: string;
  formula?: string;
  cohort?: string;
  aggregation?: string;
  scope?: string;
  classification?: string;
  limitations?: string;
  method?: string;
};

function row(
  domain: string,
  name: string,
  detail: Omit<Indicator, 'domain' | 'name' | 'summary' | 'status'> & { summary?: string },
): Indicator {
  return {
    domain,
    name,
    summary: detail.summary ?? detail.method ?? detail.formula ?? '',
    status: detail.classification === 'scenario' ? 'scenario' : 'constructed',
    ...detail,
  };
}

function blank(domain: string, name: string, summary: string): Indicator {
  return { domain, name, summary, status: 'unavailable' };
}

export function icuIndicatorsFor(view: IcuView): Indicator[] {
  const m = view.methodology;
  return [
    row('ICU Activity', 'ICU Admissions', {
      unit: 'stays', formula: 'Count of arrivals into ICU from outside the ICU', cohort: 'ICU stays',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: m.grains, method: m.grains,
    }),
    row('ICU Activity', 'ICU Discharges', {
      unit: 'stays', formula: 'Discharges to ward/step-down/external (deaths counted separately)', cohort: 'Completed exits',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Deaths departing ICU are a separate exit category.', method: 'Non-death discharges from ICU.',
    }),
    row('ICU Activity', 'ICU Patient Days', {
      unit: 'patient-days', formula: 'Σ ((opening + closing) ÷ 2 × days in month)', cohort: 'Midnight census',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: m.census, method: m.census,
    }),
    row('ICU Activity', 'ICU Average Census', {
      unit: 'patients', formula: 'Patient days ÷ days in period', cohort: 'Midnight census',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not an average of monthly average census values.', method: 'Patient-days ÷ days.',
    }),
    row('ICU Activity', 'ICU Demand Pressure', {
      unit: 'index', formula: 'Pending transfers ÷ available staffed beds', cohort: 'Observation snapshot',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Operational pressure index — not hospital-wide Bed Occupancy.', method: 'Pending ÷ available staffed.',
    }),
    row('ICU Activity', 'Pending ICU Transfers', {
      unit: 'requests', formula: 'Open ICU transfer requests at observation', cohort: 'Transfer requests',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Requests ≠ admissions and ≠ boarded ED patients from Emergency.', method: 'Open transfer queue.',
    }),

    row('ICU Flow', 'Median ICU Admission Wait', {
      unit: 'minutes', formula: 'Median(ICU arrived − admission requested)', cohort: 'Admitted stays',
      aggregation: 'Median of eligible observations', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Synthetic timestamps. Not clinical triage priority.', method: 'Request-to-arrival median.',
    }),
    row('ICU Flow', 'Delayed ICU Admissions', {
      unit: 'admissions', formula: 'Admissions with wait > 90 minutes', cohort: 'Admitted stays',
      aggregation: 'Count', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative management target.', method: 'Over-target admissions.',
    }),
    row('ICU Flow', 'Median ICU Transfer Delay', {
      unit: 'hours', formula: 'Median(actual exit − transfer-ready)', cohort: 'Transfer-ready exits',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Transfer-ready is a synthetic operational flag.', method: 'Ready-to-exit median.',
    }),
    row('ICU Flow', 'Median ICU Length of Stay', {
      unit: 'hours', formula: 'Median(ICU departed − ICU arrived)', cohort: 'Completed stays',
      aggregation: 'Median of eligible observations', scope: view.periodLabel, classification: 'constructed',
      limitations: m.los, method: m.los,
    }),
    row('ICU Flow', 'Discharge Readiness Delay', {
      unit: 'hours', formula: 'Median(departed − discharge-ready)', cohort: 'Discharge-ready exits',
      aggregation: 'Median', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Does not change clinical readiness decisions.', method: 'Ready-to-depart median.',
    }),
    row('ICU Flow', 'ICU Boarding Hours', {
      unit: 'hours', formula: 'Σ admission wait minutes ÷ 60 (scaled to admissions)', cohort: 'Admitted stays',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Distinct from ED boarding in Emergency.', method: 'Aggregate request-to-arrival hours.',
    }),

    row('ICU Capacity', 'Staffed ICU Beds', {
      unit: 'beds', formula: 'Beds staffed for ICU care at observation', cohort: 'ICU beds',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: m.capacity, method: m.capacity,
    }),
    row('ICU Capacity', 'Available Staffed ICU Capacity', {
      unit: 'beds', formula: 'Staffed − occupied − blocked', cohort: 'Staffed beds',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Not physical empty beds that are unstaffed.', method: 'Available staffed beds.',
    }),
    row('ICU Capacity', 'ICU Nurse Coverage Rate', {
      unit: 'rate', formula: 'Staffed nursing hours ÷ required coverage hours', cohort: 'Shifts',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Descriptive coverage — not a clinical safety certification.', method: 'Staffed ÷ required hours.',
    }),
    row('ICU Capacity', 'ICU Staffing Gap Hours', {
      unit: 'hours', formula: 'Required − staffed nursing hours', cohort: 'Shifts',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Roles and competencies are not interchangeable across units.', method: 'Unfilled coverage hours.',
    }),
    row('ICU Capacity', 'ICU Patient-to-Nurse Ratio', {
      unit: 'ratio', formula: 'Occupied staffed beds ÷ nurses on duty', cohort: 'Observation snapshot',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Descriptive only — matching a generic target does not prove clinical safety.', method: 'Occupied ÷ nurses.',
    }),

    row('ICU Equipment', 'Ventilated Patient Days', {
      unit: 'patient-days', formula: 'Patient-days with an assigned serviceable ventilator', cohort: 'ICU patient-days',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: m.equipment, method: m.equipment,
    }),
    row('ICU Equipment', 'Ventilator Utilization', {
      unit: 'rate', formula: 'Assigned ventilator-hours ÷ eligible serviceable hours', cohort: 'Active inventory',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Ventilator types are not treated as fully interchangeable.', method: 'Assigned ÷ eligible hours.',
    }),
    row('ICU Equipment', 'Available Ventilators', {
      unit: 'devices', formula: 'Serviceable ventilators not currently assigned', cohort: 'Active inventory',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Available ≠ inventory; excludes maintenance and preparation.', method: 'Unassigned serviceable vents.',
    }),
    row('ICU Equipment', 'Critical Equipment Downtime', {
      unit: 'hours', formula: 'Hours in maintenance or preparation states', cohort: 'Active inventory',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Derived from the asset ledger — not an independent random series.', method: 'Maintenance + prep hours.',
    }),
    row('ICU Equipment', 'Equipment Readiness Rate', {
      unit: 'rate', formula: '(In use + Available) ÷ active inventory', cohort: 'Active inventory',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'No treatment or ventilator-setting recommendations.', method: 'Ready share of inventory.',
    }),

    row('ICU Quality', 'ICU Readmission Rate', {
      unit: 'rate', formula: 'ICU readmissions within 48h ÷ ICU discharges', cohort: 'Discharges',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: m.quality, method: m.quality,
    }),
    row('ICU Quality', 'Unplanned Step-down Transfer Rate', {
      unit: 'rate', formula: 'Unplanned returns ÷ step-down exits', cohort: 'Step-down exits',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Operational flag — not a validated clinical outcome measure.', method: 'Unplanned returns ÷ step-downs.',
    }),
    row('ICU Quality', 'Safety Review Backlog', {
      unit: 'reviews', formula: 'Open safety-event reviews at observation', cohort: 'Safety events',
      aggregation: 'Point-in-time', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Process backlog — not incidence of harm.', method: 'Unresolved reviews.',
    }),
    row('ICU Quality', 'Infection Surveillance Completeness', {
      unit: 'rate', formula: 'Documented device-days ÷ eligible device-days', cohort: 'Device-days',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Illustrative documentation completeness — NOT a validated CLABSI/CAUTI/VAE rate.', method: 'Surveillance form completeness.',
    }),
    row('ICU Quality', 'Critical Event Review Timeliness', {
      unit: 'rate', formula: 'Closed reviews within target ÷ closed reviews', cohort: 'Closed reviews',
      aggregation: 'Ratio', scope: view.periodLabel, classification: 'constructed',
      limitations: 'Illustrative 72-hour target window.', method: 'Timely closed ÷ closed.',
    }),

    row('ICU Optimization', 'Recoverable ICU Bed Hours', {
      unit: 'hours', formula: 'Σ exclusive recoverable drivers', cohort: 'Flow/staffing drivers',
      aggregation: 'Sum', scope: view.periodLabel, classification: 'scenario',
      limitations: m.optimization, method: m.optimization,
    }),
    row('ICU Optimization', 'Feasible Additional ICU Capacity', {
      unit: 'admissions', formula: 'min(hours÷LOS, demand, staffed, vents)', cohort: 'Eligible demand',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Illustrative — not achieved; never overrides clinical readiness.', method: 'Capped feasible extras.',
    }),
    row('ICU Optimization', 'Avoidable Transfer Delay Hours', {
      unit: 'hours', formula: 'Coordination-related share of transfer delay', cohort: 'Transfer-ready exits',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Subset of transfer delay — not double-counted into recoverable drivers twice.', method: 'Avoidable coordination hours.',
    }),
    row('ICU Optimization', 'Staff-Constrained Capacity Hours', {
      unit: 'hours', formula: 'Physical bed hours unavailable due to staffing gaps', cohort: 'Physical beds',
      aggregation: 'Modeled', scope: view.periodLabel, classification: 'scenario',
      limitations: 'Requires staffing before physical beds become staffed capacity.', method: 'Unstaffed physical × hours.',
    }),

    blank('Cross-domain context', 'Hospital Bed Occupancy', 'Owned by Beds & Capacity — not restated as an ICU headline.'),
    blank('Cross-domain context', 'ED Boarding Beyond 4 Hours', 'Owned by Emergency — ICU boarding hours are a distinct cohort.'),
    blank('Cross-domain context', 'Median Inpatient Length of Stay', 'Owned by Inpatient Care — ICU LOS uses ICU arrival/departure clocks only.'),
  ];
}

export const ICU_AI_CASES = [
  { id: 'icu-transfer-down', name: 'Reduce transfer delays', level: 'Scenario', limit: 'Illustrative — coordination only' },
  { id: 'icu-discharge-coord', name: 'Improve discharge coordination', level: 'Scenario', limit: 'Does not change clinical readiness' },
  { id: 'icu-staffed-up', name: 'Improve staffed bed availability', level: 'Scenario', limit: 'Requires workforce' },
  { id: 'icu-equip-down', name: 'Reduce equipment downtime', level: 'Scenario', limit: 'Does not invent clinical capacity' },
  { id: 'icu-reallocate', name: 'Reallocate ICU staffing', level: 'Scenario', limit: 'Respects coverage safeguards' },
  { id: 'icu-flow-up', name: 'Improve ICU flow coordination', level: 'Scenario', limit: 'No double-counted hours' },
];
