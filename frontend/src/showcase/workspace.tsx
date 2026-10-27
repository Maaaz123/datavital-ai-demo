import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EXTENSIONS, SCREENS, SEMANTIC_VIEWS } from './catalog';
import { BarChart, CompareChart, GroupedChart, Ledger, StackChart } from './charts';
import { CHART_LABELS, MONTHS, QUESTION_AR, deptLabel, kpiName, tx, type Lang } from './copy';
import { USE_CASES, findKpi } from './engine';
import { CURRENCY, CURRENCY_NOTE, WORKFORCE_SHARES, scenarioFor, skillMix, wardRows, type AnnualFact } from './facts';
import { formatDelta, formatMeasure, measure, movedFavorably } from './measures';
import { useShowcase } from './state';

const FAMILY: Record<string, string> = {
  hub: 'hub',
  command: 'command',
  stability: 'stability',
  journey: 'journey',
  revenue: 'rcm',
  risk: 'risk',
  actions: 'actions',
  comparison: 'compare',
  emergency: 'emergency',
  beds: 'beds',
  inpatient: 'inpatient',
  outpatient: 'appointments',
  appointments: 'appointments',
  dialysis: 'dialysis',
  mortality: 'mortality',
  surgery: 'surgery',
  laboratory: 'laboratory',
  radiology: 'radiology',
  pharmacy: 'pharmacy',
  experience: 'experience',
  registry: 'registry',
  diagnoses: 'diagnoses',
  rcm: 'rcm',
  claims: 'claims',
  workforce: 'workforce',
  access: 'access',
  audit: 'audit',
  quality: 'quality',
  'quality-detail': 'quality',
  metadata: 'metadata',
  'kpi-catalog': 'catalog',
  'semantic-views': 'semantic',
  'verified-queries': 'queries',
  'ai-overview': 'ai',
  'ai-cases': 'ai',
  'ai-case': 'ai',
  predictions: 'predictions',
  insights: 'insights',
  assistant: 'assistant',
  'clinical-quality': 'safety',
  'infection-prevention': 'infection',
  'supply-chain': 'supply',
  'biomedical-equipment': 'equipment',
  'ai-governance': 'ai',
  'patient-experience': 'experience',
  'ward-transfer': 'transfer',
  morgue: 'morgue',
  'maternal-neonatal': 'births',
  'assessments-vitals': 'vitals',
  eligibility: 'eligibility',
  'pre-authorization': 'preauth',
  'claims-processing': 'claims',
  'billing-collections': 'rcm',
};

const FIT: Record<string, string> = {
  emergency: 'Emergency',
  inpatient: 'Inpatient',
  surgery: 'Surgery',
  laboratory: 'Laboratory',
  pharmacy: 'Pharmacy',
  experience: 'Experience',
  'patient-experience': 'Experience',
  rcm: 'Revenue',
  claims: 'Revenue',
  'pre-authorization': 'Revenue',
  'claims-processing': 'Revenue',
  'billing-collections': 'Revenue',
  eligibility: 'Revenue',
  workforce: 'any',
  command: 'any',
  hub: 'any',
  stability: 'any',
  revenue: 'any',
  risk: 'any',
  actions: 'any',
  'ward-transfer': 'Inpatient',
  'assessments-vitals': 'Inpatient',
};

function num(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

function money(value: number, lang: Lang): string {
  return `${CURRENCY} ${num(value, lang)}`;
}

export function Workspace({ source }: { source: 'screen' | 'extension' }) {
  const { screenId = '' } = useParams();
  const store = useShowcase();
  const lang = store.lang;
  const list = source === 'screen' ? SCREENS : EXTENSIONS;
  const screen = list.find((item) => item.id === screenId);
  const [picked, setPicked] = useState<number | null>(null);
  const packet = useMemo(() => scenarioFor(store.hospital, store.year), [store.hospital, store.year]);
  const prior = useMemo(() => scenarioFor(store.hospital, Math.max(2024, store.year - 1)), [store.hospital, store.year]);
  if (!screen) return <p>{tx(lang, 'This screen is not in the inventory.', 'هذه الشاشة غير موجودة في الفهرس.')}</p>;
  const fact = packet.focus;
  const family = focusFamily(screen.id, store.department);
  const fit = FIT[screen.id] ?? 'ignore';
  const narrowed = fit !== 'any' && fit !== 'ignore' && store.department !== 'All' && store.department !== fit;
  const ignored = (fit === 'ignore' || narrowed) && store.department !== 'All';
  const notice = ignored
    ? tx(
        lang,
        `${deptLabel(store.department, 'en')} does not narrow this workspace. The hospital cohort for this domain stays on screen, instead of an empty chart.`,
        `قسم ${deptLabel(store.department, 'ar')} لا يضيّق هذه الشاشة. يبقى نطاق المستشفى لهذا المجال ظاهراً، بدلاً من رسم فارغ.`,
      )
    : null;
  const siteName = hospitalName(store.hospital, lang);
  const title = lang === 'ar' ? screen.titleAr : screen.title;
  const story = narrative(family, fact, prior.focus, lang, store.year, store.department, store.hospital);
  const labels = CHART_LABELS[lang];
  const months = MONTHS[lang];

  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <p className="sx-kicker">{tx(lang, screen.group, groupAr(screen.group))}</p>
        <h1>{title}</h1>
        <p className="sx-question">{lang === 'ar' ? (QUESTION_AR[screen.id] ?? screen.decision) : screen.decision}</p>
        <p className="sx-scope" data-testid="scope">
          {siteName} · {store.year} · {deptLabel(store.department, lang)} · {tx(lang, CURRENCY_NOTE, 'ر.س (ريال سعودي) — عملة السيناريو الخيالي')}
        </p>
      </header>
      {notice ? <p className="sx-notice" role="status">{notice}</p> : null}
      {family === 'catalog' || family === 'assistant' ? null : (
        <section className="sx-brief">
          <div>
            <h2>{tx(lang, 'What is happening', 'ماذا يحدث')}</h2>
            <p>{story.happening}</p>
          </div>
          <div>
            <h2>{tx(lang, 'Why it matters', 'لماذا يهم')}</h2>
            <p>{story.matters}</p>
          </div>
          <div>
            <h2>{tx(lang, 'Review next', 'المراجعة التالية')}</h2>
            <Link className="sx-btn primary" to={story.next}>{story.nextLabel}</Link>
          </div>
        </section>
      )}
      <section className="sx-stats">
        {story.kpis.map((key) => {
          const kpi = findKpi(key);
          if (!kpi) return null;
          const item = measure(kpi, store.hospital, store.year, store.department);
          const good = movedFavorably(item);
          return (
            <Link key={key} className="sx-stat" to={`/showcase/kpis/${key}`} data-testid={`value-${key}`}>
              <span>{kpi.origin === 'demo_assumption' ? tx(lang, 'Demo assumption', 'افتراض للعرض') : tx(lang, 'Scenario measure', 'مقياس السيناريو')}</span>
              <strong className={lang === 'ar' && kpiName(kpi.name, lang) === kpi.name ? 'sx-ltr' : undefined}>{kpiName(kpi.name, lang)}</strong>
              <em>{formatMeasure(item, lang)}</em>
              <small className={good === false ? 'sx-worse' : good === true ? 'sx-better' : ''}>{formatDelta(item, lang)}</small>
            </Link>
          );
        })}
      </section>
      <section className="sx-charts">
        {renderCharts(family, fact, packet, months, labels, lang, picked, setPicked, store.hospital, store.department)}
      </section>
      {picked !== null && family === 'emergency' ? (
        <p className="sx-drill" role="status">
          {tx(lang, `${months[picked]} arrivals: ${num(packet.months[picked].edArrivals, lang)}. Median wait ${num(packet.months[picked].edWaitMedianMin, lang)} minutes.`, `${months[picked]}: ${num(packet.months[picked].edArrivals, lang)} وصولاً. وسيط الانتظار ${num(packet.months[picked].edWaitMedianMin, lang)} دقيقة.`)}
        </p>
      ) : null}
      <p className="sx-evidence">{story.evidence}</p>
    </article>
  );
}

