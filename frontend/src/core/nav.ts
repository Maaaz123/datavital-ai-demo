/** Screen catalog for the public showcase. Add domains here as the library grows past 39 screens. */

export type NavScreen = {
  to: string;
  /** Short rail label */
  short: string;
  /** Business page title (H1 + nav tooltip) */
  title: string;
  /** One-line purpose for expanded nav */
  purpose: string;
  end?: boolean;
  glyph: 'home' | 'flow' | 'quality' | 'beds' | 'assign' | 'plan' | 'ipd' | 'stay' | 'outcome' | 'opd' | 'clinic' | 'follow' | 'appt' | 'access' | 'attend' | 'recover' | 'surg' | 'or' | 'surg-access' | 'surg-quality' | 'optimize' | 'rad' | 'rad-access' | 'rad-util' | 'rad-quality' | 'lab' | 'lab-sample' | 'lab-analyzer' | 'lab-quality' | 'rx' | 'rx-dispense' | 'rx-stock' | 'rx-safety' | 'rx-cost' | 'icu' | 'icu-flow' | 'icu-capacity' | 'icu-equip' | 'icu-quality' | 'px' | 'px-journey' | 'px-complaints' | 'px-voice' | 'px-depts' | 'rcm' | 'rcm-elig' | 'rcm-bill' | 'rcm-claims' | 'rcm-collect' | 'rcm-leak' | 'qs' | 'qs-incidents' | 'qs-infections' | 'qs-prevention' | 'qs-outcomes' | 'qs-actions' | 'sc' | 'sc-inventory' | 'sc-procurement' | 'sc-suppliers' | 'sc-consumption' | 'sc-waste' | 'st' | 'st-workforce' | 'st-equipment' | 'st-capacity' | 'st-service' | 'st-cost' | 'st-expansion' | 'exec' | 'ops' | 'eai' | 'eai-inv' | 'eai-fc' | 'eai-opt' | 'eai-dec' | 'eai-gov';
};

export type NavDomain = {
  id: string;
  /** Business domain name shown in the sidebar */
  label: string;
  /** Compact rail mark */
  mark: string;
  match: (path: string) => boolean;
  screens: NavScreen[];
};

