import { describe, expect, it } from 'vitest';
import { alertsFor, screenDepartment, screenFromPath } from './alerts';
import {
  assertUniqueRcmCharts,
  assertUniqueRcmOwnership,
  ownersForRcmScreen,
  RCM_CHART_OWNERS,
  RCM_CROSS_DOMAIN_FORBIDDEN,
  RCM_KPI_OWNERS,
  type RcmScreenId,
} from './rcmOwnership';
import {
  buildRcmView,
  clearRcmViewCache,
  rcmArRollForwardResidual,
  rcmIdentityIssues,
  RCM_OPPORTUNITY_IDS,
  RCM_TARGETS,
} from './rcmView';
import { answerQuestion } from '@/showcase/assistant';
import { bindKpi } from '@/showcase/bind';
import { findKpi, KPIS } from '@/showcase/engine';
import { formatMeasure, measure } from '@/showcase/measures';
import { parseWhatIfIntent, runWhatIf, WHAT_IF_PROMPTS } from '@/showcase/whatIf';
import { scenarioFor } from '@/showcase/facts';
import type { ReportPeriod } from './period';

const NO_FACT = { admissions: 0 } as never;
const SITES = ['H1', 'H2', 'H3', 'H4', 'H5'] as const;
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function sum(values: number[]): number {
  expect(values.every((value) => Number.isFinite(value))).toBe(true);
  return values.reduce((total, value) => total + value, 0);
}

describe('Revenue Cycle KPI ownership', () => {
  it('registers each primary KPI ID on exactly one screen (41 KPIs, 7 screens)', () => {
    expect(assertUniqueRcmOwnership()).toEqual([]);
    expect(RCM_KPI_OWNERS).toHaveLength(41);
    expect(new Set(RCM_KPI_OWNERS.map((item) => item.id)).size).toBe(41);
    const screens = new Set(RCM_KPI_OWNERS.map((item) => item.screen));
    expect(screens.size).toBe(7);
    const expected: Record<RcmScreenId, number> = {
      command: 6, eligibility: 6, billing: 6, claims: 6, collections: 6, leakage: 6, optimization: 5,
    };
    for (const [screen, count] of Object.entries(expected)) {
      expect(ownersForRcmScreen(screen as RcmScreenId), screen).toHaveLength(count);
    }
  });

  it('detects a duplicated owner', () => {
    const dup = [...RCM_KPI_OWNERS, { ...RCM_KPI_OWNERS[0], screen: 'billing' as const }];
    expect(assertUniqueRcmOwnership(dup)).toHaveLength(1);
  });

  it('registers unique chart titles and ids across screens', () => {
    expect(assertUniqueRcmCharts()).toEqual([]);
    expect(RCM_CHART_OWNERS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(RCM_CHART_OWNERS.map((item) => item.id)).size).toBe(RCM_CHART_OWNERS.length);
    expect(new Set(RCM_CHART_OWNERS.map((item) => item.title)).size).toBe(RCM_CHART_OWNERS.length);
  });

  it('does not claim cross-domain headline KPIs', () => {
    const names = RCM_KPI_OWNERS.map((item) => item.fullName);
    for (const forbidden of RCM_CROSS_DOMAIN_FORBIDDEN) expect(names).not.toContain(forbidden);
  });

  it('registers every owner as a KPI with a unique key and the Revenue Cycle domain or legacy registry origin', () => {
    const keys = KPIS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const owner of RCM_KPI_OWNERS) {
      const kpi = findKpi(owner.id);
      expect(kpi, owner.id).toBeTruthy();
      if (owner.id === 'kpi_rcm_outstanding_ar') {
        expect(kpi?.origin).not.toBe('demo_assumption');
      } else {
        expect(kpi?.domain, owner.id).toBe('Revenue Cycle');
        expect(kpi?.origin, owner.id).toBe('demo_assumption');
      }
    }
  });
});

