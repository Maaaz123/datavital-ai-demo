import type { ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { brand } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

interface ChartSectionProps {
  title: string;
  subtitle?: string;
  headline?: string | null;
  height?: number;
  actions?: ReactNode;
  children?: ReactNode;
  /** When true, use soft elevation (focal chart). */
  elevated?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  emptyMessage?: string;
}

/** Analytical chart block — title + optional data-driven headline + chart. */
export default function ChartSection({
  title,
  subtitle,
  headline,
  height = 320,
  actions,
  children,
  elevated = false,
  loading = false,
  error = false,
  onRetry,
  empty = false,
  emptyMessage,
}: ChartSectionProps) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        bgcolor: brand.surface,
        border: `1px solid ${brand.border}`,
        boxShadow: elevated ? brand.shadowSoft : 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1, alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...typographySx('chartTitle'), color: brand.deepNavy }}>{title}</Typography>
          {subtitle ? (
            <Typography sx={{ ...typographySx('metadata'), color: brand.textMuted, mt: 0.35 }}>{subtitle}</Typography>
          ) : null}
          {headline && !error ? (
            <Typography
              sx={{
                ...typographySx('supporting'),
                color: brand.textSecondary,
                mt: 1,
                fontWeight: 500,
              }}
            >
              {headline}
            </Typography>
          ) : null}
        </Box>
        {actions}
      </Box>
      <Box sx={{ flex: 1, minHeight: height, width: '100%', display: 'flex', alignItems: 'stretch' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" width="100%" minHeight={height}>
            <CircularProgress size={28} aria-label="Loading chart" />
          </Box>
        ) : error ? (
          <Box width="100%" display="flex" alignItems="center" justifyContent="center">
            <ErrorState variant="compact" onRetry={onRetry} />
          </Box>
        ) : empty ? (
          <Box width="100%" display="flex" alignItems="center" justifyContent="center">
            <EmptyState title={emptyMessage ?? 'No data available'} />
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
}
