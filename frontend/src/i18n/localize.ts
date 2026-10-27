import type { TFunction } from 'i18next';
import type { ChartPayload, ChartSeries, KPICardData } from '@/types/api';

type Translate = TFunction;

function tryTranslate(t: Translate, key: string, fallback: string): string {
  const value = t(key, { defaultValue: '' });
  return value ? value : fallback;
}

/** Localize a KPI card label (key first, then English label phrase). */
export function localizeKpiLabel(kpi: Pick<KPICardData, 'key' | 'label'>, t: Translate): string {
  const byKey = tryTranslate(t, `data.metrics.${kpi.key}`, '');
  if (byKey) return byKey;
  const byLabel = tryTranslate(t, `data.labels.${kpi.label}`, '');
  if (byLabel) return byLabel;
  return kpi.label;
}

export function localizeKpi(kpi: KPICardData, t: Translate): KPICardData {
  return { ...kpi, label: localizeKpiLabel(kpi, t) };
}

export function localizeKpis(kpis: KPICardData[] | undefined, t: Translate): KPICardData[] {
  return (kpis ?? []).map((kpi) => localizeKpi(kpi, t));
}

function lookupObjectMap(t: Translate, namespace: string, value: string): string {
  const map = t(namespace, { returnObjects: true, defaultValue: {} }) as unknown;
  if (map && typeof map === 'object' && !Array.isArray(map) && value in (map as Record<string, unknown>)) {
    const hit = (map as Record<string, unknown>)[value];
    return typeof hit === 'string' && hit ? hit : '';
  }
  return '';
}

function localizeLiteral(value: string, t: Translate, lang: string): string {
  if (!value) return value;
  if (!lang.toLowerCase().startsWith('ar')) return value;

  const gender = lookupObjectMap(t, 'data.genders', value);
  if (gender) return gender;
  const ageGroup = lookupObjectMap(t, 'data.ageGroups', value);
  if (ageGroup) return ageGroup;
  const domain = lookupObjectMap(t, 'data.domains', value);
  if (domain) return domain;

  const hospital = tryTranslate(t, `data.hospitals.${value}`, '');
  if (hospital) return hospital;
  const ward = tryTranslate(t, `data.wards.${value}`, '');
  if (ward) return ward;
  const department = tryTranslate(t, `data.departments.${value}`, '');
  if (department) return department;
  const series = tryTranslate(t, `data.chartSeries.${value}`, '');
  if (series) return series;
  const label = tryTranslate(t, `data.labels.${value}`, '');
  if (label) return label;

  const statusKey = value.toLowerCase();
  const bedStatus = tryTranslate(t, `beds.status.${statusKey}`, '');
  if (bedStatus && bedStatus !== `beds.status.${statusKey}`) return bedStatus;

  const nursing = value.match(/^Nursing Unit\s+(NU\d+)$/i);
  if (nursing) return `وحدة تمريض ${nursing[1].toUpperCase()}`;

  const wardCode = value.match(/^Ward\s+(W\d+)$/i);
  if (wardCode) return `جناح ${wardCode[1].toUpperCase()}`;

  const arabicWard = value.match(/^Ward\s+(جناح-\d+)$/);
  if (arabicWard) return arabicWard[1].replace('-', ' ');

  const hour = value.match(/^(\d{1,2})$/);
  if (hour) return `ساعة ${hour[1]}`;

  return value;
}

function localizeSeries(series: ChartSeries[], t: Translate, lang: string): ChartSeries[] {
  return series.map((s) => ({
    ...s,
    name: localizeLiteral(s.name, t, lang),
  }));
}

/** Localize chart axis categories and series names for the active language. */
export function localizeChartPayload(
  payload: ChartPayload | null | undefined,
  t: Translate,
  lang: string,
): ChartPayload | null | undefined {
  if (!payload) return payload;
  const categories = Array.isArray(payload.categories)
    ? payload.categories.map((c) => localizeLiteral(String(c), t, lang))
    : payload.categories;
  const series = Array.isArray(payload.series) ? localizeSeries(payload.series, t, lang) : payload.series;
  return { ...payload, categories, series };
}

export function localizeDataLabel(value: string | null | undefined, t: Translate, lang: string): string {
  if (value == null || value === '') return '—';
  return localizeLiteral(String(value), t, lang);
}
