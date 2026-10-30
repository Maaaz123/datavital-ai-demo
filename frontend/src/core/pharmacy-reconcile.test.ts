import { describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { scenarioFor } from '@/showcase/facts';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';
import {
  PHARMACY_CROSS_DOMAIN_FORBIDDEN,
  PHARMACY_KPI_OWNERS,
  assertUniquePharmacyOwnership,
  ownersForPharmScreen,
} from './pharmacyOwnership';
import { buildPharmacyView } from './pharmacyView';

const PERIODS = ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const;
const YEARS = [2024, 2025, 2026] as const;
const SITES = HOSPITALS.filter((item) => item.code !== 'ALL');

describe('Pharmacy KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (31 KPIs, six screens)', () => {
    expect(assertUniquePharmacyOwnership()).toEqual([]);
    expect(PHARMACY_KPI_OWNERS.length).toBe(31);
    expect(PHARMACY_KPI_OWNERS.every((item) => item.id.startsWith('kpi_rx_'))).toBe(true);
    expect(ownersForPharmScreen('command').length).toBe(6);
    expect(ownersForPharmScreen('dispensing').length).toBe(6);
    expect(ownersForPharmScreen('inventory').length).toBe(5);
    expect(ownersForPharmScreen('safety').length).toBe(5);
    expect(ownersForPharmScreen('cost').length).toBe(5);
    expect(ownersForPharmScreen('optimization').length).toBe(4);
  });

  it('detects duplicate ownership', () => {
    const dup = [...PHARMACY_KPI_OWNERS, { ...PHARMACY_KPI_OWNERS[0], screen: 'cost' as const }];
    expect(assertUniquePharmacyOwnership(dup).length).toBe(1);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const displays = PHARMACY_KPI_OWNERS.map((item) => item.display);
    for (const forbidden of PHARMACY_CROSS_DOMAIN_FORBIDDEN) {
      expect(displays.some((name) => name.toLowerCase() === forbidden.toLowerCase())).toBe(false);
    }
  });
});

describe('Pharmacy grains and order identity', () => {
  it('keeps orders, lines, dispenses, and administrations as distinct grains', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of YEARS) {
        const view = buildPharmacyView(hospital.code, year, 'year');
        const fact = scenarioFor(hospital.code, year).focus;
        expect(view.orders).toBe(fact.pharmOrders);
        expect(view.dispensedOrders).toBe(fact.pharmDispensed);
        expect(view.administeredOrders).toBe(fact.pharmAdmin);
        expect(view.orderLines).not.toBe(view.orders);
        expect(view.dispenseTransactions).not.toBe(view.dispensedLines);
        expect(view.administrationEvents).not.toBe(view.administeredOrders);
        expect(view.administeredOrders).toBeLessThanOrEqual(view.dispensedOrders);
        expect(view.dispensedOrders).toBeLessThanOrEqual(view.orders);
        expect(view.methodology.grains).toMatch(/Orders ≠ Lines ≠ Dispenses ≠ Administrations/);
      }
    }
  });

  it('partitions orders into dispensed, cancelled, and pending and reconciles verification', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildPharmacyView(hospital.code, year, period);
          expect(view.dispensedOrders + view.cancelledOrders + view.pendingOrders).toBe(view.orders);
          expect(view.cancelledOrders).toBeGreaterThanOrEqual(0);
          expect(view.pendingOrders).toBeGreaterThanOrEqual(0);
          expect(view.verifiedOrders + view.verificationBacklog + view.cancelledBeforeVerification).toBe(view.orders);
          expect(view.verificationBacklog).toBeLessThanOrEqual(view.pendingOrders);
          expect(view.verifiedOrders).toBeGreaterThanOrEqual(view.dispensedOrders);
          expect(view.urgentOrders + view.routineOrders).toBe(view.orders);
          expect(view.careSettings.reduce((sum, item) => sum + item.orders, 0)).toBe(view.orders);
          expect(view.verificationAging.reduce((sum, item) => sum + item.count, 0)).toBe(view.verificationBacklog);
        }
      }
    }
  });
});

