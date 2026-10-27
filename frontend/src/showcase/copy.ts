export type Lang = 'en' | 'ar';

export function tx(lang: Lang, en: string, ar: string): string {
  return lang === 'ar' ? ar : en;
}

export const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
};

export const DEPT: Record<string, { en: string; ar: string }> = {
  All: { en: 'All departments', ar: 'كل الأقسام' },
  Emergency: { en: 'Emergency', ar: 'الطوارئ' },
  Inpatient: { en: 'Inpatient', ar: 'التنويم' },
  Laboratory: { en: 'Laboratory', ar: 'المختبر' },
  Surgery: { en: 'Surgery', ar: 'العمليات' },
  Pharmacy: { en: 'Pharmacy', ar: 'الصيدلية' },
  Revenue: { en: 'Revenue', ar: 'الإيراد' },
  Experience: { en: 'Experience', ar: 'التجربة' },
};

export function deptLabel(id: string, lang: Lang): string {
  return DEPT[id]?.[lang] ?? id;
}

const PHRASES: [string, string][] = [
  ['Average inpatient LOS hours', 'متوسط مدة التنويم بالساعات'],
  ['Average inpatient LOS days', 'متوسط مدة التنويم بالأيام'],
  ['Median inpatient LOS days', 'وسيط مدة التنويم بالأيام'],
  ['P90 inpatient LOS days', 'المئين 90 لمدة التنويم بالأيام'],
  ['ED average LOS hours', 'متوسط مدة بقاء الطوارئ بالساعات'],
  ['ED length of stay (median minutes)', 'مدة بقاء الطوارئ (الوسيط بالدقائق)'],
  ['ED length of stay (P90 minutes)', 'مدة بقاء الطوارئ (المئين 90 بالدقائق)'],
  ['Bed occupancy rate', 'معدل إشغال الأسرة'],
  ['Claim denial rate', 'معدل رفض المطالبات'],
  ['Allowed amount', 'المبلغ المسموح'],
  ['Revenue collection rate', 'معدل التحصيل'],
  ['Available bed status rate', 'معدل الأسرة المتاحة'],
  ['ICU bed occupancy rate', 'معدل إشغال أسرة العناية'],
  ['Department count', 'عدد الأقسام'],
  ['ED-to-admission rate', 'معدل التنويم من الطوارئ'],
  ['ED length of stay (median minutes)', 'مدة بقاء الطوارئ (الوسيط بالدقائق)'],
  ['ED length of stay (P90 minutes)', 'مدة بقاء الطوارئ (المئين 90 بالدقائق)'],
  ['Discharge-to-admission ratio', 'نسبة الخروج إلى التنويم'],
  ['Appointment no-show rate', 'معدل غياب المواعيد'],
  ['Appointment cancellation rate', 'معدل إلغاء المواعيد'],
  ['Surgery cancellation volume', 'حجم إلغاء العمليات'],
  ['Scheduled case cancellation rate', 'معدل إلغاء الحالات المجدولة'],
  ['Surgery cancellation rate', 'معدل إلغاء العمليات'],
  ['Lab orders per encounter', 'طلبات المختبر لكل زيارة'],
  ['Average lab TAT minutes', 'متوسط زمن إنجاز المختبر بالدقائق'],
  ['Median lab TAT minutes', 'وسيط زمن إنجاز المختبر بالدقائق'],
  ['P90 lab TAT minutes', 'المئين 90 لزمن إنجاز المختبر'],
  ['Radiology average TAT hours', 'متوسط زمن إنجاز الأشعة بالساعات'],
  ['Median report TAT', 'وسيط زمن التقرير'],
  ['P90 report TAT', 'المئين 90 لزمن التقرير'],
  ['No-show rate', 'معدل الغياب'],
  ['Authorization denial rate', 'معدل رفض الموافقة'],
  ['Revenue collection rate', 'معدل التحصيل'],
  ['Follow-up completion rate', 'معدل إكمال المتابعة'],
  ['Service recovery closure rate', 'معدل إغلاق استعادة الخدمة'],
  ['Discharge experience index', 'مؤشر تجربة الخروج'],
  ['Active patient count', 'عدد المرضى النشطين'],
  ['Encounters per patient', 'الزيارات لكل مريض'],
  ['Admission rate per encounter', 'معدل التنويم لكل زيارة'],
  ['Satisfaction index', 'مؤشر الرضا'],
  ['Open complaints', 'الشكاوى المفتوحة'],
  ['Survey response rate', 'معدل الاستجابة للاستبيان'],
  ['Dialysis session volume', 'حجم جلسات الغسيل'],
  ['Infection surveillance signal', 'إشارة ترصد العدوى'],
  ['Equipment uptime', 'جاهزية المعدات'],
  ['Morgue release hours', 'ساعات تسليم المشرحة'],
  ['Birth encounter volume', 'حجم حالات الولادة'],
  ['Eligibility check volume', 'حجم فحوصات الأهلية'],
];

