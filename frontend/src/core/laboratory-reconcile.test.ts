import { describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { scenarioFor } from '@/showcase/facts';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';
import {
  LABORATORY_CROSS_DOMAIN_FORBIDDEN,
  LABORATORY_KPI_OWNERS,
  assertUniqueLaboratoryOwnership,
  ownersForLabScreen,
} from './laboratoryOwnership';
import { buildLaboratoryView } from './laboratoryView';

const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const;
const YEARS = [2024, 2025, 2026] as const;
const SITES = HOSPITALS.filter((item) => item.code !== 'ALL');

describe('Laboratory KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (24 KPIs)', () => {
    expect(assertUniqueLaboratoryOwnership()).toEqual([]);
    expect(LABORATORY_KPI_OWNERS.length).toBe(24);
    expect(ownersForLabScreen('command').length).toBe(5);
    expect(ownersForLabScreen('samples').length).toBe(5);
    expect(ownersForLabScreen('analyzers').length).toBe(5);
    expect(ownersForLabScreen('quality').length).toBe(6);
    expect(ownersForLabScreen('optimization').length).toBe(3);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const displays = LABORATORY_KPI_OWNERS.map((item) => item.display);
    for (const forbidden of LABORATORY_CROSS_DOMAIN_FORBIDDEN) {
      expect(displays.some((name) => name.toLowerCase() === forbidden.toLowerCase())).toBe(false);
    }
  });
});

describe('Laboratory grains and specimen rejection', () => {
  it('keeps orders, specimens, tests, and results as distinct grains', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of YEARS) {
        const view = buildLaboratoryView(hospital.code, year, 'year');
        expect(view.orders).not.toBe(view.samplesReceived);
        expect(view.testItems).not.toBe(view.orders);
        expect(view.completedTests).toBe(view.releasedResults);
        expect(view.completedTests + view.cancelledTests + view.pendingTests).toBeLessThanOrEqual(view.testItems + view.cancelledTests);
        expect(view.methodology.grains).toMatch(/Orders ≠ Specimens ≠ Tests ≠ Results/i);
      }
    }
  });

  it('partitions specimen rejection without negative residuals', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildLaboratoryView(hospital.code, year, period);
          expect(view.accepted + view.rejected).toBe(view.assessed);
          expect(view.rejectionReasons.reduce((sum, item) => sum + item.count, 0)).toBe(view.rejected);
          expect(view.sections.reduce((sum, item) => sum + item.rejected, 0)).toBe(view.rejected);
          expect(view.recollectionCauses.reduce((sum, item) => sum + item.count, 0)).toBe(view.recollections);
          expect(view.rejectionRate).toBeCloseTo(view.assessed ? view.rejected / view.assessed : 0, 3);
          expect(view.hemolysisRate).not.toBe(view.rejectionRate);
        }
      }
    }
  });
});

describe('Laboratory pending ledger identity', () => {
  it('rolls monthly opening/closing without negative residuals', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildLaboratoryView(hospital.code, year, period);
          const ledger = view.pendingLedger;
          expect(ledger.opening + ledger.added - ledger.completed - ledger.cancelled).toBe(ledger.closing);
          expect(ledger.rows[0].opening).toBe(ledger.opening);
          expect(ledger.rows[ledger.rows.length - 1].closing).toBe(ledger.closing);
          for (let index = 0; index < ledger.rows.length; index += 1) {
            const row = ledger.rows[index];
            expect(row.opening + row.added - row.completed - row.cancelled).toBe(row.closing);
            expect(row.closing).toBeGreaterThanOrEqual(0);
            if (index > 0) expect(row.opening).toBe(ledger.rows[index - 1].closing);
          }
        }
      }
    }
  });
});

