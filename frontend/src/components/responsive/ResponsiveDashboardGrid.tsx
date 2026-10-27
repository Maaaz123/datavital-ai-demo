import type { ReactNode, CSSProperties } from 'react';
import { Box } from '@mui/material';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { kpiStaggerContainer } from '@/design-system/motion';
import { motion } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface ResponsiveDashboardGridProps {
  children: ReactNode;
  /** Override auto column count from layout band */
  columns?: number;
  gap?: number;
  /** Optional CSS grid-template-areas / templateColumns */
  templateColumns?: string;
  stagger?: boolean;
  sx?: Record<string, unknown>;
}

/**
 * Mobile-first dashboard grid:
 * 1 → 2 → 3 → 4 → 5 → 6 columns by layout band.
 */
export default function ResponsiveDashboardGrid({
  children,
  columns,
  gap = 2,
  templateColumns,
  stagger = false,
  sx,
}: ResponsiveDashboardGridProps) {
  const { columns: autoCols } = useResponsiveLayout();
  const reduced = useReducedMotionPreference();
  const cols = columns ?? autoCols;

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: templateColumns ?? `repeat(${cols}, minmax(0, 1fr))`,
    gap: undefined,
    width: '100%',
    minWidth: 0,
  };

  return (
    <Box
      component={stagger && !reduced ? motion.div : 'div'}
      variants={stagger && !reduced ? kpiStaggerContainer : undefined}
      initial={stagger && !reduced ? 'initial' : undefined}
      animate={stagger && !reduced ? 'animate' : undefined}
      sx={{
        ...style,
        gap,
        '& > *': { minWidth: 0 },
        ...sx,
      }}
      data-testid="responsive-dashboard-grid"
      data-columns={cols}
    >
      {children}
    </Box>
  );
}

/** Span helper for grid children */
export function GridSpan({
  children,
  span = 1,
}: {
  children: ReactNode;
  span?: number | { mobile?: number; tablet?: number; desktop?: number };
}) {
  const { isMobile, isTablet, isTabletLandscape } = useResponsiveLayout();
  let columns = 1;
  if (typeof span === 'number') {
    columns = span;
  } else if (isMobile) {
    columns = span.mobile ?? 1;
  } else if (isTablet || isTabletLandscape) {
    columns = span.tablet ?? 2;
  } else {
    columns = span.desktop ?? 2;
  }

  return <Box sx={{ gridColumn: `span ${columns}`, minWidth: 0 }}>{children}</Box>;
}
