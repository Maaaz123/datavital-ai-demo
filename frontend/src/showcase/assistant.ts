import { tx, type Lang } from './copy';
import { HOSPITALS } from './engine';
import { scenarioFor, wardRows } from './facts';
import { alertsFor } from '@/core/alerts';
import { peakHours } from '@/core/derived';
import { ipdDocScenario } from '@/core/ipdScope';
import { formatWhatIfAnswer, parseWhatIfIntent, runWhatIf, type DomainName as WhatIfDomain } from './whatIf';

export type AssistantAnswer = {
  title: string;
  observation: string;
  evidence: string;
  explanation: string;
  action: string;
  role: string;
  benefit: string;
  approval: string;
  outcome: string;
};

export const ASSISTANT_PROMPTS = [
  { en: 'Why is emergency waiting time increasing?', ar: 'لماذا يزداد انتظار الطوارئ؟' },
  { en: 'Which hospital has the greatest capacity pressure?', ar: 'أي مستشفى عليه أكبر ضغط طاقة؟' },
  { en: 'What factors are associated with lower patient satisfaction?', ar: 'ما العوامل المرتبطة بانخفاض رضا المرضى؟' },
  { en: 'Which operational interventions should be reviewed?', ar: 'أي التدخلات التشغيلية تستحق المراجعة؟' },
  { en: 'Where are claim denials increasing?', ar: 'أين يزداد رفض المطالبات؟' },
  { en: 'What improvements could reduce avoidable delays?', ar: 'ما التحسينات التي قد تقلل التأخير الممكن تجنبه؟' },
];

function siteName(code: string, lang: Lang): string {
  const site = HOSPITALS.find((item) => item.code === code);
  if (!site) return code;
  return lang === 'ar' ? site.nameAr : site.name;
}

export function promptForPath(path: string): string {
  if (/claim|rcm|billing|revenue|denial|preauth|eligibility/.test(path)) return ASSISTANT_PROMPTS[4].en;
  if (/experience|complaint|survey/.test(path)) return ASSISTANT_PROMPTS[2].en;
  if (/inpatient/.test(path)) return 'Why is the median length of stay increasing?';
  if (/bed|command/.test(path)) return ASSISTANT_PROMPTS[1].en;
  if (/emergency|wait/.test(path)) return ASSISTANT_PROMPTS[0].en;
  return ASSISTANT_PROMPTS[0].en;
}

export function answerQuestion(question: string, hospital: string, year: number, department: string, lang: Lang = 'en'): AssistantAnswer {
  const q = question.toLowerCase();
  const current = scenarioFor(hospital, year).focus;
  const prior = scenarioFor(hospital, Math.max(2024, year - 1)).focus;
  const sites = scenarioFor('ALL', year).sites;
  const name = siteName(hospital, lang);
  const waitNow = current.edWaitMedianMin;
  const waitThen = prior.edWaitMedianMin;

  if (department === 'Emergency' || department === 'Beds' || department === 'Inpatient') {
    const intent = parseWhatIfIntent(q);
    if (intent) {
      const result = runWhatIf(department as WhatIfDomain, hospital, year, intent);
      const body = formatWhatIfAnswer(result);
      return pack(lang, {
        title: tx(lang, `${result.title} · ${name} ${year}`, `${result.title} · ${name} ${year}`),
        observation: body.observation,
        evidence: body.evidence,
        explanation: body.explanation,
        action: body.action,
        role: body.role,
        benefit: body.benefit,
        outcomeOverride: body.outcome,
      });
    }
  }

  if (department === 'Emergency') return answerEmergency(q, hospital, year, name, lang, current, prior, waitNow, waitThen);
  if (department === 'Beds') return answerBeds(q, hospital, year, name, lang, current, prior);
  if (department === 'Inpatient') return answerInpatient(q, hospital, year, name, lang, current, prior);

  // Outside the three public domains: keep legacy helpers for unused screens.
  const busiest = [...sites].sort((a, b) => b.annual.occupiedBeds / b.annual.staffedBeds - a.annual.occupiedBeds / a.annual.staffedBeds)[0];
  if (q.includes('capacity') || q.includes('bed')) {
    const rate = busiest.annual.occupiedBeds / busiest.annual.staffedBeds;
    return pack(lang, {
      title: tx(lang, `${siteName(busiest.code, lang)} is the tightest in ${year}`, `${siteName(busiest.code, lang)} هو الأضيق عام ${year}`),
      observation: tx(lang, `Occupancy there is ${(rate * 100).toFixed(1)}% of staffed beds.`, `الإشغال هناك ${(rate * 100).toFixed(1)}٪ من الأسرة المجهزة.`),
      evidence: tx(lang, `Occupied ${busiest.annual.occupiedBeds}, available ${busiest.annual.availableBeds}, blocked ${busiest.annual.blockedBeds}.`, `المشغول ${busiest.annual.occupiedBeds} والمتاح ${busiest.annual.availableBeds} والمغلق ${busiest.annual.blockedBeds}.`),
      explanation: tx(lang, 'Hypothesis only. Not a proven clinical cause.', 'فرضية فقط. ليست سبباً سريرياً مثبتاً.'),
      action: tx(lang, 'Open Beds & Capacity for ward-level review.', 'افتح الأسرة والطاقة لمراجعة الأجنحة.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Capacity pressure affects placement options.', 'ضغط الطاقة يؤثر على خيارات التخصيص.'),
    });
  }
  if (q.includes('denial') || q.includes('claim')) {
    const rate = current.claimsDenied / current.claimsSubmitted;
    return pack(lang, {
      title: tx(lang, `Claim denial rate at ${name} in ${year}`, `معدل رفض المطالبات في ${name} عام ${year}`),
      observation: tx(lang, `Denial rate ${(rate * 100).toFixed(1)}%. Paid ${current.claimsPaid.toLocaleString('en-US')}, denied ${current.claimsDenied.toLocaleString('en-US')}, pending ${current.claimsPending.toLocaleString('en-US')}.`, `معدل الرفض ${(rate * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Those three dispositions sum to ${current.claimsSubmitted.toLocaleString('en-US')} submitted claims.`, `تجمع ${current.claimsSubmitted.toLocaleString('en-US')} مطالبة مقدمة.`),
      explanation: tx(lang, 'This is the selected hospital and year. Not a coding audit.', 'هذا هو المستشفى والسنة المحددان.'),
      action: tx(lang, 'Review the denial lifecycle before approving any action.', 'راجع دورة الرفض قبل اعتماد أي إجراء.'),
      role: tx(lang, 'Revenue cycle lead', 'قائد دورة الإيراد'),
      benefit: tx(lang, 'Illustrative only. Not a collected cash result.', 'توضيحي فقط.'),
    });
  }
  if (q.includes('alert') || q.includes('priority')) {
    const ranked = alertsFor(hospital, year).filter((alert) => alert.severity === 'critical' || alert.severity === 'high');
    const lines = (ranked.length ? ranked : alertsFor(hospital, year).slice(0, 3)).map((alert) => `${alert.severity}: ${alert.title} ${alert.observed}`).join('; ');
    return pack(lang, {
      title: tx(lang, `Priority alerts at ${name} in ${year}`, `تنبيهات الأولوية في ${name} عام ${year}`),
      observation: lines,
      evidence: tx(lang, 'Each alert uses a documented threshold on this hospital and full year.', 'كل تنبيه يستخدم عتبة موثقة لهذا المستشفى وهذه السنة.'),
      explanation: tx(lang, 'Priority is the threshold result, not a model score.', 'الأولوية نتيجة العتبة، وليست درجة نموذج.'),
      action: tx(lang, 'Open the highest alert and investigate it before approving an action.', 'افتح أعلى تنبيه وحققه قبل اعتماد إجراء.'),
      role: tx(lang, 'Hospital operations lead', 'قائد عمليات المستشفى'),
      benefit: tx(lang, 'Illustrative only.', 'توضيحي فقط.'),
    });
  }

  return unsupported(lang, name, year, department);
}

