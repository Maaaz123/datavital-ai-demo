import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import EChart from '@/components/charts/EChart';
import ChartContainer from '@/components/ux/ChartContainer';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { chartItemVariants, motionDurations, motionEasings } from '@/design-system/motion';
import { layoutDensity } from '@/design-system/layout';
import type { ChartPayload } from '@/types/api';

export interface ChartGridItem {
  key: string;
  title: string;
  subtitle?: string;
  unit?: string;
  period?: string;
  dataSource?: string;
  accessibleDescription?: string;
  payload?: ChartPayload | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  height?: number;
  /** Desktop span out of 12. Defaults to 6. */
  span?: number;
}

interface ChartGridProps {
  charts: ChartGridItem[];
}

function seriesHasValues(payload: ChartPayload): boolean {
  return (payload.series || []).some((s) =>
    (s.data || []).some((v) => v != null && v !== '' && Number(v) !== 0),
  );
}

function isChartEmpty(payload?: ChartPayload | null): boolean {
  if (!payload) return true;
  const meta = payload.meta || {};
  if (meta.data_status === 'unavailable') return true;
  if (typeof meta.empty_reason === 'string' && meta.empty_reason && (payload.categories?.length ?? 0) === 0) {
    return true;
  }
  if (!payload.categories?.length) return true;
  // Fixed-axis charts (e.g. 24 hours) with all zeros + empty_reason
  if (typeof meta.empty_reason === 'string' && meta.empty_reason && !seriesHasValues(payload)) {
    return true;
  }
  return false;
}

function emptyMessageFor(payload?: ChartPayload | null): string {
  const meta = payload?.meta || {};
  if (typeof meta.empty_reason === 'string' && meta.empty_reason.trim()) {
    return meta.empty_reason;
  }
  if (meta.data_status === 'unavailable') {
    return 'This visualization is unavailable because a required source field or mart is missing.';
  }
  return 'No data for this chart in the selected period. Adjust filters or date range.';
}

export default function ChartGrid({ charts }: ChartGridProps) {
  const { isMobile } = useResponsiveLayout();
  const reduced = useReducedMotionPreference();
  const defaultHeight = isMobile ? layoutDensity.chartCompact - 40 : layoutDensity.chartCompact;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(12, minmax(0, 1fr))',
        },
        gap: 1.5,
        width: '100%',
        alignItems: 'stretch',
      }}
    >
      {charts.map((chart, index) => {
        const errored = Boolean(chart.error);
        const empty = !chart.loading && !errored && isChartEmpty(chart.payload);
        const span = chart.span ?? 6;
        return (
          <Box
            key={chart.key}
            component={motion.div}
            variants={chartItemVariants}
            initial={reduced ? false : 'initial'}
            animate="animate"
            transition={{
              duration: reduced ? 0 : motionDurations.standard,
              ease: motionEasings.enter,
              delay: reduced ? 0 : 0.08 + index * 0.07,
            }}
            sx={{
              gridColumn: { xs: 'span 1', md: `span ${span}` },
              minWidth: 0,
              height: '100%',
              '& > *': { height: '100%' },
            }}
          >
            <ChartContainer
              title={chart.title}
              subtitle={chart.subtitle}
              unit={chart.unit}
              period={chart.period}
              dataSource={chart.dataSource}
              accessibleDescription={chart.accessibleDescription ?? chart.title}
              loading={chart.loading}
              error={errored}
              onRetry={chart.onRetry}
              empty={empty}
              emptyMessage={emptyMessageFor(chart.payload)}
              fullscreenEnabled
            >
              {!empty && !errored && chart.payload ? (
                <EChart payload={chart.payload} height={chart.height ?? defaultHeight} />
              ) : null}
            </ChartContainer>
          </Box>
        );
      })}
    </Box>
  );
}
