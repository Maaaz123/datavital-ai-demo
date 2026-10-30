import { describe, expect, it } from 'vitest';
import { alertsFor } from './alerts';
import {
  assertUniquePxCharts,
  assertUniquePxOwnership,
  PX_CHART_OWNERS,
  PX_CROSS_DOMAIN_FORBIDDEN,
  PX_KPI_OWNERS,
  ownersForPxScreen,
} from './patientExperienceOwnership';
import {
  buildPxView,
  clearPxViewCache,
  PX_COMMENT_TEMPLATES_AR,
  PX_COMMENT_TEMPLATES_EN,
  PX_DEPARTMENTS,
  PX_INSTRUMENT_ID,
  PX_MIN_DEPT_SAMPLE,
  THEMES,
} from './patientExperienceView';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { findKpi } from '@/showcase/engine';
import { parseWhatIfIntent, runWhatIf, WHAT_IF_PROMPTS } from '@/showcase/whatIf';
import type { ReportPeriod } from './period';

describe('Patient Experience KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (33 KPIs, six screens)', () => {
    expect(assertUniquePxOwnership()).toEqual([]);
    expect(PX_KPI_OWNERS).toHaveLength(33);
    expect(ownersForPxScreen('command')).toHaveLength(6);
    expect(ownersForPxScreen('journey')).toHaveLength(6);
    expect(ownersForPxScreen('complaints')).toHaveLength(6);
    expect(ownersForPxScreen('voice')).toHaveLength(5);
    expect(ownersForPxScreen('departments')).toHaveLength(5);
    expect(ownersForPxScreen('optimization')).toHaveLength(5);
  });

  it('registers unique chart titles across screens', () => {
    expect(assertUniquePxCharts()).toEqual([]);
    expect(PX_CHART_OWNERS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(PX_CHART_OWNERS.map((item) => item.id)).size).toBe(PX_CHART_OWNERS.length);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const names = PX_KPI_OWNERS.map((item) => item.fullName);
    for (const forbidden of PX_CROSS_DOMAIN_FORBIDDEN) {
      expect(names).not.toContain(forbidden);
    }
  });
});

describe('Patient Experience survey invitation ledger', () => {
  it('reconciles invitations, raw completions, duplicates, and response rate', () => {
    clearPxViewCache();
    const view = buildPxView('H1', 2026, 'year');
    expect(view.eligibleInvitations).toBeGreaterThan(0);
    expect(view.completionsRaw).toBeGreaterThanOrEqual(view.eligibleCompleted);
    expect(view.eligibleCompleted).toBe(view.completionsRaw - view.duplicateCompletions);
    expect(view.duplicateCompletions).toBeGreaterThanOrEqual(0);
    expect(view.responseRate).toBeCloseTo(view.eligibleCompleted / view.eligibleInvitations, 3);
    expect(view.overallCount).toBe(view.eligibleCompleted);
    expect(view.overallCount).toBeGreaterThan(0);
    expect(view.overallSatisfaction).toBeGreaterThanOrEqual(0);
    expect(view.overallSatisfaction).toBeLessThanOrEqual(10);
    expect(view.methodology.responseRate).toMatch(/eligibleCompleted/i);
  });

  it('keeps scores on the 0–10 instrument scale and recommendation = promoters% − detractors%', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.instrument.scale.min).toBe(0);
    expect(view.instrument.scale.max).toBe(10);
    expect(view.instrument.id).toBe(PX_INSTRUMENT_ID);
    for (const row of view.experienceDistribution) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(10);
    }
    expect(sum(view.experienceDistribution.map((item) => item.count))).toBe(view.overallCount);
    expect(view.recommendCount).toBe(view.eligibleCompleted);
    expect(view.recommendPromoters + view.recommendDetractors).toBeLessThanOrEqual(view.recommendCount);
    const expected = (
      (view.recommendPromoters / view.recommendCount) - (view.recommendDetractors / view.recommendCount)
    ) * 100;
    expect(view.recommendationScore).toBeCloseTo(expected, 1);
    expect(view.recommendationLabel).toMatch(/Patient Recommendation Score/i);
    expect(view.methodology.recommendation).toMatch(/not an official NPS/i);
  });

  it('uses weighted aggregation (numerator/denominator) when overallCount > 0', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.overallCount).toBeGreaterThan(0);
    expect(view.methodology.scoring).toMatch(/numerator\/denominator/i);
    expect(view.positiveShare).toBeCloseTo(view.topBox / view.overallCount, 3);
    expect(view.negativeShare).toBeCloseTo(view.bottomBox / view.overallCount, 3);
    expect(view.waitingScore).toBeGreaterThanOrEqual(0);
    expect(view.waitingScore).toBeLessThanOrEqual(10);
    expect(view.communicationScore).toBeGreaterThanOrEqual(0);
    expect(view.communicationScore).toBeLessThanOrEqual(10);
  });

  it('covers every department and qualifies sample against the minimum', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.departmentRows).toHaveLength(PX_DEPARTMENTS.length);
    expect(sum(view.departmentRows.map((item) => item.invitations))).toBe(view.eligibleInvitations);
    expect(sum(view.departmentRows.map((item) => item.responses))).toBe(view.eligibleCompleted);
    for (const row of view.departmentRows) {
      expect(row.adequateSample).toBe(row.responses >= PX_MIN_DEPT_SAMPLE);
      expect(row.belowCoverage).toBe(row.responses < PX_MIN_DEPT_SAMPLE);
      if (row.meetsTarget) {
        expect(row.adequateSample).toBe(true);
        expect(row.score).toBeGreaterThanOrEqual(view.overallTarget);
      }
    }
    expect(view.deptsMeetingTarget).toBe(view.departmentRows.filter((item) => item.meetsTarget).length);
    expect(view.coverageGap).toBe(view.departmentRows.filter((item) => item.belowCoverage).length);
  });
});

