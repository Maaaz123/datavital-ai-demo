/**
 * Synthetic API for the public GitHub Pages demonstration.
 * Every value is invented. Nothing here is a live hospital measurement.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ChartPayload, KPICardData } from '@/types/api';

const GENERATED_AT = '2026-10-26T18:00:00Z';
const DISCLAIMER =
  'Synthetic demonstration output. Not a live hospital measurement and not clinical advice.';

const HOSPITALS = [
  { hospital_key: 1, hospital_code: 'H1', hospital_name: 'Demo General North' },
  { hospital_key: 2, hospital_code: 'H2', hospital_name: 'Demo General South' },
  { hospital_key: 3, hospital_code: 'H3', hospital_name: 'Demo General East' },
  { hospital_key: 4, hospital_code: 'H4', hospital_name: 'Demo General West' },
  { hospital_key: 5, hospital_code: 'H5', hospital_name: 'Demo General Central' },
] as const;

function envelope<T>(data: T) {
  return {
    success: true,
    data,
    generated_at: GENERATED_AT,
    meta: {
      page: 1,
      page_size: 25,
      total_records: Array.isArray(data) ? data.length : 1,
      total_pages: 1,
    },
    filters: { synthetic: true },
  };
}

function days(count = 14): string[] {
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `2026-10-${day}`;
  });
}

function wave(seed: number, count: number, base: number, swing: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const value = base + Math.sin((i + seed) / 2.2) * swing + (i % 4);
    return Math.round(value * 10) / 10;
  });
}

function chart(name: string, seed: number, base: number, chartType = 'line'): ChartPayload {
  const categories = chartType === 'pie' || chartType === 'bar' ? HOSPITALS.map((h) => h.hospital_name) : days();
  const count = categories.length;
  return {
    chart_type: chartType,
    categories,
    series: [{ name, data: wave(seed, count, base, chartType === 'line' ? 8 : 12) }],
    meta: { synthetic: true, disclaimer: DISCLAIMER, period_statuses: categories.map(() => 'COMPLETE') },
  };
}

function kpi(
  key: string,
  label: string,
  value: number,
  extra: Partial<KPICardData> = {},
): KPICardData {
  return {
    key,
    label,
    value,
    severity: 'warning',
    trend: 2.1,
    trend_direction: 'up',
    is_improvement: false,
    data_status: 'available',
    render_state: 'COMPLETE',
    tooltip: DISCLAIMER,
    ...extra,
  };
}

const SUMMARY: Record<string, KPICardData[]> = {
  executive: [
    kpi('operational_health', 'Operational Health', 86.4, { format: 'percent', severity: 'healthy', is_improvement: true, trend_direction: 'down', trend: -1.2 }),
    kpi('patient_volume', 'Patient Volume', 18420, { severity: 'info', is_improvement: true }),
    kpi('ed_wait_minutes', 'ED Wait', 42, { unit: 'min', severity: 'warning' }),
    kpi('ed_avg_wait_minutes', 'ED Average Wait', 42, { unit: 'min', severity: 'warning' }),
    kpi('net_revenue', 'Net Revenue', 12840000, { format: 'currency', severity: 'healthy', is_improvement: true }),
    kpi('claim_denial_rate', 'Claim Denial Rate', 6.8, { format: 'percent', severity: 'warning' }),
    kpi('emergency_visits', 'Emergency Visits', 4120, { severity: 'info' }),
    kpi('inpatient_admissions', 'Inpatient Admissions', 1860, { severity: 'info' }),
    kpi('outpatient_visits', 'Outpatient Visits', 12440, { severity: 'healthy', is_improvement: true }),
    kpi('bed_occupancy_rate', 'Bed Occupancy', 86.4, { format: 'percent', severity: 'warning' }),
  ],
  emergency: [
    kpi('ed_visits', 'ED Visits', 4120, { severity: 'info' }),
    kpi('avg_wait_minutes', 'Average Wait', 42, { unit: 'min', severity: 'warning' }),
    kpi('arrival_to_physician_minutes', 'Door to Provider', 38, { unit: 'min', severity: 'warning' }),
    kpi('ed_los_minutes', 'ED Length of Stay', 186, { unit: 'min', severity: 'warning' }),
    kpi('admission_rate', 'Admission Rate', 18.4, { format: 'percent', severity: 'info' }),
  ],
  beds: [
    kpi('bed_occupancy_rate', 'Bed Occupancy', 86.4, { format: 'percent', severity: 'warning' }),
    kpi('available_beds', 'Available Beds', 74, { severity: 'warning' }),
    kpi('occupied_beds', 'Occupied Beds', 468, { severity: 'info' }),
    kpi('turnover_hours', 'Turnover', 3.4, { unit: 'hr', severity: 'healthy', is_improvement: true }),
  ],
  inpatient: [
    kpi('inpatient_admissions', 'Admissions', 1860, { severity: 'info' }),
    kpi('avg_los_days', 'Average Stay', 4.6, { unit: 'days', severity: 'warning' }),
    kpi('occupancy_rate', 'Occupancy', 84.2, { format: 'percent' }),
    kpi('readmission_rate', 'Readmission Rate', 8.1, { format: 'percent', severity: 'warning' }),
  ],
  outpatient: [
    kpi('outpatient_visits', 'Outpatient Visits', 12440, { severity: 'healthy', is_improvement: true }),
    kpi('clinic_utilization', 'Clinic Utilization', 78.5, { format: 'percent' }),
    kpi('avg_wait_minutes', 'Clinic Wait', 22, { unit: 'min', severity: 'healthy', is_improvement: true }),
  ],
  appointments: [
    kpi('scheduled_appointments', 'Scheduled', 9320, { severity: 'info' }),
    kpi('no_show_rate', 'No-show Rate', 11.4, { format: 'percent', severity: 'warning' }),
    kpi('clinic_utilization', 'Utilization', 78.5, { format: 'percent', severity: 'healthy', is_improvement: true }),
    kpi('avg_wait_minutes', 'Wait', 22, { unit: 'min' }),
  ],
  laboratory: [
    kpi('lab_orders', 'Lab Orders', 15680, { severity: 'info' }),
    kpi('turnaround_minutes', 'Turnaround', 74, { unit: 'min', severity: 'warning' }),
    kpi('critical_result_rate', 'Critical Results', 2.4, { format: 'percent', severity: 'warning' }),
  ],
  radiology: [
    kpi('imaging_orders', 'Imaging Orders', 4280, { severity: 'info' }),
    kpi('report_turnaround_hours', 'Report Turnaround', 6.5, { unit: 'hr', severity: 'warning' }),
    kpi('backlog', 'Unread Studies', 36, { severity: 'warning' }),
  ],
  pharmacy: [
    kpi('dispenses', 'Dispenses', 22140, { severity: 'info' }),
    kpi('verification_minutes', 'Verification Time', 18, { unit: 'min', severity: 'healthy', is_improvement: true }),
    kpi('stockout_items', 'Stockouts', 7, { severity: 'warning' }),
  ],
  surgery: [
    kpi('cases', 'Surgical Cases', 640, { severity: 'info' }),
    kpi('or_utilization', 'OR Utilization', 81.2, { format: 'percent', severity: 'healthy', is_improvement: true }),
    kpi('cancellation_rate', 'Cancellation Rate', 4.8, { format: 'percent', severity: 'warning' }),
    kpi('first_case_on_time', 'First Case On Time', 88, { format: 'percent', severity: 'healthy', is_improvement: true }),
  ],
  rcm: [
    kpi('net_revenue', 'Net Revenue', 12840000, { format: 'currency', severity: 'healthy', is_improvement: true }),
    kpi('claim_denial_rate', 'Denial Rate', 6.8, { format: 'percent', severity: 'warning' }),
    kpi('days_in_ar', 'Days in A/R', 41, { unit: 'days', severity: 'warning' }),
    kpi('collection_rate', 'Collection Rate', 94.2, { format: 'percent', severity: 'healthy', is_improvement: true }),
  ],
  diagnoses: [
    kpi('coded_encounters', 'Coded Encounters', 16880, { severity: 'info' }),
    kpi('coding_lag_days', 'Coding Lag', 2.4, { unit: 'days', severity: 'healthy', is_improvement: true }),
    kpi('unspecified_rate', 'Unspecified Codes', 5.1, { format: 'percent', severity: 'warning' }),
  ],
  patients: [
    kpi('active_patients', 'Active Patients', 24680, { severity: 'info' }),
    kpi('new_patients', 'New Patients', 860, { severity: 'healthy', is_improvement: true }),
    kpi('high_utilizers', 'High Utilizers', 214, { severity: 'warning' }),
  ],
  alerts: [
    kpi('open_alerts', 'Open Alerts', 14, { severity: 'warning' }),
    kpi('critical_alerts', 'Critical Alerts', 3, { severity: 'critical', trend: 1, trend_direction: 'up', is_improvement: false }),
    kpi('acknowledged_alerts', 'Acknowledged', 9, { severity: 'info' }),
  ],
  'data-quality': [
    kpi('quality_score', 'Quality Score', 93.5, { format: 'percent', severity: 'healthy', is_improvement: true }),
    kpi('total_checks', 'Total Checks', 240, { severity: 'info', trend: 0, trend_direction: 'flat' }),
    kpi('passed_checks', 'Passed Checks', 224, { severity: 'healthy', is_improvement: true }),
    kpi('failed_checks', 'Failed Checks', 16, { severity: 'warning' }),
  ],
};

function summaryFor(path: string): KPICardData[] {
  const domain = path.split('/').filter(Boolean)[0] ?? 'executive';
  return SUMMARY[domain] ?? SUMMARY.executive;
}

function trendsBag(seed: number): Record<string, ChartPayload> {
  const keys = [
    'daily_patient_volume',
    'occupancy_trend',
    'revenue_trend',
    'ed_wait_trend',
    'wait_trend',
    'wait_time_trend',
    'visits_by_day',
    'visits_trend',
    'volume_trend',
    'los_trend',
    'denial_trend',
    'utilization_trend',
  ];
  return Object.fromEntries(keys.map((key, index) => [key, chart(key, seed + index, 40 + index * 3)]));
}

function rows(kind: string): Record<string, unknown>[] {
  return HOSPITALS.flatMap((hospital, index) =>
    [0, 1].map((offset) => {
      const n = index * 2 + offset + 1;
      return {
        id: n,
        alert_id: n,
        encounter_id: `SYN-ENC-${1000 + n}`,
        patient_key: 5000 + n,
        mrn: `SYN-${1000 + n}`,
        full_name: `Synthetic Patient ${String(n).padStart(2, '0')}`,
        patient_name: `Synthetic Patient ${String(n).padStart(2, '0')}`,
        gender: n % 2 === 0 ? 'F' : 'M',
        age_group: n % 2 === 0 ? '45-64' : '18-44',
        hospital_key: hospital.hospital_key,
        hospital_name: hospital.hospital_name,
        department_name: kind === 'laboratory' ? 'Core Lab' : 'General Medicine',
        ward_name: `Ward ${String.fromCharCode(65 + (n % 5))}`,
        bed_code: `B-${200 + n}`,
        bed_label: `Bed ${200 + n}`,
        bed_status: n % 3 === 0 ? 'Occupied' : n % 3 === 1 ? 'Available' : 'Cleaning',
        triage_level: (n % 5) + 1,
        arrival_ts: `2026-10-${String((n % 20) + 1).padStart(2, '0')}T0${n % 9}:15:00Z`,
        door_to_provider_minutes: 24 + n,
        los_minutes: 120 + n * 8,
        threshold_breached: n % 4 === 0 ? 'Door-to-provider' : 'None',
        status: n % 4 === 0 ? 'open' : 'acknowledged',
        severity: n % 5 === 0 ? 'critical' : 'warning',
        domain: kind,
        message: `Synthetic ${kind} signal ${n} at ${hospital.hospital_name}. Demonstration only.`,
        created_at: GENERATED_AT,
        waiting_hours: (n % 7) + 1,
        request_type: 'Admission request',
        diagnosis_code: `SYN${n}`,
        diagnosis_description: `Synthetic condition pattern ${n}`,
        diagnosis_count: 40 + n * 3,
        total_encounters: 3 + (n % 6),
        last_encounter_at: '2026-10-20T09:00:00Z',
        has_chronic_condition: n % 2 === 0,
        table_name: 'synthetic_fact',
        table: 'synthetic_fact',
        label: `Synthetic check ${n}`,
        row_count: 1000 + n * 10,
        null_key_count: n % 3,
        completeness_pct: 97 - (n % 4),
        last_loaded_at: GENERATED_AT,
        freshness_hours: 2,
        freshness_status: 'fresh',
        issue: `Synthetic data-quality note ${n}`,
      };
    }),
  );
}

function patient360(id: number) {
  return {
    patient_key: id,
    mrn: `SYN-${id}`,
    full_name: `Synthetic Patient ${id}`,
    gender: 'F',
    age_group: '45-64',
    nationality: 'Synthetic',
    blood_group: 'O+',
    hospital_key: 1,
    total_encounters: 6,
    emergency_encounters: 1,
    inpatient_encounters: 2,
    outpatient_encounters: 3,
    first_encounter_at: '2025-04-02T08:00:00Z',
    last_encounter_at: '2026-10-18T11:20:00Z',
    distinct_diagnoses: 4,
    total_diagnosis_events: 7,
    total_claims: 5,
    lifetime_net_revenue: 18400,
    has_chronic_condition: false,
    is_high_utilizer: false,
  };
}

function bedForecast() {
  const horizons = [6, 12, 24, 48];
  const predictions = HOSPITALS.flatMap((hospital, hIndex) =>
    horizons.map((horizon) => ({
      prediction_id: `syn-${hospital.hospital_code}-${horizon}`,
      hospital_name: hospital.hospital_name,
      ward_name: 'Medical Ward',
      horizon_hours: horizon,
      predicted_occupancy_rate: 78 + hIndex * 2 + horizon / 12,
      predicted_occupied: 80 + hIndex * 5 + horizon,
      lower_bound: 70 + hIndex * 4,
      upper_bound: 96 + hIndex * 4,
      risk_level: hIndex === 0 ? 'warning' : 'medium',
      discharge_probability: 0.35 + hIndex * 0.05,
      window_label: `${horizon}h`,
    })),
  );
  return {
    predictions,
    disclaimer: DISCLAIMER,
    policy: 'Demonstration scoring only. No claim is adjudicated.',
  };
}

function aiRecords(label: string): Record<string, unknown>[] {
  return HOSPITALS.map((hospital, index) => ({
    recommendation_id: `rec-${index + 1}`,
    risk_id: `risk-${index + 1}`,
    title: `${label} for ${hospital.hospital_name}`,
    rationale: DISCLAIMER,
    priority: index + 1,
    hospital_name: hospital.hospital_name,
    risk_level: index === 0 ? 'warning' : 'low',
    predicted_occupancy: 80 + index * 2,
    metric_name: `${label} score`,
    metric_value: 0.82 - index * 0.03,
    ward_name: 'Medical Ward',
    score: 0.7 - index * 0.05,
  }));
}

function opsOverview(kind: string) {
  return {
    ready: true,
    mode: 'synthetic-demo',
    airbyte_runtime: 'not-connected',
    dagster_runtime: 'not-connected',
    disclaimer: DISCLAIMER,
    kpis: summaryFor(kind === 'pipeline' ? 'data-quality' : 'executive').slice(0, 4),
    dimensions: rows('quality').slice(0, 4),
    by_hospital: rows('quality').slice(0, 5),
    by_domain: rows('quality').slice(0, 4),
    by_source: rows('quality').slice(0, 3),
    trend_12m: chart('Quality trend', 3, 92),
    freshness: rows('quality').slice(0, 4),
    connections: HOSPITALS.map((hospital) => ({
      name: `${hospital.hospital_code} synthetic extract`,
      status: 'demonstration',
      hospital_name: hospital.hospital_name,
    })),
    history_trend: chart('Run history', 5, 12, 'bar'),
    failed: [],
    latest_run: { status: 'demonstration', started_at: GENERATED_AT, hospital_name: HOSPITALS[0].hospital_name },
    steps: [
      { name: 'Extract', status: 'demonstration' },
      { name: 'Transform', status: 'demonstration' },
      { name: 'Serve', status: 'demonstration' },
    ],
    runs: rows('pipeline').slice(0, 5),
    dependencies: ['Synthetic HIS', 'Synthetic warehouse'],
    insights: aiRecords('Insight'),
  };
}

function copilotReply(question: string) {
  return {
    success: true,
    conversation_id: 'synthetic-conversation',
    message_id: 'synthetic-message',
    query_id: 'synthetic-query',
    answer: {
      title: 'Demonstration answer',
      summary: `Synthetic briefing for: ${question || 'hospital operations'}. ${DISCLAIMER}`,
      language: 'en',
      insights: [
        'Demo General North occupancy is shown at 86.4% in the synthetic set.',
        'ED door-to-provider is shown at 38 minutes in the synthetic set.',
      ],
      recommended_actions: ['Review the synthetic ED and bed screens. Do not use this for clinical decisions.'],
    },
    query: {
      domain: 'executive',
      intent: 'briefing',
      metrics: ['bed_occupancy_rate', 'ed_wait_minutes'],
      dimensions: ['hospital'],
      filters: {},
      sql_visible: false,
    },
    visualization: {
      type: 'line',
      categories: days(8),
      series: [{ name: 'Synthetic occupancy', data: wave(2, 8, 84, 4) }],
    },
    table: {
      columns: ['Hospital', 'Occupancy'],
      rows: HOSPITALS.map((hospital, index) => ({
        Hospital: hospital.hospital_name,
        Occupancy: `${82 + index}%`,
      })),
      total_rows: HOSPITALS.length,
    },
    sources: [{ model: 'synthetic-demonstration', freshness_at: GENERATED_AT }],
    suggested_questions: ['Which synthetic hospital has the highest occupancy?', 'Show the demonstration ED wait trend.'],
    generated_at: GENERATED_AT,
    warning: DISCLAIMER,
  };
}

function requestPath(config: InternalAxiosRequestConfig): string {
  const raw = String(config.url ?? '');
  const withoutQuery = raw.split('?')[0];
  if (withoutQuery.startsWith('/api/v1')) return withoutQuery.slice('/api/v1'.length) || '/';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function readBody(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      if (data.trim().startsWith('{')) return JSON.parse(data) as Record<string, unknown>;
      return Object.fromEntries(new URLSearchParams(data).entries());
    } catch {
      return {};
    }
  }
  if (typeof data === 'object') return data as Record<string, unknown>;
  return {};
}

function payloadFor(path: string, method: string, body: Record<string, unknown>): unknown {
  if (path === '/auth/login' || path === '/auth/refresh') {
    return envelope({
      access_token: 'synthetic-demo-access',
      refresh_token: 'synthetic-demo-refresh',
      token_type: 'bearer',
      expires_in: 60 * 60 * 24 * 30,
    });
  }
  if (path === '/auth/me') {
    return envelope({
      user_id: 1,
      email: 'demo@datavital.ai',
      username: 'demo',
      full_name: 'Demo Reviewer',
      roles: ['platform_admin'],
      permissions: ['*'],
      hospital_keys: HOSPITALS.map((hospital) => hospital.hospital_key),
      preferred_language: 'en',
      preferred_timezone: 'Asia/Riyadh',
      is_superuser: true,
    });
  }
  if (path === '/auth/logout') return envelope({ status: 'signed-out' });

  if (path === '/filters/options') {
    return envelope({
      organizations: [{ organization_key: 1, organization_code: 'DEMO', organization_name: 'DataVital Demonstration Network' }],
      hospitals: HOSPITALS.map((hospital) => ({ ...hospital })),
      facilities: HOSPITALS.map((hospital) => ({
        facility_key: hospital.hospital_key,
        facility_code: hospital.hospital_code,
        facility_name: hospital.hospital_name,
        hospital_key: hospital.hospital_key,
      })),
      departments: [
        { department_key: 1, department_code: 'ED', department_name: 'Emergency', hospital_key: 1 },
        { department_key: 2, department_code: 'MED', department_name: 'General Medicine', hospital_key: 1 },
        { department_key: 3, department_code: 'SURG', department_name: 'Surgery', hospital_key: 1 },
      ],
      genders: ['F', 'M'],
      age_groups: ['0-17', '18-44', '45-64', '65+'],
    });
  }
  if (path === '/filters/years') {
    return envelope({
      default_year: 2026,
      available_years: [2024, 2025, 2026],
      min_year: 2024,
      max_year: 2026,
      latest_available_data_at: GENERATED_AT,
      timezone: 'Asia/Riyadh',
    });
  }
  if (path === '/integration/features') {
    return envelope([
      { feature_code: 'ai.beds', feature_name: 'Bed forecast', is_enabled: true },
      { feature_code: 'ai.emergency', feature_name: 'ED intelligence', is_enabled: true },
      { feature_code: 'clinical_ai.deterioration', feature_name: 'Deterioration', is_enabled: true },
      { feature_code: 'clinical_ai.imaging', feature_name: 'Imaging', is_enabled: true },
    ]);
  }

  if (path.startsWith('/openmetadata/health')) {
    return { enabled: true, status: 'demonstration', version: 'synthetic' };
  }
  if (path.startsWith('/openmetadata/assets/summary')) {
    return {
      enabled: true,
      fqn: 'synthetic.gold.occupancy',
      name: 'Synthetic occupancy mart',
      owner: 'DataVital demonstration',
      certification: 'demonstration',
      classifications: ['synthetic'],
      contract_status: 'demonstration',
      quality_status: 'pass',
      freshness_status: 'fresh',
      failed_tests: 0,
      message: DISCLAIMER,
    };
  }
  if (path.startsWith('/openmetadata/search') || path.startsWith('/openmetadata/assets/featured')) {
    const assets = [
      {
        fqn: 'synthetic.gold.occupancy',
        name: 'Synthetic occupancy mart',
        description: DISCLAIMER,
        service: 'demonstration',
        database: 'synthetic',
        schema: 'gold',
        profile_url: '#',
        lineage_url: '#',
      },
    ];
    if (path.includes('featured')) return { enabled: true, message: DISCLAIMER, assets };
    return { enabled: true, message: DISCLAIMER, query: 'synthetic', total: assets.length, results: assets };
  }

  if (path === '/copilot/chat') {
    return copilotReply(String(body.question ?? 'operations'));
  }
  if (path === '/copilot/suggestions') {
    return envelope([
      { question: 'Which synthetic hospital is busiest?', domain: 'executive' },
      { question: 'Show demonstration ED wait.', domain: 'emergency' },
    ]);
  }
  if (path === '/copilot/domains') {
    return envelope([
      { key: 'executive', label: 'Executive', description: 'Synthetic leadership view' },
      { key: 'emergency', label: 'Emergency', description: 'Synthetic ED view' },
      { key: 'beds', label: 'Beds', description: 'Synthetic capacity view' },
    ]);
  }
  if (path === '/copilot/metrics') {
    return envelope([
      { key: 'bed_occupancy_rate', label: 'Bed occupancy', domain: 'beds', unit: '%' },
      { key: 'ed_wait_minutes', label: 'ED wait', domain: 'emergency', unit: 'min' },
    ]);
  }
  if (path.startsWith('/copilot/conversations/') && method === 'get') {
    return envelope({
      conversation_id: 'synthetic-conversation',
      title: 'Demonstration briefing',
      created_at: GENERATED_AT,
      updated_at: GENERATED_AT,
      messages: [],
    });
  }
  if (path === '/copilot/conversations') return envelope([]);

  if (path === '/executive/trends') return envelope(trendsBag(1));
  if (path === '/executive/encounters-by-domain') {
    return envelope({
      chart_type: 'bar',
      categories: ['Emergency', 'Inpatient', 'Outpatient', 'Surgery'],
      series: [{ name: 'Synthetic encounters', data: [4120, 1860, 12440, 640] }],
      meta: { synthetic: true },
    });
  }
  if (path === '/executive/hospital-comparison') return envelope(chart('Occupancy', 4, 82, 'bar'));
  if (path === '/executive/top-diagnoses') {
    return envelope([
      { diagnosis_code: 'SYN1', diagnosis_description: 'Synthetic respiratory pattern', diagnosis_count: 420 },
      { diagnosis_code: 'SYN2', diagnosis_description: 'Synthetic metabolic pattern', diagnosis_count: 310 },
      { diagnosis_code: 'SYN3', diagnosis_description: 'Synthetic injury pattern', diagnosis_count: 180 },
    ]);
  }
  if (path === '/beds/operational-lists') {
    const list = rows('beds').slice(0, 6);
    return envelope({
      awaiting_cleaning: list.slice(0, 2),
      awaiting_admission: list.slice(2, 4),
      awaiting_transfer: list.slice(4, 5),
      expected_discharges: list.slice(5, 6),
    });
  }
  if (path === '/beds/status') return envelope(rows('beds').slice(0, 12));

  const patient360Match = path.match(/^\/patients\/(\d+)\/360$/);
  if (patient360Match) return envelope(patient360(Number(patient360Match[1])));
  const timelineMatch = path.match(/^\/patients\/(\d+)\/timeline$/);
  if (timelineMatch) {
    return envelope([
      {
        event_id: 'syn-evt-1',
        event_type: 'Outpatient visit',
        event_ts: '2026-10-18T11:20:00Z',
        event_status: 'completed',
        hospital_name: HOSPITALS[0].hospital_name,
        department_name: 'General Medicine',
        mrn: `SYN-${timelineMatch[1]}`,
        full_name: `Synthetic Patient ${timelineMatch[1]}`,
      },
      {
        event_id: 'syn-evt-2',
        event_type: 'Laboratory',
        event_ts: '2026-09-02T08:10:00Z',
        event_status: 'resulted',
        hospital_name: HOSPITALS[0].hospital_name,
        department_name: 'Core Lab',
        mrn: `SYN-${timelineMatch[1]}`,
        full_name: `Synthetic Patient ${timelineMatch[1]}`,
      },
    ]);
  }

  if (path.includes('/demand-forecast') || path.includes('/discharge-predictions') || path.includes('/no-show-risk')) {
    return envelope(bedForecast());
  }
  if (path.includes('/recommendations') && path.startsWith('/ai/emergency')) {
    return envelope({ items: aiRecords('ED action'), note: DISCLAIMER });
  }
  if (path.includes('/claims')) {
    return envelope({ claims: rows('rcm').slice(0, 6), policy: DISCLAIMER });
  }
  if (path.includes('/model-performance') || path.includes('/capacity-risk') || path.endsWith('/recommendations') || path.includes('/anomalies') || path.includes('/domain-scores') || path.includes('/pipeline-health') || path.includes('/issues') || path.includes('/crowding') || path.includes('/waiting-time') || path.includes('/bottlenecks') || path.includes('/clinic-demand') || path.includes('/waitlist') || path.includes('/denial-reasons') || path.includes('/revenue-leakage') || path.includes('/ward-summary') || path.includes('/high-risk')) {
    return envelope(aiRecords(path.split('/').filter(Boolean).slice(-1)[0] ?? 'signal'));
  }
  if (path.endsWith('/run-forecast') || path.endsWith('/run') || path.endsWith('/run-prediction') || path.includes('review-prediction')) {
    return envelope({ status: 'accepted', synthetic: true });
  }
  if (path.startsWith('/ops-demo/data-quality/rules/') && path.endsWith('/evidence')) {
    return envelope({ rows: rows('quality').slice(0, 4), disclaimer: DISCLAIMER });
  }
  if (path.startsWith('/ops-demo/data-quality/rules')) return envelope(rows('quality').slice(0, 8));
  if (path.startsWith('/ops-demo/ai-insights')) return envelope({ ready: true, insights: aiRecords('Insight') });
  if (path.startsWith('/ops-demo/')) return envelope(opsOverview(path.includes('pipeline') ? 'pipeline' : 'quality'));

  if (path.endsWith('/summary')) return envelope(summaryFor(path));
  if (path.endsWith('/trends')) return envelope(trendsBag(path.length));
  const listEndpoint =
    path === '/alerts' ||
    /(?:^|\/)(?:details|search|exceptions|current-patients|census|slots|today|status)$/.test(path) ||
    path.endsWith('-exceptions') ||
    path.endsWith('-patients');
  if (listEndpoint) return envelope(rows(path.split('/')[1] || 'operations'));
  if (/(breakdown|distribution|hourly|comparison|by-hospital|by-ward|utilization|volume|aging|occupancy)/.test(path)) {
    const type = /distribution/.test(path) ? 'pie' : /hourly|trend|occupancy/.test(path) ? 'line' : 'bar';
    return envelope(chart(path, path.length, 48, type));
  }
  if (method === 'post' || method === 'put' || method === 'delete') {
    return envelope({ status: 'accepted', synthetic: true });
  }
  return envelope({
    predictions: bedForecast().predictions,
    items: aiRecords('Item'),
    kpis: summaryFor(path),
    disclaimer: DISCLAIMER,
    ready: true,
    status: 'synthetic',
  });
}

export function staticDemoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const path = requestPath(config);
  const method = String(config.method ?? 'get').toLowerCase();
  if (config.responseType === 'blob' || path.endsWith('/export')) {
    const csv = 'hospital,metric,value,note\nDemo General North,occupancy,86.4,synthetic demonstration\n';
    return Promise.resolve({
      data: new Blob([csv], { type: 'text/csv' }),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  }
  return Promise.resolve({
    data: payloadFor(path, method, readBody(config.data)),
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}
