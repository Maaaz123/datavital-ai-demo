import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { ASSISTANT_PROMPTS, answerQuestion } from './assistant';
import { EXTENSIONS, SCREENS, TOUR, UI } from './catalog';
import { DEPT, QUESTION_AR, deptLabel, kpiName, tx } from './copy';
import { HOSPITALS, KPIS, USE_CASES, YEARS, findKpi, kpisForDomains, needsCohortReview } from './engine';
import { CURRENCY_NOTE, scenarioFor } from './facts';
import { formatDelta, formatMeasure, measure } from './measures';
import { ShowcaseState, useShowcase } from './state';
import { Workspace } from './workspace';
import './showcase.css';

const GROUPS = [
  { id: 'Executive', en: 'Executive', ar: 'القيادة' },
  { id: 'Flow', en: 'Flow', ar: 'التدفق' },
  { id: 'Clinical', en: 'Clinical', ar: 'السريري' },
  { id: 'Patient', en: 'Patient', ar: 'المريض' },
  { id: 'Finance', en: 'Finance', ar: 'المالية' },
  { id: 'Trust', en: 'Trust', ar: 'الثقة' },
  { id: 'AI', en: 'AI', ar: 'الذكاء' },
  { id: 'Extension', en: 'Extensions', ar: 'التوسعات' },
] as const;

export function ShowcaseApp() {
  return (
    <ShowcaseState>
      <Shell />
    </ShowcaseState>
  );
}

function Shell() {
  const store = useShowcase();
  const t = UI[store.lang];
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const active = groupFor(location.pathname);
  const [group, setGroup] = useState(active);
  useEffect(() => {
    setGroup(groupFor(location.pathname));
  }, [location.pathname]);
  const shown = group || active;
  const items = shown === 'Extension' ? EXTENSIONS : SCREENS.filter((item) => item.group === shown);
  return (
    <div className="sx-shell" dir={store.lang === 'ar' ? 'rtl' : 'ltr'} lang={store.lang}>
      <header className="sx-top">
        <div className="sx-brandline">
          <Link to="/showcase" className="sx-brand">DataVital AI</Link>
          <p className="sx-banner" role="status">{t.banner}</p>
        </div>
        <div className="sx-toolbar">
          <label>
            {t.hospital}
            <select aria-label={t.hospital} value={store.hospital} onChange={(event) => store.setHospital(event.target.value)}>
              {HOSPITALS.map((item) => (
                <option key={item.code} value={item.code}>{store.lang === 'ar' ? item.nameAr : item.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t.year}
            <select aria-label={t.year} value={store.year} onChange={(event) => store.setYear(Number(event.target.value))}>
              {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            {t.department}
            <select aria-label={t.department} value={store.department} onChange={(event) => store.setDepartment(event.target.value)}>
              {Object.keys(DEPT).map((id) => <option key={id} value={id}>{deptLabel(id, store.lang)}</option>)}
            </select>
          </label>
          <Link className="sx-btn" to="/showcase/tour">{t.tour}</Link>
          <Link className="sx-btn" to="/showcase/experience">{t.experience}</Link>
          <Link className="sx-btn" to="/showcase/compare">{t.compare}</Link>
          <button type="button" className="sx-btn" onClick={() => setAssistantOpen(true)}>{t.assistant}</button>
          <button type="button" className="sx-btn" onClick={store.toggleLang}>{t.language}</button>
          <button type="button" className="sx-btn" onClick={store.reset}>{t.reset}</button>
          <button type="button" className="sx-btn sx-menu" aria-expanded={navOpen} onClick={() => setNavOpen((value) => !value)}>
            {tx(store.lang, 'Workspaces', 'مساحات العمل')}
          </button>
        </div>
      </header>
      <div className={`sx-body ${navOpen ? 'sx-nav-open' : ''}`}>
        <nav className="sx-nav" aria-label={tx(store.lang, 'Workspaces', 'مساحات العمل')}>
          <div className="sx-groups" role="tablist">
            {GROUPS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={shown === item.id}
                onClick={() => { setGroup(item.id); setNavOpen(true); }}
              >
                {store.lang === 'ar' ? item.ar : item.en}
              </button>
            ))}
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <NavLink to={shown === 'Extension' ? `/showcase/extensions/${item.id}` : `/showcase/screens/${item.id}`} onClick={() => setNavOpen(false)}>
                  {store.lang === 'ar' ? item.titleAr : item.title}
                </NavLink>
              </li>
            ))}
          </ul>
          <Link className="sx-quiet-link" to="/login">{t.classic}</Link>
        </nav>
        <main className="sx-content" id="content">
          <Outlet />
        </main>
      </div>
      {assistantOpen ? (
        <aside className="sx-assistant" role="dialog" aria-label={t.assistant}>
          <button type="button" className="sx-btn" onClick={() => setAssistantOpen(false)}>{tx(store.lang, 'Close', 'إغلاق')}</button>
          <AssistantBody />
        </aside>
      ) : null}
    </div>
  );
}