describe('Patient Experience complaint ledger', () => {
  it('keeps opening + new + reopened − closed − withdrawn === closingOpen', () => {
    const view = buildPxView('H1', 2026, 'year');
    const ledger = view.complaintLedger;
    expect(ledger.openingOpen + ledger.newComplaints + ledger.reopened - ledger.closed - ledger.withdrawn)
      .toBe(ledger.closingOpen);
    expect(view.complaintLedgerIdentity).toBe(view.complaintClosingOpen);
    expect(view.complaintLedgerBalanced).toBe(true);
    expect(view.complaintsOpen).toBe(view.complaintClosingOpen);
    expect(view.complaintsTotal).toBe(view.complaintsNew);
  });

  it('reports reopen rate and finite median resolution from timestamps', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(Number.isFinite(view.medianResolutionDays)).toBe(true);
    expect(view.medianResolutionDays).toBeGreaterThan(0);
    expect(Number.isFinite(view.p90ResolutionDays)).toBe(true);
    expect(view.reopenRate).toBeGreaterThanOrEqual(0);
    expect(view.reopenRate).toBeLessThanOrEqual(1);
    expect(view.firstContactResolution).toBeGreaterThanOrEqual(0);
    expect(view.firstContactResolution).toBeLessThanOrEqual(1);
    expect(sum(view.resolutionBands.map((item) => item.count))).toBeGreaterThan(0);
  });

  it('ages open stock and tracks overdue backlog', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(sum(view.complaintAging.map((item) => item.count))).toBe(view.complaintsOpen);
    expect(view.overdueComplaints).toBeGreaterThanOrEqual(0);
    expect(view.overdueComplaints).toBeLessThanOrEqual(view.complaintsOpen + view.complaintsClosed);
    expect(view.resolutionTargetDays).toBeGreaterThan(0);
  });
});

