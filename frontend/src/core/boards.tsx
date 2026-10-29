import { Link, NavLink, useParams } from 'react-router-dom';
import { scenarioFor } from '@/showcase/facts';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import {
  HEATMAP_BLOCKS,
  HEATMAP_DAYS,
  arrivalHeatmap,
  arrivalsByHour,
  denialReasons,
  monthlyAcuity,
  receivableAging,
  staffingByService,
  theatres,
  waitBins,
  wards,
} from './derived';
import { EMERGENCY_TABS, EmergencyBoard } from './emergency';
import { Chart, type Figure } from './viz';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BOARD_TABS: Record<string, { label: string; story?: string; slug?: string }[]> = {
  emergency: EMERGENCY_TABS,
  beds: [
    { label: 'Overview', story: 'beds' },
    { label: 'Wards' },
    { label: 'Movement' },
    { label: 'Length of stay', story: 'inpatient' },
  ],
  surgery: [
    { label: 'Overview', story: 'surgery' },
    { label: 'Theatres' },
    { label: 'Cancellations' },
  ],
  laboratory: [
    { label: 'Overview', story: 'laboratory' },
    { label: 'Demand' },
    { label: 'Turnaround' },
  ],
  radiology: [
    { label: 'Overview', story: 'radiology' },
    { label: 'Modalities' },
    { label: 'Reporting' },
  ],
  pharmacy: [
    { label: 'Overview', story: 'pharmacy' },
    { label: 'Medication flow' },
    { label: 'Workload' },
  ],
  rcm: [
    { label: 'Overview', story: 'rcm' },
    { label: 'Claims', story: 'claims' },
    { label: 'Denials' },
    { label: 'Receivables' },
  ],
  experience: [
    { label: 'Overview', story: 'experience' },
    { label: 'Complaints' },
    { label: 'Recovery', story: 'patient-experience' },
  ],
  workforce: [
    { label: 'Overview', story: 'workforce' },
    { label: 'Coverage' },
    { label: 'Roles' },
  ],
};

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
}

export function boardRoute(domain: string, tab: { label: string; story?: string; slug?: string }): string | null {
  if (tab.story) return null;
  return `/board/${domain}/${tab.slug ?? slug(tab.label)}`;
}

export function DomainTabs({ screenId }: { screenId: string }) {
  const domain = Object.keys(BOARD_TABS).find((key) => BOARD_TABS[key].some((tab) => tab.story === screenId) || key === screenId);
  if (!domain) return null;
  return (
    <nav className="gc-tabs" aria-label="Dashboards">
      {BOARD_TABS[domain].map((tab) => (
        tab.story ? (
          <NavLink key={tab.label} to={`/story/${tab.story}`} end>{tab.label}</NavLink>
        ) : (
          <NavLink key={tab.label} to={`/board/${domain}/${tab.slug ?? slug(tab.label)}`}>{tab.label}</NavLink>
        )
      ))}
    </nav>
  );
}

const BOARD_DEPARTMENT: Record<string, string> = {
  emergency: 'Emergency',
  beds: 'Inpatient',
  surgery: 'Surgery',
  laboratory: 'Laboratory',
  radiology: 'Radiology',
  pharmacy: 'Pharmacy',
  rcm: 'Revenue',
  experience: 'Experience',
  workforce: 'Workforce',
};

