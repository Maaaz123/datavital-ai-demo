import { useMemo, useState, type ReactNode } from 'react';
import { scenarioFor, wardRows } from '@/showcase/facts';
import { useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { BEDS_AI_CASES, bedsIndicatorsFor, type BedsScopeInput, type Indicator } from './bedsScope';
import { useCopilot } from './Copilot';
import { sumKey, usePeriod } from './period';
import { Chart, ChartStage, type Figure } from './viz';

const PALETTE = ['#0f6e6a', '#1e3a5f', '#8c6a3d', '#4d6b8a', '#6e8b74'];

type Detail = { name: string; value: string; definition: string; scope: string };
type Tone = 'good' | 'watch' | 'alert' | 'neutral';
type View = ReturnType<typeof buildView>;

function daysInPeriod(period: ReturnType<typeof usePeriod>['period']): number {
  return period === 'year' ? 365 : 91;
}

function buildView(hospital: string, year: number, period: ReturnType<typeof usePeriod>['period']) {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({ label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index], month }))
    : periodRows(hospital, year, period);
  const fact = scenarioFor(hospital, year).focus;
  const beds = period === 'year'
    ? { staffed: fact.staffedBeds, occupied: fact.occupiedBeds, available: fact.availableBeds, blocked: fact.blockedBeds, icuStaffed: fact.icuStaffed, icuOccupied: fact.icuOccupied, icuAvailable: fact.icuAvailable, icuBlocked: fact.icuBlocked }
    : bedSnapshot(rows, fact);
  const admissions = sumKey(rows, 'admissions');
  const discharges = sumKey(rows, 'discharges');
  const transfersIn = sumKey(rows, 'transfersIn');
  const transfersOut = sumKey(rows, 'transfersOut');
  const days = daysInPeriod(period);
  const occupancy = beds.staffed ? beds.occupied / beds.staffed : 0;
  const assignmentMedianMin = Math.round(42 + occupancy * 18);
  const pendingRequests = Math.max(beds.available + 2, Math.round(admissions * 0.04));
  const unallocated = Math.max(0, pendingRequests - beds.available);
  const assignmentCompleted = Math.max(0, admissions - Math.round(admissions * 0.03));
  const assignmentCancelled = Math.round(admissions * 0.03);
  const cleaningAwaiting = Math.round(beds.blocked * 0.6);
  const maintenanceAwaiting = Math.max(0, beds.blocked - cleaningAwaiting);
  const dailyRelease = discharges / days;
  const dailyDemand = admissions / days;
  const expectedReleases = Math.max(1, Math.round(dailyRelease));
  const expectedDemand = Math.max(1, Math.round(dailyDemand));
  const projectedAvailable = Math.max(0, beds.available + expectedReleases - expectedDemand);
  const shortfall = Math.max(0, pendingRequests - beds.available);
  const occupationDurationDays = period === 'year' ? fact.ipLosDays : rows.reduce((sum, row) => sum + row.month.ipLosDays, 0) / Math.max(rows.length, 1);
  const wards = wardRows(period === 'year' ? fact : {
    ...fact,
    staffedBeds: beds.staffed,
    occupiedBeds: beds.occupied,
    availableBeds: beds.available,
    blockedBeds: beds.blocked,
  });
  const generalStaffed = Math.max(0, beds.staffed - beds.icuStaffed);
  const generalOccupied = Math.max(0, beds.occupied - beds.icuOccupied);
  const generalBlocked = Math.max(0, beds.blocked - beds.icuBlocked);
  const generalAvailable = Math.max(0, generalStaffed - generalOccupied - generalBlocked);
  const bedTypes = [
    { id: 'General', staffed: generalStaffed, occupied: generalOccupied, available: generalAvailable, blocked: generalBlocked },
    { id: 'ICU', staffed: beds.icuStaffed, occupied: beds.icuOccupied, available: beds.icuAvailable, blocked: beds.icuBlocked },
  ];
  return {
    ...beds,
    admissions, discharges, transfersIn, transfersOut, days,
    occupancy, assignmentMedianMin, pendingRequests, unallocated,
    assignmentCompleted, assignmentCancelled, cleaningAwaiting, maintenanceAwaiting,
    expectedReleases, expectedDemand, projectedAvailable, shortfall, occupationDurationDays,
    wards, bedTypes,
    labels: rows.map((row) => row.label),
    monthlyOccupied: rows.map((row) => row.month.occupiedBeds),
    monthlyAvailable: rows.map((row) => row.month.availableBeds),
    monthlyBlocked: rows.map((row) => row.month.blockedBeds),
    monthlyAdmissions: rows.map((row) => row.month.admissions),
    monthlyDischarges: rows.map((row) => row.month.discharges),
    monthlyTransfers: rows.map((row) => row.month.transfersIn + row.month.transfersOut),
  };
}

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({ label: names[start + index], month }));
}

