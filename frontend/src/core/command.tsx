import { Link } from 'react-router-dom';
import { kpiName } from '@/showcase/copy';
import { findKpi } from '@/showcase/engine';
import { formatDelta, measure } from '@/showcase/measures';
import { alertsFor } from './alerts';
import { commandFigures } from './boards';
import { useCopilot } from './Copilot';
import { showMeasure, useScope } from './pages';
import { Chart, screenCharts, type Figure } from './viz';

const RIBBON: Record<string, string[]> = {
  All: ['kpi_encounter_volume', 'kpi_ed_visit_volume', 'kpi_admission_volume', 'kpi_discharge_volume', 'kpi_bed_occupancy_rate', 'kpi_ed_door_to_provider_median_minutes', 'kpi_claim_denied_rate', 'demo_satisfaction_index'],
  Emergency: ['kpi_ed_visit_volume', 'kpi_ed_door_to_provider_median_minutes', 'kpi_ed_door_to_provider_p90_minutes', 'kpi_ed_boarding_gt_4h_rate', 'kpi_ed_to_admission_rate', 'kpi_ed_lwbs_rate'],
  Inpatient: ['kpi_admission_volume', 'kpi_discharge_volume', 'kpi_inpatient_avg_los_days', 'kpi_bed_occupancy_rate', 'kpi_bed_staffed_count', 'kpi_bed_icu_occupancy_rate'],
  Laboratory: ['kpi_lab_order_volume', 'kpi_lab_tat_median_minutes', 'kpi_lab_tat_avg_minutes', 'kpi_lab_order_completed_rate'],
  Surgery: ['kpi_surg_completed_cases', 'kpi_surg_case_request_volume', 'kpi_surg_cancellation_rate', 'kpi_surg_median_turnover_minutes'],
  Pharmacy: ['kpi_med_order_volume', 'kpi_med_dispense_volume', 'kpi_med_admin_volume', 'kpi_med_order_cancelled_rate'],
  Revenue: ['kpi_rcm_gross_charge_amount', 'kpi_rcm_allowed_amount', 'kpi_claim_denied_rate', 'kpi_rcm_outstanding_ar', 'kpi_revenue_collection_rate'],
  Experience: ['demo_satisfaction_index', 'demo_survey_response_rate', 'demo_complaint_open_count', 'demo_service_recovery_closure_rate'],
};

export function CommandCenter() {
  const { store, lang } = useScope();
  const copilot = useCopilot();
  const hospital = store.hospital;
  const year = store.year;
  const department = store.department;
  const ranked = alertsFor(hospital, year)
    .filter((alert) => department === 'All' || alert.department === department)
    .filter((alert) => alert.severity !== 'info')
    .sort((a, b) => rank(a.severity) - rank(b.severity));
  const lead = ranked[0];
  const keys = RIBBON[department] ?? RIBBON.All;
  const charts = pack(chartsFor(hospital, year, department, lang));

  return (
    <article className="gc-command">
      <header className="gc-command-head">
        <div>
          <p className="gc-kicker">Hospital performance</p>
          <h1>Executive Command Center</h1>
        </div>
        <p>{department === 'All' ? 'All services' : department} · {year}</p>
      </header>
      <div className="gc-ribbon" data-testid="command-ribbon">
        {keys.map((key) => {
          const kpi = findKpi(key);
          if (!kpi) return null;
          const item = measure(kpi, hospital, year, 'All');
          return (
            <button type="button" className="gc-score" key={key} onClick={() => copilot.focusChart(kpiName(kpi.name, 'en'))}>
              <span>{kpiName(kpi.name, 'en')}</span>
              <strong className="gc-ltr">{showMeasure(item, lang, store.country)}</strong>
              <em>{formatDelta(item, 'en')}</em>
            </button>
          );
        })}
      </div>
      <div className="gc-dense">
        {charts[0] ? <ChartSlot item={charts[0]} onInvestigate={copilot.focusChart} /> : null}
        <section className="gc-panel gc-insight span-4">
          <h2>Priority insight</h2>
          {lead ? (
            <>
              <p className={`gc-sev gc-sev-${lead.severity}`}>{lead.severity}</p>
              <h3>{lead.title}</h3>
              <p>{lead.observed}. {lead.department}.</p>
              <p>Next step: {lead.action}</p>
              <button type="button" className="gc-btn" onClick={() => copilot.openAlert(lead)}>Open investigation</button>
            </>
          ) : <p>No priority issue is open for this service and year.</p>}
        </section>
        {charts.slice(1).map((item) => <ChartSlot key={item.figure.title} item={item} onInvestigate={copilot.focusChart} />)}
        <section className="gc-panel span-12">
          <h2>Management queue</h2>
          <ul className="gc-alert-list">
            {ranked.slice(0, 4).map((alert) => (
              <li key={alert.id}>
                <button type="button" onClick={() => copilot.openAlert(alert)}>
                  <span className={`gc-sev gc-sev-${alert.severity}`}>{alert.severity}</span>
                  {alert.title} · {alert.observed}
                </button>
              </li>
            ))}
          </ul>
          <Link to="/story/actions">Review the action list</Link>
        </section>
      </div>
    </article>
  );
}

function ChartSlot({ item, onInvestigate }: { item: { figure: Figure; span: string }; onInvestigate: (title: string) => void }) {
  return (
    <div className={item.span}>
      <Chart figure={item.figure} compact />
      <button type="button" className="gc-text-btn" onClick={() => onInvestigate(item.figure.title)}>Investigate {item.figure.title}</button>
    </div>
  );
}

function pack(figures: Figure[]): { figure: Figure; span: string }[] {
  const unique = figures.filter((figure, index) => figures.findIndex((item) => item.title === figure.title) === index);
  const rest = unique.length - 1;
  return unique.map((figure, index) => ({
    figure,
    span: index === 0 ? 'span-8' : index === unique.length - 1 && rest % 2 === 1 ? 'span-12' : 'span-6',
  }));
}

function chartsFor(hospital: string, year: number, department: string, lang: 'en' | 'ar'): Figure[] {
  if (department === 'Emergency') {
    return [
      screenCharts('emergency', hospital, year, lang)[0],
      screenCharts('emergency', hospital, year, lang)[1],
      ...commandFigures(hospital, year).filter((figure) => figure.type === 'heatmap'),
    ];
  }
  if (department === 'Pharmacy') return screenCharts('pharmacy', hospital, year, lang);
  if (department === 'Laboratory') return screenCharts('laboratory', hospital, year, lang);
  if (department === 'Surgery') return screenCharts('surgery', hospital, year, lang);
  if (department === 'Revenue') return [screenCharts('rcm', hospital, year, lang)[0], screenCharts('claims', hospital, year, lang)[0]];
  if (department === 'Inpatient') return [screenCharts('beds', hospital, year, lang)[0], screenCharts('inpatient', hospital, year, lang)[0]];
  if (department === 'Experience') return screenCharts('experience', hospital, year, lang);
  return [
    commandFigures(hospital, year).find((figure) => figure.type === 'area')!,
    screenCharts('command', hospital, year, lang)[0],
    screenCharts('beds', hospital, year, lang)[0],
    commandFigures(hospital, year).find((figure) => figure.type === 'heatmap')!,
    screenCharts('claims', hospital, year, lang)[0],
    screenCharts('rcm', hospital, year, lang)[0],
    commandFigures(hospital, year).find((figure) => figure.type === 'bullet')!,
  ];
}

function rank(severity: string): number {
  if (severity === 'critical') return 0;
  if (severity === 'high') return 1;
  if (severity === 'medium') return 2;
  return 3;
}
