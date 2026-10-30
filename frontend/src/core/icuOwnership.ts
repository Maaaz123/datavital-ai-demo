/** Stable ICU & Critical Care KPI ownership — each primary ID has exactly one owning screen. */

export type IcuScreenId =
  | 'command'
  | 'flow'
  | 'capacity'
  | 'equipment'
  | 'quality'
  | 'optimization';

export type IcuKpiOwner = {
  id: string;
  fullName: string;
  display: string;
  screen: IcuScreenId;
  route: string;
  decision: string;
};

export const ICU_KPI_OWNERS: IcuKpiOwner[] = [
  // Command — workload and demand (not hospital-wide Bed Occupancy)
  { id: 'kpi_icu_admissions', fullName: 'ICU Admissions', display: 'ICU Admissions', screen: 'command', route: '/icu', decision: 'Admissions into ICU from outside the ICU' },
  { id: 'kpi_icu_discharges', fullName: 'ICU Discharges', display: 'ICU Discharges', screen: 'command', route: '/icu', decision: 'Completed ICU departures excluding internal transfers' },
  { id: 'kpi_icu_patient_days', fullName: 'ICU Patient Days', display: 'Patient Days', screen: 'command', route: '/icu', decision: 'Midnight census patient-days in the period' },
  { id: 'kpi_icu_avg_census', fullName: 'ICU Average Census', display: 'Avg Census', screen: 'command', route: '/icu', decision: 'Patient-days ÷ days in period' },
  { id: 'kpi_icu_demand_pressure', fullName: 'ICU Demand Pressure', display: 'Demand Pressure', screen: 'command', route: '/icu', decision: 'Pending transfer requests ÷ available staffed beds' },
  { id: 'kpi_icu_pending_transfers', fullName: 'Pending ICU Transfers', display: 'Pending Transfers', screen: 'command', route: '/icu', decision: 'Open ICU transfer requests at observation' },

  // Flow — admission, stay, and exit delays
  { id: 'kpi_icu_admission_wait', fullName: 'Median ICU Admission Wait', display: 'Admission Wait', screen: 'flow', route: '/icu/flow', decision: 'Median minutes from request to physical ICU arrival' },
  { id: 'kpi_icu_delayed_admissions', fullName: 'Delayed ICU Admissions', display: 'Delayed Admissions', screen: 'flow', route: '/icu/flow', decision: 'Admissions with wait above the illustrative target' },
  { id: 'kpi_icu_transfer_delay', fullName: 'Median ICU Transfer Delay', display: 'Transfer Delay', screen: 'flow', route: '/icu/flow', decision: 'Median hours from transfer-ready to actual exit for eligible transfers' },
  { id: 'kpi_icu_median_los', fullName: 'Median ICU Length of Stay', display: 'Median LOS', screen: 'flow', route: '/icu/flow', decision: 'Median hours for completed ICU stays' },
  { id: 'kpi_icu_discharge_ready_delay', fullName: 'Discharge Readiness Delay', display: 'Ready Delay', screen: 'flow', route: '/icu/flow', decision: 'Median hours from discharge-ready to actual ICU departure' },
  { id: 'kpi_icu_boarding_hours', fullName: 'ICU Boarding Hours', display: 'Boarding Hours', screen: 'flow', route: '/icu/flow', decision: 'Hours patients waited for ICU after clinical request' },

  // Capacity — physical vs staffed (distinct from Beds domain occupancy)
  { id: 'kpi_icu_staffed_beds', fullName: 'Staffed ICU Beds', display: 'Staffed Beds', screen: 'capacity', route: '/icu/capacity', decision: 'Beds staffed for ICU care at observation' },
  { id: 'kpi_icu_available_staffed', fullName: 'Available Staffed ICU Capacity', display: 'Available Staffed', screen: 'capacity', route: '/icu/capacity', decision: 'Staffed beds not occupied and not blocked' },
  { id: 'kpi_icu_nurse_coverage', fullName: 'ICU Nurse Coverage Rate', display: 'Nurse Coverage', screen: 'capacity', route: '/icu/capacity', decision: 'Staffed nursing hours ÷ required coverage hours' },
  { id: 'kpi_icu_staffing_gap_hours', fullName: 'ICU Staffing Gap Hours', display: 'Staffing Gap', screen: 'capacity', route: '/icu/capacity', decision: 'Required coverage hours not filled' },
  { id: 'kpi_icu_pt_nurse_ratio', fullName: 'ICU Patient-to-Nurse Ratio', display: 'Pt:Nurse Ratio', screen: 'capacity', route: '/icu/capacity', decision: 'Occupied staffed beds ÷ nurses on duty (descriptive)' },

  // Equipment — ventilator and device inventory (not clinical settings)
  { id: 'kpi_icu_vent_patient_days', fullName: 'Ventilated Patient Days', display: 'Vent Patient Days', screen: 'equipment', route: '/icu/equipment', decision: 'Patient-days with an assigned serviceable ventilator' },
  { id: 'kpi_icu_vent_utilization', fullName: 'Ventilator Utilization', display: 'Vent Utilization', screen: 'equipment', route: '/icu/equipment', decision: 'Assigned ventilator-hours ÷ eligible serviceable hours' },
  { id: 'kpi_icu_available_vents', fullName: 'Available Ventilators', display: 'Available Vents', screen: 'equipment', route: '/icu/equipment', decision: 'Serviceable ventilators not currently assigned' },
  { id: 'kpi_icu_equipment_downtime', fullName: 'Critical Equipment Downtime', display: 'Equip Downtime', screen: 'equipment', route: '/icu/equipment', decision: 'Hours ventilators spent in maintenance or preparation' },
  { id: 'kpi_icu_equipment_readiness', fullName: 'Equipment Readiness Rate', display: 'Equip Readiness', screen: 'equipment', route: '/icu/equipment', decision: '(Available + In use) ÷ active inventory' },

  // Quality — process / surveillance completeness (not validated infection rates)
  { id: 'kpi_icu_readmission_rate', fullName: 'ICU Readmission Rate', display: 'Readmission Rate', screen: 'quality', route: '/icu/quality', decision: 'ICU readmissions within 48h ÷ ICU discharges' },
  { id: 'kpi_icu_unplanned_transfer_rate', fullName: 'Unplanned Step-down Transfer Rate', display: 'Unplanned Transfer', screen: 'quality', route: '/icu/quality', decision: 'Unplanned returns to ICU ÷ step-down exits' },
  { id: 'kpi_icu_safety_review_backlog', fullName: 'Safety Review Backlog', display: 'Review Backlog', screen: 'quality', route: '/icu/quality', decision: 'Open safety-event reviews at observation' },
  { id: 'kpi_icu_surveillance_completeness', fullName: 'Infection Surveillance Completeness', display: 'Surveillance Complete', screen: 'quality', route: '/icu/quality', decision: 'Device-days with surveillance documentation ÷ eligible device-days (illustrative)' },
  { id: 'kpi_icu_review_timeliness', fullName: 'Critical Event Review Timeliness', display: 'Review Timeliness', screen: 'quality', route: '/icu/quality', decision: 'Share of closed reviews within the illustrative target window' },

  // Optimization — feasible operational capacity (not clinical discharge pressure)
  { id: 'kpi_icu_recoverable_bed_hours', fullName: 'Recoverable ICU Bed Hours', display: 'Recoverable Hours', screen: 'optimization', route: '/icu/optimization', decision: 'Exclusive recoverable bed hours from flow and readiness drivers' },
  { id: 'kpi_icu_feasible_capacity', fullName: 'Feasible Additional ICU Capacity', display: 'Feasible Capacity', screen: 'optimization', route: '/icu/optimization', decision: 'Additional admissions feasible under staffing and equipment caps' },
  { id: 'kpi_icu_avoidable_transfer_delay', fullName: 'Avoidable Transfer Delay Hours', display: 'Avoidable Delay', screen: 'optimization', route: '/icu/optimization', decision: 'Coordination-related transfer delay hours that are potentially avoidable' },
  { id: 'kpi_icu_staff_constrained', fullName: 'Staff-Constrained Capacity Hours', display: 'Staff Constrained', screen: 'optimization', route: '/icu/optimization', decision: 'Physical bed hours unavailable solely due to staffing gaps' },
];

