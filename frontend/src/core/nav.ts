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
  glyph: 'home' | 'flow' | 'quality' | 'beds' | 'assign' | 'plan' | 'ipd' | 'stay' | 'outcome' | 'opd' | 'clinic' | 'follow' | 'appt' | 'access' | 'attend' | 'recover' | 'surg' | 'or' | 'surg-access' | 'surg-quality' | 'optimize' | 'rad' | 'rad-access' | 'rad-util' | 'rad-quality' | 'lab' | 'lab-sample' | 'lab-analyzer' | 'lab-quality' | 'rx' | 'rx-dispense' | 'rx-stock' | 'rx-safety' | 'rx-cost';
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
    id: 'emergency',
    label: 'Emergency',
    mark: 'ED',
    match: (path) => path === '/' || path.startsWith('/emergency'),
    screens: [
      {
        to: '/',
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
  if (kind === 'home' || kind === 'beds' || kind === 'ipd' || kind === 'opd' || kind === 'appt' || kind === 'surg' || kind === 'rad' || kind === 'lab' || kind === 'rx') return 'M4 10.5 12 4l8 6.5V20H4z';
  if (kind === 'flow' || kind === 'stay' || kind === 'clinic' || kind === 'attend' || kind === 'or' || kind === 'rad-util' || kind === 'lab-analyzer' || kind === 'rx-dispense') return 'M4 16c2-4 14-4 16 0M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0';
  if (kind === 'assign' || kind === 'access' || kind === 'surg-access' || kind === 'rad-access' || kind === 'lab-sample' || kind === 'rx-stock') return 'M4 7h16M4 12h10M4 17h14';
  if (kind === 'outcome' || kind === 'follow' || kind === 'recover' || kind === 'optimize') return 'M12 4v16M7 9l5-5 5 5M7 15l5 5 5-5';
  if (kind === 'rad-quality' || kind === 'surg-quality' || kind === 'quality' || kind === 'lab-quality' || kind === 'rx-safety' || kind === 'rx-cost') return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
  return 'M5 19V5h10l4 4v10H5zm8-14v4h4';
}
