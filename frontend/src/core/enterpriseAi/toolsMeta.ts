/** Shared intervention metadata — kept separate to avoid circular imports. */

/** Opportunity / intervention ids that increase staffing cost. */
export const STAFFING_COST_OPTIONS = new Set<string>([
  'st-reallocate-nurses',
  'st-staff-constrained-sl',
  'st-extend-or-hours',
  'ent-staffing-uplift',
  'icu-staffing-uplift',
]);

/** Preferred interventions under no-additional-staffing-cost. */
export const NO_STAFFING_COST_OPTIONS = [
  'ent-bed-assign-flow',
  'st-supply-efficiency',
  'st-reduce-overtime',
  'ed-boarding-down',
  'rcm-denials-down',
] as const;