describe('Revenue Cycle ledger identities', () => {
  it('reconciles gross charges − contractual allowances = net patient revenue', () => {
    for (const hospital of ['H1', 'ALL']) {
      const view = buildRcmView(hospital, 2026, 'year');
      expect(view.grossCharges - view.contractualAllowances).toBe(view.netPatientRevenue);
      expect(view.kpiValues.kpi_rcm_net_patient_revenue).toBe(view.netPatientRevenue);
      expect(view.contractualAllowances).toBeGreaterThan(0);
      expect(view.identities.netRevenueBalanced).toBe(true);
    }
  });

  it('rolls AR forward with a zero residual and a period-end snapshot', () => {
    for (const hospital of ['H1', 'ALL']) {
      for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
        const view = buildRcmView(hospital, 2026, period);
        expect(rcmArRollForwardResidual(view), `${hospital} ${period}`).toBe(0);
        expect(view.arRollForward.residual).toBe(0);
        expect(view.arRollForward.balanced).toBe(true);
        expect(view.outstandingAR).toBe(view.closingAR);
        expect(sum(view.arAging)).toBe(view.closingAR);
        expect(view.insurerAR + view.patientAR).toBe(view.closingAR);
      }
    }
    // Outstanding AR is the Q4 / year-end snapshot, not a sum of quarter-end balances.
    const year = buildRcmView('H1', 2026, 'year');
    const q4 = buildRcmView('H1', 2026, 'Q4');
    const q1 = buildRcmView('H1', 2026, 'Q1');
    expect(year.closingAR).toBe(q4.closingAR);
    expect(year.closingAR).not.toBe(year.closingAR + q1.closingAR);
    expect(year.openingAR).toBe(q1.openingAR);
  });

  it('keeps cash received ≥ cash applied and unapplied cash non-negative', () => {
    const view = buildRcmView('H1', 2026, 'year');
    expect(view.cashReceived).toBeGreaterThanOrEqual(view.cashApplied);
    expect(view.kpiValues.kpi_rcm_unapplied_cash).toBe(view.cashReceived - view.cashApplied);
    expect(view.kpiValues.kpi_rcm_unapplied_cash).toBeGreaterThanOrEqual(0);
    expect(view.kpiValues.kpi_rcm_cash_applied).toBe(view.cashApplied);
  });

  it('keeps unique claims ≤ submission attempts and separates rejects from denials', () => {
    const view = buildRcmView('H1', 2026, 'year');
    expect(view.uniqueClaims).toBeLessThanOrEqual(view.submissionAttempts);
    expect(view.resubmissions).toBe(view.submissionAttempts - view.uniqueClaims);
    expect(view.resubmissions).toBeGreaterThan(0);
    expect(view.firstPassAccepted + view.clearinghouseRejects).toBe(view.uniqueClaims);
    expect(view.kpiValues.kpi_rcm_claims_submitted).toBe(view.uniqueClaims);
    expect(view.clearinghouseRejects).not.toBe(view.deniedClaims);
  });

  it('uses adjudicated unique claims as the denial denominator', () => {
    const view = buildRcmView('H1', 2026, 'year');
    expect(view.deniedClaims).toBeLessThanOrEqual(view.adjudicatedClaims);
    expect(view.adjudicatedClaims).toBeLessThanOrEqual(view.uniqueClaims);
    expect(view.deniedAmount).toBeLessThanOrEqual(view.adjudicatedAmount);
    expect(view.grossDenialRate).toBeCloseTo(view.deniedClaims / view.adjudicatedClaims, 3);
    expect(view.denialRateByValue).toBeCloseTo(view.deniedAmount / view.adjudicatedAmount, 3);
    expect(view.grossDenialRate).not.toBeCloseTo(view.deniedClaims / view.uniqueClaims, 3);
    const raw = bindKpi(findKpi('kpi_rcm_gross_denial_rate') as never, NO_FACT, 'H1', 2026);
    expect(raw.numerator).toBe(view.deniedClaims);
    expect(raw.denominator).toBe(view.adjudicatedClaims);
    const byValue = bindKpi(findKpi('kpi_rcm_denial_rate_by_value') as never, NO_FACT, 'H1', 2026);
    expect(byValue.denominator).toBe(view.adjudicatedAmount);
    expect(byValue.denominator).not.toBe(view.adjudicatedClaims);
  });

  it('attributes confirmed leakage exclusively and excludes contractual allowances and potential leakage', () => {
    const view = buildRcmView('H1', 2026, 'year');
    expect(view.confirmedLeakage).toBe(view.missedChargeExposure + view.avoidableWriteoffs + view.underpaymentValue);
    expect(sum(view.leakageDrivers.map((item) => item.amount))).toBe(view.confirmedLeakage);
    expect(sum(view.leakageDrivers.map((item) => item.share))).toBeCloseTo(1, 2);
    expect(view.confirmedLeakage).toBeLessThan(view.contractualAllowances);
    expect(view.confirmedLeakage).not.toBe(view.confirmedLeakage + view.potentialLeakage);
    expect(view.avoidableWriteoffs).toBeLessThanOrEqual(view.writeOffs);
    expect(view.methodology.leakage).toMatch(/Contractual allowances are never leakage/);
    expect(view.methodology.leakage).toMatch(/not additive/i);
  });

  it('balances authorization, unbilled work-in-progress, and payer breakdowns', () => {
    for (const hospital of ['H1', 'ALL']) {
      const view = buildRcmView(hospital, 2026, 'year');
      expect(view.authRequested + view.authOpeningPending).toBe(view.authDecided + view.authPending);
      expect(view.netPatientRevenue).toBe(view.newReceivables + (view.unbilledValue - view.openingUnbilledValue));
      expect(sum(view.payerRows.map((item) => item.netRevenue))).toBe(view.netPatientRevenue);
      expect(sum(view.payerRows.map((item) => item.collections))).toBe(view.cashApplied);
      expect(sum(view.payerRows.map((item) => item.ar))).toBe(view.closingAR);
      expect(rcmIdentityIssues(view)).toEqual([]);
    }
  });
});

