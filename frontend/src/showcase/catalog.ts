export type ScreenDef = {
  id: string;
  title: string;
  titleAr: string;
  group: string;
  decision: string;
  domains: string[];
  story: string;
};

export const SCREENS: ScreenDef[] = [
  screen('hub', 'Platform Hub', 'مركز المنصة', 'Executive', 'Where should an executive start?', ['Executive']),
  screen('command', 'Executive Command Center', 'مركز القيادة التنفيذي', 'Executive', 'What needs attention across the five hospitals?', ['Executive', 'Alerts']),
  screen('stability', 'Executive Stability', 'استقرار التشغيل', 'Executive', 'Which operations are steady, and which moved?', ['Executive', 'Emergency', 'Beds']),
  screen('journey', 'Executive Patient Journey', 'رحلة المريض', 'Executive', 'Where does the patient journey slow down?', ['Emergency', 'Inpatient', 'Outpatient', 'Appointments']),
  screen('revenue', 'Executive Revenue', 'الإيراد التنفيذي', 'Executive', 'How does the revenue cycle look?', ['RCM', 'Financial AI support metrics']),
  screen('risk', 'Executive Risk', 'سجل المخاطر', 'Executive', 'Which risks should a leader review?', ['Alerts', 'Clinical AI support metrics', 'Emergency']),
  screen('actions', 'Enterprise Action Queue', 'قائمة الإجراءات', 'Executive', 'Which simulated actions are waiting for a person?', ['Alerts', 'Executive']),
  screen('comparison', 'Hospital Comparison', 'مقارنة المستشفيات', 'Executive', 'How do the five fictional hospitals differ?', ['Executive', 'Beds', 'Emergency']),
  screen('emergency', 'Emergency Department', 'الطوارئ', 'Flow', 'Why is waiting time moving in this reporting year?', ['Emergency']),
  screen('beds', 'Beds & Capacity', 'الأسرة والطاقة', 'Flow', 'Where is capacity pressure highest?', ['Beds']),
  screen('inpatient', 'Inpatient Care', 'التنويم', 'Flow', 'How long are inpatient stays, and where do they stall?', ['Inpatient']),
  screen('outpatient', 'Outpatient Care', 'العيادات الخارجية', 'Flow', 'How is clinic throughput this year?', ['Outpatient']),
  screen('appointments', 'Appointments', 'المواعيد', 'Flow', 'Where are slots and no-shows concentrating?', ['Appointments']),
  screen('dialysis', 'Dialysis', 'غسيل الكلى', 'Flow', 'What can be shown for dialysis without inventing NMR columns?', ['Dialysis']),
  screen('mortality', 'Mortality & Outcomes', 'الوفيات والنتائج', 'Flow', 'How is a mortality signal reviewed without a patient-level prediction?', ['Clinical AI support metrics', 'Diagnoses']),
  screen('surgery', 'Surgery & Operating Rooms', 'العمليات', 'Clinical', 'How is theatre time behaving this year?', ['Surgery']),
  screen('laboratory', 'Laboratory & Diagnostics', 'المختبر', 'Clinical', 'Where is the laboratory workload?', ['Laboratory']),
  screen('radiology', 'Radiology & Imaging', 'الأشعة', 'Clinical', 'Where are imaging delays this year?', ['Radiology']),
  screen('pharmacy', 'Pharmacy', 'الصيدلية', 'Clinical', 'How does medication workload appear this year?', ['Pharmacy']),
  screen('experience', 'Patient Experience', 'تجربة المريض', 'Patient', 'How do satisfaction, complaints, surveys, and recovery move together?', ['Patient experience']),
  screen('registry', 'Patient Registry', 'سجل المرضى', 'Patient', 'How many patients are in scope?', ['Patients']),
  screen('diagnoses', 'Diagnoses', 'التشخيصات', 'Patient', 'How complete is diagnosis documentation?', ['Diagnoses']),
  screen('rcm', 'Revenue Cycle Management', 'دورة الإيراد', 'Finance', 'Where is revenue under pressure?', ['RCM']),
  screen('claims', 'Claims & Denials', 'المطالبات والرفض', 'Finance', 'Where are denials increasing this year?', ['RCM']),
  screen('workforce', 'Workforce & Staffing', 'القوى العاملة', 'Finance', 'Where is staffing pressure this year?', ['Workforce']),
  screen('access', 'Access & Role Administration', 'الصلاحيات', 'Trust', 'Who can review a simulated action?', ['Pipeline operations']),
  screen('audit', 'Audit & Evidence', 'التدقيق والأدلة', 'Trust', 'What evidence sits behind a figure?', ['Data Quality']),
  screen('quality', 'Data Quality', 'جودة البيانات', 'Trust', 'Which quality checks are on this screen?', ['Data Quality']),
  screen('quality-detail', 'Data Quality Capability Detail', 'تفصيل جودة البيانات', 'Trust', 'What does one quality capability mean in the demo?', ['Data Quality']),
  screen('metadata', 'Metadata & Semantic Trust', 'البيانات الوصفية', 'Trust', 'Which labels are catalog, registry, or demo assumptions?', ['Data Quality', 'Pipeline operations']),
  screen('kpi-catalog', 'KPI Catalog', 'فهرس المؤشرات', 'Trust', 'Can every source-defined KPI be found and opened?', ['Executive']),
  screen('semantic-views', 'Semantic Views', 'العروض الدلالية', 'Trust', 'What are the fifteen named views in this demonstration?', ['Pipeline operations']),
  screen('verified-queries', 'Verified Queries', 'الاستعلامات الموثقة', 'Trust', 'How are contracted queries represented without invented SQL?', ['Pipeline operations']),
  screen('ai-overview', 'AI Overview', 'نظرة الذكاء الاصطناعي', 'AI', 'Which simulated use cases exist, and what must a person review?', ['Clinical AI support metrics', 'Operational AI support metrics']),
  screen('ai-cases', 'AI Use Cases', 'حالات الاستخدام', 'AI', 'Are all thirty-seven use cases visible as simulations?', ['Operational AI support metrics']),
  screen('ai-case', 'AI Use Case Detail', 'تفصيل حالة الاستخدام', 'AI', 'What would a reviewer see before trusting a simulation?', ['Clinical AI support metrics']),
  screen('predictions', 'Simulated Predictions', 'تنبؤات محاكاة', 'AI', 'What might the scenario illustrate next, without claiming a validated model?', ['Forecasting support metrics']),
  screen('insights', 'AI Insights', 'رؤى الذكاء الاصطناعي', 'AI', 'Which changes this year deserve a look?', ['Alerts', 'Executive']),
  screen('assistant', 'DataVital AI Assistant', 'المساعد', 'AI', 'What can the scenario explain for the current filters?', ['Executive', 'Emergency']),
];

