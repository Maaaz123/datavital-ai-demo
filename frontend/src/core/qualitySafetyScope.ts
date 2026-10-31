import type { QsView } from './qualitySafetyView';

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

export function qsIndicatorsFor(view: QsView): Indicator[] {
  const scope = view.periodLabel;
  const at = view.observationDate;
  const m = view.methodology;
  return [
    row('Command', 'Validated Safety Event Rate', {
      unit: 'per 1,000 discharges', formula: 'Validated events ÷ discharges × 1,000', cohort: 'Eligible discharges',
      aggregation: 'Ratio × 1,000', scope, classification: 'constructed',
      limitations: 'Descriptive — not risk-adjusted. Reporting culture affects volume.', method: m.incidents,
    }),
    row('Command', 'Severe Harm Events', {
      unit: 'events', formula: 'Count of validated severe-harm events', cohort: 'Validated events',
      aggregation: 'Count', scope, classification: 'constructed',
      limitations: 'Human-reviewed demo labels. Not auto-escalated to regulatory sentinel status.', method: m.incidents,
    }),
    row('Command', 'Hospital-Onset Infection Event Rate', {
      unit: 'per 1,000 patient-days', formula: 'Validated HO infection events ÷ patient-days × 1,000', cohort: 'Patient-days',
      aggregation: 'Incidence density', scope, classification: 'constructed',
      limitations: 'Descriptive burden — not an official NHSN SIR.', method: m.infections,
    }),
    row('Command', 'Quality Measure Compliance', {
      unit: 'rate', formula: 'Measure numerators met ÷ eligible opportunities', cohort: 'Eligible measure opportunities',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Demo measure set.', method: m.outcomes,
    }),
    row('Command', 'Overdue High-Risk Actions', {
      unit: 'actions', formula: 'Open high-risk CAPA / safety actions past due', cohort: 'Open actions',
      aggregation: 'Period-end stock', scope: at, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('Command', 'Priority Safety Signals', {
      unit: 'signals', formula: 'Count of non-info QS alerts for the selection', cohort: 'Alert rules',
      aggregation: 'Count', scope, classification: 'constructed', limitations: 'Threshold-based demo signals.', method: 'Alert rules.',
    }),
    row('Incidents', 'Reported Incidents', {
      unit: 'reports', formula: 'Safety reports received', cohort: 'Reporting system',
      aggregation: 'Count', scope, classification: 'constructed', limitations: 'Volume ≠ harm.', method: m.incidents,
    }),
    row('Incidents', 'Validated Incidents', {
      unit: 'events', formula: 'Validated after review', cohort: 'Reported incidents',
      aggregation: 'Count', scope, classification: 'constructed', limitations: m.incidents, method: m.incidents,
    }),
    row('Incidents', 'Near-Miss Events', {
      unit: 'events', formula: 'Validated near misses', cohort: 'Validated events',
      aggregation: 'Count', scope, classification: 'constructed', limitations: 'No patient harm occurred.', method: m.incidents,
    }),
    row('Incidents', 'Events With Harm', {
      unit: 'events', formula: 'Validated events with harm > near-miss', cohort: 'Validated events',
      aggregation: 'Count', scope, classification: 'constructed', limitations: m.incidents, method: m.incidents,
    }),
    row('Incidents', 'Investigation Timeliness', {
      unit: 'rate', formula: 'On-time investigations ÷ decided investigations', cohort: 'Decided investigations',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Illustrative target.', method: m.incidents,
    }),
    row('Incidents', 'Classification Completeness', {
      unit: 'rate', formula: 'Fully labeled reports ÷ reported', cohort: 'Reported incidents',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Incomplete labels limit pattern analysis.', method: m.incidents,
    }),
    row('Infections', 'CLABSI Rate', {
      unit: 'per 1,000 CL-days', formula: 'CLABSI ÷ central-line days × 1,000', cohort: 'Central-line days',
      aggregation: 'Incidence density', scope, classification: 'constructed', limitations: m.infections, method: m.infections,
    }),
    row('Infections', 'CAUTI Rate', {
      unit: 'per 1,000 UC-days', formula: 'CAUTI ÷ catheter days × 1,000', cohort: 'Urinary-catheter days',
      aggregation: 'Incidence density', scope, classification: 'constructed', limitations: m.infections, method: m.infections,
    }),
    row('Infections', 'SSI Rate', {
      unit: 'rate', formula: 'SSI ÷ eligible procedures', cohort: 'Eligible surveillance procedures',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.infections, method: m.infections,
    }),
    row('Infections', 'Validated HAI Cases', {
      unit: 'events', formula: 'CLABSI + CAUTI + SSI + HO CDI', cohort: 'Validated HAI events',
      aggregation: 'Sum', scope, classification: 'constructed', limitations: m.infections, method: m.infections,
    }),
    row('Infections', 'HO CDI Events', {
      unit: 'events', formula: 'Hospital-onset CDI LabID events', cohort: 'LabID surveillance',
      aggregation: 'Count', scope, classification: 'constructed', limitations: 'Demo case definition.', method: m.infections,
    }),
    row('Infections', 'Surveillance Coverage', {
      unit: 'rate', formula: 'Covered units ÷ plan units', cohort: 'Surveillance plan',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.infections, method: m.infections,
    }),
    row('Prevention', 'Hand Hygiene Compliance', {
      unit: 'rate', formula: 'Compliant ÷ eligible observed opportunities', cohort: 'Audited opportunities',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Prevention', 'Isolation Compliance', {
      unit: 'rate', formula: 'Compliant ÷ eligible isolation audits', cohort: 'Isolation observations',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Prevention', 'IP Audit Completion', {
      unit: 'rate', formula: 'Completed ÷ scheduled audits', cohort: 'Scheduled audits',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Prevention', 'CL Bundle Compliance', {
      unit: 'rate', formula: 'Fully compliant ÷ eligible CL observations', cohort: 'CL observations',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Prevention', 'UC Bundle Compliance', {
      unit: 'rate', formula: 'Fully compliant ÷ eligible UC observations', cohort: 'UC observations',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Prevention', 'Prevention Gaps', {
      unit: 'findings', formula: 'Open high-risk prevention findings', cohort: 'Audit findings',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.prevention, method: m.prevention,
    }),
    row('Outcomes', '30-Day Readmission', {
      unit: 'rate', formula: 'Unplanned same-facility readmissions ÷ eligible index discharges', cohort: 'Eligible discharges',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.outcomes, method: m.outcomes,
    }),
    row('Outcomes', 'HAPI Rate', {
      unit: 'per 1,000 patient-days', formula: 'HAPI ÷ patient-days × 1,000', cohort: 'Patient-days',
      aggregation: 'Incidence density', scope, classification: 'constructed', limitations: m.outcomes, method: m.outcomes,
    }),
    row('Outcomes', 'Falls With Injury', {
      unit: 'per 1,000 patient-days', formula: 'Falls with injury ÷ patient-days × 1,000', cohort: 'Patient-days',
      aggregation: 'Incidence density', scope, classification: 'constructed', limitations: m.outcomes, method: m.outcomes,
    }),
    row('Outcomes', 'Postop Complications', {
      unit: 'rate', formula: 'Documented complications ÷ eligible surgical discharges', cohort: 'Surgical discharges',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: 'Descriptive — not risk-adjusted.', method: m.outcomes,
    }),
    row('Outcomes', 'Outcome Coverage', {
      unit: 'rate', formula: 'Complete cohorts ÷ planned measures', cohort: 'Outcome measures',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.outcomes, method: m.outcomes,
    }),
    row('Outcomes', 'Review Backlog', {
      unit: 'reviews', formula: 'Open reviews past target', cohort: 'Outcome reviews',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.outcomes, method: m.outcomes,
    }),
    row('RCA', 'Open RCA', {
      unit: 'cases', formula: 'Open RCA at observation', cohort: 'RCA ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('RCA', 'Overdue RCA', {
      unit: 'cases', formula: 'Open RCA past target', cohort: 'Open RCA',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('RCA', 'CAPA On-Time', {
      unit: 'rate', formula: 'On-time CAPA ÷ decided CAPA', cohort: 'Decided CAPA',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('RCA', 'Open CAPA', {
      unit: 'actions', formula: 'Open CAPA at observation', cohort: 'CAPA ledger',
      aggregation: 'Stock', scope: at, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('RCA', 'Recurring Themes', {
      unit: 'themes', formula: 'Themes with ≥2 related validated events', cohort: 'Validated events',
      aggregation: 'Count', scope, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('RCA', 'Effectiveness Review', {
      unit: 'rate', formula: 'Reviewed closed CAPA ÷ closed CAPA', cohort: 'Closed CAPA',
      aggregation: 'Ratio', scope, classification: 'constructed', limitations: m.rca, method: m.rca,
    }),
    row('Optimization', 'Addressable Gap', {
      unit: 'events / 1,000', formula: 'Current validated rate − target (floor 0)', cohort: 'Eligible cohorts',
      aggregation: 'Gap', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Incident Potential', {
      unit: 'events', formula: 'Illustrative preventable events with harm', cohort: 'Events with harm',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'HAI Potential', {
      unit: 'events', formula: 'Illustrative preventable HAI events', cohort: 'Validated HAI',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Compliance Uplift', {
      unit: 'points', formula: 'Illustrative compliance uplift', cohort: 'Audited opportunities',
      aggregation: 'Modeled', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Action Coverage', {
      unit: 'rate', formula: 'Owned priority actions ÷ priority opportunities', cohort: 'Priority opportunities',
      aggregation: 'Ratio', scope, classification: 'scenario', limitations: m.optimization, method: m.optimization,
    }),
  ];
}

export const QS_AI_CASES = [
  { title: 'Investigate rising validated event rate', owner: 'Patient Safety Director', followUp: 'Validated Safety Event Rate' },
  { title: 'Review CLABSI / CAUTI device-day signals', owner: 'Infection Prevention Director', followUp: 'CLABSI / CAUTI rates' },
  { title: 'Clear overdue high-risk CAPA', owner: 'Chief Quality Officer', followUp: 'Overdue High-Risk Actions' },
  { title: 'Improve observed hand-hygiene reliability', owner: 'Infection Prevention', followUp: 'Hand Hygiene Compliance' },
] as const;
