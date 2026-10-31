import { tx, type Lang } from './copy';
import { HOSPITALS } from './engine';
import { scenarioFor, wardRows } from './facts';
import { alertsFor } from '@/core/alerts';
import { peakHours } from '@/core/derived';
import { buildIpdView } from '@/core/ipdView';
import { buildOpdView } from '@/core/opdView';
import { buildAppointmentView } from '@/core/appointmentView';
import { buildLaboratoryView } from '@/core/laboratoryView';
import { buildIcuView } from '@/core/icuView';
import { buildPharmacyView } from '@/core/pharmacyView';
import { buildPxView } from '@/core/patientExperienceView';
import { buildRadiologyView } from '@/core/radiologyView';
import { buildQsView, QS_TARGETS } from '@/core/qualitySafetyView';
import { buildRcmView, RCM_TARGETS } from '@/core/rcmView';
import { buildSurgeryView } from '@/core/surgeryView';
import { type ReportPeriod } from '@/core/period';
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
  if (/quality|infection|incident|capa|hai|clabsi/.test(path)) return 'Where are the largest quality and safety concerns?';
  if (/claim|rcm|billing|revenue|denial|preauth|eligibility/.test(path)) return ASSISTANT_PROMPTS[4].en;
  if (/experience|complaint|survey/.test(path)) return ASSISTANT_PROMPTS[2].en;
  if (/surgery/.test(path)) return 'Which surgical specialties have the largest backlog?';
  if (/appointments/.test(path)) return 'Which specialties have the highest no-show rates?';
  if (/outpatient/.test(path)) return 'Which clinics have the longest waiting times?';
  if (/inpatient/.test(path)) return 'Why is the median length of stay increasing?';
  if (/bed|command/.test(path)) return ASSISTANT_PROMPTS[1].en;
  if (/emergency|wait/.test(path)) return ASSISTANT_PROMPTS[0].en;
  return ASSISTANT_PROMPTS[0].en;
}

