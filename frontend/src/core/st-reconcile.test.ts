import { describe, expect, it } from 'vitest';
import { alertsFor, screenDepartment, screenFromPath } from './alerts';
import {
  assertUniqueStCharts,
  assertUniqueStOwnership,
  ownersForStScreen,
  ST_CHART_OWNERS,
  ST_CROSS_DOMAIN_FORBIDDEN,
  ST_KPI_OWNERS,
  type StScreenId,
} from './strategyOwnership';
import {
  buildStView,
  clearStViewCache,
  stIdentityIssues,
  ST_OPPORTUNITY_IDS,
  ST_TARGETS,
} from './strategyView';
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

describe('Strategy KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (48 KPIs, 8 screens)', () => {
    expect(assertUniqueStOwnership()).toEqual([]);
    expect(ST_KPI_OWNERS).toHaveLength(48);
    expect(new Set(ST_KPI_OWNERS.map((item) => item.id)).size).toBe(48);
    const screens = new Set(ST_KPI_OWNERS.map((item) => item.screen));
    expect(screens.size).toBe(8);
    const expected: Record<StScreenId, number> = {
      command: 6,
      workforce: 6,
      equipment: 6,
      capacity: 6,
      'service-lines': 6,
      'cost-efficiency': 6,
      expansion: 6,
      optimization: 6,
    };
    for (const [screen, count] of Object.entries(expected)) {
      expect(ownersForStScreen(screen as StScreenId), screen).toHaveLength(count);
    }
  });

  it('registers unique chart titles and ids across screens', () => {
    expect(assertUniqueStCharts()).toEqual([]);
    expect(ST_CHART_OWNERS).toHaveLength(48);
    expect(new Set(ST_CHART_OWNERS.map((item) => item.id)).size).toBe(48);
    expect(new Set(ST_CHART_OWNERS.map((item) => `${item.screen}|${item.title}`)).size).toBe(48);
  });

  it('does not claim cross-domain headline KPI prefixes', () => {
    const ids = ST_KPI_OWNERS.map((item) => item.id);
    for (const forbidden of ST_CROSS_DOMAIN_FORBIDDEN) {
      expect(ids.some((id) => id.startsWith(forbidden))).toBe(false);
    }
  });

  it('registers every owner as a Strategy demo_assumption KPI', () => {
    const keys = KPIS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const owner of ST_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      expect(kpi?.domain, owner.id).toBe('Strategy');
      expect(kpi?.origin, owner.id).toBe('demo_assumption');
    }
  });
});

describe('Strategy ledger identities', () => {
  it('reconciles contribution, cost categories, and capacity discipline', () => {
    clearStViewCache();
    for (const hospital of ['H1', 'ALL']) {
      for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
        const view = buildStView(hospital, 2026, period);
        expect(stIdentityIssues(view), `${hospital} ${period}`).toEqual([]);
        expect(view.operatingContribution).toBe(view.netRevenue - view.eligibleDirectCost);
        expect(view.methodology.contribution).toMatch(/contribution/i);
        expect(view.methodology.contribution).toMatch(/not net profit|≠ net profit/i);
        expect(view.installedHours === undefined || view.availableOperatingHours <= view.installedHours).toBe(true);
      }
    }
  });

  it('discloses synthetic cost model categories and contribution formula', () => {
    const view = buildStView('H1', 2026, 'year');
    expect(view.costRows.length).toBeGreaterThanOrEqual(8);
    expect(view.methodology.cost).toMatch(/synthetic|Salaries|cost categor/i);
    expect(view.costRows.some((item) => /salar/i.test(item.name))).toBe(true);
  });

  it('references cross-domain RCM and Supply Chain inputs without claiming ownership', () => {
    const view = buildStView('H1', 2026, 'year');
    expect(view.crossDomain.rcmNetPatientRevenue).toBeGreaterThan(0);
    expect(view.crossDomain.scClinicalConsumption).toBeGreaterThan(0);
    expect(view.crossDomain.note).toMatch(/ownership/i);
  });

  it('sums hospital ALL from H1–H5 for flows and recomputes rates', () => {
    clearStViewCache();
    const all = buildStView('ALL', 2026, 'year');
    const parts = SITES.map((code) => buildStView(code, 2026, 'year'));
    expect(all.encounters).toBe(sum(parts.map((item) => item.encounters)));
    expect(all.productiveHours).toBe(sum(parts.map((item) => item.productiveHours)));
    expect(all.staffingUtilization).toBeCloseTo(all.productiveHours / Math.max(1, all.staffedAvailableHours), 5);
  });

  it('keeps year equal to the sum of quarters for flow hours and encounters', () => {
    clearStViewCache();
    const year = buildStView('H1', 2026, 'year');
    const quarters = QUARTERS.map((period) => buildStView('H1', 2026, period as ReportPeriod));
    expect(year.encounters).toBe(sum(quarters.map((item) => item.encounters)));
    expect(year.productiveHours).toBe(sum(quarters.map((item) => item.productiveHours)));
    expect(year.overtimeHours).toBe(sum(quarters.map((item) => item.overtimeHours)));
  });
});