describe('Pharmacy order-line ledger and pending roll-forward', () => {
  it('rolls opening + new − dispensed − cancelled = closing with no negatives', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildPharmacyView(hospital.code, year, period);
          const ledger = view.lineLedger;
          expect(ledger.opening + ledger.added - ledger.dispensed - ledger.cancelled).toBe(ledger.closing);
          expect(ledger.added).toBe(view.orderLines);
          expect(ledger.dispensed).toBe(view.dispensedLines);
          expect(ledger.cancelled).toBe(view.cancelledLines);
          expect(ledger.closing).toBe(view.pendingLines);
          expect(ledger.rows[0].opening).toBe(ledger.opening);
          expect(ledger.rows[ledger.rows.length - 1].closing).toBe(ledger.closing);
          for (let index = 0; index < ledger.rows.length; index += 1) {
            const row = ledger.rows[index];
            expect(row.opening + row.added - row.dispensed - row.cancelled).toBe(row.closing);
            expect(row.closing).toBeGreaterThanOrEqual(0);
            expect(row.dispensed).toBeGreaterThanOrEqual(0);
            if (index > 0) expect(row.opening).toBe(ledger.rows[index - 1].closing);
          }
          expect(view.dispensingCompletion).toBeLessThanOrEqual(1);
          expect(view.dispensingCompletion).toBeCloseTo(view.dispensedLines / (ledger.opening + ledger.added), 3);
        }
      }
    }
  });
});

describe('Pharmacy dispensing turnaround and line quality', () => {
  it('keeps median ≤ P90 and splits dispensed lines into exclusive groups', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const period of PERIODS) {
        const view = buildPharmacyView(hospital.code, 2026, period);
        expect(view.medianTatMin).toBeGreaterThan(0);
        expect(view.p90TatMin).toBeGreaterThanOrEqual(view.medianTatMin);
        expect(view.dispensesOverTarget).toBeLessThanOrEqual(view.dispensedOrders);
        expect(view.tatByPriority[0].median).toBeLessThan(view.tatByPriority[1].median);
        expect(view.firstPassLines + view.clarifiedLines + view.reworkLines).toBe(view.dispensedLines);
        expect(view.reworkReasons.reduce((sum, item) => sum + item.count, 0)).toBe(view.reworkLines);
        expect(view.clarificationReasons.reduce((sum, item) => sum + item.count, 0)).toBe(view.clarifiedLines);
        expect(view.firstPass + view.reworkRate).toBeLessThan(1);
        expect(view.firstPass).not.toBeCloseTo(1 - view.reworkRate, 2);
        expect(view.workflows.reduce((sum, item) => sum + item.linesDispensed, 0)).toBe(view.dispensedLines);
        expect(view.workflows.reduce((sum, item) => sum + item.linesOrdered, 0)).toBe(view.orderLines);
        expect(view.workflows.reduce((sum, item) => sum + item.pendingLines, 0)).toBe(view.pendingLines);
      }
    }
  });
});

describe('Pharmacy inventory batch ledger', () => {
  it('holds opening + receipts − issues − expired − discards = closing with next-open = prior-close and no negatives', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const year of [2025, 2026] as const) {
        for (const period of PERIODS) {
          const view = buildPharmacyView(hospital.code, year, period);
          const ledger = view.quantityLedger;
          expect(ledger.opening + ledger.receipts - ledger.issued - ledger.expired - ledger.discarded).toBe(ledger.closing);
          expect(ledger.rows[ledger.rows.length - 1].closing).toBe(ledger.closing);
          for (let index = 0; index < ledger.rows.length; index += 1) {
            const row = ledger.rows[index];
            expect(row.opening + row.receipts - row.issued - row.expired - row.discarded).toBe(row.closing);
            for (const value of [row.opening, row.receipts, row.issued, row.expired, row.discarded, row.closing]) {
              expect(value).toBeGreaterThanOrEqual(0);
            }
            if (index > 0) expect(row.opening).toBe(ledger.rows[index - 1].closing);
          }
          expect(view.classBatches.reduce((sum, item) => sum + item.buckets.reduce((a, b) => a + b, 0), 0)).toBe(ledger.closing);
          expect(view.batchTotals.reduce((a, b) => a + b, 0)).toBe(ledger.closing);
        }
      }
    }
  });

  it('keeps stockout and low-stock SKUs mutually exclusive and values consistent', () => {
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        const view = buildPharmacyView(hospital.code, year, 'year');
        expect(view.stockoutSkus + view.lowStockSkus + view.adequateSkus).toBe(view.totalSkus);
        for (const group of view.classSku) {
          expect(group.stockout + group.low + group.adequate).toBe(group.skus);
          expect(group.adequate).toBeGreaterThanOrEqual(0);
        }
        expect(view.classRows.reduce((sum, item) => sum + item.closingValue, 0)).toBe(view.inventoryValue);
        expect(view.classRows.reduce((sum, item) => sum + item.nearExpiryValue, 0)).toBe(view.nearExpiryValue);
        expect(view.nearExpiryValue).toBeLessThan(view.inventoryValue);
        expect(view.daysOfSupply).toBeCloseTo(view.inventoryValue / (view.medicationSpend / view.days), 1);
        expect(view.daysOfSupply).toBeGreaterThan(0);
      }
    }
  });
});

