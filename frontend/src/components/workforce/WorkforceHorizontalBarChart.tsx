import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@mui/material/styles';
import { brand } from '@/design-system/colors';
import { chartTypography, chartTooltip, productChartTheme } from '@/design-system/chartTheme';
import type { ChartPayload } from '@/types/api';

interface Props {
  payload?: ChartPayload | null;
  height?: number;
  loading?: boolean;
}

/** Horizontal bar + target line for department achievement (Pilot chart theme). */
export default function WorkforceHorizontalBarChart({ payload, height = 320, loading }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const option = useMemo(() => {
    if (!payload) return {};
    const categories = payload.categories.map(String);
    const actual = payload.series[0]?.data.map((v) => Number(v ?? 0)) ?? [];
    const targetLine = Number(payload.meta?.target_line ?? 100);
    const below = (payload.meta?.below_target_flags as boolean[] | undefined) ?? actual.map((v) => v < targetLine);

    return {
      ...productChartTheme,
      tooltip: {
        ...chartTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: 12, right: 28, top: 16, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value',
        max: Math.max(120, ...actual, targetLine),
        axisLabel: { color: chartTypography.muted, formatter: '{value}%' },
        splitLine: { lineStyle: { color: brand.border, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        // Categories are sorted weakest→strongest; invert so the weakest appears at the top.
        inverse: true,
        axisLabel: { color: chartTypography.color, width: 120, overflow: 'truncate' },
        axisLine: { lineStyle: { color: brand.border } },
      },
      series: [
        {
          name: payload.series[0]?.name ?? 'Achievement',
          type: 'bar',
          data: actual.map((v, i) => ({
            value: v,
            itemStyle: {
              color: below[i] ? brand.critical : brand.primaryBlue,
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: isDark ? brand.sidebarText : brand.textSecondary,
            fontSize: 11,
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', width: 1.5, color: brand.neutral },
            data: [{ xAxis: targetLine, name: 'Target' }],
            label: {
              formatter: 'Target',
              color: brand.textMuted,
              fontSize: 10,
            },
          },
        },
      ],
    };
  }, [payload, isDark]);

  if (!payload) return null;

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
      showLoading={loading}
      opts={{ renderer: 'canvas' }}
    />
  );
}
