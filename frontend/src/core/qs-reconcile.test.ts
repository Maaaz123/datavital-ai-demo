import { describe, expect, it } from 'vitest';
import { alertsFor, screenDepartment, screenFromPath } from './alerts';
import {
  assertUniqueQsCharts,
  assertUniqueQsOwnership,
  ownersForQsScreen,
  QS_CHART_OWNERS,
  QS_CROSS_DOMAIN_FORBIDDEN,
  QS_KPI_OWNERS,
  type QsScreenId,
} from './qualitySafetyOwnership';
import {
  buildQsView,
  clearQsViewCache,
  qsIdentityIssues,
  QS_OPPORTUNITY_IDS,
  QS_TARGETS,
} from './qualitySafetyView';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { findKpi, KPIS } from '@/showcase/engine';
import { measure } from '@/showcase/measures';
import { parseWhatIfIntent, runWhatIf, WHAT_IF_PROMPTS } from '@/showcase/whatIf';
import type { ReportPeriod } from './period';

const NO_FACT = { admissions: 0 } as never;
const SITES = ['H1', 'H2', 'H3', 'H4', 'H5'] as const;
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function sum(values: number[]): number {
  expect(values.every((value) => Number.isFinite(value))).toBe(true);
  return values.reduce((total, value) => total + value, 0);
}

describe('Quality & Safety KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (41 KPIs, 7 screens)', () => {
    expect(assertUniqueQsOwnership()).toEqual([]);
    expect(QS_KPI_OWNERS).toHaveLength(41);
    expect(new Set(QS_KPI_OWNERS.map((item) => item.id)).size).toBe(41);
    const screens = new Set(QS_KPI_OWNERS.map((item) => item.screen));
    expect(screens.size).toBe(7);
    const expected: Record<QsScreenId, number> = {
      command: 6, incidents: 6, infections: 6, prevention: 6, outcomes: 6, actions: 6, optimization: 5,
    };
    for (const [screen, count] of Object.entries(expected)) {
      expect(ownersForQsScreen(screen as QsScreenId), screen).toHaveLength(count);
    }
  });

  it('registers unique chart titles and ids across screens', () => {
    expect(assertUniqueQsCharts()).toEqual([]);
    expect(QS_CHART_OWNERS).toHaveLength(42);
    expect(new Set(QS_CHART_OWNERS.map((item) => item.id)).size).toBe(42);
    expect(new Set(QS_CHART_OWNERS.map((item) => `${item.screen}|${item.title}`)).size).toBe(42);
  });

  it('does not claim cross-domain headline KPI prefixes', () => {
    const ids = QS_KPI_OWNERS.map((item) => item.id);
    for (const forbidden of QS_CROSS_DOMAIN_FORBIDDEN) {
      expect(ids.some((id) => id.startsWith(forbidden))).toBe(false);
    }
  });

  it('registers every owner as a Quality & Safety demo_assumption KPI', () => {
    const keys = KPIS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const owner of QS_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      expect(kpi?.domain, owner.id).toBe('Quality & Safety');
      expect(kpi?.origin, owner.id).toBe('demo_assumption');
    }
  });
});

describe('Quality & Safety ledger identities', () => {
  it('reconciles severity, categories, departments, and HAI splits', () => {
    clearQsViewCache();
    for (const hospital of ['H1', 'ALL']) {
      for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
        const view = buildQsView(hospital, 2026, period);
        expect(qsIdentityIssues(view), `${hospital} ${period}`).toEqual([]);
        expect(sum(view.severityRows.map((item) => item.count))).toBe(view.validated);
        expect(sum(view.categoryRows.map((item) => item.count))).toBe(view.validated);
        expect(sum(view.deptIncidentRows.map((item) => item.count))).toBe(view.validated);
        expect(sum(view.deptHaiRows.map((item) => item.count))).toBe(view.haiCases);
        expect(sum(view.procedureRows.map((item) => item.ssi))).toBe(view.ssi);
        expect(sum(view.procedureRows.map((item) => item.procedures))).toBe(view.procedures);
        expect(view.nearMiss + Math.max(0, view.validated - view.nearMiss)).toBe(view.validated);
        expect(view.withHarm).toBeLessThanOrEqual(view.validated);
        expect(view.severeHarm).toBeLessThanOrEqual(view.withHarm);
        expect(view.hhCompliant).toBeLessThanOrEqual(view.hhEligible);
        expect(view.centralLineDays).toBeGreaterThan(0);
        expect(view.catheterDays).toBeGreaterThan(0);
        expect(view.procedures).toBeGreaterThan(0);
        expect(view.sirAvailable).toBe(false);
        expect(view.identities.sirNotFabricated).toBe(true);
      }
    }
  });

  it('uses device-day and procedure denominators for HAI rates', () => {
    const view = buildQsView('H1', 2026, 'year');
    expect(view.clabsiRate).toBeCloseTo((view.clabsi / view.centralLineDays) * 1000, 2);
    expect(view.cautiRate).toBeCloseTo((view.cauti / view.catheterDays) * 1000, 2);
    expect(view.ssiRate).toBeCloseTo(view.ssi / view.procedures, 5);
    expect(view.haiCases).toBe(view.clabsi + view.cauti + view.ssi + view.cdi);
    expect(view.haiBurdenRate).toBeCloseTo((view.haiCases / view.patientDays) * 1000, 2);
  });

  it('sums hospital ALL from H1–H5 and recomputes rates', () => {
    const all = buildQsView('ALL', 2026, 'year');
    const parts = SITES.map((code) => buildQsView(code, 2026, 'year'));
    expect(all.validated).toBe(sum(parts.map((item) => item.validated)));
    expect(all.clabsi).toBe(sum(parts.map((item) => item.clabsi)));
    expect(all.centralLineDays).toBe(sum(parts.map((item) => item.centralLineDays)));
    expect(all.clabsiRate).toBeCloseTo((all.clabsi / all.centralLineDays) * 1000, 2);
    expect(all.handHygiene).toBeCloseTo(all.hhCompliant / all.hhEligible, 5);
  });

  it('keeps year equal to the sum of quarters for flow counts', () => {
    const year = buildQsView('H1', 2026, 'year');
    const quarters = QUARTERS.map((period) => buildQsView('H1', 2026, period as ReportPeriod));
    expect(year.validated).toBe(sum(quarters.map((item) => item.validated)));
    expect(year.clabsi).toBe(sum(quarters.map((item) => item.clabsi)));
    expect(year.reported).toBe(sum(quarters.map((item) => item.reported)));
  });
});

