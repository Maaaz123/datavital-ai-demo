import type { RcmView } from './rcmView';
import { RCM_CROSS_DOMAIN_FORBIDDEN } from './rcmOwnership';

export type Indicator = {
  domain: string;
  name: string;
  summary: string;
  status: 'constructed' | 'scenario' | 'unavailable';
  unit?: string;
  formula?: string;
  cohort?: string;
  aggregation?: string;
  scope?: string;
  classification?: string;
  limitations?: string;
  method?: string;
};

function row(
  domain: string,
  name: string,
  detail: Omit<Indicator, 'domain' | 'name' | 'summary' | 'status'> & { summary?: string },
): Indicator {
  return {
    domain,
    name,
    summary: detail.summary ?? detail.method ?? detail.formula ?? '',
    status: detail.classification === 'scenario' ? 'scenario' : 'constructed',
    ...detail,
  };
}

function blank(domain: string, name: string, summary: string): Indicator {
  return { domain, name, summary, status: 'unavailable' };
}

export function rcmIndicatorsFor(view: RcmView): Indicator[] {
  const m = view.methodology;
  const scope = view.periodLabel;
  const at = view.observationDate;
  return [
    // Command
    row('Command', 'Net Patient Revenue', {
      unit: 'SAR', formula: 'Gross charges − contractual allowances', cohort: 'Eligible billed encounters',
      aggregation: 'Sum of period flows', scope, classification: 'constructed',
      limitations: 'Recognized net revenue — not cash collected.', method: m.netRevenue,
    }),
    row('Command', 'Net Collection Rate', {
      unit: 'rate', formula: 'Cash applied ÷ net patient revenue', cohort: 'Same eligible period',
      aggregation: 'Ratio of period sums', scope, classification: 'constructed',
      limitations: 'Applied cash only — remittance receipts not yet applied are excluded.', method: m.cash,
    }),
    row('Command', 'Gross Denial Rate (Claim Count)', {
      unit: 'rate', formula: 'Denied unique claims ÷ adjudicated unique claims', cohort: 'Adjudicated claims',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Claim-count grain — distinct from denied value rate.', method: m.denialRate,
    }),
    row('Command', 'Days in Accounts Receivable', {
      unit: 'days', formula: 'Closing AR ÷ (net patient revenue ÷ days in period)', cohort: 'Period-end AR snapshot',
      aggregation: 'Snapshot ÷ daily revenue', scope: at, classification: 'constructed',
      limitations: 'Snapshot conversion speed — not a collection forecast.', method: m.arRollForward,
    }),
    row('Command', 'Outstanding Accounts Receivable', {
      unit: 'SAR', formula: 'Opening AR + new receivables − cash applied − adjustments − write-offs ± corrections',
      cohort: 'Billed receivables', aggregation: 'Period-end snapshot', scope: at, classification: 'constructed',
      limitations: 'Never a sum of monthly ending balances.', method: m.arRollForward,
    }),
    row('Command', 'Revenue at Risk', {
      unit: 'SAR', formula: 'Recoverable denial value + unbilled value + AR over 90 days', cohort: 'Denied, unbilled and aged AR',
      aggregation: 'Sum of exposure components', scope, classification: 'constructed',
      limitations: 'Exposure under recoverability caps — not collected cash and not a forecast.', method: 'Exposure view.',
    }),

    // Eligibility
    row('Eligibility', 'Eligibility Verification Rate', {
      unit: 'rate', formula: 'Verified eligibility responses ÷ encounters requiring verification', cohort: 'Encounters requiring verification',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Synthetic demo checks — no live payer eligibility transactions.', method: 'Verification coverage.',
    }),
    row('Eligibility', 'Coverage Exception Rate', {
      unit: 'rate', formula: 'Coverage exceptions ÷ verified eligibility responses', cohort: 'Verified responses',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Exceptions are administrative flags — not clinical eligibility decisions.', method: 'Exception share.',
    }),
    row('Eligibility', 'Pre-Authorization Approval Rate', {
      unit: 'rate', formula: 'Approved ÷ decided authorization requests', cohort: 'Decided requests',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Pending requests excluded; no live payer submission occurs in this demo.', method: 'Decided approvals.',
    }),
    row('Eligibility', 'Pending Authorizations', {
      unit: 'requests', formula: 'Opening pending + requested − decided', cohort: 'Open requests',
      aggregation: 'Period-end snapshot', scope: at, classification: 'constructed',
      limitations: 'Administrative backlog — not a statement about care delivery.', method: 'Closing pending stock.',
    }),
    row('Eligibility', 'Authorization Turnaround Time', {
      unit: 'days', formula: 'Volume-weighted mean days from request to decision', cohort: 'Decided requests',
      aggregation: 'Weighted mean', scope, classification: 'constructed',
      limitations: m.daysMeasures, method: m.daysMeasures,
    }),
    row('Eligibility', 'Authorization-Related Denial Exposure', {
      unit: 'SAR', formula: 'Denied value attributed to missing / expired / rejected authorization', cohort: 'Denied claim value',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Overlaps the denial totals on Claims — not additive to them.', method: 'Authorization-related denial value.',
    }),

    // Billing
    row('Billing', 'Charge Capture Rate', {
      unit: 'rate', formula: 'Captured billable charges ÷ eligible chargeable services', cohort: 'Chargeable delivered services',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Excludes nonbillable, bundled and cancelled services.', method: 'Capture coverage.',
    }),
    row('Billing', 'Unbilled Encounters', {
      unit: 'encounters', formula: 'Completed encounters without an invoice', cohort: 'Eligible completed encounters',
      aggregation: 'Period-end snapshot', scope: at, classification: 'constructed',
      limitations: 'Work-in-progress stock — not lost revenue.', method: 'Unbilled stock.',
    }),
    row('Billing', 'Unbilled Service Value', {
      unit: 'SAR', formula: 'Expected net value of unbilled chargeable services', cohort: 'Unbilled encounters',
      aggregation: 'Period-end snapshot', scope: at, classification: 'constructed',
      limitations: 'Expected net value — not gross charges and not cash.', method: 'Unbilled work-in-progress.',
    }),
    row('Billing', 'Charge-to-Bill Lag', {
      unit: 'days', formula: 'Volume-weighted mean days from charge post to invoice', cohort: 'Billed encounters',
      aggregation: 'Weighted mean', scope, classification: 'constructed',
      limitations: m.daysMeasures, method: m.daysMeasures,
    }),
    row('Billing', 'Coding Completion Rate', {
      unit: 'rate', formula: 'Encounters with completed coding ÷ encounters ready for coding', cohort: 'Ready for coding',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Operational completion — not a coding accuracy or audit result.', method: 'Coding completion.',
    }),
    row('Billing', 'Billing Exception Rate', {
      unit: 'rate', formula: 'Billing exceptions ÷ invoices created', cohort: 'Invoices created',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Exception reasons on this screen are an illustrative split.', method: 'Exception share.',
    }),

    // Claims
    row('Claims', 'Unique Claims Submitted', {
      unit: 'claims', formula: 'Distinct claim IDs with at least one submission', cohort: 'Submitted claims',
      aggregation: 'Count', scope, classification: 'constructed',
      limitations: m.claims, method: m.claims,
    }),
    row('Claims', 'First-Pass Acceptance Rate', {
      unit: 'rate', formula: 'Accepted on first submission ÷ unique claims', cohort: 'First submissions',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Clearinghouse reject ≠ payer denial. No live claims engine is connected.', method: 'First-pass share.',
    }),
    row('Claims', 'Denied Claims (Unique)', {
      unit: 'claims', formula: 'Unique adjudicated claims with a denial', cohort: 'Adjudicated claims',
      aggregation: 'Count', scope, classification: 'constructed',
      limitations: 'Counts unique claims — not denial lines or resubmissions.', method: m.denialRate,
    }),
    row('Claims', 'Denied Value Rate', {
      unit: 'rate', formula: 'Denied amount ÷ adjudicated amount', cohort: 'Adjudicated claim value',
      aggregation: 'Ratio of amounts', scope, classification: 'constructed',
      limitations: 'Value grain — can differ from the claim-count denial rate.', method: m.denialRate,
    }),
    row('Claims', 'Appeal Success Rate', {
      unit: 'rate', formula: 'Successful appeals ÷ decided appeals', cohort: 'Decided appeals',
      aggregation: 'Ratio of counts', scope, classification: 'constructed',
      limitations: 'Pending appeals excluded.', method: 'Decided appeals only.',
    }),
    row('Claims', 'Recoverable Denial Value', {
      unit: 'SAR', formula: 'Denied amount assessed recoverable under appeal rules', cohort: 'Denied claim value',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Assessed recoverability — simulated recovery ≠ collected cash.', method: 'Recoverable denied value.',
    }),

    // Collections
    row('Collections', 'Cash Applied', {
      unit: 'SAR', formula: 'Σ cash applied to encounter AR in period', cohort: 'Applied remittances',
      aggregation: 'Sum of period flows', scope, classification: 'constructed',
      limitations: 'Flow — distinct from cash received and from the AR snapshot.', method: m.cash,
    }),
    row('Collections', 'AR Over 90 Days', {
      unit: 'SAR', formula: 'AR in 91–120 and >120 day buckets', cohort: 'Closing AR',
      aggregation: 'Snapshot', scope: at, classification: 'constructed',
      limitations: m.aging, method: m.aging,
    }),
    row('Collections', 'Collection Effectiveness Index', {
      unit: 'rate', formula: 'Cash applied ÷ (opening AR + new receivables − approved adjustments)', cohort: 'Collectible receivables',
      aggregation: 'Ratio of amounts', scope, classification: 'constructed',
      limitations: 'Index of collectible cohorts — not the net collection rate.', method: 'CEI.',
    }),
    row('Collections', 'Unapplied Cash', {
      unit: 'SAR', formula: 'Cash received − cash applied', cohort: 'Remittances',
      aggregation: 'Period difference', scope, classification: 'constructed',
      limitations: 'Cash received ≠ cash applied; the YTD stock is reported separately.', method: m.cash,
    }),
    row('Collections', 'Payer Payment Delay', {
      unit: 'days', formula: 'Volume-weighted mean days from submission to payment', cohort: 'Paid claims',
      aggregation: 'Weighted mean', scope, classification: 'constructed',
      limitations: m.daysMeasures, method: m.daysMeasures,
    }),
    row('Collections', 'Patient Responsibility AR', {
      unit: 'SAR', formula: 'Closing AR owed by patients', cohort: 'Self-pay receivables',
      aggregation: 'Snapshot', scope: at, classification: 'constructed',
      limitations: 'Distinct from insurer AR; not equal to total outstanding AR.', method: 'Patient AR share.',
    }),

    // Leakage
    row('Leakage', 'Confirmed Revenue Leakage', {
      unit: 'SAR', formula: 'Missed charges + avoidable write-offs + underpayments', cohort: 'Exclusive leakage drivers',
      aggregation: 'Sum of exclusive drivers', scope, classification: 'constructed',
      limitations: 'Contractual adjustments are not leakage.', method: m.leakage,
    }),
    row('Leakage', 'Potential Leakage Exposure', {
      unit: 'SAR', formula: 'Suspected exposure under review', cohort: 'Unconfirmed items',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Not additive to confirmed leakage.', method: m.leakage,
    }),
    row('Leakage', 'Underpayment Value', {
      unit: 'SAR', formula: 'Allowed − paid on underpaid adjudicated lines', cohort: 'Adjudicated lines',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Contract variance with exclusive attribution.', method: 'Contract variance.',
    }),
    row('Leakage', 'Missed Charge Exposure', {
      unit: 'SAR', formula: 'Expected net of chargeable services not captured', cohort: 'Chargeable services',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Not every unmatched clinical event is a missed charge.', method: 'Missed capture value.',
    }),
    row('Leakage', 'Avoidable Write-offs', {
      unit: 'SAR', formula: 'Write-offs classified preventable', cohort: 'Write-offs',
      aggregation: 'Sum', scope, classification: 'constructed',
      limitations: 'Excludes contractual adjustments and nonrecoverable bad debt.', method: 'Preventable write-offs.',
    }),
    row('Leakage', 'Recovery Opportunity Count', {
      unit: 'items', formula: 'Open recovery work items with attributed value', cohort: 'Recovery worklist',
      aggregation: 'Count', scope, classification: 'constructed',
      limitations: 'Work items — not recovered amounts.', method: 'Recovery work items.',
    }),

    // Optimization
    row('Optimization', 'Recoverable Revenue Opportunity', {
      unit: 'SAR', formula: 'Eligible denial recovery + preventable leakage', cohort: 'Documented scenarios',
      aggregation: 'Modeled sum', scope, classification: 'scenario',
      limitations: m.optimization, method: m.optimization,
    }),
    row('Optimization', 'Eligible Denial Recovery', {
      unit: 'SAR', formula: 'Recoverable denial value × appeal-recovery assumption', cohort: 'Recoverable denials',
      aggregation: 'Modeled', scope, classification: 'scenario',
      limitations: 'Simulated recovery ≠ collected cash.', method: 'Denials-down scenario.',
    }),
    row('Optimization', 'Collection Improvement Potential', {
      unit: 'SAR', formula: 'First-pass uplift + unbilled-release value', cohort: 'Timing scenarios',
      aggregation: 'Modeled', scope, classification: 'scenario',
      limitations: 'Timing acceleration — not new recognized revenue.', method: 'Collection scenarios.',
    }),
    row('Optimization', 'Preventable Leakage', {
      unit: 'SAR', formula: 'Capturable missed charges + recoverable underpayments + avoidable write-offs', cohort: 'Confirmed leakage drivers',
      aggregation: 'Modeled', scope, classification: 'scenario',
      limitations: 'Contractual adjustments are never leakage. Illustrative — not guaranteed.', method: 'Leakage scenarios.',
    }),
    row('Optimization', 'Cash Acceleration Opportunity', {
      unit: 'SAR', formula: 'Earlier collection of aged AR', cohort: 'AR over 60 days',
      aggregation: 'Modeled', scope, classification: 'scenario',
      limitations: 'Timing shift only — not additional revenue.', method: 'AR acceleration scenario.',
    }),

    ...RCM_CROSS_DOMAIN_FORBIDDEN.map((name) => blank(
      'Cross-domain context',
      name,
      'Owned by Domains 1–11 — not restated as a Revenue Cycle Management headline.',
    )),
  ];
}