function hospitalName(code: string, lang: Lang): string {
  const names: Record<string, [string, string]> = {
    H1: ['Demo General North', 'المستشفى التجريبي الشمالي'],
    H2: ['Demo General South', 'المستشفى التجريبي الجنوبي'],
    H3: ['Demo General East', 'المستشفى التجريبي الشرقي'],
    H4: ['Demo General West', 'المستشفى التجريبي الغربي'],
    H5: ['Demo General Central', 'المستشفى التجريبي المركزي'],
    ALL: ['All five hospitals', 'المستشفيات الخمسة'],
  };
  const pair = names[code] ?? [code, code];
  return lang === 'ar' ? pair[1] : pair[0];
}

function groupAr(group: string): string {
  const map: Record<string, string> = {
    Executive: 'القيادة',
    Flow: 'التدفق',
    Clinical: 'السريري',
    Patient: 'المريض',
    Finance: 'المالية',
    Trust: 'الثقة',
    AI: 'الذكاء الاصطناعي',
    Extension: 'توسعة',
  };
  return map[group] ?? group;
}

function focusFamily(screenId: string, department: string): string {
  const base = FAMILY[screenId] ?? 'command';
  if (!['command', 'hub', 'risk', 'actions'].includes(screenId) || department === 'All') return base;
  const mapped: Record<string, string> = {
    Emergency: 'emergency',
    Inpatient: 'inpatient',
    Laboratory: 'laboratory',
    Surgery: 'surgery',
    Pharmacy: 'pharmacy',
    Revenue: 'rcm',
    Experience: 'experience',
  };
  return mapped[department] ?? base;
}