export function DomainBoard() {
  const { domain = 'emergency', tab = 'arrivals' } = useParams();
  const store = useShowcase();
  const copilot = useCopilot();
  const tabs = BOARD_TABS[domain];
  if (domain === 'emergency') return <EmergencyBoard tab={tab} />;
  if (!tabs) {
    return (
      <article className="gc-command">
        <h1>Workspace not found</h1>
        <p>This department is not in the workspace list.</p>
        <Link to="/">Return to the command center</Link>
      </article>
    );
  }
  const current = tabs.find((item) => slug(item.label) === tab);
  const figures = current && !current.story ? boardFigures(domain, tab, store.hospital, store.year) : null;
  if (!current || current.story || !figures) {
    return (
      <article className="gc-command">
        <h1>Dashboard not found</h1>
        <p>This address is not a published dashboard.</p>
        <Link to="/">Return to the command center</Link>
      </article>
    );
  }
  const service = BOARD_DEPARTMENT[domain] ?? domain;
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === service);
  return (
    <article className="gc-command">
      <DomainTabs screenId={tabs.find((item) => item.story)?.story ?? domain} />
      <header>
        <p className="gc-kicker">{service}</p>
        <h1>{current.label}</h1>
        <p>Reporting year {store.year}. Figures use the same hospital totals as the overview.</p>
      </header>
      <div className="gc-dense">
        {figures.map((figure, index) => (
          <div key={figure.title} className={index === 0 ? 'span-8' : 'span-6'}>
            <Chart
              figure={figure}
              compact
              action={(
                <button type="button" className="gc-investigate" aria-label={`Investigate ${figure.title}`} onClick={() => copilot.focusChart(figure.title)}>
                  Investigate
                </button>
              )}
            />
          </div>
        ))}
        <section className="gc-panel span-6">
          <h2>{service} alerts</h2>
          {alerts.length ? (
            <ul className="gc-alert-list">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button type="button" onClick={() => copilot.openAlert(alert)}>{alert.severity} · {alert.title} · {alert.observed}</button>
                </li>
              ))}
            </ul>
          ) : <p>No open {service} alert for this hospital and year.</p>}
        </section>
      </div>
      <p><Link to={`/story/${tabs.find((item) => item.story)?.story ?? domain}`}>Back to the overview</Link></p>
    </article>
  );
}