describe('Patient Experience voice and journey', () => {
  it('classifies multilingual EN/AR comments with themes and sentiment confidence', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.commentsAnalyzed).toBeGreaterThan(0);
    expect(view.languageMix.find((item) => item.name === 'English')?.count ?? 0).toBeGreaterThan(0);
    expect(view.languageMix.find((item) => item.name === 'Arabic')?.count ?? 0).toBeGreaterThan(0);
    expect(sum(view.languageMix.map((item) => item.count))).toBe(view.commentsAnalyzed);
    expect(sum(view.themeCounts.map((item) => item.count))).toBe(view.commentsAnalyzed);
    expect(view.themeCounts).toHaveLength(THEMES.length);
    expect(view.negativeFeedbackShare).toBeGreaterThanOrEqual(0);
    expect(view.negativeFeedbackShare).toBeLessThanOrEqual(1);
    expect(view.themeReviewCoverage).toBeGreaterThanOrEqual(0);
    expect(view.themeReviewCoverage).toBeLessThanOrEqual(1);
    expect(view.highPriorityFeedback).toBeGreaterThanOrEqual(0);
    for (const comment of view.sampleComments) {
      expect(comment.confidence).toBeGreaterThanOrEqual(0.5);
      expect(comment.confidence).toBeLessThanOrEqual(1);
      expect(['en', 'ar']).toContain(comment.language);
      expect(comment.text).toMatch(/\[SYNTHETIC\]/);
      if (comment.language === 'en') expect(PX_COMMENT_TEMPLATES_EN).toContain(comment.text);
      if (comment.language === 'ar') expect(PX_COMMENT_TEMPLATES_AR).toContain(comment.text);
      expect(THEMES).toContain(comment.theme);
      expect(['positive', 'neutral', 'negative']).toContain(comment.sentiment);
      expect(['auto', 'human_reviewed', 'pending_review']).toContain(comment.reviewStatus);
    }
    expect(view.methodology.voice).toMatch(/confidence/i);
    expect(view.multilingualSupport).toBe(true);
  });

  it('keeps journey linkage coverage in [0,1] and retains unlinked responses', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.journeyLinkageCoverage).toBeGreaterThanOrEqual(0);
    expect(view.journeyLinkageCoverage).toBeLessThanOrEqual(1);
    expect(view.linkedJourneyResponses + view.unlinkedJourneyResponses).toBe(view.eligibleCompleted);
    expect(view.unlinkedJourneyResponses).toBeGreaterThan(0);
    expect(view.journeyLinkageCoverage).toBeCloseTo(
      view.linkedJourneyResponses / (view.linkedJourneyResponses + view.unlinkedJourneyResponses),
      3,
    );
    expect(view.methodology.journey).toMatch(/Unlinked/i);
    expect(view.negativeTouchpointShare).toBeGreaterThanOrEqual(0);
    expect(view.negativeTouchpointShare).toBeLessThanOrEqual(1);
  });
});

