import { brand } from './colors';

export const chartSeriesColors = {
  occupancy: brand.primaryBlue,
  emergency: brand.critical,
  revenue: brand.positive,
  denials: brand.warning,
  volume: brand.teal,
  capacity: brand.cyan,
  ai: brand.teal,
} as const;

/** Restrained professional palette — max ~5 series in practice */
export const chartPalette = [
  brand.primaryBlue,
  brand.teal,
  brand.cyan,
  brand.warning,
  brand.critical,
  brand.positive,
  brand.neutral,
] as const;

export const chartTypography = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  titleSize: 13,
  labelSize: 11,
  tooltipSize: 12,
  color: brand.textSecondary,
  titleColor: brand.textPrimary,
  muted: brand.textMuted,
} as const;

export const chartGrid = {
  left: 12,
  right: 12,
  top: 28,
  bottom: 28,
  containLabel: true,
  borderColor: brand.border,
} as const;

export const chartTooltip = {
  backgroundColor: brand.surface,
  borderColor: brand.border,
  borderWidth: 1,
  textStyle: { color: brand.textPrimary, fontSize: chartTypography.tooltipSize },
  extraCssText: `box-shadow: ${brand.shadowCard}; border-radius: 10px; padding: 10px 12px;`,
} as const;

export const chartAnimation = {
  duration: 550,
  durationUpdate: 300,
  easing: 'cubicOut' as const,
  /** Disable / shorten when prefers-reduced-motion or large series */
  largeDataThreshold: 400,
};

export const semanticSeriesColors = {
  positive: brand.positive,
  warning: brand.warning,
  critical: brand.critical,
  neutral: brand.neutral,
  primary: brand.primaryBlue,
  secondary: brand.teal,
} as const;

export function targetLineBuilder(value: number, label = 'Target') {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: { type: 'dashed' as const, width: 1.5, color: brand.neutral },
    label: {
      show: true,
      formatter: label,
      position: 'insideEndTop' as const,
      color: brand.textMuted,
      fontSize: 10,
    },
    data: [{ yAxis: value }],
  };
}

export function thresholdBandBuilder(min: number, max: number, color = 'rgba(201, 131, 22, 0.12)') {
  return {
    silent: true,
    itemStyle: { color },
    data: [[{ yAxis: min }, { yAxis: max }]],
  };
}

export function responsiveChartOptions(isNarrow: boolean) {
  return {
    grid: {
      ...chartGrid,
      left: isNarrow ? 8 : chartGrid.left,
      top: isNarrow ? 36 : chartGrid.top,
    },
    legend: {
      type: isNarrow ? ('scroll' as const) : ('plain' as const),
      textStyle: { color: chartTypography.color, fontSize: 11 },
    },
  };
}

export const productChartTheme = {
  color: [...chartPalette],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: chartTypography.fontFamily,
    color: chartTypography.color,
  },
  title: {
    textStyle: {
      fontWeight: 600,
      color: chartTypography.titleColor,
    },
  },
  legend: {
    textStyle: {
      color: chartTypography.color,
    },
  },
  grid: {
    borderColor: brand.border,
    containLabel: true,
  },
  tooltip: chartTooltip,
  categoryAxis: {
    axisLine: { lineStyle: { color: brand.border } },
    axisLabel: { color: brand.textMuted },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisLabel: { color: brand.textMuted },
    splitLine: { lineStyle: { color: brand.border, type: 'dashed' as const } },
  },
  animationDuration: chartAnimation.duration,
  animationEasing: chartAnimation.easing,
} as const;

/** @deprecated use productChartTheme */
export const echartsTheme = productChartTheme;

export { brand };
