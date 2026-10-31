/**
 * Deterministic claim / payment / adjustment event fixtures for RCM edge-case tests.
 *
 * LIMITATION: The live RCM Command screens (`buildRcmView`) are monthly-aggregate ledgers.
 * These fixtures are NOT wired into production KPI cards. They prove classification and
 * accounting identities at event grain so acceptance does not confuse aggregate math with
 * claim-level reconciliation. Do not claim event-level production reconciliation from
 * aggregate-only tests.
 */

export type ClaimLineStatus = 'paid' | 'denied' | 'partial' | 'pending';
export type SubmissionKind = 'first' | 'resubmission' | 'corrected' | 'duplicate';
export type PaymentKind = 'application' | 'reversal' | 'refund' | 'unapplied' | 'credit';
export type AdjustmentKind =
  | 'contractual'
  | 'approved_ar'
  | 'avoidable_writeoff'
  | 'bad_debt'
  | 'underpayment'
  | 'charge_reversal';

export type ClaimLine = {
  lineId: string;
  billed: number;
  allowed: number;
  paid: number;
  denied: number;
  status: ClaimLineStatus;
  denialReason?: string;
  authStatus?: 'approved' | 'missing' | 'expired' | 'rejected' | 'not_required';
};

export type ClaimEvent = {
  claimId: string;
  encounterId: string;
  hospital: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  submissions: { attempt: number; kind: SubmissionKind; clearinghouse: 'accepted' | 'rejected'; date: string }[];
  lines: ClaimLine[];
  appeal?: { decided: boolean; won: boolean; recovered: number };
  payers: string[];
};

export type PaymentEvent = {
  paymentId: string;
  claimId: string | null;
  kind: PaymentKind;
  amount: number;
  receivedAt: string;
  appliedAt: string | null;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  notes?: string;
};

export type AdjustmentEvent = {
  adjustmentId: string;
  claimId: string;
  kind: AdjustmentKind;
  amount: number;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
};

