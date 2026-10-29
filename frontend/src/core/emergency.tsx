import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { answerQuestion } from '@/showcase/assistant';
import { kpiName } from '@/showcase/copy';
import { findKpi } from '@/showcase/engine';
import { scenarioFor } from '@/showcase/facts';
import { formatDelta, formatMeasure, measure } from '@/showcase/measures';
import { decisionKey, useShowcase } from '@/showcase/state';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import {
  HEATMAP_BLOCKS,
  HEATMAP_DAYS,
  acuityByPeriod,
  arrivalHeatmap,
  arrivalModes,
  arrivalsByDay,
  arrivalsByHour,
  hourlyDoorToProvider,
  monthlyAcuity,
  monthlyBoarding,
  peakHours,
  staffingByService,
  waitBins,
} from './derived';
import { Chart, screenCharts, type Figure } from './viz';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUESTIONS = [
  'Why is the emergency door-to-provider wait moving?',
  'How many emergency arrivals are there this year?',
  'What should the emergency lead review first?',
];

export const EMERGENCY_TABS: { label: string; story?: string; slug: string }[] = [
  { label: 'Emergency Overview', story: 'emergency', slug: 'overview' },
  { label: 'Patient Arrivals & Demand', slug: 'arrivals' },
  { label: 'Triage & Acuity', slug: 'triage' },
  { label: 'Waiting Time Intelligence', slug: 'waiting-time' },
  { label: 'Patient Flow & Boarding', slug: 'patient-flow' },
  { label: 'Capacity & Staffing', slug: 'capacity' },
  { label: 'Quality & Outcomes', slug: 'quality' },
  { label: 'Emergency AI Insights', slug: 'ai-insights' },
];

const RIBBON: Record<string, { key: string; testId?: string }[]> = {
  overview: [
    { key: 'kpi_ed_visit_volume' },
    { key: 'kpi_ed_door_to_provider_median_minutes' },
    { key: 'kpi_ed_avg_los_hours', testId: 'value-kpi_ed_avg_los_hours' },
    { key: 'kpi_ed_lwbs_rate' },
    { key: 'kpi_ed_boarding_gt_4h_rate' },
    { key: 'kpi_ed_to_admission_rate' },
  ],
  arrivals: [
    { key: 'kpi_ed_visit_volume' },
    { key: 'kpi_ed_arrival_walk_in_share' },
    { key: 'kpi_ed_arrival_ambulance_share' },
    { key: 'kpi_ed_arrival_transfer_share' },
  ],
  triage: [
    { key: 'kpi_ed_visit_volume' },
    { key: 'kpi_ed_esi1_share' },
    { key: 'kpi_ed_esi2_share' },
    { key: 'kpi_ed_esi3_share' },
    { key: 'kpi_ed_triage_volume' },
  ],
  'waiting-time': [
    { key: 'kpi_ed_door_to_provider_median_minutes' },
    { key: 'kpi_ed_door_to_provider_p90_minutes' },
    { key: 'kpi_ed_avg_los_hours', testId: 'value-kpi_ed_avg_los_hours' },
    { key: 'kpi_ed_los_median_minutes' },
    { key: 'kpi_ed_los_p90_minutes' },
  ],
  'patient-flow': [
    { key: 'kpi_ed_visit_volume' },
    { key: 'kpi_ed_to_admission_rate' },
    { key: 'kpi_ed_lwbs_rate' },
    { key: 'kpi_ed_boarding_gt_4h_rate' },
    { key: 'kpi_ed_avg_boarding_hours' },
  ],
  capacity: [
    { key: 'kpi_ed_visit_volume' },
    { key: 'kpi_ed_boarding_gt_4h_rate' },
    { key: 'kpi_bed_available_now_count' },
    { key: 'kpi_bed_occupancy_rate' },
  ],
  quality: [
    { key: 'kpi_ed_lwbs_rate' },
    { key: 'kpi_ed_72h_revisit_rate' },
    { key: 'kpi_ed_mortality_rate' },
    { key: 'kpi_ed_4h_completion_rate' },
  ],
  'ai-insights': [
    { key: 'kpi_ed_door_to_provider_median_minutes' },
    { key: 'kpi_ed_boarding_gt_4h_rate' },
    { key: 'kpi_ed_lwbs_rate' },
    { key: 'kpi_ed_visit_volume' },
  ],
};