export const EXTENSIONS: ScreenDef[] = [
  screen('clinical-quality', 'Clinical Quality & Patient Safety', 'الجودة والسلامة', 'Extension', 'Which safety signals are this year?', ['Clinical AI support metrics', 'Alerts']),
  screen('infection-prevention', 'Infection Prevention & Control', 'مكافحة العدوى', 'Extension', 'What IPC signal can be shown without NMR columns?', ['Infection prevention']),
  screen('supply-chain', 'Supply Chain & Procurement', 'سلسلة الإمداد', 'Extension', 'Where does the scenario show supply pressure?', ['Operational AI support metrics']),
  screen('biomedical-equipment', 'Biomedical Equipment & Asset Management', 'المعدات الطبية', 'Extension', 'What equipment story is labelled as an assumption?', ['Biomedical equipment']),
  screen('ai-governance', 'AI Model Governance', 'حوكمة النماذج', 'Extension', 'How is a simulated model kept under review?', ['Clinical AI support metrics']),
  screen('patient-experience', 'Comprehensive Patient Experience', 'تجربة المريض الشاملة', 'Extension', 'Can a leader walk satisfaction through service recovery?', ['Patient experience']),
  screen('ward-transfer', 'Ward Transfer', 'تحويل الأجنحة', 'Extension', 'How do transfers appear this year?', ['Inpatient', 'Emergency']),
  screen('morgue', 'Morgue Management', 'المشرحة', 'Extension', 'What morgue figure is labelled as an assumption?', ['Morgue']),
  screen('maternal-neonatal', 'Maternal & Neonatal Intelligence', 'الأمومة وحديثي الولادة', 'Extension', 'What birth figure is labelled as an assumption?', ['Maternal and neonatal']),
  screen('assessments-vitals', 'Assessments & Vitals', 'التقييمات والعلامات الحيوية', 'Extension', 'How is vital-sign volume shown without a patient chart?', ['Inpatient']),
  screen('eligibility', 'Eligibility Check', 'التحقق من الأهلية', 'Extension', 'What eligibility volume is a labelled assumption?', ['Eligibility', 'RCM']),
  screen('pre-authorization', 'Pre-Authorization', 'الموافقة المسبقة', 'Extension', 'Where do authorization denials move this year?', ['RCM']),
  screen('claims-processing', 'Claims Processing', 'معالجة المطالبات', 'Extension', 'How does a claim move through the simulated cycle?', ['RCM']),
  screen('billing-collections', 'Billing & Collections', 'الفوترة والتحصيل', 'Extension', 'Where does collection pressure show up?', ['RCM', 'Financial AI support metrics']),
];

export const SEMANTIC_VIEWS = [
  'sv_executive_daily',
  'sv_emergency_flow',
  'sv_bed_capacity',
  'sv_inpatient_stay',
  'sv_outpatient_visit',
  'sv_appointment',
  'sv_laboratory',
  'sv_radiology',
  'sv_pharmacy',
  'sv_surgery',
  'sv_revenue_cycle',
  'sv_workforce',
  'sv_patient_experience',
  'sv_data_quality',
  'sv_ai_governance',
];

