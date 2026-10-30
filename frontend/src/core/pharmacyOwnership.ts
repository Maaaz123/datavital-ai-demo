/** Stable Pharmacy & Medication Operations KPI ownership — each primary ID has exactly one owning screen. */

export type PharmacyScreenId =
  | 'command'
  | 'dispensing'
  | 'inventory'
  | 'safety'
  | 'cost'
  | 'optimization';

export type PharmacyKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: PharmacyScreenId;
  route: string;
  decision: string;
};

export const PHARMACY_KPI_OWNERS: PharmacyKpiOwner[] = [
  // Command — order demand and dispensing completion
  { id: 'kpi_rx_med_orders', fullName: 'Medication Orders', display: 'Medication Orders', screen: 'command', route: '/pharmacy', decision: 'Overall medication order demand' },
  { id: 'kpi_rx_verified_orders', fullName: 'Pharmacist-Verified Orders', display: 'Verified Orders', screen: 'command', route: '/pharmacy', decision: 'Orders that cleared pharmacist verification' },
  { id: 'kpi_rx_dispensed_lines', fullName: 'Dispensed Medication Lines', display: 'Dispensed Lines', screen: 'command', route: '/pharmacy', decision: 'Line-level dispensing throughput' },
  { id: 'kpi_rx_dispensing_completion', fullName: 'Dispensing Completion Rate', display: 'Dispensing Completion', screen: 'command', route: '/pharmacy', decision: 'Share of handled order lines dispensed' },
  { id: 'kpi_rx_pending_orders', fullName: 'Pending Medication Orders', display: 'Pending Orders', screen: 'command', route: '/pharmacy', decision: 'Open orders not yet dispensed at observation' },
  { id: 'kpi_rx_urgent_share', fullName: 'Urgent Medication Order Share', display: 'Urgent Share', screen: 'command', route: '/pharmacy', decision: 'Urgent vs routine order mix' },

  // Dispensing — turnaround and workflow quality
  { id: 'kpi_rx_median_tat', fullName: 'Median Verification-to-Dispense TAT', display: 'Median TAT', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Typical verification-to-dispense turnaround' },
  { id: 'kpi_rx_p90_tat', fullName: 'P90 Verification-to-Dispense TAT', display: 'P90 TAT', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Long-tail verification-to-dispense turnaround' },
  { id: 'kpi_rx_over_target', fullName: 'Dispenses Exceeding TAT Target', display: 'Over-Target Dispenses', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Dispensed orders past the turnaround target' },
  { id: 'kpi_rx_verification_backlog', fullName: 'Orders Awaiting Pharmacist Verification', display: 'Verification Backlog', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Verification queue at observation' },
  { id: 'kpi_rx_first_pass', fullName: 'First-Pass Dispensing Rate', display: 'First-Pass Rate', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Dispensed lines needing no rework or clarification' },
  { id: 'kpi_rx_rework', fullName: 'Dispensing Rework Rate', display: 'Rework Rate', screen: 'dispensing', route: '/pharmacy/dispensing', decision: 'Lines re-picked or relabelled after dispensing start' },

  // Inventory — stock position
  { id: 'kpi_rx_inventory_value', fullName: 'Closing Medication Inventory Value', display: 'Inventory Value', screen: 'inventory', route: '/pharmacy/inventory', decision: 'Stock value held at observation (SAR)' },
  { id: 'kpi_rx_stockout_skus', fullName: 'Stocked-Out SKUs', display: 'Stockout SKUs', screen: 'inventory', route: '/pharmacy/inventory', decision: 'Active SKUs with zero available stock' },
  { id: 'kpi_rx_low_stock_skus', fullName: 'Low-Stock SKUs', display: 'Low-Stock SKUs', screen: 'inventory', route: '/pharmacy/inventory', decision: 'SKUs below reorder cover but not stocked out' },
  { id: 'kpi_rx_days_of_supply', fullName: 'Medication Days of Supply', display: 'Days of Supply', screen: 'inventory', route: '/pharmacy/inventory', decision: 'Closing stock ÷ average daily issues' },
  { id: 'kpi_rx_near_expiry_value', fullName: 'Near-Expiry Stock Value', display: 'Near-Expiry Value', screen: 'inventory', route: '/pharmacy/inventory', decision: 'Stock value expiring within 90 days (SAR)' },

  // Safety — process safeguards (operational, not clinical advice)
  { id: 'kpi_rx_verification_exception_rate', fullName: 'Verification Exception Rate', display: 'Exception Rate', screen: 'safety', route: '/pharmacy/safety', decision: 'Verified orders needing prescriber contact' },
  { id: 'kpi_rx_high_alert_compliance', fullName: 'High-Alert Medication Check Compliance', display: 'High-Alert Compliance', screen: 'safety', route: '/pharmacy/safety', decision: 'High-alert lines with independent check recorded' },
  { id: 'kpi_rx_barcode_rate', fullName: 'Barcode Administration Scan Rate', display: 'Barcode Scan Rate', screen: 'safety', route: '/pharmacy/safety', decision: 'Administrations scanned at the bedside' },
  { id: 'kpi_rx_incident_reports', fullName: 'Medication Incident Reports', display: 'Incident Reports', screen: 'safety', route: '/pharmacy/safety', decision: 'Reported medication process incidents' },
  { id: 'kpi_rx_unresolved_reviews', fullName: 'Unresolved Incident Reviews', display: 'Unresolved Reviews', screen: 'safety', route: '/pharmacy/safety', decision: 'Incident reviews still open at observation' },

  // Cost — SAR without double counting
  { id: 'kpi_rx_medication_spend', fullName: 'Medication Dispensing Spend', display: 'Medication Spend', screen: 'cost', route: '/pharmacy/cost', decision: 'Cost of units issued to patients (SAR)' },
  { id: 'kpi_rx_cost_per_line', fullName: 'Medication Cost per Dispensed Line', display: 'Cost per Line', screen: 'cost', route: '/pharmacy/cost', decision: 'Spend ÷ dispensed lines (SAR)' },
  { id: 'kpi_rx_expired_value', fullName: 'Expired Stock Write-off Value', display: 'Expired Value', screen: 'cost', route: '/pharmacy/cost', decision: 'Expired units written off (SAR)' },
  { id: 'kpi_rx_avoidable_waste', fullName: 'Potentially Avoidable Medication Waste', display: 'Avoidable Waste', screen: 'cost', route: '/pharmacy/cost', decision: 'Share of write-offs and discards that is avoidable (SAR)' },
  { id: 'kpi_rx_potential_savings', fullName: 'Potential Medication Savings', display: 'Potential Savings', screen: 'cost', route: '/pharmacy/cost', decision: 'Exclusive savings drivers, counted once (SAR)' },

  // Optimization — workflow capacity
  { id: 'kpi_rx_recoverable_hours', fullName: 'Potentially Recoverable Pharmacy Hours', display: 'Recoverable Hours', screen: 'optimization', route: '/pharmacy/optimization', decision: 'Hours recoverable from exclusive workflow drivers' },
  { id: 'kpi_rx_additional_lines', fullName: 'Feasible Additional Dispensing Capacity', display: 'Additional Lines', screen: 'optimization', route: '/pharmacy/optimization', decision: 'Feasible extra lines under workflow constraints' },
  { id: 'kpi_rx_eligible_pending', fullName: 'Eligible Pending Lines', display: 'Eligible Pending', screen: 'optimization', route: '/pharmacy/optimization', decision: 'Pending lines that could use recovered capacity' },
  { id: 'kpi_rx_feasible_tat_cut', fullName: 'Feasible Dispensing TAT Reduction', display: 'Feasible TAT Cut', screen: 'optimization', route: '/pharmacy/optimization', decision: 'Median TAT minutes recoverable from queue and clarification gaps' },
];

export const PHARMACY_SCREEN_TITLES: Record<PharmacyScreenId, string> = {
  command: 'Pharmacy Command Center',
  dispensing: 'Verification & Dispensing Flow',
  inventory: 'Inventory & Stock Position',
  safety: 'Medication Safety Process',
  cost: 'Medication Cost & Waste',
  optimization: 'Pharmacy Capacity Optimization',
};

export function ownersForPharmScreen(screen: PharmacyScreenId): PharmacyKpiOwner[] {
  return PHARMACY_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniquePharmacyOwnership(owners = PHARMACY_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

export const PHARMACY_CROSS_DOMAIN_FORBIDDEN = [
  'ED Visit Volume',
  'Bed Occupancy',
  'Median Length of Stay',
  'OR Utilization',
  'Slot Fill Rate',
  'Scanner Utilization',
  'Imaging Backlog',
  'Analyzer Utilization',
  'Testing Backlog',
  'Median Lab TAT',
  'Median Access Wait',
  'Appointment No-Show Rate',
];