function answerEmergency(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  current: ReturnType<typeof scenarioFor>['focus'],
  _prior: ReturnType<typeof scenarioFor>['focus'],
  waitNow: number,
  waitThen: number,
): AssistantAnswer {
  const outside = /\b(workforce|staffing|satisfaction|complaint|survey|claim|revenue|cost|laboratory|imaging|pharmacy|radiology)\b/.test(q)
    || (/\bbeds?\b/.test(q) && !/\bboarding\b/.test(q));
  if (outside) {
    return pack(lang, {
      title: tx(lang, 'Outside Emergency focus', 'خارج تركيز الطوارئ'),
      observation: tx(lang, 'This view covers the emergency visit only.', 'هذه الواجهة تغطي زيارة الطوارئ فقط.'),
      evidence: tx(lang, 'Bed occupancy, workforce, experience, revenue, laboratory, imaging, and pharmacy stay in their own domains.', 'إشغال الأسرة والقوى العاملة والتجربة والإيراد والمختبر والأشعة والصيدلية تبقى في دوميناتها.'),
      explanation: tx(lang, 'A figure from another domain may later help explain an ED delay. It is not owned here.', 'رقم من دومين آخر قد يساعد لاحقاً في تفسير تأخر الطوارئ. لا يُملك هنا.'),
      action: tx(lang, 'Ask about arrivals, triage, waiting, flow, boarding, left without being seen, returns, or mortality.', 'اسأل عن الوصول والفرز والانتظار والتدفق والـboarding والمغادرة دون كشف والعودة أو الوفيات.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Keeping ownership clear prevents mixed KPI decisions.', 'وضوح الملكية يمنع قرارات مؤشرات مختلطة.'),
    });
  }

  const delta = waitNow - waitThen;
  const peaks = peakHours(hospital, year);
  const peakLine = peaks.map((item) => `${item.name} (${item.count.toLocaleString('en-US')} visits)`).join(', ');
  const boardingShare = (current.edAdmitted * (0.05 + (current.occupiedBeds / Math.max(current.staffedBeds, 1)) * 0.06)) / Math.max(current.edAdmitted, 1);

  if (/demand|highest|peak|when|hour|arriv/.test(q) && !/wait|door|provider|board/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Arrival demand at ${name} in ${year}`, `طلب الوصول في ${name} عام ${year}`),
      observation: tx(lang, `${current.edArrivals.toLocaleString('en-US')} emergency visits in ${year}. Peak hours: ${peakLine}.`, `${current.edArrivals.toLocaleString('en-US')} زيارة طوارئ عام ${year}. ساعات الذروة: ${peakLine}.`),
      evidence: tx(lang, `High-acuity (ESI-1+2) ${ (current.acuity1 + current.acuity2).toLocaleString('en-US') }. Walk-in, ambulance, and transfer still sum to arrivals.`, `الأعلى إلحاحاً (ESI-1+2) ${(current.acuity1 + current.acuity2).toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Hypothesis: afternoon peaks concentrate waiting pressure. This is co-movement in the demonstration, not a proven cause.', 'فرضية: ذروة بعد الظهر تركّز ضغط الانتظار. حركة مشتركة في العرض وليست سبباً مثبتاً.'),
      action: tx(lang, 'Review staffing and triage coverage against the peak arrival hours on Waiting & Patient Flow.', 'راجع التغطية مقابل ساعات ذروة الوصول في انتظار وتدفق المرضى.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Matching coverage to peak hours may reduce door-to-provider pressure.', 'مواءمة التغطية مع الذروة قد تخفف ضغط الوصول للطبيب.'),
    });
  }

  if (/triage|acuity|esi|urgenc/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Triage mix at ${name} in ${year}`, `مزيج الفرز في ${name} عام ${year}`),
      observation: tx(lang, `ESI-1 ${current.acuity1.toLocaleString('en-US')}, ESI-2 ${current.acuity2.toLocaleString('en-US')}, ESI-3 ${current.acuity3.toLocaleString('en-US')}, ESI-4 ${current.acuity4.toLocaleString('en-US')}, ESI-5 ${current.acuity5.toLocaleString('en-US')}.`, `ESI-1 ${current.acuity1.toLocaleString('en-US')} …`),
      evidence: tx(lang, `The five ESI counts sum to ${current.edArrivals.toLocaleString('en-US')} visits. Waiting time is not split by ESI in this demo.`, `المستويات الخمس تجمع ${current.edArrivals.toLocaleString('en-US')} زيارة.`),
      explanation: tx(lang, 'Hypothesis: ESI-3 volume often drives queue length. Acuity-specific waits are not available here.', 'فرضية: حجم ESI-3 غالباً يطيل الطابور. أوقات الانتظار حسب الإلحاح غير متاحة هنا.'),
      action: tx(lang, 'Investigate Urgency mix on arrival, then door-to-provider median for the same hospital and year.', 'راجع مزيج الإلحاح ثم وسيط الوصول للطبيب لنفس المستشفى والسنة.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Understanding acuity mix clarifies where waiting volume concentrates.', 'فهم مزيج الإلحاح يوضح أين يتركز حجم الانتظار.'),
    });
  }

  if (/board/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Boarding at ${name} in ${year}`, `الانتظار بعد قرار التنويم في ${name} عام ${year}`),
      observation: tx(lang, `ED boarding beyond 4 hours is ${(boardingShare * 100).toFixed(1)}% of emergency admissions (${current.edAdmitted.toLocaleString('en-US')} admissions).`, `الانتظار بعد قرار التنويم أكثر من 4 ساعات ${(boardingShare * 100).toFixed(1)}٪ من تنويم الطوارئ.`),
      evidence: tx(lang, `Denominator is emergency admissions, not staffed beds. Hospital bed occupancy is owned by Beds & Capacity.`, `المقام هو تنويم الطوارئ وليس الأسرة المجهزة.`),
      explanation: tx(lang, 'Hypothesis: boarding rises when admitted patients stay in ED after the admit decision. Bed occupancy may later explain delay but is not an ED KPI here.', 'فرضية: يرتفع الـboarding عندما يبقى المريض في الطوارئ بعد قرار التنويم.'),
      action: tx(lang, 'Clear boarded admissions still in the ED more than 4 hours after the admit decision on Emergency Snapshot, then re-measure the boarding rate.', 'امسح حالات الـboarding بعد قرار التنويم ثم أعد قياس المعدل.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Reducing ED boarding frees ED capacity for new arrivals.', 'تقليل الـboarding يحرر طاقة الطوارئ للوصول الجديد.'),
    });
  }

  if (/leav|lwbs|without (being )?seen|before assessment|walk.?away/.test(q)) {
    const leftRate = current.edLeft / Math.max(current.edArrivals, 1);
    return pack(lang, {
      title: tx(lang, `Left without being seen (LWBS) at ${name} in ${year}`, `المغادرة دون كشف في ${name} عام ${year}`),
      observation: tx(lang, `${current.edLeft.toLocaleString('en-US')} visits left without being seen (${(leftRate * 100).toFixed(1)}% of ${current.edArrivals.toLocaleString('en-US')} visits). Door-to-provider time (median) ${waitNow.toFixed(1)} minutes.`, `${current.edLeft.toLocaleString('en-US')} زيارة غادرت دون كشف.`),
      evidence: tx(lang, `Admitted ${current.edAdmitted.toLocaleString('en-US')}, discharged ${current.edDischarged.toLocaleString('en-US')}, LWBS ${current.edLeft.toLocaleString('en-US')} sum with arrivals. Peak hours ${peakLine}.`, `التنويم والخروج والمغادرة دون كشف تجمع مع الوصول.`),
      explanation: tx(lang, 'Hypothesis: longer door-to-provider time during peak hours raises LWBS risk. Left against medical advice is not separated in this demo.', 'فرضية: طول زمن الوصول للطبيب في الذروة يرفع خطر المغادرة دون كشف.'),
      action: tx(lang, `Prioritize first-provider coverage at ${peaks[0]?.name ?? 'peak hours'} while door-to-provider time is ${waitNow.toFixed(1)} minutes, then re-check Left without being seen (LWBS) on Safety & Return Visits.`, `أعطِ أولوية لتغطية أول طبيب في ساعات الذروة ثم أعد قياس المغادرة دون كشف.`),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Lower LWBS protects access and reduces unmeasured demand returning later.', 'تقليل المغادرة دون كشف يحمي الوصول.'),
    });
  }

  if (/return|72.?hour|revisit/.test(q)) {
    const revisit = Math.round(current.edArrivals * 0.034);
    return pack(lang, {
      title: tx(lang, `Unplanned 72-hour returns at ${name} in ${year}`, `عودة غير مخططة خلال 72 ساعة في ${name} عام ${year}`),
      observation: tx(lang, `About ${(0.034 * 100).toFixed(1)}% of arrivals are labelled unplanned 72-hour returns (~${revisit.toLocaleString('en-US')} visits).`, `حوالي ${(0.034 * 100).toFixed(1)}٪ عودة غير مخططة خلال 72 ساعة.`),
      evidence: tx(lang, `Denominator is arrivals, not eligible discharges. Visits are not linked patient-by-patient. ED mortality count ${current.edDeaths.toLocaleString('en-US')}.`, `المقام هو الوصول وليس الخروج المؤهل.`),
      explanation: tx(lang, 'Hypothesis only: return share can move with discharge quality and access. This figure is a fixed demonstration share, not a linked cohort.', 'فرضية فقط: حصة العودة قد تتحرك مع جودة الخروج.'),
      action: tx(lang, 'Review Unplanned 72-hour return rate on Safety & Return Visits together with Left without being seen (LWBS) and High-acuity arrivals — do not treat the share as a patient-level risk score.', 'راجع معدل العودة خلال 72 ساعة مع المغادرة دون كشف.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Watching returns alongside LWBS shows whether access problems are recycling demand.', 'مراقبة العودة مع المغادرة دون كشف تُظهر إن كان ضغط الوصول يعيد الطلب.'),
    });
  }

  if (/factor|contribut|delay|why/.test(q) && !/what if|increase by|decrease by/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Delay factors at ${name} in ${year}`, `عوامل التأخير في ${name} عام ${year}`),
      observation: tx(lang, `Door-to-provider time ${waitNow.toFixed(1)} minutes (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs prior) · ED boarding beyond 4 hours ${(boardingShare * 100).toFixed(1)}% · LWBS ${(current.edLeft / Math.max(current.edArrivals, 1) * 100).toFixed(1)}%.`, `الوصول للطبيب ${waitNow.toFixed(1)} دقيقة.`),
      evidence: tx(lang, `Peak hours ${peakLine}. ESI-1+2 ${(current.acuity1 + current.acuity2).toLocaleString('en-US')} of ${current.edArrivals.toLocaleString('en-US')} visits.`, `ساعات الذروة ${peakLine}.`),
      explanation: tx(lang, 'Potential reasons (not proven causes): (1) peak-hour arrival concentration, (2) high ESI-3 queue volume, (3) boarding after admit decisions occupying bays. Hospital bed occupancy is outside ED ownership here.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Cover ${peaks[0]?.name ?? 'peak'} first-provider capacity, clear ED boarding beyond 4 hours, then re-measure door-to-provider time and LWBS.`, `غطِّ ذروة أول طبيب وامسح حالات الـboarding.`),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Separating wait, boarding, and walkaways keeps actions proportionate to the actual delay.', 'فصل الانتظار والـboarding والمغادرة يبقي الإجراءات متناسبة.'),
    });
  }

  if (/investigate today|manager|what should|priorit/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Emergency' && alert.severity !== 'info');
    const lines = hot.map((alert) => `${alert.severity}: ${alert.title} ${alert.observed}`).join('; ') || 'No medium-or-higher emergency alert';
    const top = hot[0];
    return pack(lang, {
      title: tx(lang, `Emergency Director priorities · ${name} ${year}`, `أولويات مدير الطوارئ · ${name} ${year}`),
      observation: tx(lang, lines, lines),
      evidence: tx(lang, `Door-to-provider time ${waitNow.toFixed(1)} minutes (was ${waitThen.toFixed(1)}). ED visit volume ${current.edArrivals.toLocaleString('en-US')}. Peak hours ${peakLine}. ED boarding beyond 4 hours ${(boardingShare * 100).toFixed(1)}%.`, `الوصول للطبيب ${waitNow.toFixed(1)} دقيقة.`),
      explanation: tx(lang, 'Priority follows documented review lines for this hospital and full year. Quarterly dashboards can differ from the annual alert clock.', 'الأولوية تتبع خطوط المراجعة السنوية.'),
      action: tx(lang, top
        ? `${top.action} Owner: ${top.owner}. Then monitor ${top.followUp}.`
        : `Align first-provider coverage to ${peaks[0]?.name ?? 'peak hours'} while door-to-provider time (median) is ${waitNow.toFixed(1)} minutes.`, top?.action ?? 'راجع ساعات الذروة.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, top?.consequence ?? 'Focusing on the open high signal prevents spreading effort across every chart.', top?.consequence ?? 'التركيز على الإشارة العالية يمنع تشتيت الجهد.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Emergency visit at ${name} in ${year}`, `زيارة الطوارئ في ${name} عام ${year}`),
    observation: tx(lang, /how many|visit/.test(q)
      ? `ED visit volume ${current.edArrivals.toLocaleString('en-US')} in ${year}.`
      : `Door-to-provider time (median) is ${waitNow.toFixed(1)} minutes (P90 ${current.edWaitP90Min.toFixed(1)}). Change versus ${year === 2024 ? '2024 baseline' : year - 1}: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} minutes.`, `وسيط الوصول للطبيب ${waitNow.toFixed(1)} دقيقة.`),
    evidence: tx(lang, `ED visit volume ${current.edArrivals.toLocaleString('en-US')} · admitted ${current.edAdmitted.toLocaleString('en-US')} · discharged ${current.edDischarged.toLocaleString('en-US')} · LWBS ${current.edLeft.toLocaleString('en-US')}. Peak hours ${peakLine}.`, `${current.edArrivals.toLocaleString('en-US')} زيارة.`),
    explanation: tx(lang, `Potential reasons (not proven): median moved ${delta.toFixed(1)} minutes versus prior year with peak load at ${peaks[0]?.name ?? 'busy hours'}. Bed occupancy is not used as an emergency indicator.`, `أسباب محتملة وليست مثبتة.`),
    action: tx(lang, `Align first-provider coverage to ${peaks[0]?.name ?? 'peak hours'} and re-check door-to-provider time against the 60-minute review line.`, `واءم تغطية أول طبيب مع ساعات الذروة.`),
    role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
    benefit: tx(lang, 'Shorter first-provider waits protect flow and reduce walkaways.', 'قصر زمن الوصول للطبيب يحمي التدفق.'),
  });
}

function answerBeds(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  current: ReturnType<typeof scenarioFor>['focus'],
  prior: ReturnType<typeof scenarioFor>['focus'],
): AssistantAnswer {
  const outside = /\b(door-to-provider|triage|esi|satisfaction|complaint|claim|workforce|payroll|laboratory|pharmacy)\b/.test(q);
  if (outside) {
    return pack(lang, {
      title: tx(lang, 'Outside Beds & Capacity focus', 'خارج تركيز الأسرة والطاقة'),
      observation: tx(lang, 'This domain owns bed inventory, occupancy, allocation, turnover, and capacity outlook.', 'هذا الدومين يملك مخزون الأسرة والإشغال والتخصيص والتدوير وتوقع الطاقة.'),
      evidence: tx(lang, 'ED waiting time stays in Emergency. Staffing stays in Workforce.', 'انتظار الطوارئ يبقى في الطوارئ. الكادر في القوى العاملة.'),
      explanation: tx(lang, 'Cross-domain figures may later explain bed delay if clearly labeled. They are not bed KPIs.', 'أرقام من دومين آخر قد تفسر تأخير السرير إذا وُسمت بوضوح.'),
      action: tx(lang, 'Ask about occupancy, vacant beds, blocked beds, assignment time, or shortfall.', 'اسأل عن الإشغال أو الشواغر أو المغلق أو زمن التخصيص أو العجز.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Clear ownership keeps capacity decisions on bed measures.', 'وضوح الملكية يبقي قرارات الطاقة على مقاييس الأسرة.'),
    });
  }

  const occ = current.staffedBeds ? current.occupiedBeds / current.staffedBeds : 0;
  const priorOcc = prior.staffedBeds ? prior.occupiedBeds / prior.staffedBeds : 0;
  const wards = wardRows(current).slice().sort((a, b) => (b.occupied / Math.max(b.staffed, 1)) - (a.occupied / Math.max(a.staffed, 1)));
  const top = wards[0];
  const assignMin = Math.round(42 + occ * 18);

  if (/ward|pressure|tight|occupanc/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Capacity pressure at ${name} in ${year}`, `ضغط الطاقة في ${name} عام ${year}`),
      observation: tx(lang, `Bed occupancy rate ${(occ * 100).toFixed(1)}% (${current.occupiedBeds} occupied of ${current.staffedBeds} operational bed capacity). Tightest ward: ${top?.id ?? 'n/a'} at ${top ? ((top.occupied / Math.max(top.staffed, 1)) * 100).toFixed(1) : 'n/a'}%.`, `الإشغال التشغيلي ${(occ * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Vacant ${current.availableBeds}, blocked ${current.blockedBeds}. Occupied + vacant + blocked = operational bed capacity. Prior year occupancy ${(priorOcc * 100).toFixed(1)}%.`, `الشاغر ${current.availableBeds} والمغلق ${current.blockedBeds}.`),
      explanation: tx(lang, 'Hypothesis: wards with highest occupancy and blocked beds create placement pressure. Not a proven cause for ED wait.', 'فرضية: الأجنحة الأعلى إشغالاً تخلق ضغط التخصيص.'),
      action: tx(lang, 'Review the fullest wards and blocked beds before expanding operational bed capacity.', 'راجع الأجنحة الأكثر امتلاءً والأسرة المغلقة قبل فتح أسرة إضافية.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Relieving the tightest wards restores placement options.', 'تخفيف الأجنحة الأضيق يعيد خيارات التخصيص.'),
    });
  }

  if (/available|vacant|how many/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Available beds at ${name} in ${year}`, `الأسرة المتاحة في ${name} عام ${year}`),
      observation: tx(lang, `${current.availableBeds} vacant operational beds ready for allocation at the current snapshot (not projected available beds).`, `${current.availableBeds} سريراً شاغراً جاهزاً للتخصيص.`),
      evidence: tx(lang, `Occupied ${current.occupiedBeds}, vacant ${current.availableBeds}, blocked ${current.blockedBeds}, operational bed capacity ${current.staffedBeds}.`, `المشغول ${current.occupiedBeds}.`),
      explanation: tx(lang, 'Vacant beds are not blocked beds. Current vacant capacity is distinct from simulated projected available beds on Bed Capacity Outlook. Snapshot counts are not summed across months.', 'الشاغر ليس المغلقاً. لقطات الشهر لا تُجمع عبر الأشهر.'),
      action: tx(lang, 'Match pending bed requests to vacant ready beds, then clear blocked beds that can return to vacant.', 'طابق الطلبات المعلقة مع الأسرة الشاغرة ثم حرّر المغلقة القابلة للعودة.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Knowing the ready pool guides same-day placement.', 'معرفة الجاهز يوجّه التخصيص في اليوم نفسه.'),
    });
  }

  if (/ready|clean|block|slow|turn/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Bed readiness at ${name} in ${year}`, `جاهزية الأسرة في ${name} عام ${year}`),
      observation: tx(lang, `${current.blockedBeds} blocked beds (${((current.blockedBeds / Math.max(current.staffedBeds, 1)) * 100).toFixed(1)}% of operational bed capacity). Cleaning and vacancy duration clocks are not available in this demo.`, `${current.blockedBeds} سريراً مغلقاً.`),
      evidence: tx(lang, `Bed allocation time (median) ${assignMin.toFixed(0)} minutes. Vacant ready ${current.availableBeds}.`, `وسيط التخصيص ${assignMin.toFixed(0)} دقيقة.`),
      explanation: tx(lang, 'Hypothesis: blocked share and allocation delay move together when the ready pool is thin. Cleaning turnaround is not measured here.', 'فرضية: الحصة المغلقة وتأخر التخصيص يتحركان معاً عندما يقل الجاهز.'),
      action: tx(lang, 'Accelerate cleaning turnaround on the blocked share before expanding operational bed capacity.', 'سرّع تجهيز الأسرة المغلقة قبل إضافة أسرة تشغيلية.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Returning blocked beds to vacant expands allocation options.', 'إعادة المغلقة إلى الشاغر توسّع خيارات التخصيص.'),
    });
  }

  if (/request|assign|waiting longest|delay/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Bed allocation at ${name} in ${year}`, `تخصيص الأسرة في ${name} عام ${year}`),
      observation: tx(lang, `Bed allocation time (median) ${assignMin.toFixed(0)} minutes. Vacant ready ${current.availableBeds}. Blocked ${current.blockedBeds}.`, `وسيط التخصيص ${assignMin.toFixed(0)} دقيقة.`),
      evidence: tx(lang, `Occupied ${current.occupiedBeds}, vacant ${current.availableBeds}, blocked ${current.blockedBeds} sum to operational bed capacity ${current.staffedBeds}. Tightest ward ${top?.id ?? 'n/a'}. Allocation time is not door-to-provider wait.`, `الشاغر ${current.availableBeds}.`),
      explanation: tx(lang, 'Potential reasons (not proven): scarce vacant ready beds, blocked share awaiting cleaning, and competing requests on high-occupancy wards.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Prioritize unallocated bed requests on ${top?.id ?? 'the fullest ward'} against expected bed releases, and return blocked beds to vacant before expanding operational bed capacity.`, 'أعطِ أولوية للطلبات غير المخصصة.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Faster allocation reduces placement backlog and protects emergency outflow labeled only when bed clocks improve.', 'التخصيص الأسرع يقلل تراكم الانتظار.'),
    });
  }

  if (/priorit|manager|what should/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Beds' && alert.severity !== 'info');
    const topAlert = hot[0];
    return pack(lang, {
      title: tx(lang, `Bed Manager priorities · ${name} ${year}`, `أولويات مدير الأسرة · ${name} ${year}`),
      observation: tx(lang, topAlert
        ? `${topAlert.severity}: ${topAlert.title} ${topAlert.observed}`
        : `Occupancy ${(occ * 100).toFixed(1)}% · vacant ${current.availableBeds} · blocked ${current.blockedBeds}`, topAlert ? `${topAlert.title}` : `الإشغال ${(occ * 100).toFixed(1)}٪`),
      evidence: tx(lang, `Tightest ward ${top?.id ?? 'n/a'}. Bed allocation time (median) ${assignMin.toFixed(0)} minutes. Occupied + vacant + blocked = ${current.staffedBeds} operational bed capacity.`, `أضيق جناح ${top?.id ?? 'n/a'}.`),
      explanation: tx(lang, 'Potential reasons (not proven): high occupancy on key wards, blocked beds out of the ready pool, and allocation delay on pending requests.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, topAlert
        ? `${topAlert.action} Then monitor ${topAlert.followUp}.`
        : `Clear blocked beds on ${top?.id ?? 'the fullest ward'}, prioritize pending bed requests, then re-check bed occupancy rate and bed allocation time (median).`, topAlert?.action ?? 'حرّر الأسرة المغلقة.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, topAlert?.consequence ?? 'Restoring vacant ready beds is usually the fastest capacity lever before expanding operational bed capacity.', 'إعادة الشاغر الجاهز أسرع رافعة.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Beds & capacity at ${name} in ${year}`, `الأسرة والطاقة في ${name} عام ${year}`),
    observation: tx(lang, `Bed occupancy rate ${(occ * 100).toFixed(1)}% · vacant ${current.availableBeds} · blocked ${current.blockedBeds} · bed allocation time (median) ${assignMin.toFixed(0)} minutes.`, `الإشغال ${(occ * 100).toFixed(1)}٪.`),
    evidence: tx(lang, `Operational bed capacity ${current.staffedBeds}. Occupied + vacant + blocked reconcile. Tightest ward ${top?.id ?? 'n/a'}.`, `المجهز ${current.staffedBeds}.`),
    explanation: tx(lang, 'Potential reasons (not proven): occupancy, blocked beds, and allocation delay describe capacity pressure together. ED wait is not substituted here.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, `Review ${top?.id ?? 'the fullest ward'} and blocked beds before expanding operational bed capacity.`, 'راجع الجناح الأكثر امتلاءً والأسرة المغلقة.'),
    role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
    benefit: tx(lang, 'Balanced occupancy and readiness protect placement speed.', 'توازن الإشغال والجاهزية يحمي سرعة التخصيص.'),
  });
}

function answerInpatient(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  current: ReturnType<typeof scenarioFor>['focus'],
  prior: ReturnType<typeof scenarioFor>['focus'],
): AssistantAnswer {
  const outside = /\b(occupancy|vacant bed|blocked bed|door-to-provider|triage|satisfaction|workforce|claim|laboratory)\b/.test(q);
  if (outside) {
    return pack(lang, {
      title: tx(lang, 'Outside Inpatient Care focus', 'خارج تركيز التنويم'),
      observation: tx(lang, 'This domain owns admissions, length of stay, care progress, discharge readiness delays, readmissions, and inpatient outcomes.', 'هذا الدومين يملك القبول ومدة الإقامة وتقدم الرعاية وتأخر الجاهزية وإعادة التنويم والنتائج.'),
      evidence: tx(lang, 'Bed occupancy stays in Beds. ED wait stays in Emergency.', 'إشغال الأسرة في الأسرة. انتظار الطوارئ في الطوارئ.'),
      explanation: tx(lang, 'Cross-domain evidence may explain an inpatient delay only when labeled. Ownership does not move.', 'دليل من دومين آخر قد يفسر تأخيراً إذا وُسم بوضوح.'),
      action: tx(lang, 'Ask about length of stay, long stays, discharge delays, or readmissions.', 'اسأل عن مدة الإقامة أو الإقامة الطويلة أو تأخر الخروج أو إعادة التنويم.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Clear ownership keeps inpatient decisions on episode measures.', 'وضوح الملكية يبقي قرارات التنويم على مقاييس الحالة.'),
    });
  }

  const losNow = current.ipLosDays;
  const losThen = prior.ipLosDays;
  const losDelta = losNow - losThen;
  const bedOcc = current.staffedBeds ? current.occupiedBeds / current.staffedBeds : 0;
  const readmit = 0.086 + bedOcc * 0.02;
  const readmit7 = 0.018;
  const longStayRate = Math.min(0.22, Math.max(0.05, 0.10 + (current.ipLosP90Days - 7) * 0.025));
  const specialties = ['Medicine', 'Surgery', 'Cardiology', 'Orthopedics', 'Women', 'Children'];
  const specialtyLos = specialties.map((id, index) => ({ id, los: Math.round((losNow * (0.85 + index * 0.06)) * 10) / 10 }));
  const longest = [...specialtyLos].sort((a, b) => b.los - a.los)[0];
  const readyNotDischarged = Math.max(1, Math.round(current.occupiedBeds * 0.08));

  if (/prolong|long.?stay|clinical group|specialty/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Prolonged stays at ${name} in ${year}`, `الإقامات الطويلة في ${name} عام ${year}`),
      observation: tx(lang, `Longest specialty median in this story: ${longest.id} at ${longest.los.toFixed(1)} days. Hospital median ${losNow.toFixed(1)} days · P90 ${current.ipLosP90Days.toFixed(1)}.`, `أطول تخصص ${longest.id} عند ${longest.los.toFixed(1)} يوماً.`),
      evidence: tx(lang, `Long-stay rate about ${(longStayRate * 100).toFixed(1)}% of discharges (7-day review line). Severity is not adjusted.`, `معدل الإقامة الطويلة حوالي ${(longStayRate * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Hypothesis: specialties with higher medians contribute more long stays. Raw specialty gaps are not proof of better or worse care.', 'فرضية: التخصصات ذات الوسيط الأعلى تساهم أكثر في الإقامات الطويلة.'),
      action: tx(lang, 'Review specialty long-stay lists and pending discharge barriers with the care team.', 'راجع قوائم الإقامة الطويلة حسب التخصص مع الفريق السريري.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Targeting long-stay groups can free capacity without moving bed ownership.', 'استهداف مجموعات الإقامة الطويلة يحرر طاقة دون نقل ملكية الأسرة.'),
    });
  }

  if (/discharge delay|ready|delay/.test(q)) {
    const docs = ipdDocScenario({ hospital, occupiedBeds: current.occupiedBeds, staffedBeds: current.staffedBeds });
    return pack(lang, {
      title: tx(lang, `Discharge delays at ${name} in ${year}`, `تأخر الخروج في ${name} عام ${year}`),
      observation: tx(lang, `About ${readyNotDischarged} patients marked ready but still here (illustrative share of census ${current.occupiedBeds}).`, `حوالي ${readyNotDischarged} مريضاً جاهزين وما زالوا هنا.`),
      evidence: tx(lang, `Discharges ${current.discharges.toLocaleString('en-US')}. Illustrative readiness documentation ~${(docs.readinessDocRate * 100).toFixed(1)}%. Ready-to-actual delay duration clocks are not available. AI does not decide medical readiness.`, `حالات الخروج ${current.discharges.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Hypothesis: ready-but-not-discharged rises when consults or discharge logistics lag. These drivers are not proven here.', 'فرضية: الجاهز غير الخارج يرتفع عند تأخر الاستشارات أو لوجستيات الخروج.'),
      action: tx(lang, 'Review ready-but-not-discharged cases with the responsible clinical team. Do not auto-discharge.', 'راجع حالات الجاهز غير الخارج مع الفريق السريري المسؤول.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Clearing confirmed discharge barriers reduces avoidable stay days.', 'إزالة عوائق الخروج المؤكدة يقلل أيام الإقامة الممكن تجنبها.'),
    });
  }

  if (/length of stay|los|how has.*stay|changed/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Length of stay at ${name} in ${year}`, `مدة الإقامة في ${name} عام ${year}`),
      observation: tx(lang, `Median ${losNow.toFixed(1)} days (was ${losThen.toFixed(1)}). Average ${current.ipLosAvgDays.toFixed(1)}. P90 ${current.ipLosP90Days.toFixed(1)}. Change ${losDelta >= 0 ? '+' : ''}${losDelta.toFixed(1)} days.`, `الوسيط ${losNow.toFixed(1)} يوماً.`),
      evidence: tx(lang, `Admissions ${current.admissions.toLocaleString('en-US')}, discharges ${current.discharges.toLocaleString('en-US')}. Not emergency length of stay.`, `القبول ${current.admissions.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Hypothesis: median and P90 moved with case mix and discharge timing. Observed-to-expected LOS is not available.', 'فرضية: الوسيط والمئين 90 تحركا مع مزيج الحالات وتوقيت الخروج.'),
      action: tx(lang, 'Compare median, average, and P90 on Stay & Discharge, then review long-stay lists.', 'قارن الوسيط والمتوسط والمئين 90 ثم راجع قوائم الإقامة الطويلة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Watching LOS distribution catches prolonged stays earlier.', 'مراقبة توزيع مدة الإقامة يلتقط الإقامات الطويلة أبكر.'),
    });
  }

  if (/care.?plan|milestone|consult|document|summar(y|ies)|med.?rec|follow.?up|assessment|diagnosis/.test(q)) {
    const docs = ipdDocScenario({ hospital, occupiedBeds: current.occupiedBeds, staffedBeds: current.staffedBeds });
    return pack(lang, {
      title: tx(lang, `Care documentation at ${name} in ${year}`, `توثيق الرعاية في ${name} عام ${year}`),
      observation: tx(lang, `Care-plan documentation ~${(docs.carePlanDocRate * 100).toFixed(1)}% · daily clinical review ~${(docs.dailyReviewRate * 100).toFixed(1)}% · median consult response ~${docs.consultResponseHours.toFixed(1)}h · ${docs.pendingConsults} pending consults.`, `توثيق خطة الرعاية حوالي ${(docs.carePlanDocRate * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Discharge summary ~${(docs.dischargeSummaryRate * 100).toFixed(1)}% · med-rec ~${(docs.medRecRate * 100).toFixed(1)}% · follow-up plan ~${(docs.followUpPlanRate * 100).toFixed(1)}% · milestone completion ~${(docs.milestoneRate * 100).toFixed(1)}%. Admissions ${current.admissions.toLocaleString('en-US')}. These are illustrative scenario shares, not extracted charts.`, `ملخص الخروج حوالي ${(docs.dischargeSummaryRate * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): documentation gaps can trail busy wards and delayed consults. Figures are not inferred from length of stay and are not a validated EMR extract.', 'أسباب محتملة وليست مثبتة: فجوات التوثيق قد تتأخر مع ازدحام الأجنحة.'),
      action: tx(lang, 'On Care Progress & Outcomes, review care documentation cards and pending consults with the clinical operations lead. AI does not decide medical readiness.', 'في تقدم الرعاية والنتائج راجع بطاقات التوثيق والاستشارات المعلقة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Closing confirmed documentation gaps supports safer discharge handoffs without inventing clinical findings.', 'إغلاق فجوات التوثيق المؤكدة يدعم تسليم خروج أكثر أماناً.'),
    });
  }

  if (/readmit|return|30.?day|7.?day/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Readmissions at ${name} in ${year}`, `إعادة التنويم في ${name} عام ${year}`),
      observation: tx(lang, `Unplanned 30-day return share about ${(readmit * 100).toFixed(1)}% of discharges. 7-day share about ${(readmit7 * 100).toFixed(1)}%.`, `حصة العودة خلال 30 يوماً حوالي ${(readmit * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Discharges ${current.discharges.toLocaleString('en-US')}. Visits are not linked patient-by-patient in this demo.`, `حالات الخروج ${current.discharges.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Potential reasons (not proven): specialties with longer stays show higher return shares in this story. Severity is not adjusted.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review discharge instructions and follow-up plans for ${longest.id} and other high-return specialties.`, 'راجع تعليمات الخروج وخطط المتابعة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Focusing follow-up on high-return groups may reduce unplanned returns.', 'تركيز المتابعة على المجموعات الأعلى عودة قد يقلل العودة غير المخططة.'),
    });
  }

  if (/priorit|attention|manager|what should|improve discharge|coordination/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Inpatient' && alert.severity !== 'info');
    const topAlert = hot[0];
    return pack(lang, {
      title: tx(lang, `Inpatient management attention · ${name} ${year}`, `اهتمام إدارة التنويم · ${name} ${year}`),
      observation: tx(lang, topAlert
        ? `${topAlert.severity}: ${topAlert.title} ${topAlert.observed}`
        : `Median stay ${losNow.toFixed(1)} days · ready-but-not-discharged ~${readyNotDischarged} · 30-day returns ${(readmit * 100).toFixed(1)}%`, topAlert ? topAlert.title : `وسيط الإقامة ${losNow.toFixed(1)}`),
      evidence: tx(lang, `Longest specialty ${longest.id} at ${longest.los.toFixed(1)} days. Admissions ${current.admissions.toLocaleString('en-US')}, discharges ${current.discharges.toLocaleString('en-US')}.`, `أطول تخصص ${longest.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): prolonged specialty stays, ready patients not yet discharged, and unplanned returns after discharge.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, topAlert
        ? `${topAlert.action} Monitor ${topAlert.followUp}. AI does not decide medical readiness.`
        : `Review ${longest.id} long-stay lists and the ~${readyNotDischarged} ready-but-not-discharged patients with the care team. AI does not decide medical readiness.`, topAlert?.action ?? 'راجع قوائم الإقامة الطويلة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, topAlert?.consequence ?? 'Clearing confirmed discharge barriers and long stays frees census without claiming bed-occupancy ownership.', 'إزالة عوائق الخروج تحرر التعداد.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Inpatient care at ${name} in ${year}`, `رعاية التنويم في ${name} عام ${year}`),
    observation: tx(lang, `Admissions ${current.admissions.toLocaleString('en-US')} · median stay ${losNow.toFixed(1)} days · ready-but-not-discharged ~${readyNotDischarged} · 30-day returns ~${(readmit * 100).toFixed(1)}%.`, `القبول ${current.admissions.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Discharges ${current.discharges.toLocaleString('en-US')}, deaths ${current.deaths.toLocaleString('en-US')}. Census is a patient count, not a bed occupancy rate.`, `الخروج ${current.discharges.toLocaleString('en-US')}.`),
    explanation: tx(lang, 'Potential reasons (not proven): LOS, discharge delays, and returns describe inpatient flow together. Bed occupancy remains a Beds measure.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, `Review ${longest.id} long stays on Stay & Discharge, then returns on Care Progress & Outcomes.`, 'راجع الإقامات الطويلة ثم العودة.'),
    role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
    benefit: tx(lang, 'Coordinated inpatient review improves discharge readiness without AI deciding readiness alone.', 'مراجعة تنويم منسقة تحسّن جاهزية الخروج دون أن يقرر الذكاء الاصطناعي وحده.'),
  });
}

function unsupported(lang: Lang, name: string, year: number, department: string): AssistantAnswer {
  return pack(lang, {
    title: tx(lang, 'This question is outside the simulated set', 'هذا السؤال خارج المجموعة المحاكاة'),
    observation: tx(lang, `No management answer matched this wording for ${department} at ${name} in ${year}.`, `لا جواب إداري يطابق هذه الصياغة.`),
    evidence: tx(lang, 'Vital Assist answers from the selected hospital scenario. It does not invent figures outside that scenario.', 'Vital Assist يجيب من سيناريو المستشفى المحدد. لا يختلق أرقاماً خارجه.'),
    explanation: tx(lang, 'When evidence is missing, the limitation is stated. No fabricated drivers are offered.', 'عند غياب الدليل تُذكر الحدود. لا تُعرض أسباب مختلقة.'),
    action: tx(lang, 'Ask a domain question about the open indicators, or open Review on an alert.', 'اسأل سؤالاً عن مؤشرات الدومين أو افتح مراجعة على تنبيه.'),
    role: tx(lang, 'Operations advisor', 'مستشار العمليات'),
    benefit: tx(lang, 'Clear limits protect decision quality.', 'الحدود الواضحة تحمي جودة القرار.'),
  });
}

function pack(
  lang: Lang,
  body: Omit<AssistantAnswer, 'approval' | 'outcome'> & { outcomeOverride?: string },
): AssistantAnswer {
  const { outcomeOverride, ...rest } = body;
  return {
    ...rest,
    approval: tx(lang, 'Management decision: approve, reject, or defer in Decide. An approval records intent only — it is not measured improvement.', 'قرار إداري: اعتمد أو ارفض أو أجّل في Decide. الاعتماد يسجل النية فقط وليس تحسناً مقيساً.'),
    outcome: outcomeOverride
      ?? tx(lang, 'Expected impact is illustrative. Monitor the follow-up indicator separately. Not a validated forecast.', 'الأثر المتوقع توضيحي. راقب مؤشر المتابعة منفصلاً. ليس توقعاً متحققاً.'),
  };
}