export const QUESTION_AR: Record<string, string> = {
  hub: 'من أين يبدأ المسؤول التنفيذي؟',
  command: 'ما الذي يحتاج انتباهاً عبر المستشفيات الخمسة؟',
  stability: 'أي العمليات مستقرة، وأيها تحركت؟',
  journey: 'أين تتباطأ الرحلة في هذا السيناريو؟',
  revenue: 'كيف تبدو دورة الإيراد في السيناريو؟',
  risk: 'أي المخاطر الخيالية تستحق مراجعة القائد؟',
  actions: 'أي الإجراءات المحاكاة بانتظار شخص؟',
  comparison: 'كيف تختلف المستشفيات الخمسة؟',
  emergency: 'لماذا يتحرك زمن الانتظار في هذا السيناريو؟',
  beds: 'أين أعلى ضغط على الطاقة الاستيعابية؟',
  inpatient: 'كم تطول الإقامات الخيالية، وأين تتوقف؟',
  outpatient: 'كيف يبدو إنتاج العيادات في السيناريو؟',
  appointments: 'أين تتركز المواعيد والغياب؟',
  dialysis: 'ماذا يمكن عرضه للغسيل دون اختلاق أعمدة المصدر؟',
  mortality: 'كيف تُراجع إشارة الوفيات دون تنبؤ لمريض فرد؟',
  surgery: 'كيف يتصرف وقت غرف العمليات في السيناريو؟',
  laboratory: 'أين عبء المختبر في السيناريو؟',
  radiology: 'أين تتأخر الأشعة في السيناريو؟',
  pharmacy: 'كيف يظهر عبء الدواء في السيناريو؟',
  experience: 'كيف تتحرك الرضا والشكاوى والاستبيانات والتعافي معاً؟',
  registry: 'كم شخصاً خيالياً داخل النطاق؟',
  diagnoses: 'ما مدى اكتمال توثيق التشخيص في السيناريو؟',
  rcm: 'أين يتسرب الإيراد في السيناريو؟',
  claims: 'أين يزداد الرفض في السيناريو؟',
  workforce: 'أين ضغط التوظيف في السيناريو؟',
  access: 'من يراجع الإجراء المحاكى؟',
  audit: 'ما الدليل خلف الرقم الخيالي؟',
  quality: 'أي فحوصات الجودة تظهر في هذه الشاشة؟',
  'quality-detail': 'ماذا تعني قدرة جودة واحدة في العرض؟',
  metadata: 'أي التسميات من الفهرس أو السجل أو افتراض العرض؟',
  'kpi-catalog': 'هل يمكن العثور على كل مؤشر معرف في المصدر وفتحه؟',
  'semantic-views': 'ما العروض الخمسة عشر المسماة في هذا العرض؟',
  'verified-queries': 'كيف تُعرض الاستعلامات المتعاقد عليها دون اختلاق SQL؟',
  'ai-overview': 'أي حالات الاستخدام المحاكاة موجودة، وماذا يجب أن يراجعه شخص؟',
  'ai-cases': 'هل حالات الاستخدام السبع والثلاثون ظاهرة كمحاكاة؟',
  'ai-case': 'ماذا يرى المراجع قبل أن يثق بمحاكاة؟',
  predictions: 'ماذا يمكن للسيناريو أن يوضح لاحقاً دون ادعاء نموذج مُتحقق؟',
  insights: 'أي التغيرات في السيناريو تستحق النظر؟',
  assistant: 'ماذا يستطيع السيناريو تفسيره للمرشحات الحالية؟',
  'clinical-quality': 'أي إشارات السلامة موجودة في السيناريو؟',
  'infection-prevention': 'أي إشارة مكافحة عدوى يمكن عرضها دون أعمدة المصدر؟',
  'supply-chain': 'أين يظهر ضغط الإمداد في السيناريو؟',
  'biomedical-equipment': 'أي قصة معدات مُعلَّمة كافتراض؟',
  'ai-governance': 'كيف يبقى النموذج المحاكى تحت المراجعة؟',
  'patient-experience': 'هل يستطيع القائد تتبع الرضا حتى استعادة الخدمة؟',
  'ward-transfer': 'كيف تظهر التحويلات في السيناريو؟',
  morgue: 'أي رقم للمشرحة مُعلَّم كافتراض؟',
  'maternal-neonatal': 'أي رقم ولادة مُعلَّم كافتراض؟',
  'assessments-vitals': 'كيف يُعرض حجم العلامات الحيوية دون ملف مريض؟',
  eligibility: 'أي حجم أهلية هو افتراض مُعلَّم؟',
  'pre-authorization': 'أين تتحرك رفض الموافقات المسبقة في السيناريو؟',
  'claims-processing': 'كيف تتحرك المطالبة في الدورة المحاكاة؟',
  'billing-collections': 'أين يظهر ضغط التحصيل؟',
};

export function kpiName(name: string, lang: Lang): string {
  if (lang === 'en') return name;
  const hit = PHRASES.find(([en]) => en.toLowerCase() === name.toLowerCase());
  return hit ? hit[1] : name;
}

export const CHART_LABELS = {
  en: {
    empty: 'No matching records for this scope and period.',
    invalid: 'Chart data is invalid. Invalid numbers were not replaced with zero.',
    zero: '0 events in this period and scope.',
  },
  ar: {
    empty: 'لا توجد سجلات مطابقة لهذا النطاق وهذه الفترة.',
    invalid: 'بيانات الرسم غير صالحة. لم يُستبدل أي رقم غير صالح بصفر.',
    zero: '0 أحداث في هذه الفترة وهذا النطاق.',
  },
};