describe('Pharmacy safety denominators', () => {
  it('uses a separate denominator for each safety rate', () => {
    for (const hospital of SITES.slice(0, 3)) {
      const view = buildPharmacyView(hospital.code, 2026, 'year');
      expect(view.verificationExceptionRate).toBeCloseTo(view.exceptionOrders / view.verifiedOrders, 3);
      expect(view.highAlertCompliance).toBeCloseTo(view.highAlertCompliant / view.highAlertLines, 3);
      expect(view.barcodeRate).toBeCloseTo(view.scannedAdministrations / view.administrationEvents, 3);
      expect(view.highAlertLines).toBeLessThan(view.dispensedLines);
      expect(view.highAlertCompliant + view.highAlertGap).toBe(view.highAlertLines);
      expect(view.highAlertByClass.reduce((sum, item) => sum + item.lines, 0)).toBe(view.highAlertLines);
      expect(view.barcodeSettings.reduce((sum, item) => sum + item.events, 0)).toBe(view.administrationEvents);
      expect(view.barcodeSettings.reduce((sum, item) => sum + item.scanned, 0)).toBe(view.scannedAdministrations);
      expect(view.exceptionReasons.reduce((sum, item) => sum + item.count, 0)).toBe(view.exceptionOrders);
      expect(view.incidentTypes.reduce((sum, item) => sum + item.count, 0)).toBe(view.incidentReports);
      expect(view.incidentReach.reduce((sum, item) => sum + item.count, 0)).toBe(view.incidentReports);
      expect(view.reviewsClosed + view.unresolvedReviews).toBe(view.incidentReports);
      expect(view.reviewAging.reduce((sum, item) => sum + item.count, 0)).toBe(view.unresolvedReviews);
      expect(view.monthlyIncidents.reduce((sum, item) => sum + item, 0)).toBe(view.incidentReports);
      expect(view.administrationEvents).toBeGreaterThan(view.administeredOrders);
      expect(view.methodology.safety).toMatch(/not clinical advice/i);
    }
  });
});

describe('Pharmacy cost without double counting (SAR)', () => {
  it('keeps spend, write-offs, avoidable waste, and savings drivers exclusive', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const period of PERIODS) {
        const view = buildPharmacyView(hospital.code, 2026, period);
        expect(view.classRows.reduce((sum, item) => sum + item.spend, 0)).toBe(view.medicationSpend);
        expect(view.monthlySpend.reduce((sum, item) => sum + item, 0)).toBe(view.medicationSpend);
        expect(view.monthlyExpiredValue.reduce((sum, item) => sum + item, 0)).toBe(view.expiredValue);
        expect(view.expiredValue + view.discardValue).toBe(view.totalWaste);
        expect(view.medicationSpend + view.totalWaste).toBe(view.totalOutflowCost);
        expect(view.avoidableExpired + view.avoidableDiscard).toBe(view.avoidableWaste);
        expect(view.avoidableWaste).toBeLessThanOrEqual(view.totalWaste);
        expect(view.avoidableExpired).toBeLessThanOrEqual(view.expiredValue);
        expect(view.savingsDrivers.reduce((sum, item) => sum + item.value, 0)).toBe(view.potentialSavings);
        // Waste-based savings drivers cannot exceed avoidable waste; total savings stays below spend + waste.
        expect(view.savingsDrivers[0].value + view.savingsDrivers[1].value).toBeLessThanOrEqual(view.avoidableWaste);
        expect(view.potentialSavings).toBeLessThan(view.totalOutflowCost);
        expect(view.costPerLine).toBe(Math.round(view.medicationSpend / view.dispensedLines));
        expect(view.expiredValue).toBeGreaterThan(0);
        expect(view.wasteComponents.reduce((sum, item) => sum + item.value, 0)).toBe(view.totalWaste);
      }
    }
  });
});

