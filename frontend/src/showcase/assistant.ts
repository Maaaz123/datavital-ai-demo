import { tx, type Lang } from './copy';
import { HOSPITALS } from './engine';
import { CURRENCY, scenarioFor } from './facts';
import { alertsFor } from '@/core/alerts';

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
  if (/bed|inpatient|command/.test(path)) return ASSISTANT_PROMPTS[1].en;
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
  const busiest = [...sites].sort((a, b) => b.annual.occupiedBeds / b.annual.staffedBeds - a.annual.occupiedBeds / a.annual.staffedBeds)[0];
  const denialSites = [...sites].sort((a, b) => b.annual.claimsDenied / b.annual.claimsSubmitted - a.annual.claimsDenied / a.annual.claimsSubmitted)[0];
  const lowSat = [...sites].sort((a, b) => a.annual.satisfaction - b.annual.satisfaction)[0];

  if (department === 'Emergency') {
    const outside = /\b(workforce|staffing|satisfaction|complaint|survey|claim|revenue|cost|laboratory|imaging|pharmacy|radiology)\b/.test(q)
      || (/\bbeds?\b/.test(q) && !/\bboarding\b/.test(q));
    if (outside) {
      return pack(lang, {
        title: tx(lang, 'Outside Emergency Department Intelligence', 'خارج ذكاء قسم الطوارئ'),
        observation: tx(lang, 'This view covers the emergency visit only.', 'هذه الواجهة تغطي زيارة الطوارئ فقط.'),
        evidence: tx(lang, 'Hospital beds, workforce, experience, revenue, laboratory, imaging, and pharmacy are not emergency indicators.', 'أسرة المستشفى والقوى العاملة والتجربة والإيراد والمختبر والأشعة والصيدلية ليست مؤشرات طوارئ.'),
        explanation: tx(lang, 'A figure from another system may later help explain an emergency delay. It is not an emergency dashboard.', 'رقم من نظام آخر قد يساعد لاحقاً في تفسير تأخر طوارئ. هو ليس لوحة طوارئ.'),
        action: tx(lang, 'Stay with arrival, triage, waiting, flow, boarding, left without being seen, return, and mortality.', 'ابقَ عند الوصول والفرز والانتظار والتدفق والـboarding والمغادرة قبل الكشف والعودة والوفيات.'),
        role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
        benefit: tx(lang, 'No hospital-wide result is shown.', 'لا تُعرض نتيجة على مستوى المستشفى.'),
      });
    }
    const delta = waitNow - waitThen;
    const countLine = `${current.edArrivals.toLocaleString('en-US')} emergency visits. Admitted from the department ${current.edAdmitted.toLocaleString('en-US')}, discharged ${current.edDischarged.toLocaleString('en-US')}, left ${current.edLeft.toLocaleString('en-US')}.`;
    return pack(lang, {
      title: tx(lang, `Emergency visit at ${name} in ${year}`, `زيارة الطوارئ في ${name} عام ${year}`),
      observation: tx(lang, /how many/.test(q)
        ? `${current.edArrivals.toLocaleString('en-US')} emergency visits in ${year}.`
        : `Door-to-provider median is ${waitNow.toFixed(0)} minutes. P90 is ${current.edWaitP90Min.toFixed(0)} minutes. Length of stay is a separate clock.`, `وسيط الوصول للطبيب ${waitNow.toFixed(0)} دقيقة. المئين 90 هو ${current.edWaitP90Min.toFixed(0)} دقيقة. مدة البقاء ساعة مختلفة.`),
      evidence: tx(lang, countLine, `${current.edArrivals.toLocaleString('en-US')} زيارة طوارئ. التنويم من القسم ${current.edAdmitted.toLocaleString('en-US')}، والخروج ${current.edDischarged.toLocaleString('en-US')}، والمغادرة قبل الكشف ${current.edLeft.toLocaleString('en-US')}.`),
      explanation: tx(lang, `Hypothesis, not a proven cause: the median changed by ${delta.toFixed(0)} minutes versus ${year === 2024 ? 'the 2024 baseline' : year - 1}. Inpatient occupancy is not used as an emergency indicator.`, `فرضية وليست سبباً مثبتاً: تغيّر الوسيط بمقدار ${delta.toFixed(0)} دقيقة مقابل ${year === 2024 ? 'خط أساس 2024' : year - 1}. إشغال التنويم ليس مؤشر طوارئ.`),
      action: tx(lang, 'Review the peak arrival hours against the door-to-provider median. Expected impact is not calculated.', 'راجع ساعات ذروة الوصول مقابل وسيط الوصول للطبيب. الأثر المتوقع غير محسوب.'),
      role: tx(lang, 'Emergency operations lead', 'قائد عمليات الطوارئ'),
      benefit: tx(lang, 'Not a validated model. This is not a forecast.', 'ليس نموذجاً متحققاً. هذا ليس توقعاً.'),
    });
  }

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
  if ((q.includes('satisfaction') || q.includes('رضا')) && (q.includes('trend') || q.includes('changed') || q.includes('تغير'))) {
    return pack(lang, {
      title: tx(lang, `Satisfaction at ${name} in ${year}`, `الرضا في ${name} عام ${year}`),
      observation: tx(lang, `Index ${current.satisfaction.toFixed(1)} / 100, versus ${prior.satisfaction.toFixed(1)} in the comparison year.`, `المؤشر ${current.satisfaction.toFixed(1)} / 100، مقابل ${prior.satisfaction.toFixed(1)} في سنة المقارنة.`),
      evidence: tx(lang, `Surveys returned ${current.surveysReturned.toLocaleString('en-US')} of ${current.surveysSent.toLocaleString('en-US')}. Complaints opened ${current.complaintsOpened.toLocaleString('en-US')}.`, `الاستبيانات المعادة ${current.surveysReturned.toLocaleString('en-US')} من ${current.surveysSent.toLocaleString('en-US')}. الشكاوى المفتوحة ${current.complaintsOpened.toLocaleString('en-US')}.`),
      explanation: tx(lang, 'The index is a labelled demo assumption. The change is not a validated experience model.', 'المؤشر افتراض للعرض. التغير ليس نموذجاً متحققاً للتجربة.'),
      action: tx(lang, 'Open the patient experience dashboard and review discharge, follow-up, and service recovery.', 'افتح لوحة تجربة المريض وراجع الخروج والمتابعة واستعادة الخدمة.'),
      role: tx(lang, 'Patient experience lead', 'قائد تجربة المريض'),
      benefit: tx(lang, 'Illustrative only.', 'توضيحي فقط.'),
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
    const across = q.includes('where') || q.includes('which hospital') || q.includes('increasing') || q.includes('أين');
    if (across) {
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
    const rate = current.claimsDenied / current.claimsSubmitted;
    return pack(lang, {
      title: tx(lang, `Claim denial rate at ${name} in ${year}`, `معدل رفض المطالبات في ${name} عام ${year}`),
      observation: tx(lang, `Denial rate ${(rate * 100).toFixed(1)}%. Paid ${current.claimsPaid.toLocaleString('en-US')}, denied ${current.claimsDenied.toLocaleString('en-US')}, pending ${current.claimsPending.toLocaleString('en-US')}.`, `معدل الرفض ${(rate * 100).toFixed(1)}٪. المدفوع ${current.claimsPaid.toLocaleString('en-US')} والمرفوض ${current.claimsDenied.toLocaleString('en-US')} والمعلق ${current.claimsPending.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Those three dispositions sum to ${current.claimsSubmitted.toLocaleString('en-US')} submitted claims. Outstanding ${CURRENCY} ${current.outstanding.toLocaleString('en-US')} stays inside the allowed amount.`, `هذه الحالات الثلاث تجمع ${current.claimsSubmitted.toLocaleString('en-US')} مطالبة مقدمة. المتبقي ${CURRENCY} ${current.outstanding.toLocaleString('en-US')} يبقى داخل المبلغ المسموح.`),
      explanation: tx(lang, 'This is the selected hospital and year. A higher rate at another site is a different scope.', 'هذا هو المستشفى والسنة المحددان. معدل أعلى في موقع آخر نطاق مختلف.'),
      action: tx(lang, 'Open the claims dashboard and review the denial lifecycle before approving any action.', 'افتح لوحة المطالبات وراجع دورة الرفض قبل اعتماد أي إجراء.'),
      role: tx(lang, 'Revenue cycle lead', 'قائد دورة الإيراد'),
      benefit: tx(lang, 'Illustrative only. Not a collected cash result.', 'توضيحي فقط. ليست نتيجة نقد محصل.'),
    });
  }
  if (q.includes('delay') || q.includes('intervention') || q.includes('تأخير') || q.includes('تدخل')) {
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
  if (q.includes('alert') || q.includes('priority') || q.includes('تنبيه')) {
    const ranked = alertsFor(hospital, year).filter((alert) => alert.severity === 'critical' || alert.severity === 'high');
    const lines = (ranked.length ? ranked : alertsFor(hospital, year).slice(0, 3)).map((alert) => `${alert.severity}: ${alert.title} ${alert.observed}`).join('; ');
    return pack(lang, {
      title: tx(lang, `Priority alerts at ${name} in ${year}`, `تنبيهات الأولوية في ${name} عام ${year}`),
      observation: lines,
      evidence: tx(lang, 'Each alert uses a documented threshold on this hospital and year. Informational signals stay out of the priority list.', 'كل تنبيه يستخدم عتبة موثقة لهذا المستشفى وهذه السنة. الإشارات المعلوماتية تبقى خارج قائمة الأولوية.'),
      explanation: tx(lang, 'Priority is the threshold result, not a model score. Changing hospital or year changes the list.', 'الأولوية نتيجة العتبة، وليست درجة نموذج. تغيير المستشفى أو السنة يغير القائمة.'),
      action: tx(lang, 'Open the highest alert and investigate it before approving an action.', 'افتح أعلى تنبيه وحققه قبل اعتماد إجراء.'),
      role: tx(lang, 'Hospital operations lead', 'قائد عمليات المستشفى'),
      benefit: tx(lang, 'Illustrative only.', 'توضيحي فقط.'),
    });
  }
  if (q.includes('discharge') || q.includes('خروج')) {
    return pack(lang, {
      title: tx(lang, `Discharge flow at ${name} in ${year}`, `تدفق الخروج في ${name} عام ${year}`),
      observation: tx(lang, `Inpatient median stay ${current.ipLosDays.toFixed(1)} days. Discharges ${current.discharges.toLocaleString('en-US')}.`, `وسيط التنويم ${current.ipLosDays.toFixed(1)} يوماً. الخروج ${current.discharges.toLocaleString('en-US')}.`),
      evidence: tx(lang, `Occupied beds ${current.occupiedBeds} of ${current.staffedBeds} staffed. Open complaints ${current.complaintsOpened}.`, `الأسرة المشغولة ${current.occupiedBeds} من ${current.staffedBeds} مجهزاً. الشكاوى المفتوحة ${current.complaintsOpened}.`),
      explanation: tx(lang, 'Hypothesis only: discharge timing and bed pressure can move together. That is not a proven cause.', 'فرضية فقط: توقيت الخروج وضغط الأسرة قد يتحركان معاً. هذا ليس سبباً مثبتاً.'),
      action: tx(lang, 'Review discharge-ready patients, then the discharge-instruction case.', 'راجع المرضى الجاهزين للخروج، ثم حالة تعليمات الخروج.'),
      role: tx(lang, 'Bed management lead', 'قائد إدارة الأسرة'),
      benefit: tx(lang, 'Illustrative only. Not a measured hospital result.', 'توضيحي فقط. ليست نتيجة مستشفى مقيسة.'),
    });
  }
  if (q.includes('department') || q.includes('operational review') || q.includes('أقسام')) {
    const hot = alertsFor(hospital, year).filter((alert) => alert.severity !== 'info');
    const names = [...new Set(hot.map((alert) => alert.department))].join(', ') || 'none above the informational line';
    return pack(lang, {
      title: tx(lang, `Departments to review at ${name} in ${year}`, `أقسام للمراجعة في ${name} عام ${year}`),
      observation: tx(lang, `Departments with a medium or higher signal: ${names}.`, `أقسام بإشارة متوسطة أو أعلى: ${names}.`),
      evidence: tx(lang, 'The list is the alert engine for this hospital and year. It is not a second hospital.', 'القائمة هي محرك التنبيه لهذا المستشفى وهذه السنة. ليست مستشفى آخر.'),
      explanation: tx(lang, 'A department appears because one of its KPIs crossed a documented line. That is detection, not a root cause.', 'يظهر القسم لأن أحد مؤشراته تجاوز خطاً موثقاً. هذا رصد، وليس سبباً جذرياً.'),
      action: tx(lang, 'Open one department dashboard and read the alert evidence before acting.', 'افتح لوحة قسم واحد واقرأ دليل التنبيه قبل التصرف.'),
      role: tx(lang, 'Hospital operations lead', 'قائد عمليات المستشفى'),
      benefit: tx(lang, 'Illustrative only.', 'توضيحي فقط.'),
    });
  }
  return pack(lang, {
    title: tx(lang, 'This question is outside the simulated set', 'هذا السؤال خارج المجموعة المحاكاة'),
    observation: tx(lang, 'The assistant did not match this wording to emergency wait, capacity, satisfaction, denials, or delay review.', 'لم يطابق المساعد هذه الصياغة مع انتظار الطوارئ أو الطاقة أو الرضا أو الرفض أو مراجعة التأخير.'),
    evidence: tx(lang, `Current route context is kept, and the hospital is ${name} in ${year}. No generic queue answer is substituted.`, `يُحفظ سياق المسار الحالي، والمستشفى هو ${name} عام ${year}. لا يُستبدل جواب طابور عام.`),
    explanation: tx(lang, 'Unsupported questions stay explicit. The simulation does not invent an answer.', 'الأسئلة غير المدعومة تبقى صريحة. المحاكاة لا تختلق جواباً.'),
    action: tx(lang, 'Choose one of the prepared questions.', 'اختر أحد الأسئلة المعدة.'),
    role: tx(lang, 'Demonstration guide', 'دليل العرض'),
    benefit: tx(lang, 'No illustrative benefit is attached to an unsupported question.', 'لا فائدة توضيحية مربوطة بسؤال غير مدعوم.'),
  });
}

function pack(lang: Lang, body: Omit<AssistantAnswer, 'approval' | 'outcome'>): AssistantAnswer {
  return {
    ...body,
    approval: tx(lang, 'Simulated approval: a named lead records a demo-only decision in this browser. Nothing is sent to a hospital.', 'اعتماد محاكى: قائد مسمى يسجل قراراً للعرض فقط في هذا المتصفح. لا يُرسل شيء إلى مستشفى.'),
    outcome: tx(lang, 'Simulated outcome: shown only after that demo approval, and labelled as an illustration.', 'نتيجة محاكاة: تظهر فقط بعد اعتماد العرض، وتُعلَّم كتوضيح.'),
  };
}