export const NAV_DOMAINS: NavDomain[] = [
  {
    id: 'enterprise',
    label: 'Enterprise',
    mark: 'ENT',
    match: (path) => path === '/executive' || path === '/command' || path.startsWith('/executive/') || path.startsWith('/command/') || path.startsWith('/enterprise-ai'),
    screens: [
      {
        to: '/executive',
        short: 'Executive',
        title: 'Executive Dashboard',
        purpose: 'CEO/CFO cross-domain priorities with source evidence',
        end: true,
        glyph: 'exec',
      },
      {
        to: '/command',
        short: 'Command',
        title: 'Hospital Command Center',
        purpose: 'COO actionable exceptions across operations',
        glyph: 'ops',
      },
      {
        to: '/enterprise-ai',
        short: 'Enterprise AI',
        title: 'Enterprise AI Investigation',
        purpose: 'Grounded multi-domain investigate → simulate → decide',
        end: true,
        glyph: 'eai',
      },
      {
        to: '/enterprise-ai/decisions',
        short: 'Decisions',
        title: 'Enterprise AI Decisions',
        purpose: 'Human decision lifecycle and outcome tracking',
        glyph: 'eai-dec',
      },
      {
        to: '/enterprise-ai/governance',
        short: 'Governance',
        title: 'Enterprise AI Governance',
        purpose: 'Mode disclosure, refusals, and guardrails',
        glyph: 'eai-gov',
      },
    ],
  },
  {
    id: 'emergency',
    label: 'Emergency',
    mark: 'ED',
    match: (path) => path === '/emergency' || path.startsWith('/emergency/'),
    screens: [
      {
        to: '/emergency',
        short: 'Snapshot',
        title: 'Emergency Snapshot',
        purpose: 'ED visits, acuity, wait, boarding, and disposition',
        end: true,
        glyph: 'home',
      },
      {
        to: '/emergency/flow',
        short: 'Waiting',
        title: 'Waiting & Patient Flow',
        purpose: 'Door-to-provider, ED length of stay, and flow',
        glyph: 'flow',
      },
      {
        to: '/emergency/quality',
        short: 'Safety',
        title: 'Safety & Return Visits',
        purpose: 'LWBS, 72-hour returns, and ED mortality',
        glyph: 'quality',
      },
    ],
  },
  {
    id: 'beds',
    label: 'Beds & Capacity',
    mark: 'Bed',
    match: (path) => path.startsWith('/beds'),
    screens: [
      {
        to: '/beds',
        short: 'Status',
        title: 'Bed Status',
        purpose: 'Operational, occupied, vacant, and blocked beds',
        end: true,
        glyph: 'beds',
      },
      {
        to: '/beds/placement',
        short: 'Assign',
        title: 'Bed Assignment',
        purpose: 'Requests, assignment time, and bed turnover',
        glyph: 'assign',
      },
      {
        to: '/beds/capacity',
        short: 'Outlook',
        title: 'Bed Capacity Outlook',
        purpose: 'Shortfall risk and next-day availability sketch',
        glyph: 'plan',
      },
    ],
  },
  {
    id: 'inpatient',
    label: 'Inpatient Care',
    mark: 'IPD',
    match: (path) => path.startsWith('/inpatient'),
    screens: [
      {
        to: '/inpatient',
        short: 'Snapshot',
        title: 'Inpatient Snapshot',
        purpose: 'Admissions, census, and admission source mix',
        end: true,
        glyph: 'ipd',
      },
      {
        to: '/inpatient/stay',
        short: 'Stay',
        title: 'Stay & Discharge',
        purpose: 'Length of stay, long stays, and delayed discharge',
        glyph: 'stay',
      },
      {
        to: '/inpatient/outcomes',
        short: 'Outcomes',
        title: 'Care Progress & Outcomes',
        purpose: 'Readmissions, mortality, and documentation gaps',
        glyph: 'outcome',
      },
    ],
  },
  {
    id: 'outpatient',
    label: 'Outpatient',
    mark: 'OPD',
    match: (path) => path.startsWith('/outpatient'),
    screens: [
      {
        to: '/outpatient',
        short: 'Overview',
        title: 'Outpatient Performance Overview',
        purpose: 'Clinic visits, specialty mix, and session utilization',
        end: true,
        glyph: 'opd',
      },
      {
        to: '/outpatient/flow',
        short: 'Waiting',
        title: 'Clinic Waiting & Patient Flow',
        purpose: 'Arrival-to-provider, cycle time, and clinic delays',
        glyph: 'clinic',
      },
      {
        to: '/outpatient/quality',
        short: 'Quality',
        title: 'Outpatient Quality & Follow-up',
        purpose: 'Documentation, referrals, and follow-up actions',
        glyph: 'follow',
      },
    ],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    mark: 'Appt',
    match: (path) => path.startsWith('/appointments'),
    screens: [
      {
        to: '/appointments',
        short: 'Command',
        title: 'Appointment Command Center',
        purpose: 'Demand conversion to attended visits',
        end: true,
        glyph: 'appt',
      },
      {
        to: '/appointments/access',
        short: 'Access',
        title: 'Appointment Access & Capacity',
        purpose: 'Lead time, third-next-available, and slot fill',
        glyph: 'access',
      },
      {
        to: '/appointments/attendance',
        short: 'Attendance',
        title: 'Attendance & No-show Intelligence',
        purpose: 'No-shows, cancellations, and lost slots',
        glyph: 'attend',
      },
      {
        to: '/appointments/recovery',
        short: 'Recovery',
        title: 'Slot Recovery & Optimization',
        purpose: 'Recoverable capacity and management actions',
        glyph: 'recover',
      },
    ],
  },
  {
    id: 'surgery',
    label: 'Surgery',
    mark: 'OR',
    match: (path) => path.startsWith('/surgery'),
    screens: [
      {
        to: '/surgery',
        short: 'Command',
        title: 'Surgical Command Center',
        purpose: 'Surgical volume, cancellations, and throughput',
        end: true,
        glyph: 'surg',
      },
      {
        to: '/surgery/or',
        short: 'OR',
        title: 'OR Utilization & Scheduling',
        purpose: 'Theatre utilization, turnover, and late starts',
        glyph: 'or',
      },
      {
        to: '/surgery/access',
        short: 'Access',
        title: 'Surgical Access & Backlog',
        purpose: 'Elective waitlist and surgical waiting times',
        glyph: 'surg-access',
      },
      {
        to: '/surgery/quality',
        short: 'Quality',
        title: 'Surgical Quality & Safety',
        purpose: 'Returns, complications, and checklist compliance',
        glyph: 'surg-quality',
      },
      {
        to: '/surgery/optimization',
        short: 'Capacity',
        title: 'Surgical Capacity Optimization',
        purpose: 'Recoverable hours and feasible extra cases',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'radiology',
    label: 'Radiology',
    mark: 'Rad',
    match: (path) => path.startsWith('/radiology'),
    screens: [
      {
        to: '/radiology',
        short: 'Command',
        title: 'Imaging Command Center',
        purpose: 'Imaging demand, completion, and urgent mix',
        end: true,
        glyph: 'rad',
      },
      {
        to: '/radiology/access',
        short: 'Access',
        title: 'Imaging Access & Waitlist',
        purpose: 'Imaging backlog and access waits',
        glyph: 'rad-access',
      },
      {
        to: '/radiology/utilization',
        short: 'Scanners',
        title: 'Modality Utilization & Scheduling',
        purpose: 'Scanner utilization, downtime, and exam duration',
        glyph: 'rad-util',
      },
      {
        to: '/radiology/quality',
        short: 'Reporting',
        title: 'Reporting & Imaging Quality',
        purpose: 'Report TAT, unsigned reports, and repeats',
        glyph: 'rad-quality',
      },
      {
        to: '/radiology/optimization',
        short: 'Capacity',
        title: 'Imaging Capacity Optimization',
        purpose: 'Recoverable hours and feasible extra exams',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    mark: 'Lab',
    match: (path) => path.startsWith('/laboratory'),
    screens: [
      {
        to: '/laboratory',
        short: 'Command',
        title: 'Laboratory Command Center',
        purpose: 'Test demand, completion, and STAT mix',
        end: true,
        glyph: 'lab',
      },
      {
        to: '/laboratory/samples',
        short: 'Samples',
        title: 'Sample Flow & Pre-Analytics',
        purpose: 'Specimen receipt, rejection, and transport',
        glyph: 'lab-sample',
      },
      {
        to: '/laboratory/analyzers',
        short: 'Analyzers',
        title: 'Testing & Analyzer Performance',
        purpose: 'Analyzer utilization, downtime, and backlog',
        glyph: 'lab-analyzer',
      },
      {
        to: '/laboratory/quality',
        short: 'Results',
        title: 'Results, TAT & Quality',
        purpose: 'Lab TAT, validation, and critical notify',
        glyph: 'lab-quality',
      },
      {
        to: '/laboratory/optimization',
        short: 'Capacity',
        title: 'Laboratory Capacity Optimization',
        purpose: 'Recoverable hours and feasible extra tests',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    mark: 'Rx',
    match: (path) => path.startsWith('/pharmacy'),
    screens: [
      {
        to: '/pharmacy',
        short: 'Command',
        title: 'Pharmacy Command Center',
        purpose: 'Order demand, lines, and dispensing completion',
        end: true,
        glyph: 'rx',
      },
      {
        to: '/pharmacy/dispensing',
        short: 'Dispensing',
        title: 'Verification & Dispensing Flow',
        purpose: 'Verification backlog, TAT, and rework',
        glyph: 'rx-dispense',
      },
      {
        to: '/pharmacy/inventory',
        short: 'Inventory',
        title: 'Inventory & Stock Position',
        purpose: 'Stockouts, days of supply, and near-expiry',
        glyph: 'rx-stock',
      },
      {
        to: '/pharmacy/safety',
        short: 'Safety',
        title: 'Medication Safety Process',
        purpose: 'Exceptions, scans, and incident reviews',
        glyph: 'rx-safety',
      },
      {
        to: '/pharmacy/cost',
        short: 'Cost',
        title: 'Medication Cost & Waste',
        purpose: 'Spend, write-offs, and exclusive savings',
        glyph: 'rx-cost',
      },
      {
        to: '/pharmacy/optimization',
        short: 'Capacity',
        title: 'Pharmacy Capacity Optimization',
        purpose: 'Recoverable hours and feasible extra lines',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'icu',
    label: 'ICU & Critical Care',
    mark: 'ICU',
    match: (path) => path.startsWith('/icu'),
    screens: [
      {
        to: '/icu',
        short: 'Command',
        title: 'ICU Command Center',
        purpose: 'Admissions, census, and demand pressure',
        end: true,
        glyph: 'icu',
      },
      {
        to: '/icu/flow',
        short: 'Flow',
        title: 'ICU Patient Flow & Throughput',
        purpose: 'Admission wait, LOS, and exit delays',
        glyph: 'icu-flow',
      },
      {
        to: '/icu/capacity',
        short: 'Capacity',
        title: 'Critical Care Capacity & Staffing',
        purpose: 'Staffed beds, coverage, and gaps',
        glyph: 'icu-capacity',
      },
      {
        to: '/icu/equipment',
        short: 'Equipment',
        title: 'Ventilation & Equipment Intelligence',
        purpose: 'Ventilators, downtime, and readiness',
        glyph: 'icu-equip',
      },
      {
        to: '/icu/quality',
        short: 'Quality',
        title: 'ICU Quality & Safety Intelligence',
        purpose: 'Readmissions, reviews, and surveillance completeness',
        glyph: 'icu-quality',
      },
      {
        to: '/icu/optimization',
        short: 'Optimize',
        title: 'ICU Capacity Optimization',
        purpose: 'Recoverable bed hours and feasible capacity',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'patient-experience',
    label: 'Patient Experience',
    mark: 'PX',
    match: (path) => path.startsWith('/patient-experience'),
    screens: [
      {
        to: '/patient-experience',
        short: 'Command',
        title: 'Patient Experience Command Center',
        purpose: 'Satisfaction, response rate, and priority signals',
        end: true,
        glyph: 'px',
      },
      {
        to: '/patient-experience/journey',
        short: 'Journey',
        title: 'Patient Journey & Touchpoints',
        purpose: 'Touchpoint scores and waiting experience',
        glyph: 'px-journey',
      },
      {
        to: '/patient-experience/complaints',
        short: 'Complaints',
        title: 'Complaints & Service Recovery',
        purpose: 'Complaint ledger, aging, and resolution',
        glyph: 'px-complaints',
      },
      {
        to: '/patient-experience/voice',
        short: 'Voice',
        title: 'Voice of Patient & Sentiment AI',
        purpose: 'Themes, sentiment, and review coverage',
        glyph: 'px-voice',
      },
      {
        to: '/patient-experience/departments',
        short: 'Departments',
        title: 'Department & Service Experience',
        purpose: 'Comparable department scores and coverage',
        glyph: 'px-depts',
      },
      {
        to: '/patient-experience/optimization',
        short: 'Optimize',
        title: 'Experience Improvement & What-If',
        purpose: 'Eligible actions and modeled uplift',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'rcm',
    label: 'Revenue Cycle',
    mark: 'RCM',
    match: (path) => path === '/rcm' || path.startsWith('/rcm/'),
    screens: [
      {
        to: '/rcm',
        short: 'Command',
        title: 'RCM Command Center',
        purpose: 'Net revenue, collections, denials, and AR health',
        end: true,
        glyph: 'rcm',
      },
      {
        to: '/rcm/eligibility',
        short: 'Eligibility',
        title: 'Eligibility & Pre-Authorization',
        purpose: 'Coverage verification and authorization exposure',
        glyph: 'rcm-elig',
      },
      {
        to: '/rcm/billing',
        short: 'Billing',
        title: 'Charge Capture & Billing',
        purpose: 'Charge capture, coding, and unbilled value',
        glyph: 'rcm-bill',
      },
      {
        to: '/rcm/claims',
        short: 'Claims',
        title: 'Claims & Denial Intelligence',
        purpose: 'Submissions, denials, appeals, and recovery',
        glyph: 'rcm-claims',
      },
      {
        to: '/rcm/collections',
        short: 'Collections',
        title: 'Accounts Receivable & Collections',
        purpose: 'AR aging, cash application, and payer delay',
        glyph: 'rcm-collect',
      },
      {
        to: '/rcm/leakage',
        short: 'Leakage',
        title: 'Revenue Leakage & Financial Integrity',
        purpose: 'Underpayments, missed charges, and write-offs',
        glyph: 'rcm-leak',
      },
      {
        to: '/rcm/optimization',
        short: 'Optimize',
        title: 'RCM Optimization & What-If',
        purpose: 'Illustrative recovery and cash acceleration',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'quality',
    label: 'Quality & Safety',
    mark: 'QS',
    match: (path) => path === '/quality' || path.startsWith('/quality/'),
    screens: [
      {
        to: '/quality',
        short: 'Command',
        title: 'Quality & Safety Command Center',
        purpose: 'Safety events, HAI burden, and overdue actions',
        end: true,
        glyph: 'qs',
      },
      {
        to: '/quality/incidents',
        short: 'Incidents',
        title: 'Patient Safety Incident Intelligence',
        purpose: 'Reporting, validation, harm, and investigations',
        glyph: 'qs-incidents',
      },
      {
        to: '/quality/infections',
        short: 'Infections',
        title: 'Healthcare-Associated Infections',
        purpose: 'CLABSI, CAUTI, SSI, and surveillance coverage',
        glyph: 'qs-infections',
      },
      {
        to: '/quality/prevention',
        short: 'Prevention',
        title: 'Infection Prevention & Compliance',
        purpose: 'Hand hygiene, bundles, and audit gaps',
        glyph: 'qs-prevention',
      },
      {
        to: '/quality/outcomes',
        short: 'Outcomes',
        title: 'Clinical Quality & Outcomes',
        purpose: 'Readmissions, HAPI, falls, and review backlog',
        glyph: 'qs-outcomes',
      },
      {
        to: '/quality/actions',
        short: 'Actions',
        title: 'Investigations & Corrective Actions',
        purpose: 'RCA, CAPA, and effectiveness verification',
        glyph: 'qs-actions',
      },
      {
        to: '/quality/optimization',
        short: 'Optimize',
        title: 'Quality & Safety Optimization & What-If',
        purpose: 'Illustrative safety and prevention scenarios',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'supply-chain',
    label: 'Supply Chain',
    mark: 'SC',
    match: (path) => path === '/supply-chain' || path.startsWith('/supply-chain/'),
    screens: [
      {
        to: '/supply-chain',
        short: 'Command',
        title: 'Supply Chain Command Center',
        purpose: 'Availability, stockouts, OTD, and PO backlog',
        end: true,
        glyph: 'sc',
      },
      {
        to: '/supply-chain/inventory',
        short: 'Inventory',
        title: 'Inventory & Stock Availability',
        purpose: 'Cover, safety stock, and replenishment exceptions',
        glyph: 'sc-inventory',
      },
      {
        to: '/supply-chain/procurement',
        short: 'Procurement',
        title: 'Procurement & Purchase Orders',
        purpose: 'PO cycle, price variance, and fulfillment',
        glyph: 'sc-procurement',
      },
      {
        to: '/supply-chain/suppliers',
        short: 'Suppliers',
        title: 'Supplier Performance & Contracts',
        purpose: 'Fill rate, contracts, and dual-source coverage',
        glyph: 'sc-suppliers',
      },
      {
        to: '/supply-chain/consumption',
        short: 'Consumption',
        title: 'Clinical Supply Consumption',
        purpose: 'Issue intensity, forecast deviation, and signals',
        glyph: 'sc-consumption',
      },
      {
        to: '/supply-chain/waste',
        short: 'Waste',
        title: 'Waste, Expiry & Financial Exposure',
        purpose: 'Expired, near-expiry, damaged, and adjustments',
        glyph: 'sc-waste',
      },
      {
        to: '/supply-chain/optimization',
        short: 'Optimize',
        title: 'Supply Optimization & What-If',
        purpose: 'Illustrative supply and procurement scenarios',
        glyph: 'optimize',
      },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    mark: 'ST',
    match: (path) => path === '/strategy' || path.startsWith('/strategy/'),
    screens: [
      {
        to: '/strategy',
        short: 'Command',
        title: 'Strategic Resource & Profitability Command Center',
        purpose: 'Contribution, utilization, and investment coverage',
        end: true,
        glyph: 'st',
      },
      {
        to: '/strategy/workforce',
        short: 'Workforce',
        title: 'Workforce & Staffing Economics',
        purpose: 'Staffing utilization, overtime, and reallocation',
        glyph: 'st-workforce',
      },
      {
        to: '/strategy/equipment',
        short: 'Equipment',
        title: 'Equipment & Asset Productivity',
        purpose: 'Serviceable hours, downtime, and replacement',
        glyph: 'st-equipment',
      },
      {
        to: '/strategy/capacity',
        short: 'Capacity',
        title: 'Clinical Capacity & Resource Allocation',
        purpose: 'Effective capacity and reallocation opportunity',
        glyph: 'st-capacity',
      },
      {
        to: '/strategy/service-lines',
        short: 'Service Lines',
        title: 'Service-Line Profitability',
        purpose: 'Contribution margin — not net profit',
        glyph: 'st-service',
      },
      {
        to: '/strategy/cost-efficiency',
        short: 'Cost',
        title: 'Cost Drivers & Efficiency',
        purpose: 'Synthetic cost model and avoidable cost',
        glyph: 'st-cost',
      },
      {
        to: '/strategy/expansion',
        short: 'Expansion',
        title: 'Capital Planning & Expansion',
        purpose: 'CapEx candidates and feasibility',
        glyph: 'st-expansion',
      },
      {
        to: '/strategy/optimization',
        short: 'Optimize',
        title: 'Strategic Optimization & What-if',
        purpose: 'Illustrative reallocation and investment scenarios',
        glyph: 'optimize',
      },
    ],
  },
];

export function screenForPath(path: string): { domain: NavDomain; screen: NavScreen } | null {
  for (const domain of NAV_DOMAINS) {
    const screen = domain.screens.find((item) => {
      if (item.end) return path === item.to || path === '';
      return path === item.to || path.startsWith(`${item.to}/`);
    });
    if (screen) return { domain, screen };
  }
  const fallback = NAV_DOMAINS[0];
  return { domain: fallback, screen: fallback.screens[0] };
}

export function glyphPath(kind: NavScreen['glyph']): string {
  if (kind === 'home' || kind === 'beds' || kind === 'ipd' || kind === 'opd' || kind === 'appt' || kind === 'surg' || kind === 'rad' || kind === 'lab' || kind === 'rx' || kind === 'icu' || kind === 'px' || kind === 'rcm' || kind === 'qs' || kind === 'sc' || kind === 'st' || kind === 'exec' || kind === 'eai') return 'M4 10.5 12 4l8 6.5V20H4z';
  if (kind === 'flow' || kind === 'stay' || kind === 'clinic' || kind === 'attend' || kind === 'or' || kind === 'rad-util' || kind === 'lab-analyzer' || kind === 'rx-dispense' || kind === 'icu-flow' || kind === 'px-journey' || kind === 'rcm-collect' || kind === 'qs-prevention' || kind === 'sc-consumption' || kind === 'st-capacity' || kind === 'ops' || kind === 'eai-fc') return 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0';
  if (kind === 'assign' || kind === 'access' || kind === 'surg-access' || kind === 'rad-access' || kind === 'lab-sample' || kind === 'rx-stock' || kind === 'icu-capacity' || kind === 'px-depts' || kind === 'rcm-elig' || kind === 'qs-incidents' || kind === 'sc-inventory' || kind === 'sc-procurement' || kind === 'st-workforce' || kind === 'st-cost' || kind === 'eai-inv') return 'M4 7h16M4 12h10M4 17h14';
  if (kind === 'outcome' || kind === 'follow' || kind === 'recover' || kind === 'optimize' || kind === 'rcm-leak' || kind === 'qs-outcomes' || kind === 'sc-suppliers' || kind === 'st-expansion' || kind === 'eai-opt' || kind === 'eai-dec') return 'M12 4v16M7 9l5-5 5 5M7 15l5 5 5-5';
  if (kind === 'rad-quality' || kind === 'surg-quality' || kind === 'quality' || kind === 'lab-quality' || kind === 'rx-safety' || kind === 'rx-cost' || kind === 'icu-quality' || kind === 'icu-equip' || kind === 'px-complaints' || kind === 'px-voice' || kind === 'rcm-bill' || kind === 'rcm-claims' || kind === 'qs-infections' || kind === 'qs-actions' || kind === 'sc-waste' || kind === 'st-equipment' || kind === 'st-service' || kind === 'eai-gov') return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
  return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
}
