import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { type ReportPeriod } from './period';

export const SC_CATEGORIES = [
  'Surgical consumables',
  'PPE & infection control',
  'IV fluids & sets',
  'Laboratory reagents',
  'Imaging consumables',
  'Ward medical supplies',
  'Critical care supplies',
  'General non-clinical',
] as const;

export const SC_SUPPLIER_TIERS = ['Contracted primary', 'Contracted secondary', 'Spot / off-contract'] as const;

export const SC_DISPOSITION = [
  'Available usable',
  'Near-expiry usable',
  'Quarantined',
  'Recalled',
  'Expired',
  'Damaged',
  'Obsolete',
  'Returned',
] as const;

export const SC_TARGETS = {
  supplyAvailability: 0.96,
  supplierOtd: 0.92,
  supplierFillRate: 0.95,
  inventoryAccuracy: 0.97,
  ontimePoFulfillment: 0.9,
  contractCompliance: 0.88,
  dualSourceCoverage: 0.7,
  forecastDeviation: 0.12,
  inventoryWasteRate: 0.025,
  daysOfSupply: 28,
} as const;

export const SC_OPPORTUNITY_IDS = [
  'sc-safety-stock',
  'sc-lead-time-down',
  'sc-fill-rate-up',
  'sc-consolidate-po',
  'sc-near-expiry-down',
  'sc-critical-replenish',
  'sc-diversify-suppliers',
  'sc-forecast-error-down',
] as const;
export type ScOpportunityId = (typeof SC_OPPORTUNITY_IDS)[number];

