import { tx, type Lang } from './copy';
import { HOSPITALS } from './engine';
import { CURRENCY, scenarioFor } from './facts';

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

export function answerQuestion(question: string, hospital: string, year: number, department: string, lang: Lang = 'en'): AssistantAnswer {
  const q = question.toLowerCase();
  const current = scenarioFor(hospital, year).focus;
  const prior = scenarioFor(hospital, Math.max(2024, year - 1)).focus;
  const sites = scenarioFor('ALL', year).sites;
  const name = siteName(hospital, lang);
  const waitNow = current.edWaitMedianMin;
  const waitThen = prior.edWaitMedianMin;
  const busiest = [...sites].sort((a, b) => b.annual.occupiedBeds / b.annual.staffedBeds - a.annual.occupiedBeds / a.annual.staffedBeds)[0];
  const denialSites = [...sites].sort((a, b) => b.annual.claimsDenied / b.annual.claimsSubmitted - a.annual.claimsDenied / a.annual.claimsSubmitted)[0];
  const lowSat = [...sites].sort((a, b) => a.annual.satisfaction - b.annual.satisfaction)[0];

  if (q.includes('wait') || q.includes('emergency') || q.includes('طوار') || q.includes('انتظار')) {
    const delta = waitNow - waitThen;
    return pack(lang, {
      title: tx(lang, `Emergency time at ${name} in ${year}`, `زمن الطوارئ في ${name} عام ${year}`),
      observation: tx(lang, `Median wait is ${waitNow.toFixed(0)} minutes. P90 is ${current.edWaitP90Min.toFixed(0)} minutes.`, `وسيط الانتظار ${waitNow.toFixed(0)} دقيقة. المئين 90 هو ${current.edWaitP90Min.toFixed(0)} دقيقة.`),
      evidence: tx(lang, `${current.edArrivals.toLocaleString('en-US')} arrivals. Admitted ${current.edAdmitted.toLocaleString('en-US')}, which are included in inpatient admissions. Department filter: ${department}.`, `${current.edArrivals.toLocaleString('en-US')} وصولاً. نُوّم ${current.edAdmitted.toLocaleString('en-US')} وهم ضمن التنويم. مرشح القسم: ${department}.`),
      explanation: tx(lang, `Hypothesis, not a proven cause: the change versus ${year === 2024 ? 'the 2024 baseline' : year - 1} is ${delta.toFixed(0)} minutes, alongside occupancy of ${((current.occupiedBeds / current.staffedBeds) * 100).toFixed(1)}%.`, `فرضية وليست سبباً مثبتاً: التغير مقابل ${year === 2024 ? 'خط أساس 2024' : year - 1} هو ${delta.toFixed(0)} دقيقة، مع إشغال ${((current.occupiedBeds / current.staffedBeds) * 100).toFixed(1)}٪.`),
      action: tx(lang, 'Review a simulated midday physician and bed-desk overlap for the emergency queue.', 'راجع تداخلاً محاكى منتصف اليوم بين الطبيب ومكتب الأسرة لطابور الطوارئ.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Illustrative only: the story shows a shorter afternoon tail. Not a forecast.', 'توضيحي فقط: القصة تعرض ذيلاً أقصر بعد الظهر. ليس توقعاً.'),
    });
  }
  if (q.includes('capacity') || q.includes('bed') || q.includes('hospital') || q.includes('طاق') || q.includes('سرير') || q.includes('مستشفى')) {
    const rate = busiest.annual.occupiedBeds / busiest.annual.staffedBeds;
    return pack(lang, {
      title: tx(lang, `${siteName(busiest.code, lang)} is the tightest in ${year}`, `${siteName(busiest.code, lang)} هو الأضيق عام ${year}`),
      observation: tx(lang, `Occupancy there is ${(rate * 100).toFixed(1)}% of staffed beds.`, `الإشغال هناك ${(rate * 100).toFixed(1)}٪ من الأسرة المجهزة.`),
      evidence: tx(lang, `Occupied ${busiest.annual.occupiedBeds}, available ${busiest.annual.availableBeds}, blocked ${busiest.annual.blockedBeds}. They sum to ${busiest.annual.staffedBeds} staffed beds.`, `المشغول ${busiest.annual.occupiedBeds} والمتاح ${busiest.annual.availableBeds} والمغلق ${busiest.annual.blockedBeds}. مجموعها ${busiest.annual.staffedBeds} سريراً مجهزاً.`),
      explanation: tx(lang, 'Hypothesis: high occupancy and ED admissions are moving together in this scenario. That is not a proven clinical cause.', 'فرضية: الإشغال المرتفع وتنويم الطوارئ يتحركان معاً في هذا السيناريو. هذا ليس سبباً سريرياً مثبتاً.'),
      action: tx(lang, 'Review discharge-ready patients on the two fullest wards before opening extra staffed beds.', 'راجع المرضى الجاهزين للخروج في الجناحين الأكثر امتلاءً قبل فتح أسرة مجهزة إضافية.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Illustrative only: a few snapshot beds returning to available.', 'توضيحي فقط: عودة بضعة أسرة في اللقطة إلى المتاح.'),
    });
  }
  if (q.includes('satisfaction') || q.includes('patient') || q.includes('رضا') || q.includes('تجرب')) {
    return pack(lang, {
      title: tx(lang, `Satisfaction is lowest at ${siteName(lowSat.code, lang)}`, `الرضا هو الأدنى في ${siteName(lowSat.code, lang)}`),
      observation: tx(lang, `Index ${lowSat.annual.satisfaction.toFixed(1)} / 100. Response rate ${((lowSat.annual.surveysReturned / lowSat.annual.surveysSent) * 100).toFixed(1)}%.`, `المؤشر ${lowSat.annual.satisfaction.toFixed(1)} / 100. معدل الاستجابة ${((lowSat.annual.surveysReturned / lowSat.annual.surveysSent) * 100).toFixed(1)}٪.`),
      evidence: tx(lang, `Opened complaints ${lowSat.annual.complaintsOpened}, closed ${lowSat.annual.complaintsClosed}. Survey fields are labelled demo assumptions.`, `الشكاوى المفتوحة ${lowSat.annual.complaintsOpened} والمغلقة ${lowSat.annual.complaintsClosed}. حقول الاستبيان افتراضات للعرض.`),
      explanation: tx(lang, 'Hypothesis: the lower index sits with a lower response rate and more open complaints. Association in the story, not a proven cause.', 'فرضية: المؤشر الأدنى يجلس مع معدل استجابة أقل وشكاوى مفتوحة أكثر. ارتباط في القصة، وليس سبباً مثبتاً.'),
      action: tx(lang, 'Review the six open experience cases, starting with discharge instructions and the day-7 call.', 'راجع حالات التجربة المفتوحة الست، بدءاً بتعليمات الخروج ومكالمة اليوم السابع.'),
      role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
      benefit: tx(lang, 'Illustrative only: more of the open complaints reach closed in the story.', 'توضيحي فقط: مزيد من الشكاوى المفتوحة تصل إلى الإغلاق في القصة.'),
    });
  }
  if (q.includes('denial') || q.includes('claim') || q.includes('رفض') || q.includes('مطال')) {
    const rate = denialSites.annual.claimsDenied / denialSites.annual.claimsSubmitted;
    const priorRate = scenarioFor(denialSites.code, Math.max(2024, year - 1)).focus.claimsDenied / scenarioFor(denialSites.code, Math.max(2024, year - 1)).focus.claimsSubmitted;
    return pack(lang, {
      title: tx(lang, `Denials are highest at ${siteName(denialSites.code, lang)}`, `الرفض هو الأعلى في ${siteName(denialSites.code, lang)}`),
      observation: tx(lang, `Denial rate ${(rate * 100).toFixed(1)}% in ${year}, versus ${(priorRate * 100).toFixed(1)}% in ${Math.max(2024, year - 1)}. The change is ${((rate - priorRate) * 100).toFixed(1)} percentage points.`, `معدل الرفض ${(rate * 100).toFixed(1)}٪ في ${year}، مقابل ${(priorRate * 100).toFixed(1)}٪ في ${Math.max(2024, year - 1)}. التغير ${((rate - priorRate) * 100).toFixed(1)} نقطة مئوية.`),
      evidence: tx(lang, `Denied ${denialSites.annual.claimsDenied.toLocaleString('en-US')} of ${denialSites.annual.claimsSubmitted.toLocaleString('en-US')} submitted. Write-off ${CURRENCY} ${denialSites.annual.writeoff.toLocaleString('en-US')} is the amount inside the allowed-balance identity.`, `رُفض ${denialSites.annual.claimsDenied.toLocaleString('en-US')} من ${denialSites.annual.claimsSubmitted.toLocaleString('en-US')} مقدمة. الشطب ${CURRENCY} ${denialSites.annual.writeoff.toLocaleString('en-US')} هو المبلغ داخل مطابقة الرصيد المسموح.`),
      explanation: tx(lang, 'Hypothesis: pre-authorization denials and claim denials are both higher at the south hospital in this story. Not a coding audit.', 'فرضية: رفض الموافقة المسبقة ورفض المطالبات كلاهما أعلى في المستشفى الجنوبي في هذه القصة. ليست مراجعة ترميز.'),
      action: tx(lang, 'Review a simulated pre-submission check on the highest-denial payer mix.', 'راجع فحصاً محاكى قبل التقديم على مزيج الجهات الأعلى رفضاً.'),
      role: tx(lang, 'Revenue cycle lead', 'قائد دورة الإيراد'),
      benefit: tx(lang, 'Illustrative only: a smaller write-off in the story, not a collected cash result.', 'توضيحي فقط: شطب أصغر في القصة، وليس نتيجة نقد محصل.'),
    });
  }
  return pack(lang, {
    title: tx(lang, `Delays to review at ${name} in ${year}`, `تأخيرات للمراجعة في ${name} عام ${year}`),
    observation: tx(lang, `ED median ${waitNow.toFixed(0)} minutes. Lab median ${current.labTatMedianMin.toFixed(0)} minutes. Imaging median ${(current.radTatMedianMin / 60).toFixed(1)} hours.`, `وسيط الطوارئ ${waitNow.toFixed(0)} دقيقة. وسيط المختبر ${current.labTatMedianMin.toFixed(0)} دقيقة. وسيط الأشعة ${(current.radTatMedianMin / 60).toFixed(1)} ساعة.`),
    evidence: tx(lang, `Lab delayed orders ${current.labDelayed.toLocaleString('en-US')} of ${current.labOrders.toLocaleString('en-US')}. Theatre cancellations ${current.surgCancelled.toLocaleString('en-US')} of ${current.surgRequests.toLocaleString('en-US')}.`, `طلبات المختبر المتأخرة ${current.labDelayed.toLocaleString('en-US')} من ${current.labOrders.toLocaleString('en-US')}. إلغاءات العمليات ${current.surgCancelled.toLocaleString('en-US')} من ${current.surgRequests.toLocaleString('en-US')}.`),
    explanation: tx(lang, 'Hypothesis: delays cluster where occupancy and cancellation are already high. The factors are co-movement in the scenario, not a causal model.', 'فرضية: التأخير يتجمع حيث الإشغال والإلغاء مرتفعان أصلاً. العوامل حركة مشتركة في السيناريو، وليست نموذجاً سببياً.'),
    action: tx(lang, 'Review one queue at a time: emergency midday coverage, then laboratory delayed orders.', 'راجع طابوراً واحداً في كل مرة: تغطية الطوارئ منتصف اليوم، ثم طلبات المختبر المتأخرة.'),
    role: tx(lang, 'Hospital operations lead', 'قائد عمليات المستشفى'),
    benefit: tx(lang, 'Illustrative only. Any shorter time on the outcome stage is not a measured hospital result.', 'توضيحي فقط. أي زمن أقصر في مرحلة النتيجة ليس نتيجة مستشفى مقيسة.'),
  });
}

function pack(lang: Lang, body: Omit<AssistantAnswer, 'approval' | 'outcome'>): AssistantAnswer {
  return {
    ...body,
    approval: tx(lang, 'Simulated approval: a named lead records a demo-only decision in this browser. Nothing is sent to a hospital.', 'اعتماد محاكى: قائد مسمى يسجل قراراً للعرض فقط في هذا المتصفح. لا يُرسل شيء إلى مستشفى.'),
    outcome: tx(lang, 'Simulated outcome: shown only after that demo approval, and labelled as an illustration.', 'نتيجة محاكاة: تظهر فقط بعد اعتماد العرض، وتُعلَّم كتوضيح.'),
  };
}