export const TOUR = [
  { id: 'start', title: 'Start Demo', titleAr: 'ابدأ العرض', href: '/showcase', body: 'This walkthrough uses five fictional hospitals and simulated AI. No account is required.', bodyAr: 'يستخدم هذا المسار خمسة مستشفيات خيالية وذكاءً محاكى. لا يلزم حساب.' },
  { id: 'hospital', title: 'Choose Hospital', titleAr: 'اختر المستشفى', href: '/showcase', body: 'Pick one hospital or all five. Every chart on the next screens uses that choice.', bodyAr: 'اختر مستشفى واحداً أو الخمسة. كل رسم في الشاشات التالية يستخدم هذا الاختيار.' },
  { id: 'command', title: 'Explore Executive Command Center', titleAr: 'مركز القيادة', href: '/showcase/screens/command', body: 'Start with the executive picture for the selected year.', bodyAr: 'ابدأ بالصورة التنفيذية للسنة المحددة.' },
  { id: 'issue', title: 'Investigate an Operational Issue', titleAr: 'مسألة تشغيلية', href: '/showcase/screens/emergency', body: 'Open emergency waiting time and see the scenario move with the filters.', bodyAr: 'افتح انتظار الطوارئ ولاحظ تحرك السيناريو مع المرشحات.' },
  { id: 'cause', title: 'Open Root Cause Analysis', titleAr: 'السبب المحتمل', href: '/showcase/kpis/kpi_ed_avg_los_hours', body: 'Open a KPI and step through detection and root cause. Causes are scenario factors, not proven causes.', bodyAr: 'افتح مؤشراً وانتقل بين الرصد والسبب. الأسباب عوامل في السيناريو، وليست أسباباً مثبتة.' },
  { id: 'predict', title: 'Review Simulated Prediction', titleAr: 'تنبؤ محاكى', href: '/showcase/kpis/kpi_ed_avg_los_hours', body: 'The prediction stage is an illustration. It is not a validated model.', bodyAr: 'مرحلة التنبؤ توضيح. ليست نموذجاً متحققاً.' },
  { id: 'approve', title: 'Approve Simulated Action', titleAr: 'اعتماد إجراء محاكى', href: '/showcase/kpis/kpi_ed_avg_los_hours', body: 'Approving stores a demo-only decision in this browser.', bodyAr: 'الاعتماد يخزن قراراً للعرض فقط في هذا المتصفح.' },
  { id: 'outcome', title: 'Explore Simulated Outcome', titleAr: 'النتيجة المحاكاة', href: '/showcase/kpis/kpi_ed_avg_los_hours', body: 'After approval, the outcome stage shows an illustrative before and after.', bodyAr: 'بعد الاعتماد تعرض مرحلة النتيجة توضيحاً قبل وبعد.' },
  { id: 'experience', title: 'Continue to Patient Experience', titleAr: 'تجربة المريض', href: '/showcase/experience', body: 'Walk satisfaction, complaints, surveys, discharge, follow-up, and service recovery.', bodyAr: 'تتبع الرضا والشكاوى والاستبيانات والخروج والمتابعة واستعادة الخدمة.' },
  { id: 'compare', title: 'Compare Hospitals', titleAr: 'قارن المستشفيات', href: '/showcase/compare', body: 'See one KPI across Demo General North, South, East, West, and Central.', bodyAr: 'انظر إلى مؤشر واحد عبر المستشفيات التجريبية الخمسة.' },
] as const;

function screen(id: string, title: string, titleAr: string, group: string, decision: string, domains: string[]): ScreenDef {
  return {
    id,
    title,
    titleAr,
    group,
    decision,
    domains,
    story: 'Figures are for the selected hospital and reporting year.',
  };
}

export const UI = {
  en: {
    banner: 'Illustrative hospital data and simulated AI insights — not live clinical or financial records.',
    reset: 'Reset view',
    language: 'العربية',
    hospital: 'Hospital',
    year: 'Year',
    department: 'Department',
    assistant: 'Assistant',
    tour: 'Guided demo',
    coverage: 'Coverage',
    catalog: 'All KPIs',
    experience: 'Patient experience',
    compare: 'Compare',
    screens: 'Screens',
    extensions: 'Enterprise extensions',
    classic: 'Earlier operational screens',
    open: 'Open KPI',
    stages: ['KPI', 'Detection', 'Root cause', 'Prediction', 'AI action', 'Approval', 'Outcome'],
  },
  ar: {
    banner: 'عرض تفاعلي — بيانات اصطناعية وذكاء اصطناعي محاكى.',
    reset: 'إعادة العرض',
    language: 'English',
    hospital: 'المستشفى',
    year: 'السنة',
    department: 'القسم',
    assistant: 'المساعد',
    tour: 'العرض الموجه',
    coverage: 'التغطية',
    catalog: 'كل المؤشرات',
    experience: 'تجربة المريض',
    compare: 'المقارنة',
    screens: 'الشاشات',
    extensions: 'التوسعات',
    classic: 'الشاشات التشغيلية السابقة',
    open: 'افتح المؤشر',
    stages: ['المؤشر', 'الرصد', 'السبب', 'التنبؤ', 'الإجراء', 'الاعتماد', 'النتيجة'],
  },
} as const;
