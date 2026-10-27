/** Dark operations-wall tokens — distinct from light dashboards. */
export const ops = {
  bg: '#070b14',
  bgElevated: '#0d1524',
  bgPanel: '#111a2b',
  bgRail: '#0a1220',
  border: '#1e2a3f',
  borderStrong: '#2a3b55',
  text: '#e8eef7',
  textMuted: '#8b9bb4',
  textDim: '#5c6d86',
  teal: '#2dd4bf',
  healthy: '#34d399',
  warning: '#fbbf24',
  critical: '#f87171',
  info: '#60a5fa',
  accent: '#14b8a6',
} as const;

export type OpsStatus = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';

export function opsStatusColor(status?: OpsStatus | string | null): string {
  switch (status) {
    case 'critical':
      return ops.critical;
    case 'warning':
      return ops.warning;
    case 'healthy':
      return ops.healthy;
    case 'info':
      return ops.info;
    default:
      return ops.teal;
  }
}
