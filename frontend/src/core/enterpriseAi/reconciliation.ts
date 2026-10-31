/**
 * Cross-domain reconciliation gate for Domain 16 Enterprise AI.
 * Compares existing domain views — never invents a parallel ledger.
 */
import type { ReportPeriod } from '../period';
import { buildIcuView } from '../icuView';
import { buildRcmView } from '../rcmView';
import { buildScView } from '../supplyChainView';
import { buildStView } from '../strategyView';
import type { ReconciliationResult } from './types';

export type ReconcileContext = {
  hospital: string;
  year: number;
  period?: ReportPeriod;
};

function ctxPeriod(ctx: ReconcileContext): ReportPeriod {
  return ctx.period ?? 'year';
}

function result(
  ok: boolean,
  left: ReconciliationResult['left'],
  right: ReconciliationResult['right'],
  note: string,
): ReconciliationResult {
  const delta =
    left.value == null || right.value == null ? null : right.value - left.value;
  return { ok, left, right, note, delta };
}

/** P0-001 — Strategy recognized revenue must equal RCM net patient revenue. */
export function reconcileRcmStrategyRevenue(ctx: ReconcileContext): ReconciliationResult {
  const period = ctxPeriod(ctx);
  const rcm = buildRcmView(ctx.hospital, ctx.year, period);
  const st = buildStView(ctx.hospital, ctx.year, period);
  const left = {
    id: 'rcm.net_patient_revenue',
    value: rcm.netPatientRevenue,
    label: 'RCM net patient revenue',
  };
  const right = {
    id: 'st.recognized_net_revenue',
    value: st.recognizedNetRevenue,
    label: 'Strategy recognized net revenue',
  };
  const ok = left.value === right.value;
  return result(
    ok,
    left,
    right,
    ok
      ? 'RCM NPR === Strategy recognized revenue (P0-001 lineage intact).'
      : `Revenue mismatch: RCM ${left.value} vs Strategy ${right.value}. Strategy must not invent an independent ledger.`,
  );
}

/** P1-005 — Strategy ICU gap mirror must equal ICU view staffing gap. */
export function reconcileIcuStrategyGap(ctx: ReconcileContext): ReconciliationResult {
  const period = ctxPeriod(ctx);
  const icu = buildIcuView(ctx.hospital, ctx.year, period);
  const st = buildStView(ctx.hospital, ctx.year, period);
  const left = {
    id: 'icu.staffing_gap_hours',
    value: icu.staffingGapHours,
    label: 'ICU credentialed nurse-hour gap',
  };
  const right = {
    id: 'st.icu_staffing_gap_hours',
    value: st.icuStaffingGapHours,
    label: 'Strategy-mirrored ICU staffing gap',
  };
  const ok = left.value === right.value;
  const enterprise = st.enterpriseStaffingGapHours;
  return result(
    ok,
    left,
    right,
    ok
      ? `ICU gap parity OK. Enterprise gap ${enterprise} h is a distinct scope (surplus ≠ automatic ICU fill).`
      : `ICU gap mismatch: ICU ${left.value} vs Strategy mirror ${right.value}.`,
  );
}

/** P1-001 — Supply availability and OTD must stay in [0, 1]. */
export function reconcileScAvailabilityBounds(ctx: ReconcileContext): ReconciliationResult {
  const period = ctxPeriod(ctx);
  const sc = buildScView(ctx.hospital, ctx.year, period);
  const availability = sc.supplyAvailability;
  const otd = sc.supplierOtd;
  const availOk = availability >= 0 && availability <= 1;
  const otdOk = otd >= 0 && otd <= 1;
  const ok = availOk && otdOk;
  return result(
    ok,
    {
      id: 'sc.supply_availability',
      value: availability,
      label: 'Supply availability',
    },
    {
      id: 'sc.supplier_otd',
      value: otd,
      label: 'Supplier on-time delivery',
    },
    ok
      ? 'SC rates ∈ [0,1] (P1-001). Monthly chart series remain 0–100 percent points separately.'
      : `SC rate bounds violated: availability=${availability}, OTD=${otd}.`,
  );
}

/** Convenience: run the Stage 1 reconciliation gate set. */
export function runStage1ReconciliationGate(ctx: ReconcileContext): {
  ok: boolean;
  checks: ReconciliationResult[];
} {
  const checks = [
    reconcileRcmStrategyRevenue(ctx),
    reconcileIcuStrategyGap(ctx),
    reconcileScAvailabilityBounds(ctx),
  ];
  return { ok: checks.every((check) => check.ok), checks };
}