describe('Laboratory analyzer staffed accounting', () => {
  it('reconciles staffed, QC, downtime, unused, overtime, and utilization', () => {
    for (const hospital of SITES.slice(0, 3)) {
      const view = buildLaboratoryView(hospital.code, 2026, 'year');
      expect(view.inSessionUsed + view.qcHoldHours + view.downtimeHours + view.unusedHours).toBe(view.staffedHours);
      expect(view.usedHours).toBe(view.inSessionUsed + view.overtimeHours);
      expect(view.analyzerUtilization).toBeCloseTo(view.staffedHours ? view.inSessionUsed / view.staffedHours : 0, 3);
      expect(view.analyzers.reduce((sum, item) => sum + item.staffedHours, 0)).toBe(view.staffedHours);
      expect(view.analyzers.reduce((sum, item) => sum + item.inSessionUsed, 0)).toBe(view.inSessionUsed);
      expect(view.analyzers.reduce((sum, item) => sum + item.downtimeHours, 0)).toBe(view.downtimeHours);
      expect(view.analyzers.reduce((sum, item) => sum + item.qcHoldHours, 0)).toBe(view.qcHoldHours);
      expect(view.analyzers.reduce((sum, item) => sum + item.overtimeHours, 0)).toBe(view.overtimeHours);
      expect(view.chemistryDowntimeHours).toBe(view.sections.find((item) => item.id === 'Chemistry')!.downtimeHours);
      expect(view.downtimeReasons.reduce((sum, item) => sum + item.hours, 0)).toBe(view.downtimeHours);
      for (const analyzer of view.analyzers) {
        expect(analyzer.inSessionUsed + analyzer.qcHoldHours + analyzer.downtimeHours + analyzer.unusedHours).toBe(analyzer.staffedHours);
        expect(analyzer.utilization).toBeCloseTo(analyzer.staffedHours ? analyzer.inSessionUsed / analyzer.staffedHours : 0, 5);
        expect(analyzer.unusedHours).toBeGreaterThanOrEqual(0);
        expect(analyzer.overtimeHours).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Laboratory critical notify vs delay', () => {
  it('keeps critical notify rate distinct from critical delay rate', () => {
    const view = buildLaboratoryView('H1', 2026, 'year');
    expect(view.criticalNotified + view.criticalPendingComm).toBe(view.criticalResults);
    expect(view.criticalNotifyRate).toBeCloseTo(view.criticalResults ? view.criticalNotified / view.criticalResults : 0, 3);
    expect(view.criticalDelayRate).toBeCloseTo(view.criticalResults ? view.criticalPendingComm / view.criticalResults : 0, 3);
    expect(view.criticalNotifyRate).not.toBeCloseTo(view.criticalDelayRate, 2);
    expect(view.methodology.critical).toMatch(/Distinct/i);
    expect(view.unsignedAging.reduce((sum, item) => sum + item.count, 0)).toBe(view.pendingValidation);
  });
});

describe('Laboratory section capacity sum', () => {
  it('sums section recoverable hours and additional tests without a shared hour pool', () => {
    const view = buildLaboratoryView('H1', 2026, 'year');
    expect(view.sectionCapacity.reduce((sum, item) => sum + item.additionalTests, 0)).toBe(view.additionalTests);
    expect(view.sectionCapacity.reduce((sum, item) => sum + item.recoverableHours, 0)).toBe(view.recoverableHours);
    expect(view.sectionCapacity.reduce((sum, item) => sum + item.eligibleBacklog, 0)).toBe(view.eligibleBacklog);
    expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableHours);
    for (const section of view.sectionCapacity) {
      expect(section.additionalTests).toBeLessThanOrEqual(section.eligibleBacklog);
      expect(section.additionalTests).toBeLessThanOrEqual(section.potentialAdditionalTests);
    }
    expect(view.sections.map((item) => item.additionalTests).reduce((a, b) => a + b, 0)).toBe(view.additionalTests);
    expect(view.additionalTests).toBeLessThanOrEqual(view.potentialAdditionalTests);
  });
});

describe('Laboratory alerts, Assist, and what-if', () => {
  it('aligns alert values with view and uses Chemistry downtime / critical delay', () => {
    const view = buildLaboratoryView('H1', 2026, 'year');
    const fact = scenarioFor('H1', 2026).focus;
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Laboratory');
    expect(alerts.length).toBeGreaterThanOrEqual(6);

    expect(alerts.some((alert) => alert.title === 'High specimen rejection')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'Growing testing backlog')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'High chemistry analyzer downtime')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'Critical result communication delay')).toBe(true);

    const utilBind = bindKpi({ key: 'kpi_lab_analyzer_utilization' } as never, fact, 'H1', 2026);
    expect(utilBind.value).toBeCloseTo(view.analyzerUtilization, 3);

    const backlogBind = bindKpi({ key: 'kpi_lab_testing_backlog' } as never, fact, 'H1', 2026);
    expect(backlogBind.value).toBe(view.testingBacklog);

    const chemBind = bindKpi({ key: 'kpi_lab_analyzer_downtime' } as never, fact, 'H1', 2026);
    expect(chemBind.value).toBe(view.chemistryDowntimeHours);
    expect(chemBind.value).not.toBe(view.downtimeHours);

    const delayBind = bindKpi({ key: 'kpi_lab_critical_delay_rate' } as never, fact, 'H1', 2026);
    expect(delayBind.value).toBeCloseTo(view.criticalDelayRate, 3);
    expect(delayBind.value).not.toBeCloseTo(view.criticalNotifyRate, 2);

    const tatBind = bindKpi({ key: 'kpi_lab_median_tat' } as never, fact, 'H1', 2026);
    expect(tatBind.value).toBe(view.medianLabTatHours);

    const rejectBind = bindKpi({ key: 'kpi_lab_rejection_rate' } as never, fact, 'H1', 2026);
    expect(rejectBind.value).toBeCloseTo(view.rejectionRate, 3);
  });

  it('answers Laboratory management questions from the shared view', () => {
    const reject = answerQuestion('What is driving specimen rejection and hemolysis?', 'H1', 2026, 'Laboratory', 'en', 'year');
    expect(reject.observation).toMatch(/rejection|hemolysis|transport|recollect/i);
    const util = answerQuestion('Which analyzers have low utilization?', 'H1', 2026, 'Laboratory', 'en', 'year');
    expect(util.observation).toMatch(/Utilization|unused|downtime|analyzer|backlog/i);
    const tat = answerQuestion('Which laboratory sections have the longest TAT?', 'H1', 2026, 'Laboratory', 'en', 'year');
    expect(tat.observation).toMatch(/TAT|validation|critical|section/i);
    const capacity = answerQuestion('How many additional tests are operationally feasible?', 'H1', 2026, 'Laboratory', 'en', 'year');
    expect(capacity.observation).toMatch(/Additional|Recoverable|feasible|backlog/i);
  });

  it('runs all six Laboratory what-if scenarios with section constraints', () => {
    const kinds = [
      'lab-reject-down',
      'lab-transport-down',
      'lab-downtime-down',
      'lab-stat-tat-down',
      'lab-staffed-up',
      'lab-validation-down',
    ] as const;
    const results = kinds.map((kind) => runWhatIf('Laboratory', 'H1', 2026, { kind, amount: 0.1 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not achieved|Not a validated/i);
      expect(result.estimated.length).toBeGreaterThan(10);
      expect(result.estimated).not.toMatch(/NaN/);
      expect(result.followUp.length).toBeGreaterThan(5);
    }
    expect(results[2].current).toMatch(/Chemistry downtime/i);
    expect(results[2].current).not.toMatch(/^Analyzer Downtime \d/);
    expect(new Set(results.map((item) => item.title)).size).toBe(6);
  });

  it('parses all six Laboratory What-if prompts to distinct intents', async () => {
    const { parseWhatIfIntent, WHAT_IF_PROMPTS } = await import('@/showcase/whatIf');
    const kinds = WHAT_IF_PROMPTS.Laboratory.map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every(Boolean)).toBe(true);
    expect(new Set(kinds).size).toBe(6);
  });
});

