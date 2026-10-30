import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

/** Internal survey instrument — not official HCAHPS / CAHPS. */
export const PX_INSTRUMENT_ID = 'DV-PX-Internal-v1';
export const PX_INSTRUMENT_VERSION = '1.0';
export const PX_OVERALL_TARGET = 8.2;
export const PX_MIN_DEPT_SAMPLE = 40;
export const PX_RESOLUTION_TARGET_DAYS = 7;
export const PX_ACK_TARGET_HOURS = 48;

/** Departments used for comparable experience scoring. */
export const PX_DEPARTMENTS = [
  'Emergency',
  'Outpatient clinics',
  'Medicine wards',
  'Surgery wards',
  'Women & children',
  'Diagnostics',
  'Pharmacy',
  'Intensive care',
] as const;
export type PxDepartment = (typeof PX_DEPARTMENTS)[number];

/** Journey touchpoints — not every respondent experiences every step. */
export const TOUCHPOINTS = [
  'Appointment booking',
  'Registration',
  'Arrival / check-in',
  'Waiting',
  'Consultation',
  'Diagnostic services',
  'Medication dispensing',
  'Admission',
  'Inpatient stay',
  'Discharge',
  'Follow-up',
] as const;
export type PxTouchpoint = (typeof TOUCHPOINTS)[number];

export const CARE_SETTINGS = ['Emergency', 'Inpatient', 'Outpatient', 'Day-case / procedure'] as const;
export type PxCareSetting = (typeof CARE_SETTINGS)[number];

export const COMPLAINT_CATEGORIES = [
  'Waiting time',
  'Staff communication',
  'Care coordination',
  'Facility & environment',
  'Billing & admin',
  'Discharge planning',
  'Medication information',
  'Respect & dignity',
] as const;
export type PxComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const THEMES = [
  'Waiting time',
  'Appointment availability',
  'Staff communication',
  'Respect and dignity',
  'Privacy',
  'Information clarity',
  'Facility environment',
  'Medication communication',
  'Discharge coordination',
  'Billing communication',
] as const;
export type PxTheme = (typeof THEMES)[number];

export const SERVICE_LINES = [
  'Emergency care',
  'Ambulatory care',
  'Medical inpatient',
  'Surgical inpatient',
  'Maternity & pediatrics',
  'Critical care',
  'Diagnostics & pharmacy',
] as const;
export type PxServiceLine = (typeof SERVICE_LINES)[number];

export const EXPERIENCE_DIMENSIONS = [
  'Overall rating',
  'Waiting',
  'Communication',
  'Coordination',
  'Discharge',
  'Respect & dignity',
  'Environment',
] as const;

const DEPT_INVITE_SHARES = [0.18, 0.22, 0.14, 0.12, 0.1, 0.1, 0.08, 0.06];
const DEPT_SCORE_BIAS = [-0.35, 0.15, 0.05, -0.1, 0.2, -0.05, 0.1, -0.25];
const SETTING_SHARES = [0.22, 0.28, 0.4, 0.1];
const TOUCHPOINT_SHARES = [0.08, 0.09, 0.1, 0.12, 0.11, 0.09, 0.07, 0.06, 0.1, 0.1, 0.08];
const TOUCHPOINT_SCORE_BIAS = [0.1, 0.05, 0, -0.55, 0.15, -0.2, 0.05, -0.1, 0, -0.35, 0.1];
const COMPLAINT_CAT_SHARES = [0.22, 0.18, 0.12, 0.1, 0.1, 0.1, 0.08, 0.1];
const THEME_SHARES = [0.16, 0.08, 0.14, 0.08, 0.05, 0.1, 0.09, 0.08, 0.12, 0.1];
const SERVICE_LINE_SHARES = [0.18, 0.22, 0.16, 0.14, 0.1, 0.08, 0.12];
const DIMENSION_BASE = [8.1, 7.4, 7.9, 7.6, 7.5, 8.3, 7.8];

/** Clearly synthetic bilingual comment templates — not real patient quotes. */
export const PX_COMMENT_TEMPLATES_EN = [
  '[SYNTHETIC] Waiting at registration felt longer than expected.',
  '[SYNTHETIC] Nurses explained next steps clearly during the stay.',
  '[SYNTHETIC] Discharge instructions were hard to follow at first.',
  '[SYNTHETIC] The clinic team was respectful and attentive.',
  '[SYNTHETIC] Pharmacy wait after discharge created confusion.',
  '[SYNTHETIC] Billing questions were answered after several calls.',
  '[SYNTHETIC] Diagnostic appointment felt well coordinated.',
  '[SYNTHETIC] Privacy during consultation could improve.',
] as const;

export const PX_COMMENT_TEMPLATES_AR = [
  '[SYNTHETIC] الانتظار عند التسجيل كان أطول من المتوقع.',
  '[SYNTHETIC] أوضح طاقم التمريض الخطوات التالية بوضوح.',
  '[SYNTHETIC] تعليمات الخروج كانت صعبة الفهم في البداية.',
  '[SYNTHETIC] كان فريق العيادة محترمًا ومنتبهًا.',
  '[SYNTHETIC] انتظار الصيدلية بعد الخروج سبب ارتباكًا.',
  '[SYNTHETIC] تمت الإجابة عن أسئلة الفواتير بعد عدة مكالمات.',
  '[SYNTHETIC] موعد التشخيص كان منسقًا بشكل جيد.',
  '[SYNTHETIC] يمكن تحسين الخصوصية أثناء الاستشارة.',
] as const;

function monthMeta(year: number, period: ReportPeriod) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const start = period === 'year' ? 0 : { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const count = period === 'year' ? 12 : 3;
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = start + index;
    const days = new Date(year, monthIndex + 1, 0).getDate();
    return { label: names[monthIndex], monthIndex, days };
  });
}

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.16, Math.max(0, occ - 0.74));
}

function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function r3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const CACHE = new Map<string, PxView>();

/** Shared Patient Experience scenario for screens, Assist, alerts, and what-if. */
export function buildPxView(hospital: string, year: number, period: ReportPeriod = 'year'): PxView {
  const cacheKey = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(cacheKey, view);
  return view;
}

/** Test helper — clears memoized views after model changes in the same process. */
export function clearPxViewCache(): void {
  CACHE.clear();
}

function periodDayBounds(year: number, period: ReportPeriod): { start: number; end: number } {
  const yearMonths = monthMeta(year, 'year');
  if (period === 'year') return { start: 0, end: sum(yearMonths.map((item) => item.days)) };
  const startMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  let start = 0;
  for (let i = 0; i < startMonth; i += 1) start += yearMonths[i].days;
  let end = start;
  for (let i = startMonth; i < startMonth + 3; i += 1) end += yearMonths[i].days;
  return { start, end };
}