describe('Strategy bindings and alerts', () => {
  it('binds every ST KPI through buildStView', () => {
    for (const owner of ST_KPI_OWNERS) {
      const kpi = findKpi(owner.id)!;
      const raw = bindKpi(kpi, NO_FACT, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
      expect(raw.value).not.toBeNaN();
      const item = measure(kpi, 'H1', 2026, 'All');
      expect(Number.isFinite(item.value), owner.id).toBe(true);
    }
  });

  it('routes /strategy paths to the Strategy department', () => {
    expect(screenFromPath('/strategy')).toBe('strategy');
    expect(screenFromPath('/strategy/workforce')).toBe('strategy-workforce');
    expect(screenFromPath('/strategy/optimization')).toBe('strategy-optimization');
    expect(screenDepartment('strategy')).toBe('Strategy');
    expect(screenDepartment('strategy-expansion')).toBe('Strategy');
  });

  it('emits Strategy alerts and scopes them by period', () => {
    const yearAlerts = alertsFor('H1', 2026, 'year').filter((alert) => alert.department === 'Strategy');
    expect(yearAlerts.length).toBeGreaterThanOrEqual(6);
    const q1 = alertsFor('H1', 2026, 'Q1').filter((alert) => alert.department === 'Strategy');
    expect(q1.every((alert) => alert.period.includes('Q1'))).toBe(true);
    expect(q1.every((alert) => alert.id.includes('|Q1|'))).toBe(true);
  });
});

describe('Strategy what-if and assist', () => {
  it('registers ten non-additive opportunities and prompts', () => {
    expect(ST_OPPORTUNITY_IDS).toHaveLength(10);
    expect(WHAT_IF_PROMPTS.Strategy.length).toBeGreaterThanOrEqual(10);
    const view = buildStView('H1', 2026, 'year');
    expect(view.opportunities).toHaveLength(10);
    expect(view.opportunities.every((item) => item.additive === false)).toBe(true);
    expect([...ST_OPPORTUNITY_IDS]).toEqual([
      'st-reallocate-nurses',
      'st-extend-or-hours',
      'st-add-clinic-sessions',
      'st-improve-diag-util',
      'st-replace-downtime-asset',
      'st-staff-constrained-sl',
      'st-reduce-overtime',
      'st-supply-efficiency',
      'st-expand-specialty',
      'st-reallocate-vs-capital',
    ]);
  });

  it('parses ST intents and returns illustrative what-if results', () => {
    const intent = parseWhatIfIntent('What if we reallocate nurses across eligible units by 20%?');
    expect(intent?.kind).toBe('st-reallocate-nurses');
    const result = runWhatIf('Strategy', 'H1', 2026, intent, 'year');
    expect(result.title).toMatch(/reallocate|nurse/i);
    expect(result.assumptions).toMatch(/not measured improvement|illustrative/i);
    expect(result.assumptions).toMatch(/not.*sum|overlap|additive/i);
  });

  it('answers Strategy questions with contribution and investment discipline', () => {
    const cm = answerQuestion('What is contribution margin?', 'H1', 2026, 'Strategy', 'en', 'year');
    expect(cm.observation).toMatch(/contribution/i);
    expect(`${cm.evidence} ${cm.observation} ${cm.explanation}`).toMatch(/net revenue|direct cost|not net profit|≠ net profit/i);
    expect(cm.approval).toMatch(/Management (approval|decision)/i);

    const deny = answerQuestion('Should I auto-approve this capital investment and claim the ROI is achieved?', 'H1', 2026, 'Strategy', 'en', 'year');
    expect(deny.title).toMatch(/capital|investment|autonomous/i);
    expect(deny.observation).toMatch(/not|alone|achieved/i);

    const outside = answerQuestion('Where are claim denials increasing?', 'H1', 2026, 'Strategy', 'en', 'year');
    expect(outside.title).toMatch(/Outside Strategy/i);
  });

  it('keeps operating targets documented', () => {
    expect(ST_TARGETS.resourceUtilization).toBeGreaterThan(0.5);
    expect(ST_TARGETS.contributionMarginRate).toBeGreaterThan(0.2);
    expect(ST_TARGETS.decisionReadiness).toBeGreaterThan(0.5);
  });
});