export const RCM_AI_CASES = [
  { id: 'rcm-denials-down', name: 'Prioritize preventable denial appeals', level: 'Scenario', limit: 'Simulated recovery ≠ collected cash' },
  { id: 'rcm-first-pass-up', name: 'Flag claim-scrubber edits before submission', level: 'Scenario', limit: 'No live payer or clearinghouse submission' },
  { id: 'rcm-ar-accelerate', name: 'Rank aged AR for collector follow-up', level: 'Scenario', limit: 'Timing shift — not new revenue' },
  { id: 'rcm-auth-up', name: 'Surface authorization requests at risk of delay', level: 'Scenario', limit: 'Administrative queue only — not a care decision' },
  { id: 'rcm-capture-up', name: 'Detect likely missed-charge patterns', level: 'Scenario', limit: 'Candidates need human charge review' },
  { id: 'rcm-underpay-recover', name: 'Compare paid vs contracted allowed amounts', level: 'Scenario', limit: 'Contract variance — contractual adjustments are not leakage' },
  { id: 'rcm-writeoff-down', name: 'Escalate avoidable write-offs earlier', level: 'Scenario', limit: 'Bad debt and contractual write-offs excluded' },
  { id: 'rcm-workflow-up', name: 'Clear coding and billing exceptions faster', level: 'Scenario', limit: 'Operational workflow — not an ERP or audit tool' },
];
