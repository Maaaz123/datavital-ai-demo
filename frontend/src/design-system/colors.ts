/** Marketing-aligned product palette — light-first analytical workspace. */

export const brand = {
  /* Navigation */
  sidebar: '#081B2C',
  sidebarElevated: '#0D2539',
  sidebarText: '#DCE9F3',
  sidebarMuted: '#87A1B5',
  activeBg: 'rgba(44, 193, 224, 0.14)',
  activeAccent: '#2CC1E0',

  /* Workspace */
  appBg: '#F4F7FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  surfaceSoft: '#EFF8FC',
  textPrimary: '#102A43',
  textSecondary: '#526D82',
  textMuted: '#8298AA',
  border: '#E2EAF0',

  /* Brand */
  primaryBlue: '#2377D1',
  teal: '#18A7A0',
  cyan: '#2CC1E0',
  deepNavy: '#0A2540',

  /* Semantic */
  positive: '#188A68',
  warning: '#C98316',
  critical: '#C94A5B',
  neutral: '#667E91',

  /* Shadows (marketing soft/card, toned for product) */
  shadowSoft: '0 4px 24px -4px rgba(16, 42, 67, 0.08)',
  shadowCard: '0 8px 30px -8px rgba(16, 42, 67, 0.10)',
} as const;

/** Legacy teal scale — mapped toward brand for gradual migration */
export const teal = {
  50: '#EFF8FC',
  100: '#D9EEF8',
  200: '#B3DDF0',
  300: '#7CC8E4',
  400: '#2CC1E0',
  500: '#2377D1',
  600: '#1B5FA8',
  700: '#0A2540',
  800: '#0D2539',
  900: '#081B2C',
} as const;

export const slate = {
  50: '#F4F7FA',
  100: '#F8FAFC',
  200: '#E2EAF0',
  300: '#C5D4E0',
  400: '#8298AA',
  500: '#667E91',
  600: '#526D82',
  700: '#3D5166',
  800: '#0D2539',
  900: '#102A43',
} as const;

export const semantic = {
  healthy: brand.positive,
  warning: brand.warning,
  critical: brand.critical,
  info: brand.primaryBlue,
  inactive: brand.neutral,
  ai: brand.teal,
} as const;

export const cssVarNames = {
  teal50: '--hap-teal-50',
  teal100: '--hap-teal-100',
  teal200: '--hap-teal-200',
  teal300: '--hap-teal-300',
  teal400: '--hap-teal-400',
  teal500: '--hap-teal-500',
  teal600: '--hap-teal-600',
  teal700: '--hap-teal-700',
  teal800: '--hap-teal-800',
  teal900: '--hap-teal-900',
  slate50: '--hap-slate-50',
  slate100: '--hap-slate-100',
  slate200: '--hap-slate-200',
  slate300: '--hap-slate-300',
  slate400: '--hap-slate-400',
  slate500: '--hap-slate-500',
  slate600: '--hap-slate-600',
  slate700: '--hap-slate-700',
  slate800: '--hap-slate-800',
  slate900: '--hap-slate-900',
  healthy: '--hap-healthy',
  warning: '--hap-warning',
  critical: '--hap-critical',
  info: '--hap-info',
  inactive: '--hap-inactive',
  ai: '--hap-ai',
  bgDefault: '--hap-bg-default',
  bgPaper: '--hap-bg-paper',
  bgElevated: '--hap-bg-elevated',
  bgSidebar: '--hap-bg-sidebar',
  textPrimary: '--hap-text-primary',
  textSecondary: '--hap-text-secondary',
  textMuted: '--hap-text-muted',
  border: '--hap-border',
  primary: '--hap-primary',
  primaryLight: '--hap-primary-light',
  accentCyan: '--hap-accent-cyan',
  shadow: '--hap-shadow',
} as const;

export type CssVarName = (typeof cssVarNames)[keyof typeof cssVarNames];

export function cssVar(name: CssVarName): string {
  return `var(${name})`;
}

export const severityCssVar: Record<keyof typeof semantic, CssVarName> = {
  healthy: cssVarNames.healthy,
  warning: cssVarNames.warning,
  critical: cssVarNames.critical,
  info: cssVarNames.info,
  inactive: cssVarNames.inactive,
  ai: cssVarNames.ai,
};