function bedSnapshot(
  rows: { month: { staffedBeds: number; occupiedBeds: number; blockedBeds: number; availableBeds: number; icuStaffed: number; icuOccupied: number; icuBlocked: number; icuAvailable: number } }[],
  fact: { icuStaffed: number; icuOccupied: number; icuBlocked: number; icuAvailable: number },
) {
  const staffed = rows[0]?.month.staffedBeds ?? 0;
  const blocked = rows[0]?.month.blockedBeds ?? 0;
  const occupied = Math.min(staffed - blocked, Math.round(rows.reduce((sum, row) => sum + row.month.occupiedBeds, 0) / Math.max(rows.length, 1)));
  return {
    staffed,
    occupied,
    blocked,
    available: staffed - occupied - blocked,
    icuStaffed: fact.icuStaffed,
    icuOccupied: fact.icuOccupied,
    icuBlocked: fact.icuBlocked,
    icuAvailable: fact.icuAvailable,
  };
}

function useView(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  return useMemo(() => buildView(store.hospital, store.year, period), [store.hospital, store.year, period]);
}

function usePrior(): View {
  const store = useShowcase();
  const { period } = usePeriod();
  const year = store.year <= 2024 ? 2024 : store.year - 1;
  return useMemo(() => buildView(store.hospital, year, period), [store.hospital, year, period]);
}

function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number): string {
  const shown = value * 100;
  if (shown !== 0 && Math.abs(shown) < 0.1) return `${shown.toFixed(3)}%`;
  return `${shown.toFixed(1)}%`;
}

function Page({ title, kpis, children }: { title: string; kpis: { name: string; value: string; delta: string; tone?: Tone; testId?: string; detail: Detail }[]; children: ReactNode }) {
  const [open, setOpen] = useState<Detail | null>(null);
  return (
    <article className="gc-command gc-ed">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Beds & Capacity</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="gc-ribbon" data-testid="beds-ribbon">
        {kpis.map((item, index) => (
          <button
            type="button"
            className={`gc-score gc-tone-${item.tone ?? 'neutral'}`}
            key={item.name}
            data-testid={item.testId}
            style={{ animationDelay: `${index * 45}ms` }}
            onClick={() => setOpen(item.detail)}
          >
            <span>{item.name}</span>
            <strong className="gc-ltr">{item.value}</strong>
            <em>{item.delta}</em>
          </button>
        ))}
      </div>
      {open ? (
        <section className="gc-panel gc-fit" data-testid="kpi-detail">
          <h2>{open.name}</h2>
          <p>{open.value}. {open.definition}</p>
          <p>{open.scope}</p>
          <button type="button" className="gc-text-btn" onClick={() => setOpen(null)}>Close detail</button>
        </section>
      ) : null}
      <div className="gc-dense gc-ed-body">{children}</div>
    </article>
  );
}

function Slot({ figure, span = 'span-6' }: { figure: Figure; span?: string }) {
  const copilot = useCopilot();
  return (
    <section className={`gc-panel gc-slot ${span}`}>
      <Chart
        figure={figure}
        compact
        action={(
          <button type="button" className="gc-investigate" aria-label={`Investigate ${figure.title}`} onClick={() => copilot.focusChart(figure.title)}>
            Investigate
          </button>
        )}
      />
    </section>
  );
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string, extra?: Partial<Figure>): Figure {
  return { type, title, categories, series, unit, digits: 0, note, domain: 'beds', subjects: [title], ...extra };
}