describe('Pharmacy workflow capacity', () => {
  it('sums workflow recoverable hours and additional lines without a shared pool', () => {
    for (const hospital of SITES.slice(0, 3)) {
      for (const period of PERIODS) {
        const view = buildPharmacyView(hospital.code, 2026, period);
        for (const workflow of view.workflows) {
          expect(workflow.productiveHours + workflow.reworkHours + workflow.clarificationHours + workflow.handoffHours + workflow.unusedHours).toBe(workflow.staffedHours);
          expect(workflow.unusedHours).toBeGreaterThanOrEqual(0);
          expect(workflow.drivers.reduce((sum, item) => sum + item.hours, 0)).toBe(workflow.recoverableHours);
          expect(workflow.additionalLines).toBeLessThanOrEqual(workflow.eligiblePending);
          expect(workflow.additionalLines).toBeLessThanOrEqual(workflow.potentialLines);
        }
        expect(view.workflows.reduce((sum, item) => sum + item.recoverableHours, 0)).toBe(view.recoverableHours);
        expect(view.workflows.reduce((sum, item) => sum + item.additionalLines, 0)).toBe(view.additionalLines);
        expect(view.workflows.reduce((sum, item) => sum + item.eligiblePending, 0)).toBe(view.eligiblePending);
        expect(view.delayDriverHours.reduce((sum, item) => sum + item.hours, 0)).toBe(view.recoverableHours);
        expect(view.additionalLines).toBeLessThanOrEqual(view.eligiblePending);
        expect(view.additionalLines).toBeLessThanOrEqual(view.potentialAdditionalLines);
        expect(view.eligiblePending).toBeLessThanOrEqual(view.pendingLines);
        expect(view.feasibleTatCutMin).toBeLessThanOrEqual(view.medianTatMin * 0.3 + 0.05);
        expect(view.feasibleTatCutMin).toBeGreaterThanOrEqual(0);
        expect(view.staffedHours).toBe(view.productiveHours + view.reworkHours + view.clarificationHours + view.handoffHours + view.unusedHours);
      }
    }
  });
});

describe('Pharmacy alerts and KPI binding', () => {
  it('builds eight Pharmacy alerts on /pharmacy aligned with the shared view', () => {
    const view = buildPharmacyView('H1', 2026, 'year');
    const fact = scenarioFor('H1', 2026).focus;
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Pharmacy');
    expect(alerts.length).toBe(8);
    expect(alerts.every((alert) => alert.kpi.startsWith('kpi_rx_') && alert.screen === 'pharmacy')).toBe(true);
    for (const title of [
      'Medication stockout SKUs',
      'Slow dispensing turnaround',
      'Verification backlog',
      'Near-expiry stock exposure',
      'Low barcode scan coverage',
      'High-alert check compliance gap',
      'Avoidable medication waste',
      'Unresolved incident reviews',
    ]) {
      expect(alerts.some((alert) => alert.title === title)).toBe(true);
    }
    expect(alerts.map((alert) => `${alert.title} ${alert.evidence}`).join(' ')).not.toMatch(/admission/i);

    const stock = bindKpi({ key: 'kpi_rx_stockout_skus' } as never, fact, 'H1', 2026);
    expect(stock.value).toBe(view.stockoutSkus);
    const tat = bindKpi({ key: 'kpi_rx_median_tat' } as never, fact, 'H1', 2026);
    expect(tat.value).toBe(view.medianTatMin);
    const backlog = bindKpi({ key: 'kpi_rx_verification_backlog' } as never, fact, 'H1', 2026);
    expect(backlog.value).toBe(view.verificationBacklog);
    const barcode = bindKpi({ key: 'kpi_rx_barcode_rate' } as never, fact, 'H1', 2026);
    expect(barcode.value).toBeCloseTo(view.barcodeRate, 3);
    const waste = bindKpi({ key: 'kpi_rx_avoidable_waste' } as never, fact, 'H1', 2026);
    expect(waste.value).toBe(view.avoidableWaste);
    expect(waste.kind).toBe('currency');
    expect(waste.unit).toBe('SAR');
  });

  it('binds every kpi_rx_* owner to a finite view value and keeps legacy KPIs intact', () => {
    for (const hospital of ['H1', 'H3', 'ALL']) {
      const fact = scenarioFor(hospital, 2026).focus;
      for (const owner of PHARMACY_KPI_OWNERS) {
        const item = bindKpi({ key: owner.id } as never, fact, hospital, 2026);
        expect(Number.isFinite(item.value)).toBe(true);
        expect(item.note).not.toMatch(/UNMAPPED/);
      }
    }
    const fact = scenarioFor('H1', 2026).focus;
    expect(bindKpi({ key: 'kpi_med_order_volume' } as never, fact, 'H1', 2026).value).toBe(fact.pharmOrders);
    expect(bindKpi({ key: 'kpi_med_dispense_volume' } as never, fact, 'H1', 2026).value).toBe(fact.pharmDispensed);
    expect(bindKpi({ key: 'kpi_lab_tat_median_minutes' } as never, fact, 'H1', 2026).value).toBe(fact.labTatMedianMin);
    expect(bindKpi({ key: 'kpi_rx_med_orders' } as never, fact, 'H1', 2026).value).toBe(fact.pharmOrders);
  });
});

