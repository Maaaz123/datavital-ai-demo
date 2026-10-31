/**
 * Lightweight typed knowledge graph for Domain 16 Enterprise AI.
 * Edges are associative or operational links — never patient-level clinical causality.
 */
import type { KnowledgeEdge } from './types';

const EDGES: KnowledgeEdge[] = [
  {
    id: 'ed-boarding-beds',
    from: 'ed.boarding.gt4h_rate',
    to: 'beds.occupancy',
    direction: '↔',
    scope: 'Same hospital + period; ED admissions cohort vs Beds staffed census',
    evidence: 'Boarding rate uses ED admissions; high occupancy reduces placement options and extends boarding.',
    join: 'hospital + year + period (operational, not encounter-level join)',
    interpretation: 'Capacity pressure and ED boarding move together operationally; occupancy is a confounder for boarding, not an ED KPI.',
    confounders: ['ED acuity mix', 'discharge timing', 'blocked beds', 'ICU divert'],
    causalClaim: 'operational-link',
  },
  {
    id: 'ed-wait-beds',
    from: 'ed.wait.median_min',
    to: 'beds.occupancy',
    direction: '↔',
    scope: 'Same hospital + period',
    evidence: 'Enterprise Assist / what-if treat ED wait and bed occupancy as co-moving pressure signals.',
    join: 'hospital + year + period via buildEnterpriseView facts',
    interpretation: 'Associative operational pressure — not a claim that occupancy causes individual wait minutes.',
    confounders: ['arrival surge', 'provider staffing', 'triage acuity'],
    causalClaim: 'associative',
  },
  {
    id: 'icu-demand-nursing-capacity',
    from: 'icu.required_nurse_hours',
    to: 'icu.staffing_gap_hours',
    direction: '→',
    scope: 'ICU credentialed nurse hours only',
    evidence: 'Gap = max(0, required − staffed) from buildIcuView; mirrored on Strategy as icuStaffingGapHours.',
    join: 'Same ICU view identity',
    interpretation: 'ICU demand drives the ICU credentialed gap. Enterprise surplus ≠ automatic ICU fill without credentials (P1-005).',
    confounders: ['credential mix', 'overtime policy', 'float pool eligibility'],
    causalClaim: 'operational-link',
  },
  {
    id: 'icu-gap-vs-enterprise-gap',
    from: 'icu.staffing_gap_hours',
    to: 'st.enterprise_staffing_gap_hours',
    direction: '↔',
    scope: 'ICU credentialed scope vs enterprise-wide Strategy workforce scope',
    evidence: 'st-icu-staffing tests: scopes may diverge; both exposed on Enterprise staffing exception.',
    join: 'hospital + year + period; documented dual scopes',
    interpretation: 'Different denominators — never force equality. Use both for workforce decisions.',
    confounders: ['non-ICU ward demand', 'redeployable surplus constraints'],
    causalClaim: 'associative',
  },
  {
    id: 'surgery-theatre-postop-beds',
    from: 'surg.or_utilization',
    to: 'beds.occupancy',
    direction: '→',
    scope: 'Same hospital + period; elective/emergency mix',
    evidence: 'Completed cases create postoperative bed demand; Strategy reads OR utilization as capacity input.',
    join: 'hospital + year + period (operational)',
    interpretation: 'High theatre throughput can tighten ward/ICU bed availability; cancellations and PACU also mediate.',
    confounders: ['case mix', 'same-day discharge rate', 'PACU boarding', 'cancellation rate'],
    causalClaim: 'operational-link',
  },
  {
    id: 'surgery-completed-ipd',
    from: 'surg.completed',
    to: 'ipd.admissions',
    direction: '↔',
    scope: 'Overlapping but not identical cohorts',
    evidence: 'Many surgical completions admit/continue as inpatients; not 1:1 with IPD admissions.',
    join: 'hospital + year + period (cohort overlap, not identity)',
    interpretation: 'Associative volume link — do not equate completed surgeries with inpatient admissions.',
    confounders: ['day surgery share', 'ED medical admissions', 'transfers'],
    causalClaim: 'associative',
  },
  {
    id: 'revenue-sl-contribution',
    from: 'rcm.net_patient_revenue',
    to: 'st.operating_contribution',
    direction: '→',
    scope: 'Recognized RCM NPR → Strategy SL allocation → contribution',
    evidence: 'P0-001: recognizedNetRevenue = rcm.netPatientRevenue; CM = NPR − synthetic direct costs.',
    join: 'Exact revenue identity; cost model is synthetic',
    interpretation: 'Revenue lineage is authoritative from RCM. Contribution depends on synthetic costs — revenue ≠ profit.',
    confounders: ['eligible direct cost assumptions', 'unallocated revenue', 'payer mix'],
    causalClaim: 'operational-link',
  },
  {
    id: 'revenue-sl-cm-rate',
    from: 'st.recognized_net_revenue',
    to: 'st.contribution_margin_rate',
    direction: '→',
    scope: 'Strategy financial model',
    evidence: 'CM Rate = operatingContribution / recognizedNetRevenue when NPR > 0.',
    join: 'Same Strategy assemble()',
    interpretation: 'Rate (%) is distinct from Operating Contribution SAR (P1-006 / P1-007).',
    confounders: ['cost allocation weights', 'zero-revenue periods'],
    causalClaim: 'operational-link',
  },
  {
    id: 'supply-ops-constraints',
    from: 'sc.supply_availability',
    to: 'sc.critical_stockouts',
    direction: '↔',
    scope: 'Supply Chain inventory / fulfillment',
    evidence: 'Low availability and critical stockouts constrain clinical and OR throughput.',
    join: 'Same buildScView period',
    interpretation: 'Operational constraint pair — availability ∈ [0,1]; stockouts are event counts.',
    confounders: ['forecast demand', 'quarantine outflow', 'supplier OTD'],
    causalClaim: 'operational-link',
  },
  {
    id: 'supply-strategy-consumption',
    from: 'sc.critical_stockouts',
    to: 'st.operating_contribution',
    direction: '↔',
    scope: 'Linked but different units (units vs synthetic SAR)',
    evidence: 'Strategy crossDomain.scClinicalConsumption mirrors SC units; ST consumables remain synthetic SAR.',
    join: 'Documented cross-domain link — not double-counted totals',
    interpretation: 'Associative ops/finance constraint — do not sum unit consumption into SAR contribution.',
    confounders: ['unit vs SAR mismatch', 'eligible cost model'],
    causalClaim: 'associative',
  },
  {
    id: 'quality-investigation-capa',
    from: 'qs.validated_event_rate',
    to: 'qs.overdue_high_risk_actions',
    direction: '→',
    scope: 'Quality & Safety governance workflow',
    evidence: 'Validated events feed investigation; overdue high-risk CAPA is the escalation stock.',
    join: 'Same QS view period',
    interpretation: 'Operational governance link — not a claim that event rate causes patient harm outcomes.',
    confounders: ['reporting culture', 'investigation staffing', 'action owner capacity'],
    causalClaim: 'operational-link',
  },
  {
    id: 'quality-clabsi-surveillance',
    from: 'qs.clabsi_rate',
    to: 'qs.overdue_high_risk_actions',
    direction: '↔',
    scope: 'Infection prevention + CAPA',
    evidence: 'Elevated device-day densities often co-travel with open prevention CAPA.',
    join: 'Same hospital + period; surveillance completeness caveats',
    interpretation: 'Associative safety signal — never patient-level causality; zero device-days → missing density.',
    confounders: ['device-day completeness', 'bundle compliance', 'case mix'],
    causalClaim: 'associative',
  },
  {
    id: 'px-wait-satisfaction',
    from: 'ed.wait.median_min',
    to: 'px.overall_satisfaction',
    direction: '↔',
    scope: 'Experience vs operational wait (correlation ≠ causation)',
    evidence: 'PX documents ED wait as context only on waiting dimension.',
    join: 'hospital + year + period; survey vs encounter clocks differ',
    interpretation: 'Associative only — survey response bias and service recovery confound.',
    confounders: ['survey response rate', 'service recovery', 'non-ED journeys'],
    causalClaim: 'associative',
  },
  {
    id: 'denial-revenue-pressure',
    from: 'rcm.gross_denial_rate',
    to: 'rcm.net_patient_revenue',
    direction: '↔',
    scope: 'Revenue Cycle claims vs recognized NPR',
    evidence: 'Denials affect cash and recoverable value; NPR is recognized revenue after allowances.',
    join: 'Same RCM view; denial rate is claim-count, NPR is SAR',
    interpretation: 'Operational finance link — denial rate is not a direct arithmetic factor of NPR in this demo.',
    confounders: ['payer mix', 'appeal success', 'charge capture'],
    causalClaim: 'associative',
  },
];

const BY_ID = new Map(EDGES.map((edge) => [edge.id, edge]));

export function listKnowledgeEdges(): readonly KnowledgeEdge[] {
  return EDGES;
}

export function getKnowledgeEdge(id: string): KnowledgeEdge | undefined {
  return BY_ID.get(id);
}

export function edgesFrom(metricId: string): KnowledgeEdge[] {
  return EDGES.filter((edge) => edge.from === metricId || (edge.direction === '↔' && edge.to === metricId));
}

export function edgesTo(metricId: string): KnowledgeEdge[] {
  return EDGES.filter((edge) => edge.to === metricId || (edge.direction === '↔' && edge.from === metricId));
}

export function assertNoPatientCausality(edges: readonly KnowledgeEdge[] = EDGES): boolean {
  return edges.every((edge) => edge.causalClaim === 'associative' || edge.causalClaim === 'operational-link');
}