export function EmergencyBoard({ tab }: { tab: string }) {
  const store = useShowcase();
  const copilot = useCopilot();
  const current = EMERGENCY_TABS.find((item) => item.slug === tab);
  useEffect(() => {
    if (current) copilot.setScopeLabel(current.label);
  }, [copilot.setScopeLabel, current]);
  if (!current) {
    return (
      <article className="gc-command">
        <h1>Dashboard not found</h1>
        <p>This address is not a published emergency dashboard.</p>
        <Link to="/story/emergency">Return to Emergency Overview</Link>
      </article>
    );
  }
  const hospital = store.hospital;
  const year = store.year;
  const alerts = alertsFor(hospital, year).filter((alert) => alert.department === 'Emergency' && alert.severity !== 'info');
  const figures = figuresFor(tab, hospital, year);
  const scores = RIBBON[tab] ?? RIBBON.overview;
  const rest = figures.slice(1);

  return (
    <article className="gc-command gc-ed">
      <nav className="gc-tabs" aria-label="Dashboards">
        {EMERGENCY_TABS.map((item) => (
          item.story ? (
            <NavLink key={item.slug} to="/story/emergency" end>{item.label}</NavLink>
          ) : (
            <NavLink key={item.slug} to={`/board/emergency/${item.slug}`}>{item.label}</NavLink>
          )
        ))}
      </nav>
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Emergency Department</p>
          <h1>{current.label}</h1>
        </div>
        <p>{year}</p>
      </header>
      {store.department !== 'All' && store.department !== 'Emergency' ? (
        <p>Service scope filters alerts and staffing. Activity on this page stays at hospital level for this reporting period.</p>
      ) : null}
      <div className="gc-ribbon" data-testid="ed-ribbon">
        {scores.map((score) => {
          const kpi = findKpi(score.key);
          if (!kpi) return null;
          const item = measure(kpi, hospital, year, 'All');
          return (
            <button type="button" className="gc-score" key={score.key} data-testid={score.testId} onClick={() => copilot.focusChart(kpiName(kpi.name, 'en'))}>
              <span>{kpiName(kpi.name, 'en')}</span>
              <strong className="gc-ltr">{formatMeasure(item, 'en')}</strong>
              <em>{formatDelta(item, 'en')}</em>
            </button>
          );
        })}
      </div>
      <div className="gc-dense gc-ed-body" key={tab}>
        {figures[0] ? <ChartSlot figure={figures[0]} span="span-8" onInvestigate={copilot.focusChart} /> : null}
        <AlertCard alerts={alerts} />
        {rest.map((figure, index) => (
          <ChartSlot key={figure.title} figure={figure} span={index === rest.length - 1 && rest.length % 2 === 1 ? 'span-12' : 'span-6'} onInvestigate={copilot.focusChart} />
        ))}
      </div>
      {tab === 'overview' ? (
        <p><Link to="/kpis/kpi_ed_door_to_provider_median_minutes">Open the wait lifecycle</Link></p>
      ) : null}
      {tab === 'ai-insights' ? <InsightWorkspace hospital={hospital} year={year} department={store.department} leadKpi={alerts[0]?.kpi ?? 'kpi_ed_door_to_provider_median_minutes'} /> : null}
    </article>
  );
}

function ChartSlot({ figure, span, onInvestigate }: { figure: Figure; span: string; onInvestigate: (title: string) => void }) {
  return (
    <div className={span}>
      <Chart figure={figure} compact />
      <button type="button" className="gc-text-btn" onClick={() => onInvestigate(figure.title)}>Investigate {figure.title}</button>
    </div>
  );
}

function AlertCard({ alerts }: { alerts: ReturnType<typeof alertsFor> }) {
  const copilot = useCopilot();
  const lead = alerts[0];
  return (
    <section className="gc-panel gc-insight span-4">
      <h2>Priority alerts</h2>
      {alerts.length ? (
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
      ) : <p>No open emergency alert for this hospital and year.</p>}
      {lead ? <button type="button" className="gc-btn" onClick={() => copilot.openAlert(lead, { stay: true })}>Open investigation</button> : null}
    </section>
  );
}

