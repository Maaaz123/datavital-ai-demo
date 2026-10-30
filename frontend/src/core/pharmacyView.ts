import { SITE_SPECS, scenarioFor, type SiteCode } from '@/showcase/facts';
import { splitExact } from './ipdView';
import { sumKey, type ReportPeriod } from './period';

/** Therapeutic groups used for the stock ledger. Illustrative formulary groups, not a drug list. */
export const RX_CLASSES = [
  'Anti-infectives',
  'Cardiovascular',
  'Analgesics & CNS',
  'Oncology & specialty',
  'Endocrine & insulin',
  'IV fluids & electrolytes',
] as const;
export type RxClass = (typeof RX_CLASSES)[number];

/** Dispensing pathways. Every order line follows exactly one pathway. */
export const RX_WORKFLOWS = [
  'Unit-dose & oral',
  'IV compounding',
  'Controlled & high-alert',
  'Outpatient & discharge',
  'Ward stock replenishment',
] as const;
export type RxWorkflow = (typeof RX_WORKFLOWS)[number];

const CLASS_LINE_SHARES = [0.22, 0.22, 0.2, 0.04, 0.12, 0.2];
const CLASS_UNITS_PER_LINE = [10, 14, 16, 3, 6, 12];
/** Fictional SAR per issued unit. */
const CLASS_UNIT_COST = [18, 6, 2.5, 420, 38, 9];
const CLASS_SKU_BASE = [150, 130, 120, 45, 55, 60];
const CLASS_TARGET_DAYS = [14, 12, 20, 9, 16, 10];
const CLASS_EXPIRY_RATE = [0.004, 0.003, 0.003, 0.012, 0.005, 0.002];
const CLASS_NEAR_EXPIRY = [0.04, 0.03, 0.035, 0.06, 0.045, 0.02];
const CLASS_CONVERSION = [0.03, 0.035, 0.02, 0, 0.025, 0];
const CLASS_HIGH_ALERT_WEIGHTS = [0.1, 0.22, 0.12, 0.2, 0.26, 0.1];
const CLASS_HIGH_ALERT_BUMP = [0.01, -0.01, 0.02, -0.02, -0.03, 0.01];

const WORKFLOW_LINE_SHARES = [0.5, 0.15, 0.08, 0.17, 0.1];
const WORKFLOW_MIN_PER_LINE = [3, 14, 6.5, 4.2, 2.2];
const WORKFLOW_TAT_FACTOR = [0.9, 1.8, 1.35, 1.1, 0.7];
const WORKFLOW_REWORK_WEIGHTS = [0.3, 0.3, 0.12, 0.2, 0.08];
const WORKFLOW_CLARIFY_WEIGHTS = [0.34, 0.26, 0.14, 0.22, 0.04];

const LINES_PER_ORDER = 2.6;
const LINES_PER_DISPENSE = 1.9;
const DOSES_PER_ADMINISTERED_ORDER = 3.6;
const TAT_TARGET_MIN = 45;
const CARE_SHARES = [0.12, 0.74, 0.14];

function periodRows(hospital: string, year: number, period: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
  const start = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[period];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return scenarioFor(hospital, year).months.slice(start, start + 3).map((month, index) => ({
    label: names[start + index],
    month,
  }));
}

function daysInPeriod(period: ReportPeriod, year: number): number {
  if (period === 'year') return year % 4 === 0 ? 366 : 365;
  if (period === 'Q1') return year % 4 === 0 ? 91 : 90;
  if (period === 'Q2') return 91;
  if (period === 'Q3') return 92;
  return year % 4 === 0 ? 92 : 91;
}

function tilt(hospital: string, year: number): number {
  const fact = scenarioFor(hospital, year).focus;
  const occ = fact.staffedBeds ? fact.occupiedBeds / fact.staffedBeds : 0.8;
  return Math.min(0.14, Math.max(0, occ - 0.76));
}

function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function r3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const CACHE = new Map<string, PharmacyView>();