describe('Laboratory filter matrix and catalog', () => {
  it('builds finite reconciled views for sampled hospital × year × period', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of YEARS) {
        for (const period of PERIODS) {
          const view = buildLaboratoryView(hospital.code, year, period);
          const numbers = [
            view.orders, view.completedTests, view.cancelledTests, view.pendingTests,
            view.samplesReceived, view.rejected, view.rejectionRate, view.hemolysisRate,
            view.analyzerUtilization, view.staffedHours, view.inSessionUsed, view.downtimeHours,
            view.unusedHours, view.overtimeHours, view.qcHoldHours, view.testingBacklog,
            view.medianLabTatHours, view.pendingValidation, view.criticalNotifyRate, view.criticalDelayRate,
            view.recoverableHours, view.additionalTests, view.eligibleBacklog,
          ];
          for (const value of numbers) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).not.toBe(Number.POSITIVE_INFINITY);
          }
          expect(view.accepted + view.rejected).toBe(view.assessed);
          expect(view.inSessionUsed + view.qcHoldHours + view.downtimeHours + view.unusedHours).toBe(view.staffedHours);
          expect(view.criticalNotified + view.criticalPendingComm).toBe(view.criticalResults);
          expect(view.additionalTests).toBeLessThanOrEqual(view.eligibleBacklog);
          expect(view.testingBacklog).toBeGreaterThanOrEqual(0);
          expect(view.unusedHours).toBeGreaterThanOrEqual(0);
          expect(view.overtimeHours).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('keeps the indicator catalog free of headline numeric duplication', async () => {
    const { laboratoryIndicatorsFor } = await import('./laboratoryScope');
    const view = buildLaboratoryView('H1', 2026, 'year');
    const catalog = laboratoryIndicatorsFor(view);
    expect(catalog.length).toBeGreaterThan(10);
    for (const item of catalog.filter((row) => row.status !== 'unavailable')) {
      expect(item.summary).not.toMatch(/^[0-9][0-9,]*(?:\.\d+)?%?$/);
      expect(item.summary).toMatch(/·/);
      expect(item.formula.length).toBeGreaterThan(3);
      expect(item.unit.length).toBeGreaterThan(1);
      expect(item.name).not.toMatch(/Bed Occupancy|OR Utilization|Scanner Utilization/i);
    }
    expect(assertUniqueLaboratoryOwnership()).toEqual([]);
  });
});