describe('Revenue Cycle filter matrix', () => {
  it('builds finite reconciled views for H1 and ALL across year and quarters', () => {
    clearRcmViewCache();
    for (const hospital of ['H1', 'ALL']) {
      for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
        const view = buildRcmView(hospital, 2026, period);
        expect(rcmIdentityIssues(view), `${hospital} ${period}`).toEqual([]);
        for (const [key, value] of Object.entries(view.kpiValues)) {
          expect(Number.isFinite(value), `${hospital} ${period} ${key}`).toBe(true);
        }
        expect(view.kpiValues.kpi_rcm_net_collection_rate).toBeGreaterThan(0);
        expect(view.kpiValues.kpi_rcm_net_collection_rate).toBeLessThanOrEqual(1.2);
        expect(view.kpiValues.kpi_rcm_gross_denial_rate).toBeGreaterThan(0);
        expect(view.kpiValues.kpi_rcm_gross_denial_rate).toBeLessThan(1);
      }
    }
  });

  it('aggregates quarters from the same ledger as the full year (flows add, stocks are period-end)', () => {
    clearRcmViewCache();
    for (const hospital of ['H1', 'ALL']) {
      const year = buildRcmView(hospital, 2026, 'year');
      const quarters = QUARTERS.map((period) => buildRcmView(hospital, 2026, period));
      expect(sum(quarters.map((item) => item.netPatientRevenue))).toBe(year.netPatientRevenue);
      expect(sum(quarters.map((item) => item.grossCharges))).toBe(year.grossCharges);
      expect(sum(quarters.map((item) => item.cashApplied))).toBe(year.cashApplied);
      expect(sum(quarters.map((item) => item.cashReceived))).toBe(year.cashReceived);
      expect(sum(quarters.map((item) => item.uniqueClaims))).toBe(year.uniqueClaims);
      expect(sum(quarters.map((item) => item.deniedClaims))).toBe(year.deniedClaims);
      expect(sum(quarters.map((item) => item.confirmedLeakage))).toBe(year.confirmedLeakage);
      expect(sum(quarters.map((item) => item.daysInPeriod))).toBe(year.daysInPeriod);
      expect(quarters[3].closingAR).toBe(year.closingAR);
      expect(quarters[0].openingAR).toBe(year.openingAR);
      // Quarter chain: each opening AR equals the prior quarter closing AR.
      for (let index = 1; index < quarters.length; index += 1) {
        expect(quarters[index].openingAR).toBe(quarters[index - 1].closingAR);
      }
    }
  });

  it('makes ALL the exact sum of H1–H5 for ledger values, with rates recomputed', () => {
    const all = buildRcmView('ALL', 2026, 'year');
    const sites = SITES.map((code) => buildRcmView(code, 2026, 'year'));
    expect(sum(sites.map((item) => item.netPatientRevenue))).toBe(all.netPatientRevenue);
    expect(sum(sites.map((item) => item.closingAR))).toBe(all.closingAR);
    expect(sum(sites.map((item) => item.uniqueClaims))).toBe(all.uniqueClaims);
    expect(sum(sites.map((item) => item.confirmedLeakage))).toBe(all.confirmedLeakage);
    expect(all.netCollectionRate).toBeCloseTo(sum(sites.map((item) => item.cashApplied)) / all.netPatientRevenue, 3);
    // A mean of site rates differs from the recomputed numerator ÷ denominator in general.
    expect(all.grossDenialRate).toBeCloseTo(sum(sites.map((item) => item.deniedClaims)) / sum(sites.map((item) => item.adjudicatedClaims)), 3);
  });

  it('is deterministic across cache clears', () => {
    const first = buildRcmView('H3', 2026, 'Q2').kpiValues;
    clearRcmViewCache();
    expect(buildRcmView('H3', 2026, 'Q2').kpiValues).toEqual(first);
  });
});

