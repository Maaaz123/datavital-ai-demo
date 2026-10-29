import { Link } from 'react-router-dom';
import { kpiName } from '@/showcase/copy';
import { findKpi } from '@/showcase/engine';
import { formatDelta, measure } from '@/showcase/measures';
import { alertsFor } from './alerts';
import { useCopilot } from './Copilot';
import { showMeasure, useScope } from './pages';
import { Chart, screenCharts } from './viz';
import { commandFigures } from './boards';

const GROUPS = [
  { title: 'Demand', keys: ['kpi_encounter_volume', 'kpi_ed_visit_volume', 'kpi_appointment_volume'] },
  { title: 'Patient flow', keys: ['kpi_admission_volume', 'kpi_discharge_volume', 'kpi_inpatient_avg_los_days'] },
  { title: 'Capacity and access', keys: ['kpi_bed_occupancy_rate', 'kpi_bed_staffed_count', 'kpi_ed_door_to_provider_median_minutes'] },
  { title: 'Money, surgery, and experience', keys: ['kpi_surg_completed_cases', 'kpi_claim_denied_rate', 'kpi_rcm_gross_charge_amount', 'demo_satisfaction_index'] },
];

export function CommandCenter() {
  const { store, lang } = useScope();
  const copilot = useCopilot();
  const hospital = store.hospital;
  const year = store.year;
  const ranked = alertsFor(hospital, year)
    .filter((alert) => store.department === 'All' || alert.department === store.department)
    .filter((alert) => alert.severity !== 'info')
    .sort((a, b) => rank(a.severity) - rank(b.severity));
  const lead = ranked[0];
  const charts = [
    ...commandFigures(hospital, year).map((figure) => ({ figure, span: figure.type === 'heatmap' ? 'span-8' : 'span-4' })),
    { figure: screenCharts('command', hospital, year, lang)[0], span: 'span-6' },
    { figure: screenCharts('beds', hospital, year, lang)[0], span: 'span-6' },
    { figure: screenCharts('claims', hospital, year, lang)[0], span: 'span-6' },
    { figure: screenCharts('rcm', hospital, year, lang)[0], span: 'span-6' },
  ];

  return (
    <article className="gc-command">
      <header>
        <p className="gc-kicker">Hospital group performance</p>
        <h1>Executive Command Center</h1>
        <p>Reporting year {year}. Priority issues and the management queue are below the indicators.</p>
      </header>
      <div className="gc-kpi-groups">
        {GROUPS.map((group) => (
          <section key={group.title} className="gc-panel">
            <h2>{group.title}</h2>
            <div className="gc-kpis">
              {group.keys.map((key) => {
                const kpi = findKpi(key);
                if (!kpi) return null;
                const item = measure(kpi, hospital, year, 'All');
                return (
                  <div className="gc-kpi" key={key}>
                    <h3>{kpiName(kpi.name, 'en')}</h3>
                    <p className="gc-figure gc-ltr">{showMeasure(item, lang, store.country)}</p>
                    <p>{formatDelta(item, 'en')}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="gc-dense">
        <section className="gc-panel gc-insight">
          <h2>Priority issue</h2>
          {lead ? (
            <>
              <p className={`gc-sev gc-sev-${lead.severity}`}>{lead.severity}</p>
              <h3>{lead.title}</h3>
              <p>{lead.observed}. {lead.department}.</p>
              <p>{lead.investigation}</p>
              <p>Next step: {lead.action}</p>
              <p>Owner: {lead.owner}</p>
              <button type="button" className="gc-btn" onClick={() => copilot.openAlert(lead)}>Open investigation</button>
            </>
          ) : <p>No priority issue is open for this hospital and year.</p>}
        </section>
        <section className="gc-panel">
          <h2>Management queue</h2>
          <ul className="gc-alert-list">
            {ranked.slice(0, 4).map((alert) => (
              <li key={alert.id}>
                <button type="button" onClick={() => copilot.openAlert(alert)}>
                  <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
                  {alert.title} · {alert.observed}
                </button>
                <p>{alert.owner}</p>
              </li>
            ))}
          </ul>
          <Link to="/story/actions">Review the action list</Link>
        </section>
        {charts.map(({ figure, span }) => (
          <div key={figure.title} className={span}>
            <Chart figure={figure} compact />
            <button type="button" className="gc-text-btn" onClick={() => copilot.focusChart(figure.title)}>
              Investigate {figure.title}
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function rank(severity: string): number {
  if (severity === 'critical') return 0;
  if (severity === 'high') return 1;
  if (severity === 'medium') return 2;
  return 3;
}