describe('Quality & Safety bindings and alerts', () => {
  it('binds every QS KPI through buildQsView', () => {
    for (const owner of QS_KPI_OWNERS) {
      const kpi = findKpi(owner.id)!;
      const raw = bindKpi(kpi, NO_FACT, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
      expect(raw.value).not.toBeNaN();
      const item = measure(kpi, 'H1', 2026, 'All');
      expect(Number.isFinite(item.value), owner.id).toBe(true);
    }
  });

  it('routes /quality paths to the Quality & Safety department', () => {
    expect(screenFromPath('/quality')).toBe('quality');
    expect(screenFromPath('/quality/infections')).toBe('quality-infections');
    expect(screenFromPath('/quality/actions')).toBe('quality-actions');
    expect(screenDepartment('quality')).toBe('Quality & Safety');
    expect(screenDepartment('quality-actions')).toBe('Quality & Safety');
  });

  it('emits Quality & Safety alerts and scopes them by period', () => {
    const yearAlerts = alertsFor('H1', 2026, 'year').filter((alert) => alert.department === 'Quality & Safety');
    expect(yearAlerts.length).toBeGreaterThanOrEqual(8);
    const q1 = alertsFor('H1', 2026, 'Q1').filter((alert) => alert.department === 'Quality & Safety');
    expect(q1.every((alert) => alert.period.includes('Q1'))).toBe(true);
    expect(q1.every((alert) => alert.id.includes('|Q1|'))).toBe(true);
  });
});

describe('Quality & Safety what-if and assist', () => {
  it('registers eight non-additive opportunities and prompts', () => {
    expect(QS_OPPORTUNITY_IDS).toHaveLength(8);
    expect(WHAT_IF_PROMPTS['Quality & Safety'].length).toBeGreaterThanOrEqual(8);
    const view = buildQsView('H1', 2026, 'year');
    expect(view.opportunities).toHaveLength(8);
    expect(view.opportunities.every((item) => item.additive === false)).toBe(true);
  });

  it('parses QS intents and returns illustrative what-if results', () => {
    const intent = parseWhatIfIntent('What if observed hand-hygiene compliance improves by 8 points?');
    expect(intent?.kind).toBe('qs-hh-up');
    const result = runWhatIf('Quality & Safety', 'H1', 2026, intent, 'year');
    expect(result.title).toMatch(/hand-hygiene/i);
    expect(result.assumptions).toMatch(/not measured improvement/i);
    expect(result.assumptions).toMatch(/SIR/i);
  });

  it('answers Quality & Safety questions with denominator discipline', () => {
    const hai = answerQuestion('Where is CLABSI elevated?', 'H1', 2026, 'Quality & Safety', 'en', 'year');
    expect(hai.observation).toMatch(/CLABSI/i);
    expect(hai.evidence).toMatch(/device-day|NHSN|SIR/i);
    expect(hai.approval).toMatch(/Management (approval|decision)/i);

    const deny = answerQuestion('Should I diagnose the patient and order isolation?', 'H1', 2026, 'Quality & Safety', 'en', 'year');
    expect(deny.title).toMatch(/autonomous|clinical/i);
    expect(deny.observation).toMatch(/not a diagnostic system/i);

    const outside = answerQuestion('Where are claim denials increasing?', 'H1', 2026, 'Quality & Safety', 'en', 'year');
    expect(outside.title).toMatch(/Outside Quality & Safety/i);
  });

  it('keeps operating targets documented', () => {
    expect(QS_TARGETS.validatedEventRate).toBe(12);
    expect(QS_TARGETS.clabsiRate).toBe(1.2);
    expect(QS_TARGETS.handHygiene).toBe(0.85);
    expect(QS_TARGETS.readmissionRate).toBe(0.09);
  });
});