function InsightWorkspace({ hospital, year, department, leadKpi }: { hospital: string; year: number; department: string; leadKpi: string }) {
  const store = useShowcase();
  const copilot = useCopilot();
  const [question, setQuestion] = useState(QUESTIONS[0]);
  const answer = answerQuestion(question, hospital, year, department, 'en');
  const key = decisionKey(leadKpi, hospital, year, department);
  const decision = store.approvals[key];
  return (
    <section className="gc-panel">
      <h2>Decision review</h2>
      <p>{answer.title}</p>
      <p>{answer.observation}</p>
      <p>{answer.evidence}</p>
      <p>{answer.explanation}</p>
      <p>Recommended action: {answer.action}</p>
      <p>Expected impact is an estimate. It is not a measured result.</p>
      <div className="gc-inline">
        {QUESTIONS.map((item) => (
          <button type="button" className="gc-btn quiet" key={item} onClick={() => setQuestion(item)}>{item}</button>
        ))}
        <button type="button" className="gc-btn quiet" onClick={() => copilot.setTab('ask')}>Ask DataVital AI</button>
      </div>
      <p>Decision for this hospital, year, and service: {decision ?? 'waiting for a person'}.</p>
      <div className="gc-inline">
        <button type="button" className="gc-btn" onClick={() => { store.decide(key, 'approved'); copilot.setTab('approvals'); }}>Approve recommendation</button>
        <button type="button" className="gc-btn quiet" onClick={() => store.decide(key, 'rejected')}>Reject recommendation</button>
      </div>
      {decision === 'approved' ? <p>Illustrative outcome. This is not a measured hospital result.</p> : null}
      {decision === 'rejected' ? <p>No illustrative outcome is shown after a rejection.</p> : null}
      {!decision ? <p>Record an approval or rejection before an outcome is shown.</p> : null}
    </section>
  );
}