function Alerts() {
  const store = useShowcase();
  const copilot = useCopilot();
  const view = useView();
  const { period } = usePeriod();
  const alerts = alertsFor(store.hospital, store.year).filter((alert) => alert.department === 'Beds' && alert.severity !== 'info');
  return (
    <section className="gc-panel gc-insight span-4">
      <h2>Priority alerts</h2>
      <ul className="gc-alert-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button type="button" onClick={() => copilot.openAlert(alert, { stay: true })}>
              <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
              {alert.title} · {alert.observed}
            </button>
          </li>
        ))}
      </ul>
      {period === 'year' ? null : <p>These alerts use the full reporting year. The scores above use the selected period.</p>}
      <div className="gc-next">
        <h2>Management action</h2>
        <p>Review blocked beds, vacant beds, and pending requests on Bed Status while occupancy is {pct(view.occupancy)} and shortfall is {num(view.shortfall)}.</p>
        <button
          type="button"
          className="gc-ai-cta"
          onClick={() => { if (alerts[0]) copilot.openAlert(alerts[0], { stay: true }); else copilot.setOpen(true); }}
        >
          <span className="gc-ai-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20l7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12.8 5.2l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="currentColor" />
              <path d="M19 4l.7 1.7L21.4 6.4 19.7 7.1 19 8.8l-.7-1.7L16.6 6.4l1.7-.7z" fill="currentColor" />
            </svg>
          </span>
          Open Vital Assist
        </button>
        {alerts[0] ? (
          <button type="button" className="gc-text-btn" onClick={() => { copilot.openAlert(alerts[0], { stay: true }); copilot.setTab('approvals'); }}>
            Open the decision review
          </button>
        ) : <p>No open bed-capacity alert for this hospital and year.</p>}
      </div>
    </section>
  );
}

function deltaText(current: number, prior: number, rate = false): string {
  if (current === prior) return 'No change vs baseline';
  if (rate) {
    const pp = (current - prior) * 100;
    if (Math.abs(pp) < 0.05) return 'No change vs baseline';
    return `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp`;
  }
  if (!prior) return 'New versus a zero baseline';
  const rel = ((current - prior) / Math.abs(prior)) * 100;
  return `${rel > 0 ? '+' : ''}${rel.toFixed(1)}%`;
}

function compare(view: View, prior: View, pick: (item: View) => number, rate = false): string {
  return deltaText(pick(view), pick(prior), rate);
}

function scopeInput(view: View): BedsScopeInput {
  return {
    licensed: null,
    physical: null,
    operational: view.staffed,
    occupied: view.occupied,
    vacant: view.available,
    blocked: view.blocked,
    days: view.days,
    admissions: view.admissions,
    discharges: view.discharges,
    transfersIn: view.transfersIn,
    transfersOut: view.transfersOut,
    pendingRequests: view.pendingRequests,
    unallocated: view.unallocated,
    assignmentMedianMin: view.assignmentMedianMin,
    assignmentP90Min: null,
    assignmentCompleted: view.assignmentCompleted,
    assignmentCancelled: view.assignmentCancelled,
    cleaningAwaiting: view.cleaningAwaiting,
    maintenanceAwaiting: view.maintenanceAwaiting,
    cleaningTurnaroundMin: null,
    vacancyDurationHours: null,
    dischargeToReadyMin: null,
    occupationDurationDays: view.occupationDurationDays,
    reassignmentRate: null,
    expectedReleases: view.expectedReleases,
    expectedDemand: view.expectedDemand,
    projectedAvailable: view.projectedAvailable,
    shortfall: view.shortfall,
    forecastAccuracy: null,
    wards: view.wards,
    bedTypes: view.bedTypes,
  };
}