/** Shared Pharmacy scenario for screens, Assist, alerts, and what-if. Orders ≠ lines ≠ dispenses ≠ administrations. */
export function buildPharmacyView(hospital: string, year: number, period: ReportPeriod = 'year'): PharmacyView {
  const cacheKey = `${hospital}|${year}|${period}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const view = compute(hospital, year, period);
  CACHE.set(cacheKey, view);
  return view;
}

function compute(hospital: string, year: number, period: ReportPeriod) {
  const rows = period === 'year'
    ? scenarioFor(hospital, year).months.map((month, index) => ({
      label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
      month,
    }))
    : periodRows(hospital, year, period);
  const monthCount = rows.length;
  const pressure = tilt(hospital, year);
  const days = daysInPeriod(period, year);
  const daysPerMonth = days / monthCount;
  const periodLabel = period === 'year' ? `Full year ${year}` : `${period} ${year}`;
  const observationDate = period === 'year'
    ? `31 Dec ${year}`
    : ({ Q1: `31 Mar ${year}`, Q2: `30 Jun ${year}`, Q3: `30 Sep ${year}`, Q4: `31 Dec ${year}` } as const)[period];
  const beds = SITE_SPECS[hospital as SiteCode]?.beds ?? 300;
  const skuScale = hospital === 'ALL' ? 5 : beds >= 450 ? 1.3 : beds >= 320 ? 1.1 : 1;
  const siteSeed = beds + year * 23;

  // --- Order grain (shared scenario) ---
  const orders = sumKey(rows, 'pharmOrders');
  const dispensedOrders = sumKey(rows, 'pharmDispensed');
  const administeredOrders = sumKey(rows, 'pharmAdmin');
  const notDispensedOrders = Math.max(0, orders - dispensedOrders);

  // --- Line ledger: opening + new − dispensed − cancelled = closing, month by month ---
  const orderLinesByMonth = rows.map((row) => Math.round(row.month.pharmOrders * LINES_PER_ORDER));
  const avgNewLines = sum(orderLinesByMonth) / Math.max(1, monthCount);
  const openingPendingLines = Math.round(avgNewLines * (0.018 + pressure * 0.05));
  const lineOpening: number[] = [];
  const lineNew: number[] = [];
  const lineDispensed: number[] = [];
  const lineCancelled: number[] = [];
  const lineClosing: number[] = [];
  let cursor = openingPendingLines;
  for (let index = 0; index < monthCount; index += 1) {
    const month = rows[index].month;
    const added = orderLinesByMonth[index];
    const shortfall = month.pharmOrders ? Math.max(0, month.pharmOrders - month.pharmDispensed) / month.pharmOrders : 0;
    const cancelRate = Math.max(0.004, shortfall * 0.78);
    const closeTarget = Math.round(added * (0.017 + pressure * 0.05) * (1 + 0.08 * Math.sin(index * 1.7 + 0.4)));
    const available = cursor + added;
    const cancel = Math.min(available, Math.round(added * cancelRate));
    const done = Math.max(0, available - cancel - closeTarget);
    const close = available - cancel - done;
    lineOpening.push(cursor);
    lineNew.push(added);
    lineDispensed.push(done);
    lineCancelled.push(cancel);
    lineClosing.push(close);
    cursor = close;
  }
  const orderLines = sum(lineNew);
  const dispensedLines = sum(lineDispensed);
  const cancelledLines = sum(lineCancelled);
  const pendingLines = lineClosing[monthCount - 1] ?? 0;
  const lineLedger = {
    opening: lineOpening[0] ?? 0,
    added: orderLines,
    dispensed: dispensedLines,
    cancelled: cancelledLines,
    closing: pendingLines,
    rows: rows.map((row, index) => ({
      label: row.label,
      opening: lineOpening[index],
      added: lineNew[index],
      dispensed: lineDispensed[index],
      cancelled: lineCancelled[index],
      closing: lineClosing[index],
    })),
  };
  const dispensingCompletion = (lineLedger.opening + orderLines) > 0 ? dispensedLines / (lineLedger.opening + orderLines) : 0;
  const dispenseTransactions = Math.round(dispensedLines / LINES_PER_DISPENSE);

  // --- Order outcome identity: orders = dispensed + cancelled + pending ---
  const pendingOrders = Math.min(notDispensedOrders, Math.ceil(pendingLines / LINES_PER_ORDER));
  const cancelledOrders = notDispensedOrders - pendingOrders;
  const cancelledBeforeVerification = Math.round(cancelledOrders * 0.7);
  const verificationBacklog = Math.min(pendingOrders, Math.round(pendingOrders * (0.3 + pressure * 0.4)));
  const verifiedOrders = orders - cancelledBeforeVerification - verificationBacklog;
  const urgentShareBase = 0.13 + pressure * 0.05;
  const urgentOrders = Math.round(orders * urgentShareBase);
  const routineOrders = orders - urgentOrders;
  const urgentShare = orders ? urgentOrders / orders : 0;
  const careOrders = splitExact(orders, CARE_SHARES);
  const careSettings = ['Emergency', 'Inpatient', 'Outpatient & discharge'].map((name, index) => ({ name, orders: careOrders[index] }));
  const workflowLinesDispensed = splitExact(dispensedLines, WORKFLOW_LINE_SHARES);
  const workflowLinesOrdered = splitExact(orderLines, WORKFLOW_LINE_SHARES);
  const workflowPending = splitExact(pendingLines, WORKFLOW_LINE_SHARES);

  // --- Dispensing turnaround (verification → dispense), dispensed orders only ---
  const tatSampleSize = Math.min(dispensedOrders, 400);
  const urgentEvery = Math.max(2, Math.round(1 / Math.max(urgentShareBase, 0.05)));
  const tatAll: number[] = [];
  const tatUrgent: number[] = [];
  const tatRoutine: number[] = [];
  for (let i = 0; i < tatSampleSize; i += 1) {
    const u = unit(siteSeed + i * 4.3);
    const isUrgent = i % urgentEvery === 0;
    const base = isUrgent ? 9 + pressure * 14 : 24 + pressure * 40;
    const minutes = Math.max(3, Math.round(base * (0.45 + u * 1.7)));
    tatAll.push(minutes);
    (isUrgent ? tatUrgent : tatRoutine).push(minutes);
  }
  tatAll.sort((a, b) => a - b);
  tatUrgent.sort((a, b) => a - b);
  tatRoutine.sort((a, b) => a - b);
  const medianTatMin = quantile(tatAll, 0.5);
  const p90TatMin = quantile(tatAll, 0.9);
  const overTargetShare = tatAll.length ? tatAll.filter((value) => value > TAT_TARGET_MIN).length / tatAll.length : 0;
  const dispensesOverTarget = Math.round(dispensedOrders * overTargetShare);
  const workflowTat = RX_WORKFLOWS.map((_, index) => Math.max(2, Math.round(medianTatMin * WORKFLOW_TAT_FACTOR[index])));
  const monthlyTat = rows.map((_, index) => Math.max(2, Math.round(medianTatMin + ((index % 4) - 1.5) * 1.4)));
  const tatByPriority = [
    { name: 'Urgent', median: quantile(tatUrgent, 0.5), p90: quantile(tatUrgent, 0.9) },
    { name: 'Routine', median: quantile(tatRoutine, 0.5), p90: quantile(tatRoutine, 0.9) },
  ];

  const verificationAging = splitExact(verificationBacklog, [0.42, 0.28, 0.18, 0.12]).map((count, index) => ({
    name: ['0–30 min', '30–60 min', '1–2 h', '>2 h'][index],
    count,
  }));

  // --- Dispensed line quality partition: first pass + clarified + rework = dispensed lines ---
  const clarifiedShare = 0.045 + pressure * 0.03;
  const reworkShare = 0.028 + pressure * 0.025;
  const [firstPassLines, clarifiedLines, reworkLines] = splitExact(dispensedLines, [1 - clarifiedShare - reworkShare, clarifiedShare, reworkShare]);
  const firstPass = dispensedLines ? firstPassLines / dispensedLines : 0;
  const reworkRate = dispensedLines ? reworkLines / dispensedLines : 0;
  const clarifiedRate = dispensedLines ? clarifiedLines / dispensedLines : 0;
  const reworkReasons = splitExact(reworkLines, [0.28, 0.26, 0.18, 0.16, 0.12]).map((count, index) => ({
    name: ['Label or packaging error', 'Wrong pick / re-pick', 'Stock substitution', 'Late order change', 'Compounding re-make'][index],
    count,
  }));
  const clarificationReasons = splitExact(clarifiedLines, [0.34, 0.24, 0.2, 0.14, 0.08]).map((count, index) => ({
    name: ['Incomplete order details', 'Formulary substitution', 'Duplicate order check', 'Allergy record check', 'Route or form query'][index],
    count,
  }));
  const monthlyDispensedLines = lineDispensed.slice();

  // --- Inventory quantity ledger per class and month: opening + receipts − issues − expired − discards = closing ---
  type ClassMonth = { opening: number; receipts: number; issued: number; expired: number; discarded: number; closing: number };
  const classMonths: ClassMonth[][] = RX_CLASSES.map(() => []);
  const classSplitByMonth = lineDispensed.map((lines) => splitExact(lines, CLASS_LINE_SHARES));
  const classSpend: number[] = RX_CLASSES.map(() => 0);
  const classExpired: number[] = RX_CLASSES.map(() => 0);
  const classDiscard: number[] = RX_CLASSES.map(() => 0);
  const monthlySpend: number[] = rows.map(() => 0);
  const monthlyExpiredValue: number[] = rows.map(() => 0);
  const monthlyClosingValue: number[] = rows.map(() => 0);
  RX_CLASSES.forEach((_, c) => {
    const cost = CLASS_UNIT_COST[c];
    const firstIssued = classSplitByMonth[0][c] * CLASS_UNITS_PER_LINE[c];
    let stock = Math.round((firstIssued / daysPerMonth) * CLASS_TARGET_DAYS[c] * 1.03);
    for (let m = 0; m < monthCount; m += 1) {
      const issued = classSplitByMonth[m][c] * CLASS_UNITS_PER_LINE[c];
      const expired = Math.round(issued * (CLASS_EXPIRY_RATE[c] + pressure * 0.02));
      const discarded = Math.round(issued * 0.003);
      const target = Math.round((issued / daysPerMonth) * CLASS_TARGET_DAYS[c] * (1 - pressure * 0.25) * (1 + 0.06 * Math.sin(m * 1.3 + c)));
      const out = issued + expired + discarded;
      const receipts = Math.max(0, target + out - stock);
      const closing = stock + receipts - out;
      classMonths[c].push({ opening: stock, receipts, issued, expired, discarded, closing });
      classSpend[c] += Math.round(issued * cost);
      classExpired[c] += Math.round(expired * cost);
      classDiscard[c] += Math.round(discarded * cost);
      monthlySpend[m] += Math.round(issued * cost);
      monthlyExpiredValue[m] += Math.round(expired * cost);
      monthlyClosingValue[m] += Math.round(closing * cost);
      stock = closing;
    }
  });
  const ledgerRows = rows.map((row, m) => {
    const parts = classMonths.map((list) => list[m]);
    return {
      label: row.label,
      opening: sum(parts.map((item) => item.opening)),
      receipts: sum(parts.map((item) => item.receipts)),
      issued: sum(parts.map((item) => item.issued)),
      expired: sum(parts.map((item) => item.expired)),
      discarded: sum(parts.map((item) => item.discarded)),
      closing: sum(parts.map((item) => item.closing)),
    };
  });
  const quantityLedger = {
    opening: ledgerRows[0]?.opening ?? 0,
    receipts: sum(ledgerRows.map((item) => item.receipts)),
    issued: sum(ledgerRows.map((item) => item.issued)),
    expired: sum(ledgerRows.map((item) => item.expired)),
    discarded: sum(ledgerRows.map((item) => item.discarded)),
    closing: ledgerRows[monthCount - 1]?.closing ?? 0,
    rows: ledgerRows,
  };

  // Batch expiry buckets of closing stock per class
  const BATCH_BUCKETS = ['≤30 days', '31–90 days', '91–180 days', '>180 days'];
  const classClosingUnits = classMonths.map((list) => list[monthCount - 1]?.closing ?? 0);
  const classBatches = RX_CLASSES.map((name, c) => {
    const near = CLASS_NEAR_EXPIRY[c] + pressure * 0.06;
    const buckets = splitExact(classClosingUnits[c], [near * 0.35, near * 0.65, 0.18, Math.max(0.01, 1 - near - 0.18)]);
    return { name, buckets, closingUnits: classClosingUnits[c] };
  });
  const batchTotals = BATCH_BUCKETS.map((_, b) => sum(classBatches.map((item) => item.buckets[b])));

  // --- SKU position: stockout + low-stock + adequate = active SKUs (mutually exclusive) ---
  const classSku = RX_CLASSES.map((name, c) => {
    const skus = Math.round(CLASS_SKU_BASE[c] * skuScale);
    const stockout = Math.min(skus, Math.round(skus * (0.006 + pressure * 0.035 + (c === 3 ? 0.012 : 0))));
    const low = Math.min(skus - stockout, Math.round(skus * (0.045 + pressure * 0.12)));
    return { name, skus, stockout, low, adequate: skus - stockout - low };
  });
  const totalSkus = sum(classSku.map((item) => item.skus));
  const stockoutSkus = sum(classSku.map((item) => item.stockout));
  const lowStockSkus = sum(classSku.map((item) => item.low));
  const adequateSkus = sum(classSku.map((item) => item.adequate));

  const classRows = RX_CLASSES.map((name, c) => {
    const closingValue = Math.round(classClosingUnits[c] * CLASS_UNIT_COST[c]);
    const nearUnits = classBatches[c].buckets[0] + classBatches[c].buckets[1];
    const nearValue = Math.round(nearUnits * CLASS_UNIT_COST[c]);
    const issuedUnits = sum(classMonths[c].map((item) => item.issued));
    const dayValue = classSpend[c] / days;
    return {
      name,
      lineShare: CLASS_LINE_SHARES[c],
      unitCost: CLASS_UNIT_COST[c],
      closingUnits: classClosingUnits[c],
      closingValue,
      nearExpiryUnits: nearUnits,
      nearExpiryValue: nearValue,
      issuedUnits,
      spend: classSpend[c],
      expiredValue: classExpired[c],
      discardValue: classDiscard[c],
      daysOfSupply: dayValue > 0 ? r1(closingValue / dayValue) : 0,
      skus: classSku[c].skus,
      stockout: classSku[c].stockout,
      low: classSku[c].low,
    };
  });
  const inventoryValue = sum(classRows.map((item) => item.closingValue));
  const nearExpiryValue = sum(classRows.map((item) => item.nearExpiryValue));
  const nearExpiryUnits = sum(classRows.map((item) => item.nearExpiryUnits));
  const medicationSpend = sum(classRows.map((item) => item.spend));
  const expiredValue = sum(classRows.map((item) => item.expiredValue));
  const discardValue = sum(classRows.map((item) => item.discardValue));
  const daysOfSupply = medicationSpend > 0 ? r1(inventoryValue / (medicationSpend / days)) : 0;
  const costPerLine = dispensedLines ? Math.round(medicationSpend / dispensedLines) : 0;
  const totalWaste = expiredValue + discardValue;
  const totalOutflowCost = medicationSpend + totalWaste;
  const monthlyDaysSupply = rows.map((_, index) => {
    const perDay = monthlySpend[index] / daysPerMonth;
    return perDay > 0 ? r1(monthlyClosingValue[index] / perDay) : 0;
  });

  // --- Avoidable waste and exclusive savings drivers (each SAR counted once) ---
  const avoidableExpired = Math.round(expiredValue * 0.55);
  const avoidableDiscard = Math.round(discardValue * 0.35);
  const avoidableWaste = avoidableExpired + avoidableDiscard;
  const conversionEligibleSpend = sum(classRows.map((item, c) => (CLASS_CONVERSION[c] > 0 ? item.spend : 0)));
  const savingsDrivers = [
    { name: 'Expiry avoidance (par levels, FEFO)', value: Math.round(avoidableExpired * 0.8) },
    { name: 'Discard & return reduction', value: Math.round(avoidableDiscard * 0.7) },
    { name: 'Generic & formulary conversion', value: sum(classRows.map((item, c) => Math.round(item.spend * CLASS_CONVERSION[c]))) },
    { name: 'Purchase price variance', value: Math.round((medicationSpend - conversionEligibleSpend) * 0.005) },
  ];
  const potentialSavings = sum(savingsDrivers.map((item) => item.value));
  const wasteComponents = [
    { name: 'Expired stock', value: expiredValue },
    { name: 'Discards & returns', value: discardValue },
  ];

  // --- Safety denominators (all distinct) ---
  const exceptionOrders = Math.min(verifiedOrders, Math.round(verifiedOrders * (0.05 + pressure * 0.03)));
  const verificationExceptionRate = verifiedOrders ? exceptionOrders / verifiedOrders : 0;
  const exceptionReasons = splitExact(exceptionOrders, [0.3, 0.22, 0.2, 0.16, 0.12]).map((count, index) => ({
    name: ['Incomplete order details', 'Formulary substitution', 'Duplicate order check', 'Allergy record check', 'Route or form query'][index],
    count,
  }));
  const highAlertLines = Math.round(dispensedLines * 0.085);
  const highAlertByClass = splitExact(highAlertLines, CLASS_HIGH_ALERT_WEIGHTS);
  const highAlertCompliantByClass = highAlertByClass.map((count, c) => Math.min(count, Math.round(count * (0.95 - pressure * 0.07 + CLASS_HIGH_ALERT_BUMP[c]))));
  const highAlertCompliant = sum(highAlertCompliantByClass);
  const highAlertGap = highAlertLines - highAlertCompliant;
  const highAlertCompliance = highAlertLines ? highAlertCompliant / highAlertLines : 0;
  const administrationEvents = Math.round(administeredOrders * DOSES_PER_ADMINISTERED_ORDER);
  const settingShares = [0.62, 0.14, 0.16, 0.08];
  const eventsBySetting = splitExact(administrationEvents, settingShares);
  const scanBump = [0, -0.05, -0.08, -0.02];
  const scannedBySetting = eventsBySetting.map((count, index) => Math.min(count, Math.round(count * (0.93 - pressure * 0.08 + scanBump[index]))));
  const scannedAdministrations = sum(scannedBySetting);
  const barcodeRate = administrationEvents ? scannedAdministrations / administrationEvents : 0;
  const barcodeSettings = ['Inpatient wards', 'Intensive care', 'Emergency', 'Day-case & procedures'].map((name, index) => ({
    name,
    events: eventsBySetting[index],
    scanned: scannedBySetting[index],
    rate: eventsBySetting[index] ? scannedBySetting[index] / eventsBySetting[index] : 0,
  }));
  const incidentReports = Math.round(administrationEvents * (0.00055 + pressure * 0.0004));
  const incidentTypes = splitExact(incidentReports, [0.22, 0.2, 0.34, 0.1, 0.14]).map((count, index) => ({
    name: ['Prescribing', 'Dispensing', 'Administration', 'Monitoring', 'Documentation'][index],
    count,
  }));
  const incidentReach = splitExact(incidentReports, [0.38, 0.5, 0.12]).map((count, index) => ({
    name: ['Caught before reaching patient', 'Reached patient, no harm reported', 'Reached patient, review required'][index],
    count,
  }));
  const reviewsClosed = Math.round(incidentReports * (0.84 - pressure * 0.08));
  const unresolvedReviews = incidentReports - reviewsClosed;
  const reviewAging = splitExact(unresolvedReviews, [0.4, 0.28, 0.2, 0.12]).map((count, index) => ({
    name: ['0–7 days', '8–14 days', '15–30 days', '>30 days'][index],
    count,
  }));
  const incidentsPer1000 = administrationEvents ? Math.round((incidentReports / administrationEvents) * 100000) / 100 : 0;
  const monthlyIncidents = splitExact(incidentReports, rows.map((row) => Math.max(row.month.pharmAdmin, 1)));

  // --- Workflow capacity: staffed = productive + rework + clarification + handoff + unused ---
  const workflowReworkLines = splitExact(reworkLines, WORKFLOW_REWORK_WEIGHTS);
  const workflowClarifiedLines = splitExact(clarifiedLines, WORKFLOW_CLARIFY_WEIGHTS);
  const workflows = RX_WORKFLOWS.map((name, w) => {
    const minPerLine = r1(WORKFLOW_MIN_PER_LINE[w] * (1 + pressure * 0.08));
    const productive = Math.round((workflowLinesDispensed[w] * minPerLine) / 60);
    const rework = Math.round((workflowReworkLines[w] * minPerLine * 0.9) / 60);
    const clarification = Math.round((workflowClarifiedLines[w] * 5) / 60);
    const handoff = Math.round(productive * (0.03 + pressure * 0.04));
    const staffed = Math.round((productive + rework + clarification + handoff) * (1.16 - pressure * 0.04));
    const unused = staffed - productive - rework - clarification - handoff;
    const drivers = [
      { name: 'Rework & re-pick', hours: Math.round(rework * 0.5) },
      { name: 'Prescriber clarification waits', hours: Math.round(clarification * 0.35) },
      { name: 'Queue handoff gaps', hours: Math.round(handoff * 0.4) },
      { name: 'Unused staffed time', hours: Math.round(unused * 0.2) },
    ];
    const recoverable = sum(drivers.map((item) => item.hours));
    const potentialLines = Math.floor((recoverable * 60) / Math.max(minPerLine, 0.5));
    const eligiblePending = Math.round(workflowPending[w] * 0.75);
    const additionalLines = Math.min(potentialLines, eligiblePending);
    return {
      name,
      minPerLine,
      linesOrdered: workflowLinesOrdered[w],
      linesDispensed: workflowLinesDispensed[w],
      pendingLines: workflowPending[w],
      reworkLines: workflowReworkLines[w],
      clarifiedLines: workflowClarifiedLines[w],
      productiveHours: productive,
      reworkHours: rework,
      clarificationHours: clarification,
      handoffHours: handoff,
      unusedHours: unused,
      staffedHours: staffed,
      utilization: staffed ? productive / staffed : 0,
      medianTatMin: workflowTat[w],
      drivers,
      recoverableHours: recoverable,
      potentialLines,
      eligiblePending,
      additionalLines,
    };
  });
  const staffedHours = sum(workflows.map((item) => item.staffedHours));
  const productiveHours = sum(workflows.map((item) => item.productiveHours));
  const reworkHours = sum(workflows.map((item) => item.reworkHours));
  const clarificationHours = sum(workflows.map((item) => item.clarificationHours));
  const handoffHours = sum(workflows.map((item) => item.handoffHours));
  const unusedHours = sum(workflows.map((item) => item.unusedHours));
  const recoverableHours = sum(workflows.map((item) => item.recoverableHours));
  const additionalLines = sum(workflows.map((item) => item.additionalLines));
  const potentialAdditionalLines = sum(workflows.map((item) => item.potentialLines));
  const eligiblePending = sum(workflows.map((item) => item.eligiblePending));
  const hospitalDrivers = [0, 1, 2, 3].map((d) => ({
    name: workflows[0].drivers[d].name,
    hours: sum(workflows.map((item) => item.drivers[d].hours)),
  }));
  const queueRecoverable = hospitalDrivers[1].hours + hospitalDrivers[2].hours;
  const feasibleTatCutMin = r1(Math.min(medianTatMin * 0.3, medianTatMin * (productiveHours ? (queueRecoverable / productiveHours) * 6 : 0)));

  return {
    hospital,
    year,
    period,
    periodLabel,
    observationDate,
    days,
    labels: rows.map((row) => row.label),

    // Order grain
    orders,
    dispensedOrders,
    administeredOrders,
    cancelledOrders,
    pendingOrders,
    cancelledBeforeVerification,
    verifiedOrders,
    verificationBacklog,
    urgentOrders,
    routineOrders,
    urgentShare: r3(urgentShare),
    careSettings,

    // Line / dispense / administration grains
    orderLines,
    dispensedLines,
    cancelledLines,
    pendingLines,
    dispenseTransactions,
    administrationEvents,
    dispensingCompletion: r3(dispensingCompletion),
    lineLedger,

    // Turnaround
    medianTatMin,
    p90TatMin,
    tatTargetMin: TAT_TARGET_MIN,
    dispensesOverTarget,
    tatByPriority,
    workflowTat,
    monthlyTat,
    verificationAging,

    // Line quality
    firstPassLines,
    clarifiedLines,
    reworkLines,
    firstPass: r3(firstPass),
    reworkRate: r3(reworkRate),
    clarifiedRate: r3(clarifiedRate),
    reworkReasons,
    clarificationReasons,

    // Inventory
    quantityLedger,
    classRows,
    classBatches,
    batchBuckets: BATCH_BUCKETS,
    batchTotals,
    totalSkus,
    stockoutSkus,
    lowStockSkus,
    adequateSkus,
    classSku,
    inventoryValue,
    nearExpiryValue,
    nearExpiryUnits,
    daysOfSupply,
    monthlyDaysSupply,
    monthlyClosingValue,

    // Cost (SAR)
    medicationSpend,
    costPerLine,
    expiredValue,
    discardValue,
    totalWaste,
    totalOutflowCost,
    avoidableExpired,
    avoidableDiscard,
    avoidableWaste,
    savingsDrivers,
    potentialSavings,
    wasteComponents,
    monthlySpend,
    monthlyExpiredValue,

    // Safety
    exceptionOrders,
    verificationExceptionRate: r3(verificationExceptionRate),
    exceptionReasons,
    highAlertLines,
    highAlertCompliant,
    highAlertGap,
    highAlertCompliance: r3(highAlertCompliance),
    highAlertByClass: RX_CLASSES.map((name, c) => ({ name, lines: highAlertByClass[c], compliant: highAlertCompliantByClass[c] })),
    scannedAdministrations,
    barcodeRate: r3(barcodeRate),
    barcodeSettings,
    incidentReports,
    incidentTypes,
    incidentReach,
    incidentsPer1000,
    reviewsClosed,
    unresolvedReviews,
    reviewAging,
    monthlyIncidents,

    // Capacity
    workflows,
    staffedHours,
    productiveHours,
    reworkHours,
    clarificationHours,
    handoffHours,
    unusedHours,
    delayDriverHours: hospitalDrivers,
    recoverableHours,
    additionalLines,
    potentialAdditionalLines,
    eligiblePending,
    feasibleTatCutMin,

    monthlyOrders: rows.map((row) => row.month.pharmOrders),
    monthlyDispensedLines,
    monthlyNewLines: lineNew,

    methodology: {
      grains: 'Orders ≠ Lines ≠ Dispenses ≠ Administrations. One order averages ~2.6 lines; one dispense transaction covers ~1.9 lines; one administered order averages ~3.6 administration events.',
      ledger: 'Line ledger: opening + new lines − dispensed − cancelled = closing, month by month. Closing pending lines equals the Pending headline.',
      tat: 'Dispensing TAT = dispense time − pharmacist verification time for dispensed orders only. Urgent and routine orders are separated in the sample.',
      inventory: 'Batch ledger: opening + receipts − issues − expired − discards = closing per month and therapeutic group; next opening equals prior closing and no balance goes negative. Stockout (zero available) and Low-Stock (below reorder cover) are mutually exclusive SKUs; the all-hospitals view counts SKU-site positions.',
      safety: 'Each safety rate keeps its own denominator: exceptions ÷ verified orders, high-alert checks ÷ high-alert lines, scans ÷ administration events, incidents per 1,000 administration events. Operational process signals only — not clinical advice.',
      cost: 'Spend = issued units × unit cost. Expired and discarded value are separate write-offs, not part of spend. Avoidable waste is a share of write-offs; savings drivers are exclusive so no SAR is counted twice. All amounts are fictional SAR.',
      capacity: 'Staffed = productive + rework + clarification + handoff + unused. Recoverable hours are exclusive workflow drivers; additional lines respect workflow minutes and eligible pending lines. Illustrative — not achieved.',
    },
  };
}

export type PharmacyView = ReturnType<typeof compute>;
