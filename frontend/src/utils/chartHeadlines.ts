/**
 * Data-driven chart headlines — computed from series values, never invented causation.
 */

export function seriesLast(values: Array<number | null | undefined> | undefined): number | null {
  if (!values?.length) return null;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const n = Number(values[i]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function seriesDelta(values: Array<number | null | undefined> | undefined): number | null {
  if (!values || values.length < 2) return null;
  const last = seriesLast(values);
  const prev = seriesLast(values.slice(0, -1));
  if (last == null || prev == null) return null;
  return last - prev;
}

export function seriesPctChange(values: Array<number | null | undefined> | undefined): number | null {
  if (!values || values.length < 2) return null;
  const last = seriesLast(values);
  const first = Number(values.find((v) => Number.isFinite(Number(v))));
  if (last == null || !Number.isFinite(first) || first === 0) return null;
  return ((last - first) / Math.abs(first)) * 100;
}

/** Compare first-half vs second-half means for a gentle directional headline. */
export function halfPeriodChange(values: Array<number | null | undefined> | undefined): number | null {
  const nums = (values ?? []).map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length < 4) return seriesPctChange(values);
  const mid = Math.floor(nums.length / 2);
  const a = nums.slice(0, mid);
  const b = nums.slice(mid);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(a);
  const mb = mean(b);
  if (ma === 0) return null;
  return ((mb - ma) / Math.abs(ma)) * 100;
}

export function formatCompact(n: number, unit?: string): string {
  const abs = Math.abs(n);
  let body: string;
  if (abs >= 1_000_000) body = `${(n / 1_000_000).toFixed(1)}M`;
  else if (abs >= 10_000) body = `${(n / 1_000).toFixed(1)}K`;
  else body = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
  return unit ? `${body}${unit}` : body;
}

/**
 * Build a restrained headline from measured direction.
 * Does not claim clinical causation.
 */
export function buildTrendHeadline(opts: {
  label: string;
  values?: Array<number | null | undefined>;
  /** When true, an increase is favorable (collection rate). When false, increase is concerning (wait, denial). */
  higherIsBetter?: boolean;
  unit?: string;
}): string | null {
  const change = halfPeriodChange(opts.values);
  const last = seriesLast(opts.values);
  if (change == null || last == null) return null;
  const improved = opts.higherIsBetter ? change > 1 : change < -1;
  const worsened = opts.higherIsBetter ? change < -1 : change > 1;
  const mag = Math.abs(change).toFixed(0);
  if (improved) {
    return `${opts.label} improved about ${mag}% across the selected period (latest ${formatCompact(last, opts.unit)}).`;
  }
  if (worsened) {
    return `${opts.label} worsened about ${mag}% across the selected period (latest ${formatCompact(last, opts.unit)}).`;
  }
  return `${opts.label} is relatively stable (latest ${formatCompact(last, opts.unit)}).`;
}

export function buildDenialParetoHeadline(
  rows: Array<{ reason?: string; amount?: number }> | undefined,
): string | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const top = sorted[0];
  const amount = top?.amount ?? 0;
  if (!top?.reason || !(amount > 0)) return null;
  const total = sorted.reduce((s, r) => s + (r.amount ?? 0), 0);
  const share = total > 0 ? ((amount / total) * 100).toFixed(0) : null;
  return share
    ? `${top.reason} accounts for ~${share}% of denied amount in this period.`
    : `${top.reason} is the largest denial reason by amount.`;
}

export function buildWaitConcernHeadline(opts: {
  waitByTriage?: Array<{ triage?: string | number; minutes?: number }>;
  avgWait?: number | null;
}): string | null {
  const rows = opts.waitByTriage ?? [];
  if (rows.length) {
    const worst = [...rows].sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))[0];
    if (worst && (worst.minutes ?? 0) > 0) {
      return `Longest mean wait is triage ${worst.triage} at ${formatCompact(worst.minutes!)} min — prioritize that acuity band.`;
    }
  }
  if (opts.avgWait != null && Number.isFinite(opts.avgWait)) {
    return `Period mean arrival-to-physician wait is ${formatCompact(opts.avgWait)} min.`;
  }
  return null;
}