function IndicatorIndex({ indicators, domains }: { indicators: Indicator[]; domains: string[] }) {
  const [domain, setDomain] = useState(domains[0]);
  const [showBlank, setShowBlank] = useState(false);
  const scoped = indicators.filter((item) => domains.includes(item.domain));
  const rows = scoped.filter((item) => item.domain === domain && (showBlank || item.status !== 'unavailable'));
  const blank = scoped.filter((item) => item.status === 'unavailable').length;
  return (
    <section className="gc-panel span-12 gc-scope">
      <div className="gc-scope-head">
        <div>
          <h2>Performance indicators</h2>
          <p>Figures for this view. Hover a card for the measurement note.</p>
        </div>
      </div>
      {domains.length > 1 ? (
        <div className="gc-chips">
          {domains.map((item) => (
            <button key={item} type="button" aria-pressed={domain === item} onClick={() => setDomain(item)}>{item}</button>
          ))}
        </div>
      ) : null}
      <div className="gc-scope-grid">
        {rows.map((item, index) => (
          <article
            key={item.name}
            className={`gc-scope-card is-${item.status === 'unavailable' ? 'blank' : item.status}`}
            style={{ animationDelay: `${index * 35}ms` }}
            title={item.method}
          >
            <span className="gc-scope-status">{item.status === 'unavailable' ? 'Not available' : item.status === 'constructed' ? 'Estimated' : 'Available'}</span>
            <strong>{item.name}</strong>
            <em>{item.value}</em>
          </article>
        ))}
      </div>
      {blank > 0 ? (
        <button type="button" className="gc-text-btn" aria-pressed={showBlank} onClick={() => setShowBlank((value) => !value)}>
          {showBlank ? 'Hide indicators not available here' : 'Show indicators not available in this view'}
        </button>
      ) : null}
    </section>
  );
}