/** 25 named edge cases covering the remediation brief. */
export const RCM_EVENT_CASES = {
  partialPayerDenial: {
    claim: {
      claimId: 'CLM-PARTIAL-01',
      encounterId: 'ENC-1001',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-12' }],
      lines: [
        { lineId: 'L1', billed: 5000, allowed: 4200, paid: 4200, denied: 0, status: 'paid', authStatus: 'approved' },
        { lineId: 'L2', billed: 3000, allowed: 0, paid: 0, denied: 3000, status: 'denied', denialReason: 'Medical necessity', authStatus: 'approved' },
      ],
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
  },
  mixedPaidDeniedLines: {
    claim: {
      claimId: 'CLM-MIX-02',
      encounterId: 'ENC-1002',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-18' }],
      lines: [
        { lineId: 'L1', billed: 2000, allowed: 1800, paid: 1800, denied: 0, status: 'paid' },
        { lineId: 'L2', billed: 1500, allowed: 0, paid: 0, denied: 1500, status: 'denied', denialReason: 'Coding/documentation' },
        { lineId: 'L3', billed: 800, allowed: 700, paid: 350, denied: 350, status: 'partial' },
      ],
      payers: ['Cooperative Care'],
    } satisfies ClaimEvent,
  },
  duplicateSubmission: {
    claim: {
      claimId: 'CLM-DUP-03',
      encounterId: 'ENC-1003',
      hospital: 'H2',
      year: 2026,
      quarter: 'Q1',
      submissions: [
        { attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-05' },
        { attempt: 2, kind: 'duplicate', clearinghouse: 'rejected', date: '2026-01-06' },
      ],
      lines: [
        { lineId: 'L1', billed: 4000, allowed: 3600, paid: 3600, denied: 0, status: 'paid' },
      ],
      payers: ['Employer Alliance'],
    } satisfies ClaimEvent,
  },
  correctedClaim: {
    claim: {
      claimId: 'CLM-CORR-04',
      encounterId: 'ENC-1004',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q2',
      submissions: [
        { attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-04-02' },
        { attempt: 2, kind: 'corrected', clearinghouse: 'accepted', date: '2026-04-20' },
      ],
      lines: [
        { lineId: 'L1', billed: 6000, allowed: 5400, paid: 5400, denied: 0, status: 'paid' },
      ],
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
  },
  multipleResubmissions: {
    claim: {
      claimId: 'CLM-RESUB-05',
      encounterId: 'ENC-1005',
      hospital: 'H3',
      year: 2026,
      quarter: 'Q1',
      submissions: [
        { attempt: 1, kind: 'first', clearinghouse: 'rejected', date: '2026-02-01' },
        { attempt: 2, kind: 'resubmission', clearinghouse: 'rejected', date: '2026-02-08' },
        { attempt: 3, kind: 'resubmission', clearinghouse: 'accepted', date: '2026-02-15' },
      ],
      lines: [
        { lineId: 'L1', billed: 2500, allowed: 2200, paid: 2200, denied: 0, status: 'paid' },
      ],
      payers: ['Regional Mutual'],
    } satisfies ClaimEvent,
  },
  clearinghouseThenAccept: {
    claim: {
      claimId: 'CLM-CH-06',
      encounterId: 'ENC-1006',
      hospital: 'H2',
      year: 2026,
      quarter: 'Q1',
      submissions: [
        { attempt: 1, kind: 'first', clearinghouse: 'rejected', date: '2026-01-10' },
        { attempt: 2, kind: 'resubmission', clearinghouse: 'accepted', date: '2026-01-14' },
      ],
      lines: [
        { lineId: 'L1', billed: 3200, allowed: 3000, paid: 3000, denied: 0, status: 'paid' },
      ],
      payers: ['Cooperative Care'],
    } satisfies ClaimEvent,
  },
  claimAppeal: {
    claim: {
      claimId: 'CLM-APL-07',
      encounterId: 'ENC-1007',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q2',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-04-05' }],
      lines: [
        { lineId: 'L1', billed: 7000, allowed: 0, paid: 0, denied: 7000, status: 'denied', denialReason: 'Missing authorization', authStatus: 'missing' },
      ],
      appeal: { decided: false, won: false, recovered: 0 },
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
  },
  successfulAppealPayment: {
    claim: {
      claimId: 'CLM-APL-08',
      encounterId: 'ENC-1008',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q2',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-04-08' }],
      lines: [
        { lineId: 'L1', billed: 5000, allowed: 4500, paid: 4500, denied: 0, status: 'paid', denialReason: undefined, authStatus: 'approved' },
      ],
      appeal: { decided: true, won: true, recovered: 4500 },
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
    payments: [
      {
        paymentId: 'PAY-APL-08',
        claimId: 'CLM-APL-08',
        kind: 'application',
        amount: 4500,
        receivedAt: '2026-05-20',
        appliedAt: '2026-05-21',
        year: 2026,
        quarter: 'Q2',
        notes: 'Post-appeal payment',
      } satisfies PaymentEvent,
    ],
  },
  paymentReversal: {
    payments: [
      {
        paymentId: 'PAY-REV-09a',
        claimId: 'CLM-REV-09',
        kind: 'application',
        amount: 2000,
        receivedAt: '2026-03-01',
        appliedAt: '2026-03-02',
        year: 2026,
        quarter: 'Q1',
      } satisfies PaymentEvent,
      {
        paymentId: 'PAY-REV-09b',
        claimId: 'CLM-REV-09',
        kind: 'reversal',
        amount: -2000,
        receivedAt: '2026-03-10',
        appliedAt: '2026-03-10',
        year: 2026,
        quarter: 'Q1',
        notes: 'Reversal of applied payment',
      } satisfies PaymentEvent,
    ],
  },
  paymentRefund: {
    payments: [
      {
        paymentId: 'PAY-REF-10',
        claimId: 'CLM-REF-10',
        kind: 'refund',
        amount: -800,
        receivedAt: '2026-06-12',
        appliedAt: '2026-06-12',
        year: 2026,
        quarter: 'Q2',
      } satisfies PaymentEvent,
    ],
  },
  creditBalance: {
    payments: [
      {
        paymentId: 'PAY-CR-11',
        claimId: 'CLM-CR-11',
        kind: 'credit',
        amount: -500,
        receivedAt: '2026-03-15',
        appliedAt: '2026-03-15',
        year: 2026,
        quarter: 'Q1',
        notes: 'Patient credit balance',
      } satisfies PaymentEvent,
    ],
  },
  partialPayment: {
    claim: {
      claimId: 'CLM-PART-12',
      encounterId: 'ENC-1012',
      hospital: 'H4',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-02-20' }],
      lines: [
        { lineId: 'L1', billed: 10000, allowed: 9000, paid: 4500, denied: 0, status: 'partial' },
      ],
      payers: ['Employer Alliance'],
    } satisfies ClaimEvent,
  },
  unappliedRemittance: {
    payments: [
      {
        paymentId: 'PAY-UNA-13',
        claimId: null,
        kind: 'unapplied',
        amount: 1200,
        receivedAt: '2026-03-28',
        appliedAt: null,
        year: 2026,
        quarter: 'Q1',
        notes: 'Unmatched remittance',
      } satisfies PaymentEvent,
    ],
  },
  paymentAcrossQuarter: {
    claim: {
      claimId: 'CLM-XQ-14',
      encounterId: 'ENC-1014',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-03-25' }],
      lines: [
        { lineId: 'L1', billed: 3500, allowed: 3200, paid: 0, denied: 0, status: 'pending' },
      ],
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
    payments: [
      {
        paymentId: 'PAY-XQ-14',
        claimId: 'CLM-XQ-14',
        kind: 'application',
        amount: 3200,
        receivedAt: '2026-04-08',
        appliedAt: '2026-04-09',
        year: 2026,
        quarter: 'Q2',
        notes: 'Q1 receivable collected in Q2',
      } satisfies PaymentEvent,
    ],
  },
  priorYearArCollected: {
    payments: [
      {
        paymentId: 'PAY-PY-15',
        claimId: 'CLM-2025-99',
        kind: 'application',
        amount: 7800,
        receivedAt: '2026-01-15',
        appliedAt: '2026-01-16',
        year: 2026,
        quarter: 'Q1',
        notes: 'Prior-year AR collected in current year',
      } satisfies PaymentEvent,
    ],
  },
  contractUnderpayment: {
    claim: {
      claimId: 'CLM-UND-16',
      encounterId: 'ENC-1016',
      hospital: 'H2',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-22' }],
      lines: [
        { lineId: 'L1', billed: 5000, allowed: 4500, paid: 4000, denied: 0, status: 'partial' },
      ],
      payers: ['Cooperative Care'],
    } satisfies ClaimEvent,
    adjustments: [
      {
        adjustmentId: 'ADJ-UND-16',
        claimId: 'CLM-UND-16',
        kind: 'underpayment',
        amount: 500,
        year: 2026,
        quarter: 'Q1',
      } satisfies AdjustmentEvent,
    ],
  },
  approvedContractual: {
    adjustments: [
      {
        adjustmentId: 'ADJ-CON-17',
        claimId: 'CLM-CON-17',
        kind: 'contractual',
        amount: 1500,
        year: 2026,
        quarter: 'Q1',
      } satisfies AdjustmentEvent,
    ],
  },
  avoidableWriteoff: {
    adjustments: [
      {
        adjustmentId: 'ADJ-AV-18',
        claimId: 'CLM-AV-18',
        kind: 'avoidable_writeoff',
        amount: 900,
        year: 2026,
        quarter: 'Q1',
      } satisfies AdjustmentEvent,
    ],
  },
  legitimateBadDebt: {
    adjustments: [
      {
        adjustmentId: 'ADJ-BD-19',
        claimId: 'CLM-BD-19',
        kind: 'bad_debt',
        amount: 2200,
        year: 2026,
        quarter: 'Q1',
      } satisfies AdjustmentEvent,
    ],
  },
  chargeReversal: {
    adjustments: [
      {
        adjustmentId: 'ADJ-CRV-20',
        claimId: 'CLM-CRV-20',
        kind: 'charge_reversal',
        amount: -1100,
        year: 2026,
        quarter: 'Q2',
      } satisfies AdjustmentEvent,
    ],
  },
  multiPayerEncounter: {
    claim: {
      claimId: 'CLM-MP-21',
      encounterId: 'ENC-1021',
      hospital: 'H1',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-02-11' }],
      lines: [
        { lineId: 'L1', billed: 8000, allowed: 7000, paid: 7000, denied: 0, status: 'paid' },
        { lineId: 'L2', billed: 1500, allowed: 1500, paid: 900, denied: 0, status: 'partial' },
      ],
      payers: ['National Health Fund', 'Self-Pay / Patient'],
    } satisfies ClaimEvent,
  },
  zeroCollectibleAr: {
    claim: {
      claimId: 'CLM-ZAR-22',
      encounterId: 'ENC-1022',
      hospital: 'H5',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-30' }],
      lines: [
        { lineId: 'L1', billed: 2000, allowed: 0, paid: 0, denied: 0, status: 'paid' },
      ],
      payers: ['National Health Fund'],
    } satisfies ClaimEvent,
    adjustments: [
      {
        adjustmentId: 'ADJ-ZAR-22',
        claimId: 'CLM-ZAR-22',
        kind: 'contractual',
        amount: 2000,
        year: 2026,
        quarter: 'Q1',
      } satisfies AdjustmentEvent,
    ],
  },
  zeroAdjudicated: {
    claim: {
      claimId: 'CLM-ZADJ-23',
      encounterId: 'ENC-1023',
      hospital: 'H3',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'rejected', date: '2026-02-03' }],
      lines: [
        { lineId: 'L1', billed: 1800, allowed: 0, paid: 0, denied: 0, status: 'pending' },
      ],
      payers: ['Regional Mutual'],
    } satisfies ClaimEvent,
  },
  missingAuthorization: {
    claim: {
      claimId: 'CLM-MAUTH-24',
      encounterId: 'ENC-1024',
      hospital: 'H2',
      year: 2026,
      quarter: 'Q1',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-01-28' }],
      lines: [
        { lineId: 'L1', billed: 4500, allowed: 0, paid: 0, denied: 4500, status: 'denied', denialReason: 'Missing authorization', authStatus: 'missing' },
      ],
      payers: ['Cooperative Care'],
    } satisfies ClaimEvent,
  },
  expiredAuthorization: {
    claim: {
      claimId: 'CLM-EAUTH-25',
      encounterId: 'ENC-1025',
      hospital: 'H4',
      year: 2026,
      quarter: 'Q2',
      submissions: [{ attempt: 1, kind: 'first', clearinghouse: 'accepted', date: '2026-05-02' }],
      lines: [
        { lineId: 'L1', billed: 3800, allowed: 0, paid: 0, denied: 3800, status: 'denied', denialReason: 'Missing authorization', authStatus: 'expired' },
      ],
      payers: ['Employer Alliance'],
    } satisfies ClaimEvent,
  },
} as const;

export type RcmEventCaseId = keyof typeof RCM_EVENT_CASES;

/** Unique claim count from a claim event (always 1 per claimId). */
export function uniqueClaimCount(_claim: ClaimEvent): number {
  return 1;
}

/** Submission attempts including duplicates / resubmissions / corrections. */
export function submissionAttemptCount(claim: ClaimEvent): number {
  return claim.submissions.length;
}

/** Clearinghouse rejects are not payer denials. */
export function clearinghouseRejectCount(claim: ClaimEvent): number {
  return claim.submissions.filter((item) => item.clearinghouse === 'rejected').length;
}

/** Claim is a payer denial if any adjudicated line is denied or partial with denied amount. */
export function isPayerDenied(claim: ClaimEvent): boolean {
  const adjudicated = claim.lines.filter((line) => line.status !== 'pending');
  if (!adjudicated.length) return false;
  return adjudicated.some((line) => line.denied > 0 || line.status === 'denied');
}

export function isAdjudicated(claim: ClaimEvent): boolean {
  return claim.lines.some((line) => line.status !== 'pending');
}

export function billedTotal(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => total + line.billed, 0);
}