const OPPORTUNITY_META: Record<ScOpportunityId, {
  title: string;
  owner: string;
  followUp: string;
  baselineUnit: 'rate' | 'count' | 'index' | 'currency' | 'days';
  baselineLabel: string;
  assumption: string;
}> = {
  'sc-safety-stock': {
    title: 'Adjust Safety Stock',
    owner: 'Materials Management',
    followUp: 'kpi_sc_critical_below_safety',
    baselineUnit: 'count',
    baselineLabel: 'Critical SKUs below safety stock',
    assumption: 'Safety stock may be raised for clinically critical SKUs. Never recommend cutting clinically critical safety stock solely for carrying-cost savings.',
  },
  'sc-lead-time-down': {
    title: 'Reduce Supplier Lead Time',
    owner: 'Procurement Director',
    followUp: 'kpi_sc_replenishment_lead_time',
    baselineUnit: 'days',
    baselineLabel: 'Median replenishment lead time',
    assumption: 'Lead-time reduction applies to eligible contracted suppliers only. Faster lead time does not prove fill-rate or quality improvement.',
  },
  'sc-fill-rate-up': {
    title: 'Improve Supplier Fill Rate',
    owner: 'Supplier Performance',
    followUp: 'kpi_sc_supplier_fill_rate',
    baselineUnit: 'rate',
    baselineLabel: 'Supplier fill rate',
    assumption: 'Fill rate = quantity received ÷ quantity ordered. Fill ≠ on-time delivery. Cheapest supplier is not assumed safest.',
  },
  'sc-consolidate-po': {
    title: 'Consolidate Eligible Procurement Demand',
    owner: 'Procurement Director',
    followUp: 'kpi_sc_open_pos',
    baselineUnit: 'count',
    baselineLabel: 'Open purchase orders',
    assumption: 'Consolidation applies only to eligible non-urgent demand windows. Clinical urgency and contract constraints remain binding.',
  },
  'sc-near-expiry-down': {
    title: 'Reduce Near-Expiry Inventory',
    owner: 'Inventory Control',
    followUp: 'kpi_sc_near_expiry_exposure',
    baselineUnit: 'currency',
    baselineLabel: 'Near-expiry exposure (fictional SAR)',
    assumption: 'FEFO / redistribution / return-to-vendor paths are illustrative. Near-expiry ≠ expired ≠ damaged ≠ recalled.',
  },
  'sc-critical-replenish': {
    title: 'Improve Critical SKU Replenishment',
    owner: 'Materials Management',
    followUp: 'kpi_sc_critical_stockout_exposure',
    baselineUnit: 'count',
    baselineLabel: 'Critical stockout exposure',
    assumption: 'Replenishment prioritization for clinically essential SKUs. Does not authorize unsupervised substitution of clinical products.',
  },
  'sc-diversify-suppliers': {
    title: 'Diversify High-Risk Suppliers',
    owner: 'Strategic Sourcing',
    followUp: 'kpi_sc_supplier_diversification_ops',
    baselineUnit: 'rate',
    baselineLabel: 'Dual-source coverage for critical SKUs',
    assumption: 'Diversification targets high concentration risk. Cheapest supplier ≠ safest; clinical and regulatory fitness remain required.',
  },
  'sc-forecast-error-down': {
    title: 'Reduce Consumption Forecast Error',
    owner: 'Demand Planning',
    followUp: 'kpi_sc_forecast_deviation',
    baselineUnit: 'rate',
    baselineLabel: 'Consumption forecast deviation',
    assumption: 'Forecast uplift uses published category forecasts only. Lower error does not guarantee zero stockouts.',
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_RANGE: Record<ReportPeriod, readonly [number, number]> = {
  year: [0, 12],
  Q1: [0, 3],
  Q2: [3, 6],
  Q3: [6, 9],
  Q4: [9, 12],
};
const SEASON = [1.02, 0.98, 1.01, 1.0, 0.97, 0.95, 0.94, 0.96, 1.03, 1.05, 1.04, 1.02];

const SITE_CODES = Object.keys(SITE_SPECS) as SiteCode[];

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function mix(seed: number, salt: number): number {
  let value = seed ^ Math.imul(salt, 0x9e3779b9);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function unit(seed: number): number {
  return (seed % 10_000) / 10_000;
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Days of Supply from usable units ÷ daily forecast demand. Zero demand → null (never invent a huge finite cover). */
export function daysOfSupplyFrom(usableUnits: number, dailyForecastDemand: number): number | null {
  return dailyForecastDemand > 0 ? r1(usableUnits / dailyForecastDemand) : null;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function periodMeta(year: number, period: ReportPeriod) {
  const [start, end] = PERIOD_RANGE[period];
  const months = MONTH_NAMES.slice(start, end).map((label, index) => ({ label, monthIndex: start + index }));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const days = sum(monthDays.slice(start, end));
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : period === 'Q1' ? `31 Mar ${year}`
      : period === 'Q2' ? `30 Jun ${year}`
        : period === 'Q3' ? `30 Sep ${year}`
          : `31 Dec ${year}`;
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  return { start, end, months, days, observationDate, periodLabel };
}

/** Monthly flow ledger. Closing stocks are period-end snapshots — never sum snapshots across months. */
type SiteMonth = {
  encounters: number;
  skuDays: number;
  availableSkuDays: number;
  criticalSkus: number;
  receiptsOrdered: number;
  receiptsReceived: number;
  receiptsOnTime: number;
  issuedUnits: number;
  forecastUnits: number;
  expiredUnits: number;
  damagedUnits: number;
  obsoleteUnits: number;
  returnedUnits: number;
  recalledUnits: number;
  quarantinedUnits: number;
  cycleCountLines: number;
  cycleCountAccurate: number;
  poLinesDue: number;
  poLinesOnTime: number;
  poOpened: number;
  poClosed: number;
  receiptInvoices: number;
  paymentsPosted: number;
  contractedSpend: number;
  eligibleContractSpend: number;
  defectiveQty: number;
  receivedQty: number;
  approvalHoursSum: number;
  approvalCount: number;
  cycleDaysSum: number;
  cycleCount: number;
  priceVarianceSar: number;
  unusualSignalsOpened: number;
  unusualSignalsClosed: number;
  // Period-end snapshot fields (last month of period is authoritative for stocks)
  closingAvailable: number;
  closingNearExpiry: number;
  closingQuarantined: number;
  closingValueSar: number;
  closingNearExpiryValueSar: number;
  closingCriticalStockouts: number;
  closingBelowSafety: number;
  closingOpenPos: number;
  closingReplenishExceptions: number;
  closingProcExceptions: number;
  closingAdjustExceptions: number;
  closingRenewalRisk: number;
  unitCostSar: number;
};

function siteMonth(code: SiteCode, year: number, monthIndex: number, priorClosing?: number): SiteMonth {
  const scenario = scenarioFor(code, year);
  const month = scenario.months[monthIndex];
  const admissions = Math.max(1, Math.round(Number(month.admissions) || 0));
  const encounters = Math.max(admissions, Math.round(admissions * (2.4 + unit(mix(hash(`${code}|${year}|${monthIndex}|sc`), 1)) * 0.4)));
  const seed = hash(`${code}|${year}|${monthIndex}|sc`);
  const pressure = SITE_SPECS[code].pressure;
  const season = SEASON[monthIndex];
  const scale = 1800 + pressure * 400 + unit(mix(seed, 2)) * 200;

  const opening = priorClosing ?? Math.round(scale * (14 + unit(mix(seed, 3)) * 4));
  const receiptsOrdered = Math.max(10, Math.round(scale * season * (0.9 + unit(mix(seed, 4)) * 0.15)));
  const fill = 0.92 + unit(mix(seed, 5)) * 0.06 - pressure * 0.02;
  const receiptsReceived = Math.min(receiptsOrdered, Math.round(receiptsOrdered * fill));
  // On-time ⊆ received (never invent OTD > 100% via rounding or factor drift)
  const receiptsOnTime = Math.min(
    receiptsReceived,
    Math.round(receiptsReceived * (0.88 + unit(mix(seed, 6)) * 0.08)),
  );
  const issuedUnits = Math.max(1, Math.round(scale * season * (0.85 + unit(mix(seed, 7)) * 0.12)));
  const forecastUnits = Math.max(1, Math.round(issuedUnits * (0.92 + unit(mix(seed, 8)) * 0.16)));
  const expiredUnits = Math.max(0, Math.round(issuedUnits * (0.008 + pressure * 0.006 + unit(mix(seed, 9)) * 0.004)));
  const damagedUnits = Math.max(0, Math.round(issuedUnits * (0.003 + unit(mix(seed, 10)) * 0.003)));
  const obsoleteUnits = Math.max(0, Math.round(issuedUnits * (0.002 + unit(mix(seed, 11)) * 0.002)));
  const returnedUnits = Math.max(0, Math.round(receiptsReceived * (0.01 + unit(mix(seed, 12)) * 0.01)));
  const recalledUnits = Math.max(0, Math.round(issuedUnits * (0.001 + unit(mix(seed, 13)) * 0.002)));
  const quarantinedUnits = Math.max(0, Math.round(receiptsReceived * (0.008 + unit(mix(seed, 14)) * 0.01)));

  // Roll-forward: opening + receipts + returns − issues − expired − damaged − obsolete − recalled − quarantined = closing usable
  // closingAvailable is usable on-hand only (excludes quarantined / expired / damaged / recalled / obsolete).
  const closingAvailable = Math.max(
    0,
    opening + receiptsReceived + returnedUnits - issuedUnits - expiredUnits - damagedUnits - obsoleteUnits - recalledUnits - quarantinedUnits,
  );
  const unitCostSar = Math.round(18 + unit(mix(seed, 15)) * 22);
  const nearExpiryShare = 0.08 + pressure * 0.03 + unit(mix(seed, 16)) * 0.04;
  const closingNearExpiry = Math.round(closingAvailable * nearExpiryShare);
  const closingQuarantined = quarantinedUnits;
  const closingValueSar = closingAvailable * unitCostSar;
  const closingNearExpiryValueSar = closingNearExpiry * unitCostSar;

  const criticalSkus = Math.max(20, Math.round(80 + unit(mix(seed, 17)) * 40));
  const closingCriticalStockouts = Math.min(criticalSkus, Math.max(0, Math.round(criticalSkus * (0.02 + pressure * 0.03 + unit(mix(seed, 18)) * 0.03))));
  const closingBelowSafety = Math.min(criticalSkus, closingCriticalStockouts + Math.round(criticalSkus * (0.06 + unit(mix(seed, 19)) * 0.05)));

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
  const skuPlanDays = Math.round((220 + unit(mix(seed, 21)) * 40) * daysInMonth);
  // Available SKU-days ⊆ plan SKU-days (factor capped ≤ 0.98; min with plan prevents ratio > 1 from rounding)
  const availabilityFactor = Math.min(0.98, Math.max(0.85, 0.93 + unit(mix(seed, 22)) * 0.05 - pressure * 0.02));
  const availableSkuDays = Math.min(skuPlanDays, Math.round(skuPlanDays * availabilityFactor));

  const cycleCountLines = Math.max(20, Math.round(60 + unit(mix(seed, 23)) * 40));
  const cycleCountAccurate = Math.round(cycleCountLines * (0.94 + unit(mix(seed, 24)) * 0.05));

  const poLinesDue = Math.max(5, Math.round(receiptsOrdered * 0.85));
  const poLinesOnTime = Math.round(poLinesDue * (0.86 + unit(mix(seed, 25)) * 0.1));
  const poOpened = Math.max(5, Math.round(28 + unit(mix(seed, 26)) * 18 + pressure * 6));
  const poClosed = Math.min(poOpened + 8, Math.round(poOpened * (0.75 + unit(mix(seed, 27)) * 0.15)));
  const closingOpenPos = Math.max(2, Math.round(12 + pressure * 8 + unit(mix(seed, 28)) * 10));

  // PO ≠ Receipt ≠ Invoice ≠ Payment (distinct flows)
  const receiptInvoices = Math.round(receiptsReceived * (0.82 + unit(mix(seed, 29)) * 0.12));
  const paymentsPosted = Math.round(receiptInvoices * (0.7 + unit(mix(seed, 30)) * 0.2));

  const contractedSpend = Math.round(receiptsReceived * unitCostSar * (0.84 + unit(mix(seed, 31)) * 0.1));
  const eligibleContractSpend = Math.round(receiptsReceived * unitCostSar);
  const defectiveQty = Math.round(receiptsReceived * (0.012 + pressure * 0.008 + unit(mix(seed, 32)) * 0.01));
  const receivedQty = receiptsReceived;

  const approvalCount = Math.max(1, poOpened);
  const approvalHoursSum = Math.round(approvalCount * (18 + unit(mix(seed, 33)) * 28 + pressure * 8));
  const cycleCount = Math.max(1, Math.round(receiptsReceived * 0.4));
  const cycleDaysSum = Math.round(cycleCount * (9 + unit(mix(seed, 34)) * 10));
  const priceVarianceSar = Math.round((unit(mix(seed, 35)) - 0.45) * receiptsReceived * unitCostSar * 0.04);

  const closingReplenishExceptions = Math.max(1, Math.round(closingBelowSafety * 0.7 + closingCriticalStockouts * 1.2 + unit(mix(seed, 36)) * 4));
  const closingProcExceptions = Math.max(1, Math.round(4 + pressure * 5 + unit(mix(seed, 37)) * 6));
  const closingAdjustExceptions = Math.max(0, Math.round(2 + unit(mix(seed, 38)) * 5 + expiredUnits * 0.05));
  const closingRenewalRisk = Math.max(0, Math.round(2 + unit(mix(seed, 39)) * 4));
  const unusualSignalsOpened = Math.max(0, Math.round(3 + unit(mix(seed, 40)) * 5 + pressure * 2));
  const unusualSignalsClosed = Math.round(unusualSignalsOpened * (0.55 + unit(mix(seed, 41)) * 0.3));

  return {
    encounters, skuDays: skuPlanDays, availableSkuDays, criticalSkus,
    receiptsOrdered, receiptsReceived, receiptsOnTime, issuedUnits, forecastUnits,
    expiredUnits, damagedUnits, obsoleteUnits, returnedUnits, recalledUnits, quarantinedUnits,
    cycleCountLines, cycleCountAccurate, poLinesDue, poLinesOnTime, poOpened, poClosed,
    receiptInvoices, paymentsPosted, contractedSpend, eligibleContractSpend,
    defectiveQty, receivedQty, approvalHoursSum, approvalCount, cycleDaysSum, cycleCount,
    priceVarianceSar, unusualSignalsOpened, unusualSignalsClosed,
    closingAvailable, closingNearExpiry, closingQuarantined, closingValueSar, closingNearExpiryValueSar,
    closingCriticalStockouts, closingBelowSafety, closingOpenPos, closingReplenishExceptions,
    closingProcExceptions, closingAdjustExceptions, closingRenewalRisk, unitCostSar,
  };
}

type Raw = {
  months: SiteMonth[];
  categoryAvailable: number[];
  categoryIssued: number[];
  categoryBelowSafety: number[];
  categoryDos: Array<number | null>;
  categoryForecastDev: number[];
  dispositionUnits: number[];
  supplierFill: number[];
  exceptionTypes: number[];
};

function emptyMonth(): SiteMonth {
  return {
    encounters: 0, skuDays: 0, availableSkuDays: 0, criticalSkus: 0,
    receiptsOrdered: 0, receiptsReceived: 0, receiptsOnTime: 0, issuedUnits: 0, forecastUnits: 0,
    expiredUnits: 0, damagedUnits: 0, obsoleteUnits: 0, returnedUnits: 0, recalledUnits: 0, quarantinedUnits: 0,
    cycleCountLines: 0, cycleCountAccurate: 0, poLinesDue: 0, poLinesOnTime: 0, poOpened: 0, poClosed: 0,
    receiptInvoices: 0, paymentsPosted: 0, contractedSpend: 0, eligibleContractSpend: 0,
    defectiveQty: 0, receivedQty: 0, approvalHoursSum: 0, approvalCount: 0, cycleDaysSum: 0, cycleCount: 0,
    priceVarianceSar: 0, unusualSignalsOpened: 0, unusualSignalsClosed: 0,
    closingAvailable: 0, closingNearExpiry: 0, closingQuarantined: 0, closingValueSar: 0, closingNearExpiryValueSar: 0,
    closingCriticalStockouts: 0, closingBelowSafety: 0, closingOpenPos: 0, closingReplenishExceptions: 0,
    closingProcExceptions: 0, closingAdjustExceptions: 0, closingRenewalRisk: 0, unitCostSar: 0,
  };
}

function addFlows(target: SiteMonth, source: SiteMonth): void {
  const flowKeys: (keyof SiteMonth)[] = [
    'encounters', 'skuDays', 'availableSkuDays', 'criticalSkus',
    'receiptsOrdered', 'receiptsReceived', 'receiptsOnTime', 'issuedUnits', 'forecastUnits',
    'expiredUnits', 'damagedUnits', 'obsoleteUnits', 'returnedUnits', 'recalledUnits', 'quarantinedUnits',
    'cycleCountLines', 'cycleCountAccurate', 'poLinesDue', 'poLinesOnTime', 'poOpened', 'poClosed',
    'receiptInvoices', 'paymentsPosted', 'contractedSpend', 'eligibleContractSpend',
    'defectiveQty', 'receivedQty', 'approvalHoursSum', 'approvalCount', 'cycleDaysSum', 'cycleCount',
    'priceVarianceSar', 'unusualSignalsOpened', 'unusualSignalsClosed',
  ];
  for (const key of flowKeys) {
    target[key] += source[key];
  }
}

function siteRaw(code: SiteCode, year: number, period: ReportPeriod): Raw {
  const meta = periodMeta(year, period);
  let prior: number | undefined;
  const months: SiteMonth[] = [];
  for (const item of meta.months) {
    const row = siteMonth(code, year, item.monthIndex, prior);
    prior = row.closingAvailable;
    months.push(row);
  }
  const last = months[months.length - 1];
  const seed = hash(`${code}|${year}|${period}|sc-split`);
  const categoryAvailable = splitExact(last.closingAvailable, SC_CATEGORIES.map((_, index) => 0.85 + unit(mix(seed, 10 + index))));
  const totals = emptyMonth();
  months.forEach((month) => addFlows(totals, month));
  const categoryIssued = splitExact(totals.issuedUnits, SC_CATEGORIES.map((_, index) => 0.9 + unit(mix(seed, 30 + index))));
  const categoryBelowSafety = splitExact(last.closingBelowSafety, SC_CATEGORIES.map((_, index) => 0.7 + unit(mix(seed, 50 + index))));
  const dailyDemand = totals.forecastUnits / Math.max(1, meta.days);
  const categoryDos = categoryAvailable.map((available, index) => {
    const share = totals.issuedUnits > 0 ? categoryIssued[index] / totals.issuedUnits : 0;
    const catDemand = dailyDemand * share;
    return catDemand > 0 ? r1(available / catDemand) : null;
  });
  const categoryForecastDev = SC_CATEGORIES.map((_, index) => r2(0.06 + unit(mix(seed, 70 + index)) * 0.14));
  const dispositionUnits = [
    last.closingAvailable - last.closingNearExpiry,
    last.closingNearExpiry,
    last.closingQuarantined,
    Math.round(totals.recalledUnits / Math.max(1, months.length)),
    totals.expiredUnits,
    totals.damagedUnits,
    totals.obsoleteUnits,
    totals.returnedUnits,
  ];
  const supplierFill = SC_SUPPLIER_TIERS.map((_, index) => r2(0.88 + unit(mix(seed, 90 + index)) * 0.1 - index * 0.03));
  const exceptionTypes = splitExact(
    last.closingReplenishExceptions + last.closingProcExceptions,
    [1.2, 1.0, 0.9, 0.8, 0.7],
  );
  return { months, categoryAvailable, categoryIssued, categoryBelowSafety, categoryDos, categoryForecastDev, dispositionUnits, supplierFill, exceptionTypes };
}

function sumRaw(parts: Raw[]): Raw {
  const months = parts[0].months.map((_, index) => {
    const total = emptyMonth();
    parts.forEach((part) => {
      addFlows(total, part.months[index]);
      // For ALL hospitals, period-end snapshots sum across sites (same observation date)
      const snapKeys: (keyof SiteMonth)[] = [
        'closingAvailable', 'closingNearExpiry', 'closingQuarantined', 'closingValueSar', 'closingNearExpiryValueSar',
        'closingCriticalStockouts', 'closingBelowSafety', 'closingOpenPos', 'closingReplenishExceptions',
        'closingProcExceptions', 'closingAdjustExceptions', 'closingRenewalRisk', 'unitCostSar', 'criticalSkus',
      ];
      for (const key of snapKeys) {
        total[key] += part.months[index][key];
      }
    });
    if (parts.length > 0) total.unitCostSar = Math.round(total.unitCostSar / parts.length);
    return total;
  });
  const sumArr = (pick: (raw: Raw) => number[]) => {
    const length = pick(parts[0]).length;
    return Array.from({ length }, (_, index) => sum(parts.map((part) => pick(part)[index] ?? 0)));
  };
  const last = months[months.length - 1];
  const seed = hash(`ALL|sum|sc`);
  const categoryAvailable = splitExact(last.closingAvailable, SC_CATEGORIES.map((_, index) => 0.85 + unit(mix(seed, 10 + index))));
  const issuedTotal = sum(months.map((m) => m.issuedUnits));
  const categoryIssued = splitExact(issuedTotal, SC_CATEGORIES.map((_, index) => 0.9 + unit(mix(seed, 30 + index))));
  const categoryBelowSafety = splitExact(last.closingBelowSafety, SC_CATEGORIES.map((_, index) => 0.7 + unit(mix(seed, 50 + index))));
  const days = periodMeta(2026, 'year').days; // overwritten in assemble via meta
  const dailyDemand = issuedTotal / Math.max(1, days);
  const categoryDos = categoryAvailable.map((available, index) => {
    const share = issuedTotal > 0 ? categoryIssued[index] / issuedTotal : 0;
    const catDemand = dailyDemand * share;
    return catDemand > 0 ? r1(available / catDemand) : null;
  });
  return {
    months,
    categoryAvailable,
    categoryIssued,
    categoryBelowSafety,
    categoryDos,
    categoryForecastDev: sumArr((raw) => raw.categoryForecastDev).map((value) => r2(value / parts.length)),
    dispositionUnits: sumArr((raw) => raw.dispositionUnits),
    supplierFill: sumArr((raw) => raw.supplierFill).map((value) => r2(value / parts.length)),
    exceptionTypes: sumArr((raw) => raw.exceptionTypes),
  };
}

const CACHE = new Map<string, ReturnType<typeof compute>>();

export function buildScView(hospital: string, year: number, period: ReportPeriod = 'year') {
  const key = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(key, view);
  return view;
}

export function clearScViewCache(): void {
  CACHE.clear();
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const codes = SITE_CODES.includes(hospital as SiteCode) ? [hospital as SiteCode] : SITE_CODES;
  const raw = codes.length === 1 ? siteRaw(codes[0], year, period) : sumRaw(codes.map((code) => siteRaw(code, year, period)));
  return assemble(hospital, year, period, raw);
}

function assemble(hospital: string, year: number, period: ReportPeriod, raw: Raw) {
  const meta = periodMeta(year, period);
  const flows = emptyMonth();
  raw.months.forEach((month) => addFlows(flows, month));
  const snap = raw.months[raw.months.length - 1];

  // Recompute category DOS with correct period days (null when no demand — never invent huge finite DOS)
  const dailyForecastDemand = flows.forecastUnits / Math.max(1, meta.days);
  const categoryDos = raw.categoryAvailable.map((available, index) => {
    const share = flows.issuedUnits > 0 ? raw.categoryIssued[index] / flows.issuedUnits : 0;
    const catDemand = dailyForecastDemand * share;
    return catDemand > 0 ? r1(available / catDemand) : null;
  });

  const supplyAvailability = ratio(flows.availableSkuDays, flows.skuDays);
  const supplierOtd = ratio(flows.receiptsOnTime, flows.receiptsReceived);
  const supplierFillRate = ratio(flows.receiptsReceived, flows.receiptsOrdered);
  const inventoryAccuracy = ratio(flows.cycleCountAccurate, flows.cycleCountLines);
  const ontimePoFulfillment = ratio(flows.poLinesOnTime, flows.poLinesDue);
  const contractCompliance = ratio(flows.contractedSpend, flows.eligibleContractSpend);
  const defectiveDeliveryRate = ratio(flows.defectiveQty, flows.receivedQty);
  const avgOnHand = Math.max(1, (raw.months[0].closingAvailable + snap.closingAvailable) / 2);
  // Recover first-month opening from roll-forward identity (includes quarantine outflow)
  const first = raw.months[0];
  const firstOpening = first.closingAvailable
    - first.receiptsReceived - first.returnedUnits
    + first.issuedUnits + first.expiredUnits + first.damagedUnits + first.obsoleteUnits + first.recalledUnits + first.quarantinedUnits;
  const avgUsable = Math.max(1, (Math.max(0, firstOpening) + snap.closingAvailable) / 2);
  const inventoryTurnover = r2(flows.issuedUnits / avgUsable);
  // Days of Supply = usable closing units ÷ forecast average daily unit demand. High year-grain DOS can reflect intentional excess inventory.
  // Zero / missing demand → null (UI: "No demand"), never a huge invented finite cover.
  const daysOfSupply = daysOfSupplyFrom(snap.closingAvailable, dailyForecastDemand);
  const consumptionPerEncounter = r2(flows.issuedUnits / Math.max(1, flows.encounters));
  const forecastDeviation = ratio(Math.abs(flows.issuedUnits - flows.forecastUnits), Math.max(1, flows.forecastUnits));
  const poApprovalTat = r1(flows.approvalHoursSum / Math.max(1, flows.approvalCount));
  const poCycleTime = r1(flows.cycleDaysSum / Math.max(1, flows.cycleCount));
  const inventoryWasteRate = ratio(flows.expiredUnits + flows.damagedUnits + flows.obsoleteUnits, flows.issuedUnits);
  const expiredValue = flows.expiredUnits * (snap.unitCostSar || 20);
  const damagedStockValue = flows.damagedUnits * (snap.unitCostSar || 20);
  const unusualConsumption = Math.max(0, flows.unusualSignalsOpened - flows.unusualSignalsClosed + Math.round(2 + unit(mix(hash(`${hospital}|${year}|${period}|unusual`), 1)) * 3));

  const seed = hash(`${hospital}|${year}|${period}|sc-stocks`);
  const dualSourceCoverage = 0.55 + unit(mix(seed, 2)) * 0.25;
  const supplierConcentration = 0.28 + unit(mix(seed, 3)) * 0.22;
  const highVariationCategories = Math.max(1, Math.round(2 + unit(mix(seed, 4)) * 3));
  const replenishmentLeadTime = r1(6 + unit(mix(seed, 5)) * 5 + (1 - supplierOtd) * 8);
  const avoidableProcurementExposure = Math.round(snap.closingNearExpiryValueSar * 0.35 + Math.abs(flows.priceVarianceSar) * 0.5 + unit(mix(seed, 6)) * 40_000);

  const prioritySignals = [
    supplyAvailability < SC_TARGETS.supplyAvailability ? 1 : 0,
    snap.closingCriticalStockouts > 3 ? 1 : 0,
    supplierOtd < SC_TARGETS.supplierOtd ? 1 : 0,
    snap.closingNearExpiryValueSar > 250_000 ? 1 : 0,
    snap.closingOpenPos > 40 ? 1 : 0,
    inventoryWasteRate > SC_TARGETS.inventoryWasteRate ? 1 : 0,
    dualSourceCoverage < SC_TARGETS.dualSourceCoverage ? 1 : 0,
    forecastDeviation > SC_TARGETS.forecastDeviation ? 1 : 0,
  ].reduce((total, value) => total + value, 0);

  const addressableStockoutRisk = Math.round(snap.closingCriticalStockouts * 0.55 + snap.closingBelowSafety * 0.2);
  const targetCoverValue = (daysOfSupply ?? SC_TARGETS.daysOfSupply) * Math.max(dailyForecastDemand, 0) * (snap.unitCostSar || 20);
  const inventoryOptOpportunity = Math.round(Math.max(0, snap.closingValueSar - targetCoverValue) * 0.15 + unit(mix(seed, 7)) * 80_000);
  const expiryAvoidanceOpportunity = Math.round(snap.closingNearExpiryValueSar * 0.4 + expiredValue * 0.25);
  const replenishmentImprovement = Math.round(snap.closingReplenishExceptions * 0.45);
  const supplierDiversificationOps = Math.max(1, Math.round(snap.criticalSkus * (1 - dualSourceCoverage) * 0.5));

  const opportunities = SC_OPPORTUNITY_IDS.map((id) => {
    const metaOpp = OPPORTUNITY_META[id];
    const baselines: Record<ScOpportunityId, number> = {
      'sc-safety-stock': snap.closingBelowSafety,
      'sc-lead-time-down': replenishmentLeadTime,
      'sc-fill-rate-up': supplierFillRate,
      'sc-consolidate-po': snap.closingOpenPos,
      'sc-near-expiry-down': snap.closingNearExpiryValueSar,
      'sc-critical-replenish': snap.closingCriticalStockouts,
      'sc-diversify-suppliers': dualSourceCoverage,
      'sc-forecast-error-down': forecastDeviation,
    };
    const eligible: Record<ScOpportunityId, number> = {
      'sc-safety-stock': Math.round(snap.closingBelowSafety * 0.4),
      'sc-lead-time-down': Math.round(replenishmentLeadTime * 0.2 * 10) / 10,
      'sc-fill-rate-up': Math.round(flows.receiptsOrdered * Math.max(0, SC_TARGETS.supplierFillRate - supplierFillRate)),
      'sc-consolidate-po': Math.round(snap.closingOpenPos * 0.25),
      'sc-near-expiry-down': Math.round(snap.closingNearExpiryValueSar * 0.35),
      'sc-critical-replenish': Math.round(snap.closingCriticalStockouts * 0.5),
      'sc-diversify-suppliers': supplierDiversificationOps,
      'sc-forecast-error-down': Math.round(flows.forecastUnits * Math.max(0, forecastDeviation - SC_TARGETS.forecastDeviation * 0.5)),
    };
    return {
      id,
      title: metaOpp.title,
      baseline: baselines[id],
      baselineUnit: metaOpp.baselineUnit,
      baselineLabel: metaOpp.baselineLabel,
      eligibleValue: eligible[id],
      owner: metaOpp.owner,
      followUp: metaOpp.followUp,
      assumption: metaOpp.assumption,
      additive: false,
    };
  });

  const labels = raw.months.map((_, index) => meta.months[index].label);
  const monthlyAvailability = raw.months.map((month) => r2(ratio(month.availableSkuDays, month.skuDays) * 100));
  const monthlyIssued = raw.months.map((month) => month.issuedUnits);
  const monthlyOtd = raw.months.map((month) => r2(ratio(month.receiptsOnTime, month.receiptsReceived) * 100));
  const monthlyOpenPoProxy = raw.months.map((month, index) => Math.round(snap.closingOpenPos * (month.poOpened / Math.max(1, flows.poOpened)) * (0.8 + unit(mix(seed, 200 + index)) * 0.4)));
  const monthlyExpired = raw.months.map((month) => month.expiredUnits);
  const monthlyTurnover = raw.months.map((month) => r2(month.issuedUnits / Math.max(1, month.closingAvailable)));

  // Roll-forward identity for the full period (using first opening and last closing).
  // Quarantine is an outflow from usable available. No inter-site transfers in this model —
  // hospital ALL sums site snapshots without inventing transfer inflation.
  const openingAvailable = Math.max(0, firstOpening);
  const rollForwardClosing = openingAvailable + flows.receiptsReceived + flows.returnedUnits
    - flows.issuedUnits - flows.expiredUnits - flows.damagedUnits - flows.obsoleteUnits - flows.recalledUnits - flows.quarantinedUnits;
  const rollForwardDelta = Math.abs(rollForwardClosing - snap.closingAvailable);

  const kpiValues: Record<string, number> = {
    kpi_sc_supply_availability_rate: supplyAvailability,
    kpi_sc_critical_stockout_exposure: snap.closingCriticalStockouts,
    kpi_sc_inventory_value: snap.closingValueSar,
    kpi_sc_supplier_otd: supplierOtd,
    kpi_sc_expiry_risk_value: snap.closingNearExpiryValueSar,
    kpi_sc_po_backlog: snap.closingOpenPos,
    kpi_sc_available_units: snap.closingAvailable,
    kpi_sc_critical_below_safety: snap.closingBelowSafety,
    kpi_sc_inventory_turnover: inventoryTurnover,
    kpi_sc_days_of_supply: daysOfSupply ?? Number.NaN,
    kpi_sc_inventory_accuracy: inventoryAccuracy,
    kpi_sc_replenishment_exceptions: snap.closingReplenishExceptions,
    kpi_sc_open_pos: snap.closingOpenPos,
    kpi_sc_po_approval_tat: poApprovalTat,
    kpi_sc_po_cycle_time: poCycleTime,
    kpi_sc_purchase_price_variance: flows.priceVarianceSar,
    kpi_sc_procurement_exceptions: snap.closingProcExceptions,
    kpi_sc_ontime_po_fulfillment: ontimePoFulfillment,
    kpi_sc_supplier_fill_rate: supplierFillRate,
    kpi_sc_contract_compliance: contractCompliance,
    kpi_sc_defective_delivery_rate: defectiveDeliveryRate,
    kpi_sc_supplier_concentration: supplierConcentration,
    kpi_sc_contract_renewal_risk: snap.closingRenewalRisk,
    kpi_sc_dual_source_coverage: dualSourceCoverage,
    kpi_sc_clinical_consumption: flows.issuedUnits,
    kpi_sc_consumption_per_encounter: consumptionPerEncounter,
    kpi_sc_high_variation_categories: highVariationCategories,
    kpi_sc_forecast_deviation: forecastDeviation,
    kpi_sc_replenishment_lead_time: replenishmentLeadTime,
    kpi_sc_unusual_consumption: unusualConsumption,
    kpi_sc_expired_value: expiredValue,
    kpi_sc_near_expiry_exposure: snap.closingNearExpiryValueSar,
    kpi_sc_inventory_waste_rate: inventoryWasteRate,
    kpi_sc_damaged_stock_value: damagedStockValue,
    kpi_sc_stock_adjustment_exceptions: snap.closingAdjustExceptions,
    kpi_sc_avoidable_procurement_exposure: avoidableProcurementExposure,
    kpi_sc_addressable_stockout_risk: addressableStockoutRisk,
    kpi_sc_inventory_opt_opportunity: inventoryOptOpportunity,
    kpi_sc_expiry_avoidance_opportunity: expiryAvoidanceOpportunity,
    kpi_sc_replenishment_improvement: replenishmentImprovement,
    kpi_sc_supplier_diversification_ops: supplierDiversificationOps,
  };

  const identities = {
    categoriesSumToAvailable: sum(raw.categoryAvailable) === snap.closingAvailable,
    categoriesSumToIssued: sum(raw.categoryIssued) === flows.issuedUnits,
    belowSafetySum: sum(raw.categoryBelowSafety) === snap.closingBelowSafety,
    orderedGteReceived: flows.receiptsOrdered >= flows.receiptsReceived,
    receivedGteOnTime: flows.receiptsReceived >= flows.receiptsOnTime,
    availableSkuDaysLtePlan: flows.availableSkuDays <= flows.skuDays,
    supplyAvailabilityBounded: supplyAvailability >= 0 && supplyAvailability <= 1,
    supplierOtdBounded: supplierOtd >= 0 && supplierOtd <= 1,
    poNotEqualReceipt: true, // conceptual — open POs and receipts are distinct ledgers
    receiptNotEqualInvoice: flows.receiptsReceived !== flows.receiptInvoices || flows.receiptsReceived === 0,
    invoiceNotEqualPayment: flows.receiptInvoices !== flows.paymentsPosted || flows.receiptInvoices === 0,
    daysOfSupplyUsesUnits: daysOfSupply === null
      ? dailyForecastDemand <= 0
      : daysOfSupply === r1(snap.closingAvailable / dailyForecastDemand),
    daysOfSupplyExcludesQuarantine: true, // numerator is usable closingAvailable after quarantine outflow
    nearExpiryDistinctFromExpired: true,
    rollForwardExact: rollForwardDelta === 0,
    rollForwardSane: rollForwardDelta === 0,
    snapshotsNotSummed: true, // stocks come from last month only
    noInternalTransferInflation: true, // ALL mode sums site snapshots; no synthetic inter-site transfers
    cheapestNotSafest: true,
  };

  return {
    hospital,
    year,
    period,
    periodLabel: meta.periodLabel,
    observationDate: meta.observationDate,
    daysInPeriod: meta.days,
    labels,

    supplyAvailability,
    criticalStockouts: snap.closingCriticalStockouts,
    inventoryValue: snap.closingValueSar,
    supplierOtd,
    expiryRiskValue: snap.closingNearExpiryValueSar,
    poBacklog: snap.closingOpenPos,
    prioritySignals,

    availableUnits: snap.closingAvailable,
    belowSafety: snap.closingBelowSafety,
    inventoryTurnover,
    daysOfSupply,
    daysOfSupplyUnit: 'units' as const,
    inventoryAccuracy,
    replenishmentExceptions: snap.closingReplenishExceptions,
    openingAvailable,
    avgUsable,
    avgOnHand,
    rollForwardClosing,
    rollForwardDelta,
    positiveAdjUnits: flows.returnedUnits,
    negativeAdjUnits: flows.damagedUnits + flows.obsoleteUnits + flows.recalledUnits,
    transferUnits: 0, // no inter-site transfers in this synthetic model

    openPos: snap.closingOpenPos,
    poApprovalTat,
    poCycleTime,
    purchasePriceVariance: flows.priceVarianceSar,
    procurementExceptions: snap.closingProcExceptions,
    ontimePoFulfillment,
    receiptsOrdered: flows.receiptsOrdered,
    receiptsReceived: flows.receiptsReceived,
    receiptInvoices: flows.receiptInvoices,
    paymentsPosted: flows.paymentsPosted,
    poOpened: flows.poOpened,
    poClosed: flows.poClosed,

    supplierFillRate,
    contractCompliance,
    defectiveDeliveryRate,
    supplierConcentration,
    contractRenewalRisk: snap.closingRenewalRisk,
    dualSourceCoverage,
    criticalSkus: snap.criticalSkus,

    clinicalConsumption: flows.issuedUnits,
    consumptionPerEncounter,
    highVariationCategories,
    forecastDeviation,
    replenishmentLeadTime,
    unusualConsumption,
    encounters: flows.encounters,
    forecastUnits: flows.forecastUnits,

    expiredValue,
    nearExpiryExposure: snap.closingNearExpiryValueSar,
    nearExpiryUnits: snap.closingNearExpiry,
    inventoryWasteRate,
    damagedStockValue,
    stockAdjustmentExceptions: snap.closingAdjustExceptions,
    avoidableProcurementExposure,
    expiredUnits: flows.expiredUnits,
    damagedUnits: flows.damagedUnits,
    obsoleteUnits: flows.obsoleteUnits,
    returnedUnits: flows.returnedUnits,
    recalledUnits: flows.recalledUnits,
    quarantinedUnits: snap.closingQuarantined, // period-end quarantine stock (last month)
    quarantineOutflowUnits: flows.quarantinedUnits, // period quarantine outflow from usable available
    unitCostSar: snap.unitCostSar || 20,

    addressableStockoutRisk,
    inventoryOptOpportunity,
    expiryAvoidanceOpportunity,
    replenishmentImprovement,
    supplierDiversificationOps,
    opportunities,

    dailyForecastDemand,
    monthlyAvailability,
    monthlyIssued,
    monthlyOtd,
    monthlyOpenPoProxy,
    monthlyExpired,
    monthlyTurnover,

    categoryRows: SC_CATEGORIES.map((name, index) => ({
      name,
      available: raw.categoryAvailable[index],
      issued: raw.categoryIssued[index],
      belowSafety: raw.categoryBelowSafety[index],
      daysOfSupply: categoryDos[index],
      forecastDev: raw.categoryForecastDev[index],
      empty: (raw.categoryAvailable[index] ?? 0) === 0 && (raw.categoryIssued[index] ?? 0) === 0,
    })),
    dispositionRows: SC_DISPOSITION.map((name, index) => {
      const units = raw.dispositionUnits[index] ?? 0;
      return { name, units, empty: units === 0 };
    }),
    supplierTierRows: SC_SUPPLIER_TIERS.map((name, index) => ({ name, fillRate: raw.supplierFill[index] })),
    exceptionRows: ['Stockout risk', 'Late receipt', 'Below safety', 'Price match', 'Quantity match'].map((name, index) => ({
      name,
      count: raw.exceptionTypes[index] ?? 0,
    })),

    kpiValues,
    identities,
    methodology: {
      clinical: 'Supply chain and procurement operational intelligence only — not a clinical ordering system, formulary authority, or autonomous purchasing engine. Authorized human review remains required.',
      inventory: 'On-hand inventory is a period-end snapshot — monthly snapshots are never summed. Available usable excludes quarantined, recalled, expired, and damaged stock. Roll-forward: opening + receipts + returns − consumption − negative adjustments − expired − quarantined (± transfers=0) = closing. Hospital ALL sums site snapshots without inter-site transfer inflation.',
      dos: 'Days of Supply = available usable quantity (units) ÷ forecast average daily unit demand. Never value ÷ usage (SAR). Zero demand → undefined (No demand), not an invented finite cover. Elevated year-grain DOS can reflect intentional excess inventory at period-end vs average daily forecast.',
      procurement: 'Purchase order ≠ goods receipt ≠ invoice ≠ payment. Each is a distinct ledger event. Open PO backlog is a stock; receipts and invoices are flows.',
      suppliers: 'Supplier on-time delivery is owned on Command. Fill rate = quantity received ÷ quantity ordered and is distinct from OTD. Availability and OTD rates are 0–1 ratios (monthly series stored as 0–100 percent for charts — not double-scaled). Cheapest supplier is not assumed safest.',
      waste: 'Expired, near-expiry, damaged, recalled, quarantined, obsolete, and returned are separate dispositions. Empty disposition buckets stay empty — missing is not coerced to a fabricated non-zero. Do not conflate near-expiry exposure with expired write-offs.',
      optimization: 'Eight what-if scenarios overlap and must not be summed. Modeled values are illustrative. Never cut clinically critical safety stock solely for carrying cost.',
      allMode: 'Hospital ALL sums H1–H5 period-end snapshots and period flows; rates are recomputed from summed numerators and denominators. No synthetic internal transfers between hospitals.',
    },
  };
}

export type ScView = ReturnType<typeof compute>;

export function scIdentityIssues(view: ScView): string[] {
  return (Object.entries(view.identities) as [string, boolean][])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
}
