/** Shared product view-model types (Pilot surfaces). */

export interface DecisionPriority {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  area: string;
  metricLabel: string;
  metricValue: string;
  changeLabel?: string;
  investigation: string;
  href: string;
}