export function paidTotal(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => total + line.paid, 0);
}

export function deniedTotal(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => total + line.denied, 0);
}

export function allowedTotal(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => total + line.allowed, 0);
}

/** Underpayment = allowed − paid when paid < allowed and no denial on the line. */
export function underpaymentTotal(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => {
    if (line.denied > 0) return total;
    return total + Math.max(0, line.allowed - line.paid);
  }, 0);
}

/** Net from gross for a claim: billed − contractual (billed − allowed when allowed set). */
export function netFromGross(claim: ClaimEvent): number {
  return claim.lines.reduce((total, line) => total + (line.allowed > 0 || line.status === 'paid' || line.status === 'partial' ? line.allowed : 0), 0);
}

export function cashAppliedFromPayments(payments: readonly PaymentEvent[]): number {
  return payments
    .filter((item) => item.kind === 'application' || item.kind === 'reversal' || item.kind === 'refund')
    .filter((item) => item.appliedAt != null)
    .reduce((total, item) => total + item.amount, 0);
}

export function cashReceivedFromPayments(payments: readonly PaymentEvent[]): number {
  return payments
    .filter((item) => item.kind === 'application' || item.kind === 'unapplied' || item.kind === 'refund' || item.kind === 'credit')
    .reduce((total, item) => total + Math.max(0, item.amount), 0);
}

export function unappliedFromPayments(payments: readonly PaymentEvent[]): number {
  return payments.filter((item) => item.kind === 'unapplied' && item.appliedAt == null).reduce((total, item) => total + item.amount, 0);
}

/** Contractual allowances are never leakage. */
export function isLeakage(adjustment: AdjustmentEvent): boolean {
  return adjustment.kind === 'avoidable_writeoff' || adjustment.kind === 'underpayment';
}

export function isAuthDenial(claim: ClaimEvent): boolean {
  return claim.lines.some((line) => line.authStatus === 'missing' || line.authStatus === 'expired' || line.authStatus === 'rejected');
}
