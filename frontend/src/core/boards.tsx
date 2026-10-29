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
import { Chart, type Figure } from './viz';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BOARD_TABS: Record<string, { label: string; story?: string }[]> = {
  emergency: [
    { label: 'Overview', story: 'emergency' },
    { label: 'Arrivals' },
    { label: 'Triage' },
    { label: 'Waiting time' },
    { label: 'Patient flow' },
    { label: 'Capacity' },
    { label: 'Quality' },
    { label: 'AI insights' },
  ],
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

export function DomainTabs({ screenId }: { screenId: string }) {
  const domain = Object.keys(BOARD_TABS).find((key) => BOARD_TABS[key].some((tab) => tab.story === screenId) || key === screenId);
  if (!domain) return null;
  return (
    <nav className="gc-tabs" aria-label="Dashboards">
      {BOARD_TABS[domain].map((tab) => (
        tab.story ? (
          <NavLink key={tab.label} to={`/story/${tab.story}`} end>{tab.label}</NavLink>
        ) : (
          <NavLink key={tab.label} to={`/board/${domain}/${slug(tab.label)}`}>{tab.label}</NavLink>
        )
      ))}
    </nav>
  );
}

export function DomainBoard() {
  const { domain = 'emergency', tab = 'arrivals' } = useParams();
  const store = useShowcase();
  const copilot = useCopilot();
  const tabs = BOARD_TABS[domain];
  if (!tabs) return <p>This department is not in the workspace list.</p>;
  const figures = boardFigures(domain, tab, store.hospital, store.year);
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department !== 'All').slice(0, 4);
  return (
    <article className="gc-command">
      <DomainTabs screenId={tabs.find((item) => item.story)?.story ?? domain} />
      <header>
        <p className="gc-kicker">{domain}</p>
        <h1>{tabs.find((item) => slug(item.label) === tab)?.label ?? 'Dashboard'}</h1>
        <p>Reporting year {store.year}. Figures are allocated from the same hospital totals used on the overview.</p>
      </header>
      <div className="gc-dense">
        {figures.map((figure) => (
          <div key={figure.title}>
            <Chart figure={figure} compact />
            <button type="button" className="gc-text-btn" onClick={() => copilot.focusChart(figure.title)}>Investigate {figure.title}</button>
          </div>
        ))}
        {tab.includes('insight') ? (
          <section className="gc-panel span-12">
            <h2>Related alerts</h2>
            <ul className="gc-alert-list">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button type="button" onClick={() => copilot.openAlert(alert)}>{alert.severity} · {alert.title} · {alert.observed}</button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <p><Link to={`/story/${tabs.find((item) => item.story)?.story ?? domain}`}>Back to the overview</Link></p>
    </article>
  );
}

function boardFigures(domain: string, tab: string, hospital: string, year: number): Figure[] {
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
    return [stacked('Monthly triage mix', rows.map((row) => row.month), ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], rows.map((row) => row.values), 'Each month sums to that month’s arrivals.')];
  }
  if (domain === 'emergency' && tab === 'waiting') {
    const bins = waitBins(hospital, year);
    return [fig('bars', 'Door-to-provider distribution', bins.map((item) => item.name), [{ name: 'Arrivals', values: bins.map((item) => item.count) }], 'arrivals', 'Allocated around the annual median and P90. The bins sum to emergency visits.')];
  }
  if (domain === 'emergency' && tab === 'flow') {
    return [fig('flow', 'Emergency disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [fact.edArrivals, fact.edAdmitted, fact.edDischarged, fact.edLeft] }], 'visits', 'Admitted, discharged, and left sum to arrivals.')];
  }
  if (domain === 'emergency' && tab === 'capacity') {
    const staff = staffingByService(hospital, year).find((item) => item.name === 'Emergency');
    return [fig('bars', 'Emergency staffing', ['Required', 'Filled'], [{ name: 'FTE', values: [staff?.required ?? 0, staff?.filled ?? 0] }], 'FTE', 'Emergency share of hospital staffing. The service shares sum to the hospital total.')];
  }
  if (domain === 'emergency' && tab === 'quality') {
    return [fig('bars', 'Left and admitted', ['Left', 'Admitted', 'Discharged'], [{ name: 'Visits', values: [fact.edLeft, fact.edAdmitted, fact.edDischarged] }], 'visits', 'These three dispositions sum to emergency visits.')];
  }
  if (domain === 'beds' && tab === 'wards') {
    const rows = wards(hospital, year);
    return [stacked('Ward census', rows.map((row) => row.name), ['Occupied', 'Available', 'Blocked'], rows.map((row) => [row.occupied, row.available, row.blocked]), 'Occupied, available, and blocked beds sum to staffed beds.')];
  }
  if (domain === 'beds' && tab === 'movement') {
    return [fig('bars', 'Admissions and discharges', MONTHS, [
      { name: 'Admissions', values: months.map((month) => month.admissions) },
      { name: 'Discharges', values: months.map((month) => month.discharges) },
    ], 'stays', 'Monthly movement for this hospital.')];
  }
  if (domain === 'surgery' && tab === 'theatres') {
    const rows = theatres(hospital, year);
    return [fig('bars', 'Completed cases by theatre', rows.map((row) => row.name), [{ name: 'Completed', values: rows.map((row) => row.completed) }], 'cases', 'Theatre counts sum to completed surgical cases.')];
  }
  if (domain === 'surgery' && tab === 'cancellations') {
    return [fig('pareto', 'Cancellation volume', ['Cancelled', 'Completed'], [{ name: 'Cases', values: [fact.surgCancelled, fact.surgCompleted] }], 'cases', 'Completed plus cancelled equals requested cases.')];
  }
  if (domain === 'laboratory' && tab === 'demand') {
    return [fig('area', 'Laboratory orders', MONTHS, [{ name: 'Orders', values: months.map((month) => month.labOrders) }], 'orders', 'Monthly laboratory orders. The year sums to the annual order count.')];
  }
  if (domain === 'laboratory' && tab === 'turnaround') {
    return [fig('line', 'Laboratory turnaround', MONTHS, [
      { name: 'Median', values: months.map((month) => month.labTatMedianMin) },
      { name: 'P90', values: months.map((month) => month.labTatP90Min) },
    ], 'minutes', 'Median and P90 are separate measures.')];
  }
  if (domain === 'radiology' && tab === 'modalities') {
    return [fig('bars', 'Imaging mix', ['X-ray', 'CT', 'Ultrasound', 'MRI'], [{ name: 'Orders', values: [fact.radXr, fact.radCt, fact.radUs, fact.radMr] }], 'orders', 'Modality counts are the imaging order mix for this hospital.')];
  }
  if (domain === 'radiology' && tab === 'reporting') {
    return [fig('line', 'Reporting time', MONTHS, [
      { name: 'Median', values: months.map((month) => month.radTatMedianMin) },
      { name: 'P90', values: months.map((month) => month.radTatP90Min) },
    ], 'minutes', 'Reporting time for this hospital and year.')];
  }
  if (domain === 'pharmacy' && tab === 'medication-flow') {
    return [fig('flow', 'Medication stages', ['Ordered', 'Dispensed', 'Administered'], [{ name: 'Orders', values: [fact.pharmOrders, fact.pharmDispensed, fact.pharmAdmin] }], 'orders', 'Administered does not exceed dispensed, and dispensed does not exceed ordered.')];
  }
  if (domain === 'pharmacy' && tab === 'workload') {
    return [fig('area', 'Medication orders by month', MONTHS, [{ name: 'Orders', values: months.map((month) => month.pharmOrders) }], 'orders', 'Pharmacy workload. This is not the inpatient census.')];
  }
  if (domain === 'rcm' && tab === 'denials') {
    const rows = denialReasons(hospital, year);
    return [fig('pareto', 'Denial reasons', rows.map((row) => row.name), [{ name: 'Denied claims', values: rows.map((row) => row.count) }], 'claims', 'Reason counts sum to denied claims.')];
  }
  if (domain === 'rcm' && tab === 'receivables') {
    const rows = receivableAging(hospital, year);
    return [fig('bars', 'Outstanding balance by age', rows.map((row) => row.name), [{ name: 'SAR', values: rows.map((row) => row.amount) }], 'SAR', 'Aging buckets sum to outstanding receivables.')];
  }
  if (domain === 'experience' && tab === 'complaints') {
    return [fig('bars', 'Complaint handling', ['Opened', 'Closed'], [{ name: 'Complaints', values: [fact.complaintsOpened, fact.complaintsClosed] }], 'complaints', 'Opened and closed complaints for this hospital and year.')];
  }
  if (domain === 'workforce' && tab === 'coverage' || domain === 'workforce' && tab === 'roles') {
    const rows = staffingByService(hospital, year);
    return [fig('bullet', 'Staffing by service', rows.map((row) => row.name), [
      { name: 'Required', values: rows.map((row) => row.required) },
      { name: 'Filled', values: rows.map((row) => row.filled) },
    ], 'FTE', 'Service staffing sums to the hospital required and filled totals.')];
  }
  return [fig('bars', 'No extra view', ['—'], [{ name: 'Value', values: [0] }], 'count', 'Choose a dashboard tab.')];
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