function AiIndex() {
  return (
    <section className="gc-panel span-12 gc-scope gc-scope-tight">
      <div className="gc-scope-head">
        <div>
          <h2>AI decision support</h2>
          <p>Illustrative bed-capacity intelligence · not a validated predictive model</p>
        </div>
      </div>
      <div className="gc-scope-grid gc-scope-grid-dense">
        {BEDS_AI_CASES.map((item, index) => (
          <article key={item.id} className="gc-scope-card is-constructed gc-scope-card-dense" style={{ animationDelay: `${index * 25}ms` }} title={item.limit}>
            <span className="gc-scope-status">{item.level}</span>
            <strong>{item.name}</strong>
            <em>{item.analysis}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function score(name: string, value: string, delta: string, definition: string, scope: string, testId?: string, tone: Tone = 'neutral') {
  return { name, value, delta, tone, testId, detail: { name, value, definition, scope } };
}

function occTone(rate: number): Tone {
  if (rate >= 0.9) return 'alert';
  if (rate >= 0.85) return 'watch';
  return 'good';
}

function rateTone(rate: number, watch: number, alert: number, higherWorse = true): Tone {
  if (higherWorse) {
    if (rate >= alert) return 'alert';
    if (rate >= watch) return 'watch';
    return 'good';
  }
  if (rate < alert) return 'alert';
  if (rate < watch) return 'watch';
  return 'good';
}

export function BedsOverviewPage() {
  const view = useView();
  const prior = usePrior();
  const blockedRate = view.staffed ? view.blocked / view.staffed : 0;
  return (
    <Page title="Bed Status" kpis={[
      score('Operational bed capacity', num(view.staffed), compare(view, prior, (item) => item.staffed), 'Staffed beds available for allocation at the snapshot. Physical presence alone does not make a bed operational.', `${num(view.staffed)} operational beds.`, undefined, 'neutral'),
      score('Occupied beds', num(view.occupied), compare(view, prior, (item) => item.occupied), 'Occupied operational beds in the snapshot. Occupied + vacant + blocked = operational bed capacity.', `${num(view.occupied)} occupied.`, undefined, 'watch'),
      score('Vacant beds', num(view.available), compare(view, prior, (item) => item.available), 'Vacant operational beds ready for allocation at the snapshot.', `${num(view.available)} vacant.`, undefined, view.available <= 2 ? 'alert' : view.available <= 8 ? 'watch' : 'good'),
      score('Blocked / closed beds', num(view.blocked), compare(view, prior, (item) => item.blocked), 'Blocked or closed operational beds. They are not vacant and not occupied.', `${num(view.blocked)} blocked · ${pct(blockedRate)} of operational capacity.`, undefined, rateTone(blockedRate, 0.02, 0.04)),
      score('Bed occupancy rate', pct(view.occupancy), compare(view, prior, (item) => item.occupancy, true), 'Occupied ÷ operational bed capacity at the snapshot. Point-in-time rate; monthly snapshots are not summed into annual occupancy.', `${num(view.occupied)} / ${num(view.staffed)}.`, 'value-kpi_bed_occupancy_rate', occTone(view.occupancy)),
      score('Capacity shortfall', num(view.shortfall), compare(view, prior, (item) => item.shortfall), 'Pending bed requests minus vacant beds when demand exceeds vacant capacity.', `${num(view.pendingRequests)} pending · ${num(view.available)} vacant.`, undefined, view.shortfall > 0 ? 'alert' : 'good'),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Occupied beds over time', view.labels, [{ name: 'Occupied', values: view.monthlyOccupied }], 'beds', 'Month-end occupied snapshots. These census points are not summed into an annual occupancy rate.')} />
      <Alerts />
      <Slot figure={fig('bars', 'Operational bed composition', ['Occupied', 'Vacant', 'Blocked'], [{ name: 'Beds', values: [view.occupied, view.available, view.blocked] }], 'beds', `Occupied + vacant + blocked = ${num(view.staffed)} operational bed capacity at the snapshot.`)} />
      <Slot figure={fig('bars', 'Beds by ward', view.wards.map((ward) => ward.id), [{ name: 'Occupied', values: view.wards.map((ward) => ward.occupied) }, { name: 'Vacant', values: view.wards.map((ward) => ward.available) }, { name: 'Blocked', values: view.wards.map((ward) => ward.blocked) }], 'beds', 'Ward split of the hospital bed snapshot. Occupied + vacant + blocked = ward operational beds.')} />
      <Slot figure={fig('bars', 'Beds by type', view.bedTypes.map((item) => item.id), [{ name: 'Occupied', values: view.bedTypes.map((item) => item.occupied) }, { name: 'Vacant', values: view.bedTypes.map((item) => item.available) }, { name: 'Blocked', values: view.bedTypes.map((item) => item.blocked) }], 'beds', 'General and ICU beds from the same snapshot. Emergency bays are outside Beds & Capacity.')} />
      <Slot figure={fig('line', 'Vacant vs blocked beds', view.labels, [{ name: 'Vacant', values: view.monthlyAvailable }, { name: 'Blocked', values: view.monthlyBlocked }], 'beds', 'Vacant and blocked stay inside the operational bed total at each snapshot.')} />
      <IndicatorIndex indicators={bedsIndicatorsFor(scopeInput(view))} domains={['Bed Inventory & Availability', 'Bed Occupancy']} />
    </Page>
  );
}

export function BedsPlacementPage() {
  const view = useView();
  const prior = usePrior();
  const completionDen = view.assignmentCompleted + view.assignmentCancelled || 1;
  const completionRate = view.assignmentCompleted / completionDen;
  const cancelRate = view.assignmentCancelled / completionDen;
  const turnover = view.staffed ? view.discharges / view.staffed : 0;
  const transferTotal = view.transfersIn + view.transfersOut;
  return (
    <Page title="Bed Assignment" kpis={[
      score('Pending bed requests', num(view.pendingRequests), compare(view, prior, (item) => item.pendingRequests), 'Open bed requests waiting for assignment. Not an emergency waitlist.', `${num(view.pendingRequests)} requests.`, undefined, view.pendingRequests > view.available ? 'alert' : 'watch'),
      score('Bed allocation time (median)', `${num(view.assignmentMedianMin)} min`, compare(view, prior, (item) => item.assignmentMedianMin), 'Median request-to-assignment minutes. Not ED door-to-provider wait.', `Median ${num(view.assignmentMedianMin)} minutes.`, undefined, view.assignmentMedianMin >= 60 ? 'alert' : view.assignmentMedianMin >= 45 ? 'watch' : 'good'),
      score('Unallocated bed requests', num(view.unallocated), compare(view, prior, (item) => item.unallocated), 'Pending requests still without a vacant bed (same shortfall arithmetic when requests exceed vacant capacity).', `${num(view.unallocated)} unallocated.`, undefined, view.unallocated > 0 ? 'alert' : 'good'),
      score('Assignment completion rate', pct(completionRate), compare(view, prior, (item) => item.assignmentCompleted / (item.assignmentCompleted + item.assignmentCancelled || 1), true), 'Completed assignments ÷ completed plus cancelled.', `${num(view.assignmentCompleted)} completed.`, undefined, rateTone(completionRate, 0.95, 0.9, false)),
      score('Assignment cancellation rate', pct(cancelRate), compare(view, prior, (item) => item.assignmentCancelled / (item.assignmentCompleted + item.assignmentCancelled || 1), true), 'Cancelled assignments ÷ completed plus cancelled.', `${num(view.assignmentCancelled)} cancelled.`, undefined, rateTone(cancelRate, 0.03, 0.05)),
      score('Bed turnover rate', num(turnover, 2), compare(view, prior, (item) => item.staffed ? item.discharges / item.staffed : 0), 'Bed releases (discharges) ÷ operational bed capacity in the period. Bed turnover, not staff turnover.', `${num(view.discharges)} releases / ${num(view.staffed)} beds.`, undefined, 'neutral'),
      score('Beds awaiting cleaning', num(view.cleaningAwaiting), compare(view, prior, (item) => item.cleaningAwaiting), 'Constructed share of blocked beds used as a readiness signal. Not a cleaning-clock extract.', `${num(view.cleaningAwaiting)} beds inside the blocked total.`, undefined, view.cleaningAwaiting > 0 ? 'watch' : 'good'),
      score('Bed occupation duration', `${num(view.occupationDurationDays, 1)} days`, compare(view, prior, (item) => item.occupationDurationDays), 'Inpatient length-of-stay median used as bed occupation duration. Not emergency length of stay.', `Median ${num(view.occupationDurationDays, 1)} days.`, undefined, 'neutral'),
    ]}>
      <Slot span="span-8" figure={fig('area', 'Bed admissions and releases', view.labels, [{ name: 'Bed admissions', values: view.monthlyAdmissions }, { name: 'Bed releases', values: view.monthlyDischarges }], 'patients', 'Period bed admissions and discharges. Emergency visits that did not occupy an inpatient bed are excluded.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Assignment pressure</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${view.pendingRequests > view.available ? 'alert' : 'watch'}`}>
            <strong>Requests vs vacant beds</strong>
            <span>{num(view.pendingRequests)} requests · {num(view.available)} vacant</span>
          </div>
          <div className={`gc-exception gc-tone-${view.unallocated > 0 ? 'alert' : 'good'}`}>
            <strong>Unallocated bed requests</strong>
            <span>{num(view.unallocated)} requests</span>
          </div>
          <div className={`gc-exception gc-tone-${view.cleaningAwaiting > 0 ? 'watch' : 'good'}`}>
            <strong>Beds awaiting cleaning</strong>
            <span>{num(view.cleaningAwaiting)} inside the blocked total</span>
          </div>
        </div>
        <p className="gc-next">Assignment P90, vacancy duration, and discharge-to-ready clocks are not available in this scenario.</p>
      </section>
      <Slot figure={fig('bars', 'Bed movement volumes', ['Admissions', 'Transfers in', 'Releases', 'Transfers out'], [{ name: 'Moves', values: [view.admissions, view.transfersIn, view.discharges, view.transfersOut] }], 'patients', 'Period volumes. Admissions occupy beds; releases free beds; transfers move occupancy without a new admission.')} />
      <Slot figure={fig('bars', 'Internal transfer events over time', view.labels, [{ name: 'Transfer events (in + out)', values: view.monthlyTransfers }], 'moves', `${num(transferTotal)} transfer endpoints in the selected period (transfers in + transfers out). Each move may appear once at each endpoint — not a count of unique patients.`)} />
      <Slot figure={fig('bars', 'Blocked bed readiness reasons', ['Cleaning', 'Maintenance'], [{ name: 'Beds', values: [view.cleaningAwaiting, view.maintenanceAwaiting] }], 'beds', 'Constructed split of blocked beds. Cleaning + maintenance = blocked total. Closure reason codes are not extracted.')} />
      <Slot figure={fig('bars', 'Vacant beds by ward', view.wards.map((ward) => ward.id), [{ name: 'Vacant', values: view.wards.map((ward) => ward.available) }], 'beds', 'Vacant beds by ward from the same operational snapshot.')} />
      <IndicatorIndex indicators={bedsIndicatorsFor(scopeInput(view))} domains={['Bed Allocation & Placement', 'Bed Turnover & Readiness', 'Bed Movement & Utilization']} />
    </Page>
  );
}

export function BedsCapacityPage() {
  const view = useView();
  const prior = usePrior();
  const horizons = ['Now', '4h', '12h', '24h', '48h'];
  const share = [0, 4 / 24, 12 / 24, 1, 2];
  const releaseCurve = share.map((part) => Math.max(0, Math.round(view.expectedReleases * part)));
  const demandCurve = share.map((part) => Math.max(0, Math.round(view.expectedDemand * part)));
  const projectedCurve = share.map((_, index) => Math.max(0, view.available + releaseCurve[index] - demandCurve[index]));
  return (
    <Page title="Bed Capacity Outlook" kpis={[
      score('Expected bed releases', num(view.expectedReleases), compare(view, prior, (item) => item.expectedReleases), 'Illustrative next-day releases from the period discharge rate. Not current vacant beds and not a validated discharge model.', `${num(view.expectedReleases)} beds.`, undefined, 'good'),
      score('Expected bed demand', num(view.expectedDemand), compare(view, prior, (item) => item.expectedDemand), 'Illustrative next-day demand from the period admission rate. Not a demand forecast.', `${num(view.expectedDemand)} beds.`, undefined, 'watch'),
      score('Projected available beds', num(view.projectedAvailable), compare(view, prior, (item) => item.projectedAvailable), 'Simulated next-day vacant capacity: current vacant + expected releases − expected demand. Planning sketch only — distinct from current vacant beds.', `${num(view.projectedAvailable)} beds.`, undefined, view.projectedAvailable <= 2 ? 'alert' : 'watch'),
      score('Capacity shortfall', num(view.shortfall), compare(view, prior, (item) => item.shortfall), 'Pending requests minus vacant beds when demand exceeds vacant capacity (current snapshot, not the 48-hour sketch).', `${num(view.shortfall)} short.`, 'value-kpi_bed_shortfall', view.shortfall > 0 ? 'alert' : 'good'),
      score('ICU occupancy rate', pct(view.icuStaffed ? view.icuOccupied / view.icuStaffed : 0), compare(view, prior, (item) => item.icuStaffed ? item.icuOccupied / item.icuStaffed : 0, true), 'ICU occupied ÷ ICU operational beds at the current snapshot. Emergency bays are not ICU beds.', `${num(view.icuOccupied)} / ${num(view.icuStaffed)}.`, undefined, occTone(view.icuStaffed ? view.icuOccupied / view.icuStaffed : 0)),
      score('General bed occupancy rate', pct(view.bedTypes[0]?.staffed ? view.bedTypes[0].occupied / view.bedTypes[0].staffed : 0), compare(view, prior, (item) => item.bedTypes[0]?.staffed ? item.bedTypes[0].occupied / item.bedTypes[0].staffed : 0, true), 'General occupied ÷ general operational beds at the current snapshot.', `${num(view.bedTypes[0]?.occupied ?? 0)} / ${num(view.bedTypes[0]?.staffed ?? 0)}.`, undefined, occTone(view.bedTypes[0]?.staffed ? view.bedTypes[0].occupied / view.bedTypes[0].staffed : 0)),
    ]}>
      <Slot span="span-8" figure={fig('line', 'Illustrative bed availability outlook (next 48 hours)', horizons, [
        { name: 'Projected available', values: projectedCurve },
        { name: 'Expected releases', values: releaseCurve },
        { name: 'Expected demand', values: demandCurve },
      ], 'beds', 'Illustrative 4–48h sketch from period admission and discharge rates. Projected available is simulated future capacity, not the current vacant-bed count. Not a validated forecast.')} />
      <section className="gc-panel gc-insight span-4">
        <h2>Capacity watch list</h2>
        <div className="gc-exception-list">
          <div className={`gc-exception gc-tone-${view.shortfall > 0 ? 'alert' : 'good'}`}>
            <strong>Capacity shortfall</strong>
            <span>{num(view.shortfall)} · requests above vacant beds</span>
          </div>
          <div className={`gc-exception gc-tone-${view.projectedAvailable <= 2 ? 'alert' : 'watch'}`}>
            <strong>Projected available tomorrow</strong>
            <span>{num(view.projectedAvailable)} after next-day sketch</span>
          </div>
          <div className={`gc-exception gc-tone-${projectedCurve[4] <= 2 ? 'alert' : 'watch'}`}>
            <strong>Projected available in 48 hours</strong>
            <span>{num(projectedCurve[4])} beds in the sketch</span>
          </div>
          <div className="gc-exception gc-tone-neutral">
            <strong>Forecast accuracy</strong>
            <span>Not available</span>
          </div>
        </div>
        <p className="gc-next">What-if opening or closing beds is illustrative only. AI does not move a patient.</p>
      </section>
      <Slot figure={fig('bars', 'Beds by type (snapshot)', view.bedTypes.map((item) => item.id), [{ name: 'Occupied', values: view.bedTypes.map((item) => item.occupied) }, { name: 'Vacant', values: view.bedTypes.map((item) => item.available) }, { name: 'Blocked', values: view.bedTypes.map((item) => item.blocked) }], 'beds', 'General and ICU capacity from the current snapshot.')} />
      <Slot figure={fig('bars', 'Ward occupancy rate', view.wards.map((ward) => ward.id), [{ name: 'Occupancy %', values: view.wards.map((ward) => ward.staffed ? Math.round((ward.occupied / ward.staffed) * 1000) / 10 : 0) }], '%', 'Ward occupancy = occupied ÷ staffed at the snapshot. Monthly averages are not summed.')} />
      <Donut title="Operational beds by type" note="General and ICU operational beds. Emergency bays stay outside Beds & Capacity." parts={view.bedTypes.map((item) => ({ name: item.id, value: item.staffed }))} />
      <AiIndex />
      <IndicatorIndex indicators={bedsIndicatorsFor(scopeInput(view))} domains={['Capacity Planning']} />
    </Page>
  );
}

function Donut({ title, note, parts }: { title: string; note: string; parts: { name: string; value: number }[] }) {
  const copilot = useCopilot();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <section className="gc-panel gc-slot span-12">
      <figure className="gc-chart gc-donut-wide" data-chart-state="ok">
        <figcaption className="gc-chart-head">
          <div className="gc-chart-copy">
            <strong>{title}</strong>
            <span>{note}</span>
          </div>
          <button type="button" className="gc-investigate" aria-label={`Investigate ${title}`} onClick={() => copilot.focusChart(title)}>Investigate</button>
        </figcaption>
        <ChartStage>
          <div className="gc-donut-body">
            <svg viewBox="0 0 140 120" role="img" aria-label={`${title}. ${note}`}>
              {parts.map((part, index) => {
                const length = (part.value / total) * circumference;
                const node = (
                  <circle
                    key={part.name}
                    className="gc-donut-seg"
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={PALETTE[index % PALETTE.length]}
                    strokeWidth="14"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 60 60)"
                    style={{ animationDelay: `${index * 80}ms` }}
                    data-tip-title={part.name}
                    data-tip-value={`${num(part.value)} · ${pct(part.value / total)}`}
                  />
                );
                offset += length;
                return node;
              })}
              <text className="gc-donut-total" x="60" y="64" textAnchor="middle">{num(total)}</text>
            </svg>
            <ul className="gc-donut-legend">
              {parts.map((part, index) => (
                <li key={part.name} style={{ animationDelay: `${120 + index * 60}ms` }} data-tip-title={part.name} data-tip-value={`${num(part.value)} · ${pct(part.value / total)}`}>
                  <i style={{ background: PALETTE[index % PALETTE.length] }} />
                  <strong>{part.name}</strong>
                  <span>{num(part.value)}</span>
                  <em>{pct(part.value / total)}</em>
                </li>
              ))}
            </ul>
          </div>
        </ChartStage>
      </figure>
    </section>
  );
}