describe('Pharmacy Assist and what-if', () => {
  it('answers Pharmacy management questions from the shared view', () => {
    const dispensing = answerQuestion('Which dispensing pathways have the longest TAT?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(dispensing.observation).toMatch(/dispensing TAT|verification backlog/i);
    const stock = answerQuestion('Which therapeutic groups have the lowest days of supply?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(stock.observation).toMatch(/stockout|days of supply|near-expiry/i);
    const safety = answerQuestion('Which care settings have the lowest barcode scan rate?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(safety.observation).toMatch(/Barcode|high-alert|incident/i);
    const cost = answerQuestion('How much waste is potentially avoidable?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(cost.observation).toMatch(/avoidable waste|SAR/i);
    const capacity = answerQuestion('How many additional lines are operationally feasible?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(capacity.observation).toMatch(/Recoverable|additional|feasible/i);
    const overview = answerQuestion('Give me a pharmacy overview', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(overview.title).toMatch(/Pharmacy at/);
    expect(overview.evidence).toMatch(/Orders ≠ Lines/);
  });

  it('refuses clinical dosing advice and other-domain headlines', () => {
    const dosing = answerQuestion('What dose of heparin should I give?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(dosing.title).toMatch(/Outside operational Pharmacy support/);
    expect(dosing.observation).toMatch(/does not give clinical dosing/i);
    const other = answerQuestion('What is the bed occupancy?', 'H1', 2026, 'Pharmacy', 'en', 'year');
    expect(other.title).toMatch(/Outside Pharmacy focus/);
  });

  it('runs all six Pharmacy what-if scenarios with constraint language', () => {
    const kinds = [
      'rx-tat-down',
      'rx-stockout-down',
      'rx-expiry-down',
      'rx-barcode-up',
      'rx-staffed-up',
      'rx-waste-down',
    ] as const;
    const results = kinds.map((kind) => runWhatIf('Pharmacy', 'H1', 2026, { kind, amount: kind === 'rx-barcode-up' ? 0.05 : 0.2 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative|illustrative|not achieved/i);
      expect(result.estimated.length).toBeGreaterThan(10);
      expect(result.estimated).not.toMatch(/NaN|undefined/);
      expect(result.current).not.toMatch(/NaN|undefined/);
      expect(result.followUp.length).toBeGreaterThan(5);
      expect(`${result.estimated} ${result.implications}`).not.toMatch(/\bdose\b|dosing/i);
    }
    expect(new Set(results.map((item) => item.title)).size).toBe(6);
    expect(results[0].estimated).toMatch(/feasible cut/i);
    expect(results[1].estimated).toMatch(/mutually exclusive/i);
    expect(results[5].estimated).toMatch(/never added on top/i);
  });

  it('parses all six Pharmacy What-if prompts to distinct rx intents and routes them through Assist', async () => {
    const { parseWhatIfIntent, WHAT_IF_PROMPTS } = await import('@/showcase/whatIf');
    const kinds = WHAT_IF_PROMPTS.Pharmacy.map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every((kind) => kind?.startsWith('rx-'))).toBe(true);
    expect(new Set(kinds).size).toBe(6);
    expect(kinds).toEqual(['rx-tat-down', 'rx-stockout-down', 'rx-expiry-down', 'rx-barcode-up', 'rx-staffed-up', 'rx-waste-down']);
    for (const prompt of WHAT_IF_PROMPTS.Pharmacy) {
      const answer = answerQuestion(prompt, 'H1', 2026, 'Pharmacy', 'en', 'year');
      expect(answer.outcome).toMatch(/Illustrative scenario only/);
    }
    // Other domains' prompts do not leak into Pharmacy intents.
    for (const domain of ['Emergency', 'Beds', 'Inpatient', 'Outpatient', 'Appointments', 'Surgery', 'Radiology', 'Laboratory'] as const) {
      for (const prompt of WHAT_IF_PROMPTS[domain]) {
        expect(parseWhatIfIntent(prompt)?.kind.startsWith('rx-') ?? false).toBe(false);
      }
    }
  });
});

describe('Pharmacy filter matrix and catalog', () => {
  it('builds finite reconciled views for every hospital × year × period', () => {
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        for (const period of PERIODS) {
          const view = buildPharmacyView(hospital.code, year, period);
          const numbers = [
            view.orders, view.orderLines, view.dispensedLines, view.pendingOrders, view.pendingLines,
            view.medianTatMin, view.p90TatMin, view.dispensesOverTarget, view.firstPass, view.reworkRate,
            view.inventoryValue, view.stockoutSkus, view.lowStockSkus, view.daysOfSupply, view.nearExpiryValue,
            view.verificationExceptionRate, view.highAlertCompliance, view.barcodeRate, view.incidentReports, view.unresolvedReviews,
            view.medicationSpend, view.costPerLine, view.expiredValue, view.avoidableWaste, view.potentialSavings,
            view.recoverableHours, view.additionalLines, view.eligiblePending, view.feasibleTatCutMin,
          ];
          for (const value of numbers) expect(Number.isFinite(value)).toBe(true);
          expect(view.labels.length).toBe(period === 'year' ? 12 : 3);
          expect(view.dispensedOrders + view.cancelledOrders + view.pendingOrders).toBe(view.orders);
          expect(view.lineLedger.closing).toBe(view.pendingLines);
          expect(view.stockoutSkus + view.lowStockSkus + view.adequateSkus).toBe(view.totalSkus);
          expect(view.medicationSpend + view.totalWaste).toBe(view.totalOutflowCost);
          expect(view.additionalLines).toBeLessThanOrEqual(view.eligiblePending);
        }
      }
    }
  });

  it('changes with hospital and period filters', () => {
    const a = buildPharmacyView('H1', 2026, 'year');
    const b = buildPharmacyView('H3', 2026, 'year');
    const q1 = buildPharmacyView('H1', 2026, 'Q1');
    expect(a.orders).not.toBe(b.orders);
    expect(q1.orders).toBeLessThan(a.orders);
    expect(q1.periodLabel).toBe('Q1 2026');
    expect(a.periodLabel).toBe('Full year 2026');
  });

  it('keeps the indicator catalog free of headline numeric duplication', async () => {
    const { pharmacyIndicatorsFor, PHARMACY_AI_CASES } = await import('./pharmacyScope');
    const view = buildPharmacyView('H1', 2026, 'year');
    const catalog = pharmacyIndicatorsFor(view);
    expect(catalog.length).toBeGreaterThan(25);
    for (const item of catalog.filter((row) => row.status !== 'unavailable')) {
      expect(item.summary).not.toMatch(/^[0-9][0-9,]*(?:\.\d+)?%?$/);
      expect(item.summary).toMatch(/·/);
      expect(item.formula.length).toBeGreaterThan(3);
      expect(item.unit.length).toBeGreaterThan(1);
      expect(item.name).not.toMatch(/Bed Occupancy|OR Utilization|Analyzer Utilization|Scanner Utilization/i);
    }
    expect(catalog.filter((row) => row.status === 'unavailable').length).toBe(3);
    expect(PHARMACY_AI_CASES.length).toBe(6);
    expect(assertUniquePharmacyOwnership()).toEqual([]);
  });
});