function scoreFromSeed(seed: number, mean: number, pressure: number): number {
  const raw = mean - pressure * 1.8 + (unit(seed) - 0.5) * 3.4;
  return Math.max(0, Math.min(10, Math.round(raw)));
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  // Always simulate the full calendar year, then slice the selected period so
  // Q1–Q4 + year share one invitation / complaint / comment ledger.
  const yearMonths = monthMeta(year, 'year');
  const months = period === 'year' ? yearMonths : monthMeta(year, period);
  const monthCount = yearMonths.length;
  const bounds = periodDayBounds(year, period);
  const days = bounds.end - bounds.start;
  const pressure = tilt(hospital, year);
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];

  const site = SITE_SPECS[hospital as SiteCode];
  const beds = hospital === 'ALL'
    ? (['H1', 'H2', 'H3', 'H4', 'H5'] as SiteCode[]).reduce((total, code) => total + SITE_SPECS[code].beds, 0)
    : (site?.beds ?? 300);
  const siteSeed = beds * 13 + year * 29;
  const focus = scenarioFor(hospital, year).focus;
  const scenarioMonths = scenarioFor(hospital, year).months;

  // Supporting operational context only — not duplicated as PX headline KPIs.
  const operationalContext = {
    edWaitMedianMin: focus.edWaitMedianMin,
    opWaitMedianMin: focus.opWaitMedianMin,
    ipLosDays: focus.ipLosDays,
    admissions: focus.admissions,
    discharges: focus.discharges,
    edArrivals: focus.edArrivals,
    apptAttended: focus.apptAttended,
    surveysSentScenario: focus.surveysSent,
    surveysReturnedScenario: focus.surveysReturned,
    complaintsOpenedScenario: focus.complaintsOpened,
    complaintsClosedScenario: focus.complaintsClosed,
    satisfactionScenario: focus.satisfaction,
  };

  // --- Survey invitation & completion ledger (full year, daily then monthly) ---
  // Instrument DV-PX-Internal-v1: eligible population = discharged / completed encounters invited.
  const monthlyInviteTarget = yearMonths.map((_, index) => {
    const base = scenarioMonths[index]?.surveysSent
      ?? Math.round((focus.surveysSent || Math.round(focus.encounters * 0.34)) / 12);
    const seasonal = 1 + 0.05 * Math.sin(index * 1.2 + siteSeed * 0.01);
    return Math.max(1, Math.round(base * seasonal * (hospital === 'ALL' ? 1 : 1)));
  });

  type DaySurvey = {
    invitations: number;
    completionsRaw: number;
    duplicateCompletions: number;
    eligibleCompleted: number;
    overallSum: number;
    overallCount: number;
    topBox: number;
    bottomBox: number;
    recommendSumPromoters: number;
    recommendSumDetractors: number;
    recommendCount: number;
    waitingSum: number;
    waitingCount: number;
    communicationSum: number;
    communicationCount: number;
    coordinationSum: number;
    coordinationCount: number;
    dischargeSum: number;
    dischargeCount: number;
    linkedJourney: number;
    unlinkedJourney: number;
    touchpointRatings: number;
    touchpointNegative: number;
  };

  const daySurveys: DaySurvey[] = [];
  let inviteLeft = sum(monthlyInviteTarget);
  const monthlyInvites: number[] = [];
  const monthlyCompleted: number[] = [];
  const monthlyOverallMean: number[] = [];
  const monthlyResponseRate: number[] = [];
  const monthlyComplaintsNew: number[] = [];
  const monthlyComplaintsClosed: number[] = [];
  const monthlyComments: number[] = [];
  const monthlyNegativeComments: number[] = [];

  // Complaint ledger state across full year
  type DayComplaint = {
    openingOpen: number;
    newComplaints: number;
    reopened: number;
    closed: number;
    withdrawn: number;
    closingOpen: number;
  };
  const dayComplaints: DayComplaint[] = [];
  const complaintOpenBase = Math.max(
    2,
    Math.round((focus.complaintsOpened || Math.round(focus.encounters * 0.004)) * (0.08 + pressure * 0.06)),
  );
  let openComplaints = complaintOpenBase;
  const resolutionDaysSample: number[] = [];
  let previouslyClosedYear = 0;

  // Comment / voice pipeline
  type CommentRow = {
    id: string;
    language: 'en' | 'ar';
    theme: PxTheme;
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    reviewStatus: 'auto' | 'human_reviewed' | 'pending_review';
    safetyFlag: boolean;
    text: string;
    department: PxDepartment;
    monthIndex: number;
  };
  const yearComments: CommentRow[] = [];

  let dayCursor = 0;
  for (let m = 0; m < monthCount; m += 1) {
    const monthDays = yearMonths[m].days;
    const monthInvitePlan = monthlyInviteTarget[m];
    let monthInviteDone = 0;
    let monthCompleted = 0;
    let monthOverallSum = 0;
    let monthOverallCount = 0;
    let monthComments = 0;
    let monthNegComments = 0;
    let monthNewComplaints = 0;
    let monthClosedComplaints = 0;

    const monthComplaintTarget = Math.max(
      1,
      Math.round((scenarioMonths[m]?.complaintsOpened ?? focus.complaintsOpened / 12) * (0.95 + pressure * 0.2)),
    );
    const monthCloseTarget = Math.max(
      0,
      Math.round((scenarioMonths[m]?.complaintsClosed ?? focus.complaintsClosed / 12) * (0.9 + unit(siteSeed + m) * 0.2)),
    );

    for (let d = 0; d < monthDays; d += 1) {
      const daysLeft = monthDays - d;
      const invitations = Math.min(
        inviteLeft,
        Math.max(0, Math.round((monthInvitePlan - monthInviteDone) / daysLeft)),
      );
      inviteLeft -= invitations;
      monthInviteDone += invitations;

      // Response propensity; duplicates are completions after first eligible completion per invitation.
      const responsePropensity = Math.min(0.62, Math.max(0.28, 0.46 - pressure * 0.12 + (unit(siteSeed + dayCursor * 2.1) - 0.5) * 0.06));
      const completionsRaw = Math.round(invitations * responsePropensity * (0.92 + unit(siteSeed + dayCursor * 4.3) * 0.16));
      const duplicateRate = 0.02 + pressure * 0.015;
      const duplicateCompletions = Math.min(completionsRaw, Math.round(completionsRaw * duplicateRate));
      const eligibleCompleted = Math.max(0, completionsRaw - duplicateCompletions);

      let overallSum = 0;
      let overallCount = 0;
      let topBox = 0;
      let bottomBox = 0;
      let recommendPromoters = 0;
      let recommendDetractors = 0;
      let recommendCount = 0;
      let waitingSum = 0;
      let waitingCount = 0;
      let communicationSum = 0;
      let communicationCount = 0;
      let coordinationSum = 0;
      let coordinationCount = 0;
      let dischargeSum = 0;
      let dischargeCount = 0;
      let linkedJourney = 0;
      let unlinkedJourney = 0;
      let touchpointRatings = 0;
      let touchpointNegative = 0;

      const overallMeanTarget = 8.05 - pressure * 1.6 + DEPT_SCORE_BIAS[m % DEPT_SCORE_BIAS.length] * 0.15;
      for (let i = 0; i < eligibleCompleted; i += 1) {
        const seed = siteSeed + dayCursor * 17.3 + i * 3.7;
        const overall = scoreFromSeed(seed, overallMeanTarget, pressure * 0.4);
        overallSum += overall;
        overallCount += 1;
        if (overall >= 9) topBox += 1;
        if (overall <= 6) bottomBox += 1;

        // Q_RECOMMEND 0–10 — Patient Recommendation Score (not official NPS product).
        const recommend = scoreFromSeed(seed + 1.1, overallMeanTarget - 0.15, pressure * 0.35);
        recommendCount += 1;
        if (recommend >= 9) recommendPromoters += 1;
        else if (recommend <= 6) recommendDetractors += 1;

        const waiting = scoreFromSeed(seed + 2.2, DIMENSION_BASE[1] - pressure * 1.4, pressure * 0.5);
        waitingSum += waiting;
        waitingCount += 1;
        const communication = scoreFromSeed(seed + 3.3, DIMENSION_BASE[2] - pressure * 0.9, pressure * 0.4);
        communicationSum += communication;
        communicationCount += 1;
        const coordination = scoreFromSeed(seed + 4.4, DIMENSION_BASE[3] - pressure * 1.0, pressure * 0.4);
        coordinationSum += coordination;
        coordinationCount += 1;
        if (unit(seed + 5) > 0.35) {
          const discharge = scoreFromSeed(seed + 5.5, DIMENSION_BASE[4] - pressure * 1.1, pressure * 0.45);
          dischargeSum += discharge;
          dischargeCount += 1;
        }

        // Journey linkage: retain unlinked responses without fabricating joins.
        const linkRoll = unit(seed + 8.8);
        if (linkRoll < 0.72 - pressure * 0.08) {
          linkedJourney += 1;
          const tpCount = 2 + Math.floor(unit(seed + 9.1) * 4);
          for (let t = 0; t < tpCount; t += 1) {
            const tpBias = TOUCHPOINT_SCORE_BIAS[(i + t) % TOUCHPOINT_SCORE_BIAS.length];
            const tpScore = scoreFromSeed(seed + 10 + t, overallMeanTarget + tpBias, pressure * 0.4);
            touchpointRatings += 1;
            if (tpScore <= 6) touchpointNegative += 1;
          }
        } else {
          unlinkedJourney += 1;
        }
      }

      daySurveys.push({
        invitations,
        completionsRaw,
        duplicateCompletions,
        eligibleCompleted,
        overallSum,
        overallCount,
        topBox,
        bottomBox,
        recommendSumPromoters: recommendPromoters,
        recommendSumDetractors: recommendDetractors,
        recommendCount,
        waitingSum,
        waitingCount,
        communicationSum,
        communicationCount,
        coordinationSum,
        coordinationCount,
        dischargeSum,
        dischargeCount,
        linkedJourney,
        unlinkedJourney,
        touchpointRatings,
        touchpointNegative,
      });

      monthCompleted += eligibleCompleted;
      monthOverallSum += overallSum;
      monthOverallCount += overallCount;

      // Free-text comments (subset of completions) — multilingual synthetic templates.
      const commentCount = Math.round(eligibleCompleted * (0.28 + unit(siteSeed + dayCursor * 6.2) * 0.12));
      for (let c = 0; c < commentCount; c += 1) {
        const cSeed = siteSeed + dayCursor * 31 + c * 7.3;
        const lang: 'en' | 'ar' = unit(cSeed) < 0.62 ? 'en' : 'ar';
        const themeRoll = unit(cSeed + 1);
        let themeIdx = 0;
        let themeAcc = 0;
        for (let t = 0; t < THEME_SHARES.length; t += 1) {
          themeAcc += THEME_SHARES[t];
          if (themeRoll <= themeAcc) { themeIdx = t; break; }
          themeIdx = t;
        }
        const theme = THEMES[themeIdx];
        const sentRoll = unit(cSeed + 2);
        const sentiment: CommentRow['sentiment'] = sentRoll < 0.28 + pressure * 0.12
          ? 'negative'
          : sentRoll < 0.55
            ? 'neutral'
            : 'positive';
        if (sentiment === 'negative') monthNegComments += 1;
        const safetyFlag = sentiment === 'negative' && unit(cSeed + 3) < 0.06;
        const reviewRoll = unit(cSeed + 4);
        const reviewStatus: CommentRow['reviewStatus'] = safetyFlag || reviewRoll < 0.12
          ? 'pending_review'
          : reviewRoll < 0.55
            ? 'human_reviewed'
            : 'auto';
        const templates = lang === 'en' ? PX_COMMENT_TEMPLATES_EN : PX_COMMENT_TEMPLATES_AR;
        const text = templates[Math.floor(unit(cSeed + 5) * templates.length) % templates.length];
        const department = PX_DEPARTMENTS[Math.floor(unit(cSeed + 6) * PX_DEPARTMENTS.length) % PX_DEPARTMENTS.length];
        yearComments.push({
          id: `PXC-${year}-${String(dayCursor).padStart(3, '0')}-${String(c).padStart(3, '0')}`,
          language: lang,
          theme,
          sentiment,
          confidence: r2(0.55 + unit(cSeed + 7) * 0.4),
          reviewStatus,
          safetyFlag,
          text,
          department,
          monthIndex: m,
        });
        monthComments += 1;
      }

      // Complaint daily ledger: opening + new + reopened − closed − withdrawn = closing
      const openingOpen = openComplaints;
      const newToday = Math.min(
        monthComplaintTarget,
        Math.max(0, Math.round((monthComplaintTarget - monthNewComplaints) / daysLeft)),
      );
      const reopenToday = Math.min(
        Math.max(0, Math.round(previouslyClosedYear * 0.002 + pressure * 0.4)),
        Math.max(0, Math.round(unit(siteSeed + dayCursor * 11.2) * (1.2 + pressure))),
      );
      const withdrawToday = unit(siteSeed + dayCursor * 13.1) < 0.08
        ? Math.min(openingOpen + newToday, 1)
        : 0;
      const availableToClose = openingOpen + newToday + reopenToday - withdrawToday;
      const closePlan = Math.min(
        availableToClose,
        Math.max(0, Math.round((monthCloseTarget - monthClosedComplaints) / daysLeft)),
      );
      const closedToday = Math.min(availableToClose, closePlan);
      const closingOpen = openingOpen + newToday + reopenToday - closedToday - withdrawToday;
      openComplaints = Math.max(0, closingOpen);
      dayComplaints.push({
        openingOpen,
        newComplaints: newToday,
        reopened: reopenToday,
        closed: closedToday,
        withdrawn: withdrawToday,
        closingOpen: openComplaints,
      });
      monthNewComplaints += newToday;
      monthClosedComplaints += closedToday;
      previouslyClosedYear += closedToday;

      for (let r = 0; r < closedToday; r += 1) {
        const rSeed = siteSeed + dayCursor * 19 + r * 2.4;
        const daysToResolve = Math.max(0.3, r1((3.5 + pressure * 6) * (0.35 + unit(rSeed) * 2.1)));
        resolutionDaysSample.push(daysToResolve);
      }

      dayCursor += 1;
    }

    monthlyInvites.push(monthInviteDone);
    monthlyCompleted.push(monthCompleted);
    monthlyOverallMean.push(monthOverallCount > 0 ? r2(monthOverallSum / monthOverallCount) : 0);
    monthlyResponseRate.push(monthInviteDone > 0 ? r3(monthCompleted / monthInviteDone) : 0);
    monthlyComplaintsNew.push(monthNewComplaints);
    monthlyComplaintsClosed.push(monthClosedComplaints);
    monthlyComments.push(monthComments);
    monthlyNegativeComments.push(monthNegComments);
  }

  // Slice ledgers to selected period
  const periodSurveys = daySurveys.slice(bounds.start, bounds.end);
  const periodComplaints = dayComplaints.slice(bounds.start, bounds.end);
  const periodMonthStart = period === 'year' ? 0 : { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const periodMonthCount = period === 'year' ? 12 : 3;
  const sliceMonthly = <T,>(values: T[]) => values.slice(periodMonthStart, periodMonthStart + periodMonthCount);
  const periodComments = yearComments.filter((item) => (
    item.monthIndex >= periodMonthStart && item.monthIndex < periodMonthStart + periodMonthCount
  ));

  // Aggregate survey KPIs from period days — numerator/denominator, not average of percentages.
  let eligibleInvitations = 0;
  let completionsRaw = 0;
  let duplicateCompletions = 0;
  let eligibleCompleted = 0;
  let overallSum = 0;
  let overallCount = 0;
  let topBox = 0;
  let bottomBox = 0;
  let recommendPromoters = 0;
  let recommendDetractors = 0;
  let recommendCount = 0;
  let waitingSum = 0;
  let waitingCount = 0;
  let communicationSum = 0;
  let communicationCount = 0;
  let coordinationSum = 0;
  let coordinationCount = 0;
  let dischargeSum = 0;
  let dischargeCount = 0;
  let linkedJourney = 0;
  let unlinkedJourney = 0;
  let touchpointRatings = 0;
  let touchpointNegative = 0;

  for (const day of periodSurveys) {
    eligibleInvitations += day.invitations;
    completionsRaw += day.completionsRaw;
    duplicateCompletions += day.duplicateCompletions;
    eligibleCompleted += day.eligibleCompleted;
    overallSum += day.overallSum;
    overallCount += day.overallCount;
    topBox += day.topBox;
    bottomBox += day.bottomBox;
    recommendPromoters += day.recommendSumPromoters;
    recommendDetractors += day.recommendSumDetractors;
    recommendCount += day.recommendCount;
    waitingSum += day.waitingSum;
    waitingCount += day.waitingCount;
    communicationSum += day.communicationSum;
    communicationCount += day.communicationCount;
    coordinationSum += day.coordinationSum;
    coordinationCount += day.coordinationCount;
    dischargeSum += day.dischargeSum;
    dischargeCount += day.dischargeCount;
    linkedJourney += day.linkedJourney;
    unlinkedJourney += day.unlinkedJourney;
    touchpointRatings += day.touchpointRatings;
    touchpointNegative += day.touchpointNegative;
  }

  const overallSatisfaction = overallCount > 0 ? r2(overallSum / overallCount) : 0;
  const responseRate = eligibleInvitations > 0 ? r3(eligibleCompleted / eligibleInvitations) : 0;
  const positiveShare = overallCount > 0 ? r3(topBox / overallCount) : 0;
  const negativeShare = overallCount > 0 ? r3(bottomBox / overallCount) : 0;
  const promoterShare = recommendCount > 0 ? recommendPromoters / recommendCount : 0;
  const detractorShare = recommendCount > 0 ? recommendDetractors / recommendCount : 0;
  const recommendationScore = r1((promoterShare - detractorShare) * 100);
  const waitingScore = waitingCount > 0 ? r2(waitingSum / waitingCount) : 0;
  const communicationScore = communicationCount > 0 ? r2(communicationSum / communicationCount) : 0;
  const coordinationScore = coordinationCount > 0 ? r2(coordinationSum / coordinationCount) : 0;
  const dischargeScore = dischargeCount > 0 ? r2(dischargeSum / dischargeCount) : 0;
  const journeySatisfaction = linkedJourney > 0
    ? r2((waitingScore + communicationScore + coordinationScore + (dischargeCount ? dischargeScore : waitingScore)) / (dischargeCount ? 4 : 3))
    : overallSatisfaction;
  const negativeTouchpointShare = touchpointRatings > 0 ? r3(touchpointNegative / touchpointRatings) : 0;
  const journeyLinkageCoverage = (linkedJourney + unlinkedJourney) > 0
    ? r3(linkedJourney / (linkedJourney + unlinkedJourney))
    : 0;

  // Rating distribution on 0–10 (from deterministic reconstruction of counts)
  const ratingDistribution = Array.from({ length: 11 }, (_, score) => {
    // Approximate bin counts from overall mean/variance using seeded shares
    const weight = Math.exp(-Math.pow(score - overallSatisfaction, 2) / (2 * (1.8 + pressure) ** 2));
    return { score, weight };
  });
  const weightSum = sum(ratingDistribution.map((item) => item.weight)) || 1;
  const ratingCounts = splitExact(overallCount, ratingDistribution.map((item) => item.weight / weightSum));
  const experienceDistribution = ratingCounts.map((count, score) => ({ score, count }));

  // Dimension performance (numerator/denominator means)
  const dimensionRows = EXPERIENCE_DIMENSIONS.map((name, index) => {
    if (index === 0) return { name, score: overallSatisfaction, n: overallCount };
    if (index === 1) return { name, score: waitingScore, n: waitingCount };
    if (index === 2) return { name, score: communicationScore, n: communicationCount };
    if (index === 3) return { name, score: coordinationScore, n: coordinationCount };
    if (index === 4) return { name, score: dischargeScore, n: dischargeCount };
    const n = Math.round(overallCount * (0.88 - index * 0.04));
    const score = r2(DIMENSION_BASE[index] - pressure * (0.8 + index * 0.05) + (unit(siteSeed + index * 4.1) - 0.5) * 0.6);
    return { name, score, n };
  });
  const lowestDimension = dimensionRows.slice(1).reduce((best, row) => (row.score < best.score ? row : best), dimensionRows[1]);

  // Care setting mix
  const settingCompletions = splitExact(eligibleCompleted, SETTING_SHARES);
  const settingRows = CARE_SETTINGS.map((name, index) => {
    const n = settingCompletions[index];
    const score = r2(overallSatisfaction + (index === 0 ? -0.35 : index === 1 ? -0.1 : index === 2 ? 0.2 : 0.05) - pressure * 0.15);
    return { name, responses: n, score: Math.max(0, Math.min(10, score)) };
  });

  // Touchpoint rows
  const touchpointRatingParts = splitExact(Math.max(touchpointRatings, TOUCHPOINTS.length), TOUCHPOINT_SHARES);
  const touchpointRows = TOUCHPOINTS.map((name, index) => {
    const n = touchpointRatingParts[index];
    const neg = Math.round(n * Math.min(0.55, Math.max(0.05, negativeTouchpointShare * (1 - TOUCHPOINT_SCORE_BIAS[index] * 0.3))));
    const score = r2(Math.max(0, Math.min(10, overallSatisfaction + TOUCHPOINT_SCORE_BIAS[index] - pressure * 0.2)));
    return { name, ratings: n, negative: neg, score };
  });

  // --- Complaint period aggregates ---
  let complaintsNew = 0;
  let complaintsReopened = 0;
  let complaintsClosed = 0;
  let complaintsWithdrawn = 0;
  const openingOpen = periodComplaints[0]?.openingOpen ?? complaintOpenBase;
  const closingOpen = periodComplaints.length
    ? periodComplaints[periodComplaints.length - 1].closingOpen
    : openingOpen;
  for (const day of periodComplaints) {
    complaintsNew += day.newComplaints;
    complaintsReopened += day.reopened;
    complaintsClosed += day.closed;
    complaintsWithdrawn += day.withdrawn;
  }
  const complaintsTotal = complaintsNew;
  const complaintsOpen = closingOpen;
  const complaintLedgerIdentity = openingOpen + complaintsNew + complaintsReopened - complaintsClosed - complaintsWithdrawn;
  const complaintLedgerBalanced = complaintLedgerIdentity === closingOpen;

  const periodResolutionSample = resolutionDaysSample.slice(
    Math.max(0, Math.round(resolutionDaysSample.length * (bounds.start / Math.max(1, dayCursor)))),
    Math.max(0, Math.round(resolutionDaysSample.length * (bounds.end / Math.max(1, dayCursor)))),
  );
  const sortedResolution = [...periodResolutionSample].sort((a, b) => a - b);
  const medianResolutionDays = quantile(sortedResolution, 0.5);
  const p90ResolutionDays = quantile(sortedResolution, 0.9);
  const overdueComplaints = Math.max(
    0,
    Math.round(closingOpen * (0.22 + pressure * 0.18) + sortedResolution.filter((value) => value > PX_RESOLUTION_TARGET_DAYS).length * 0.02),
  );
  const firstContactResolution = complaintsClosed > 0
    ? r3(Math.min(complaintsClosed, Math.round(complaintsClosed * (0.78 - pressure * 0.12))) / complaintsClosed)
    : 0;
  const reopenRate = (complaintsClosed + complaintsReopened) > 0
    ? r3(complaintsReopened / Math.max(1, complaintsClosed + Math.round(previouslyClosedYear * (periodMonthCount / 12))))
    : 0;

  const complaintByCategory = splitExact(complaintsTotal, COMPLAINT_CAT_SHARES).map((count, index) => ({
    name: COMPLAINT_CATEGORIES[index],
    count,
  }));
  const complaintAging = splitExact(Math.max(0, closingOpen), [0.32, 0.28, 0.22, 0.18]).map((count, index) => ({
    name: ['≤2 days', '3–7 days', '8–14 days', '>14 days'][index],
    count,
  }));
  const resolutionBands = (() => {
    if (!sortedResolution.length) {
      return [
        { name: '≤2 days', count: 0 },
        { name: '3–7 days', count: 0 },
        { name: '8–14 days', count: 0 },
        { name: '>14 days', count: 0 },
      ];
    }
    return [
      { name: '≤2 days', count: sortedResolution.filter((v) => v <= 2).length },
      { name: '3–7 days', count: sortedResolution.filter((v) => v > 2 && v <= 7).length },
      { name: '8–14 days', count: sortedResolution.filter((v) => v > 7 && v <= 14).length },
      { name: '>14 days', count: sortedResolution.filter((v) => v > 14).length },
    ];
  })();
  const complaintStatus = [
    { name: 'Open / in progress', count: closingOpen },
    { name: 'Closed in period', count: complaintsClosed },
    { name: 'Withdrawn', count: complaintsWithdrawn },
    { name: 'Reopened events', count: complaintsReopened },
    { name: 'Escalated (events)', count: Math.round(complaintsNew * (0.08 + pressure * 0.05)) },
  ];

  // --- Voice / sentiment ---
  const commentsAnalyzed = periodComments.length;
  const negativeComments = periodComments.filter((item) => item.sentiment === 'negative').length;
  const negativeFeedbackShare = commentsAnalyzed > 0 ? r3(negativeComments / commentsAnalyzed) : 0;
  const highPriorityFeedback = periodComments.filter((item) => item.safetyFlag || item.reviewStatus === 'pending_review').length;
  const humanReviewed = periodComments.filter((item) => item.reviewStatus === 'human_reviewed').length;
  const themeReviewCoverage = commentsAnalyzed > 0 ? r3(humanReviewed / commentsAnalyzed) : 0;

  const themeCounts = THEMES.map((name) => ({
    name,
    count: periodComments.filter((item) => item.theme === name).length,
    negative: periodComments.filter((item) => item.theme === name && item.sentiment === 'negative').length,
  }));
  // Emerging = themes with negative polarity and elevated share vs equal baseline
  const themeBaseline = commentsAnalyzed / Math.max(1, THEMES.length);
  const emergingThemeRows = themeCounts
    .filter((item) => item.negative >= Math.max(2, themeBaseline * 0.35) && item.count > themeBaseline * 0.9)
    .sort((a, b) => b.negative - a.negative);
  const emergingThemes = emergingThemeRows.length;
  const topPositiveTopics = [...themeCounts].sort((a, b) => (b.count - b.negative) - (a.count - a.negative)).slice(0, 5);
  const topNegativeTopics = [...themeCounts].sort((a, b) => b.negative - a.negative).slice(0, 5);
  const sentimentTrend = sliceMonthly(monthlyComments).map((total, index) => {
    const neg = sliceMonthly(monthlyNegativeComments)[index] ?? 0;
    return {
      label: months[index].label,
      comments: total,
      negative: neg,
      negativeShare: total > 0 ? r3(neg / total) : 0,
    };
  });
  const languageMix = [
    { name: 'English', count: periodComments.filter((item) => item.language === 'en').length },
    { name: 'Arabic', count: periodComments.filter((item) => item.language === 'ar').length },
  ];
  const sampleComments = periodComments.slice(0, 12).map((item) => ({
    id: item.id,
    language: item.language,
    theme: item.theme,
    sentiment: item.sentiment,
    confidence: item.confidence,
    reviewStatus: item.reviewStatus,
    safetyFlag: item.safetyFlag,
    text: item.text,
    department: item.department,
  }));

  const themeByDepartment = PX_DEPARTMENTS.map((dept) => {
    const rows = THEMES.map((theme) => ({
      theme,
      count: periodComments.filter((item) => item.department === dept && item.theme === theme && item.sentiment === 'negative').length,
    }));
    return { department: dept, themes: rows, negativeTotal: sum(rows.map((item) => item.count)) };
  });

  // Unresolved experience issues = open complaints + high-priority unreviewed comments
  const highPriorityUnreviewed = periodComments.filter((item) => (
    (item.safetyFlag || item.sentiment === 'negative') && item.reviewStatus === 'pending_review'
  )).length;
  const unresolvedIssues = complaintsOpen + highPriorityUnreviewed;

  // --- Departments & service lines ---
  const deptInvites = splitExact(eligibleInvitations, DEPT_INVITE_SHARES);
  const deptCompletions = splitExact(eligibleCompleted, DEPT_INVITE_SHARES);
  const departmentRows = PX_DEPARTMENTS.map((name, index) => {
    const invitations = deptInvites[index];
    const responses = deptCompletions[index];
    const score = r2(Math.max(0, Math.min(10, overallSatisfaction + DEPT_SCORE_BIAS[index] - pressure * 0.1)));
    const negShare = r3(Math.max(0.04, Math.min(0.45, negativeShare * (1 - DEPT_SCORE_BIAS[index] * 0.25))));
    const coverage = invitations > 0 ? r3(responses / invitations) : 0;
    const adequateSample = responses >= PX_MIN_DEPT_SAMPLE;
    const meetsTarget = adequateSample && score >= PX_OVERALL_TARGET;
    const needsReview = adequateSample && (score < PX_OVERALL_TARGET || negShare > negativeShare * 1.15);
    const belowCoverage = responses < PX_MIN_DEPT_SAMPLE;
    return {
      name,
      invitations,
      responses,
      score,
      negativeShare: negShare,
      coverage,
      adequateSample,
      meetsTarget,
      needsReview,
      belowCoverage,
    };
  });
  const deptsMeetingTarget = departmentRows.filter((item) => item.meetsTarget).length;
  const coverageGap = departmentRows.filter((item) => item.belowCoverage).length;
  const deptsRequiringReview = departmentRows.filter((item) => item.needsReview).length;
  const adequateScores = departmentRows.filter((item) => item.adequateSample).map((item) => item.score);
  const materialVariance = adequateScores.length
    ? r2(Math.max(...adequateScores) - Math.min(...adequateScores))
    : 0;

  const serviceLineParts = splitExact(eligibleCompleted, SERVICE_LINE_SHARES);
  const serviceLineRows = SERVICE_LINES.map((name, index) => {
    const responses = serviceLineParts[index];
    const score = r2(Math.max(0, Math.min(10, overallSatisfaction + (index % 3 - 1) * 0.2 - pressure * 0.08)));
    return { name, responses, score };
  });

  const deptSatDistribution = [
    { name: '<7.0', count: departmentRows.filter((item) => item.score < 7).length },
    { name: '7.0–7.9', count: departmentRows.filter((item) => item.score >= 7 && item.score < 8).length },
    { name: '8.0–8.9', count: departmentRows.filter((item) => item.score >= 8 && item.score < 9).length },
    { name: '≥9.0', count: departmentRows.filter((item) => item.score >= 9).length },
  ];

  const settingTrend = CARE_SETTINGS.map((name, sIndex) => ({
    name,
    monthly: months.map((_, index) => r2(Math.max(0, Math.min(10,
      (sliceMonthly(monthlyOverallMean)[index] || overallSatisfaction)
      + (sIndex === 0 ? -0.3 : sIndex === 2 ? 0.15 : 0)
      + 0.08 * Math.sin((periodMonthStart + index) * 1.1 + sIndex),
    )))),
  }));

  // --- Optimization (6 opportunities matching what-if themes) ---
  const addressableGap = r2(Math.max(0, PX_OVERALL_TARGET - overallSatisfaction));
  const waitEligible = Math.round(touchpointRows.find((item) => item.name === 'Waiting')?.negative ?? touchpointNegative * 0.25);
  const communicationEligible = Math.round(overallCount * Math.max(0, 1 - communicationScore / 10) * 0.35);
  const resolutionEligible = overdueComplaints;
  const dischargeEligible = Math.round((dischargeCount || Math.round(overallCount * 0.55)) * Math.max(0, (PX_OVERALL_TARGET - dischargeScore) / 10));
  const repeatedComplaintEligible = Math.round(complaintsTotal * Math.min(0.45, reopenRate + 0.12 + pressure * 0.08));
  const lowTouchpointEligible = sum(
    [...touchpointRows].sort((a, b) => a.score - b.score).slice(0, 3).map((item) => item.negative),
  );

  const opportunities = [
    {
      id: 'px_opt_wait',
      theme: 'wait' as const,
      title: 'Reduce waiting-time dissatisfaction',
      observedIssue: 'Waiting touchpoint scores trail overall experience.',
      evidence: `Waiting score ${waitingScore}/10; ${waitEligible} negative waiting ratings in linked journeys.`,
      operationalContext: `Supporting ED median wait ${operationalContext.edWaitMedianMin} min; OPD median wait ${operationalContext.opWaitMedianMin} min (context only).`,
      proposedAction: 'Tighten check-in queue visibility and appointment start communication for eligible clinics.',
      modeledUpliftPoints: r2(Math.min(addressableGap * 0.35, 0.45)),
      complaintReduction: Math.round(complaintByCategory[0].count * 0.28),
      eligiblePopulation: waitEligible,
      assumptions: 'Illustrative — assumes operational wait communication improves without claiming causation from survey correlation.',
      owner: 'Patient Access & Outpatient Operations',
      effort: 'Medium',
      followUpMeasure: 'kpi_px_waiting_score',
      priority: true,
    },
    {
      id: 'px_opt_communication',
      theme: 'communication' as const,
      title: 'Improve staff communication consistency',
      observedIssue: 'Communication dimension below target for a material share of respondents.',
      evidence: `Communication score ${communicationScore}/10 on ${communicationCount} eligible answers.`,
      operationalContext: 'Uses DV-PX-Internal-v1 communication items only — not clinician performance ranking.',
      proposedAction: 'Standardize bedside / clinic explanation checklists for high-volume services.',
      modeledUpliftPoints: r2(Math.min(addressableGap * 0.28, 0.35)),
      complaintReduction: Math.round(complaintByCategory[1].count * 0.22),
      eligiblePopulation: communicationEligible,
      assumptions: 'Process adherence uplift is illustrative; no guaranteed clinical or satisfaction outcome.',
      owner: 'Nursing & Ambulatory Leadership',
      effort: 'Medium',
      followUpMeasure: 'kpi_px_communication_score',
      priority: true,
    },
    {
      id: 'px_opt_resolution_time',
      theme: 'resolution_time' as const,
      title: 'Reduce complaint resolution time',
      observedIssue: 'Open backlog includes overdue cases past the illustrative resolution target.',
      evidence: `Median resolution ${medianResolutionDays} days; overdue open ${overdueComplaints}; target ${PX_RESOLUTION_TARGET_DAYS} days.`,
      operationalContext: 'Service recovery clocks are operational — closed ≠ patient satisfied.',
      proposedAction: 'Rebalance assignment queues and escalate aging cases before day 7.',
      modeledUpliftPoints: r2(Math.min(0.15, addressableGap * 0.12)),
      complaintReduction: Math.round(overdueComplaints * 0.4),
      eligiblePopulation: resolutionEligible,
      assumptions: 'Faster closure reduces overdue stock; does not invent recovery satisfaction.',
      owner: 'Patient Relations',
      effort: 'Low',
      followUpMeasure: 'kpi_px_median_resolution',
      priority: true,
    },
    {
      id: 'px_opt_discharge',
      theme: 'discharge' as const,
      title: 'Improve discharge communication',
      observedIssue: 'Discharge experience trails the overall instrument mean.',
      evidence: `Discharge score ${dischargeScore}/10 on ${dischargeCount} eligible discharge answers.`,
      operationalContext: `Supporting discharges ${operationalContext.discharges} (context only — not a PX headline).`,
      proposedAction: 'Strengthen teach-back and medication / follow-up clarity at discharge.',
      modeledUpliftPoints: r2(Math.min(addressableGap * 0.22, 0.3)),
      complaintReduction: Math.round(complaintByCategory[5].count * 0.3),
      eligiblePopulation: dischargeEligible,
      assumptions: 'Process improvement only — not a claim about clinical outcomes.',
      owner: 'Care Transitions',
      effort: 'Medium',
      followUpMeasure: 'kpi_px_discharge_score',
      priority: true,
    },
    {
      id: 'px_opt_repeated_complaints',
      theme: 'repeated_complaints' as const,
      title: 'Reduce repeated complaint categories',
      observedIssue: 'A subset of categories and reopen events suggest repeatable service issues.',
      evidence: `Reopen rate ${r3(reopenRate)}; top category ${complaintByCategory[0].name} (${complaintByCategory[0].count}).`,
      operationalContext: 'Eligible preventable share only — not every complaint is preventable.',
      proposedAction: 'Root-cause the top two categories with department owners and follow-up audits.',
      modeledUpliftPoints: r2(Math.min(addressableGap * 0.18, 0.25)),
      complaintReduction: repeatedComplaintEligible,
      eligiblePopulation: repeatedComplaintEligible,
      assumptions: 'Illustrative prevention on repeatable process failures only.',
      owner: 'Quality & Patient Relations',
      effort: 'High',
      followUpMeasure: 'kpi_px_reopen_rate',
      priority: true,
    },
    {
      id: 'px_opt_low_touchpoints',
      theme: 'low_touchpoints' as const,
      title: 'Lift lowest-scoring journey touchpoints',
      observedIssue: 'A few journey stages concentrate negative linked ratings.',
      evidence: `Negative touchpoint share ${r3(negativeTouchpointShare)}; linkage coverage ${r3(journeyLinkageCoverage)}.`,
      operationalContext: 'Unlinked survey responses remain in aggregate totals without fabricated joins.',
      proposedAction: 'Target the three weakest eligible touchpoints with local service standards.',
      modeledUpliftPoints: r2(Math.min(addressableGap * 0.25, 0.32)),
      complaintReduction: Math.round(complaintsTotal * 0.08),
      eligiblePopulation: lowTouchpointEligible,
      assumptions: 'Constrained by linked journey coverage and staffing feasibility.',
      owner: 'Experience Improvement Office',
      effort: 'Medium',
      followUpMeasure: 'kpi_px_negative_touchpoint_share',
      priority: false,
    },
  ];

  const improvementOpportunities = opportunities.length;
  const modeledUplift = r2(sum(opportunities.map((item) => item.modeledUpliftPoints)) * 0.55);
  const complaintReduction = sum(opportunities.map((item) => item.complaintReduction));
  const priorityOpportunities = opportunities.filter((item) => item.priority);
  const priorityWithOwner = priorityOpportunities.filter((item) => Boolean(item.owner)).length;
  const priorityCoverage = priorityOpportunities.length > 0
    ? r3(priorityWithOwner / priorityOpportunities.length)
    : 0;

  const touchpointImprovement = [...touchpointRows]
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((item) => ({
      name: item.name,
      baselineScore: item.score,
      modeledScore: r2(Math.min(10, item.score + Math.min(0.6, addressableGap * 0.4))),
      negative: item.negative,
    }));

  const constraints = [
    { name: 'Survey coverage / sample size', detail: `${coverageGap} departments below minimum sample ${PX_MIN_DEPT_SAMPLE}.` },
    { name: 'Journey linkage gaps', detail: `${unlinkedJourney} completions retained without fabricated operational joins.` },
    { name: 'Complaint investigation capacity', detail: `${overdueComplaints} overdue open cases constrain recovery speed.` },
    { name: 'Cross-domain operational limits', detail: 'Wait and discharge actions depend on Access / IPD capacity — supporting context only.' },
  ];

  const prioritySignals = [
    { name: 'Overall vs target', value: overallSatisfaction, threshold: PX_OVERALL_TARGET, severity: overallSatisfaction < PX_OVERALL_TARGET - 0.3 ? 'high' : overallSatisfaction < PX_OVERALL_TARGET ? 'medium' : 'low' },
    { name: 'Response coverage', value: responseRate, threshold: 0.35, severity: responseRate < 0.3 ? 'high' : responseRate < 0.35 ? 'medium' : 'low' },
    { name: 'Overdue complaints', value: overdueComplaints, threshold: 5, severity: overdueComplaints > 12 ? 'high' : overdueComplaints > 5 ? 'medium' : 'low' },
    { name: 'Negative feedback share', value: negativeFeedbackShare, threshold: 0.28, severity: negativeFeedbackShare > 0.35 ? 'high' : negativeFeedbackShare > 0.28 ? 'medium' : 'low' },
    { name: 'Emerging themes', value: emergingThemes, threshold: 2, severity: emergingThemes >= 4 ? 'high' : emergingThemes >= 2 ? 'medium' : 'low' },
  ];

  const surveyTrend = months.map((row, index) => ({
    label: row.label,
    invitations: sliceMonthly(monthlyInvites)[index] ?? 0,
    completed: sliceMonthly(monthlyCompleted)[index] ?? 0,
    responseRate: sliceMonthly(monthlyResponseRate)[index] ?? 0,
    overall: sliceMonthly(monthlyOverallMean)[index] ?? 0,
  }));

  const complaintTrend = months.map((row, index) => ({
    label: row.label,
    newComplaints: sliceMonthly(monthlyComplaintsNew)[index] ?? 0,
    closed: sliceMonthly(monthlyComplaintsClosed)[index] ?? 0,
  }));

  const instrument = {
    id: PX_INSTRUMENT_ID,
    version: PX_INSTRUMENT_VERSION,
    label: 'DataVital Internal Patient Experience Survey v1',
    officialBenchmarking: 'unavailable' as const,
    scale: { min: 0, max: 10 },
    questions: [
      { id: 'Q_OVERALL', dimension: 'Overall rating', scale: '0-10' },
      { id: 'Q_WAITING', dimension: 'Waiting', scale: '0-10' },
      { id: 'Q_COMMUNICATION', dimension: 'Communication', scale: '0-10' },
      { id: 'Q_COORDINATION', dimension: 'Coordination', scale: '0-10' },
      { id: 'Q_DISCHARGE', dimension: 'Discharge', scale: '0-10' },
      { id: 'Q_RECOMMEND', dimension: 'Recommendation', scale: '0-10', note: 'Patient Recommendation Score = %promoters(9-10) − %detractors(0-6). Not an official NPS product.' },
    ],
    eligiblePopulation: 'Discharged or completed encounters invited under the internal protocol',
    administrationMode: 'SMS / portal / bedside tablet (illustrative)',
  };

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    days,
    labels: months.map((row) => row.label),

    instrument,

    // Command KPIs (kpi_px_*)
    overallSatisfaction,
    responseRate,
    positiveShare,
    negativeShare,
    recommendationScore,
    recommendationLabel: 'Patient Recommendation Score',
    unresolvedIssues,

    eligibleInvitations,
    completionsRaw,
    duplicateCompletions,
    eligibleCompleted,
    overallCount,
    topBox,
    bottomBox,
    recommendPromoters,
    recommendDetractors,
    recommendCount,
    promoterShare: r3(promoterShare),
    detractorShare: r3(detractorShare),

    // Journey KPIs
    journeySatisfaction,
    waitingScore,
    communicationScore,
    coordinationScore,
    dischargeScore,
    negativeTouchpointShare,
    journeyLinkageCoverage,
    linkedJourneyResponses: linkedJourney,
    unlinkedJourneyResponses: unlinkedJourney,
    touchpointRatings,
    touchpointNegative,

    // Complaints KPIs
    complaintsTotal,
    complaintsOpen,
    medianResolutionDays: r1(medianResolutionDays),
    p90ResolutionDays: r1(p90ResolutionDays),
    overdueComplaints,
    firstContactResolution,
    reopenRate,
    complaintsNew,
    complaintsReopened,
    complaintsClosed,
    complaintsWithdrawn,
    complaintOpeningOpen: openingOpen,
    complaintClosingOpen: closingOpen,
    complaintLedgerIdentity,
    complaintLedgerBalanced,
    resolutionTargetDays: PX_RESOLUTION_TARGET_DAYS,
    ackTargetHours: PX_ACK_TARGET_HOURS,

    complaintLedger: {
      openingOpen,
      newComplaints: complaintsNew,
      reopened: complaintsReopened,
      closed: complaintsClosed,
      withdrawn: complaintsWithdrawn,
      closingOpen,
    },
    complaintByCategory,
    complaintAging,
    resolutionBands,
    complaintStatus,
    complaintTrend,

    // Voice KPIs
    commentsAnalyzed,
    negativeFeedbackShare,
    emergingThemes,
    highPriorityFeedback,
    themeReviewCoverage,
    highPriorityUnreviewed,
    themeCounts,
    emergingThemeRows,
    topPositiveTopics,
    topNegativeTopics,
    sentimentTrend,
    languageMix,
    sampleComments,
    themeByDepartment,
    multilingualSupport: true,

    // Department KPIs
    deptsMeetingTarget,
    lowestDimension: lowestDimension.name,
    lowestDimensionScore: lowestDimension.score,
    coverageGap,
    materialVariance,
    deptsRequiringReview,
    departmentRows,
    serviceLineRows,
    deptSatDistribution,
    settingTrend,
    overallTarget: PX_OVERALL_TARGET,
    minDeptSample: PX_MIN_DEPT_SAMPLE,

    // Optimization KPIs
    addressableGap,
    improvementOpportunities,
    modeledUplift,
    complaintReduction,
    priorityCoverage,
    opportunities,
    touchpointImprovement,
    constraints,

    // Charts / breakdowns
    dimensionRows,
    settingRows,
    touchpointRows,
    experienceDistribution,
    surveyTrend,
    prioritySignals,
    monthlyInvites: sliceMonthly(monthlyInvites),
    monthlyCompleted: sliceMonthly(monthlyCompleted),
    monthlyOverallMean: sliceMonthly(monthlyOverallMean),
    monthlyResponseRate: sliceMonthly(monthlyResponseRate),

    operationalContext,

    methodology: {
      instrument: `${PX_INSTRUMENT_ID} is an INTERNAL DataVital demo instrument. It is not official HCAHPS/CAHPS and must not be compared as CMS-star or case-mix-adjusted public reporting.`,
      officialBenchmarking: 'unavailable' as const,
      grains: 'Invitations ≠ raw completions ≠ eligible completed responses ≠ question answers ≠ complaints ≠ free-text comments. Duplicate completions per invitation are excluded from eligibleCompleted.',
      responseRate: 'Survey Response Rate = eligibleCompleted ÷ eligibleInvitations (invitation-based).',
      scoring: 'Scores use numerator/denominator aggregation (sum of scores ÷ count of eligible answers). Do not average department or monthly percentages without weighting.',
      recommendation: 'Patient Recommendation Score = (% promoters 9–10 − % detractors 0–6) × 100 on Q_RECOMMEND (0–10). Label is Patient Recommendation Score — not an official NPS product.',
      complaints: 'Complaint ledger: openingOpen + new + reopened − closed − withdrawn = closingOpen. Closed status is not proof of patient satisfaction. Safety-flagged items require human review.',
      journey: 'Journey linkage coverage reports join success. Unlinked responses stay in aggregate analysis without fabricated operational joins. Operational waits/LOS are supporting context only.',
      voice: 'Comments are clearly labeled [SYNTHETIC] EN/AR templates. Sentiment, theme, confidence, reviewStatus, and safetyFlag are distinct fields. Multilingual normalization is supported; UI remains English.',
      optimization: 'Six illustrative opportunities (wait, communication, resolution time, discharge, repeated complaints, low touchpoints). Impacts are assumed and not guaranteed.',
    },
  };
}

export type PxView = ReturnType<typeof compute>;