describe('Revenue Cycle bind and measure', () => {
  const rcmOwners = RCM_KPI_OWNERS.filter((item) => item.id !== 'kpi_rcm_outstanding_ar');

  it('binds every kpi_rcm_* owner (except the legacy catalog AR key) to a finite view value', () => {
    const view = buildRcmView('H1', 2026, 'year');
    expect(rcmOwners).toHaveLength(40);
    for (const owner of rcmOwners) {
      const raw = bindKpi(findKpi(owner.id) as never, NO_FACT, 'H1', 2026);
      expect(Number.isFinite(raw.value), owner.id).toBe(true);
      expect(raw.note, owner.id).not.toMatch(/UNMAPPED/);
      const expected = view.kpiValues[owner.id];
      // Rates are recomputed from integer ledgers; the view rounds to 3 decimals. Days are rounded to 0.1.
      const tolerance = raw.kind === 'rate' ? 0.0006 : raw.kind === 'duration' ? 0.06 : 0.5;
      expect(Math.abs(raw.value - expected), owner.id).toBeLessThanOrEqual(tolerance);
    }
  });

  it('keeps the legacy catalog kpi_rcm_outstanding_ar bound to the fact ledger', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const raw = bindKpi(findKpi('kpi_rcm_outstanding_ar') as never, fact, 'H1', 2026);
    expect(raw.value).toBe(fact.outstanding);
    expect(Number.isFinite(raw.value)).toBe(true);
  });

  it('maps units by KPI type', () => {
    const kinds: Record<string, string> = {
      kpi_rcm_net_patient_revenue: 'currency',
      kpi_rcm_cash_applied: 'currency',
      kpi_rcm_confirmed_leakage: 'currency',
      kpi_rcm_net_collection_rate: 'rate',
      kpi_rcm_gross_denial_rate: 'rate',
      kpi_rcm_first_pass_acceptance: 'rate',
      kpi_rcm_days_in_ar: 'duration',
      kpi_rcm_auth_turnaround_days: 'duration',
      kpi_rcm_claims_submitted: 'count',
      kpi_rcm_unbilled_encounters: 'count',
    };
    for (const [id, kind] of Object.entries(kinds)) {
      const item = measure(findKpi(id) as never, 'H1', 2026);
      expect(item.kind, id).toBe(kind);
    }
    expect(formatMeasure(measure(findKpi('kpi_rcm_net_collection_rate') as never, 'H1', 2026))).toMatch(/%$/);
    expect(formatMeasure(measure(findKpi('kpi_rcm_confirmed_leakage') as never, 'H1', 2026))).toMatch(/^SAR /);
    expect(formatMeasure(measure(findKpi('kpi_rcm_days_in_ar') as never, 'H1', 2026))).toMatch(/days$/);
  });

  it('measures rate numerators and denominators from view ledgers', () => {
    const view = buildRcmView('H1', 2026, 'year');
    const ncr = bindKpi(findKpi('kpi_rcm_net_collection_rate') as never, NO_FACT, 'H1', 2026);
    expect(ncr.numerator).toBe(view.cashApplied);
    expect(ncr.denominator).toBe(view.netPatientRevenue);
    const fp = bindKpi(findKpi('kpi_rcm_first_pass_acceptance') as never, NO_FACT, 'H1', 2026);
    expect(fp.numerator).toBe(view.firstPassAccepted);
    expect(fp.denominator).toBe(view.uniqueClaims);
    const auth = bindKpi(findKpi('kpi_rcm_preauth_approval_rate') as never, NO_FACT, 'H1', 2026);
    expect(auth.denominator).toBe(view.authDecided);
    const capture = bindKpi(findKpi('kpi_rcm_charge_capture_rate') as never, NO_FACT, 'H1', 2026);
    expect(capture.denominator).toBe(view.chargeableServices);
  });

  it('keeps modeled values labelled as illustrative and not collected cash', () => {
    for (const id of ['kpi_rcm_recoverable_opportunity', 'kpi_rcm_eligible_denial_recovery', 'kpi_rcm_cash_acceleration', 'kpi_rcm_revenue_at_risk']) {
      const raw = bindKpi(findKpi(id) as never, NO_FACT, 'H1', 2026);
      expect(raw.note, id).toMatch(/illustrative|not collected|timing shift|not realized/i);
    }
  });
});