function groupFor(path: string): (typeof GROUPS)[number]['id'] {
  const screen = path.split('/screens/')[1];
  const extension = path.split('/extensions/')[1];
  if (extension) return 'Extension';
  const found = SCREENS.find((item) => item.id === screen);
  if (found) return found.group as (typeof GROUPS)[number]['id'];
  return 'Executive';
}

export function HomePage() {
  const store = useShowcase();
  const fact = scenarioFor(store.hospital, store.year).focus;
  const lang = store.lang;
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <p className="sx-kicker">{tx(lang, 'Executive showcase', 'عرض تنفيذي')}</p>
        <h1>DataVital AI</h1>
        <p className="sx-question">{tx(lang, 'A conceptual tour for hospital leaders. Every number is synthetic. Every prediction is simulated and not clinically validated.', 'جولة مفاهيمية لقادة المستشفيات. كل رقم اصطناعي. كل تنبؤ محاكاة وغير متحقق سريرياً.')}</p>
        <p className="sx-scope">{CURRENCY_NOTE}</p>
      </header>
      <section className="sx-brief">
        <div>
          <h2>{tx(lang, 'What is happening', 'ماذا يحدث')}</h2>
          <p>{tx(lang, `Occupancy ${(fact.occupiedBeds / fact.staffedBeds * 100).toFixed(1)}%. Emergency median wait ${fact.edWaitMedianMin.toFixed(0)} minutes. Denial rate ${(fact.claimsDenied / fact.claimsSubmitted * 100).toFixed(1)}%.`, `الإشغال ${(fact.occupiedBeds / fact.staffedBeds * 100).toFixed(1)}٪. وسيط انتظار الطوارئ ${fact.edWaitMedianMin.toFixed(0)} دقيقة. معدل الرفض ${(fact.claimsDenied / fact.claimsSubmitted * 100).toFixed(1)}٪.`)}</p>
        </div>
        <div>
          <h2>{tx(lang, 'Why it matters', 'لماذا يهم')}</h2>
          <p>{tx(lang, 'The same fictional facts drive every workspace, so a change of hospital or year moves the story together.', 'الحقائق الخيالية نفسها تقود كل مساحة عمل، فتغيير المستشفى أو السنة يحرك القصة معاً.')}</p>
        </div>
        <div>
          <h2>{tx(lang, 'Review next', 'المراجعة التالية')}</h2>
          <Link className="sx-btn primary" to="/showcase/tour">{tx(lang, 'Start Demo', 'ابدأ العرض')}</Link>
        </div>
      </section>
      <section className="sx-stats">
        <Link className="sx-stat" to="/showcase/screens/command"><strong>{tx(lang, 'Command center', 'مركز القيادة')}</strong><em>{store.year}</em></Link>
        <Link className="sx-stat" to="/showcase/screens/emergency"><strong>{tx(lang, 'Emergency pressure', 'ضغط الطوارئ')}</strong><em>{fact.edWaitMedianMin.toFixed(0)} {tx(lang, 'min', 'د')}</em></Link>
        <Link className="sx-stat" to="/showcase/experience"><strong>{tx(lang, 'Patient experience', 'تجربة المريض')}</strong><em>{fact.satisfaction.toFixed(1)} / 100</em></Link>
        <Link className="sx-stat" to="/showcase/coverage"><strong>{tx(lang, 'Coverage', 'التغطية')}</strong><em>{SCREENS.length}+{EXTENSIONS.length}</em></Link>
      </section>
    </article>
  );
}

export function ScreenPage({ source }: { source: 'screen' | 'extension' }) {
  const { screenId = '' } = useParams();
  if (screenId === 'kpi-catalog') return <CatalogPage />;
  if (screenId === 'assistant') return <AssistantPage />;
  if (screenId === 'comparison') return <ComparePage />;
  return <Workspace source={source} />;
}

