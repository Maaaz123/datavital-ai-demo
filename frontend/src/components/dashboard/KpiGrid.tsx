import { Box } from '@mui/material';
import KPICard from '@/components/common/KPICard';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import EmptyState from '@/components/common/EmptyState';
import AnimatedKpiCard from '@/components/motion/AnimatedKpiCard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { KPICardData } from '@/types/api';

interface KpiGridProps {
  kpis?: KPICardData[];
  loading?: boolean;
}

/** Dense KPI grid — 6 on desktop, 3 tablet, 2 mobile, 1 mobileSm */
export default function KpiGrid({ kpis, loading }: KpiGridProps) {
  const { isMobileSm, isMobile, isTablet, isTabletLandscape } = useResponsiveLayout();

  if (loading) {
    return <LoadingSkeleton variant="kpi" count={6} />;
  }

  if (!kpis || kpis.length === 0) {
    return <EmptyState />;
  }

  const cols = isMobileSm ? 1 : isMobile ? 2 : isTablet ? 3 : isTabletLandscape ? 3 : 6;

  return (
    <Box
      data-testid="kpi-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 1.25,
        width: '100%',
        '& > *': { minWidth: 0, minHeight: 96 },
      }}
    >
      {kpis.map((kpi, index) => (
        <AnimatedKpiCard key={kpi.key} changeKey={`${kpi.key}:${kpi.value}`} index={index}>
          <Box sx={{ height: '100%' }}>
            <KPICard kpi={kpi} />
          </Box>
        </AnimatedKpiCard>
      ))}
    </Box>
  );
}