describe('Revenue Cycle alerts', () => {
  it('builds eight Revenue Cycle alerts on the rcm screen aligned with owners', () => {
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Revenue Cycle');
    expect(alerts).toHaveLength(8);
    expect(alerts.every((alert) => alert.screen === 'rcm' && alert.kpi.startsWith('kpi_rcm_'))).toBe(true);
    const owned = new Set(RCM_KPI_OWNERS.map((item) => item.id));
    for (const alert of alerts) expect(owned.has(alert.kpi), alert.kpi).toBe(true);
    expect(alerts.map((alert) => alert.kpi).sort()).toEqual([
      'kpi_rcm_ar_over_90',
      'kpi_rcm_auth_denial_exposure',
      'kpi_rcm_confirmed_leakage',
      'kpi_rcm_gross_denial_rate',
      'kpi_rcm_net_collection_rate',
      'kpi_rcm_underpayment_value',
      'kpi_rcm_unapplied_cash',
      'kpi_rcm_unbilled_encounters',
    ].sort());
    for (const alert of alerts) {
      expect(alert.observed, alert.kpi).not.toMatch(/NaN|undefined/);
      expect(alert.threshold.length).toBeGreaterThan(0);
    }
  });

  it('uses RCM targets as the review lines for denial and collection alerts', () => {
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Revenue Cycle');
    expect(alerts.find((alert) => alert.kpi === 'kpi_rcm_gross_denial_rate')?.threshold).toContain(`${RCM_TARGETS.grossDenialRate * 100}%`);
    expect(alerts.find((alert) => alert.kpi === 'kpi_rcm_net_collection_rate')?.threshold).toContain(`${RCM_TARGETS.netCollectionRate * 100}%`);
  });

  it('flags a weak hospital and keeps severities valid for ALL', () => {
    const h2 = alertsFor('H2', 2026).find((alert) => alert.kpi === 'kpi_rcm_gross_denial_rate');
    expect(h2?.severity).not.toBe('info');
    const all = alertsFor('ALL', 2026).filter((alert) => alert.department === 'Revenue Cycle');
    expect(all.every((alert) => ['critical', 'high', 'medium', 'info'].includes(alert.severity))).toBe(true);
  });

  it('routes rcm screens and paths to the Revenue Cycle department', () => {
    expect(screenDepartment('rcm')).toBe('Revenue Cycle');
    for (const child of ['rcm-eligibility', 'rcm-billing', 'rcm-claims', 'rcm-collections', 'rcm-leakage', 'rcm-optimization']) {
      expect(screenDepartment(child), child).toBe('Revenue Cycle');
    }
    for (const path of ['/rcm', '/rcm/eligibility', '/rcm/billing', '/rcm/claims', '/rcm/collections', '/rcm/leakage', '/rcm/optimization']) {
      expect(screenFromPath(path), path).toBe('rcm');
    }
  });
});