describe('Patient Experience alerts and binding', () => {
  it('builds PX alerts aligned with kpi_px_* owners', () => {
    const view = buildPxView('H1', 2026, 'year');
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Patient Experience');
    expect(alerts.length).toBeGreaterThanOrEqual(4);
    expect(alerts.every((alert) => alert.kpi.startsWith('kpi_px_') && alert.screen === 'patient-experience')).toBe(true);
    const overall = bindKpi(findKpi('kpi_px_overall_satisfaction') as never, { admissions: 0 } as never, 'H1', 2026);
    expect(overall.value).toBe(view.overallSatisfaction);
    const response = bindKpi(findKpi('kpi_px_response_rate') as never, { admissions: 0 } as never, 'H1', 2026);
    expect(response.value).toBeCloseTo(view.eligibleCompleted / view.eligibleInvitations, 5);
    expect(view.responseRate).toBeCloseTo(view.eligibleCompleted / view.eligibleInvitations, 3);
  });

  it('binds every kpi_px_* owner to a finite view value', () => {
    for (const owner of PX_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      const raw = bindKpi(kpi as never, { admissions: 0 } as never, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
    }
  });
});

describe('Patient Experience Assist and what-if', () => {
  it('answers Patient Experience management questions from the shared view', () => {
    const answer = answerQuestion(
      'Where is overall patient satisfaction weakest?',
      'H1',
      2026,
      'Patient Experience',
      'en',
      'year',
    );
    expect(answer.observation).toMatch(/satisfaction|overall|response|complaint|dimension/i);
    expect(answer.outcome).toMatch(/Illustrative|illustrative|Approval|approval|HCAHPS|internal/i);
  });

  it('documents HCAHPS unavailability and refuses clinical treatment advice', () => {
    const view = buildPxView('H1', 2026, 'year');
    expect(view.methodology.officialBenchmarking).toBe('unavailable');
    expect(view.instrument.officialBenchmarking).toBe('unavailable');
    expect(view.methodology.instrument).toMatch(/not official HCAHPS/i);
    const clinical = answerQuestion(
      'What treatment should we prescribe for low satisfaction?',
      'H1',
      2026,
      'Patient Experience',
      'en',
      'year',
    );
    expect(clinical.observation).toMatch(/does not give clinical|clinical treatment/i);
  });

  it('runs all six Patient Experience what-if scenarios with distinct px-* intents', () => {
    const kinds = [
      'px-wait-down',
      'px-communication-up',
      'px-resolution-down',
      'px-discharge-up',
      'px-repeated-down',
      'px-touchpoint-up',
    ] as const;
    const results = kinds.map((kind) => runWhatIf('Patient Experience', 'H1', 2026, { kind, amount: 0.2 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not guaranteed|not achieved|not a clinical/i);
      expect(result.estimated).not.toMatch(/NaN|undefined/);
      expect(`${result.estimated} ${result.implications}`).not.toMatch(/prescribe|prognosis|ventilator setting/i);
    }
    expect(new Set(results.map((item) => item.title)).size).toBe(6);
    expect(new Set(results.map((item) => item.id)).size).toBe(6);
  });

  it('parses all six Patient Experience What-if prompts to distinct px intents', () => {
    const kinds = WHAT_IF_PROMPTS['Patient Experience'].map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every((kind) => kind?.startsWith('px-'))).toBe(true);
    expect(new Set(kinds).size).toBe(6);
    for (const prompt of WHAT_IF_PROMPTS['Patient Experience']) {
      const answer = answerQuestion(prompt, 'H1', 2026, 'Patient Experience', 'en', 'year');
      expect(answer.outcome).toMatch(/Illustrative|illustrative|Approval|approval/i);
    }
  });
});

describe('Patient Experience filter matrix', () => {
  it('builds finite reconciled views for H1 and ALL across year and quarters', () => {
    clearPxViewCache();
    const hospitals = ['H1', 'ALL'] as const;
    const periods: ReportPeriod[] = ['year', 'Q1', 'Q2', 'Q3', 'Q4'];
    for (const hospital of hospitals) {
      for (const period of periods) {
        const view = buildPxView(hospital, 2026, period);
        expect(Number.isFinite(view.overallSatisfaction)).toBe(true);
        expect(Number.isFinite(view.responseRate)).toBe(true);
        expect(view.complaintLedgerBalanced).toBe(true);
        expect(view.completionsRaw).toBeGreaterThanOrEqual(view.eligibleCompleted);
        expect(view.journeyLinkageCoverage).toBeGreaterThanOrEqual(0);
        expect(view.journeyLinkageCoverage).toBeLessThanOrEqual(1);
      }
    }
  });

  it('aggregates quarters from the same invitation / complaint ledger as the full year', () => {
    clearPxViewCache();
    const yearView = buildPxView('H1', 2026, 'year');
    const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildPxView('H1', 2026, period));
    expect(sum(quarters.map((item) => item.eligibleInvitations))).toBe(yearView.eligibleInvitations);
    expect(sum(quarters.map((item) => item.eligibleCompleted))).toBe(yearView.eligibleCompleted);
    expect(sum(quarters.map((item) => item.completionsRaw))).toBe(yearView.completionsRaw);
    expect(sum(quarters.map((item) => item.complaintsNew))).toBe(yearView.complaintsNew);
    expect(sum(quarters.map((item) => item.complaintsClosed))).toBe(yearView.complaintsClosed);
    expect(sum(quarters.map((item) => item.commentsAnalyzed))).toBe(yearView.commentsAnalyzed);
    expect(sum(quarters.map((item) => item.days))).toBe(yearView.days);
  });
});

function sum(values: number[]): number {
  expect(values.every((value) => Number.isFinite(value))).toBe(true);
  return values.reduce((total, value) => total + value, 0);
}