export function answerQuestion(
  question: string,
  hospital: string,
  year: number,
  department: string,
  lang: Lang = 'en',
  period: ReportPeriod = 'year',
): AssistantAnswer {
  const q = question.toLowerCase();
  const current = scenarioFor(hospital, year).focus;
  const prior = scenarioFor(hospital, Math.max(2024, year - 1)).focus;
  const sites = scenarioFor('ALL', year).sites;
  const name = siteName(hospital, lang);
  const waitNow = current.edWaitMedianMin;
  const waitThen = prior.edWaitMedianMin;
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;

  if (department === 'Patient Experience') {
    const intent = parseWhatIfIntent(q);
    if (intent?.kind.startsWith('px-')) {
      const result = runWhatIf('Patient Experience', hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      const answer = pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
        observation: body.observation,
        evidence: body.evidence,
        explanation: body.explanation,
        action: body.action,
        role: body.role,
        benefit: body.benefit,
        outcomeOverride: body.outcome,
      });
      return {
        ...answer,
        approval: tx(lang, 'Management approval required. AI does not close complaints or change clinical care alone.', 'يلزم اعتماد إداري. الذكاء الاصطناعي لا يغلق الشكاوى ولا يغيّر الرعاية السريرية وحده.'),
      };
    }
  }

  if (department === 'Revenue Cycle') {
    const intent = parseWhatIfIntent(q);
    if (intent?.kind.startsWith('rcm-')) {
      const result = runWhatIf('Revenue Cycle', hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      const answer = pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
        observation: body.observation,
        evidence: body.evidence,
        explanation: body.explanation,
        action: body.action,
        role: body.role,
        benefit: body.benefit,
        outcomeOverride: body.outcome,
      });
      return {
        ...answer,
        approval: tx(lang, 'Management approval required. AI does not submit claims or write off balances alone. Modeled recovery is not collected cash.', 'يلزم اعتماد إداري. الذكاء الاصطناعي لا يقدم المطالبات ولا يشطب الأرصدة وحده. الاسترداد المقدر ليس نقداً محصلاً.'),
      };
    }
  }

  if (department === 'Quality & Safety') {
    const intent = parseWhatIfIntent(q);
    if (intent?.kind.startsWith('qs-')) {
      const result = runWhatIf('Quality & Safety', hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      const answer = pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
        observation: body.observation,
        evidence: body.evidence,
        explanation: body.explanation,
        action: body.action,
        role: body.role,
        benefit: body.benefit,
        outcomeOverride: body.outcome,
      });
      return {
        ...answer,
        approval: tx(lang, 'Management approval required. AI does not diagnose, order isolation, or close CAPA alone. Modeled reductions are not measured improvement.', 'يلزم اعتماد إداري. الذكاء الاصطناعي لا يشخص ولا يأمر بالعزل ولا يغلق الإجراءات التصحيحية وحده.'),
      };
    }
  }

  if (department === 'ICU') {
    const intent = parseWhatIfIntent(q);
    if (intent?.kind.startsWith('icu-')) {
      const result = runWhatIf('ICU', hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      const answer = pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
        observation: body.observation,
        evidence: body.evidence,
        explanation: body.explanation,
        action: body.action,
        role: body.role,
        benefit: body.benefit,
        outcomeOverride: body.outcome,
      });
      return {
        ...answer,
        approval: tx(lang, 'Management approval required. AI does not discharge or transfer patients.', 'يلزم اعتماد إداري. الذكاء الاصطناعي لا يخرج أو ينقل المرضى.'),
      };
    }
  }

  if (department === 'Pharmacy') {
    const intent = parseWhatIfIntent(q);
    if (intent?.kind.startsWith('rx-')) {
      const result = runWhatIf('Pharmacy', hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      return pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
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

  if (department === 'Emergency' || department === 'Beds' || department === 'Inpatient' || department === 'Outpatient' || department === 'Appointments' || department === 'Surgery' || department === 'Radiology') {
    const intent = parseWhatIfIntent(q);
    if (intent) {
      const result = runWhatIf(department as WhatIfDomain, hospital, year, intent, period);
      const body = formatWhatIfAnswer(result);
      return pack(lang, {
        title: tx(lang, `${result.title} · ${name} · ${periodLabel}`, `${result.title} · ${name} · ${periodLabel}`),
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
  if (department === 'Inpatient') return answerInpatient(q, hospital, year, name, lang, period);
  if (department === 'Outpatient') return answerOutpatient(q, hospital, year, name, lang, period);
  if (department === 'Appointments') return answerAppointments(q, hospital, year, name, lang, period);
  if (department === 'Surgery') return answerSurgery(q, hospital, year, name, lang, period);
  if (department === 'Radiology') return answerRadiology(q, hospital, year, name, lang, period);
  if (department === 'Laboratory') return answerLaboratory(q, hospital, year, name, lang, period);
  if (department === 'Pharmacy') return answerPharmacy(q, hospital, year, name, lang, period);
  if (department === 'ICU') return answerIcu(q, hospital, year, name, lang, period);
  if (department === 'Patient Experience') return answerPx(q, hospital, year, name, lang, period);
  if (department === 'Revenue Cycle') return answerRcm(q, hospital, year, name, lang, period);
  if (department === 'Quality & Safety') return answerQs(q, hospital, year, name, lang, period);

  // Outside the public domains: keep legacy helpers for unused screens.
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
  period: ReportPeriod,
): AssistantAnswer {
  const outside = /\b(occupancy|vacant bed|blocked bed|door-to-provider|triage|satisfaction|workforce|claim|laboratory)\b/.test(q);
  if (outside) {
    return pack(lang, {
      title: tx(lang, 'Outside Inpatient Care focus', 'خارج تركيز التنويم'),
      observation: tx(lang, 'This domain owns admissions, length of stay, care progress, discharge readiness delays, readmissions, and inpatient outcomes.', 'هذا الدومين يملك القبول ومدة الإقامة وتقدم الرعاية وتأخر الجاهزية وإعادة التنويم والنتائج.'),
      evidence: tx(lang, 'Bed occupancy stays in Beds. ED wait stays in Emergency.', 'إشغال الأسرة في الأسرة. انتظار الطوارئ في الطوارئ.'),
      explanation: tx(lang, 'Cross-domain evidence may explain an inpatient delay only when labeled. Ownership does not move.', 'دليل من دومين آخر قد يفسر تأخيراً إذا وُسم بوضوح.'),
      action: tx(lang, 'Ask about length of stay, long stays, discharge delays, documentation, or readmissions.', 'اسأل عن مدة الإقامة أو الإقامة الطويلة أو تأخر الخروج أو التوثيق أو إعادة التنويم.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Clear ownership keeps inpatient decisions on episode measures.', 'وضوح الملكية يبقي قرارات التنويم على مقاييس الحالة.'),
    });
  }

  const view = buildIpdView(hospital, year, period);
  const prior = buildIpdView(hospital, Math.max(2024, year - 1), period);
  const losDelta = view.losMedian - prior.losMedian;
  const longest = [...view.specialties].sort((a, b) => b.los - a.los)[0];
  const periodNote = period === 'year'
    ? ''
    : ` Figures use ${view.periodLabel}, not the full-year total.`;

  if (/discharge delay|ready.?but|medically ready|delayed discharge|\bdelay(ed|s)?\b/.test(q) && !/readmit|return|30.?day|7.?day/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Discharge delays at ${name} · ${view.periodLabel}`, `تأخر الخروج في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `About ${view.readyNotDischarged} patients marked ready but still here (illustrative share of census ${view.census}; ${view.censusBasis}).`, `حوالي ${view.readyNotDischarged} مريضاً جاهزين وما زالوا هنا.`),
      evidence: tx(lang, `Discharges ${view.discharges.toLocaleString('en-US')} in ${view.periodLabel}. Illustrative readiness documentation ~${(view.readinessDocRate * 100).toFixed(1)}% · discharge summary ~${(view.dischargeSummaryRate * 100).toFixed(1)}%. Ready-to-actual delay duration clocks are not available. AI does not decide medical readiness.${periodNote}`, `حالات الخروج ${view.discharges.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Hypothesis: ready-but-not-discharged rises when consults or discharge logistics lag. These drivers are not proven here.', 'فرضية: الجاهز غير الخارج يرتفع عند تأخر الاستشارات أو لوجستيات الخروج.'),
      action: tx(lang, 'Review ready-but-not-discharged cases with the responsible clinical team. Do not auto-discharge.', 'راجع حالات الجاهز غير الخارج مع الفريق السريري المسؤول.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Clearing confirmed discharge barriers reduces avoidable stay days.', 'إزالة عوائق الخروج المؤكدة يقلل أيام الإقامة الممكن تجنبها.'),
    });
  }

  if (/prolong|long.?stay|clinical group|longest stay|specialt(y|ies).*(long|stay|los)/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Prolonged stays at ${name} · ${view.periodLabel}`, `الإقامات الطويلة في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Longest specialty median: ${longest.id} at ${longest.los.toFixed(1)} days. Hospital median ${view.losMedian.toFixed(1)} days · P90 ${view.losP90.toFixed(1)}.`, `أطول تخصص ${longest.id} عند ${longest.los.toFixed(1)} يوماً.`),
      evidence: tx(lang, `Long-stay rate ${(view.longStayRate * 100).toFixed(1)}% · ${view.longStayCount.toLocaleString('en-US')} of ${view.discharges.toLocaleString('en-US')} discharges (${view.periodLabel}, 7-day review line). Severity is not adjusted.${periodNote}`, `معدل الإقامة الطويلة ${(view.longStayRate * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Hypothesis: specialties with higher medians contribute more long stays. Raw specialty gaps are not proof of better or worse care.', 'فرضية: التخصصات ذات الوسيط الأعلى تساهم أكثر في الإقامات الطويلة.'),
      action: tx(lang, 'Review specialty long-stay lists and pending discharge barriers with the care team.', 'راجع قوائم الإقامة الطويلة حسب التخصص مع الفريق السريري.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Targeting long-stay groups can free capacity without moving bed ownership.', 'استهداف مجموعات الإقامة الطويلة يحرر طاقة دون نقل ملكية الأسرة.'),
    });
  }

  if (/length of stay|los|how has.*stay|median.*stay|changed/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Length of stay at ${name} · ${view.periodLabel}`, `مدة الإقامة في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Median ${view.losMedian.toFixed(1)} days (was ${prior.losMedian.toFixed(1)} in prior-year ${period === 'year' ? 'full year' : period}). Average ${view.losAvg.toFixed(1)}. P90 ${view.losP90.toFixed(1)}. Change ${losDelta >= 0 ? '+' : ''}${losDelta.toFixed(1)} days.`, `الوسيط ${view.losMedian.toFixed(1)} يوماً.`),
      evidence: tx(lang, `Admissions ${view.admissions.toLocaleString('en-US')}, discharges ${view.discharges.toLocaleString('en-US')} in ${view.periodLabel}. Not emergency length of stay.${periodNote}`, `القبول ${view.admissions.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Hypothesis: median and P90 moved with case mix and discharge timing. Observed-to-expected LOS is not available.', 'فرضية: الوسيط والمئين 90 تحركا مع مزيج الحالات وتوقيت الخروج.'),
      action: tx(lang, 'Compare median, average, and P90 on Stay & Discharge, then review long-stay lists.', 'قارن الوسيط والمتوسط والمئين 90 ثم راجع قوائم الإقامة الطويلة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Watching LOS distribution catches prolonged stays earlier.', 'مراقبة توزيع مدة الإقامة يلتقط الإقامات الطويلة أبكر.'),
    });
  }

  if (/care.?plan|milestone|consult|document|summar(y|ies)|med.?rec|follow.?up|assessment|diagnosis/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Care documentation at ${name} · ${view.periodLabel}`, `توثيق الرعاية في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Care-plan documentation ~${(view.carePlanDocRate * 100).toFixed(1)}% · daily clinical review ~${(view.dailyReviewRate * 100).toFixed(1)}% · median consult response ~${view.consultResponseHours.toFixed(1)}h · ${view.pendingConsults} pending consults.`, `توثيق خطة الرعاية حوالي ${(view.carePlanDocRate * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Discharge summary ~${(view.dischargeSummaryRate * 100).toFixed(1)}% · med-rec ~${(view.medRecRate * 100).toFixed(1)}% · follow-up plan ~${(view.followUpPlanRate * 100).toFixed(1)}% · milestone completion ~${(view.milestoneRate * 100).toFixed(1)}%. Same illustrative shares as Care Progress & Outcomes for ${view.periodLabel}. Not extracted charts.${periodNote}`, `ملخص الخروج حوالي ${(view.dischargeSummaryRate * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): documentation gaps can trail busy wards and delayed consults. Figures are not inferred from length of stay and are not a validated EMR extract.', 'أسباب محتملة وليست مثبتة: فجوات التوثيق قد تتأخر مع ازدحام الأجنحة.'),
      action: tx(lang, 'On Care Progress & Outcomes, review care documentation cards and pending consults with the clinical operations lead. AI does not decide medical readiness.', 'في تقدم الرعاية والنتائج راجع بطاقات التوثيق والاستشارات المعلقة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Closing confirmed documentation gaps supports safer discharge handoffs without inventing clinical findings.', 'إغلاق فجوات التوثيق المؤكدة يدعم تسليم خروج أكثر أماناً.'),
    });
  }

  if (/readmit|return|30.?day|7.?day/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Readmissions at ${name} · ${view.periodLabel}`, `إعادة التنويم في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Unplanned 30-day return share ${(view.readmit30 * 100).toFixed(1)}% of discharges. 7-day share ${(view.readmit7 * 100).toFixed(1)}%.`, `حصة العودة خلال 30 يوماً ${(view.readmit30 * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Discharges ${view.discharges.toLocaleString('en-US')} in ${view.periodLabel}. Rate tilt uses period census ÷ staffed beds. Visits are not linked patient-by-patient.${periodNote}`, `حالات الخروج ${view.discharges.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Potential reasons (not proven): specialties with longer stays show higher return shares in this story. Severity is not adjusted.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review discharge instructions and follow-up plans for ${longest.id} and other high-return specialties.`, 'راجع تعليمات الخروج وخطط المتابعة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Focusing follow-up on high-return groups may reduce unplanned returns.', 'تركيز المتابعة على المجموعات الأعلى عودة قد يقلل العودة غير المخططة.'),
    });
  }

  if (/admission|source|census|volume/.test(q)) {
    const sourceLine = view.sources.map((item) => `${item.id} ${item.count.toLocaleString('en-US')}`).join(' · ');
    return pack(lang, {
      title: tx(lang, `Inpatient volume at ${name} · ${view.periodLabel}`, `حجم التنويم في ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Admissions ${view.admissions.toLocaleString('en-US')} · census ${view.census} (${view.censusBasis}) · discharges ${view.discharges.toLocaleString('en-US')}.`, `القبول ${view.admissions.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Sources: ${sourceLine}. Sources sum to admissions. Census is not a period total.${periodNote}`, `المصادر: ${sourceLine}.`),
      explanation: tx(lang, 'Potential reasons (not proven): ED inflow, elective schedule, and transfers shape the mix. Bed occupancy remains a Beds measure.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Review admission source mix and specialty volume on Inpatient Snapshot.', 'راجع مزيج مصادر القبول وحجم التخصصات في لقطة التنويم.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, 'Clear volume and source identity keeps executive discussion on episode measures.', 'وضوح الحجم والمصدر يبقي النقاش التنفيذي على مقاييس الحالة.'),
    });
  }

  if (/priorit|attention|manager|what should|improve discharge|coordination/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Inpatient' && alert.severity !== 'info');
    const topAlert = hot[0];
    const alertNote = period === 'year' ? '' : ' Open alerts remain full-year signals; scores above use the selected period.';
    return pack(lang, {
      title: tx(lang, `Inpatient management attention · ${name} · ${view.periodLabel}`, `اهتمام إدارة التنويم · ${name} · ${view.periodLabel}`),
      observation: tx(lang, topAlert
        ? `${topAlert.severity}: ${topAlert.title} ${topAlert.observed}${alertNote}`
        : `Median stay ${view.losMedian.toFixed(1)} days · ready-but-not-discharged ~${view.readyNotDischarged} · 30-day returns ${(view.readmit30 * 100).toFixed(1)}%`, topAlert ? topAlert.title : `وسيط الإقامة ${view.losMedian.toFixed(1)}`),
      evidence: tx(lang, `Longest specialty ${longest.id} at ${longest.los.toFixed(1)} days. Admissions ${view.admissions.toLocaleString('en-US')}, discharges ${view.discharges.toLocaleString('en-US')} in ${view.periodLabel}.${periodNote}`, `أطول تخصص ${longest.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): prolonged specialty stays, ready patients not yet discharged, and unplanned returns after discharge.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, topAlert
        ? `${topAlert.action} Monitor ${topAlert.followUp}. AI does not decide medical readiness.`
        : `Review ${longest.id} long-stay lists and the ~${view.readyNotDischarged} ready-but-not-discharged patients with the care team. AI does not decide medical readiness.`, topAlert?.action ?? 'راجع قوائم الإقامة الطويلة.'),
      role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
      benefit: tx(lang, topAlert?.consequence ?? 'Clearing confirmed discharge barriers and long stays frees census without claiming bed-occupancy ownership.', 'إزالة عوائق الخروج تحرر التعداد.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Inpatient care at ${name} · ${view.periodLabel}`, `رعاية التنويم في ${name} · ${view.periodLabel}`),
    observation: tx(lang, `Admissions ${view.admissions.toLocaleString('en-US')} · median stay ${view.losMedian.toFixed(1)} days · ready-but-not-discharged ~${view.readyNotDischarged} · 30-day returns ~${(view.readmit30 * 100).toFixed(1)}%.`, `القبول ${view.admissions.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Discharges ${view.discharges.toLocaleString('en-US')}, deaths ${view.deaths.toLocaleString('en-US')} in ${view.periodLabel}. Census ${view.census} is a patient count (${view.censusBasis}), not a bed occupancy rate.${periodNote}`, `الخروج ${view.discharges.toLocaleString('en-US')}.`),
    explanation: tx(lang, 'Potential reasons (not proven): LOS, discharge delays, and returns describe inpatient flow together. Bed occupancy remains a Beds measure.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, `Review ${longest.id} long stays on Stay & Discharge, then returns and documentation on Care Progress & Outcomes.`, 'راجع الإقامات الطويلة ثم العودة والتوثيق.'),
    role: tx(lang, 'Inpatient operations lead', 'قائد عمليات التنويم'),
    benefit: tx(lang, 'Coordinated inpatient review improves discharge readiness without AI deciding readiness alone.', 'مراجعة تنويم منسقة تحسّن جاهزية الخروج دون أن يقرر الذكاء الاصطناعي وحده.'),
  });
}

function answerOutpatient(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildOpdView(hospital, year, period);
  const longestWait = [...view.specialties].sort((a, b) => b.waitMedian - a.waitMedian)[0];
  const highestDemand = [...view.specialties].sort((a, b) => b.visits - a.visits)[0];
  const mostActions = [...view.specialties].sort((a, b) => b.pendingActions - a.pendingActions)[0];

  if (/\bed\b|emergency|boarding|inpatient|bed occupancy|no-show|slot fill|appointment cancel/.test(q) && !/outpatient|clinic|follow-up|referral|documentation|waiting|consultation/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Outpatient focus', 'خارج تركيز العيادات الخارجية'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'ED waiting stays in Emergency. Inpatient LOS stays in Inpatient. Bed occupancy stays in Beds. Booking no-shows stay outside OPD.', 'انتظار الطوارئ في الطوارئ. إقامة التنويم في التنويم. إشغال الأسرة في الأسرة.'),
      explanation: tx(lang, 'OPD owns clinic operations and care activity for attended visits.', 'العيادات الخارجية تملك تشغيل العيادات ونشاط الرعاية للزيارات المنفذة.'),
      action: tx(lang, 'Stay on Outpatient screens for clinic waiting, completion, and follow-up questions.', 'ابقَ في شاشات العيادات الخارجية لأسئلة الانتظار والإكمال والمتابعة.'),
      role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/longest wait|waiting time|wait|delay|late start|on-time|cycle time/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Clinic waiting · ${name} · ${view.periodLabel}`, `انتظار العيادة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Median arrival-to-provider ${view.waitMedian.toFixed(1)} min · P90 ${view.waitP90.toFixed(1)} · longest specialty ${longestWait.id} at ${longestWait.waitMedian.toFixed(1)} min · ${view.exceedingWait.toLocaleString('en-US')} visits over the ${view.waitThresholdMin}-minute line.`, `وسيط الوصول-للمقدم ${view.waitMedian.toFixed(1)} دقيقة.`),
      evidence: tx(lang, `On-time start ${((view.onTimeStartRate) * 100).toFixed(1)}% · delayed sessions ${view.delayedSessions.toLocaleString('en-US')} · cycle median ${view.cycleMedian.toFixed(1)} min (wait + consult ${view.consultDuration.toFixed(1)}).`, `بداية في الوقت ${((view.onTimeStartRate) * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): morning start slip, uneven specialty demand, and walk-in peaks. Waiting is not consultation duration.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review Waiting time by specialty and Delay contribution by clinic, starting with ${longestWait.id}.`, `راجع انتظار التخصصات ومساهمة التأخير بدءاً من ${longestWait.id}.`),
      role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
      benefit: tx(lang, 'Shorter waits protect completion and on-time starts without assuming lower care quality.', 'انتظار أقصر يحمي الإكمال والبداية في الوقت.'),
    });
  }

  if (/demand|volume|specialt|busiest|visits/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Outpatient demand · ${name} · ${view.periodLabel}`, `طلب العيادات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `${view.visits.toLocaleString('en-US')} attended visits · highest specialty ${highestDemand.id} with ${highestDemand.visits.toLocaleString('en-US')} visits · utilization ${((view.sessionUtilization) * 100).toFixed(1)}%.`, `${view.visits.toLocaleString('en-US')} زيارة.`),
      evidence: tx(lang, `New ${view.newVisits.toLocaleString('en-US')} · follow-up ${view.followUpVisits.toLocaleString('en-US')} · completion ${((view.completionRate) * 100).toFixed(1)}%. Attended cohort excludes booking no-shows.`, `جديد ${view.newVisits.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Potential reasons (not proven): specialty schedule mix and walk-in share shape demand. This is not an appointments fill dashboard.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review Visits by clinical specialty and Clinic session utilization by specialty, focusing on ${highestDemand.id}.`, `راجع زيارات التخصصات واستخدام الجلسات مع التركيز على ${highestDemand.id}.`),
      role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
      benefit: tx(lang, 'Matching session capacity to specialty demand reduces waiting pressure.', 'مواءمة سعة الجلسات مع الطلب تقلل ضغط الانتظار.'),
    });
  }

  if (/unplanned|return rate|return share/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Unplanned outpatient return · ${name} · ${view.periodLabel}`, `عودة العيادات غير المخططة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Illustrative unplanned return share ${((view.unplannedReturnRate) * 100).toFixed(1)}% (~${view.unplannedReturns.toLocaleString('en-US')} of ${view.completed.toLocaleString('en-US')} completed consultations).`, `حصة عودة توضيحية ${((view.unplannedReturnRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, 'This is a fixed scenario share. Visits are not linked patient-by-patient. Genuine returns or causes were not detected.', 'حصة سيناريو ثابتة. الزيارات غير مربوطة بالمريض.'),
      explanation: tx(lang, 'Potential reasons (not proven) are not offered as confirmed clinical causes.', 'لا تُعرض أسباب مؤكدة.'),
      action: tx(lang, 'Treat this card as an illustrative watch signal only. Do not manage individual patients from it.', 'عامل البطاقة كإشارة مراقبة توضيحية فقط.'),
      role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
      benefit: tx(lang, 'Honest disclosure protects decision quality.', 'الإفصاح الصادق يحمي جودة القرار.'),
    });
  }

  if (/complet|incomplete|document|referral|follow-up|action|outstanding|priorit/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Outpatient' && alert.severity !== 'info');
    const topAlert = hot[0];
    return pack(lang, {
      title: tx(lang, `OPD Director priorities · ${name} · ${view.periodLabel}`, `أولويات مدير العيادات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, topAlert
        ? `${topAlert.title}: ${topAlert.observed}`
        : `Completion ${((view.completionRate) * 100).toFixed(1)}% · documentation ${((view.docCompletionRate) * 100).toFixed(1)}% · pending referrals ${view.pendingReferrals.toLocaleString('en-US')} · outstanding actions ${view.outstandingActions.toLocaleString('en-US')} (most in ${mostActions.id}).`, topAlert ? topAlert.title : `الإكمال ${((view.completionRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Follow-up coordination ${((view.followUpCoordRate) * 100).toFixed(1)}% · unplanned return share ${((view.unplannedReturnRate) * 100).toFixed(1)}% (illustrative scenario share only — not patient-linked returns or confirmed causes). Alert evidence uses full-year figures when the dashboard period is a quarter.`, `تنسيق المتابعة ${((view.followUpCoordRate) * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): documentation backlog and open referrals accumulate after busy clinic days. Drivers are hypotheses.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, topAlert?.action ?? `Clear pending referrals and outstanding actions starting with ${mostActions.id}, then re-check documentation completion.`, topAlert?.action ?? `أغلق الإحالات والإجراءات المفتوحة بدءاً من ${mostActions.id}.`),
      role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
      benefit: tx(lang, topAlert?.consequence ?? 'Closing follow-up gaps improves coordination without inventing clinical findings.', 'إغلاق فجوات المتابعة يحسّن التنسيق.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Outpatient care at ${name} · ${view.periodLabel}`, `رعاية العيادات في ${name} · ${view.periodLabel}`),
    observation: tx(lang, `Visits ${view.visits.toLocaleString('en-US')} · median wait ${view.waitMedian.toFixed(1)} min · completion ${((view.completionRate) * 100).toFixed(1)}% · pending referrals ${view.pendingReferrals.toLocaleString('en-US')}.`, `الزيارات ${view.visits.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Highest demand ${highestDemand.id}. Longest wait ${longestWait.id}. Consultation duration ${view.consultDuration.toFixed(1)} min is separate from waiting.`, `أعلى طلب ${highestDemand.id}.`),
    explanation: tx(lang, 'Potential reasons (not proven): demand, waiting, and follow-up backlog move together in clinic operations.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, 'Review Overview demand charts, then Waiting & Patient Flow delays, then Quality follow-up actions.', 'راجع نظرة الطلب ثم تأخير الانتظار ثم إجراءات الجودة.'),
    role: tx(lang, 'Outpatient operations lead', 'قائد عمليات العيادات الخارجية'),
    benefit: tx(lang, 'A sequenced OPD review keeps waiting, throughput, and follow-up visible without duplicating other domains.', 'مراجعة عيادات متسلسلة تبقي الانتظار والتدفق والمتابعة واضحة.'),
  });
}

function answerAppointments(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildAppointmentView(hospital, year, period);
  const hotNoShow = [...view.specialties].sort((a, b) => b.noShowRate - a.noShowRate)[0];
  const hotAccess = [...view.specialties].sort((a, b) => b.accessPressure - a.accessPressure)[0];
  const hotLead = [...view.specialties].sort((a, b) => b.leadMedian - a.leadMedian)[0];
  const hotRecover = [...view.specialties].sort((a, b) => b.unfilledReleased - a.unfilledReleased)[0];

  if (/\bed\b|emergency|boarding|inpatient los|bed occupancy|arrival-to-provider|clinic wait|documentation completion|pending referral/.test(q)
    && !/appointment|no-?show|slot|lead time|waitlist|schedul|cancel|recover|book/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Appointments focus', 'خارج تركيز المواعيد'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'ED waiting stays in Emergency. Inpatient LOS stays in Inpatient. Bed occupancy stays in Beds. Clinic arrival-to-provider waiting stays in Outpatient.', 'انتظار الطوارئ في الطوارئ. الإقامة في التنويم. الإشغال في الأسرة. انتظار العيادة في العيادات الخارجية.'),
      explanation: tx(lang, 'Appointments owns booking demand, attendance outcomes, access openings, and slot recovery — not clinic cycle time after arrival.', 'المواعيد تملك الطلب والحضور والوصول واسترداد الفترات.'),
      action: tx(lang, 'Stay on Appointments screens for scheduling, no-show, lead time, and recovery questions.', 'ابقَ في شاشات المواعيد لأسئلة الجدولة والغياب ومهلة الحجز والاسترداد.'),
      role: tx(lang, 'Outpatient access manager', 'مدير وصول العيادات الخارجية'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/no-?show/.test(q)) {
    return pack(lang, {
      title: tx(lang, `No-show intelligence · ${name} · ${view.periodLabel}`, `ذكاء الغياب · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `No-show rate ${((view.noShowRate) * 100).toFixed(1)}% (${view.noShow.toLocaleString('en-US')} of ${view.booked.toLocaleString('en-US')} booked) · highest specialty ${hotNoShow.id} at ${((hotNoShow.noShowRate) * 100).toFixed(1)}%.`, `معدل الغياب ${((view.noShowRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Attendance ${((view.attendanceRate) * 100).toFixed(1)}% · lost booked slots ${view.lostBookedSlots.toLocaleString('en-US')} (no-shows + late cancels) · reminder coverage ${((view.reminderCoverage) * 100).toFixed(1)}%. Outcomes partition: attended + cancelled + no-show = booked.`, `الحضور ${((view.attendanceRate) * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): longer booking lead bands show a higher constructed no-show tilt; reminder gaps may leave capacity unprotected. Not demographic risk scoring.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Raise reminder coverage and confirmation pathways for ${hotNoShow.id} before adding clinic sessions.`, `ارفع تغطية التذكير لـ ${hotNoShow.id} قبل إضافة جلسات.`),
      role: tx(lang, 'Outpatient access manager', 'مدير وصول العيادات الخارجية'),
      benefit: tx(lang, 'Lower no-shows recover attended visits without claiming new capacity was created.', 'خفض الغياب يسترد زيارات دون ادعاء سعة جديدة.'),
    });
  }

  if (/lead time|waiting longer|access|third next|tna|pressure|causing/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Appointment access & capacity · ${name} · ${view.periodLabel}`, `الوصول وسعة المواعيد · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Median Booking Lead Time ${view.leadMedian.toFixed(1)} days · P90 ${view.leadP90.toFixed(1)} · Third Next Available ${view.thirdNextAvailable} days (observation ${view.observationDate}) · highest pressure ${hotAccess.id}.`, `وسيط مهلة الحجز ${view.leadMedian.toFixed(1)} يوماً.`),
      evidence: tx(lang, `Longest lead specialty ${hotLead.id} at ${hotLead.leadMedian.toFixed(1)} days · Bookable Slots ${view.slots.toLocaleString('en-US')} · Booked ${view.booked.toLocaleString('en-US')} · Slot Fill Rate ${((view.slotFillRate) * 100).toFixed(1)}% · Capacity Shortfall ${view.capacityShortfall.toLocaleString('en-US')}. Lead time is not OPD clinic waiting after arrival.`, `أطول مهلة ${hotLead.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): specialty template imbalance and demand above bookable slots stretch openings. Third-next uses ordered illustrative openings, not average wait × 3.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review Booking Lead Time by Specialty and Third Next Available by Specialty, starting with ${hotAccess.id}, then redistribute openings under conserved total capacity.`, `راجع مهلة الحجز والموعد الثالث المتاح بدءاً من ${hotAccess.id}.`),
      role: tx(lang, 'Clinic scheduling lead', 'قائد جدولة العيادات'),
      benefit: tx(lang, 'Shorter access waits protect attendance without inventing clinical causes.', 'وصول أقصر يحمي الحضور دون اختلاق أسباب سريرية.'),
    });
  }

  if (/unused|unbooked|fill rate|unfilled|waitlist|capacity/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Unused appointment capacity · ${name} · ${view.periodLabel}`, `سعة المواعيد غير المستخدمة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Unbooked Slots ${view.unbookedSlots.toLocaleString('en-US')} of ${view.slots.toLocaleString('en-US')} bookable · Slot Fill Rate ${((view.slotFillRate) * 100).toFixed(1)}% · Unscheduled Demand ${view.waitlistDemand.toLocaleString('en-US')} · Next 7-Day Open Slots ${view.next7DayOpenSlots.toLocaleString('en-US')} (after ${view.observationDate}).`, `الفترات غير المحجوزة ${view.unbookedSlots.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Booked ${view.booked.toLocaleString('en-US')} never exceeds bookable slots. Eligible Waitlist Candidates ${view.eligibleWaitlist.toLocaleString('en-US')}. Period unbooked capacity is distinct from future open-slot sketches.`, `المحجوز ${view.booked.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Potential reasons (not proven): template gaps and incomplete waitlist outreach leave openings idle while demand waits.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Activate eligible waitlist outreach for unbooked and unfilled released slots before approving new sessions.', 'فعّل تواصل قائمة الانتظار للفترات غير المحجوزة والمحررة قبل اعتماد جلسات جديدة.'),
      role: tx(lang, 'Clinic scheduling lead', 'قائد جدولة العيادات'),
      benefit: tx(lang, 'Filling unused slots converts existing capacity into attended visits.', 'ملء الفترات غير المستخدمة يحوّل السعة الحالية إلى زيارات.'),
    });
  }

  if (/recover|cancell|released|rebook/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Slot recovery · ${name} · ${view.periodLabel}`, `استرداد الفترات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Released ${view.releasedSlots.toLocaleString('en-US')} · Rebooked ${view.recoveredSlots.toLocaleString('en-US')} (${((view.recoveryRate) * 100).toFixed(1)}% of eligible ${view.eligibleReleasedSlots.toLocaleString('en-US')}) · Unfilled Released ${view.unfilledReleasedSlots.toLocaleString('en-US')} · late cancellations ${view.lateCancellations.toLocaleString('en-US')}.`, `المحرر ${view.releasedSlots.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Largest unfilled released specialty ${hotRecover.id}. Potential Rebooking Opportunities ${view.potentialRebookingOpportunities.toLocaleString('en-US')}. A slot counts as recovered only when rebooked — no-shows do not release early.`, `أكبر فجوة استرداد ${hotRecover.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): late-cancel cutoffs and slow waitlist contact leave released slots empty.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Recover late-cancelled openings in ${hotRecover.id} via eligible waitlist outreach under approved policy.`, `استرد الفترات الملغاة متأخراً في ${hotRecover.id} عبر قائمة الانتظار.`),
      role: tx(lang, 'Outpatient access manager', 'مدير وصول العيادات الخارجية'),
      benefit: tx(lang, 'Rebooked released slots protect fill without adding clinic sessions.', 'الفترات المستردة تحمي الملء دون إضافة جلسات.'),
    });
  }

  if (/priorit|action|recommend|schedul|manager/.test(q)) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Appointments' && alert.severity !== 'info');
    const topAlert = hot[0];
    return pack(lang, {
      title: tx(lang, `Scheduling priorities · ${name} · ${view.periodLabel}`, `أولويات الجدولة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, topAlert
        ? `${topAlert.title}: ${topAlert.observed}`
        : `No-show Rate ${((view.noShowRate) * 100).toFixed(1)}% · Slot Fill Rate ${((view.slotFillRate) * 100).toFixed(1)}% · Median Booking Lead Time ${view.leadMedian.toFixed(1)} days · Unfilled Released ${view.unfilledReleasedSlots.toLocaleString('en-US')}.`, topAlert ? topAlert.title : `الغياب ${((view.noShowRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Focus specialties: no-show ${hotNoShow.id}, access ${hotAccess.id}, recovery ${hotRecover.id}. Alert evidence uses full-year figures when the dashboard period is a quarter.`, `تخصصات التركيز: غياب ${hotNoShow.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): reminder gaps, template imbalance, and incomplete recovery pathways. Drivers are hypotheses.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, topAlert?.action ?? `Prioritize reminder coverage for ${hotNoShow.id}, waitlist fill for unbooked slots, and recovery of late cancels in ${hotRecover.id}.`, topAlert?.action ?? `أعطِ أولوية للتذكير والملء والاسترداد.`),
      role: tx(lang, 'Outpatient access manager', 'مدير وصول العيادات الخارجية'),
      benefit: tx(lang, topAlert?.consequence ?? 'Sequenced scheduling actions protect access and attendance without inventing capacity.', 'إجراءات جدولة متسلسلة تحمي الوصول والحضور.'),
    });
  }

  return pack(lang, {
    title: tx(lang, `Appointments & scheduling at ${name} · ${view.periodLabel}`, `المواعيد والجدولة في ${name} · ${view.periodLabel}`),
    observation: tx(lang, `Booked ${view.booked.toLocaleString('en-US')} · attended ${view.attended.toLocaleString('en-US')} (matches OPD ${view.opdAttended.toLocaleString('en-US')}) · no-show ${((view.noShowRate) * 100).toFixed(1)}% · fill ${((view.slotFillRate) * 100).toFixed(1)}%.`, `المحجوز ${view.booked.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Attended + cancelled + no-show = booked. ${view.integrationNote}`, `الحضور + الإلغاء + الغياب = المحجوز.`),
    explanation: tx(lang, 'Potential reasons (not proven): demand, access waits, and attendance loss move together in scheduling operations.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, 'Review Command outcomes, then Access openings, then Attendance losses, then Recovery actions.', 'راجع نتائج القيادة ثم وصول الوصول ثم خسائر الحضور ثم إجراءات الاسترداد.'),
    role: tx(lang, 'Outpatient access manager', 'مدير وصول العيادات الخارجية'),
    benefit: tx(lang, 'A sequenced Appointments review keeps booking, access, attendance, and recovery visible without duplicating OPD clinic waiting.', 'مراجعة مواعيد متسلسلة تبقي الحجز والوصول والحضور والاسترداد واضحة.'),
  });
}

function answerSurgery(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildSurgeryView(hospital, year, period);
  const hotBacklog = [...view.specialties].sort((a, b) => b.backlog - a.backlog)[0];
  const hotWait = [...view.specialties].sort((a, b) => b.medianWait - a.medianWait)[0];
  const lowUtil = [...view.rooms].sort((a, b) => a.utilization - b.utilization)[0];
  const hotCancel = [...view.specialties].sort((a, b) => b.cancelled - a.cancelled)[0];

  if (/\bed\b|emergency boarding|bed occupancy|appointment no-?show|slot fill|clinic wait|arrival-to-provider|inpatient los/.test(q)
    && !/surg|theatre|or util|turnover|first.?case|backlog|cancel|checklist|complication/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Surgery focus', 'خارج تركيز الجراحة'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'Bed Occupancy stays in Beds. Appointment Slot Fill stays in Appointments. Clinic waiting stays in Outpatient. ED flow stays in Emergency.', 'إشغال الأسرة في الأسرة. ملء المواعيد في المواعيد. انتظار العيادة في العيادات الخارجية.'),
      explanation: tx(lang, 'Surgery owns theatre activity, OR utilization, elective surgical wait, and illustrative safety process signals.', 'الجراحة تملك نشاط غرف العمليات والاستخدام والانتظار الجراحي وإشارات السلامة.'),
      action: tx(lang, 'Stay on Surgery screens for volume, OR hours, backlog, quality, and capacity recovery questions.', 'ابقَ في شاشات الجراحة.'),
      role: tx(lang, 'Theatre lead', 'قائد غرف العمليات'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/backlog|waiting list|largest backlog|access delay|wait/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Surgical access & backlog · ${name} · ${view.periodLabel}`, `الوصول والطابور الجراحي · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Closing elective backlog ${view.closingBacklog.toLocaleString('en-US')} · median wait ${view.medianWaitDays.toFixed(1)} days · overdue ${view.overdueCases.toLocaleString('en-US')} beyond ${view.waitTargetDays}-day target · largest backlog ${hotBacklog.id}.`, `الطابور ${view.closingBacklog.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Opening ${view.openingBacklog.toLocaleString('en-US')} + added ${view.addedToWaitlist.toLocaleString('en-US')} − completed from waitlist ${view.completedFromWaitlist.toLocaleString('en-US')} − other exits ${view.otherExits.toLocaleString('en-US')} = closing backlog. Longest wait specialty ${hotWait.id} (${hotWait.medianWait.toFixed(1)} days). Emergency cases do not enter elective backlog.`, `أطول انتظار ${hotWait.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): elective demand above completed elective throughput and specialty template imbalance. Waiting time alone is not clinical urgency.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Prioritize openings for ${hotBacklog.id} overdue cases and review Demand vs Capacity on Surgical Access & Backlog.`, `أعطِ أولوية لـ ${hotBacklog.id}.`),
      role: tx(lang, 'Surgical services lead', 'قائد الخدمات الجراحية'),
      benefit: tx(lang, 'Clear backlog ownership focuses elective capacity where waits accumulate.', 'ملكية الطابور الواضحة تركز السعة الانتخابية.'),
    });
  }

  if (/losing|unused|utiliz|or hour|turnover|late start|first.?case|delay/.test(q)) {
    return pack(lang, {
      title: tx(lang, `OR hours & schedule reliability · ${name} · ${view.periodLabel}`, `ساعات غرف العمليات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `OR Utilization ${((view.orUtilization) * 100).toFixed(1)}% (${view.usedHours.toLocaleString('en-US')} used of ${view.staffedHours.toLocaleString('en-US')} staffed) · unused ${view.unusedHours.toLocaleString('en-US')} h · late starts ${view.lateStartHours.toLocaleString('en-US')} h · first-case on-time ${((view.firstCaseOnTimeRate) * 100).toFixed(1)}% · lowest room ${lowUtil.id} at ${((lowUtil.utilization) * 100).toFixed(1)}%.`, `الاستخدام ${((view.orUtilization) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Median turnover ${view.medianTurnoverMin} min · overtime ${view.overtimeHours.toLocaleString('en-US')} h. Utilization = (procedure + turnover) ÷ staffed hours.`, `التدوير الوسيط ${view.medianTurnoverMin} د.`),
      explanation: tx(lang, 'Potential reasons (not proven): late first cases, extended turnover, and same-day cancellation gaps leave staffed hours unused.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Start with first-case reliability and turnover on ${lowUtil.id}, then review Recoverable Hours by Driver.`, `ابدأ بموعد الحالة الأولى على ${lowUtil.id}.`),
      role: tx(lang, 'Theatre lead', 'قائد غرف العمليات'),
      benefit: tx(lang, 'Recovering staffed hours raises throughput without claiming new theatres.', 'استرداد الساعات المجهزة يرفع الإنتاجية دون ادعاء غرف جديدة.'),
    });
  }

  if (/quality|return|complication|checklist|infection|safety|deteriorat/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Surgical quality & safety · ${name} · ${view.periodLabel}`, `جودة وسلامة الجراحة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Unplanned OR returns ${((view.unplannedReturnRate) * 100).toFixed(1)}% · complications ${((view.complicationRate) * 100).toFixed(1)}% · checklist ${((view.checklistRate) * 100).toFixed(1)}% · infection flags ${((view.infectionRate) * 100).toFixed(1)}%.`, `العودة غير المخططة ${((view.unplannedReturnRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Denominators are ${view.completed.toLocaleString('en-US')} completed cases. ${view.qualityOverlapNote}`, `المقام ${view.completed.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Illustrative synthetic flags — not validated clinical evidence and not patient-level treatment advice.', 'إشارات اصطناعية توضيحية — ليست دليلاً سريرياً موثقاً.'),
      action: tx(lang, 'Pair Checklist Completion with Unplanned Returns Trend and Safety Events by Type before changing clinical pathways.', 'اربط اكتمال القائمة مع اتجاه العودة والأحداث.'),
      role: tx(lang, 'Surgical quality lead', 'قائد جودة الجراحة'),
      benefit: tx(lang, 'Separating process compliance from outcome flags prevents false summing of overlapping events.', 'فصل الامتثال عن نتائج السلامة يمنع الجمع الخاطئ.'),
    });
  }

  if (/additional|capacity|recoverable|extra case|throughput|optimization/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Surgical capacity optimization · ${name} · ${view.periodLabel}`, `تحسين سعة الجراحة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Recoverable OR Hours ${view.recoverableOrHours.toLocaleString('en-US')} · feasible Additional Cases ${view.additionalCases.toLocaleString('en-US')} · capacity gain ${view.capacityGainHours.toFixed(1)} h (${view.scenarioImprovementPct.toFixed(1)}% of staffed).`, `ساعات قابلة للاسترداد ${view.recoverableOrHours.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Eligible backlog ${view.eligibleBacklogCases.toLocaleString('en-US')} · bed haircut ${((view.bedConstrainedShare) * 100).toFixed(0)}% (${view.bedConstrainedHours.toLocaleString('en-US')} h) · bed occ context ${((view.bedOccupancyContext) * 100).toFixed(1)}% (Beds-owned). Exclusive drivers — bed applied once as haircut.`, `الطابور المؤهل ${view.eligibleBacklogCases.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Estimates are illustrative. Not all recovered hours become cases; bed and staffing constraints remain.', 'التقديرات توضيحية.'),
      action: tx(lang, `Sequence first-case improvement, turnover reduction, and same-day cancel prevention before adding elective slots for ${hotBacklog.id}.`, `رتّب تحسين البداية والتدوير وتقليل الإلغاء لـ ${hotBacklog.id}.`),
      role: tx(lang, 'Theatre lead', 'قائد غرف العمليات'),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating achievable surgical throughput.', 'السيناريوهات المقيدة تمنع المبالغة في الإنتاجية.'),
    });
  }

  if (/cancel/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Surgical cancellations · ${name} · ${view.periodLabel}`, `إلغاءات الجراحة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Cancelled ${view.cancelled.toLocaleString('en-US')} of ${view.scheduled.toLocaleString('en-US')} (${((view.cancellationRate) * 100).toFixed(1)}%) · same-day ${view.sameDayCancels.toLocaleString('en-US')} (${((view.sameDayCancelRate) * 100).toFixed(1)}% of scheduled) · highest cancel specialty ${hotCancel.id}.`, `الملغى ${view.cancelled.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Top cancel reasons include bed holds (${view.bedRelatedCancels.toLocaleString('en-US')}). Completed + Cancelled = Scheduled.`, `حجوزات الأسرة ${view.bedRelatedCancels.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Potential reasons (not proven): postoperative bed unavailability, earlier OR overrun, and staffing gaps. Clinical cancellations stay clinical.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review Recoverable Hours by Driver and bed-related cancel pathways with Bed Manager — without duplicating Bed Occupancy as a Surgery KPI.`, `راجع الساعات القابلة للاسترداد مع مدير الأسرة.`),
      role: tx(lang, 'Theatre lead', 'قائد غرف العمليات'),
      benefit: tx(lang, 'Avoidable operational cancels protect completed case volume.', 'الإلغاءات التشغيلية التي يمكن تجنبها تحمي الحالات المكتملة.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Surgery' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `OR & Surgery at ${name} · ${view.periodLabel}`, `غرف العمليات والجراحة في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Completed ${view.completed.toLocaleString('en-US')} · OR util ${((view.orUtilization) * 100).toFixed(1)}% · backlog ${view.closingBacklog.toLocaleString('en-US')} · same-day cancel ${((view.sameDayCancelRate) * 100).toFixed(1)}%.`, topAlert ? topAlert.title : `المكتمل ${view.completed.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Completed + Cancelled = Scheduled. ${view.methodology.orUtilization} ${view.methodology.waitClock}`, `المكتمل + الملغى = المجدول.`),
    explanation: tx(lang, 'Potential reasons (not proven): schedule reliability, elective access pressure, and bed-constrained recovery pathways move together.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command volume, OR hours, Access backlog (${hotBacklog.id}), then Capacity Optimization.`, topAlert?.action ?? `راجع الحجم وساعات غرف العمليات والطابور.`),
    role: tx(lang, 'Theatre lead', 'قائد غرف العمليات'),
    benefit: tx(lang, 'A sequenced Surgery review keeps volume, OR efficiency, access, quality, and capacity distinct.', 'مراجعة جراحية متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerRadiology(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildRadiologyView(hospital, year, period);
  const hotWait = [...view.modalities].sort((a, b) => b.medianWait - a.medianWait)[0];
  const hotBacklog = [...view.modalities].sort((a, b) => b.backlog - a.backlog)[0];
  const hotTat = [...view.modalities].sort((a, b) => b.reportTatHours - a.reportTatHours)[0];
  const hotRepeat = [...view.modalities].sort((a, b) => b.repeats - a.repeats)[0];
  const lowUtil = [...view.scanners].sort((a, b) => a.utilization - b.utilization)[0];
  const topDown = [...view.downtimeReasons].sort((a, b) => b.hours - a.hours)[0];

  if (/\bed\b|emergency boarding|bed occupancy|appointment no-?show|slot fill|clinic wait|or util|surgical backlog|first.?case/.test(q)
    && !/radiolog|imaging|scanner|mri|report tat|unsigned|repeat exam/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Radiology focus', 'خارج تركيز الأشعة'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'Bed Occupancy stays in Beds. OR Utilization stays in Surgery. Appointment Slot Fill stays in Appointments. ED flow stays in Emergency.', 'إشغال الأسرة في الأسرة. استخدام غرف العمليات في الجراحة.'),
      explanation: tx(lang, 'Radiology owns imaging demand, access waits, scanner utilization, report TAT, and feasible imaging capacity recovery.', 'الأشعة تملك الطلب والوصول واستخدام الأجهزة وتقارير الأشعة.'),
      action: tx(lang, 'Stay on Radiology screens for imaging demand, access, scanners, reporting, and capacity questions.', 'ابقَ في شاشات الأشعة.'),
      role: tx(lang, 'Imaging operations lead', 'قائد عمليات التصوير'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/access wait|longest wait|wait time by modality|overdue imaging|waitlist|backlog/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Imaging access & waitlist · ${name} · ${view.periodLabel}`, `وصول التصوير والطابور · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Closing imaging backlog ${view.closingBacklog.toLocaleString('en-US')} · median access wait ${view.medianAccessWaitDays.toFixed(1)} days · P90 ${view.p90AccessWaitDays.toFixed(1)} · overdue ${view.overdueImaging.toLocaleString('en-US')} · longest wait ${hotWait.id} (${hotWait.medianWait.toFixed(1)} days).`, `الطابور ${view.closingBacklog.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Opening ${view.openingBacklog.toLocaleString('en-US')} + added ${view.addedToWaitlist.toLocaleString('en-US')} − completed from waitlist ${view.completedFromWaitlist.toLocaleString('en-US')} − other exits ${view.otherExits.toLocaleString('en-US')} = closing. Largest backlog ${hotBacklog.id}. Access clock is request-to-exam — not report TAT.`, `أطول انتظار ${hotWait.id}.`),
      explanation: tx(lang, 'Potential reasons (not proven): routine demand above completed waitlist throughput and modality template imbalance. Waiting time alone is not clinical urgency.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Prioritize recovered openings for ${hotWait.id} overdue cases and review Access Wait bands on Imaging Access & Waitlist.`, `أعطِ أولوية لـ ${hotWait.id}.`),
      role: tx(lang, 'Imaging access lead', 'قائد وصول التصوير'),
      benefit: tx(lang, 'Clear backlog ownership focuses imaging capacity where waits accumulate.', 'ملكية الطابور الواضحة تركز سعة التصوير.'),
    });
  }

  if (/utiliz|unused|downtime|scanner|exam duration|schedule adher/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Scanner utilization & scheduling · ${name} · ${view.periodLabel}`, `استخدام أجهزة التصوير · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Scanner Utilization ${((view.scannerUtilization) * 100).toFixed(1)}% (${view.usedHours.toLocaleString('en-US')} used of ${view.staffedHours.toLocaleString('en-US')} staffed) · unused ${view.unusedHours.toLocaleString('en-US')} h · downtime ${view.downtimeHours.toLocaleString('en-US')} h · lowest scanner ${lowUtil.id} at ${((lowUtil.utilization) * 100).toFixed(1)}%.`, `الاستخدام ${((view.scannerUtilization) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Median exam ${view.medianExamMin} min · schedule adherence ${((view.scheduleAdherence) * 100).toFixed(1)}% · top downtime reason ${topDown.name} (${topDown.hours.toLocaleString('en-US')} h). Staffed = in-session used + downtime + unused.`, `توقف ${topDown.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): downtime, late starts, and modality duration mix leave staffed hours unused. Scanner utilization is not staff utilization.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Start with downtime recovery on ${lowUtil.id} and ${topDown.name}, then review Recoverable Hours by Driver.`, `ابدأ باسترداد التوقف على ${lowUtil.id}.`),
      role: tx(lang, 'Imaging operations lead', 'قائد عمليات التصوير'),
      benefit: tx(lang, 'Recovering staffed scanner hours raises throughput without claiming new equipment.', 'استرداد ساعات الأجهزة يرفع الإنتاجية دون ادعاء أجهزة جديدة.'),
    });
  }

  if (/report|unsigned|tat|turnaround|critical|repeat/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Reporting & imaging quality · ${name} · ${view.periodLabel}`, `التقارير وجودة التصوير · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Completed exams ${view.completed.toLocaleString('en-US')} · signed reports ${view.signedReports.toLocaleString('en-US')} · Median Report TAT ${view.medianReportTatHours.toFixed(1)} h · unsigned ${view.unsignedReports.toLocaleString('en-US')} · critical ack ${((view.criticalAckRate) * 100).toFixed(1)}% · critical delay ${((view.criticalDelayRate) * 100).toFixed(1)}% (${view.criticalPendingAck.toLocaleString('en-US')} pending) · longest TAT ${hotTat.id}.`, `زمن التقرير ${view.medianReportTatHours.toFixed(1)} س.`),
      evidence: tx(lang, `${view.methodology.reportTat} ${view.methodology.critical} Highest repeat modality ${hotRepeat.id} (${hotRepeat.repeats.toLocaleString('en-US')} repeats; technical ${view.technicalRepeats.toLocaleString('en-US')} · clinical/protocol ${view.clinicalRepeats.toLocaleString('en-US')}).`, `أعلى تكرار ${hotRepeat.id}.`),
      explanation: tx(lang, 'Illustrative synthetic quality signals — not diagnostic accuracy claims and not patient-level treatment advice. Not every repeat is a quality failure. Ack rate is not a delay rate.', 'إشارات اصطناعية توضيحية — ليست دقة تشخيصية.'),
      action: tx(lang, 'Clear oldest unsigned aging bands, close pending critical acknowledgements, and pair Repeat Exams by Modality with protocol review before changing scanner schedules.', 'أغلق أقدم التقارير غير الموقعة وراجع التكرار.'),
      role: tx(lang, 'Imaging quality lead', 'قائد جودة التصوير'),
      benefit: tx(lang, 'Separating exam completion, report signature, and critical acknowledgement keeps management actions correctly targeted.', 'فصل إكمال الفحص وتوقيع التقرير والإقرار الحرج يوجه الإجراءات بشكل صحيح.'),
    });
  }

  if (/additional|capacity|recoverable|feasible|optimization|priorit/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Imaging capacity optimization · ${name} · ${view.periodLabel}`, `تحسين سعة التصوير · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Recoverable Hours ${view.recoverableHours.toLocaleString('en-US')} · feasible Additional Exams ${view.additionalExams.toLocaleString('en-US')} · eligible waitlist ${view.eligibleWaitlist.toLocaleString('en-US')} · access gain ${view.accessGainPct.toFixed(1)}% of staffed (illustrative).`, `ساعات قابلة للاسترداد ${view.recoverableHours.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Bed haircut ${((view.bedConstrainedShare) * 100).toFixed(0)}% (${view.bedConstrainedHours.toLocaleString('en-US')} h) · bed occ context ${((view.bedOccupancyContext) * 100).toFixed(1)}% (Beds-owned). Exclusive drivers — bed applied once. Theoretical opportunity is not achieved capacity.`, `الطابور المؤهل ${view.eligibleWaitlist.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'Estimates are illustrative. Not all recovered hours become exams; staffing and bed constraints remain.', 'التقديرات توضيحية.'),
      action: tx(lang, `Sequence downtime recovery, MRI duration discipline, and eligible backlog prioritization for ${hotBacklog.id} before extending unstaffed sessions.`, `رتّب استرداد التوقف ومدة MRI والطابور لـ ${hotBacklog.id}.`),
      role: tx(lang, 'Imaging operations lead', 'قائد عمليات التصوير'),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating achievable imaging throughput.', 'السيناريوهات المقيدة تمنع المبالغة في الإنتاجية.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Radiology' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Radiology at ${name} · ${view.periodLabel}`, `الأشعة في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Requests ${view.requests.toLocaleString('en-US')} · completed ${view.completed.toLocaleString('en-US')} · backlog ${view.closingBacklog.toLocaleString('en-US')} · scanner util ${((view.scannerUtilization) * 100).toFixed(1)}%.`, topAlert ? topAlert.title : `الطلبات ${view.requests.toLocaleString('en-US')}.`),
    evidence: tx(lang, `Completed + Cancelled + No-show + Pending = Requests. ${view.methodology.accessClock} ${view.methodology.utilization}`, `المكتمل + الملغى + عدم الحضور + المعلق = الطلبات.`),
    explanation: tx(lang, 'Potential reasons (not proven): access pressure, scanner downtime, and reporting backlog move together across Radiology screens.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command demand, Access backlog (${hotBacklog.id}), Utilization downtime, then Capacity Optimization.`, topAlert?.action ?? `راجع الطلب والطابور والتوقف.`),
    role: tx(lang, 'Imaging operations lead', 'قائد عمليات التصوير'),
    benefit: tx(lang, 'A sequenced Radiology review keeps demand, access, scanners, reporting, and capacity distinct.', 'مراجعة أشعة متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerLaboratory(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildLaboratoryView(hospital, year, period);
  const hotTat = [...view.sections].sort((a, b) => b.reportTatHours - a.reportTatHours)[0];
  const hotBacklog = [...view.sections].sort((a, b) => b.backlog - a.backlog)[0];
  const hotReject = [...view.sections].sort((a, b) => b.rejected - a.rejected)[0];
  const lowUtil = [...view.analyzers].sort((a, b) => a.utilization - b.utilization)[0];
  const topDown = [...view.downtimeReasons].sort((a, b) => b.hours - a.hours)[0];
  const topReject = [...view.rejectionReasons].sort((a, b) => b.count - a.count)[0];

  if (/\bed\b|emergency boarding|bed occupancy|appointment no-?show|slot fill|clinic wait|or util|surgical backlog|first.?case|scanner util|imaging backlog/.test(q)
    && !/laborator|analyzer|specimen|lab tat|hemolys|rejection|validation|critical result/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Laboratory focus', 'خارج تركيز المختبر'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'Bed Occupancy stays in Beds. OR Utilization stays in Surgery. Scanner Utilization stays in Radiology. ED flow stays in Emergency.', 'إشغال الأسرة في الأسرة. استخدام غرف العمليات في الجراحة. أجهزة التصوير في الأشعة.'),
      explanation: tx(lang, 'Laboratory owns test demand, specimen pre-analytics, analyzer utilization, result TAT, and feasible testing capacity recovery.', 'المختبر يملك الطلب والعينات واستخدام الأجهزة وزمن النتائج.'),
      action: tx(lang, 'Stay on Laboratory screens for demand, samples, analyzers, results, and capacity questions.', 'ابقَ في شاشات المختبر.'),
      role: tx(lang, 'Laboratory operations lead', 'قائد عمليات المختبر'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/tat|turnaround|section.*tat|stat delay|over.?target|validation|unvalidated/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Results, TAT & quality · ${name} · ${view.periodLabel}`, `النتائج وزمن الاستجابة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Median Lab TAT ${view.medianLabTatHours.toFixed(1)} h · P90 ${view.p90LabTatHours.toFixed(1)} · over target ${view.resultsOverTarget.toLocaleString('en-US')} · pending validation ${view.pendingValidation.toLocaleString('en-US')} · longest section TAT ${hotTat.id} (${hotTat.reportTatHours.toFixed(1)} h).`, `زمن المختبر ${view.medianLabTatHours.toFixed(1)} س.`),
      evidence: tx(lang, `${view.methodology.reportTat} Critical notify ${((view.criticalNotifyRate) * 100).toFixed(1)}% · critical delay ${((view.criticalDelayRate) * 100).toFixed(1)}% (${view.criticalPendingComm.toLocaleString('en-US')} pending). STAT share ${((view.statShare) * 100).toFixed(1)}%.`, `إشعار حرج ${((view.criticalNotifyRate) * 100).toFixed(1)}٪.`),
      explanation: tx(lang, 'Potential reasons (not proven): validation aging, section mix (Histopathology/Microbiology), and STAT pathway pressure. Notify rate is not a delay rate.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Clear oldest unvalidated aging bands, tighten STAT pathways for ${hotTat.id}, and close pending critical communications.`, `أغلق أقدم النتائج غير المعتمدة وراجع ${hotTat.id}.`),
      role: tx(lang, 'Laboratory quality lead', 'قائد جودة المختبر'),
      benefit: tx(lang, 'Separating testing backlog, validation, and critical communication keeps management actions correctly targeted.', 'فصل طابور التحليل والاعتماد والتواصل الحرج يوجه الإجراءات بشكل صحيح.'),
    });
  }

  if (/reject|hemolys|specimen|transport|recollect|pre-?analytic|sample/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Sample flow & pre-analytics · ${name} · ${view.periodLabel}`, `تدفق العينات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Samples received ${view.samplesReceived.toLocaleString('en-US')} · rejection ${((view.rejectionRate) * 100).toFixed(1)}% (${view.rejected.toLocaleString('en-US')}) · hemolysis ${((view.hemolysisRate) * 100).toFixed(1)}% · transport median ${view.medianTransportMin} min · recollections ${view.recollections.toLocaleString('en-US')}.`, `الرفض ${((view.rejectionRate) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Top rejection reason ${topReject.name} (${topReject.count.toLocaleString('en-US')}). Highest section rejections ${hotReject.id}. ${view.methodology.specimenLifecycle} ${view.methodology.accessClock}`, `أعلى سبب رفض ${topReject.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): collection technique, labeling, and transport conditions. Hemolysis overlaps rejection but is not identical.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Coach collection points on ${topReject.name} and review Sample Delays by Care Setting before adding analyzer sessions.`, `درّب نقاط السحب على ${topReject.name}.`),
      role: tx(lang, 'Laboratory lead', 'قائد المختبر'),
      benefit: tx(lang, 'Reducing preventable rejections recovers capacity without claiming new analyzers.', 'خفض الرفض القابل للتجنب يسترد السعة دون ادعاء أجهزة جديدة.'),
    });
  }

  if (/utiliz|unused|downtime|analyzer|backlog|tests per/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Testing & analyzer performance · ${name} · ${view.periodLabel}`, `أداء أجهزة التحليل · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Analyzer Utilization ${((view.analyzerUtilization) * 100).toFixed(1)}% (${view.inSessionUsed.toLocaleString('en-US')} in-session of ${view.staffedHours.toLocaleString('en-US')} staffed) · unused ${view.unusedHours.toLocaleString('en-US')} h · downtime ${view.downtimeHours.toLocaleString('en-US')} h · Chemistry downtime ${view.chemistryDowntimeHours.toLocaleString('en-US')} h · testing backlog ${view.testingBacklog.toLocaleString('en-US')} · lowest analyzer ${lowUtil.id}.`, `الاستخدام ${((view.analyzerUtilization) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Top downtime reason ${topDown.name} (${topDown.hours.toLocaleString('en-US')} h). Largest section backlog ${hotBacklog.id}. ${view.methodology.utilization}`, `توقف ${topDown.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): downtime, QC holds, and late batch starts leave staffed hours unused. Analyzer utilization is not staff utilization.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Start with Chemistry downtime recovery and ${topDown.name}, then review Testing Backlog by Section for ${hotBacklog.id}.`, `ابدأ باسترداد توقف الكيمياء و${topDown.name}.`),
      role: tx(lang, 'Laboratory operations lead', 'قائد عمليات المختبر'),
      benefit: tx(lang, 'Recovering staffed analyzer hours raises throughput without claiming new equipment.', 'استرداد ساعات الأجهزة يرفع الإنتاجية دون ادعاء أجهزة جديدة.'),
    });
  }

  if (/additional|capacity|recoverable|feasible|optimization|priorit|management/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Laboratory capacity optimization · ${name} · ${view.periodLabel}`, `تحسين سعة المختبر · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Recoverable Hours ${view.recoverableHours.toLocaleString('en-US')} · feasible Additional Tests ${view.additionalTests.toLocaleString('en-US')} · eligible backlog ${view.eligibleBacklog.toLocaleString('en-US')}.`, `ساعات قابلة للاسترداد ${view.recoverableHours.toLocaleString('en-US')}.`),
      evidence: tx(lang, `${view.methodology.capacity} Largest backlog section ${hotBacklog.id}. Chemistry downtime ${view.chemistryDowntimeHours.toLocaleString('en-US')} h · median Lab TAT ${view.medianLabTatHours.toFixed(1)} h.`, `الطابور الأكبر ${hotBacklog.id}.`),
      explanation: tx(lang, 'Estimates are illustrative. Not all recovered hours become tests; staffing and reagent constraints remain. Sections are not interchangeable.', 'التقديرات توضيحية.'),
      action: tx(lang, `Sequence rejection reduction, Chemistry downtime recovery, validation clearance, and eligible backlog prioritization for ${hotBacklog.id} before extending unstaffed sessions.`, `رتّب خفض الرفض وتوقف الكيمياء والاعتماد والطابور لـ ${hotBacklog.id}.`),
      role: tx(lang, 'Laboratory operations lead', 'قائد عمليات المختبر'),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating achievable laboratory throughput.', 'السيناريوهات المقيدة تمنع المبالغة في الإنتاجية.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Laboratory' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Laboratory at ${name} · ${view.periodLabel}`, `المختبر في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Orders ${view.orders.toLocaleString('en-US')} · completed ${view.completedTests.toLocaleString('en-US')} · testing backlog ${view.testingBacklog.toLocaleString('en-US')} · analyzer util ${((view.analyzerUtilization) * 100).toFixed(1)}%.`, topAlert ? topAlert.title : `الطلبات ${view.orders.toLocaleString('en-US')}.`),
    evidence: tx(lang, `${view.methodology.grains} ${view.methodology.utilization}`, `الطلبات ≠ العينات ≠ الاختبارات ≠ النتائج.`),
    explanation: tx(lang, 'Potential reasons (not proven): pre-analytical quality, analyzer downtime, and validation backlog move together across Laboratory screens.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command demand, Samples rejection, Analyzers downtime (${hotBacklog.id}), then Capacity Optimization.`, topAlert?.action ?? `راجع الطلب والرفض والتوقف.`),
    role: tx(lang, 'Laboratory operations lead', 'قائد عمليات المختبر'),
    benefit: tx(lang, 'A sequenced Laboratory review keeps demand, samples, analyzers, results, and capacity distinct.', 'مراجعة مختبر متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerPharmacy(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildPharmacyView(hospital, year, period);
  const n = (value: number) => value.toLocaleString('en-US');
  const p = (value: number) => `${(value * 100).toFixed(1)}%`;
  const sar = (value: number) => `SAR ${value.toLocaleString('en-US')}`;
  const slowest = [...view.workflows].sort((a, b) => b.medianTatMin - a.medianTatMin)[0];
  const topExpiry = [...view.classRows].sort((a, b) => b.expiredValue - a.expiredValue)[0];
  const topNear = [...view.classRows].sort((a, b) => b.nearExpiryValue - a.nearExpiryValue)[0];
  const lowCover = [...view.classRows].sort((a, b) => a.daysOfSupply - b.daysOfSupply)[0];
  const lowScan = [...view.barcodeSettings].sort((a, b) => a.rate - b.rate)[0];
  const topRework = [...view.reworkReasons].sort((a, b) => b.count - a.count)[0];
  const topIncident = [...view.incidentTypes].sort((a, b) => b.count - a.count)[0];
  const topSpend = [...view.classRows].sort((a, b) => b.spend - a.spend)[0];
  const topWorkflow = [...view.workflows].sort((a, b) => b.recoverableHours - a.recoverableHours)[0];

  if (/\bed\b|emergency boarding|bed occupancy|appointment no-?show|slot fill|clinic wait|or util|surgical backlog|first.?case|scanner util|imaging backlog|analyzer util|testing backlog|lab tat/.test(q)
    && !/pharmac|medication|dispens|stock|formulary|barcode|incident|expir|waste/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Pharmacy focus', 'خارج تركيز الصيدلية'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'Bed Occupancy stays in Beds. OR Utilization stays in Surgery. Scanner Utilization stays in Radiology. Analyzer Utilization and Testing Backlog stay in Laboratory.', 'الأسرة والجراحة والأشعة والمختبر تملك مؤشراتها.'),
      explanation: tx(lang, 'Pharmacy owns medication orders, dispensing flow, stock position, process safety, cost and waste, and workflow capacity.', 'الصيدلية تملك الطلبات والصرف والمخزون والسلامة والتكلفة والسعة.'),
      action: tx(lang, 'Stay on Pharmacy screens for orders, dispensing, inventory, safety, cost, and capacity questions.', 'ابقَ في شاشات الصيدلية.'),
      role: tx(lang, 'Pharmacy operations lead', 'قائد عمليات الصيدلية'),
      benefit: tx(lang, 'Clear ownership prevents duplicated dashboards.', 'الملكية الواضحة تمنع لوحات مكررة.'),
    });
  }

  if (/dose|dosing|dosage|prescribe|which drug should|clinical advice|treat/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside operational Pharmacy support', 'خارج الدعم التشغيلي للصيدلية'),
      observation: tx(lang, 'Vital Assist does not give clinical dosing or prescribing advice.', 'المساعد لا يقدم نصائح الجرعات أو الوصف الطبي.'),
      evidence: tx(lang, `Pharmacy screens report operational signals only: ${n(view.orders)} orders, ${n(view.dispensedLines)} dispensed lines, median TAT ${view.medianTatMin} min.`, 'مؤشرات تشغيلية فقط.'),
      explanation: tx(lang, 'Medication decisions belong to clinicians and pharmacists using approved sources. This demo uses synthetic illustrative data.', 'القرارات الدوائية للأطباء والصيادلة.'),
      action: tx(lang, 'Ask about dispensing flow, stock position, process safety, cost, or capacity instead.', 'اسأل عن الصرف أو المخزون أو السلامة أو التكلفة.'),
      role: tx(lang, 'Pharmacy operations lead', 'قائد عمليات الصيدلية'),
      benefit: tx(lang, 'Keeps operational analytics separate from clinical decisions.', 'يفصل التحليل التشغيلي عن القرارات السريرية.'),
    });
  }

  if (/stock|inventory|supply|expir|sku|low.?stock|batch|days of/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Inventory & stock position · ${name} · ${view.periodLabel}`, `المخزون · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Inventory value ${sar(view.inventoryValue)} · stockout SKUs ${n(view.stockoutSkus)} · low-stock SKUs ${n(view.lowStockSkus)} · days of supply ${view.daysOfSupply.toFixed(1)} · near-expiry ${sar(view.nearExpiryValue)}.`, `قيمة المخزون ${sar(view.inventoryValue)}.`),
      evidence: tx(lang, `Lowest cover ${lowCover.name} (${lowCover.daysOfSupply.toFixed(1)} d). Largest near-expiry exposure ${topNear.name} (${sar(topNear.nearExpiryValue)}). ${view.methodology.inventory}`, `أقل تغطية ${lowCover.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): reorder points, supplier lead times, and par levels. Stockout and low-stock SKUs are mutually exclusive.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review reorder points for stocked-out SKUs and rotate ${topNear.name} stock first-expired-first-out.`, `راجع نقاط إعادة الطلب.`),
      role: tx(lang, 'Pharmacy supply lead', 'قائد إمداد الصيدلية'),
      benefit: tx(lang, 'Separating stockout, low-stock, and near-expiry keeps supply actions correctly targeted.', 'فصل النفاد والمخزون المنخفض وقرب الانتهاء يوجه الإجراءات.'),
    });
  }

  if (/cost|spend|waste|saving|expired|sar|price/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Medication cost & waste · ${name} · ${view.periodLabel}`, `تكلفة الأدوية · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Medication spend ${sar(view.medicationSpend)} · cost per line ${sar(view.costPerLine)} · expired ${sar(view.expiredValue)} · avoidable waste ${sar(view.avoidableWaste)} · potential savings ${sar(view.potentialSavings)}.`, `الإنفاق ${sar(view.medicationSpend)}.`),
      evidence: tx(lang, `Largest spend group ${topSpend.name} (${sar(topSpend.spend)}). Largest expiry group ${topExpiry.name} (${sar(topExpiry.expiredValue)}). ${view.methodology.cost}`, `أكبر مجموعة إنفاق ${topSpend.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): par levels, expiry rotation, and discard handling. Avoidable waste is a subset of write-offs and savings are counted once.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Target ${topExpiry.name} expiry write-offs and discard handling before changing purchasing.`, `ركّز على ${topExpiry.name}.`),
      role: tx(lang, 'Pharmacy finance lead', 'قائد مالية الصيدلية'),
      benefit: tx(lang, 'Counting each SAR once prevents overstated savings.', 'عدّ كل ريال مرة واحدة يمنع المبالغة.'),
    });
  }

  if (/safety|barcode|scan|incident|high.?alert|exception|review/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Medication safety process · ${name} · ${view.periodLabel}`, `سلامة الأدوية · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Barcode scan rate ${p(view.barcodeRate)} · high-alert compliance ${p(view.highAlertCompliance)} · exception rate ${p(view.verificationExceptionRate)} · incident reports ${n(view.incidentReports)} · unresolved reviews ${n(view.unresolvedReviews)}.`, `معدل المسح ${p(view.barcodeRate)}.`),
      evidence: tx(lang, `Lowest scan setting ${lowScan.name} (${p(lowScan.rate)}). Top report type ${topIncident.name}. ${view.methodology.safety}`, `أدنى مسح ${lowScan.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): scanner availability, workflow pressure, and reporting culture. These are process signals, not clinical outcomes.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Review scanner workflow in ${lowScan.name} and clear the oldest incident reviews.`, `راجع سير العمل في ${lowScan.name}.`),
      role: tx(lang, 'Medication safety lead', 'قائد سلامة الأدوية'),
      benefit: tx(lang, 'Each rate keeps its own denominator so process gaps are not blended.', 'كل معدل يحتفظ بمقامه.'),
    });
  }

  if (/additional|capacity|recoverable|feasible|optimization|priorit|management|staffed/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Pharmacy capacity optimization · ${name} · ${view.periodLabel}`, `تحسين سعة الصيدلية · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Recoverable hours ${n(view.recoverableHours)} · feasible additional lines ${n(view.additionalLines)} · eligible pending ${n(view.eligiblePending)} · feasible TAT cut ${view.feasibleTatCutMin.toFixed(1)} min.`, `ساعات قابلة للاسترداد ${n(view.recoverableHours)}.`),
      evidence: tx(lang, `${view.methodology.capacity} Largest recoverable pathway ${topWorkflow.name} (${n(topWorkflow.recoverableHours)} h). Verification backlog ${n(view.verificationBacklog)}.`, `أكبر مسار ${topWorkflow.name}.`),
      explanation: tx(lang, 'Estimates are illustrative. Not all recovered hours become lines; staffing and workflow constraints remain, and pathways are not interchangeable.', 'التقديرات توضيحية.'),
      action: tx(lang, `Sequence rework reduction, verification backlog clearance, and eligible pending-line prioritization for ${topWorkflow.name} before extending staffed hours.`, `رتّب خفض إعادة العمل والطابور.`),
      role: tx(lang, 'Pharmacy operations lead', 'قائد عمليات الصيدلية'),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating achievable dispensing throughput.', 'السيناريوهات المقيدة تمنع المبالغة.'),
    });
  }

  if (/tat|turnaround|verification|dispens|rework|first.?pass|backlog|queue|pending|late|slow/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Verification & dispensing flow · ${name} · ${view.periodLabel}`, `التحقق والصرف · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Median dispensing TAT ${view.medianTatMin} min · P90 ${view.p90TatMin} · over target ${n(view.dispensesOverTarget)} · verification backlog ${n(view.verificationBacklog)} · first-pass ${p(view.firstPass)} · rework ${p(view.reworkRate)}.`, `زمن الصرف ${view.medianTatMin} دقيقة.`),
      evidence: tx(lang, `Slowest pathway ${slowest.name} (${slowest.medianTatMin} min). Top rework reason ${topRework.name} (${n(topRework.count)}). ${view.methodology.tat}`, `أبطأ مسار ${slowest.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): verification queue aging, clarification waits, and pathway mix such as IV compounding. First-pass is not 1 − rework.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Clear the oldest verification aging bands, then review ${topRework.name} and ${slowest.name}.`, `أغلق أقدم طوابير التحقق.`),
      role: tx(lang, 'Pharmacy operations lead', 'قائد عمليات الصيدلية'),
      benefit: tx(lang, 'Separating verification, dispensing, and rework keeps actions targeted without claiming new staff.', 'الفصل يوجه الإجراءات.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Pharmacy' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Pharmacy at ${name} · ${view.periodLabel}`, `الصيدلية في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Orders ${n(view.orders)} · dispensed lines ${n(view.dispensedLines)} · median TAT ${view.medianTatMin} min · stockout SKUs ${n(view.stockoutSkus)}.`, topAlert ? topAlert.title : `الطلبات ${n(view.orders)}.`),
    evidence: tx(lang, `${view.methodology.grains} ${view.methodology.ledger}`, 'الطلبات ≠ السطور ≠ الصرف ≠ الإعطاء.'),
    explanation: tx(lang, 'Potential reasons (not proven): verification queue, stock availability, and workflow rework move together across Pharmacy screens. This is operational analytics, not clinical advice.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command demand, Dispensing flow (${slowest.name}), Inventory cover (${lowCover.name}), then Capacity Optimization.`, topAlert?.action ?? 'راجع الطلب والصرف والمخزون.'),
    role: tx(lang, 'Pharmacy operations lead', 'قائد عمليات الصيدلية'),
    benefit: tx(lang, 'A sequenced Pharmacy review keeps orders, dispensing, stock, safety, cost, and capacity distinct.', 'مراجعة متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerIcu(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildIcuView(hospital, year, period);
  const n = (value: number) => value.toLocaleString('en-US');
  const p = (value: number) => `${(value * 100).toFixed(1)}%`;
  const hotUnit = [...view.unitRows].sort((a, b) => b.pendingTransfers - a.pendingTransfers)[0];
  const lowAvail = [...view.unitRows].sort((a, b) => a.available - b.available)[0];
  const night = view.shiftRows.find((item) => item.name === 'Night') ?? view.shiftRows[0];

  if (/\bed\b|emergency boarding|bed occupancy|appointment no-?show|slot fill|or util|scanner util|analyzer util|medication order|stockout sku/.test(q)
    && !/icu|critical.?care|ventilat|staffed icu|transfer delay|icu los/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside ICU focus', 'خارج تركيز العناية المركزة'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'Hospital Bed Occupancy stays in Beds. ED boarding stays in Emergency. Medication Orders stay in Pharmacy.', 'الأسرة والطوارئ والصيدلية تملك مؤشراتها.'),
      explanation: tx(lang, 'ICU owns critical-care admissions, flow delays, staffed capacity, equipment, quality processes, and feasible optimization.', 'العناية المركزة تملك القبول والتدفق والسعة والمعدات والجودة.'),
      action: tx(lang, 'Stay on ICU screens for demand, flow, staffing, equipment, quality, and optimization questions.', 'ابقَ في شاشات العناية المركزة.'),
      role: tx(lang, 'ICU operations lead', 'قائد عمليات العناية المركزة'),
      benefit: tx(lang, 'Clear ownership prevents duplicated bed or ED dashboards inside ICU.', 'الملكية الواضحة تمنع التكرار.'),
    });
  }

  if (/dose|dosing|ventilator setting|wean|extubat|prescribe|treat the patient|prognosis|mortality risk/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside operational ICU support', 'خارج الدعم التشغيلي للعناية المركزة'),
      observation: tx(lang, 'Vital Assist does not give bedside treatment, ventilator-setting, or prognosis advice.', 'المساعد لا يقدم نصائح علاجية أو إعدادات جهاز تنفس.'),
      evidence: tx(lang, `ICU screens report operational signals only: ${n(view.admissions)} admissions, median wait ${view.medianAdmissionWaitMin} min, available staffed ${n(view.availableStaffed)}.`, 'مؤشرات تشغيلية فقط.'),
      explanation: tx(lang, 'Clinical decisions stay with ICU clinicians. This demo uses synthetic illustrative data and is not an accreditation system.', 'القرارات السريرية للأطباء.'),
      action: tx(lang, 'Ask about admission delays, staffed capacity, equipment readiness, or recoverable bed hours instead.', 'اسأل عن التأخير أو السعة أو المعدات.'),
      role: tx(lang, 'ICU operations lead', 'قائد عمليات العناية المركزة'),
      benefit: tx(lang, 'Keeps operational analytics separate from clinical treatment decisions.', 'يفصل التحليل التشغيلي عن العلاج.'),
    });
  }

  if (/equip|ventilat|downtime|device|readiness/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Ventilation & equipment · ${name} · ${view.periodLabel}`, `المعدات · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Vent patient-days ${n(view.ventPatientDays)} · utilization ${p(view.ventUtilization)} · available vents ${n(view.ventAvailable)} · downtime ${n(view.downtimeHours)} h · readiness ${p(view.equipmentReadiness)}.`, `أجهزة متاحة ${n(view.ventAvailable)}.`),
      evidence: tx(lang, `Inventory ${n(view.ventInventory)} = in use ${n(view.ventInUse)} + available ${n(view.ventAvailable)} + maintenance ${n(view.ventMaintenance)} + prep ${n(view.ventPrep)}. ${view.methodology.equipment}`, 'هوية المخزون.'),
      explanation: tx(lang, 'Potential reasons (not proven): parts wait, unplanned repair, and cleaning cycles. Inventory is not clinical capacity.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Clear parts wait and unplanned repair before assuming ventilated capacity growth.', 'عالج أعطال القطع أولاً.'),
      role: tx(lang, 'Biomedical equipment lead', 'قائد المعدات الطبية'),
      benefit: tx(lang, 'Separating inventory, in-use, and available states prevents double-counting devices.', 'فصل الحالات يمنع العد المزدوج.'),
    });
  }

  if (/staff|nurse|coverage|gap|ratio|staffed bed|available staffed/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Critical care capacity & staffing · ${name} · ${view.periodLabel}`, `السعة والتوظيف · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Staffed beds ${n(view.staffedBeds)} of ${n(view.physicalBeds)} physical · available staffed ${n(view.availableStaffed)} · coverage ${p(view.nurseCoverage)} · gap ${n(view.staffingGapHours)} h · pt:nurse ${view.patientNurseRatio.toFixed(1)}.`, `أسرة موظفة ${n(view.staffedBeds)}.`),
      evidence: tx(lang, `Lowest available unit ${lowAvail.name} (${n(lowAvail.available)}). Night gap ${n(night.gapHours)} h. ${view.methodology.capacity}`, `أقل توفر ${lowAvail.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): unstaffed physical beds, blocked staffed beds, and shift gaps. Ratio is descriptive — not a safety verdict.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Close ${night.name} gap hours and review ${lowAvail.name} staffing before converting physical vacancy into assumed capacity.`, `أغلق فجوة ${night.name}.`),
      role: tx(lang, 'Critical care nursing lead', 'قائد تمريض العناية المركزة'),
      benefit: tx(lang, 'Distinguishing physical and staffed capacity prevents false availability.', 'الفصل يمنع التوفر الزائف.'),
    });
  }

  if (/quality|readmit|surveillance|safety|review|infection/.test(q)) {
    return pack(lang, {
      title: tx(lang, `ICU quality & safety · ${name} · ${view.periodLabel}`, `جودة العناية المركزة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Readmission ${p(view.readmissionRate)} · unplanned transfer ${p(view.unplannedTransferRate)} · review backlog ${n(view.unresolvedReviews)} · surveillance completeness ${p(view.surveillanceCompleteness)} · review timeliness ${p(view.reviewTimeliness)}.`, `طابور المراجعات ${n(view.unresolvedReviews)}.`),
      evidence: tx(lang, `${view.methodology.quality}`, 'اكتمال التوثيق وليس معدل عدوى معتمد.'),
      explanation: tx(lang, 'Potential reasons (not proven): review aging and documentation gaps. Completeness is not a validated CLABSI/CAUTI/VAE rate.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Age the safety review backlog and improve device-day documentation completeness — do not treat counts as certified harm.', 'راجع طابور المراجعات.'),
      role: tx(lang, 'ICU quality lead', 'قائد جودة العناية المركزة'),
      benefit: tx(lang, 'Keeps process signals distinct from validated infection surveillance.', 'يفصل إشارات العملية عن الترصد المعتمد.'),
    });
  }

  if (/recoverable|feasible|optim|priorit|management|capacity opportunity/.test(q)) {
    return pack(lang, {
      title: tx(lang, `ICU capacity optimization · ${name} · ${view.periodLabel}`, `تحسين سعة العناية المركزة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Recoverable bed hours ${n(view.recoverableBedHours)} · feasible capacity ${n(view.feasibleAdditionalCapacity)} · avoidable delay ${n(view.avoidableTransferDelayHours)} h · staff-constrained ${n(view.staffConstrainedHours)} h.`, `ساعات قابلة للاسترداد ${n(view.recoverableBedHours)}.`),
      evidence: tx(lang, `${view.methodology.optimization} Hottest pending unit ${hotUnit.name}.`, `أعلى وحدة انتظار ${hotUnit.name}.`),
      explanation: tx(lang, 'Estimates are illustrative. Drivers are exclusive. Never pressure clinical readiness or premature discharge.', 'التقديرات توضيحية.'),
      action: tx(lang, `Sequence transfer coordination, discharge handoff, and bed preparation for ${hotUnit.name} before adding unstaffed physical beds.`, `رتّب التنسيق لـ ${hotUnit.name}.`),
      role: tx(lang, 'Patient flow lead', 'قائد تدفق المرضى'),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating achievable ICU capacity.', 'السيناريوهات المقيدة تمنع المبالغة.'),
    });
  }

  if (/wait|delay|transfer|discharge|los|board|flow|pending|admission/.test(q)) {
    return pack(lang, {
      title: tx(lang, `ICU patient flow · ${name} · ${view.periodLabel}`, `تدفق العناية المركزة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Admissions ${n(view.admissions)} · median wait ${view.medianAdmissionWaitMin} min · delayed ${n(view.delayedAdmissions)} · median LOS ${view.medianLosHours.toFixed(1)} h · transfer delay ${view.medianTransferDelayHours.toFixed(1)} h · pending ${n(view.pendingTransfers)}.`, `انتظار القبول ${view.medianAdmissionWaitMin} دقيقة.`),
      evidence: tx(lang, `Hottest pending unit ${hotUnit.name} (${n(hotUnit.pendingTransfers)}). ${view.methodology.los} ${view.methodology.census}`, `أعلى انتظار ${hotUnit.name}.`),
      explanation: tx(lang, 'Potential reasons (not proven): staffed bed shortage, downstream ward waits, and coordination handoffs. Shorter LOS is not assumed clinically better.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Clear ${hotUnit.name} pending transfers and review delayed admission sources before adding physical beds.`, `أغلق انتظار ${hotUnit.name}.`),
      role: tx(lang, 'ICU operations lead', 'قائد عمليات العناية المركزة'),
      benefit: tx(lang, 'Separating request, arrival, ready, and exit clocks keeps actions targeted.', 'فصل الساعات يوجه الإجراءات.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'ICU' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `ICU at ${name} · ${view.periodLabel}`, `العناية المركزة في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Admissions ${n(view.admissions)} · avg census ${view.avgCensus.toFixed(1)} · available staffed ${n(view.availableStaffed)} · pending ${n(view.pendingTransfers)}.`, topAlert ? topAlert.title : `القبول ${n(view.admissions)}.`),
    evidence: tx(lang, `${view.methodology.grains} ${view.methodology.census}`, 'القبول ≠ أيام المرضى ≠ الإقامات المكتملة.'),
    explanation: tx(lang, 'Potential reasons (not proven): demand pressure, staffing gaps, and exit coordination move together across ICU screens. Operational analytics only — not clinical advice.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command demand, Flow delays (${hotUnit.name}), Capacity staffing, then Optimization.`, topAlert?.action ?? 'راجع الطلب والتدفق والسعة.'),
    role: tx(lang, 'ICU operations lead', 'قائد عمليات العناية المركزة'),
    benefit: tx(lang, 'A sequenced ICU review keeps demand, flow, staffing, equipment, quality, and capacity distinct.', 'مراجعة متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerPx(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildPxView(hospital, year, period);
  const n = (value: number) => value.toLocaleString('en-US');
  const p = (value: number) => `${(value * 100).toFixed(1)}%`;
  const hotDept = [...view.departmentRows].filter((item) => item.adequateSample).sort((a, b) => a.score - b.score)[0]
    ?? view.departmentRows[0];
  const topComplaint = [...view.complaintByCategory].sort((a, b) => b.count - a.count)[0];
  const weakestTp = [...view.touchpointRows].sort((a, b) => a.score - b.score)[0];
  const topNegTheme = view.topNegativeTopics[0];
  const priorityOpt = view.opportunities.find((item) => item.priority) ?? view.opportunities[0];

  if (/\bed\b|emergency boarding|bed occupancy|icu transfer|staffed icu|medication order|stockout sku|analyzer util|or util/.test(q)
    && !/patient experience|satisfaction|complaint|survey|sentiment|touchpoint|voice of patient|service recovery/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Patient Experience focus', 'خارج تركيز تجربة المريض'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'ED boarding stays in Emergency. Hospital Bed Occupancy stays in Beds. ICU transfer delays stay in ICU. Medication Orders stay in Pharmacy.', 'الطوارئ والأسرة والعناية المركزة والصيدلية تملك مؤشراتها.'),
      explanation: tx(lang, 'Patient Experience owns internal survey scores, journey touchpoints, complaints/service recovery, voice themes, department experience, and illustrative improvement scenarios.', 'تجربة المريض تملك الاستبيان والرحلة والشكاوى والصوت والتحسين.'),
      action: tx(lang, 'Stay on Patient Experience screens for satisfaction, complaints, voice, departments, and optimization questions.', 'ابقَ في شاشات تجربة المريض.'),
      role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
      benefit: tx(lang, 'Clear ownership prevents duplicating ED wait or bed occupancy dashboards inside Experience.', 'الملكية الواضحة تمنع التكرار.'),
    });
  }

  if (/dose|dosing|prescribe|treat the patient|prognosis|mortality risk|ventilator setting|clinical harm|diagnose/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside operational experience support', 'خارج الدعم التشغيلي لتجربة المريض'),
      observation: tx(lang, 'Vital Assist does not give clinical treatment advice or claim clinical harm from survey scores.', 'المساعد لا يقدم نصائح علاجية ولا يدّعي ضرراً سريرياً من درجات الاستبيان.'),
      evidence: tx(lang, `PX screens report internal survey and service-recovery signals only: overall ${view.overallSatisfaction}/10, response rate ${p(view.responseRate)}, open complaints ${n(view.complaintsOpen)}. Instrument ${view.instrument.id} — not HCAHPS.`, 'مؤشرات استبيان داخلي واستعادة خدمة فقط.'),
      explanation: tx(lang, 'Clinical decisions stay with clinicians. Correlation in survey themes is not causation. This demo uses synthetic illustrative data.', 'القرارات السريرية للأطباء. الارتباط ليس سببية.'),
      action: tx(lang, 'Ask about satisfaction, complaints, touchpoints, voice themes, or improvement opportunities instead.', 'اسأل عن الرضا أو الشكاوى أو نقاط الاتصال.'),
      role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
      benefit: tx(lang, 'Keeps experience analytics separate from clinical treatment decisions.', 'يفصل تحليل التجربة عن العلاج.'),
    });
  }

  if (/satisf|falling|declin|overall rating|recommendation score|response rate/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Satisfaction & survey coverage · ${name} · ${view.periodLabel}`, `الرضا وتغطية الاستبيان · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: overall ${view.overallSatisfaction}/10 (target ${view.overallTarget}/10) · response rate ${p(view.responseRate)} (${n(view.eligibleCompleted)}/${n(view.eligibleInvitations)}) · Neg. Survey Rating Share ${p(view.negativeShare)} · ${view.recommendationLabel} ${view.recommendationScore} pts · unresolved issues ${n(view.unresolvedIssues)}.`, `الرضا ${view.overallSatisfaction}/10.`),
      evidence: tx(lang, `${view.methodology.instrument} Eligible completed ${n(view.eligibleCompleted)} of ${n(view.eligibleInvitations)} invitations (duplicates discarded ${n(view.duplicateCompletions)}). Lowest dimension ${view.lowestDimension} (${view.lowestDimensionScore}/10). Neg. Survey Rating Share ≠ Neg. Comment Sentiment Share (${p(view.negativeFeedbackShare)}).`, view.methodology.instrument),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): waiting (${view.waitingScore}/10), communication (${view.communicationScore}/10), and discharge (${view.dischargeScore}/10) trail together under occupancy pressure. Correlation is not causation. Scores use the internal 0–10 instrument — not /100.`, 'أسباب محتملة وليست مثبتة. الارتباط ليس سببية.'),
      action: tx(lang, `Recommendations: review Command KPIs, then Journey (${view.lowestDimension}), then Optimization opportunities. Simulations: try waiting-time or communication what-ifs — illustrative only.`, `راجع القيادة ثم الرحلة ثم التحسين.`),
      role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
      benefit: tx(lang, 'Separating survey grains (invitations ≠ completions ≠ answers) prevents false response-rate claims.', 'فصل الحبوب يمنع معدلات استجابة زائفة.'),
    });
  }

  if (/department|service line|coverage gap|variance|below target/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Department experience · ${name} · ${view.periodLabel}`, `تجربة الأقسام · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: ${n(view.deptsMeetingTarget)} departments meet target · ${n(view.deptsRequiringReview)} need review · coverage gap ${n(view.coverageGap)} · material variance ${view.materialVariance} · lowest adequate ${hotDept.name} ${hotDept.score}/10 (n=${n(hotDept.responses)}).`, `أقل قسم ${hotDept.name}.`),
      evidence: tx(lang, `Minimum sample ${view.minDeptSample}. Departments below sample are flagged, not ranked as poor experience. ${view.methodology.scoring}`, `حد العينة ${view.minDeptSample}.`),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): sample coverage gaps and service-mix differences can move department means without proving local care failure.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Recommendations: prioritize ${hotDept.name} only when sample is adequate; lift coverage before comparing thin samples. Simulations remain illustrative.`, `أعطِ الأولوية لـ ${hotDept.name} عند كفاية العينة.`),
      role: tx(lang, 'Experience improvement office', 'مكتب تحسين التجربة'),
      benefit: tx(lang, 'Adequate-sample gates stop unfair department ranking.', 'بوابات العينة تمنع الترتيب غير العادل.'),
    });
  }

  if (/complaint|overdue|resolution|service recovery|aging|reopen/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Complaints & service recovery · ${name} · ${view.periodLabel}`, `الشكاوى واستعادة الخدمة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: new ${n(view.complaintsNew)} · open ${n(view.complaintsOpen)} · closed ${n(view.complaintsClosed)} · overdue ${n(view.overdueComplaints)} · median resolution ${view.medianResolutionDays} days · reopen ${p(view.reopenRate)} · top driver ${topComplaint.name} (${n(topComplaint.count)}).`, `شكاوى مفتوحة ${n(view.complaintsOpen)}.`),
      evidence: tx(lang, `Ledger balanced: ${view.complaintLedgerBalanced ? 'yes' : 'no'} (opening ${n(view.complaintOpeningOpen)} + new + reopened − closed − withdrawn = closing ${n(view.complaintClosingOpen)}). ${view.methodology.complaints}`, 'هوية دفتر الشكاوى.'),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): assignment backlog and repeat categories (not every complaint is preventable). Closed ≠ patient satisfied.', 'أسباب محتملة وليست مثبتة. الإغلاق ≠ رضا.'),
      action: tx(lang, `Recommendations: clear overdue open cases past ${view.resolutionTargetDays} days; root-cause ${topComplaint.name}. Simulations: resolution-time or repeated-complaint what-ifs — illustrative only. AI does not close complaints alone.`, `أغلق المتأخرات وحلّل ${topComplaint.name}.`),
      role: tx(lang, 'Patient relations lead', 'قائد علاقات المرضى'),
      benefit: tx(lang, 'Balanced complaint ledgers keep recovery actions auditable.', 'دفتر متوازن يبقي الإجراءات قابلة للتدقيق.'),
    });
  }

  if (/touchpoint|journey|waiting comment|wait(ing)? score|discharge score|linkage/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Journey & touchpoints · ${name} · ${view.periodLabel}`, `الرحلة ونقاط الاتصال · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: journey satisfaction ${view.journeySatisfaction}/10 · waiting ${view.waitingScore} · communication ${view.communicationScore} · discharge ${view.dischargeScore} · negative touchpoint share ${p(view.negativeTouchpointShare)} · weakest ${weakestTp.name} ${weakestTp.score}/10 · linkage ${p(view.journeyLinkageCoverage)}.`, `أضعف نقطة ${weakestTp.name}.`),
      evidence: tx(lang, `Linked ${n(view.linkedJourneyResponses)} · unlinked ${n(view.unlinkedJourneyResponses)} retained without fabricated joins. ${view.methodology.journey}`, 'التغطية دون ربط مفتعل.'),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): waiting and discharge concentrate negative linked ratings. Operational ED/OPD waits are supporting context only — not PX headlines.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, `Recommendations: lift ${weakestTp.name} and Waiting with local service standards. Simulations: waiting-time or low-touchpoint what-ifs. No real patient quotes are shown.`, `حسّن ${weakestTp.name}.`),
      role: tx(lang, 'Patient access & experience lead', 'قائد الوصول والتجربة'),
      benefit: tx(lang, 'Keeping unlinked responses avoids inventing operational joins.', 'الاحتفاظ بغير المربوط يمنع الربط المختلق.'),
    });
  }

  if (/voice|sentiment|theme|comment|recurring|emerging|feedback/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Voice of patient · ${name} · ${view.periodLabel}`, `صوت المريض · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: comments analyzed ${n(view.commentsAnalyzed)} · negative share ${p(view.negativeFeedbackShare)} · emerging themes ${n(view.emergingThemes)} · high-priority feedback ${n(view.highPriorityFeedback)} · review coverage ${p(view.themeReviewCoverage)} · top negative ${topNegTheme?.name ?? 'n/a'} (${n(topNegTheme?.negative ?? 0)}).`, `مواضيع ناشئة ${n(view.emergingThemes)}.`),
      evidence: tx(lang, `${view.methodology.voice} Sample rows are clearly labeled [SYNTHETIC] — not real patient quotes.`, 'تعليقات تركيبية فقط.'),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): recurring negative themes may align with complaint categories, but theme co-occurrence is not causal proof.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: human-review safety-flagged and pending items; monitor emerging themes without treating auto-sentiment as clinical harm. Simulations stay illustrative.', 'راجع العناصر ذات الأولوية بشرياً.'),
      role: tx(lang, 'Patient experience analytics lead', 'قائد تحليلات تجربة المريض'),
      benefit: tx(lang, 'Synthetic comments and review-status fields keep voice analytics honest.', 'التعليقات التركيبية تبقي التحليل صادقاً.'),
    });
  }

  if (/interven|priorit|first|improve|optim|what.?if|action|monitor|opportunity/.test(q)) {
    const sims = view.opportunities.slice(0, 3).map((item) => `${item.title} (~${item.modeledUpliftPoints} pts)`).join('; ');
    return pack(lang, {
      title: tx(lang, `Experience improvement · ${name} · ${view.periodLabel}`, `تحسين التجربة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: addressable gap ${view.addressableGap} pts · opportunities ${n(view.improvementOpportunities)} · modeled uplift ${view.modeledUplift} · complaint reduction sketch ${n(view.complaintReduction)} · priority coverage ${p(view.priorityCoverage)}. First intervene: ${priorityOpt?.title ?? 'waiting dissatisfaction'}.`, `الفجوة ${view.addressableGap}.`),
      evidence: tx(lang, `${priorityOpt?.evidence ?? view.methodology.optimization} Owner ${priorityOpt?.owner ?? 'Experience Improvement Office'}.`, view.methodology.optimization),
      explanation: tx(lang, `Hypotheses / Simulations (illustrative, not achieved): ${sims}. Impacts are assumed — not guaranteed. No causal claim from survey correlation.`, 'محاكاة توضيحية وليست محققة.'),
      action: tx(lang, `Recommendations: sequence ${priorityOpt?.title ?? 'priority opportunity'} with named owner; monitor ${priorityOpt?.followUpMeasure ?? 'kpi_px_overall_satisfaction'} after the next reporting checkpoint. AI does not close complaints or change clinical care alone.`, `نفّذ الفرصة ذات الأولوية وراقب المؤشر.`),
      role: tx(lang, priorityOpt?.owner ?? 'Experience Improvement Office', priorityOpt?.owner ?? 'مكتب تحسين التجربة'),
      benefit: tx(lang, 'Constraint-aware opportunities prevent overstating achievable experience uplift.', 'الفرص المقيدة تمنع المبالغة.'),
    });
  }

  const hot = alertsFor(hospital, year).filter((alert) => alert.department === 'Patient Experience' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Patient Experience at ${name} · ${view.periodLabel}`, `تجربة المريض في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed}`
      : `Observed facts: overall ${view.overallSatisfaction}/10 · response ${p(view.responseRate)} · open complaints ${n(view.complaintsOpen)} · overdue ${n(view.overdueComplaints)} · Neg. Survey Share ${p(view.negativeShare)} · Neg. Comment Sentiment ${p(view.negativeFeedbackShare)}.`, topAlert ? topAlert.title : `الرضا ${view.overallSatisfaction}/10.`),
    evidence: tx(lang, `${view.methodology.grains} Instrument ${view.instrument.id} (internal — not HCAHPS).`, 'استبيان داخلي وليس HCAHPS.'),
    explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): waiting, communication, and recovery backlog move together across PX screens. Correlation is not causation. Operational analytics only — not clinical advice.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? `Review Command satisfaction, Journey (${weakestTp.name}), Complaints (${topComplaint.name}), then Optimization. Simulations are illustrative.`, topAlert?.action ?? 'راجع القيادة والرحلة والشكاوى.'),
    role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
    benefit: tx(lang, 'A sequenced PX review keeps survey, journey, complaints, voice, departments, and optimization distinct.', 'مراجعة متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerRcm(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildRcmView(hospital, year, period);
  const n = (value: number) => value.toLocaleString('en-US');
  const p = (value: number) => `${(value * 100).toFixed(1)}%`;
  const sar = (value: number) => `SAR ${n(value)}`;
  const topReason = [...view.denialReasonRows].sort((a, b) => b.amount - a.amount)[0];
  const topPayer = [...view.payerRows].sort((a, b) => b.denialRate - a.denialRate)[0];
  const topDriver = [...view.leakageDrivers].sort((a, b) => b.amount - a.amount)[0];
  const weakDept = [...view.deptCaptureRows].sort((a, b) => a.captureRate - b.captureRate)[0];
  const priorityOpp = [...view.opportunities].sort((a, b) => b.eligibleValue - a.eligibleValue)[0];
  const modeledNote = 'Modeled recovery is illustrative — not collected cash — and the eight scenarios overlap, so they must not be added together.';

  if (/\bed\b|emergency boarding|bed occupancy|icu transfer|staffed icu|medication order|stockout sku|analyzer util|or util|satisfaction score|complaint/.test(q)
    && !/revenue|claim|denial|billing|collection|payer|charge|ar\b/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Revenue Cycle focus', 'خارج تركيز دورة الإيراد'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'ED volume stays in Emergency, bed occupancy in Beds, ICU flow in ICU, medication orders in Pharmacy, and satisfaction in Patient Experience.', 'كل دومين يملك مؤشراته.'),
      explanation: tx(lang, 'Revenue Cycle owns eligibility and authorization, charge capture and billing, claims and denials, AR and collections, revenue leakage, and illustrative recovery scenarios.', 'دورة الإيراد تملك الأهلية والفوترة والمطالبات والتحصيل والتسرب.'),
      action: tx(lang, 'Stay on Revenue Cycle screens for financial questions.', 'ابقَ في شاشات دورة الإيراد.'),
      role: tx(lang, 'Revenue cycle director', 'مدير دورة الإيراد'),
      benefit: tx(lang, 'Clear ownership prevents duplicating clinical dashboards inside Revenue Cycle.', 'الملكية الواضحة تمنع التكرار.'),
    });
  }

  if (/dose|dosing|prescrib|treat the patient|prognosis|diagnos|clinical care|clinical advice|medical necessity decision|deny care|withhold care/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside financial operations support', 'خارج دعم العمليات المالية'),
      observation: tx(lang, 'Vital Assist does not give clinical care advice or decide whether a patient should receive treatment.', 'المساعد لا يقدم نصائح سريرية ولا يقرر تقديم العلاج.'),
      evidence: tx(lang, `Revenue Cycle reports administrative financial signals only: period cash-to-net ${p(view.netCollectionRate)}, gross denial ${p(view.grossDenialRate)}, authorization approval ${p(view.preauthApprovalRate)} (${view.periodLabel}). Authorization queues are administrative — not care decisions.`, 'مؤشرات مالية إدارية فقط.'),
      explanation: tx(lang, 'Clinical and coverage decisions stay with clinicians and payers. This demo uses synthetic illustrative data.', 'القرارات السريرية للأطباء والجهات الدافعة.'),
      action: tx(lang, 'Ask about denials, collections, authorization backlog, charge capture, or leakage instead.', 'اسأل عن الرفض أو التحصيل أو التفويض أو التسرب.'),
      role: tx(lang, 'Revenue cycle director', 'مدير دورة الإيراد'),
      benefit: tx(lang, 'Keeps financial analytics separate from clinical decisions.', 'يفصل التحليل المالي عن القرارات السريرية.'),
    });
  }

  if (/(submit|resubmit|send|file|transmit|push).*(claim|payer|clearinghouse|appeal)|(write.?off|adjust|post).*(balance|account|claim)|\b(auto.?)?(submit|write off)\b/.test(q)
    && !/what if|what happens|what could/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Live submission and write-offs are not performed by AI', 'لا ينفذ الذكاء الاصطناعي التقديم الحي ولا الشطب'),
      observation: tx(lang, `Vital Assist cannot submit claims to payers or clearinghouses and cannot write off balances. Observed facts for ${name}: ${n(view.uniqueClaims)} unique claims, ${n(view.deniedClaims)} denied, avoidable write-offs ${sar(view.avoidableWriteoffs)} (${view.periodLabel}).`, 'لا يمكن للمساعد تقديم المطالبات أو شطب الأرصدة.'),
      evidence: tx(lang, 'This demo has no live payer, clearinghouse, or ERP connection. All figures are synthetic and illustrative.', 'لا اتصال حي بالجهات الدافعة. الأرقام تركيبية.'),
      explanation: tx(lang, 'Submission, appeal, and write-off decisions require authorized human review under policy.', 'القرارات تتطلب مراجعة بشرية مخولة.'),
      action: tx(lang, 'Use Claims & Denial Intelligence to review the work queue, then route items to the denials team for human action.', 'استخدم شاشة المطالبات ثم حوّل العناصر للفريق المختص.'),
      role: tx(lang, 'Denials management lead', 'قائد إدارة الرفض'),
      benefit: tx(lang, 'Human approval keeps financial actions auditable.', 'الاعتماد البشري يبقي الإجراءات قابلة للتدقيق.'),
    });
  }

  if (/denial|denied|appeal|first.?pass|reject|claims?\b/.test(q) && !/leakage|underpay|write.?off/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Claims & denials · ${name} · ${view.periodLabel}`, `المطالبات والرفض · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: gross denial rate ${p(view.grossDenialRate)} (target ${p(RCM_TARGETS.grossDenialRate)}; ${n(view.deniedClaims)} of ${n(view.adjudicatedClaims)} adjudicated claims) · denied value rate ${p(view.denialRateByValue)} · first-pass acceptance ${p(view.firstPassAcceptance)} · appeal success ${p(view.appealSuccessRate)} · ${n(view.uniqueClaims)} unique claims from ${n(view.submissionAttempts)} submissions.`, `معدل الرفض ${p(view.grossDenialRate)}.`),
      evidence: tx(lang, `${view.methodology.claims} Largest denial reason by value: ${topReason.name} (${sar(topReason.amount)}). Highest-denial payer: ${topPayer.name} (${p(topPayer.denialRate)}).`, view.methodology.claims),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): ${topReason.name.toLowerCase()} and payer mix concentrate denials. Modeled (illustrative): recoverable denial value ${sar(view.recoverableDenialValue)}. ${modeledNote}`, 'أسباب محتملة وليست مثبتة. القيمة المقدرة توضيحية.'),
      action: tx(lang, `Recommendations: review preventable denial reasons and appeal queues with the denials team. Try the denial-reduction or first-pass what-ifs — illustrative only. AI does not submit claims or write off balances alone.`, 'راجع أسباب الرفض مع الفريق المختص.'),
      role: tx(lang, 'Denials management lead', 'قائد إدارة الرفض'),
      benefit: tx(lang, 'Separating clearinghouse rejects from payer denials keeps denial work accurate.', 'الفصل بين الرفض الفني ورفض الدافع يحسن الدقة.'),
    });
  }

  if (/\bar\b|receivable|collect|cash|aging|aged|days in ar|payer pay/.test(q)) {
    return pack(lang, {
      title: tx(lang, `AR & collections · ${name} · ${view.periodLabel}`, `الذمم والتحصيل · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: period cash-to-net ratio ${p(view.netCollectionRate)} (target ${p(RCM_TARGETS.netCollectionRate)}; not a cohort NCR) · days in AR ${view.daysInAr} (target ${RCM_TARGETS.daysInAr}) · ending AR ${sar(view.closingAR)} · AR over 90 days ${sar(view.arOver90)} · cash applied ${sar(view.cashApplied)} · unapplied cash ${sar(view.unappliedCash)}.`, `نسبة النقد إلى الإيراد الصافي ${p(view.netCollectionRate)}.`),
      evidence: tx(lang, `${view.methodology.arRollForward} AR roll-forward ${view.arRollForward.balanced ? 'balances' : 'does not balance'} (residual ${n(view.arRollForward.residual)}). Aging clock: ${view.agingClock}.`, view.methodology.arRollForward),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): aged balances and cash-application backlog. Modeled (illustrative): aged AR acceleration ${sar(view.cashAcceleration)} is a timing shift, not new revenue. ${modeledNote}`, 'أسباب محتملة وليست مثبتة. التسريع توقيت وليس إيراداً جديداً.'),
      action: tx(lang, 'Recommendations: rank aged balances for collector follow-up and clear unapplied cash exceptions. Simulations: try the aged-AR what-if. AI does not write off balances alone.', 'رتّب الأرصدة المتقادمة للمتابعة.'),
      role: tx(lang, 'Collections lead', 'قائد التحصيل'),
      benefit: tx(lang, 'Applied cash, receipts, and ending AR stay distinct so collection claims are not overstated.', 'فصل النقد المطبق عن المستلم يمنع المبالغة.'),
    });
  }

  if (/eligib|authori[sz]|pre-?auth|coverage|pending auth/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Eligibility & authorization · ${name} · ${view.periodLabel}`, `الأهلية والتفويض · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: eligibility verified ${p(view.eligibilityVerificationRate)} · coverage exceptions ${p(view.coverageExceptionRate)} · authorization approval ${p(view.preauthApprovalRate)} · pending ${n(view.authPending)} · turnaround ${view.authTurnaroundDays} days · authorization-related denial exposure ${sar(view.authDenialExposure)}.`, `الأهلية ${p(view.eligibilityVerificationRate)}.`),
      evidence: tx(lang, `Authorization ledger: requested ${n(view.authRequested)} + opening pending ${n(view.authOpeningPending)} = decided ${n(view.authDecided)} + closing pending ${n(view.authPending)}. Pending requests are excluded from the approval rate.`, 'دفتر التفويض متوازن.'),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): payer decision delays and missing authorization. Modeled (illustrative): ${sar(view.opportunities.find((item) => item.id === 'rcm-auth-up')?.eligibleValue ?? 0)} of exposure is preventable. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: work the oldest pending authorizations and confirm eligibility before scheduling. This is an administrative queue — not a care decision.', 'اعمل على أقدم التفويضات المعلقة. هذا طابور إداري وليس قراراً سريرياً.'),
      role: tx(lang, 'Pre-authorization desk lead', 'قائد مكتب التفويض'),
      benefit: tx(lang, 'Front-end authorization quality reduces back-end denials.', 'جودة التفويض تقلل الرفض لاحقاً.'),
    });
  }

  if (/charge|billing|coding|unbilled|capture|invoice|lag/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Charge capture & billing · ${name} · ${view.periodLabel}`, `التقاط الرسوم والفوترة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: charge capture ${p(view.chargeCaptureRate)} (target ${p(RCM_TARGETS.chargeCaptureRate)}) · unbilled encounters ${n(view.unbilledEncounters)} · unbilled value ${sar(view.unbilledValue)} · charge-to-bill lag ${view.chargeToBillLag} days · coding completion ${p(view.codingCompletionRate)} · billing exceptions ${p(view.billingExceptionRate)}.`, `التقاط الرسوم ${p(view.chargeCaptureRate)}.`),
      evidence: tx(lang, `Lowest-capture department: ${weakDept.name} (${p(weakDept.captureRate)}; missed value ${sar(weakDept.missedValue)}). Eligible chargeable services only — nonbillable and bundled services are excluded.`, 'الأقسام المؤهلة فقط.'),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): documentation and charge-router gaps. Modeled (illustrative): missed charges recoverable ${sar(view.opportunities.find((item) => item.id === 'rcm-capture-up')?.eligibleValue ?? 0)}. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: review likely missed-charge patterns with human charge review and clear coding backlog in age order.', 'راجع أنماط الرسوم المفقودة بمراجعة بشرية.'),
      role: tx(lang, 'Billing & coding operations lead', 'قائد عمليات الفوترة والترميز'),
      benefit: tx(lang, 'Eligible-only capture avoids overstating leakage.', 'الالتقاط المؤهل فقط يمنع المبالغة في التسرب.'),
    });
  }

  if (/leak|underpay|write.?off|integrity|missed/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Revenue leakage · ${name} · ${view.periodLabel}`, `تسرب الإيراد · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: confirmed leakage ${sar(view.confirmedLeakage)} = missed charges ${sar(view.missedChargeExposure)} + avoidable write-offs ${sar(view.avoidableWriteoffs)} + underpayments ${sar(view.underpaymentValue)} · potential leakage ${sar(view.potentialLeakage)} (not additive) · largest driver ${topDriver.name}.`, `التسرب المؤكد ${sar(view.confirmedLeakage)}.`),
      evidence: tx(lang, `${view.methodology.leakage}`, view.methodology.leakage),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): contract variance and late escalation. Modeled (illustrative): preventable leakage ${sar(view.preventableLeakage)}. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: dispute underpayments by payer and escalate preventable write-offs earlier. Contractual allowances are not leakage. AI does not write off balances alone.', 'اعترض على النقص في الدفع وصعّد الشطب القابل للتجنب.'),
      role: tx(lang, 'Revenue integrity lead', 'قائد سلامة الإيراد'),
      benefit: tx(lang, 'Exclusive attribution prevents double-counting leakage.', 'الإسناد الحصري يمنع العد المزدوج.'),
    });
  }

  if (/interven|priorit|first|improve|optim|what.?if|opportunit|recover|action/.test(q)) {
    const sims = view.opportunities.slice(0, 4).map((item) => `${item.title} (~${sar(item.eligibleValue)})`).join('; ');
    return pack(lang, {
      title: tx(lang, `Revenue recovery priorities · ${name} · ${view.periodLabel}`, `أولويات استرداد الإيراد · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: period cash-to-net ${p(view.netCollectionRate)} · gross denial ${p(view.grossDenialRate)} · confirmed leakage ${sar(view.confirmedLeakage)} · revenue at risk ${sar(view.revenueAtRisk)}. Largest modeled scenario: ${priorityOpp.title}.`, `الإيراد المعرض للخطر ${sar(view.revenueAtRisk)}.`),
      evidence: tx(lang, `${view.methodology.optimization}`, view.methodology.optimization),
      explanation: tx(lang, `Modeled (illustrative, not collected cash): recoverable opportunity ${sar(view.recoverableOpportunity)}; ${sims}. ${modeledNote}`, 'محاكاة توضيحية وليست نقداً محصلاً.'),
      action: tx(lang, `Recommendations: sequence ${priorityOpp.title.toLowerCase()} with owner ${priorityOpp.owner}; monitor the follow-up KPI after the next reporting checkpoint. AI does not submit claims or write off balances alone.`, `نفّذ الأولوية وراقب المؤشر.`),
      role: tx(lang, priorityOpp.owner, priorityOpp.owner),
      benefit: tx(lang, 'Constraint-aware scenarios prevent overstating recoverable revenue.', 'السيناريوهات المقيدة تمنع المبالغة.'),
    });
  }

  const hot = alertsFor(hospital, year, period).filter((alert) => alert.department === 'Revenue Cycle' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Revenue Cycle at ${name} · ${view.periodLabel}`, `دورة الإيراد في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed} (${topAlert.period})`
      : `Observed facts: net patient revenue ${sar(view.netPatientRevenue)} · period cash-to-net ${p(view.netCollectionRate)} · gross denial ${p(view.grossDenialRate)} · days in AR ${view.daysInAr} · ending AR ${sar(view.closingAR)}.`, topAlert ? topAlert.title : `الإيراد الصافي ${sar(view.netPatientRevenue)}.`),
    evidence: tx(lang, `${view.methodology.netRevenue} ${view.methodology.currency}`, view.methodology.netRevenue),
    explanation: tx(lang, `Potential drivers / Hypotheses (not proven): denials, aged AR, and capture gaps move together across Revenue Cycle screens. Modeled recovery (illustrative): revenue at risk ${sar(view.revenueAtRisk)} is exposure, not lost or collected cash.`, 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? 'Review Command health, then Claims & denials, AR & collections, and Leakage. Simulations are illustrative.', topAlert?.action ?? 'راجع القيادة ثم المطالبات والتحصيل والتسرب.'),
    role: tx(lang, 'Revenue cycle director', 'مدير دورة الإيراد'),
    benefit: tx(lang, 'A sequenced review keeps eligibility, billing, claims, collections, and leakage distinct.', 'مراجعة متسلسلة تبقي المجالات متميزة.'),
  });
}

function answerQs(
  q: string,
  hospital: string,
  year: number,
  name: string,
  lang: Lang,
  period: ReportPeriod,
): AssistantAnswer {
  const view = buildQsView(hospital, year, period);
  const n = (value: number, digits = 0) => value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const p = (value: number) => `${(value * 100).toFixed(1)}%`;
  const rate1k = (value: number) => `${n(value, 1)} /1k`;
  const modeledNote = 'Modeled figures are illustrative under documented assumptions — not measured improvement, not certified NHSN rates, and not an official SIR.';
  const priorityOpp = [...view.opportunities].sort((a, b) => b.eligibleValue - a.eligibleValue)[0];
  const topCategory = [...view.categoryRows].sort((a, b) => b.count - a.count)[0];

  if (/ed wait|emergency boarding|bed occupancy|no-?show|or utilization|imaging backlog|lab tat|pharmacy stock|icu transfer|patient satisfaction|claim denial|net collection|revenue leakage/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside Quality & Safety focus', 'خارج تركيز الجودة والسلامة'),
      observation: tx(lang, 'That question belongs to another domain ownership boundary.', 'هذا السؤال يخص حدود ملكية دومين آخر.'),
      evidence: tx(lang, 'ED waits stay in Emergency, occupancy in Beds, satisfaction in Patient Experience, and denials in Revenue Cycle.', 'كل دومين يملك مؤشراته.'),
      explanation: tx(lang, 'Quality & Safety owns incident intelligence, HAI surveillance, infection prevention, clinical outcomes, RCA/CAPA, and illustrative safety scenarios.', 'الجودة والسلامة تملك الحوادث والعدوى والوقاية والنتائج وRCA.'),
      action: tx(lang, 'Stay on Quality & Safety screens for safety, infection, and CAPA questions.', 'ابقَ في شاشات الجودة والسلامة.'),
      role: tx(lang, 'Chief quality officer', 'رئيس الجودة'),
      benefit: tx(lang, 'Clear ownership prevents duplicating operational dashboards inside Quality & Safety.', 'الملكية الواضحة تمنع التكرار.'),
    });
  }

  if (/diagnos|prescrib|treat the patient|prognosis|medical device|autonomous infection|order isolation|close capa alone/.test(q)) {
    return pack(lang, {
      title: tx(lang, 'Outside autonomous clinical decision support', 'خارج الدعم السريري الذاتي'),
      observation: tx(lang, 'Vital Assist is a clinical-governance intelligence layer — not a diagnostic system, medical device, or autonomous infection-control engine.', 'المساعد طبقة حوكمة سريرية وليس نظام تشخيص أو جهاز طبي.'),
      evidence: tx(lang, `Observed facts for ${name}: validated event rate ${rate1k(view.validatedEventRate)} · CLABSI ${n(view.clabsiRate, 2)} /1k CL-days · hand hygiene ${p(view.handHygiene)} (${view.periodLabel}). ${view.sirNote}`, 'مؤشرات حوكمة فقط.'),
      explanation: tx(lang, 'Every clinically meaningful interpretation requires authorized human review.', 'كل تفسير سريري يتطلب مراجعة بشرية مخولة.'),
      action: tx(lang, 'Ask about validated events, HAI rates, prevention compliance, outcomes, or RCA/CAPA instead.', 'اسأل عن الحوادث أو العدوى أو الوقاية أو RCA.'),
      role: tx(lang, 'Patient safety director', 'مدير سلامة المرضى'),
      benefit: tx(lang, 'Keeps governance analytics separate from clinical orders.', 'يفصل تحليل الحوكمة عن الأوامر السريرية.'),
    });
  }

  if (/clabsi|cauti|ssi|hai|infection|device.?day|surveillance|cdi|mrsa/.test(q)) {
    return pack(lang, {
      title: tx(lang, `HAI surveillance · ${name} · ${view.periodLabel}`, `ترصد العدوى · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: CLABSI ${n(view.clabsiRate, 2)} /1k CL-days (target ${QS_TARGETS.clabsiRate}; ${n(view.clabsi)} / ${n(view.centralLineDays)} CL-days) · CAUTI ${n(view.cautiRate, 2)} /1k UC-days · SSI ${p(view.ssiRate)} · HO CDI ${n(view.cdi)} · validated HAI ${n(view.haiCases)} · surveillance coverage ${p(view.surveillanceCoverage)}.`, `CLABSI ${n(view.clabsiRate, 2)}.`),
      evidence: tx(lang, `${view.methodology.infections}`, view.methodology.infections),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): device utilization and prevention-process gaps. Modeled (illustrative): ${n(view.modeledHaiPrevention)} preventable HAI events. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: review unit device-days vs events and bundle compliance with Infection Prevention. Do not treat process compliance as proven infection reduction.', 'راجع أيام الأجهزة والامتثال مع مكافحة العدوى.'),
      role: tx(lang, 'Infection prevention director', 'مدير مكافحة العدوى'),
      benefit: tx(lang, 'Device-day and procedure denominators keep HAI rates defensible.', 'المقامات الصحيحة تبقي المعدلات قابلة للدفاع.'),
    });
  }

  if (/hand.?hygiene|bundle|isolation|prevention|audit|compliance/.test(q) && !/capa|rca/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Infection prevention · ${name} · ${view.periodLabel}`, `الوقاية من العدوى · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: hand hygiene ${p(view.handHygiene)} (target ${p(QS_TARGETS.handHygiene)}; ${n(view.hhCompliant)} / ${n(view.hhEligible)} audited opportunities) · isolation ${p(view.isolationCompliance)} · CL bundle ${p(view.clBundle)} · UC bundle ${p(view.ucBundle)} · IP audit completion ${p(view.ipAuditCompletion)} · prevention gaps ${n(view.preventionGaps)}.`, `نظافة اليدين ${p(view.handHygiene)}.`),
      evidence: tx(lang, `${view.methodology.prevention}`, view.methodology.prevention),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): observation coverage and unit process reliability. Modeled (illustrative): compliance uplift ${p(view.modeledComplianceUplift)}. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: increase eligible observation coverage on lagging units and close high-risk prevention gaps. Compliance alone does not prove infection reduction.', 'زد تغطية الملاحظة وأغلق فجوات الوقاية.'),
      role: tx(lang, 'Infection prevention director', 'مدير مكافحة العدوى'),
      benefit: tx(lang, 'Audited-opportunity framing avoids overstating universal compliance.', 'صيغة الفرص المدققة تمنع المبالغة.'),
    });
  }

  if (/incident|near.?miss|harm|report|investigat|fall|medication.?related|sentinel/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Incident intelligence · ${name} · ${view.periodLabel}`, `ذكاء الحوادث · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: reported ${n(view.reported)} · validated ${n(view.validated)} · near miss ${n(view.nearMiss)} · with harm ${n(view.withHarm)} · severe harm ${n(view.severeHarm)} · investigation timeliness ${p(view.investigationTimeliness)} · classification completeness ${p(view.classificationCompleteness)}. Largest category: ${topCategory?.name ?? 'n/a'} (${n(topCategory?.count ?? 0)}).`, `المبلغ ${n(view.reported)}.`),
      evidence: tx(lang, `${view.methodology.incidents}`, view.methodology.incidents),
      explanation: tx(lang, `Potential drivers / Hypotheses (not proven): reporting culture and recurring category concentration. Modeled (illustrative): ${n(view.modeledIncidentReduction)} preventable harm events. ${modeledNote}`, 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: complete classification labels and clear overdue investigations before ranking departments. Do not auto-classify sentinel events for regulation.', 'أكمل التصنيف وأغلق التحقيقات المتأخرة.'),
      role: tx(lang, 'Patient safety director', 'مدير سلامة المرضى'),
      benefit: tx(lang, 'Separating reporting volume from harm keeps safety signals honest.', 'فصل حجم الإبلاغ عن الضرر يحافظ على صدق الإشارة.'),
    });
  }

  if (/readmit|hapi|pressure.?injur|falls with|postop|outcome|mortality review|complication/.test(q)) {
    return pack(lang, {
      title: tx(lang, `Clinical outcomes · ${name} · ${view.periodLabel}`, `النتائج السريرية · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: eligible 30-day unplanned readmission ${p(view.readmissionRate)} (target ${p(QS_TARGETS.readmissionRate)}; same-facility only) · HAPI ${n(view.pressureInjuryRate, 2)} /1k · falls with injury ${n(view.fallsWithInjuryRate, 2)} /1k · postop complications ${p(view.postopComplicationRate)} · outcome coverage ${p(view.outcomeMeasureCoverage)} · review backlog ${n(view.outcomeReviewBacklog)}.`, `إعادة الدخول ${p(view.readmissionRate)}.`),
      evidence: tx(lang, `${view.methodology.outcomes}`, view.methodology.outcomes),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): care transitions and skin/mobility reliability. Death counts do not imply avoidability. Rates are descriptive — not risk-adjusted rankings.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: clear outcome review backlog and confirm eligible cohort exclusions with Care Transitions.', 'صفّر متأخرات مراجعة النتائج مع انتقالات الرعاية.'),
      role: tx(lang, 'Care transitions lead', 'قائد انتقالات الرعاية'),
      benefit: tx(lang, 'Same-facility and eligibility framing prevents overstated outcome claims.', 'صيغة الأهلية تمنع المبالغة في النتائج.'),
    });
  }

  if (/rca|capa|learning|effectiveness|overdue action|recurring theme/.test(q)) {
    return pack(lang, {
      title: tx(lang, `RCA & CAPA · ${name} · ${view.periodLabel}`, `RCA وCAPA · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: open RCA ${n(view.openRca)} · overdue RCA ${n(view.overdueRca)} · CAPA on-time ${p(view.capaOntime)} (target ${p(QS_TARGETS.capaOntime)}) · open CAPA ${n(view.openCapa)} · recurring themes ${n(view.recurringThemes)} · effectiveness review ${p(view.effectivenessReviewRate)} · overdue high-risk actions ${n(view.overdueHighRiskActions)}.`, `RCA المفتوح ${n(view.openRca)}.`),
      evidence: tx(lang, `${view.methodology.rca}`, view.methodology.rca),
      explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): investigation lag and incomplete effectiveness review. Approval of an action is not measured improvement.', 'أسباب محتملة وليست مثبتة.'),
      action: tx(lang, 'Recommendations: age the CAPA ledger, escalate overdue high-risk items, and schedule effectiveness reviews for closed actions.', 'رتّب إجراءات CAPA وصعّد المتأخر عالي المخاطر.'),
      role: tx(lang, 'Quality governance lead', 'قائد حوكمة الجودة'),
      benefit: tx(lang, 'Learning-system throughput stays distinct from proven outcome improvement.', 'إنتاجية التعلم تبقى منفصلة عن تحسن النتائج المثبت.'),
    });
  }

  if (/interven|priorit|first|improve|optim|what.?if|opportunit|action|scenario/.test(q)) {
    const sims = view.opportunities.slice(0, 4).map((item) => `${item.title} (~${n(item.eligibleValue)})`).join('; ');
    return pack(lang, {
      title: tx(lang, `Quality & safety priorities · ${name} · ${view.periodLabel}`, `أولويات الجودة والسلامة · ${name} · ${view.periodLabel}`),
      observation: tx(lang, `Observed facts: validated event rate ${rate1k(view.validatedEventRate)} · HAI burden ${rate1k(view.haiBurdenRate)} · overdue high-risk actions ${n(view.overdueHighRiskActions)} · addressable gap ${rate1k(view.addressableGap)}. Largest modeled scenario: ${priorityOpp.title}.`, `فجوة قابلة للمعالجة ${rate1k(view.addressableGap)}.`),
      evidence: tx(lang, `${view.methodology.optimization}`, view.methodology.optimization),
      explanation: tx(lang, `Modeled (illustrative): incident reduction ${n(view.modeledIncidentReduction)}; HAI prevention ${n(view.modeledHaiPrevention)}; ${sims}. ${modeledNote}`, 'محاكاة توضيحية وليست تحسناً مقيساً.'),
      action: tx(lang, `Recommendations: sequence ${priorityOpp.title.toLowerCase()} with owner ${priorityOpp.owner}; monitor ${priorityOpp.followUp} after the next reporting checkpoint. AI does not diagnose, order isolation, or close CAPA alone.`, `نفّذ الأولوية وراقب المؤشر.`),
      role: tx(lang, priorityOpp.owner, priorityOpp.owner),
      benefit: tx(lang, 'Non-additive scenarios prevent overstating combined improvement.', 'السيناريوهات غير الجمعية تمنع المبالغة.'),
    });
  }

  const hot = alertsFor(hospital, year, period).filter((alert) => alert.department === 'Quality & Safety' && alert.severity !== 'info');
  const topAlert = hot[0];
  return pack(lang, {
    title: tx(lang, `Quality & Safety at ${name} · ${view.periodLabel}`, `الجودة والسلامة في ${name} · ${view.periodLabel}`),
    observation: tx(lang, topAlert
      ? `${topAlert.title}: ${topAlert.observed} (${topAlert.period})`
      : `Observed facts: validated event rate ${rate1k(view.validatedEventRate)} · severe harm ${n(view.severeHarm)} · HAI burden ${rate1k(view.haiBurdenRate)} · quality compliance ${p(view.qualityCompliance)} · overdue high-risk actions ${n(view.overdueHighRiskActions)}.`, topAlert ? topAlert.title : `معدل الأحداث ${rate1k(view.validatedEventRate)}.`),
    evidence: tx(lang, `${view.methodology.clinical} ${view.methodology.incidents}`, view.methodology.clinical),
    explanation: tx(lang, 'Potential drivers / Hypotheses (not proven): harm events, device-associated infection burden, and overdue CAPA move together across Quality & Safety screens. Official SIR is unavailable.', 'أسباب محتملة وليست مثبتة.'),
    action: tx(lang, topAlert?.action ?? 'Review Command signals, then Incidents, Infections, Prevention, Outcomes, and RCA/CAPA. Simulations are illustrative.', topAlert?.action ?? 'راجع القيادة ثم الحوادث والعدوى والوقاية والنتائج وRCA.'),
    role: tx(lang, 'Chief quality officer', 'رئيس الجودة'),
    benefit: tx(lang, 'A sequenced review keeps reporting, surveillance, prevention, outcomes, and learning distinct.', 'مراجعة متسلسلة تبقي المجالات متميزة.'),
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
