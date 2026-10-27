export interface ApiMeta {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
  filters?: Record<string, unknown>;
  generated_at?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  user_id: number;
  email: string;
  username: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  hospital_keys: number[];
  preferred_language: string;
  preferred_timezone: string;
  is_superuser: boolean;
}

export interface KPICardData {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string | null;
  trend?: number | null;
  trend_direction?: string | null;
  severity?: 'healthy' | 'warning' | 'critical' | 'info' | 'inactive' | string | null;
  format?: 'number' | 'percent' | 'currency' | string;
  previous_value?: number | null;
  change_value?: number | null;
  change_percentage?: number | null;
  is_improvement?: boolean | null;
  data_status?: 'available' | 'partial' | 'unavailable' | string;
  render_state?:
    | 'COMPLETE'
    | 'PARTIAL'
    | 'VALID_ZERO'
    | 'NO_DATA'
    | 'STALE'
    | 'RESTRICTED'
    | 'MODEL_NOT_ENABLED'
    | 'ERROR'
    | string
    | null;
  tooltip?: string | null;
  formula?: string | null;
  unavailable_reason?: string | null;
  updated_at?: string | null;
}

export interface ChartSeries {
  name: string;
  data: (number | string | null)[];
}

export interface ChartPayload {
  chart_type: string;
  categories: (string | number)[];
  series: ChartSeries[];
  meta?: Record<string, unknown>;
}

export interface ExecutiveTrends {
  daily_patient_volume: ChartPayload;
  occupancy_trend: ChartPayload;
  revenue_trend: ChartPayload;
  ed_wait_trend: ChartPayload;
}

export interface TopDiagnosis {
  diagnosis_code: string;
  diagnosis_description: string;
  diagnosis_count: number;
}

export interface BedStatusItem {
  bed_key: number;
  bed_code: string;
  bed_label?: string;
  ward_name?: string;
  room_code?: string;
  hospital_name?: string;
  bed_status: string;
  patient_key?: number | null;
  status_changed_at?: string;
  department_name?: string;
}

export interface OperationalLists {
  awaiting_cleaning: Array<Record<string, unknown>>;
  awaiting_admission: Array<Record<string, unknown>>;
  awaiting_transfer: Array<Record<string, unknown>>;
  expected_discharges: Array<Record<string, unknown>>;
}

export interface FilterOptions {
  organizations: Array<{ organization_key: number; organization_code: string; organization_name: string }>;
  hospitals: Array<{ hospital_key: number; hospital_code: string; hospital_name: string }>;
  facilities: Array<{ facility_key: number; facility_code: string; facility_name: string; hospital_key: number }>;
  departments: Array<{ department_key: number; department_code: string; department_name: string; hospital_key: number }>;
  genders: string[];
  age_groups: string[];
}

/** Generic bag of named chart payloads returned by every domain's /trends endpoint. */
export type DomainTrends = Record<string, ChartPayload>;

/** Loosely-typed row for detail/list tables — backend returns dict rows with varying shapes per domain. */
export type DataRow = Record<string, unknown>;

export interface PatientSearchResult {
  patient_key: number;
  mrn: string;
  full_name: string | null;
  gender?: string | null;
  age_group?: string | null;
  nationality?: string | null;
  total_encounters?: number;
  last_encounter_at?: string | null;
  has_chronic_condition?: boolean;
  hospital_key?: number;
}

export interface Patient360 extends DataRow {
  patient_key: number;
  mrn: string;
  full_name: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  blood_group?: string | null;
  age_group?: string | null;
  hospital_key?: number;
  total_encounters?: number;
  emergency_encounters?: number;
  inpatient_encounters?: number;
  outpatient_encounters?: number;
  first_encounter_at?: string | null;
  last_encounter_at?: string | null;
  distinct_diagnoses?: number;
  total_diagnosis_events?: number;
  total_claims?: number;
  lifetime_net_revenue?: number;
  has_chronic_condition?: boolean;
  is_high_utilizer?: boolean;
}

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  event_ts: string | null;
  event_subtype?: string | null;
  event_status?: string | null;
  hospital_name?: string | null;
  department_name?: string | null;
  mrn?: string | null;
  full_name?: string | null;
}

export interface AlertItem {
  alert_id: number;
  hospital_key?: number | null;
  hospital_name?: string | null;
  department_key?: number | null;
  department_name?: string | null;
  domain: string;
  severity: 'critical' | 'warning' | 'info' | string;
  status: 'open' | 'acknowledged' | 'resolved' | string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;
  resolved_at?: string | null;
  assigned_user_id?: number | null;
  resolution_note?: string | null;
}

export interface DataQualityMetric {
  table: string;
  label: string;
  row_count: number;
  null_key_count: number;
  completeness_pct: number;
  last_loaded_at: string | null;
  freshness_hours: number | null;
  freshness_status: 'fresh' | 'stale' | 'critical' | 'unknown' | string;
}

export interface DataQualityIssue {
  id: number;
  hospital_key?: number | null;
  domain: string;
  table_name: string;
  issue_type: string;
  severity: string;
  description: string;
  detected_at: string;
  status: string;
}

export interface GlobalFilterState {
  year?: number;
  date_from?: string;
  date_to?: string;
  organization_key?: number;
  hospital_key?: number;
  facility_key?: number;
  department_key?: number;
  specialty_key?: number;
  provider_key?: number;
  payer_key?: number;
  gender?: string;
  age_group?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export interface AvailableYearsResponse {
  default_year: number;
  available_years: number[];
  min_year: number;
  max_year: number;
  latest_available_data_at: string;
  timezone: string;
}