function narrative(family: string, fact: AnnualFact, prior: AnnualFact, lang: Lang, year: number, department: string, hospital: string) {
  const shown = (key: string) => {
    const kpi = findKpi(key);
    return kpi ? formatMeasure(measure(kpi, hospital, year, department), lang) : '';
  };
  const occ = fact.occupiedBeds / fact.staffedBeds;
  const denial = fact.claimsDenied / fact.claimsSubmitted;
  const waitDelta = fact.edWaitMedianMin - prior.edWaitMedianMin;
  const common = {
    kpis: ['kpi_bed_occupancy_rate', 'kpi_ed_avg_los_hours', 'kpi_claim_denied_rate', 'demo_satisfaction_index'] as string[],
    next: '/showcase/screens/emergency',
    nextLabel: tx(lang, 'Open emergency', 'افتح الطوارئ'),
    happening: '',
    matters: '',
    evidence: tx(
      lang,
      'Evidence is the fictional scenario for the selected hospital and year. Causes below are hypotheses. Predictions on a KPI page are simulated.',
      'الدليل هو السيناريو الخيالي للمستشفى والسنة المحددين. الأسباب فرضيات. التنبؤ في صفحة المؤشر محاكاة.',
    ),
  };
  if (family === 'emergency') {
    return {
      ...common,
      kpis: ['kpi_ed_door_to_provider_median_minutes', 'kpi_ed_avg_los_hours', 'kpi_ed_los_median_minutes', 'kpi_ed_to_admission_rate'],
      next: '/showcase/kpis/kpi_ed_door_to_provider_median_minutes',
      nextLabel: tx(lang, 'Open the wait lifecycle', 'افتح دورة الانتظار'),
      happening: tx(
        lang,
        `Median door-to-provider wait is ${shown('kpi_ed_door_to_provider_median_minutes')}. P90 is ${shown('kpi_ed_door_to_provider_p90_minutes')}. ${year === 2024 ? '2024 is the baseline year.' : Math.abs(waitDelta) < 0.5 ? `That median is unchanged versus ${year - 1}.` : `That median is ${waitDelta >= 0 ? 'up' : 'down'} ${Math.abs(waitDelta).toFixed(0)} minutes versus ${year - 1}.`}`,
        `وسيط الانتظار حتى الطبيب ${shown('kpi_ed_door_to_provider_median_minutes')}، والمئين 90 هو ${shown('kpi_ed_door_to_provider_p90_minutes')}. ${year === 2024 ? 'عام 2024 هو خط الأساس.' : Math.abs(waitDelta) < 0.5 ? `الوسيط لم يتغير مقارنة بـ ${year - 1}.` : `تغير الوسيط بمقدار ${waitDelta.toFixed(0)} دقيقة مقارنة بـ ${year - 1}.`}`,
      ),
      matters: tx(
        lang,
        `${num(fact.edArrivals, lang)} arrivals. ${num(fact.edAdmitted, lang)} were admitted and are included in inpatient admissions. Boarding pressure follows occupancy at ${num(occ * 100, lang, 1)}%.`,
        `${num(fact.edArrivals, lang)} وصولاً. نُوّم ${num(fact.edAdmitted, lang)} وهم داخل تنويم المستشفى. ضغط الانتظار على السرير يتبع إشغالاً قدره ${num(occ * 100, lang, 1)}٪.`,
      ),
    };
  }
  if (family === 'beds') {
    return {
      ...common,
      kpis: ['kpi_bed_occupancy_rate', 'kpi_bed_available_rate_status', 'kpi_bed_icu_occupancy_rate', 'kpi_department_count'],
      next: '/showcase/screens/inpatient',
      nextLabel: tx(lang, 'Open inpatient flow', 'افتح التنويم'),
      happening: tx(
        lang,
        `${num(fact.occupiedBeds, lang)} of ${num(fact.staffedBeds, lang)} staffed beds are occupied in the average month-end snapshot. Available ${num(fact.availableBeds, lang)}, blocked ${num(fact.blockedBeds, lang)}. These three parts equal staffed beds.`,
        `${num(fact.occupiedBeds, lang)} من ${num(fact.staffedBeds, lang)} سريراً مجهزاً مشغولة في متوسط لقطة نهاية الشهر. المتاح ${num(fact.availableBeds, lang)} والمغلق ${num(fact.blockedBeds, lang)}. هذه الأجزاء تساوي الأسرة المجهزة.`,
      ),
      matters: tx(lang, `ICU occupancy is ${num((fact.icuOccupied / fact.icuStaffed) * 100, lang, 1)}%. Ward count is ${fact.wardCount}, a snapshot of service lines rather than a volume.`, `إشغال العناية ${num((fact.icuOccupied / fact.icuStaffed) * 100, lang, 1)}٪. عدد الأجنحة ${fact.wardCount}، وهو لقطة للخدمات لا حجم أحداث.`),
    };
  }
  if (family === 'inpatient' || family === 'transfer' || family === 'vitals') {
    return {
      ...common,
      kpis: ['kpi_inpatient_avg_los_days', 'kpi_inpatient_avg_los_hours', 'kpi_inpatient_p90_los_days', 'kpi_discharge_per_admission_rate'],
      next: '/showcase/screens/beds',
      nextLabel: tx(lang, 'Open beds', 'افتح الأسرة'),
      happening: tx(
        lang,
        `Average stay ${shown('kpi_inpatient_avg_los_days')} (${shown('kpi_inpatient_avg_los_hours')}). Median stay ${shown('kpi_inpatient_median_los_days')}. P90 ${shown('kpi_inpatient_p90_los_days')}. Admissions ${num(fact.admissions, lang)}, discharges ${num(fact.discharges, lang)}, transfers in ${num(fact.transfersIn, lang)}, transfers out ${num(fact.transfersOut, lang)}, deaths ${num(fact.deaths, lang)}.`,
        `متوسط البقاء ${shown('kpi_inpatient_avg_los_days')} (${shown('kpi_inpatient_avg_los_hours')}). الوسيط ${shown('kpi_inpatient_median_los_days')}. المئين 90 هو ${shown('kpi_inpatient_p90_los_days')}. التنويم ${num(fact.admissions, lang)} والخروج ${num(fact.discharges, lang)} والتحويل الداخل ${num(fact.transfersIn, lang)} والتحويل الخارج ${num(fact.transfersOut, lang)} والوفيات ${num(fact.deaths, lang)}.`,
      ),
      matters: family === 'vitals'
        ? tx(lang, 'Individual vital-sign values are not modeled. The admission cohort is the assessment opportunity.', 'قيم العلامات الحيوية الفردية غير مبنية في السيناريو. فوج التنويم هو فرصة التقييم.')
        : tx(lang, 'Census change is zero because admissions + transfers in − discharges − transfers out − deaths = 0. That identity is the review, not a second occupancy chart.', 'تغير التعداد صفر لأن التنويم + التحويل الداخل − الخروج − التحويل الخارج − الوفيات = 0. هذه المطابقة هي المراجعة.'),
    };
  }
  if (family === 'appointments') {
    return {
      ...common,
      kpis: ['kpi_appointment_no_show_rate', 'kpi_appointment_cancellation_rate', 'kpi_outpatient_median_wait_minutes', 'kpi_outpatient_p90_wait_minutes'],
      next: '/showcase/screens/experience',
      nextLabel: tx(lang, 'Open patient experience', 'افتح تجربة المريض'),
      happening: tx(
        lang,
        `Demand ${num(fact.apptDemand, lang)} against ${num(fact.apptSlots, lang)} slots. Booked ${num(fact.apptBooked, lang)} splits into attended ${num(fact.apptAttended, lang)}, cancelled ${num(fact.apptCancelled, lang)}, and no-shows ${num(fact.apptNoShow, lang)}.`,
        `الطلب ${num(fact.apptDemand, lang)} مقابل ${num(fact.apptSlots, lang)} موعداً متاحاً. المحجوز ${num(fact.apptBooked, lang)} ينقسم إلى حضور ${num(fact.apptAttended, lang)} وإلغاء ${num(fact.apptCancelled, lang)} وغياب ${num(fact.apptNoShow, lang)}.`,
      ),
      matters: tx(lang, `Median clinic wait ${fact.opWaitMedianMin.toFixed(0)} minutes, P90 ${fact.opWaitP90Min.toFixed(0)} minutes.`, `وسيط انتظار العيادة ${fact.opWaitMedianMin.toFixed(0)} دقيقة، والمئين 90 ${fact.opWaitP90Min.toFixed(0)} دقيقة.`),
    };
  }
  if (family === 'surgery') {
    return {
      ...common,
      kpis: ['kpi_surgery_cancellation_rate', 'kpi_surgery_cancellation_volume', 'kpi_surg_cancellation_rate', 'kpi_inpatient_avg_los_days'],
      next: '/showcase/screens/beds',
      nextLabel: tx(lang, 'See the bed effect', 'انظر أثر الأسرة'),
      happening: tx(lang, `Requested ${num(fact.surgRequests, lang)}. Completed ${num(fact.surgCompleted, lang)} and cancelled ${num(fact.surgCancelled, lang)} add back to requested.`, `المطلوب ${num(fact.surgRequests, lang)}. المنجز ${num(fact.surgCompleted, lang)} والملغى ${num(fact.surgCancelled, lang)} يعودان إلى المطلوب.`),
      matters: tx(lang, 'Cancellation is the operational review. A same-day cancel still consumes a preparation slot in this story.', 'الإلغاء هو المراجعة التشغيلية. الإلغاء في اليوم نفسه يستهلك خانة تجهيز في هذه القصة.'),
    };
  }
  if (family === 'laboratory') {
    return {
      ...common,
      kpis: ['kpi_lab_tat_median_minutes', 'kpi_lab_tat_p90_minutes', 'kpi_lab_cancellation_rate', 'kpi_lab_orders_per_encounter'],
      next: '/showcase/screens/radiology',
      nextLabel: tx(lang, 'Open imaging', 'افتح الأشعة'),
      happening: tx(lang, `Orders ${num(fact.labOrders, lang)} = resulted ${num(fact.labResulted, lang)} + cancelled ${num(fact.labCancelled, lang)} + delayed ${num(fact.labDelayed, lang)}. Median TAT ${fact.labTatMedianMin.toFixed(0)} minutes, P90 ${fact.labTatP90Min.toFixed(0)}.`, `الطلبات ${num(fact.labOrders, lang)} = نتائج ${num(fact.labResulted, lang)} + إلغاء ${num(fact.labCancelled, lang)} + تأخير ${num(fact.labDelayed, lang)}. وسيط زمن الإنجاز ${fact.labTatMedianMin.toFixed(0)} دقيقة والمئين 90 ${fact.labTatP90Min.toFixed(0)}.`),
      matters: tx(lang, 'Orders per encounter is a multiplier, not a percent.', 'الطلبات لكل زيارة مضاعف، وليست نسبة مئوية.'),
    };
  }
  if (family === 'radiology') {
    return {
      ...common,
      kpis: ['kpi_radiology_avg_tat_hours', 'kpi_rad_median_report_tat_minutes', 'kpi_rad_p90_report_tat_minutes', 'kpi_rad_no_show_rate'],
      next: '/showcase/screens/laboratory',
      nextLabel: tx(lang, 'Open laboratory', 'افتح المختبر'),
      happening: tx(lang, `Imaging orders ${num(fact.radOrders, lang)} split across X-ray, CT, ultrasound, and MRI. Median report time ${(fact.radTatMedianMin / 60).toFixed(1)} hours.`, `طلبات التصوير ${num(fact.radOrders, lang)} تتوزع على الأشعة العادية والمقطعية والموجات والرنين. وسيط التقرير ${(fact.radTatMedianMin / 60).toFixed(1)} ساعة.`),
      matters: tx(lang, 'The modality shares sum to 100% of orders. They are not four unrelated volumes.', 'حصص الأجهزة مجموعها 100٪ من الطلبات. ليست أربعة أحجام منفصلة.'),
    };
  }
  if (family === 'pharmacy') {
    return {
      ...common,
      kpis: ['kpi_med_order_cancelled_rate', 'demo_satisfaction_index', 'kpi_inpatient_avg_los_days', 'kpi_claim_denied_rate'],
      next: '/showcase/screens/experience',
      nextLabel: tx(lang, 'Open experience', 'افتح التجربة'),
      happening: tx(lang, `Medication orders ${num(fact.pharmOrders, lang)}. Dispensed ${num(fact.pharmDispensed, lang)}. Administered ${num(fact.pharmAdmin, lang)}. Administered does not exceed dispensed, and dispensed does not exceed orders.`, `أوامر الدواء ${num(fact.pharmOrders, lang)}. صُرف ${num(fact.pharmDispensed, lang)}. أُعطي ${num(fact.pharmAdmin, lang)}. المعطى لا يتجاوز المصروف، والمصروف لا يتجاوز الأوامر.`),
      matters: tx(lang, 'Stock positions are not in the source pack. This view stops at workload.', 'أرصدة المخزون غير موجودة في حزمة المصدر. هذا العرض يتوقف عند عبء العمل.'),
    };
  }
  if (family === 'rcm' || family === 'claims' || family === 'preauth' || family === 'eligibility') {
    return {
      ...common,
      kpis: ['kpi_claim_denied_rate', 'kpi_revenue_collection_rate', 'kpi_rcm_allowed_amount', 'kpi_authorization_denied_rate'],
      next: '/showcase/kpis/kpi_claim_denied_rate',
      nextLabel: tx(lang, 'Open the denial lifecycle', 'افتح دورة الرفض'),
      happening: tx(lang, `Billed ${money(fact.billed, lang)}. Contractual adjustment ${money(fact.adjustment, lang)}. Allowed ${money(fact.allowed, lang)}. Write-off ${money(fact.writeoff, lang)}. Collected ${money(fact.payerPaid + fact.patientPaid, lang)}. Outstanding ${money(fact.outstanding, lang)}.`, `الفوترة ${money(fact.billed, lang)}. التسوية التعاقدية ${money(fact.adjustment, lang)}. المسموح ${money(fact.allowed, lang)}. الشطب ${money(fact.writeoff, lang)}. المحصل ${money(fact.payerPaid + fact.patientPaid, lang)}. القائم ${money(fact.outstanding, lang)}.`),
      matters: tx(lang, `Denial rate ${(denial * 100).toFixed(1)}% is denied claims ÷ submitted claims. Currency is ${CURRENCY_NOTE}.`, `معدل الرفض ${(denial * 100).toFixed(1)}٪ هو المطالبات المرفوضة ÷ المقدمة. العملة: ر.س (ريال سعودي) — عملة السيناريو الخيالي.`),
    };
  }
  if (family === 'workforce') {
    const share = WORKFORCE_SHARES[department] ?? 1;
    const required = fact.requiredFte * share;
    const filled = fact.filledFte * share;
    const vacancy = (required - filled) / required;
    return {
      ...common,
      kpis: ['kpi_bed_occupancy_rate', 'kpi_ed_avg_los_hours', 'demo_satisfaction_index', 'kpi_department_count'],
      next: '/showcase/screens/emergency',
      nextLabel: tx(lang, 'See the emergency effect', 'انظر أثر الطوارئ'),
      happening: tx(lang, `Required ${required.toFixed(1)} FTE, filled ${filled.toFixed(1)} FTE${share === 1 ? '' : ` for ${department}`}. Vacancy ${(vacancy * 100).toFixed(1)}%. Overtime ${num(fact.overtimeHours * share, lang)} hours is a flow; the FTE figures are a snapshot.`, `المطلوب ${required.toFixed(1)} مكافئ، والمشغول ${filled.toFixed(1)}${share === 1 ? '' : ` لقسم ${deptLabel(department, 'ar')}`}. الشغور ${(vacancy * 100).toFixed(1)}٪. العمل الإضافي ${num(fact.overtimeHours * share, lang)} ساعة وهو تدفق؛ أرقام المكافئ لقطة.`),
      matters: tx(lang, 'Choosing a department scales the staffing snapshot by that department’s share. Rates stay on the same ratio.', 'اختيار قسم يقيس لقطة التوظيف بحصة ذلك القسم. المعدلات تبقى على النسبة نفسها.'),
    };
  }
  if (family === 'experience') {
    return {
      ...common,
      kpis: ['demo_satisfaction_index', 'demo_survey_response_rate', 'demo_complaint_open_count', 'demo_service_recovery_closure_rate'],
      next: '/showcase/experience',
      nextLabel: tx(lang, 'Open case workflow', 'افتح سير الحالات'),
      happening: tx(lang, `Satisfaction index ${fact.satisfaction.toFixed(1)} / 100 from ${num(fact.surveysReturned, lang)} responses of ${num(fact.surveysSent, lang)} sent. Opened complaints ${num(fact.complaintsOpened, lang)}, closed ${num(fact.complaintsClosed, lang)}.`, `مؤشر الرضا ${fact.satisfaction.toFixed(1)} / 100 من ${num(fact.surveysReturned, lang)} رداً من أصل ${num(fact.surveysSent, lang)}. الشكاوى المفتوحة ${num(fact.complaintsOpened, lang)} والمغلقة ${num(fact.complaintsClosed, lang)}.`),
      matters: tx(lang, 'These survey fields are labelled demo assumptions. They are not NMR columns.', 'حقول الاستبيان هذه افتراضات للعرض. ليست أعمدة من دليل المصدر.'),
    };
  }
  if (family === 'infection' || family === 'safety') {
    return {
      ...common,
      kpis: ['demo_hai_surveillance_rate', 'kpi_mortality_event_volume', 'demo_complaint_open_count', 'kpi_bed_occupancy_rate'],
      next: '/showcase/kpis/kpi_mortality_event_volume',
      nextLabel: tx(lang, 'Open the cohort review', 'افتح مراجعة الفوج'),
      happening: tx(lang, `Surveillance events ${num(fact.haiEvents, lang)} against ${num(fact.admissions, lang)} admissions. Outbreak declarations are 0 events. That zero is a real zero in the story.`, `أحداث الترصد ${num(fact.haiEvents, lang)} مقابل ${num(fact.admissions, lang)} تنويماً. إعلانات التفشي 0 أحداث. هذا الصفر صفر حقيقي في القصة.`),
      matters: tx(lang, 'Infection columns are not in the source pack. The signal is labelled as an assumption. Mortality stays a cohort review.', 'أعمدة العدوى غير موجودة في حزمة المصدر. الإشارة مُعلَّمة كافتراض. الوفيات تبقى مراجعة فوج.'),
    };
  }
  if (family === 'equipment' || family === 'supply') {
    return {
      ...common,
      kpis: ['demo_equipment_uptime', 'kpi_department_count', 'kpi_bed_occupancy_rate', 'demo_dialysis_session_volume'],
      next: '/showcase/screens/surgery',
      nextLabel: tx(lang, 'Open theatres', 'افتح غرف العمليات'),
      happening: tx(lang, `Equipment uptime ${(fact.equipmentUptime * 100).toFixed(1)}%. Downtime events are modeled by month. Supply quantities are not in the source pack, so this screen does not invent a stock ledger.`, `جاهزية المعدات ${(fact.equipmentUptime * 100).toFixed(1)}٪. أحداث التوقف مبنية شهرياً. كميات الإمداد غير موجودة في المصدر، لذلك لا تُختلق حركة مخزون.`),
      matters: tx(lang, 'Uptime is a labelled demo assumption.', 'الجاهزية افتراض للعرض.'),
    };
  }
  if (family === 'dialysis' || family === 'morgue' || family === 'births') {
    return {
      ...common,
      kpis: family === 'dialysis' ? ['demo_dialysis_session_volume', 'kpi_bed_occupancy_rate', 'kpi_department_count', 'demo_equipment_uptime'] : family === 'morgue' ? ['demo_morgue_release_hours', 'kpi_mortality_event_volume', 'kpi_inpatient_avg_los_days', 'kpi_bed_occupancy_rate'] : ['demo_birth_encounter_volume', 'kpi_bed_occupancy_rate', 'demo_satisfaction_index', 'kpi_department_count'],
      next: '/showcase/screens/command',
      nextLabel: tx(lang, 'Return to command', 'عد إلى القيادة'),
      happening: tx(lang, 'The figure on this screen is a labelled demo assumption. The source pack names the service and does not list the columns.', 'الرقم في هذه الشاشة افتراض للعرض. حزمة المصدر تسمي الخدمة ولا تسرد الأعمدة.'),
      matters: tx(lang, 'No individual clinical prediction is offered here.', 'لا يُعرض تنبؤ سريري فردي هنا.'),
    };
  }
  if (family === 'registry' || family === 'diagnoses') {
    return {
      ...common,
      kpis: ['kpi_patient_active_count', 'kpi_patient_encounters_per_patient', 'kpi_admission_per_encounter_rate', 'kpi_dx_avg_diagnoses_per_encounter'],
      next: '/showcase/screens/journey',
      nextLabel: tx(lang, 'Open the journey', 'افتح الرحلة'),
      happening: tx(lang, `${num(fact.activePatients, lang)} distinct people in the year. They are not added up across months. Encounters per patient is ${(fact.encounters / fact.activePatients).toFixed(2)}×.`, `${num(fact.activePatients, lang)} شخصاً مميزاً خلال السنة. لا يُجمعون عبر الأشهر. الزيارات لكل مريض ${(fact.encounters / fact.activePatients).toFixed(2)}×.`),
      matters: tx(lang, 'Diagnoses per encounter is a multiplier (2.35× in this story), not a percentage.', 'التشخيصات لكل زيارة مضاعف (2.35× في هذه القصة)، وليست نسبة مئوية.'),
    };
  }
  if (family === 'mortality') {
    return {
      ...common,
      kpis: ['kpi_mortality_event_volume', 'kpi_ed_mortality_rate', 'kpi_inpatient_avg_los_days', 'kpi_bed_occupancy_rate'],
      next: '/showcase/kpis/kpi_mortality_event_volume',
      nextLabel: tx(lang, 'Open the cohort review', 'افتح مراجعة الفوج'),
      happening: tx(lang, `${num(fact.deaths, lang)} inpatient deaths. ED mortality is ED deaths ÷ ED arrivals (${shown('kpi_ed_mortality_rate')}). In-hospital mortality is deaths ÷ discharges (${shown('kpi_dx_in_hospital_mortality_rate')}).`, `${num(fact.deaths, lang)} وفاة تنويم. وفيات الطوارئ هي وفيات الطوارئ ÷ وصول الطوارئ (${shown('kpi_ed_mortality_rate')}). الوفيات داخل المستشفى هي الوفيات ÷ الخروج (${shown('kpi_dx_in_hospital_mortality_rate')}).`),
      matters: tx(lang, 'The prediction stage will not invent an individual patient risk.', 'مرحلة التنبؤ لن تختلق خطراً لمريض فرد.'),
    };
  }
  return {
    ...common,
    happening: tx(
      lang,
      `Priority: occupancy ${shown('kpi_bed_occupancy_rate')}. Door-to-provider median ${shown('kpi_ed_door_to_provider_median_minutes')}. Denial ${shown('kpi_claim_denied_rate')}. Satisfaction ${shown('demo_satisfaction_index')}. Outstanding ${shown('kpi_rcm_outstanding_ar')}.`,
      `الأولوية: الإشغال ${shown('kpi_bed_occupancy_rate')}. وسيط الانتظار حتى الطبيب ${shown('kpi_ed_door_to_provider_median_minutes')}. الرفض ${shown('kpi_claim_denied_rate')}. الرضا ${shown('demo_satisfaction_index')}. القائم ${shown('kpi_rcm_outstanding_ar')}.`,
    ),
    matters: tx(lang, 'The network comparison uses the same facts as the hospital pages. Nothing on this page is a live hospital feed.', 'مقارنة الشبكة تستخدم الحقائق نفسها في صفحات المستشفى. لا يوجد في هذه الصفحة بث من مستشفى حي.'),
  };
}

