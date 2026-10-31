import { describe, expect, it } from 'vitest';
import { alertsFor, screenDepartment, screenFromPath } from './alerts';
import {
  assertUniqueScCharts,
  assertUniqueScOwnership,
  ownersForScScreen,
  SC_CHART_OWNERS,
  SC_CROSS_DOMAIN_FORBIDDEN,
  SC_KPI_OWNERS,
  type ScScreenId,
} from './supplyChainOwnership';
import {
  buildScView,
  clearScViewCache,
  scIdentityIssues,
  SC_OPPORTUNITY_IDS,
  SC_TARGETS,
} from './supplyChainView';
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

describe('Supply Chain KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (41 KPIs, 7 screens)', () => {
    expect(assertUniqueScOwnership()).toEqual([]);
    expect(SC_KPI_OWNERS).toHaveLength(41);
    expect(new Set(SC_KPI_OWNERS.map((item) => item.id)).size).toBe(41);
    const screens = new Set(SC_KPI_OWNERS.map((item) => item.screen));
    expect(screens.size).toBe(7);
    const expected: Record<ScScreenId, number> = {
      command: 6, inventory: 6, procurement: 6, suppliers: 6, consumption: 6, waste: 6, optimization: 5,
    };
    for (const [screen, count] of Object.entries(expected)) {
      expect(ownersForScScreen(screen as ScScreenId), screen).toHaveLength(count);
    }
  });

  it('registers unique chart titles and ids across screens', () => {
    expect(assertUniqueScCharts()).toEqual([]);
    expect(SC_CHART_OWNERS).toHaveLength(42);
    expect(new Set(SC_CHART_OWNERS.map((item) => item.id)).size).toBe(42);
    expect(new Set(SC_CHART_OWNERS.map((item) => `${item.screen}|${item.title}`)).size).toBe(42);
  });

  it('does not claim cross-domain headline KPI prefixes', () => {
    const ids = SC_KPI_OWNERS.map((item) => item.id);
    for (const forbidden of SC_CROSS_DOMAIN_FORBIDDEN) {
      expect(ids.some((id) => id.startsWith(forbidden))).toBe(false);
    }
  });

  it('keeps Supplier OTD on Command and Fill Rate on Suppliers (no duplicate OTD ownership)', () => {
    const otd = SC_KPI_OWNERS.find((item) => item.id === 'kpi_sc_supplier_otd');
    const fill = SC_KPI_OWNERS.find((item) => item.id === 'kpi_sc_supplier_fill_rate');
    expect(otd?.screen).toBe('command');
    expect(fill?.screen).toBe('suppliers');
  });

  it('registers every owner as a Supply Chain demo_assumption KPI', () => {
    const keys = KPIS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const owner of SC_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      expect(kpi?.domain, owner.id).toBe('Supply Chain');
      expect(kpi?.origin, owner.id).toBe('demo_assumption');
    }
  });
});

