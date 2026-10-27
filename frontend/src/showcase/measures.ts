import type { KpiDef } from './engine';
import { bindKpi, type MeasureKind, type Raw } from './bind';
import { CURRENCY, scenarioFor, WORKFORCE_SHARES } from './facts';

export type { MeasureKind };

export type Measure = {
  value: number;
  prior: number;
  kind: MeasureKind;
  unit: string;
  numerator: number;
  denominator: number;
  grain: string;
  better: 'up' | 'down' | 'neutral';
  assumption: boolean;
  note: string;
};

function applyDepartment(raw: Raw, kpi: KpiDef, department: string): Raw {
  const share = WORKFORCE_SHARES[department];
  if (!share || kpi.domain !== 'Workforce') return raw;
  if (raw.kind === 'rate' || raw.kind === 'index' || raw.kind === 'multiplier') {
    return { ...raw, note: `${raw.note} Department ${department} uses the same rate; staffing counts are scaled by ${(share * 100).toFixed(0)}% of the hospital.` };
  }
  const value = raw.kind === 'fte' ? Math.round(raw.value * share * 10) / 10 : Math.round(raw.value * share);
  return { ...raw, value, numerator: value, note: `${raw.note} Scaled to the ${department} staffing share (${(share * 100).toFixed(0)}%).` };
}

export function measure(kpi: KpiDef, hospital: string, year: number, department = 'All'): Measure {
  const current = applyDepartment(bindKpi(kpi, scenarioFor(hospital, year).focus, hospital, year), kpi, department);
  const priorYear = year <= 2024 ? 2024 : year - 1;
  const prior = applyDepartment(bindKpi(kpi, scenarioFor(hospital, priorYear).focus, hospital, priorYear), kpi, department);
  return {
    ...current,
    prior: prior.value,
    assumption: kpi.origin === 'demo_assumption',
    note: kpi.origin === 'demo_assumption' ? `Demo assumption, not an official NMR field. ${current.note}` : current.note,
  };
}

export function formatMeasure(item: Measure, lang: 'en' | 'ar' = 'en'): string {
  const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const digits = new Intl.NumberFormat(locale, { maximumFractionDigits: item.kind === 'count' ? 0 : 1 });
  if (item.kind === 'rate') return `${digits.format(item.value * 100)}%`;
  if (item.kind === 'index') return `${digits.format(item.value)} / 100`;
  if (item.kind === 'multiplier') return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(item.value)}×`;
  if (item.kind === 'currency') return `${CURRENCY} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(item.value)}`;
  if (item.kind === 'fte') return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(item.value)} FTE`;
  if (item.kind === 'duration') return `${digits.format(item.value)} ${unitLabel(item.unit, lang)}`;
  return digits.format(item.value);
}

export function formatDelta(item: Measure, lang: 'en' | 'ar' = 'en'): string {
  if (item.value === item.prior) {
    return lang === 'ar' ? 'لا تغيير مقابل خط الأساس' : 'No change vs baseline';
  }
  if (item.kind === 'rate') {
    const pp = (item.value - item.prior) * 100;
    if (Math.abs(pp) < 0.05) return lang === 'ar' ? 'لا تغيير مقابل خط الأساس' : 'No change vs baseline';
    const sign = pp > 0 ? '+' : '';
    return lang === 'ar' ? `${sign}${pp.toFixed(1)} نقطة مئوية` : `${sign}${pp.toFixed(1)} pp`;
  }
  if (item.prior === 0) return lang === 'ar' ? 'جديد مقابل أساس صفري' : 'New versus a zero baseline';
  const rel = ((item.value - item.prior) / Math.abs(item.prior)) * 100;
  const sign = rel > 0 ? '+' : '';
  return `${sign}${rel.toFixed(1)}%`;
}

export function movedFavorably(item: Measure): boolean | null {
  if (item.better === 'neutral' || item.value === item.prior) return null;
  const up = item.value > item.prior;
  return item.better === 'up' ? up : !up;
}

function unitLabel(unit: string, lang: 'en' | 'ar'): string {
  if (lang === 'en') return unit;
  if (unit === 'minutes') return 'دقيقة';
  if (unit === 'hours') return 'ساعة';
  if (unit === 'days') return 'يوم';
  return unit;
}

export function inspectSeries(points: { label: string; value: number }[]): 'ok' | 'empty' | 'invalid' | 'zero' {
  if (!points.length) return 'empty';
  if (points.some((point) => !Number.isFinite(point.value))) return 'invalid';
  if (points.every((point) => point.value === 0)) return 'zero';
  return 'ok';
}
