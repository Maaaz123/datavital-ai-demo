import { describe, expect, it } from 'vitest';
import {
  RCM_EVENT_CASES,
  allowedTotal,
  billedTotal,
  cashAppliedFromPayments,
  clearinghouseRejectCount,
  deniedTotal,
  isAdjudicated,
  isAuthDenial,
  isLeakage,
  isPayerDenied,
  paidTotal,
  submissionAttemptCount,
  underpaymentTotal,
  uniqueClaimCount,
  unappliedFromPayments,
  type AdjustmentEvent,
  type ClaimEvent,
  type PaymentEvent,
} from './rcmEventFixtures';
import { alertsFor } from './alerts';
import { buildRcmView, clearRcmViewCache } from './rcmView';

describe('RCM event fixtures — claim and payment edge cases', () => {
  it('covers all 25 named edge cases from the remediation brief', () => {
    expect(Object.keys(RCM_EVENT_CASES)).toHaveLength(25);
  });

  it('1–2: partial denial and mixed paid/denied lines keep unique claim = 1 and line totals', () => {
    const partial = RCM_EVENT_CASES.partialPayerDenial.claim;
    expect(uniqueClaimCount(partial)).toBe(1);
    expect(isPayerDenied(partial)).toBe(true);
    expect(isAdjudicated(partial)).toBe(true);
    expect(paidTotal(partial) + deniedTotal(partial)).toBe(7200);
    expect(billedTotal(partial)).toBe(8000);

    const mixed = RCM_EVENT_CASES.mixedPaidDeniedLines.claim;
    expect(uniqueClaimCount(mixed)).toBe(1);
    expect(submissionAttemptCount(mixed)).toBe(1);
    expect(paidTotal(mixed)).toBe(2150);
    expect(deniedTotal(mixed)).toBe(1850);
    expect(isPayerDenied(mixed)).toBe(true);
  });

  it('3–6: duplicate, corrected, resubmissions, and clearinghouse reject ≠ unique claims or payer denials', () => {
    const dup = RCM_EVENT_CASES.duplicateSubmission.claim;
    expect(uniqueClaimCount(dup)).toBe(1);
    expect(submissionAttemptCount(dup)).toBe(2);
    expect(clearinghouseRejectCount(dup)).toBe(1);
    expect(isPayerDenied(dup)).toBe(false);

    const corr = RCM_EVENT_CASES.correctedClaim.claim;
    expect(uniqueClaimCount(corr)).toBe(1);
    expect(submissionAttemptCount(corr)).toBe(2);
    expect(corr.submissions.some((item) => item.kind === 'corrected')).toBe(true);

    const resub = RCM_EVENT_CASES.multipleResubmissions.claim;
    expect(uniqueClaimCount(resub)).toBe(1);
    expect(submissionAttemptCount(resub)).toBe(3);
    expect(clearinghouseRejectCount(resub)).toBe(2);
    expect(isPayerDenied(resub)).toBe(false);

    const ch = RCM_EVENT_CASES.clearinghouseThenAccept.claim;
    expect(clearinghouseRejectCount(ch)).toBe(1);
    expect(isPayerDenied(ch)).toBe(false);
    expect(isAdjudicated(ch)).toBe(true);
  });

  it('7–8: appeal pending vs successful appeal with subsequent payment', () => {
    const pending = RCM_EVENT_CASES.claimAppeal.claim;
    expect(isPayerDenied(pending)).toBe(true);
    expect(pending.appeal?.decided).toBe(false);
    expect(pending.appeal?.recovered).toBe(0);
    expect(isAuthDenial(pending)).toBe(true);

    const won = RCM_EVENT_CASES.successfulAppealPayment;
    expect(won.claim.appeal?.won).toBe(true);
    expect(won.claim.appeal?.recovered).toBe(4500);
    expect(cashAppliedFromPayments(won.payments)).toBe(4500);
    expect(paidTotal(won.claim)).toBe(4500);
  });

  it('9–13: reversal, refund, credit, partial payment, unapplied remittance', () => {
    const reversal = RCM_EVENT_CASES.paymentReversal.payments;
    expect(cashAppliedFromPayments(reversal)).toBe(0);

    const refund = RCM_EVENT_CASES.paymentRefund.payments;
    expect(cashAppliedFromPayments(refund)).toBe(-800);

    const credit = RCM_EVENT_CASES.creditBalance.payments;
    expect(credit[0].kind).toBe('credit');
    expect(credit[0].amount).toBeLessThan(0);

    const partial = RCM_EVENT_CASES.partialPayment.claim;
    expect(paidTotal(partial)).toBeLessThan(allowedTotal(partial));
    expect(underpaymentTotal(partial)).toBe(4500);

    const unapplied = RCM_EVENT_CASES.unappliedRemittance.payments;
    expect(unappliedFromPayments(unapplied)).toBe(1200);
    expect(cashAppliedFromPayments(unapplied)).toBe(0);
  });

  it('14–15: payment across quarter boundary and prior-year AR collected in current year', () => {
    const xq = RCM_EVENT_CASES.paymentAcrossQuarter;
    expect(xq.claim.quarter).toBe('Q1');
    expect(xq.payments[0].quarter).toBe('Q2');
    expect(paidTotal(xq.claim)).toBe(0);
    expect(cashAppliedFromPayments(xq.payments)).toBe(3200);

    const prior = RCM_EVENT_CASES.priorYearArCollected.payments[0];
    expect(prior.claimId).toContain('2025');
    expect(prior.year).toBe(2026);
    expect(cashAppliedFromPayments([prior])).toBe(7800);
  });

  it('16–20: underpayment, contractual (not leakage), avoidable write-off, bad debt, charge reversal', () => {
    const under = RCM_EVENT_CASES.contractUnderpayment;
    expect(underpaymentTotal(under.claim)).toBe(500);
    expect(isLeakage(under.adjustments[0])).toBe(true);

    const contractual = RCM_EVENT_CASES.approvedContractual.adjustments[0];
    expect(contractual.kind).toBe('contractual');
    expect(isLeakage(contractual)).toBe(false);

    const avoidable = RCM_EVENT_CASES.avoidableWriteoff.adjustments[0];
    expect(isLeakage(avoidable)).toBe(true);

    const badDebt = RCM_EVENT_CASES.legitimateBadDebt.adjustments[0];
    expect(badDebt.kind).toBe('bad_debt');
    expect(isLeakage(badDebt)).toBe(false);

    const reversal = RCM_EVENT_CASES.chargeReversal.adjustments[0];
    expect(reversal.amount).toBeLessThan(0);
    expect(isLeakage(reversal)).toBe(false);
  });

  it('21–25: multi-payer, zero collectible AR, zero adjudicated, missing/expired auth', () => {
    const multi = RCM_EVENT_CASES.multiPayerEncounter.claim;
    expect(multi.payers).toHaveLength(2);
    expect(paidTotal(multi)).toBe(7900);

    const zeroAr = RCM_EVENT_CASES.zeroCollectibleAr;
    expect(allowedTotal(zeroAr.claim) + zeroAr.adjustments[0].amount).toBe(billedTotal(zeroAr.claim));
    expect(isLeakage(zeroAr.adjustments[0])).toBe(false);

    const zeroAdj = RCM_EVENT_CASES.zeroAdjudicated.claim;
    expect(isAdjudicated(zeroAdj)).toBe(false);
    expect(isPayerDenied(zeroAdj)).toBe(false);
    expect(clearinghouseRejectCount(zeroAdj)).toBe(1);

    expect(isAuthDenial(RCM_EVENT_CASES.missingAuthorization.claim)).toBe(true);
    expect(isAuthDenial(RCM_EVENT_CASES.expiredAuthorization.claim)).toBe(true);
    expect(deniedTotal(RCM_EVENT_CASES.missingAuthorization.claim)).toBe(4500);
    expect(deniedTotal(RCM_EVENT_CASES.expiredAuthorization.claim)).toBe(3800);
  });

  it('documents that production RCM views are aggregate — fixtures are not wired into buildRcmView', () => {
    clearRcmViewCache();
    const view = buildRcmView('H1', 2026, 'year');
    // Aggregate ledger has no claim_id grain; event fixtures remain separate.
    expect(view.methodology.claims).toMatch(/Unique claims/);
    expect(view.uniqueClaims).toBeGreaterThan(0);
    expect(typeof (view as { claimEvents?: unknown }).claimEvents).toBe('undefined');
  });
});