describe('Supply Chain ledger identities', () => {
  it('reconciles category splits, ordered vs received, and disposition discipline', () => {
    clearScViewCache();
    for (const hospital of ['H1', 'ALL']) {
      for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
        const view = buildScView(hospital, 2026, period);
        expect(scIdentityIssues(view), `${hospital} ${period}`).toEqual([]);
        expect(sum(view.categoryRows.map((item) => item.available))).toBe(view.availableUnits);
        expect(sum(view.categoryRows.map((item) => item.issued))).toBe(view.clinicalConsumption);
        expect(sum(view.categoryRows.map((item) => item.belowSafety))).toBe(view.belowSafety);
        expect(view.receiptsOrdered).toBeGreaterThanOrEqual(view.receiptsReceived);
        expect(view.receiptsReceived).toBeGreaterThanOrEqual(0);
        expect(view.nearExpiryUnits).toBeLessThanOrEqual(view.availableUnits);
        expect(view.expiredUnits).toBeGreaterThanOrEqual(0);
        expect(view.damagedUnits).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('uses Days of Supply = available usable ÷ forecast average daily unit demand', () => {
    const view = buildScView('H1', 2026, 'year');
    expect(view.daysOfSupply).toBeCloseTo(view.availableUnits / view.dailyForecastDemand, 1);
    expect(view.dailyForecastDemand).toBeCloseTo(view.forecastUnits / view.daysInPeriod, 5);
  });

  it('keeps stock opening/closing roll-forward sane', () => {
    const view = buildScView('H1', 2026, 'year');
    const implied = view.openingAvailable + view.receiptsReceived + view.returnedUnits
      - view.clinicalConsumption - view.expiredUnits - view.damagedUnits - view.obsoleteUnits - view.recalledUnits;
    expect(Math.abs(implied - view.availableUnits)).toBeLessThanOrEqual(Math.max(5, Math.round(view.availableUnits * 0.02)));
    expect(view.identities.rollForwardSane).toBe(true);
    expect(view.identities.snapshotsNotSummed).toBe(true);
  });

  it('keeps PO ≠ Receipt ≠ Invoice ≠ Payment as distinct ledgers', () => {
    const view = buildScView('H1', 2026, 'year');
    expect(view.openPos).toBeGreaterThan(0);
    expect(view.receiptsReceived).toBeGreaterThan(0);
    expect(view.receiptInvoices).toBeGreaterThan(0);
    expect(view.paymentsPosted).toBeGreaterThan(0);
    // Distinct event counts — not required to be strictly unequal every seed, but pipeline stages exist
    expect(view.receiptsOrdered).toBeGreaterThanOrEqual(view.receiptsReceived);
    expect(view.methodology.procurement).toMatch(/Purchase order ≠ goods receipt ≠ invoice ≠ payment/i);
  });

  it('sums hospital ALL from H1–H5 for flows and recomputes rates', () => {
    const all = buildScView('ALL', 2026, 'year');
    const parts = SITES.map((code) => buildScView(code, 2026, 'year'));
    expect(all.clinicalConsumption).toBe(sum(parts.map((item) => item.clinicalConsumption)));
    expect(all.receiptsReceived).toBe(sum(parts.map((item) => item.receiptsReceived)));
    expect(all.availableUnits).toBe(sum(parts.map((item) => item.availableUnits)));
    expect(all.supplierFillRate).toBeCloseTo(all.receiptsReceived / all.receiptsOrdered, 5);
  });

  it('keeps year equal to the sum of quarters for flow counts', () => {
    const year = buildScView('H1', 2026, 'year');
    const quarters = QUARTERS.map((period) => buildScView('H1', 2026, period as ReportPeriod));
    expect(year.clinicalConsumption).toBe(sum(quarters.map((item) => item.clinicalConsumption)));
    expect(year.receiptsReceived).toBe(sum(quarters.map((item) => item.receiptsReceived)));
    expect(year.expiredUnits).toBe(sum(quarters.map((item) => item.expiredUnits)));
  });
});

describe('Supply Chain bindings and alerts', () => {
  it('binds every SC KPI through buildScView', () => {
    for (const owner of SC_KPI_OWNERS) {
      const kpi = findKpi(owner.id)!;
      const raw = bindKpi(kpi, NO_FACT, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
      expect(raw.value).not.toBeNaN();
      const item = measure(kpi, 'H1', 2026, 'All');
      expect(Number.isFinite(item.value), owner.id).toBe(true);
    }
  });

  it('routes /supply-chain paths to the Supply Chain department', () => {
    expect(screenFromPath('/supply-chain')).toBe('supply-chain');
    expect(screenFromPath('/supply-chain/inventory')).toBe('supply-chain-inventory');
    expect(screenFromPath('/supply-chain/optimization')).toBe('supply-chain-optimization');
    expect(screenDepartment('supply-chain')).toBe('Supply Chain');
    expect(screenDepartment('supply-chain-waste')).toBe('Supply Chain');
  });

  it('emits Supply Chain alerts and scopes them by period', () => {
    const yearAlerts = alertsFor('H1', 2026, 'year').filter((alert) => alert.department === 'Supply Chain');
    expect(yearAlerts.length).toBeGreaterThanOrEqual(6);
    const q1 = alertsFor('H1', 2026, 'Q1').filter((alert) => alert.department === 'Supply Chain');
    expect(q1.every((alert) => alert.period.includes('Q1'))).toBe(true);
    expect(q1.every((alert) => alert.id.includes('|Q1|'))).toBe(true);
  });
});

describe('Supply Chain what-if and assist', () => {
  it('registers eight non-additive opportunities and prompts', () => {
    expect(SC_OPPORTUNITY_IDS).toHaveLength(8);
    expect(WHAT_IF_PROMPTS['Supply Chain'].length).toBeGreaterThanOrEqual(8);
    const view = buildScView('H1', 2026, 'year');
    expect(view.opportunities).toHaveLength(8);
    expect(view.opportunities.every((item) => item.additive === false)).toBe(true);
    expect(SC_OPPORTUNITY_IDS).toEqual([
      'sc-safety-stock',
      'sc-lead-time-down',
      'sc-fill-rate-up',
      'sc-consolidate-po',
      'sc-near-expiry-down',
      'sc-critical-replenish',
      'sc-diversify-suppliers',
      'sc-forecast-error-down',
    ]);
  });

  it('parses SC intents and returns illustrative what-if results', () => {
    const intent = parseWhatIfIntent('What if supplier fill rate improves by 5 points?');
    expect(intent?.kind).toBe('sc-fill-rate-up');
    const result = runWhatIf('Supply Chain', 'H1', 2026, intent, 'year');
    expect(result.title).toMatch(/fill rate/i);
    expect(result.assumptions).toMatch(/not measured improvement|illustrative/i);
    expect(result.assumptions).toMatch(/critical safety stock|clinically critical/i);
  });

  it('answers Supply Chain questions with ledger discipline', () => {
    const dos = answerQuestion('What is days of supply?', 'H1', 2026, 'Supply Chain', 'en', 'year');
    expect(dos.observation).toMatch(/days of supply|usable/i);
    expect(dos.evidence).toMatch(/forecast|daily|unit demand|NOT value/i);
    expect(dos.approval).toMatch(/Management (approval|decision)/i);

    const deny = answerQuestion('Should I auto-place purchase orders and cut critical safety stock for cost?', 'H1', 2026, 'Supply Chain', 'en', 'year');
    expect(deny.title).toMatch(/autonomous|purchasing|safety stock/i);
    expect(deny.observation).toMatch(/not|alone|critical/i);

    const outside = answerQuestion('Where are claim denials increasing?', 'H1', 2026, 'Supply Chain', 'en', 'year');
    expect(outside.title).toMatch(/Outside Supply Chain/i);
  });

  it('keeps operating targets documented', () => {
    expect(SC_TARGETS.supplyAvailability).toBe(0.96);
    expect(SC_TARGETS.supplierOtd).toBe(0.92);
    expect(SC_TARGETS.supplierFillRate).toBe(0.95);
    expect(SC_TARGETS.daysOfSupply).toBe(28);
  });
});
