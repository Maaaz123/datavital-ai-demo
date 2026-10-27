/**
 * Commercial density layout tokens — premium hospital command platform.
 * Prefer tight enterprise spacing over decorative whitespace.
 */
export const layoutDensity = {
  pageGutterX: { xs: 16, md: 24, lg: 28 },
  pageGutterY: { xs: 16, md: 20, lg: 24 },
  sectionGap: 24,
  rowGap: 16,
  cardPadding: 20,
  kpiPadding: 16,
  tableRowHeight: 48,
  toolbarHeight: 48,
  headerHeight: 52,
  filterBarHeight: 44,
  // Tall enough for the shell YearSelector (MUI small select + label).
  contextBarHeight: 48,
  chartCompact: 280,
  chartMain: 360,
  chartCommand: 320,
  borderRadius: 12,
  maxContentWidth: '100%',
} as const;

/** 12-column span helpers for desktop-first dashboards */
export const col = {
  full: 12,
  half: 6,
  third: 4,
  twoThirds: 8,
  kpi: 2, // 6 KPIs per row
  mainChart: 8,
  sidePanel: 4,
  scorecard: 7,
  risk: 5,
} as const;

export const gridTemplate = {
  desktop12: 'repeat(12, minmax(0, 1fr))',
  tablet8: 'repeat(8, minmax(0, 1fr))',
  tablet6: 'repeat(6, minmax(0, 1fr))',
  mobile4: 'repeat(4, minmax(0, 1fr))',
} as const;

export type ColSpan = number | { xs?: number; sm?: number; md?: number; lg?: number };