function figuresFor(tab: string, hospital: string, year: number): Figure[] {
  const fact = scenarioFor(hospital, year).focus;
  const months = scenarioFor(hospital, year).months;
  const acuity = monthlyAcuity(hospital, year);
  if (tab === 'overview') {
    return [
      fig('area', 'Monthly emergency visits', MONTHS, [{ name: 'Arrivals', values: months.map((month) => month.edArrivals) }], 'visits', 'Monthly visits sum to the annual emergency visit count.'),
      fig('bars', 'Triage distribution', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Arrivals', values: [fact.acuity1, fact.acuity2, fact.acuity3, fact.acuity4, fact.acuity5] }], 'visits', 'ESI is the classification used in this scenario. The five counts sum to emergency visits.'),
      fig('flow', 'Arrival to disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [fact.edArrivals, fact.edAdmitted, fact.edDischarged, fact.edLeft] }], 'visits', 'Admitted, discharged, and left sum to arrivals.'),
      fig('line', 'Door-to-provider median and P90', MONTHS, [
        { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
        { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
      ], 'minutes', 'Median and P90 are separate. The annual figure is visit-weighted.'),
      bulletStaff(hospital, year),
    ];
  }
  if (tab === 'arrivals') {
    const hours = arrivalsByHour(hospital, year);
    const days = arrivalsByDay(hospital, year);
    const modes = arrivalModes(hospital, year);
    const peaks = peakHours(hospital, year);
    return [
      fig('area', 'Arrivals by hour of day', hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: hours }], 'visits', 'The 24 hours sum to annual emergency visits.'),
      heat('Arrivals by day and hour', arrivalHeatmap(hospital, year), 'Each cell is part of the annual emergency visit total.'),
      fig('bars', 'Arrivals by day of week', days.map((item) => item.name), [{ name: 'Arrivals', values: days.map((item) => item.count) }], 'visits', 'The seven days sum to annual emergency visits.'),
      fig('bars', 'Monthly emergency visits', MONTHS, [{ name: 'Arrivals', values: months.map((month) => month.edArrivals) }], 'visits', 'Monthly visits sum to the annual emergency visit count.'),
      fig('bars', 'How patients arrive', modes.map((item) => item.name), [{ name: 'Arrivals', values: modes.map((item) => item.count) }], 'visits', 'Walk-in, ambulance, transfer, and other sum to emergency visits.'),
      fig('bars', 'Three busiest hours', peaks.map((item) => item.name), [{ name: 'Arrivals', values: peaks.map((item) => item.count) }], 'visits', 'These hours are included in the 24-hour total. They are not an extra population.'),
    ];
  }
  if (tab === 'triage') {
    const periods = acuityByPeriod(hospital, year);
    const annual = [0, 1, 2, 3, 4].map((level) => acuity.reduce((sum, row) => sum + row.values[level], 0));
    return [
      stacked('Monthly triage mix', acuity.map((row) => row.month), acuity.map((row) => row.values), 'Each month sums to that month’s arrivals.'),
      fig('bars', 'Annual acuity mix', ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], [{ name: 'Arrivals', values: annual }], 'visits', 'Annual acuity counts sum to emergency visits.'),
      fig('bars', 'High priority and lower priority', MONTHS, [
        { name: 'ESI-1 and ESI-2', values: acuity.map((row) => row.values[0] + row.values[1]) },
        { name: 'ESI-3 to ESI-5', values: acuity.map((row) => row.values[2] + row.values[3] + row.values[4]) },
      ], 'visits', 'The two groups together equal that month’s arrivals. They are not added to a third total.'),
      stacked('Acuity by time of day', periods.map((row) => row.period), periods.map((row) => row.values), 'Night, morning, afternoon, and evening together equal annual emergency visits.'),
    ];
  }
  if (tab === 'waiting-time') {
    const bins = waitBins(hospital, year);
    const hours = hourlyDoorToProvider(hospital, year);
    const sites = screenCharts('command', hospital, year, 'en');
    const compare = sites.find((figure) => /door-to-provider/i.test(figure.title));
    return [
      fig('line', 'Door-to-provider median and P90', MONTHS, [
        { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
        { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
      ], 'minutes', 'Monthly median and P90. The annual figures are visit-weighted.'),
      fig('bars', 'Waiting-time distribution', bins.map((item) => item.name), [{ name: 'Arrivals', values: bins.map((item) => item.count) }], 'visits', 'The bins sum to emergency visits. They are shaped around the annual median and P90.'),
      fig('line', 'Door-to-provider by hour', hours.median.map((_, index) => `${index}`), [
        { name: 'Median', values: hours.median },
        { name: 'P90', values: hours.p90 },
      ], 'minutes', 'Hourly pattern around the annual median and P90. Busy hours run longer. This is not a second measured median.'),
      fig('bars', 'Median against the review line', ['Median', 'Review line'], [{ name: 'Minutes', values: [fact.edWaitMedianMin, 60] }], 'minutes', '60 minutes is the scenario review line for a high alert. It is not a published clinical standard.'),
      ...(compare ? [compare] : []),
    ];
  }
  if (tab === 'patient-flow') {
    const boarded = monthlyBoarding(hospital, year);
    return [
      fig('flow', 'Arrival to disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [fact.edArrivals, fact.edAdmitted, fact.edDischarged, fact.edLeft] }], 'visits', 'Admitted, discharged, and left sum to arrivals.'),
      fig('bars', 'Monthly disposition', MONTHS, [
        { name: 'Admitted', values: months.map((month) => month.edAdmitted) },
        { name: 'Discharged', values: months.map((month) => month.edDischarged) },
        { name: 'Left', values: months.map((month) => month.edLeft) },
      ], 'visits', 'The three dispositions sum to that month’s arrivals.'),
      fig('bars', 'Patients boarding longer than 4 hours', MONTHS, [{ name: 'Boarded', values: boarded }], 'patients', 'Monthly boarding counts sum to the annual boarding count. Boarding is a share of emergency admissions.'),
      fig('bars', 'Beds available for admission', ['Occupied', 'Available', 'Blocked'], [{ name: 'Beds', values: [fact.occupiedBeds, fact.availableBeds, fact.blockedBeds] }], 'beds', 'Occupied, available, and blocked beds sum to staffed beds. This is the inpatient snapshot boarding depends on.'),
    ];
  }
  if (tab === 'capacity') {
    const hours = arrivalsByHour(hospital, year);
    const staff = staffingByService(hospital, year).find((item) => item.name === 'Emergency');
    const required = staff?.required ?? 0;
    const filled = staff?.filled ?? 0;
    return [
      bulletStaff(hospital, year),
      fig('bars', 'Emergency staffing gap', ['Required', 'Filled', 'Gap'], [{ name: 'FTE', values: [required, filled, required - filled] }], 'FTE', 'Gap is required minus filled. Required and filled are the emergency share of hospital staffing.'),
      fig('area', 'Arrivals by hour of day', hours.map((_, index) => `${index}`), [{ name: 'Arrivals', values: hours }], 'visits', 'Peak hours are the pressure on the same annual visit total.'),
      fig('bars', 'Inpatient beds at the snapshot', ['Occupied', 'Available', 'Blocked'], [{ name: 'Beds', values: [fact.occupiedBeds, fact.availableBeds, fact.blockedBeds] }], 'beds', 'Bed availability is the inpatient snapshot. This scenario does not keep a separate emergency-bay census.'),
    ];
  }
  if (tab === 'quality') {
    const revisit = Math.round(fact.edArrivals * 0.034);
    return [
      fig('line', 'Patients who left before completion', MONTHS, [{ name: 'Left', values: months.map((month) => month.edLeft) }], 'visits', 'Monthly left-without-being-seen counts sum to the annual left count.'),
      fig('bars', 'Left, return visits, and deaths', ['Left', 'Return within 72 hours', 'Deaths in the emergency cohort'], [{ name: 'Visits', values: [fact.edLeft, revisit, fact.edDeaths] }], 'visits', 'Return visits are 3.4% of arrivals in this scenario. Deaths are the emergency cohort, not inpatient deaths. These three counts are not a disposition identity.'),
      fig('bars', 'High-priority arrivals', ['ESI-1', 'ESI-2', 'ESI-3 to ESI-5'], [{ name: 'Arrivals', values: [fact.acuity1, fact.acuity2, fact.acuity3 + fact.acuity4 + fact.acuity5] }], 'visits', 'The three groups sum to emergency visits. Waiting time is not split by acuity in this scenario.'),
      fig('line', 'Door-to-provider median and P90', MONTHS, [
        { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
        { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
      ], 'minutes', 'Delay context for the same hospital and year. Median and P90 stay separate.'),
    ];
  }
  return [
    fig('line', 'Door-to-provider median and P90', MONTHS, [
      { name: 'Median', values: months.map((month) => month.edWaitMedianMin) },
      { name: 'P90', values: months.map((month) => month.edWaitP90Min) },
    ], 'minutes', 'The investigation uses this wait series for the selected hospital and year.'),
    fig('flow', 'Arrival to disposition', ['Arrivals', 'Admitted', 'Discharged', 'Left'], [{ name: 'Visits', values: [fact.edArrivals, fact.edAdmitted, fact.edDischarged, fact.edLeft] }], 'visits', 'Context for the emergency alerts on this page.'),
    fig('bars', 'Patients boarding longer than 4 hours', MONTHS, [{ name: 'Boarded', values: monthlyBoarding(hospital, year) }], 'patients', 'Boarding counts sum to the annual boarding count.'),
  ];
}

function bulletStaff(hospital: string, year: number): Figure {
  const rows = staffingByService(hospital, year);
  return fig('bullet', 'Staffing by service', rows.map((row) => row.name), [
    { name: 'Required', values: rows.map((row) => row.required) },
    { name: 'Filled', values: rows.map((row) => row.filled) },
  ], 'FTE', 'Emergency is one share of hospital staffing. The service shares sum to the hospital total.');
}

function fig(type: Figure['type'], title: string, categories: string[], series: Figure['series'], unit: string, note: string): Figure {
  return { type, title, categories, series, unit, digits: 0, note, domain: 'emergency', subjects: [title] };
}

function stacked(title: string, categories: string[], rows: number[][], note: string): Figure {
  const names = ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'];
  return fig('stacked', title, categories, names.map((name, index) => ({ name, values: rows.map((row) => row[index] ?? 0) })), 'visits', note);
}

function heat(title: string, matrix: number[][], note: string): Figure {
  return { ...fig('heatmap', title, HEATMAP_BLOCKS, [{ name: 'Arrivals', values: matrix.flat() }], 'visits', note), rows: HEATMAP_DAYS, matrix };
}
