/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import DomainPageHeader from '@/components/product/DomainPageHeader';
import VitalSignsGrid from '@/components/product/VitalSignsGrid';
import { PilotWorkspace } from '@/components/product/MetricBand';
import ChartGrid, { type ChartGridItem } from './ChartGrid';
import DetailDataTable from './DetailDataTable';
import ErrorState from '@/components/common/ErrorState';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import UnauthorizedState from '@/components/common/UnauthorizedState';
import AnimatedSection from '@/components/motion/AnimatedSection';
import type { KPICardData } from '@/types/api';
import { DEFAULT_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import { useFilterStore } from '@/store/filterStore';

export interface DetailTableConfig<T extends object> {
  title?: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  emptyMessage?: string;
}

interface DashboardShellProps<T extends object> {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  generatedAt?: string | null;
  headerActions?: ReactNode;
  chips?: string[];

  /** KPI-band loading only — never blanks the whole page. */
  isLoading?: boolean;
  /** Summary/KPI failure — page chrome stays; KPIs show "—". */
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isUnauthorized?: boolean;

  kpis?: KPICardData[];
  kpisLoading?: boolean;
  onKpiOpen?: (kpi: KPICardData) => void;

  charts?: ChartGridItem[];

  detailTable?: DetailTableConfig<T>;

  children?: ReactNode;

  situationSummary?: ReactNode;
  criticalAlerts?: ReactNode;
  insightPanel?: ReactNode;
  actionsPanel?: ReactNode;
}

export default function DashboardShell<T extends object>({
  title,
  subtitle,
  eyebrow,
  onRefresh,
  refreshing,
  generatedAt,
  headerActions,
  chips,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isUnauthorized,
  kpis,
  kpisLoading,
  onKpiOpen,
  charts,
  detailTable,
  children,
  situationSummary,
  criticalAlerts,
  insightPanel,
  actionsPanel,
}: DashboardShellProps<T>) {
  const year = useFilterStore((s) => s.filters.year);
  const showKpiSkeleton = Boolean(kpisLoading || (isLoading && !kpis?.length && !isError));
  const displayKpis =
    kpis && kpis.length > 0 ? kpis : isError ? DEFAULT_UNAVAILABLE_KPIS : undefined;
  const yearEmptyMessage =
    year != null
      ? `No records for ${year} under the selected hospital and filters.`
      : undefined;

  return (
    <PilotWorkspace>
      <AnimatedSection delay={0}>
        <DomainPageHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          chips={chips}
          lastRefreshAt={generatedAt ? dayjs(generatedAt).format('HH:mm') : null}
          onRefresh={onRefresh}
          refreshing={refreshing}
          actions={headerActions}
        />
      </AnimatedSection>

      {isUnauthorized ? (
        <UnauthorizedState />
      ) : (
        <>
          {isError ? (
            <AnimatedSection delay={0.03}>
              <ErrorState variant="inline" message={errorMessage} onRetry={onRetry} />
            </AnimatedSection>
          ) : null}

          {(situationSummary || criticalAlerts) && !isError && (
            <AnimatedSection delay={0.05}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    lg: situationSummary && criticalAlerts ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : '1fr',
                  },
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                {situationSummary}
                {criticalAlerts}
              </Box>
            </AnimatedSection>
          )}

          {showKpiSkeleton ? (
            <AnimatedSection delay={0.1}>
              <LoadingSkeleton variant="kpi" count={6} />
            </AnimatedSection>
          ) : displayKpis ? (
            <AnimatedSection delay={0.1}>
              <VitalSignsGrid kpis={displayKpis} onOpen={onKpiOpen} />
            </AnimatedSection>
          ) : null}

          {charts && charts.length > 0 && (
            <AnimatedSection delay={0.16} onceInView>
              <ChartGrid charts={charts} />
            </AnimatedSection>
          )}
          {insightPanel && !isError && (
            <AnimatedSection delay={0.2} onceInView>
              {insightPanel}
            </AnimatedSection>
          )}
          {children && (
            <AnimatedSection delay={0.22} onceInView>
              {children}
            </AnimatedSection>
          )}
          {detailTable && (
            <AnimatedSection delay={0.26} onceInView>
              <DetailDataTable
                {...detailTable}
                emptyMessage={detailTable.emptyMessage ?? yearEmptyMessage}
              />
            </AnimatedSection>
          )}
          {actionsPanel && (
            <AnimatedSection delay={0.28} onceInView>
              {actionsPanel}
            </AnimatedSection>
          )}
        </>
      )}
    </PilotWorkspace>
  );
}