function boardFigures(domain: string, tab: string, hospital: string, year: number): Figure[] | null {
  const fact = scenarioFor(hospital, year).focus;
  const months = scenarioFor(hospital, year).months;
  if (domain === 'emergency' && tab === 'arrivals') {
    const hours = arrivalsByHour(hospital, year);
    const matrix = arrivalHeatmap(hospital, year);
    return [
      fig('area', 'Arrivals by hour of day', hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: hours }], 'arrivals', 'The 24 hours sum to annual emergency visits.'),
      heat('Arrivals by day and hour', matrix, 'Each cell is part of the annual emergency visit total.'),
      fig('bars', 'Monthly emergency visits', MONTHS, [{ name: 'Arrivals', values: months.map((month) => month.edArrivals) }], 'arrivals', 'Monthly visits sum to the annual emergency visit count.'),
    ];
  }
  if (domain === 'emergency' && tab === 'triage') {
    const rows = monthlyAcuity(hospital, year);
    const annual = [0, 1, 2, 3, 4].map((level) => rows.reduce((sum, row) => sum + row.values[level], 0));
    return [
      stacked('Monthly triage mix', rows.map((row) => row.month), ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], rows.map((row) => row.values), 'Each month sums to that month’s arrivals.'),
      fig('bars', 'Annual acuity mix', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Arrivals', values: annual }], 'arrivals', 'Annual acuity counts sum to emergency visits.'),
    ];
  }
  if (domain === 'emergency' && tab === 'waiting-time') {
    const bins = waitBins(hospital, year);
    return [
      fig('line', 'Door-to-provider median and P90', MONTHS, [
        { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
        { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
      ], 'minutes', 'Monthly median and P90. The annual figures are visit-weighted, not an average of these months.'),
      fig('bars', 'Door-to-provider distribution', bins.map((item) => item.name), [{ name: 'Arrivals', values: bins.map((item) => item.count) }], 'arrivals', 'Allocated around the annual median and P90. The bins sum to emergency visits.'),
    ];
  }
  if (domain === 'emergency' && tab === 'patient-flow') {
    return [
      fig('flow', 'Emergency disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [fact.edArrivals, fact.edAdmitted, fact.edDischarged, fact.edLeft] }], 'visits', 'Admitted, discharged, and left sum to arrivals.'),
      fig('bars', 'Monthly admissions from emergency', MONTHS, [{ name: 'Admitted', values: months.map((month) => month.edAdmitted) }], 'stays', 'Monthly emergency admissions for this hospital.'),
    ];
  }
  if (domain === 'emergency' && tab === 'capacity') {
    const staff = staffingByService(hospital, year).find((item) => item.name === 'Emergency');
    const hours = arrivalsByHour(hospital, year);
    return [
      fig('bars', 'Emergency staffing', ['Required', 'Filled'], [{ name: 'FTE', values: [staff?.required ?? 0, staff?.filled ?? 0] }], 'FTE', 'Emergency share of hospital staffing. The service shares sum to the hospital total.'),
      fig('area', 'Arrivals by hour of day', hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: hours }], 'arrivals', 'Peak hours are the pressure on the same annual visit total.'),
    ];
  }
  if (domain === 'emergency' && tab === 'quality') {
    return [
      fig('bars', 'Disposition', ['Left', 'Admitted', 'Discharged', 'Deaths'], [{ name: 'Visits', values: [fact.edLeft, fact.edAdmitted, fact.edDischarged, fact.edDeaths] }], 'visits', 'Left, admitted, and discharged sum to arrivals. Deaths are a separate cohort count.'),
      fig('line', 'Patients who left', MONTHS, [{ name: 'Left', values: months.map((month) => month.edLeft) }], 'visits', 'Monthly left-without-being-seen counts sum to the annual left count.'),
    ];
  }
  if (domain === 'emergency' && tab === 'ai-insights') {
    return [
      fig('line', 'Door-to-provider median and P90', MONTHS, [
        { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
        { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
      ], 'minutes', 'The investigation uses this wait series for the selected hospital and year.'),
      fig('bars', 'Disposition', ['Left', 'Admitted', 'Discharged'], [{ name: 'Visits', values: [fact.edLeft, fact.edAdmitted, fact.edDischarged] }], 'visits', 'Context for the emergency alerts on this page.'),
    ];
  }
  if (domain === 'beds' && tab === 'wards') {
    const rows = wards(hospital, year);
    return [
      stacked('Ward census', rows.map((row) => row.name), ['Occupied', 'Available', 'Blocked'], rows.map((row) => [row.occupied, row.available, row.blocked]), 'Occupied, available, and blocked beds sum to staffed beds.'),
      fig('bars', 'Hospital bed status', ['Occupied', 'Available', 'Blocked'], [{ name: 'Beds', values: [fact.occupiedBeds, fact.availableBeds, fact.blockedBeds] }], 'beds', 'These three statuses sum to staffed beds.'),
    ];
  }
  if (domain === 'beds' && tab === 'movement') {
    return [
      fig('bars', 'Admissions and discharges', MONTHS, [
        { name: 'Admissions', values: months.map((month) => month.admissions) },
        { name: 'Discharges', values: months.map((month) => month.discharges) },
      ], 'stays', 'Monthly movement for this hospital.'),
      fig('bars', 'Transfers in and out', MONTHS, [
        { name: 'Transfers in', values: months.map((month) => month.transfersIn) },
        { name: 'Transfers out', values: months.map((month) => month.transfersOut) },
      ], 'stays', 'Transfers are separate from admissions and discharges.'),
    ];
  }
  if (domain === 'surgery' && tab === 'theatres') {
    const rows = theatres(hospital, year);
    return [
      fig('bars', 'Completed cases by theatre', rows.map((row) => row.name), [{ name: 'Completed', values: rows.map((row) => row.completed) }], 'cases', 'Theatre counts sum to completed surgical cases.'),
      fig('line', 'Monthly completed cases', MONTHS, [{ name: 'Completed', values: months.map((month) => month.surgCompleted) }], 'cases', 'Monthly completed cases sum to the annual completed count.'),
    ];
  }
  if (domain === 'surgery' && tab === 'cancellations') {
    return [
      fig('pareto', 'Cancellation volume', ['Cancelled', 'Completed'], [{ name: 'Cases', values: [fact.surgCancelled, fact.surgCompleted] }], 'cases', 'Completed plus cancelled equals requested cases.'),
      fig('bars', 'Monthly cancellations', MONTHS, [{ name: 'Cancelled', values: months.map((month) => month.surgCancelled) }], 'cases', 'Monthly cancellations sum to the annual cancelled count.'),
    ];
  }
  if (domain === 'laboratory' && tab === 'demand') {
    return [
      fig('area', 'Laboratory orders', MONTHS, [{ name: 'Orders', values: months.map((month) => month.labOrders) }], 'orders', 'Monthly laboratory orders. The year sums to the annual order count.'),
      fig('bars', 'Order status', ['Resulted', 'Cancelled', 'Delayed'], [{ name: 'Orders', values: [fact.labResulted, fact.labCancelled, fact.labDelayed] }], 'orders', 'Resulted, cancelled, and delayed orders sum to laboratory orders.'),
    ];
  }
  if (domain === 'laboratory' && tab === 'turnaround') {
    return [
      fig('line', 'Laboratory turnaround', MONTHS, [
        { name: 'Median', values: months.map((month) => month.labTatMedianMin) },
        { name: 'P90', values: months.map((month) => month.labTatP90Min) },
      ], 'minutes', 'Median and P90 are separate measures.'),
      fig('area', 'Laboratory orders', MONTHS, [{ name: 'Orders', values: months.map((month) => month.labOrders) }], 'orders', 'Order volume for the same months as the turnaround series.'),
    ];
  }
  if (domain === 'radiology' && tab === 'modalities') {
    return [
      fig('bars', 'Imaging mix', ['X-ray', 'CT', 'Ultrasound', 'MRI'], [{ name: 'Orders', values: [fact.radXr, fact.radCt, fact.radUs, fact.radMr] }], 'orders', 'Modality counts sum to imaging orders.'),
      fig('bars', 'Reporting status', ['Reported', 'Cancelled', 'No-show'], [{ name: 'Orders', values: [fact.radReported, fact.radCancelled, fact.radNoShow] }], 'orders', 'Reported, cancelled, and no-show sum to imaging orders.'),
    ];
  }
  if (domain === 'radiology' && tab === 'reporting') {
    return [
      fig('line', 'Reporting time', MONTHS, [
        { name: 'Median', values: months.map((month) => month.radTatMedianMin) },
        { name: 'P90', values: months.map((month) => month.radTatP90Min) },
      ], 'minutes', 'Reporting time for this hospital and year.'),
      fig('bars', 'Reporting status', ['Reported', 'Cancelled', 'No-show'], [{ name: 'Orders', values: [fact.radReported, fact.radCancelled, fact.radNoShow] }], 'orders', 'Reported, cancelled, and no-show sum to imaging orders.'),
    ];
  }
  if (domain === 'pharmacy' && tab === 'medication-flow') {
    return [
      fig('flow', 'Medication stages', ['Ordered', 'Dispensed', 'Administered'], [{ name: 'Orders', values: [fact.pharmOrders, fact.pharmDispensed, fact.pharmAdmin] }], 'orders', 'Administered does not exceed dispensed, and dispensed does not exceed ordered.'),
      fig('bars', 'Monthly medication orders', MONTHS, [{ name: 'Orders', values: months.map((month) => month.pharmOrders) }], 'orders', 'Monthly orders sum to the annual medication order count.'),
    ];
  }
  if (domain === 'pharmacy' && tab === 'workload') {
    return [
      fig('area', 'Medication orders by month', MONTHS, [{ name: 'Orders', values: months.map((month) => month.pharmOrders) }], 'orders', 'Pharmacy workload. This is not the inpatient census.'),
      fig('flow', 'Medication stages', ['Ordered', 'Dispensed', 'Administered'], [{ name: 'Orders', values: [fact.pharmOrders, fact.pharmDispensed, fact.pharmAdmin] }], 'orders', 'Administered does not exceed dispensed, and dispensed does not exceed ordered.'),
    ];
  }
  if (domain === 'rcm' && tab === 'denials') {
    const rows = denialReasons(hospital, year);
    return [
      fig('pareto', 'Denial reasons', rows.map((row) => row.name), [{ name: 'Denied claims', values: rows.map((row) => row.count) }], 'claims', 'Reason counts sum to denied claims.'),
      fig('bars', 'Claim disposition', ['Paid', 'Denied', 'Pending'], [{ name: 'Claims', values: [fact.claimsPaid, fact.claimsDenied, fact.claimsPending] }], 'claims', 'Paid, denied, and pending sum to submitted claims.'),
    ];
  }
  if (domain === 'rcm' && tab === 'receivables') {
    const rows = receivableAging(hospital, year);
    return [
      fig('bars', 'Outstanding balance by age', rows.map((row) => row.name), [{ name: 'SAR', values: rows.map((row) => row.amount) }], 'SAR', 'Aging buckets sum to outstanding receivables.'),
      fig('bars', 'Claim disposition', ['Paid', 'Denied', 'Pending'], [{ name: 'Claims', values: [fact.claimsPaid, fact.claimsDenied, fact.claimsPending] }], 'claims', 'Paid, denied, and pending sum to submitted claims.'),
    ];
  }
  if (domain === 'experience' && tab === 'complaints') {
    return [
      fig('bars', 'Complaint handling', ['Opened', 'Closed'], [{ name: 'Complaints', values: [fact.complaintsOpened, fact.complaintsClosed] }], 'complaints', 'Opened and closed complaints for this hospital and year.'),
      fig('bars', 'Monthly complaints opened', MONTHS, [{ name: 'Opened', values: months.map((month) => month.complaintsOpened) }], 'complaints', 'Monthly opened complaints sum to the annual opened count.'),
    ];
  }
  if (domain === 'workforce' && tab === 'coverage') {
    const rows = staffingByService(hospital, year);
    return [
      fig('bullet', 'Staffing by service', rows.map((row) => row.name), [
        { name: 'Required', values: rows.map((row) => row.required) },
        { name: 'Filled', values: rows.map((row) => row.filled) },
      ], 'FTE', 'Service staffing sums to the hospital required and filled totals.'),
      fig('bars', 'Vacant positions by service', rows.map((row) => row.name), [{ name: 'Vacant FTE', values: rows.map((row) => row.required - row.filled) }], 'FTE', 'Vacant FTE is required minus filled.'),
    ];
  }
  if (domain === 'workforce' && tab === 'roles') {
    const rows = staffingByService(hospital, year);
    return [
      fig('bars', 'Vacant positions by service', rows.map((row) => row.name), [{ name: 'Vacant FTE', values: rows.map((row) => row.required - row.filled) }], 'FTE', 'Vacant FTE is required minus filled. Service totals match the hospital staffing identity.'),
      fig('bars', 'Required and filled staffing', rows.map((row) => row.name), [
        { name: 'Required', values: rows.map((row) => row.required) },
        { name: 'Filled', values: rows.map((row) => row.filled) },
      ], 'FTE', 'Required and filled staffing by service. The two series are not added together.'),
    ];
  }
  return null;
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string): Figure {
  return { type, title, categories, series, unit, digits: 0, note, domain: 'board', subjects: [title] };
}

function stacked(title: string, categories: string[], names: string[], rows: number[][], note: string): Figure {
  return fig('stacked', title, categories, names.map((name, index) => ({ name, values: rows.map((row) => row[index] ?? 0) })), 'count', note);
}

function heat(title: string, matrix: number[][], note: string): Figure {
  const flat = matrix.flat();
  return { ...fig('heatmap', title, HEATMAP_BLOCKS, [{ name: 'Arrivals', values: flat }], 'arrivals', note), rows: HEATMAP_DAYS, matrix };
}

export function commandFigures(hospital: string, year: number): Figure[] {
  const months = scenarioFor(hospital, year).months;
  const matrix = arrivalHeatmap(hospital, year);
  const staff = staffingByService(hospital, year);
  const aging = receivableAging(hospital, year);
  return [
    fig('area', 'Encounter trend', MONTHS, [{ name: 'Encounters', values: months.map((month) => month.encounters) }], 'encounters', 'Monthly encounters. The year sums to the annual encounter count.'),
    heat('Emergency arrivals by day and hour', matrix, 'Cells sum to annual emergency visits.'),
    fig('bullet', 'Staffing by service', staff.map((row) => row.name), [
      { name: 'Required', values: staff.map((row) => row.required) },
      { name: 'Filled', values: staff.map((row) => row.filled) },
    ], 'FTE', 'Required and filled staffing by service.'),
    fig('bars', 'Receivables by age', aging.map((row) => row.name), [{ name: 'SAR', values: aging.map((row) => row.amount) }], 'SAR', 'Aging buckets sum to outstanding receivables.'),
  ];
}
