import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { chartPalette, chartSeriesColors } from '@/design-system/chartTheme';
import { brand, slate } from '@/design-system/colors';
import type { ChartPayload, ChartSeries } from '@/types/api';
import { localizeChartPayload } from '@/i18n/localize';

interface EChartProps {
  payload?: ChartPayload | null;
  title?: string;
  height?: number | string;
  loading?: boolean;
}

const AXIS_LESS_TYPES = new Set(['pie', 'funnel', 'gauge', 'heatmap']);

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function isYearMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

/** Short, readable axis labels — e.g. 2026-06-13 → 13 Jun; 2026-06 → Jun */
function formatCategoryLabel(value: string | number): string {
  const raw = String(value);
  if (isYearMonth(raw)) {
    const d = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short' });
    }
  }
  if (isIsoDate(raw)) {
    const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  }
  if (raw.length > 22) return `${raw.slice(0, 20)}…`;
  return raw;
}

function formatTooltipCategory(value: string | number): string {
  const raw = String(value);
  if (isYearMonth(raw)) {
    const d = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  }
  if (isIsoDate(raw)) {
    const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return raw;
}

function periodStatuses(payload: ChartPayload): string[] {
  const raw = payload.meta?.period_statuses;
  return Array.isArray(raw) ? raw.map((s) => String(s)) : [];
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  if (Number.isInteger(value)) return new Intl.NumberFormat().format(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

/** Show ~6–8 ticks max so dates never collide. */
function categoryLabelInterval(count: number, isNarrow: boolean): number | 'auto' {
  const target = isNarrow ? 4 : 7;
  if (count <= target) return 0;
  return Math.max(0, Math.ceil(count / target) - 1);
}

function flattenSeriesValues(series: ChartSeries[]): number[] {
  return series.flatMap((s) => s.data.map((v) => Number(v ?? 0)).filter((n) => Number.isFinite(n)));
}

function niceStep(span: number): number {
  if (span <= 0) return 1;
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / pow;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Prefer a data-aware Y range for trend lines (avoids flat occupancy lines on 0–100).
 * Keep 0 baseline for volume/count series that naturally span from low values.
 */
function valueAxisBounds(values: number[]): { min?: number; max?: number } {
  if (values.length === 0) return {};
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = Math.max(dataMax - dataMin, dataMax * 0.08, 1);
  const looksLikePercent = dataMax <= 100 && dataMin >= 0 && dataMax >= 40;
  const relativelyFlat = dataMax > 0 && (dataMax - dataMin) / dataMax < 0.35;

  if (looksLikePercent || relativelyFlat) {
    const pad = span * 0.2;
    let lo = Math.max(0, dataMin - pad);
    let hi = dataMax + pad;
    if (looksLikePercent) hi = Math.min(100, hi);
    const step = niceStep(hi - lo);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    if (looksLikePercent) hi = Math.min(100, hi);
    return { min: lo, max: hi };
  }

  const step = niceStep(dataMax);
  return { min: 0, max: Math.ceil(dataMax / step) * step || dataMax };
}

function seriesColor(index: number): string {
  return chartPalette[index % chartPalette.length] ?? chartSeriesColors.occupancy;
}

function buildLineSeries(payload: ChartPayload, isDark: boolean): EChartsOption['series'] {
  const single = payload.series.length === 1;
  const statuses = periodStatuses(payload);
  return payload.series.map((s, idx) => {
    const color = seriesColor(idx);
    const hasNulls = s.data.some((v) => v == null);
    const styledData = statuses.length
      ? s.data.map((v, i) => {
          const st = statuses[i];
          if (st === 'NOT_ELAPSED' || st === 'NOT_LOADED' || v == null) {
            return null;
          }
          if (st === 'PARTIAL') {
            return {
              value: v,
              itemStyle: {
                color,
                borderColor: isDark ? '#fbbf24' : '#d97706',
                borderWidth: 2,
              },
              symbol: 'diamond',
              symbolSize: 10,
            };
          }
          return v;
        })
      : s.data;
    return {
      name: s.name,
      type: 'line' as const,
      data: styledData,
      // Disconnect across null / NOT_ELAPSED — never bridge fabricated zeros.
      connectNulls: false,
      smooth: !hasNulls && statuses.length === 0,
      showSymbol: statuses.some((st) => st === 'PARTIAL'),
      symbol: 'circle',
      symbolSize: 8,
      sampling: statuses.length ? undefined : 'lttb',
      lineStyle: { width: 2.5, color, cap: 'round', join: 'round' },
      itemStyle: { color, borderColor: isDark ? '#0f172a' : '#ffffff', borderWidth: 2 },
      emphasis: {
        focus: 'series' as const,
        scale: true,
        itemStyle: { borderWidth: 2 },
      },
      areaStyle: single && !hasNulls
        ? {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}55` },
                { offset: 0.55, color: `${color}22` },
                { offset: 1, color: `${color}00` },
              ],
            },
          }
        : undefined,
    };
  });
}

function buildOption(payload: ChartPayload, isDark: boolean, isNarrow: boolean): EChartsOption {
  const textColor = isDark ? '#A9BED1' : slate[700];
  const muted = isDark ? '#7890A6' : '#7890A6';
  const gridColor = isDark ? 'rgba(148, 180, 204, 0.12)' : 'rgba(61, 81, 102, 0.10)';
  const tipBg = isDark ? '#10263A' : brand.surface;
  const tipBorder = isDark ? 'rgba(148, 180, 204, 0.18)' : brand.border;
  const tipText = isDark ? '#F4F8FC' : brand.textPrimary;
  const hasAxes = !AXIS_LESS_TYPES.has(payload.chart_type);
  const rawCategories = Array.isArray(payload.categories) ? payload.categories : [];
  const series = Array.isArray(payload.series) ? payload.series : [];
  const categories = rawCategories.map(formatCategoryLabel);
  // Use local series copy so callers that omit series do not crash charts
  payload = { ...payload, categories: rawCategories, series };
  const dateAxis = rawCategories.length > 0 && rawCategories.every((c) => isIsoDate(String(c)));
  const longCats = categories.some((c) => c.length > 14);
  const labelInterval = categoryLabelInterval(categories.length, isNarrow);
  const rotate =
    !dateAxis && (isNarrow || longCats) && categories.length > 5
      ? 30
      : !dateAxis && categories.length > 8
        ? 22
        : 0;

  const values = flattenSeriesValues(payload.series);
  const yBounds = payload.chart_type === 'line' || !payload.chart_type || payload.chart_type === 'area'
    ? valueAxisBounds(values)
    : { min: 0 as const };

  const singleSeries = payload.series.length <= 1;
  const showLegend = !singleSeries;

  const base: EChartsOption = {
    color: [...chartPalette],
    textStyle: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: textColor, fontSize: 11 },
    animationDuration: 240,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: hasAxes ? 'axis' : 'item',
      confine: true,
      triggerOn: 'mousemove|click',
      axisPointer: hasAxes
        ? {
            type: 'line',
            lineStyle: { color: muted, type: 'dashed', width: 1 },
          }
        : undefined,
      backgroundColor: tipBg,
      borderColor: tipBorder,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: tipText, fontSize: 12 },
      formatter: hasAxes
        ? (params: unknown) => {
            const list = Array.isArray(params) ? params : [params];
            const first = list[0] as { dataIndex?: number; axisValueLabel?: string; marker?: string; seriesName?: string; value?: number };
            const idx = first?.dataIndex ?? 0;
            const head = formatTooltipCategory(rawCategories[idx] ?? first?.axisValueLabel ?? '');
            const statuses = periodStatuses(payload);
            const status = statuses[idx];
            if (status === 'NOT_ELAPSED') {
              const tip =
                (payload.meta?.not_elapsed_tooltip as string | undefined) || 'Period has not elapsed';
              return `<div style="font-weight:600;margin-bottom:4px">${head}</div>${tip}`;
            }
            if (status === 'NOT_LOADED') {
              return `<div style="font-weight:600;margin-bottom:4px">${head}</div>Period not loaded`;
            }
            const rows = list
              .map((p) => {
                const item = p as { marker?: string; seriesName?: string; value?: number | null };
                const rawVal = item.value;
                if (rawVal == null || Number.isNaN(Number(rawVal))) {
                  return `${item.marker ?? ''} ${item.seriesName ?? ''}: <b>—</b>`;
                }
                const suffix = status === 'PARTIAL' ? ' <span style="opacity:0.75">(partial)</span>' : '';
                return `${item.marker ?? ''} ${item.seriesName ?? ''}: <b>${formatNumber(Number(rawVal))}</b>${suffix}`;
              })
              .join('<br/>');
            return `<div style="font-weight:600;margin-bottom:4px">${head}</div>${rows}`;
          }
        : undefined,
    },
    legend: showLegend
      ? {
          top: 0,
          left: 'center',
          icon: 'roundRect',
          itemWidth: 12,
          itemHeight: 8,
          itemGap: 16,
          textStyle: { color: textColor, fontSize: 11 },
          type: isNarrow ? 'scroll' : 'plain',
        }
      : { show: false },
    grid: hasAxes
      ? {
          left: isNarrow ? 8 : 12,
          right: 12,
          top: showLegend ? 32 : 12,
          bottom: rotate ? 52 : dateAxis ? 28 : 24,
          containLabel: true,
        }
      : undefined,
    xAxis: hasAxes
      ? {
          type: 'category',
          data: categories,
          boundaryGap: payload.chart_type === 'bar' || payload.chart_type === 'stacked_bar',
          axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: {
            color: muted,
            fontSize: 11,
            rotate,
            interval: labelInterval,
            hideOverlap: true,
            margin: 10,
          },
          splitLine: { show: false },
        }
      : undefined,
    yAxis: hasAxes
      ? {
          type: 'value',
          ...yBounds,
          axisLine: { show: false },
          axisTick: { show: false },
          splitNumber: 4,
          splitLine: {
            lineStyle: { color: gridColor, type: 'solid', width: 1 },
          },
          axisLabel: {
            color: muted,
            fontSize: 11,
            formatter: (v: number) => formatNumber(v),
          },
        }
      : undefined,
  };

  if (payload.chart_type === 'pie') {
    return {
      ...base,
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '48%'],
          data: payload.categories.map((cat, i) => ({
            name: String(cat),
            value: Number(payload.series[0]?.data[i] ?? 0),
          })),
          label: { fontSize: 11, color: textColor },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.15)' } },
        },
      ],
    };
  }

  if (payload.chart_type === 'funnel') {
    return {
      ...base,
      series: [
        {
          type: 'funnel',
          left: '10%',
          right: '10%',
          top: 24,
          bottom: 24,
          min: 0,
          max: Math.max(1, ...(payload.series[0]?.data.map((v) => Number(v ?? 0)) ?? [])),
          sort: 'none',
          gap: 2,
          label: { show: true, position: 'inside', color: '#fff', fontWeight: 600 },
          itemStyle: { borderColor: isDark ? '#0f172a' : brand.surface, borderWidth: 1 },
          data: payload.categories.map((cat, i) => ({
            name: String(cat),
            value: Number(payload.series[0]?.data[i] ?? 0),
          })),
        },
      ],
    };
  }

  if (payload.chart_type === 'gauge') {
    const value = Number(payload.series[0]?.data[0] ?? 0);
    const max = Number(payload.meta?.max ?? 100);
    return {
      ...base,
      series: [
        {
          type: 'gauge',
          min: Number(payload.meta?.min ?? 0),
          max,
          startAngle: 200,
          endAngle: -20,
          progress: { show: true, width: 14 },
          axisLine: { lineStyle: { width: 14 } },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, distance: 16, fontSize: 11 },
          pointer: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 700,
            color: isDark ? '#f1f5f9' : '#0f172a',
            offsetCenter: [0, '30%'],
            formatter: (v: number) => `${v}${payload.meta?.unit ?? ''}`,
          },
          data: [{ value, name: String(payload.categories[0] ?? payload.series[0]?.name ?? '') }],
        },
      ],
    };
  }

  if (payload.chart_type === 'heatmap') {
    const yCategories = payload.series.map((s) => s.name);
    const points: [number, number, number][] = [];
    payload.series.forEach((s, yIdx) => {
      s.data.forEach((v, xIdx) => {
        points.push([xIdx, yIdx, Number(v ?? 0)]);
      });
    });
    const heatValues = points.map((p) => p[2]);
    const maxVal = heatValues.length ? Math.max(...heatValues) : 1;
    return {
      color: [...chartPalette],
      textStyle: base.textStyle,
      tooltip: {
        trigger: 'item',
        confine: true,
        triggerOn: 'mousemove|click',
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number] };
          const [xIdx, yIdx, val] = p.value;
          return `${yCategories[yIdx]} · ${payload.categories[xIdx]}<br/>${val}`;
        },
      },
      grid: { left: 96, right: 24, top: 24, bottom: 64, containLabel: false },
      xAxis: {
        type: 'category',
        data: categories,
        splitArea: { show: true },
        axisLabel: { color: textColor, rotate, interval: labelInterval, hideOverlap: true },
      },
      yAxis: {
        type: 'category',
        data: yCategories,
        splitArea: { show: true },
        axisLabel: { color: textColor },
      },
      visualMap: {
        min: 0,
        max: maxVal || 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: textColor },
        inRange: { color: [isDark ? '#0f2f2f' : '#e0f2f2', '#0a6666'] },
      },
      series: [
        {
          type: 'heatmap',
          data: points,
          label: { show: !isNarrow && categories.length <= 12, color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } },
        },
      ],
    };
  }

  if (payload.chart_type === 'stacked_bar') {
    return {
      ...base,
      series: payload.series.map((s) => ({
        name: s.name,
        type: 'bar',
        stack: 'total',
        data: s.data,
        barMaxWidth: 36,
        emphasis: { focus: 'series' },
      })),
    };
  }

  if (payload.chart_type === 'bar') {
    return {
      ...base,
      series: payload.series.map((s, idx) => ({
        name: s.name,
        type: 'bar',
        data: s.data,
        barMaxWidth: 40,
        itemStyle: {
          color: seriesColor(idx),
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: { focus: 'series' },
      })),
    };
  }

  // Default + explicit line / area
  return {
    ...base,
    series: buildLineSeries(payload, isDark),
  };
}

export default function EChart({ payload, title, height = 320, loading }: EChartProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isNarrow = useMediaQuery('(max-width:599.95px)');
  const { t, i18n } = useTranslation();
  const localizedPayload = useMemo(
    () => localizeChartPayload(payload, t, i18n.language) ?? null,
    [payload, t, i18n.language],
  );

  const option = useMemo(() => {
    if (!localizedPayload) return {};
    const opt = buildOption(localizedPayload, isDark, isNarrow);
    if (title) {
      opt.title = {
        text: title,
        left: 'left',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 650, color: isDark ? '#f1f5f9' : '#0f172a' },
      };
      if (opt.grid && typeof opt.grid === 'object' && !Array.isArray(opt.grid)) {
        opt.grid = { ...opt.grid, top: Math.max(Number(opt.grid.top ?? 12), 36) };
      }
    }
    return opt;
  }, [localizedPayload, isDark, isNarrow, title]);

  if (!localizedPayload) return null;

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