describe('Revenue Cycle Assist and what-if', () => {
  it('registers eight prompts that parse to distinct rcm-* intents matching the opportunity ids', () => {
    const prompts = WHAT_IF_PROMPTS['Revenue Cycle'];
    expect(prompts).toHaveLength(8);
    const kinds = prompts.map((prompt) => parseWhatIfIntent(prompt)?.kind);
    expect(kinds.every((kind) => kind?.startsWith('rcm-'))).toBe(true);
    expect(new Set(kinds).size).toBe(8);
    expect([...kinds].sort()).toEqual([...RCM_OPPORTUNITY_IDS].sort());
  });

  it('does not steal other domains’ what-if prompts', () => {
    for (const [domain, prompts] of Object.entries(WHAT_IF_PROMPTS)) {
      if (domain === 'Revenue Cycle') continue;
      for (const prompt of prompts) {
        expect(parseWhatIfIntent(prompt)?.kind ?? '', `${domain}: ${prompt}`).not.toMatch(/^rcm-/);
      }
    }
  });

  it('runs all eight what-ifs with illustrative, non-cash, finite results', () => {
    clearRcmViewCache();
    const results = RCM_OPPORTUNITY_IDS.map((kind) => runWhatIf('Revenue Cycle', 'H1', 2026, { kind, amount: 0.2 }, 'year'));
    for (const result of results) {
      expect(result.assumptions).toMatch(/Illustrative/i);
      expect(result.assumptions).toMatch(/not collected cash/i);
      expect(`${result.current} ${result.estimated}`).not.toMatch(/NaN|undefined|Infinity/);
      expect(`${result.estimated} ${result.implications}`).not.toMatch(/prescribe|prognosis/i);
      expect(result.owner.length).toBeGreaterThan(0);
    }
    expect(new Set(results.map((item) => item.title)).size).toBe(8);
    expect(new Set(results.map((item) => item.id)).size).toBe(8);
  });

  it('caps modeled recovery at the documented eligible value and scales below it', () => {
    const view = buildRcmView('H1', 2026, 'year');
    const eligible = view.opportunities.find((item) => item.id === 'rcm-underpay-recover')?.eligibleValue ?? 0;
    const money = (text: string) => Number((text.match(/SAR ([\d,]+) recoverable/)?.[1] ?? '').replace(/,/g, ''));
    const full = runWhatIf('Revenue Cycle', 'H1', 2026, { kind: 'rcm-underpay-recover', amount: 0.4 }, 'year');
    const over = runWhatIf('Revenue Cycle', 'H1', 2026, { kind: 'rcm-underpay-recover', amount: 0.9 }, 'year');
    const half = runWhatIf('Revenue Cycle', 'H1', 2026, { kind: 'rcm-underpay-recover', amount: 0.2 }, 'year');
    expect(money(full.estimated)).toBe(eligible);
    expect(money(over.estimated)).toBe(eligible);
    expect(over.assumptions).toMatch(/capped/i);
    expect(money(half.estimated)).toBe(Math.round(eligible * 0.5));
  });

  it('falls back to a default Revenue Cycle intent', () => {
    const result = runWhatIf('Revenue Cycle', 'H1', 2026, null, 'year');
    expect(result.id).toBe('rcm-denials-down');
  });

  it('answers what-if prompts with approval wording that AI does not submit claims or write off balances', () => {
    for (const prompt of WHAT_IF_PROMPTS['Revenue Cycle']) {
      const answer = answerQuestion(prompt, 'H1', 2026, 'Revenue Cycle', 'en', 'year');
      expect(answer.outcome).toMatch(/Illustrative|illustrative/);
      expect(answer.approval).toMatch(/does not submit claims or write off balances/i);
      expect(answer.observation).toMatch(/SAR|%/);
    }
  });

  it('answers Revenue Cycle management questions from the shared view', () => {
    const view = buildRcmView('H1', 2026, 'year');
    const denials = answerQuestion('Which denial reasons are driving claim denials?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(denials.observation).toMatch(/gross denial rate/i);
    expect(denials.observation).toContain(`${(view.grossDenialRate * 100).toFixed(1)}%`);
    expect(denials.explanation).toMatch(/not proven/i);
    expect(denials.explanation).toMatch(/illustrative/i);

    const ar = answerQuestion('How much aged AR is outstanding?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(ar.observation).toMatch(/days in AR/i);
    expect(ar.explanation).toMatch(/not new revenue|timing shift/i);

    const leak = answerQuestion('What is our revenue leakage?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(leak.observation).toContain(`SAR ${view.confirmedLeakage.toLocaleString('en-US')}`);
    expect(leak.action).toMatch(/Contractual allowances are not leakage/i);

    const auth = answerQuestion('How is pre-authorization performing?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(auth.action).toMatch(/not a care decision/i);

    const billing = answerQuestion('Where are charge capture gaps?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(billing.observation).toMatch(/charge capture/i);

    const priorities = answerQuestion('Which recovery opportunities should we prioritize?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(priorities.explanation).toMatch(/not collected cash/i);
    expect(priorities.explanation).toMatch(/must not be added together/i);
  });

  it('refuses clinical care advice and live claim submission or write-offs', () => {
    const clinical = answerQuestion('What treatment should we prescribe to this patient?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(clinical.observation).toMatch(/does not give clinical care advice/i);
    const submit = answerQuestion('Submit these denied claims to the payer now', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(submit.title).toMatch(/not performed by AI/i);
    expect(submit.observation).toMatch(/cannot submit claims/i);
    const writeOff = answerQuestion('Write off the balance on these accounts', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(writeOff.observation).toMatch(/cannot write off balances/i);
  });

  it('redirects questions owned by other domains', () => {
    const answer = answerQuestion('What is the ED boarding rate?', 'H1', 2026, 'Revenue Cycle', 'en', 'year');
    expect(answer.title).toMatch(/Outside Revenue Cycle focus/i);
  });

  it('answers in Arabic without NaN across periods', () => {
    for (const period of ['year', ...QUARTERS] as ReportPeriod[]) {
      const answer = answerQuestion('Where is revenue at risk?', 'ALL', 2026, 'Revenue Cycle', 'ar', period);
      expect(`${answer.title} ${answer.observation} ${answer.evidence}`).not.toMatch(/NaN|undefined/);
    }
  });
});