export const ICU_SCREEN_TITLES: Record<IcuScreenId, string> = {
  command: 'ICU Command Center',
  flow: 'ICU Patient Flow & Throughput',
  capacity: 'Critical Care Capacity & Staffing',
  equipment: 'Ventilation & Equipment Intelligence',
  quality: 'ICU Quality & Safety Intelligence',
  optimization: 'ICU Capacity Optimization',
};

export function ownersForIcuScreen(screen: IcuScreenId): IcuKpiOwner[] {
  return ICU_KPI_OWNERS.filter((item) => item.screen === screen);
}

export function assertUniqueIcuOwnership(owners = ICU_KPI_OWNERS): string[] {
  const seen = new Map<string, string>();
  const issues: string[] = [];
  for (const owner of owners) {
    const prior = seen.get(owner.id);
    if (prior) issues.push(`${owner.id} owned by both ${prior} and ${owner.screen}`);
    else seen.set(owner.id, owner.screen);
  }
  return issues;
}

/** Headline KPIs owned by Domains 1–9 that must not appear as ICU primary ribbons. */
export const ICU_CROSS_DOMAIN_FORBIDDEN = [
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
  'Medication Orders',
  'Stockout SKUs',
  'Median Access Wait',
  'Appointment No-Show Rate',
];