function renderCharts(
  family: string,
  fact: AnnualFact,
  packet: ReturnType<typeof scenarioFor>,
  months: string[],
  labels: { empty: string; invalid: string; zero: string },
  lang: Lang,
  picked: number | null,
  setPicked: (index: number) => void,
  hospital: string,
  department: string,
) {
  const occ = (site: AnnualFact) => site.occupiedBeds / site.staffedBeds;
  if (family === 'emergency') {
    return (
      <>
        <BarChart
          title={tx(lang, 'Emergency arrivals by month', 'وصول الطوارئ حسب الشهر')}
          caption={tx(lang, picked === null ? 'Select a month to read arrivals and wait together.' : 'Month selected.', 'اختر شهراً لقراءة الوصول والانتظار معاً.')}
          points={packet.months.map((month, index) => ({ label: months[index], value: month.edArrivals }))}
          unit="count"
          labels={labels}
          onPick={setPicked}
        />
        <GroupedChart
          title={tx(lang, 'Wait: median and P90', 'الانتظار: الوسيط والمئين 90')}
          caption={tx(lang, 'Minutes. P90 stays above the median in every month.', 'بالدقائق. المئين 90 يبقى أعلى من الوسيط في كل شهر.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.edWaitMedianMin)}
          second={packet.months.map((month) => month.edWaitP90Min)}
          firstName={tx(lang, 'Median', 'الوسيط')}
          secondName={tx(lang, 'P90', 'المئين 90')}
        />
        <StackChart
          title={tx(lang, 'Acuity mix', 'مزيج الحدة')}
          caption={tx(lang, 'Shares of arrivals. The five levels sum to 100%.', 'حصص الوصول. المستويات الخمسة مجموعها 100٪.')}
          labels={labels}
          parts={[1, 2, 3, 4, 5].map((level) => ({ name: tx(lang, `Level ${level}`, `المستوى ${level}`), value: fact[`acuity${level}` as 'acuity1'] }))}
        />
      </>
    );
  }
  if (family === 'beds') {
    const wards = wardRows(fact);
    return (
      <>
        <StackChart
          title={tx(lang, 'Staffed bed composition', 'تكوين الأسرة المجهزة')}
          caption={tx(lang, 'Occupied + available + blocked = staffed. Snapshot average, not a sum of days.', 'المشغول + المتاح + المغلق = المجهز. متوسط لقطة، وليس جمع أيام.')}
          labels={labels}
          parts={[
            { name: tx(lang, 'Occupied', 'مشغول'), value: fact.occupiedBeds },
            { name: tx(lang, 'Available', 'متاح'), value: fact.availableBeds },
            { name: tx(lang, 'Blocked', 'مغلق'), value: fact.blockedBeds },
          ]}
        />
        <Ledger
          title={tx(lang, 'Ward snapshot', 'لقطة الأجنحة')}
          caption={tx(lang, 'Ward rows sum to the hospital snapshot.', 'صفوف الأجنحة تجمع إلى لقطة المستشفى.')}
          rows={wards.map((ward) => ({
            label: tx(lang, ward.id, wardAr(ward.id)),
            display: `${ward.occupied} / ${ward.staffed}`,
            hint: tx(lang, `${ward.available} available · ${ward.blocked} blocked`, `${ward.available} متاح · ${ward.blocked} مغلق`),
          }))}
        />
        <CompareChart
          title={tx(lang, 'Occupancy across the five hospitals', 'الإشغال في المستشفيات الخمسة')}
          caption={tx(lang, 'Each bar is occupied ÷ staffed for that hospital.', 'كل شريط هو المشغول ÷ المجهز لذلك المستشفى.')}
          labels={labels}
          rows={packet.sites.map((site) => ({ label: hospitalName(site.code, lang), value: occ(site.annual), display: `${(occ(site.annual) * 100).toFixed(1)}%` }))}
        />
      </>
    );
  }
  if (family === 'inpatient' || family === 'transfer' || family === 'vitals' || family === 'mortality') {
    return (
      <>
        <GroupedChart
          title={tx(lang, 'Length of stay by month', 'مدة البقاء حسب الشهر')}
          caption={tx(lang, 'Days. Median and P90.', 'بالأيام. الوسيط والمئين 90.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.ipLosDays)}
          second={packet.months.map((month) => month.ipLosP90Days)}
          firstName={tx(lang, 'Median days', 'وسيط الأيام')}
          secondName={tx(lang, 'P90 days', 'المئين 90')}
        />
        <Ledger
          title={tx(lang, 'Census identity', 'مطابقة التعداد')}
          caption={tx(lang, 'Admissions + transfers in − discharges − transfers out − deaths = 0.', 'التنويم + تحويل داخل − خروج − تحويل خارج − وفيات = 0.')}
          rows={[
            [tx(lang, 'Admissions', 'التنويم'), fact.admissions],
            [tx(lang, 'Transfers in', 'تحويل داخل'), fact.transfersIn],
            [tx(lang, 'Discharges', 'الخروج'), fact.discharges],
            [tx(lang, 'Transfers out', 'تحويل خارج'), fact.transfersOut],
            [tx(lang, 'Deaths', 'الوفيات'), fact.deaths],
          ].map(([label, value]) => ({ label: String(label), display: num(Number(value), lang), hint: tx(lang, 'Event flow', 'تدفق أحداث') }))}
        />
      </>
    );
  }
  if (family === 'appointments') {
    return (
      <>
        <GroupedChart
          title={tx(lang, 'Demand and slots', 'الطلب والمواعيد المتاحة')}
          caption={tx(lang, 'Booked never exceeds slots.', 'المحجوز لا يتجاوز المتاح.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.apptDemand)}
          second={packet.months.map((month) => month.apptSlots)}
          firstName={tx(lang, 'Demand', 'الطلب')}
          secondName={tx(lang, 'Slots', 'المتاح')}
        />
        <StackChart
          title={tx(lang, 'What happened to booked visits', 'ماذا حدث للزيارات المحجوزة')}
          caption={tx(lang, 'Attended + cancelled + no-show = booked.', 'الحضور + الإلغاء + الغياب = المحجوز.')}
          labels={labels}
          parts={[
            { name: tx(lang, 'Attended', 'حضر'), value: fact.apptAttended },
            { name: tx(lang, 'Cancelled', 'أُلغي'), value: fact.apptCancelled },
            { name: tx(lang, 'No-show', 'لم يحضر'), value: fact.apptNoShow },
          ]}
        />
      </>
    );
  }
  if (family === 'surgery') {
    return (
      <StackChart
        title={tx(lang, 'Theatre requests', 'طلبات العمليات')}
        caption={tx(lang, 'Completed + cancelled = requested.', 'المنجز + الملغى = المطلوب.')}
        labels={labels}
        parts={[
          { name: tx(lang, 'Completed', 'منجز'), value: fact.surgCompleted },
          { name: tx(lang, 'Cancelled', 'ملغى'), value: fact.surgCancelled },
        ]}
      />
    );
  }
  if (family === 'laboratory') {
    return (
      <>
        <StackChart
          title={tx(lang, 'Laboratory order outcome', 'مآل طلبات المختبر')}
          caption={tx(lang, 'Resulted + cancelled + delayed = orders.', 'النتيجة + الإلغاء + التأخير = الطلبات.')}
          labels={labels}
          parts={[
            { name: tx(lang, 'Resulted', 'نتيجة'), value: fact.labResulted },
            { name: tx(lang, 'Delayed', 'متأخر'), value: fact.labDelayed },
            { name: tx(lang, 'Cancelled', 'ملغى'), value: fact.labCancelled },
          ]}
        />
        <GroupedChart
          title={tx(lang, 'Turnaround', 'زمن الإنجاز')}
          caption={tx(lang, 'Minutes. P90 is above the median.', 'بالدقائق. المئين 90 أعلى من الوسيط.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.labTatMedianMin)}
          second={packet.months.map((month) => month.labTatP90Min)}
          firstName={tx(lang, 'Median', 'الوسيط')}
          secondName={tx(lang, 'P90', 'المئين 90')}
        />
      </>
    );
  }
  if (family === 'radiology') {
    return (
      <>
        <StackChart
          title={tx(lang, 'Modality mix', 'مزيج الأجهزة')}
          caption={tx(lang, 'Shares of imaging orders.', 'حصص طلبات التصوير.')}
          labels={labels}
          parts={[
            { name: tx(lang, 'X-ray', 'أشعة عادية'), value: fact.radXr },
            { name: tx(lang, 'CT', 'مقطعي'), value: fact.radCt },
            { name: tx(lang, 'Ultrasound', 'موجات'), value: fact.radUs },
            { name: tx(lang, 'MRI', 'رنين'), value: fact.radMr },
          ]}
        />
        <GroupedChart
          title={tx(lang, 'Report time', 'زمن التقرير')}
          caption={tx(lang, 'Minutes.', 'بالدقائق.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.radTatMedianMin)}
          second={packet.months.map((month) => month.radTatP90Min)}
          firstName={tx(lang, 'Median', 'الوسيط')}
          secondName={tx(lang, 'P90', 'المئين 90')}
        />
      </>
    );
  }
  if (family === 'pharmacy' || family === 'supply') {
    return (
      <Ledger
        title={tx(lang, 'Medication workload', 'عبء الدواء')}
        caption={tx(lang, 'Each row is contained by the row above it.', 'كل صف محتوى في الصف الذي فوقه.')}
        rows={[
          { label: tx(lang, 'Orders', 'أوامر'), display: num(fact.pharmOrders, lang), hint: tx(lang, 'Cohort', 'الفوج') },
          { label: tx(lang, 'Dispensed', 'مصروف'), display: num(fact.pharmDispensed, lang), hint: tx(lang, 'Subset of orders', 'جزء من الأوامر') },
          { label: tx(lang, 'Administered', 'مُعطى'), display: num(fact.pharmAdmin, lang), hint: tx(lang, 'Subset of dispensed', 'جزء من المصروف') },
        ]}
      />
    );
  }
  if (family === 'rcm' || family === 'claims' || family === 'preauth' || family === 'eligibility') {
    return (
      <>
        <Ledger
          title={tx(lang, 'Billed to outstanding', 'من الفوترة إلى القائم')}
          caption={CURRENCY_NOTE}
          rows={[
            { label: tx(lang, 'Billed', 'مفوتر'), display: money(fact.billed, lang), hint: tx(lang, 'Gross', 'إجمالي') },
            { label: tx(lang, 'Adjustment', 'تسوية'), display: money(fact.adjustment, lang), hint: tx(lang, 'Leaves allowed', 'ينتج المسموح') },
            { label: tx(lang, 'Allowed', 'مسموح'), display: money(fact.allowed, lang), hint: tx(lang, 'Billed − adjustment', 'المفوتر − التسوية') },
            { label: tx(lang, 'Write-off', 'شطب'), display: money(fact.writeoff, lang), hint: tx(lang, 'Denied amount', 'مبلغ الرفض') },
            { label: tx(lang, 'Payer paid', 'دفع الجهة'), display: money(fact.payerPaid, lang), hint: tx(lang, 'Collection', 'تحصيل') },
            { label: tx(lang, 'Patient paid', 'دفع المريض'), display: money(fact.patientPaid, lang), hint: tx(lang, 'Collection', 'تحصيل') },
            { label: tx(lang, 'Outstanding', 'قائم'), display: money(fact.outstanding, lang), hint: tx(lang, 'Remainder of allowed', 'باقي المسموح') },
          ]}
        />
        <StackChart
          title={tx(lang, 'Claim status', 'حالة المطالبات')}
          caption={tx(lang, 'Paid + denied + pending = submitted.', 'المدفوع + المرفوض + المعلق = المقدم.')}
          labels={labels}
          parts={[
            { name: tx(lang, 'Paid', 'مدفوع'), value: fact.claimsPaid },
            { name: tx(lang, 'Denied', 'مرفوض'), value: fact.claimsDenied },
            { name: tx(lang, 'Pending', 'معلق'), value: fact.claimsPending },
          ]}
        />
      </>
    );
  }
  if (family === 'workforce') {
    const share = WORKFORCE_SHARES[department] ?? 1;
    const skills = skillMix(fact.filledFte * share);
    return (
      <>
        <CompareChart
          title={tx(lang, 'Filled against required', 'المشغول مقابل المطلوب')}
          caption={tx(lang, 'FTE snapshot. Not summed across days.', 'لقطة مكافئ. لا تُجمع عبر الأيام.')}
          labels={labels}
          rows={[
            { label: tx(lang, 'Required', 'مطلوب'), value: fact.requiredFte * share, display: `${(fact.requiredFte * share).toFixed(1)} FTE` },
            { label: tx(lang, 'Filled', 'مشغول'), value: fact.filledFte * share, display: `${(fact.filledFte * share).toFixed(1)} FTE` },
          ]}
        />
        <StackChart
          title={tx(lang, 'Skill mix of filled posts', 'مزيج المهارات للوظائف المشغولة')}
          caption={tx(lang, 'Shares sum to 100% of filled headcount.', 'الحصص مجموعها 100٪ من العدد المشغول.')}
          labels={labels}
          parts={skills.map((skill) => ({ name: tx(lang, skill.id, skillAr(skill.id)), value: skill.fte }))}
        />
      </>
    );
  }
  if (family === 'experience') {
    return (
      <>
        <BarChart
          title={tx(lang, 'Satisfaction index by month', 'مؤشر الرضا حسب الشهر')}
          caption={tx(lang, 'Index from 0 to 100, not a percentage of complaints.', 'مؤشر من 0 إلى 100، وليس نسبة من الشكاوى.')}
          points={packet.months.map((month, index) => ({ label: months[index], value: month.satisfaction }))}
          unit="count"
          labels={labels}
        />
        <GroupedChart
          title={tx(lang, 'Complaints opened and closed', 'الشكاوى المفتوحة والمغلقة')}
          caption={tx(lang, 'Closed does not exceed opened.', 'المغلق لا يتجاوز المفتوح.')}
          labels={labels}
          categories={months}
          first={packet.months.map((month) => month.complaintsOpened)}
          second={packet.months.map((month) => month.complaintsClosed)}
          firstName={tx(lang, 'Opened', 'مفتوح')}
          secondName={tx(lang, 'Closed', 'مغلق')}
        />
      </>
    );
  }
  if (family === 'infection' || family === 'safety') {
    const zeros = months.map((label) => ({ label, value: 0 }));
    return (
      <>
        <BarChart
          title={tx(lang, 'Surveillance events', 'أحداث الترصد')}
          caption={tx(lang, 'Assumption series. Events ÷ admissions is the rate.', 'سلسلة افتراض. الأحداث ÷ التنويم هو المعدل.')}
          points={packet.months.map((month, index) => ({ label: months[index], value: month.haiEvents }))}
          unit="count"
          labels={labels}
        />
        <BarChart
          title={tx(lang, 'Outbreak declarations', 'إعلانات التفشي')}
          caption={tx(lang, 'A legitimate zero for this fictional year.', 'صفر مشروع لهذه السنة الخيالية.')}
          points={zeros}
          unit="count"
          labels={labels}
        />
      </>
    );
  }
  if (family === 'equipment') {
    const zeroMonth = packet.months.findIndex((month) => month.downtimeEvents === 0);
    return (
      <BarChart
        title={tx(lang, 'Downtime events', 'أحداث التوقف')}
        caption={zeroMonth >= 0 ? tx(lang, `${months[zeroMonth]} is 0 events. That month is a real zero, not a missing series.`, `${months[zeroMonth]} يساوي 0 أحداث. هذا الشهر صفر حقيقي وليس سلسلة مفقودة.`) : tx(lang, 'Monthly downtime events.', 'أحداث التوقف الشهرية.')}
        points={packet.months.map((month, index) => ({ label: months[index], value: month.downtimeEvents }))}
        unit="count"
        labels={labels}
      />
    );
  }
  if (family === 'dialysis' || family === 'births') {
    const key = family === 'dialysis' ? 'dialysisSessions' : 'births';
    return (
      <BarChart
        title={family === 'dialysis' ? tx(lang, 'Dialysis sessions', 'جلسات الغسيل') : tx(lang, 'Birth encounters', 'حالات الولادة')}
        caption={tx(lang, 'Labelled demo assumption. The source pack does not list these columns.', 'افتراض للعرض. حزمة المصدر لا تسرد هذه الأعمدة.')}
        points={packet.months.map((month, index) => ({ label: months[index], value: month[key] }))}
        unit="count"
        labels={labels}
      />
    );
  }
  if (family === 'morgue') {
    return (
      <BarChart
        title={tx(lang, 'Release time', 'زمن التسليم')}
        caption={tx(lang, 'Hours. Labelled demo assumption, shown beside the death cohort rather than as a patient list.', 'بالساعات. افتراض للعرض، بجانب فوج الوفيات وليس قائمة مرضى.')}
        points={packet.months.map((month, index) => ({ label: months[index], value: month.morgueReleaseHours }))}
        unit="count"
        labels={labels}
      />
    );
  }
  if (family === 'registry' || family === 'diagnoses') {
    return (
      <CompareChart
        title={tx(lang, 'Distinct patients by hospital', 'المرضى المميزون حسب المستشفى')}
        caption={tx(lang, 'Annual snapshot. Hospitals do not share patients in this story, so the network total is their sum.', 'لقطة سنوية. المستشفيات لا تشترك في المرضى في هذه القصة، فمجموع الشبكة هو جمعهم.')}
        labels={labels}
        rows={packet.sites.map((site) => ({ label: hospitalName(site.code, lang), value: site.annual.activePatients, display: num(site.annual.activePatients, lang) }))}
      />
    );
  }
  if (family === 'journey') {
    return (
      <Ledger
        title={tx(lang, 'Journey stages, each in its own unit', 'مراحل الرحلة، كل منها بوحدتها')}
        caption={tx(lang, 'These are not added together. A minute is not a day.', 'هذه لا تُجمع معاً. الدقيقة ليست يوماً.')}
        rows={[
          { label: tx(lang, 'Emergency wait', 'انتظار الطوارئ'), display: `${fact.edWaitMedianMin.toFixed(0)} ${tx(lang, 'min', 'د')}`, hint: tx(lang, 'Median', 'الوسيط') },
          { label: tx(lang, 'Emergency stay', 'بقاء الطوارئ'), display: `${(fact.edLosMedianMin / 60).toFixed(1)} ${tx(lang, 'h', 'س')}`, hint: tx(lang, 'Median, minutes ÷ 60', 'الوسيط، دقائق ÷ 60') },
          { label: tx(lang, 'Inpatient stay', 'بقاء التنويم'), display: `${fact.ipLosDays.toFixed(1)} ${tx(lang, 'days', 'يوم')}`, hint: tx(lang, 'Median', 'الوسيط') },
          { label: tx(lang, 'Clinic wait', 'انتظار العيادة'), display: `${fact.opWaitMedianMin.toFixed(0)} ${tx(lang, 'min', 'د')}`, hint: tx(lang, 'Median', 'الوسيط') },
          { label: tx(lang, 'Laboratory TAT', 'زمن المختبر'), display: `${fact.labTatMedianMin.toFixed(0)} ${tx(lang, 'min', 'د')}`, hint: tx(lang, 'Median', 'الوسيط') },
        ]}
      />
    );
  }
  if (family === 'compare' || family === 'stability' || family === 'hub' || family === 'command' || family === 'risk') {
    return (
      <>
        <CompareChart
          title={tx(lang, 'Occupancy', 'الإشغال')}
          caption={tx(lang, hospital === 'ALL' ? 'Occupied ÷ staffed, five fictional hospitals.' : 'The selected hospital beside the other four.', 'المستشفى المحدد بجانب الأربعة الأخرى.')}
          labels={labels}
          rows={packet.sites.map((site) => ({ label: hospitalName(site.code, lang), value: occ(site.annual), display: `${(occ(site.annual) * 100).toFixed(1)}%` }))}
        />
        <CompareChart
          title={tx(lang, 'Emergency median wait', 'وسيط انتظار الطوارئ')}
          caption={tx(lang, 'Minutes. Bar length is wait, not a blended index.', 'بالدقائق. طول الشريط هو الانتظار، وليس مؤشراً مخلوطاً.')}
          labels={labels}
          rows={packet.sites.map((site) => ({ label: hospitalName(site.code, lang), value: site.annual.edWaitMedianMin, display: `${site.annual.edWaitMedianMin.toFixed(0)} ${tx(lang, 'min', 'د')}` }))}
        />
        <CompareChart
          title={tx(lang, 'Outstanding', 'القائم')}
          caption={CURRENCY_NOTE}
          labels={labels}
          rows={packet.sites.map((site) => ({ label: hospitalName(site.code, lang), value: site.annual.outstanding, display: money(site.annual.outstanding, lang) }))}
        />
      </>
    );
  }
  if (family === 'quality' || family === 'audit' || family === 'metadata') {
    return (
      <Ledger
        title={tx(lang, 'Scenario checks', 'فحوصات السيناريو')}
        caption={tx(lang, 'These checks describe the demo dataset. They are not a hospital data-quality run.', 'هذه الفحوصات تصف بيانات العرض. ليست تشغيلاً لجودة بيانات مستشفى.')}
        rows={[
          { label: tx(lang, 'Bed identity', 'مطابقة الأسرة'), display: tx(lang, 'Holds', 'متحققة'), hint: tx(lang, 'Occupied + available + blocked = staffed', 'المشغول + المتاح + المغلق = المجهز') },
          { label: tx(lang, 'Claim identity', 'مطابقة المطالبات'), display: tx(lang, 'Holds', 'متحققة'), hint: tx(lang, 'Paid + denied + pending = submitted', 'المدفوع + المرفوض + المعلق = المقدم') },
          { label: tx(lang, 'P90 above median', 'المئين 90 فوق الوسيط'), display: tx(lang, 'Holds', 'متحققة'), hint: tx(lang, 'Wait, stay, lab, and imaging', 'الانتظار والبقاء والمختبر والأشعة') },
          { label: tx(lang, 'Verified SQL text', 'نص SQL الموثق'), display: tx(lang, 'Not in the pack', 'غير موجود في الحزمة'), hint: tx(lang, '280 query texts were not invented', 'لم يُختلق نص 280 استعلاماً') },
        ]}
      />
    );
  }
  if (family === 'semantic' || family === 'queries') {
    return (
      <Ledger
        title={family === 'semantic' ? tx(lang, 'Named views', 'العروض المسماة') : tx(lang, 'Contracted queries', 'الاستعلامات المتعاقد عليها')}
        caption={family === 'queries' ? tx(lang, 'Names only. SQL text is absent from the source pack and is not invented here.', 'أسماء فقط. نص SQL غائب من حزمة المصدر ولم يُختلق هنا.') : tx(lang, 'Fifteen names. No invented column list.', 'خمسة عشر اسماً. دون قائمة أعمدة مختلقة.')}
        rows={(family === 'semantic' ? SEMANTIC_VIEWS : ['280 contracted queries — SQL text withheld']).map((label) => ({
          label,
          display: tx(lang, 'Name only', 'اسم فقط'),
          hint: tx(lang, 'English identifier', 'معرّف إنجليزي'),
        }))}
      />
    );
  }
  if (family === 'ai' || family === 'predictions' || family === 'insights' || family === 'assistant' || family === 'catalog' || family === 'access' || family === 'actions') {
    const rows = family === 'access'
      ? [
          ['Executive reviewer', 'يمكنه اعتماد إجراء محاكى'],
          ['Operations lead', 'يراجع الضغط التشغيلي'],
          ['Revenue lead', 'يراجع الرفض والتحصيل'],
          ['Experience lead', 'يغلق مسار استعادة الخدمة'],
        ]
      : USE_CASES.slice(0, 8).map((item) => [item.name, item.review] as [string, string]);
    return (
      <Ledger
        title={tx(lang, 'Simulated review inventory', 'سجل المراجعة المحاكاة')}
        caption={tx(lang, 'Status is SIMULATED. No live model is queried.', 'الحالة محاكاة. لا يُستدعى نموذج حي.')}
        rows={rows.map(([label, hint]) => ({ label, display: tx(lang, 'Simulated', 'محاكاة'), hint }))}
      />
    );
  }
  return null;
}

function wardAr(id: string): string {
  const map: Record<string, string> = {
    Medicine: 'الباطنة',
    Surgery: 'الجراحة',
    Women: 'النساء',
    Children: 'الأطفال',
    Cardiology: 'القلب',
    Oncology: 'الأورام',
    'ICU step-down': 'عناية متدرجة',
    Orthopedics: 'العظام',
  };
  return map[id] ?? id;
}

function skillAr(id: string): string {
  const map: Record<string, string> = {
    Nursing: 'التمريض',
    Physicians: 'الأطباء',
    'Allied health': 'المهنيون الصحيون',
    'Operational support': 'الدعم التشغيلي',
  };
  return map[id] ?? id;
}