export function KpiPage() {
  const { metricKey = '' } = useParams();
  const store = useShowcase();
  const lang = store.lang;
  const kpi = findKpi(metricKey);
  const [stage, setStage] = useState(0);
  if (!kpi) return <p>{tx(lang, 'This KPI is not in the demonstration inventory.', 'هذا المؤشر غير موجود في فهرس العرض.')}</p>;
  const item = measure(kpi, store.hospital, store.year, store.department);
  const decision = store.approvals[kpi.key];
  const stages = UI[lang].stages;
  const cohort = needsCohortReview(kpi);
  const site = HOSPITALS.find((hospital) => hospital.code === store.hospital);
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <p className="sx-kicker">{kpi.origin === 'demo_assumption' ? tx(lang, 'Demo assumption', 'افتراض للعرض') : kpi.origin}</p>
        <h1>{kpiName(kpi.name, lang)}</h1>
        <p className="sx-scope">{lang === 'ar' ? site?.nameAr : site?.name} · {store.year} · {deptLabel(store.department, lang)}</p>
      </header>
      <div className="sx-stages" role="tablist">
        {stages.map((label, index) => (
          <button key={label} type="button" role="tab" aria-selected={stage === index} onClick={() => setStage(index)}>
            {index + 1}. {label}
          </button>
        ))}
      </div>
      {stage === 0 ? (
        <section className="sx-panel">
          <p className="sx-metric">{formatMeasure(item, lang)}</p>
          <p>{formatDelta(item, lang)}</p>
          <p>{item.note}</p>
          <p className="sx-ltr">{tx(lang, 'Grain', 'الحبيبة')}: {item.grain}</p>
          <p className="sx-ltr">{tx(lang, 'Catalog formula', 'صيغة الفهرس')}: {kpi.formula}</p>
          <p>{tx(lang, `Numerator ${item.numerator.toLocaleString('en-US')} · denominator ${item.denominator.toLocaleString('en-US')}`, `البسط ${item.numerator.toLocaleString('en-US')} · المقام ${item.denominator.toLocaleString('en-US')}`)}</p>
        </section>
      ) : null}
      {stage === 1 ? (
        <section className="sx-panel">
          <h2>{tx(lang, 'What changed', 'ماذا تغير')}</h2>
          <p>{tx(lang, `Current ${formatMeasure(item, lang)}. Prior year ${formatMeasure({ ...item, value: item.prior }, lang)}.`, `الحالي ${formatMeasure(item, lang)}. السنة السابقة ${formatMeasure({ ...item, value: item.prior }, lang)}.`)}</p>
          <p>{item.kind === 'rate' ? tx(lang, 'The comparison is in percentage points, not a relative percent of the rate.', 'المقارنة بالنقاط المئوية، وليست نسبة مئوية نسبية من المعدل.') : tx(lang, 'The comparison is a relative change against the prior year.', 'المقارنة تغير نسبي مقابل السنة السابقة.')}</p>
        </section>
      ) : null}
      {stage === 2 ? (
        <section className="sx-panel">
          <h2>{tx(lang, 'Hypotheses, not proven causes', 'فرضيات، وليست أسباباً مثبتة')}</h2>
          <ul>
            <li>{tx(lang, 'Volume and mix in the selected hospital moved with this measure.', 'الحجم والمزيج في المستشفى المحدد تحركا مع هذا المقياس.')}</li>
            <li>{tx(lang, 'Capacity, staffing share, or denial mix may sit alongside the change.', 'قد تجاور الطاقة أو حصة التوظيف أو مزيج الرفض هذا التغير.')}</li>
            <li>{tx(lang, 'No factor on this page is marked as a proven cause.', 'لا عامل في هذه الصفحة مُعلَّم كسبب مثبت.')}</li>
          </ul>
        </section>
      ) : null}
      {stage === 3 ? (
        <section className="sx-panel">
          {cohort ? (
            <p>{tx(lang, 'This topic is not given an individual patient prediction. The review stays at cohort level.', 'هذا الموضوع لا يُعطى تنبؤاً لمريض فرد. المراجعة تبقى على مستوى الفوج.')}</p>
          ) : (
            <p>{tx(lang, 'Simulated illustration only. Not a validated model. The figure is the current scenario value held flat, not a forecast product.', 'توضيح محاكى فقط. ليس نموذجاً متحققاً. الرقم هو قيمة السيناريو الحالية كما هي، وليس منتج توقع.')}</p>
          )}
        </section>
      ) : null}
      {stage === 4 ? (
        <section className="sx-panel">
          <h2>{tx(lang, 'Proposed review', 'المراجعة المقترحة')}</h2>
          <p>{tx(lang, 'Ask the responsible lead to review the cohort and the hypothesis list before any operational change.', 'اطلب من القائد المسؤول مراجعة الفوج وقائمة الفرضيات قبل أي تغيير تشغيلي.')}</p>
          <p>{tx(lang, 'Responsible role: domain lead for this workspace. Expected benefit is illustrative and not quantified as a hospital result.', 'الدور المسؤول: قائد المجال لهذه المساحة. الفائدة المتوقعة توضيحية وغير مقاسة كنتيجة مستشفى.')}</p>
        </section>
      ) : null}
      {stage === 5 ? (
        <section className="sx-panel">
          <p>{tx(lang, 'Demo-only decision, stored in this browser.', 'قرار للعرض فقط، يُخزن في هذا المتصفح.')}</p>
          <button type="button" className="sx-btn primary" onClick={() => store.decide(kpi.key, 'approved')}>{tx(lang, 'Approve simulated action', 'اعتماد الإجراء المحاكى')}</button>
          <button type="button" className="sx-btn" onClick={() => store.decide(kpi.key, 'rejected')}>{tx(lang, 'Reject simulated action', 'رفض الإجراء المحاكى')}</button>
          {decision ? <p>{tx(lang, `Recorded: ${decision}`, `المسجل: ${decision === 'approved' ? 'معتمد' : 'مرفوض'}`)}</p> : null}
        </section>
      ) : null}
      {stage === 6 ? (
        <section className="sx-panel">
          {decision === 'approved' ? (
            <p>{tx(lang, 'Illustrative outcome after the demo approval. This is not a measured hospital result. The story shows the measure easing by about 7% of the gap to the prior year, as a labelled illustration.', 'نتيجة توضيحية بعد اعتماد العرض. هذه ليست نتيجة مستشفى مقيسة. القصة تعرض تخفف المقياس بنحو 7٪ من الفجوة إلى السنة السابقة، كتوضيح مُعلَّم.')}</p>
          ) : decision === 'rejected' ? (
            <p>{tx(lang, 'No illustrative outcome. The simulated action was rejected, so the scenario value stays as measured in the story.', 'لا نتيجة توضيحية. رُفض الإجراء المحاكى، فتبقى قيمة السيناريو كما هي في القصة.')}</p>
          ) : (
            <p>{tx(lang, 'Record an approval or rejection before an outcome can be shown.', 'سجل اعتماداً أو رفضاً قبل عرض النتيجة.')}</p>
          )}
        </section>
      ) : null}
    </article>
  );
}

