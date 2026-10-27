import type { KPICardData } from '@/types/api';
import type { SituationSeverity } from '@/components/ux/types';

export interface SituationResult {
  text: string;
  severity: SituationSeverity;
  observedFact: string;
  possibleExplanation: string;
  recommendedAction: string;
}

function formatKpiValue(kpi: KPICardData): string {
  const unit = kpi.unit ? ` ${kpi.unit}` : '';
  if (kpi.format === 'percent' && typeof kpi.value === 'number') {
    return `${kpi.value.toFixed(1)}%`;
  }
  if (typeof kpi.value === 'number') {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(kpi.value)}${unit}`;
  }
  return `${kpi.value}${unit}`;
}

function trendPhrase(kpi: KPICardData, locale: string): string {
  if (kpi.trend == null || kpi.trend_direction == null) return '';
  const abs = Math.abs(Number(kpi.trend));
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(abs);
  const dir = kpi.trend_direction;
  if (locale.startsWith('ar')) {
    if (dir === 'up') return `بارتفاع ${formatted} مقارنة بالفترة السابقة`;
    if (dir === 'down') return `بانخفاض ${formatted} مقارنة بالفترة السابقة`;
    return 'بدون تغير ملحوظ مقارنة بالفترة السابقة';
  }
  if (dir === 'up') return `up ${formatted} vs the comparison period`;
  if (dir === 'down') return `down ${formatted} vs the comparison period`;
  return 'stable vs the comparison period';
}

/**
 * Build a concise natural-language situation summary from live KPI cards.
 * Uses real label/value/trend/severity — never invents metric values.
 */
export function buildSituationFromKpis(
  kpis: KPICardData[] | undefined,
  options: { domain: string; locale?: string } = { domain: 'operations' },
): SituationResult | null {
  if (!kpis?.length) return null;
  const locale = options.locale ?? 'en';
  const isAr = locale.startsWith('ar');

  const usable = kpis.filter((k) => k.data_status !== 'unavailable');
  if (!usable.length) return null;

  // Prefer domain operational KPIs when present (NMR-aligned dashboards).
  const preferredKeys: Record<string, string[]> = {
    rcm: ['denial_rate', 'collection_rate', 'denied_amount', 'outstanding_amount'],
    appointments: ['no_show_rate', 'slot_utilization_rate', 'cancellation_rate', 'avg_wait_minutes'],
    emergency: ['avg_wait_minutes', 'admission_rate', 'crisis_count', 'critical_count', 'avg_los_minutes'],
  };
  const preferred = preferredKeys[options.domain] || [];
  const preferredKpi = preferred.map((key) => usable.find((k) => k.key === key)).find(Boolean);

  const critical = usable.filter((k) => k.severity === 'critical');
  const warning = usable.filter((k) => k.severity === 'warning');
  const primary = preferredKpi ?? critical[0] ?? warning[0] ?? usable[0];
  const secondary = usable.find((k) => k.key !== primary.key) ?? usable[1];

  const primaryLine = isAr
    ? `${primary.label}: ${formatKpiValue(primary)}${trendPhrase(primary, locale) ? `، ${trendPhrase(primary, locale)}` : ''}.`
    : `${primary.label} is ${formatKpiValue(primary)}${trendPhrase(primary, locale) ? ` (${trendPhrase(primary, locale)})` : ''}.`;

  let secondaryLine = '';
  if (secondary) {
    secondaryLine = isAr
      ? ` ${secondary.label}: ${formatKpiValue(secondary)}${secondary.severity === 'critical' || secondary.severity === 'warning' ? ` (${secondary.severity === 'critical' ? 'حرج' : 'تحذير'})` : ''}.`
      : ` ${secondary.label}: ${formatKpiValue(secondary)}${secondary.severity === 'critical' || secondary.severity === 'warning' ? ` (${secondary.severity})` : ''}.`;
  }

  const attentionCount = critical.length + warning.length;
  let attentionLine = '';
  if (attentionCount > 0) {
    attentionLine = isAr
      ? ` يتطلب ${attentionCount} مؤشراً متابعة فورية.`
      : ` ${attentionCount} indicator${attentionCount === 1 ? '' : 's'} require attention.`;
  } else {
    attentionLine = isAr
      ? ' المؤشرات ضمن النطاق التشغيلي المتوقع.'
      : ' Key indicators are within expected operational range.';
  }

  const severity: SituationSeverity =
    critical.length > 0 ? 'critical' : warning.length > 0 ? 'warning' : 'info';

  const text = `${primaryLine}${secondaryLine}${attentionLine}`.trim();

  const observedFact = isAr
    ? `${primary.label} = ${formatKpiValue(primary)}${primary.previous_value != null ? ` (السابق: ${primary.previous_value})` : ''}.`
    : `${primary.label} = ${formatKpiValue(primary)}${primary.previous_value != null ? ` (previous period: ${primary.previous_value})` : ''}. Evidence from filtered ${options.domain} KPI aggregation.`;

  const possibleExplanation = isAr
    ? 'قد ترتبط التغيرات بالحجم التشغيلي، توفر الموارد، أو جودة البيانات في الفترة المحددة. الارتباط لا يعني السببية. لا يُعد هذا تشخيصاً سريرياً.'
    : 'Changes may relate to volume, capacity, staffing, payer mix, or data completeness for the selected facility/period. Correlation is not causation. This is operational decision support — not clinical diagnosis.';

  const recommendedAction =
    severity === 'critical'
      ? isAr
        ? 'راجع التنبيهات الحرجة والعمل التشغيلي ذي الأولوية، ثم تحقق من تفاصيل المؤشر.'
        : options.domain === 'emergency'
          ? 'Review critical wait-threshold exceptions by triage level and disposition flow.'
          : options.domain === 'rcm'
            ? 'Review critical denial concentration and outstanding claim ownership with the revenue-cycle team.'
            : options.domain === 'appointments'
              ? 'Review critical no-show or underutilized slot capacity with clinic operations.'
              : 'Review critical alerts and the priority worklist, then drill into the elevated indicator.'
      : severity === 'warning'
        ? isAr
          ? 'راقب المؤشرات التحذيرية وحدد المالك التشغيلي للمتابعة خلال الوردية الحالية.'
          : options.domain === 'rcm'
            ? 'Investigate denial-reason concentration and outstanding claim ownership with the revenue-cycle team.'
            : options.domain === 'appointments'
              ? 'Review clinics/physicians with elevated no-show or underutilized slot capacity.'
              : options.domain === 'emergency'
                ? 'Review wait-threshold exceptions by triage level and disposition flow.'
                : 'Monitor warning indicators and assign an operational owner for follow-up this shift.'
        : isAr
          ? 'استمر في المراقبة الروتينية واستخدم التحليل التفصيلي عند الحاجة.'
          : 'Continue routine monitoring and use drill-down when deeper review is needed.';

  return {
    text,
    severity,
    observedFact,
    possibleExplanation,
    recommendedAction,
  };
}

export function mapAlertSeverity(severity: string | undefined): 'critical' | 'warning' | 'info' | 'healthy' {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  if (severity === 'healthy' || severity === 'resolved') return 'healthy';
  return 'info';
}

/** Derive operational owner label from domain or KPI key — not a metric value. */
export function deriveOperationalOwner(domainOrKey: string): string {
  const s = domainOrKey.toLowerCase();
  if (s.includes('emergency') || s.includes('ed_') || s === 'ed') return 'ED';
  if (s.includes('bed') || s.includes('occupancy') || s.includes('icu') || s.includes('capacity')) return 'Capacity';
  if (s.includes('laboratory') || s.includes('lab')) return 'Laboratory';
  if (s.includes('surgery') || s.includes('or_')) return 'Surgery';
  if (s.includes('pharmacy')) return 'Pharmacy';
  if (s.includes('rcm') || s.includes('revenue') || s.includes('claim')) return 'Finance';
  if (s.includes('radiology')) return 'Radiology';
  return 'Operations';
}