describe('RCM period-scoped alerts', () => {
  it('Q1 Revenue Cycle alerts use Q1 values and declare Q1 scope', () => {
    clearRcmViewCache();
    const yearAlerts = alertsFor('H1', 2026, 'year').filter((alert) => alert.department === 'Revenue Cycle');
    const q1Alerts = alertsFor('H1', 2026, 'Q1').filter((alert) => alert.department === 'Revenue Cycle');
    const viewQ1 = buildRcmView('H1', 2026, 'Q1');
    const viewYear = buildRcmView('H1', 2026, 'year');

    expect(q1Alerts.every((alert) => alert.period === 'Q1 2026')).toBe(true);
    expect(yearAlerts.every((alert) => alert.period === 'Full year 2026')).toBe(true);

    const q1Ncr = q1Alerts.find((alert) => alert.kpi === 'kpi_rcm_net_collection_rate');
    const yearNcr = yearAlerts.find((alert) => alert.kpi === 'kpi_rcm_net_collection_rate');
    expect(q1Ncr?.title).toMatch(/cash-to-net/i);
    expect(q1Ncr?.id).toContain('|Q1|');
    expect(yearNcr?.id).not.toContain('|Q1|');

    // Observed Q1 cash-to-net must reflect Q1 cohort, not full-year when they differ.
    if (Math.abs(viewQ1.netCollectionRate - viewYear.netCollectionRate) > 0.0005) {
      expect(q1Ncr?.observed).not.toBe(yearNcr?.observed);
    }
    expect(q1Alerts.find((alert) => alert.kpi === 'kpi_rcm_ar_over_90')?.observed).toMatch(/SAR/);
    expect(q1Alerts.find((alert) => alert.kpi === 'kpi_rcm_unapplied_cash')?.period).toBe('Q1 2026');
  });

  it('domains 1–11 keep full-year alert ids when period defaults to year', () => {
    const bed = alertsFor('H1', 2026).find((alert) => alert.kpi === 'kpi_bed_occupancy_rate');
    expect(bed?.id).toBe('H1|2026|kpi_bed_occupancy_rate');
    expect(bed?.period).toBe('Full year 2026');
  });
});

describe('fixture type guards', () => {
  it('accepts typed claim / payment / adjustment shapes', () => {
    const claim: ClaimEvent = RCM_EVENT_CASES.partialPayerDenial.claim;
    const payment: PaymentEvent = RCM_EVENT_CASES.unappliedRemittance.payments[0];
    const adj: AdjustmentEvent = RCM_EVENT_CASES.approvedContractual.adjustments[0];
    expect(claim.claimId).toBeTruthy();
    expect(payment.kind).toBe('unapplied');
    expect(adj.kind).toBe('contractual');
  });
});