const CASE_AR: Record<string, { title: string; detail: string }> = {
  'PX-2401': { title: 'درجة ساعات الهدوء في الجناح ب', detail: 'انخفضت الدرجة الخيالية بعد فجوة تمريض في أمسيتين.' },
  'PX-2402': { title: 'تعليمات الخروج غير واضحة', detail: 'طلبت أسرة خيالية قائمة دواء أوضح.' },
  'PX-2403': { title: 'استبيان بعد الزيارة، العيادة 3', detail: 'معدل الاستجابة الخيالي دون هدف السيناريو.' },
  'PX-2404': { title: 'تجربة خروج نهاية الأسبوع', detail: 'القصة تعرض انتظاراً أطول في الصيدلية قبل المغادرة.' },
  'PX-2405': { title: 'مكالمات المتابعة في اليوم السابع', detail: 'فات فوج خيالي نافذة مكالمة اليوم السابع.' },
  'PX-2406': { title: 'عرض استعادة الخدمة', detail: 'السيناريو يقترح اتصالاً وورقة تعليمات منقحة.' },
};

export function ExperiencePage() {
  const store = useShowcase();
  const lang = store.lang;
  const labels = { open: tx(lang, 'open', 'مفتوحة'), reviewing: tx(lang, 'reviewing', 'قيد المراجعة'), closed: tx(lang, 'closed', 'مغلقة') };
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <p className="sx-kicker">{tx(lang, 'Patient experience', 'تجربة المريض')}</p>
        <h1>{tx(lang, 'Cases in the story', 'حالات القصة')}</h1>
        <p>{QUESTION_AR.experience && lang === 'ar' ? QUESTION_AR.experience : 'Satisfaction, complaints, surveys, discharge, follow-up, and service recovery.'}</p>
      </header>
      <ul className="sx-cases">
        {store.cases.map((item) => (
          <li key={item.id}>
            <p className="sx-kicker">{item.kind}</p>
            <h2>{item.id} · {labels[item.status]}</h2>
            <p>{lang === 'ar' ? CASE_AR[item.id]?.title : item.title}</p>
            <p>{lang === 'ar' ? CASE_AR[item.id]?.detail : item.detail}</p>
            <button type="button" className="sx-btn" onClick={() => store.advanceCase(item.id)} disabled={item.status === 'closed'}>
              {tx(lang, 'Advance', 'تقدّم')}
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ComparePage() {
  const store = useShowcase();
  const lang = store.lang;
  const [key, setKey] = useState('kpi_bed_occupancy_rate');
  const kpi = findKpi(key) ?? KPIS[0];
  const choices = useMemo(() => KPIS.slice(0, 80), []);
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <h1>{tx(lang, 'Hospital comparison', 'مقارنة المستشفيات')}</h1>
        <p>{tx(lang, 'One measure, five fictional hospitals, same year. Rates use each hospital’s own numerator and denominator.', 'مقياس واحد، خمسة مستشفيات خيالية، السنة نفسها. المعدلات تستخدم بسط كل مستشفى ومقامه.')}</p>
      </header>
      <label>
        {tx(lang, 'Measure', 'المقياس')}
        <select aria-label={tx(lang, 'Measure', 'المقياس')} value={kpi.key} onChange={(event) => setKey(event.target.value)}>
          {choices.map((item) => <option key={item.key} value={item.key}>{kpiName(item.name, lang)}</option>)}
        </select>
      </label>
      <table className="sx-table">
        <thead>
          <tr>
            <th>{tx(lang, 'Hospital', 'المستشفى')}</th>
            <th>{store.year}</th>
          </tr>
        </thead>
        <tbody>
          {HOSPITALS.filter((item) => item.code !== 'ALL').map((item) => (
            <tr key={item.code}>
              <td>{lang === 'ar' ? item.nameAr : item.name}</td>
              <td>{formatMeasure(measure(kpi, item.code, store.year, store.department), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function CatalogPage() {
  const store = useShowcase();
  const lang = store.lang;
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(30);
  const rows = KPIS.filter((item) => `${item.name} ${item.key} ${item.domain}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <h1>{tx(lang, 'KPI catalog', 'فهرس المؤشرات')}</h1>
        <p>{tx(lang, `${KPIS.length} demonstrations. Catalog, registry, and labelled assumptions stay distinct.`, `${KPIS.length} عرضاً. يبقى الفهرس والسجل والافتراضات المعلّمة منفصلة.`)}</p>
      </header>
      <input className="sx-input" aria-label={tx(lang, 'Search KPIs', 'ابحث في المؤشرات')} value={query} onChange={(event) => { setQuery(event.target.value); setShown(30); }} />
      <ul className="sx-cases">
        {rows.slice(0, shown).map((item) => (
          <li key={item.key}>
            <Link to={`/showcase/kpis/${item.key}`}>{kpiName(item.name, lang)}</Link>
            <p className="sx-ltr">{item.key} · {item.origin} · {item.domain}</p>
          </li>
        ))}
      </ul>
      {rows.length > shown ? <button type="button" className="sx-btn" onClick={() => setShown((value) => value + 40)}>{tx(lang, 'Show more', 'أظهر المزيد')}</button> : null}
    </article>
  );
}

export function AssistantPage() {
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <h1>{tx(useShowcase().lang, 'Assistant', 'المساعد')}</h1>
      </header>
      <AssistantBody />
    </article>
  );
}

function AssistantBody() {
  const store = useShowcase();
  const lang = store.lang;
  const location = useLocation();
  const [question, setQuestion] = useState(ASSISTANT_PROMPTS[0].en);
  const answer = answerQuestion(question, store.hospital, store.year, store.department, lang);
  return (
    <div>
      <p className="sx-kicker">{tx(lang, 'Deterministic simulation. No live model is queried.', 'محاكاة حتمية. لا يُستدعى نموذج حي.')}</p>
      <p className="sx-kicker">{location.pathname}</p>
      <div className="sx-prompts">
        {ASSISTANT_PROMPTS.map((prompt) => (
          <button key={prompt.en} type="button" className="sx-btn" onClick={() => setQuestion(lang === 'ar' ? prompt.ar : prompt.en)}>
            {lang === 'ar' ? prompt.ar : prompt.en}
          </button>
        ))}
      </div>
      <h2>{answer.title}</h2>
      <dl className="sx-answer">
        <dt>{tx(lang, 'Observation', 'الملاحظة')}</dt><dd>{answer.observation}</dd>
        <dt>{tx(lang, 'Evidence', 'الدليل')}</dt><dd>{answer.evidence}</dd>
        <dt>{tx(lang, 'Possible explanation', 'تفسير محتمل')}</dt><dd>{answer.explanation}</dd>
        <dt>{tx(lang, 'Proposed review', 'المراجعة المقترحة')}</dt><dd>{answer.action}</dd>
        <dt>{tx(lang, 'Responsible role', 'الدور المسؤول')}</dt><dd>{answer.role}</dd>
        <dt>{tx(lang, 'Illustrative benefit', 'فائدة توضيحية')}</dt><dd>{answer.benefit}</dd>
        <dt>{tx(lang, 'Simulated approval', 'اعتماد محاكى')}</dt><dd>{answer.approval}</dd>
        <dt>{tx(lang, 'Illustrative outcome', 'نتيجة توضيحية')}</dt><dd>{answer.outcome}</dd>
      </dl>
    </div>
  );
}

export function TourPage() {
  const store = useShowcase();
  const lang = store.lang;
  const step = TOUR[store.tourStep] ?? TOUR[0];
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <p className="sx-kicker">{tx(lang, `Step ${store.tourStep + 1} of ${TOUR.length}`, `الخطوة ${store.tourStep + 1} من ${TOUR.length}`)}</p>
        <h1>{lang === 'ar' ? step.titleAr : step.title}</h1>
        <p>{lang === 'ar' ? step.bodyAr : step.body}</p>
      </header>
      <div className="sx-progress" aria-hidden="true"><span style={{ width: `${((store.tourStep + 1) / TOUR.length) * 100}%` }} /></div>
      <Link className="sx-btn primary" to={step.href}>{tx(lang, 'Open this step', 'افتح هذه الخطوة')}</Link>
      <button type="button" className="sx-btn" onClick={() => store.setTourStep(Math.min(TOUR.length - 1, store.tourStep + 1))}>{tx(lang, 'Next', 'التالي')}</button>
    </article>
  );
}

export function CoveragePage() {
  const lang = useShowcase().lang;
  const domains = new Set(KPIS.map((item) => item.domain));
  return (
    <article className="sx-workspace">
      <header className="sx-mast">
        <h1>{tx(lang, 'Coverage', 'التغطية')}</h1>
      </header>
      <ul>
        <li>{SCREENS.length} {tx(lang, 'original screens', 'شاشة أصلية')}</li>
        <li>{EXTENSIONS.length} {tx(lang, 'enterprise extensions', 'توسعة مؤسسية')}</li>
        <li>{KPIS.filter((item) => item.origin === 'catalog').length} {tx(lang, 'catalog KPIs', 'مؤشر فهرس')}</li>
        <li>{KPIS.filter((item) => item.origin === 'registry').length} {tx(lang, 'registry labels', 'تسمية سجل')}</li>
        <li>{KPIS.filter((item) => item.origin === 'demo_assumption').length} {tx(lang, 'labelled assumptions', 'افتراض معلّم')}</li>
        <li>{USE_CASES.length} {tx(lang, 'simulated use cases', 'حالة استخدام محاكاة')}</li>
        <li>{domains.size} {tx(lang, 'KPI domains', 'مجال مؤشر')}</li>
        <li>{kpisForDomains(['Emergency']).length} {tx(lang, 'emergency definitions available from the catalog', 'تعريف طوارئ متاح من الفهرس')}</li>
      </ul>
      <p>{tx(lang, 'Remaining limits: 280 verified-query SQL texts are not in the source pack and are not invented. Semantic views are names only. Infection, equipment, survey, morgue, birth, eligibility, and dialysis columns are labelled assumptions. Predictions are simulated illustrations. This is not a certified or clinically validated hospital platform.', 'حدود متبقية: نصوص SQL لـ 280 استعلاماً موثقاً غير موجودة في حزمة المصدر ولم تُختلق. العروض الدلالية أسماء فقط. أعمدة العدوى والمعدات والاستبيان والمشرحة والولادة والأهلية والغسيل افتراضات معلّمة. التنبؤات توضيحات محاكاة. هذا ليس منصة مستشفى معتمدة أو متحققة سريرياً.')}</p>
    </article>
  );
}
