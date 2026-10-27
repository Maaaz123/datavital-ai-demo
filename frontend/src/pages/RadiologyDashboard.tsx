/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Chip } from '@mui/material';
import DashboardShell from '@/components/dashboard/DashboardShell';
import MiniListTable from '@/components/dashboard/MiniListTable';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import {
  fetchRadiologySummary,
  fetchRadiologyTrends,
  fetchRadiologyBreakdown,
  fetchRadiologyStatusDistribution,
  fetchRadiologyDetails,
  fetchPendingReports,
} from '@/api/radiology';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatHours, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function RadiologyDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['radiology-summary', filters], queryFn: () => fetchRadiologySummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['radiology-trends', filters], queryFn: () => fetchRadiologyTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['radiology-breakdown', filters], queryFn: () => fetchRadiologyBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['radiology-status', filters], queryFn: () => fetchRadiologyStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['radiology-details', filters], queryFn: () => fetchRadiologyDetails(filters) });
  const pendingQuery = useQuery({ queryKey: ['radiology-pending', filters], queryFn: () => fetchPendingReports(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('radiology-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'orders', title: t('radiology.ordersTrend'), payload: trends?.orders_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'tat', title: t('radiology.tatTrend'), payload: trends?.tat_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('radiology.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('radiology.orderStatusDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('procedure_name', { header: t('radiology.table.procedure'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('order_status', { header: t('radiology.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> }),
    columnHelper.accessor('ordered_at', { header: t('radiology.table.ordered'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('reported_at', { header: t('radiology.table.reported'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('tat_hours', { header: t('radiology.table.tat'), cell: (info) => formatHours(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('radiology.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('radiology.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const pendingColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('radiology.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('procedure_name', { header: t('radiology.table.procedure'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('modality', { header: t('radiology.table.modality'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hours_pending', { header: t('radiology.table.hoursPending'), cell: (info) => formatHours(info.getValue()) }),
    columnHelper.accessor('radiologist', { header: t('radiology.table.radiologist'), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'radiology');

  return (
    <DashboardShell<DataRow>
      title={t('radiology.title')}
      subtitle={t('radiology.subtitle')}
      onRefresh={handleRefresh}
      generatedAt={summaryQuery.data?.generated_at}
      isLoading={summaryQuery.isLoading}
      isError={summaryQuery.isError}
      onRetry={() => summaryQuery.refetch()}
      kpis={summaryQuery.data?.data}
      situationSummary={situationSummary}
      insightPanel={insightPanel}
      charts={charts}
      detailTable={{
        title: t('radiology.detailsTable'),
        data: detailsQuery.data?.data ?? [],
        columns: detailColumns,
        loading: detailsQuery.isLoading,
        error: detailsQuery.isError,
        onRetry: () => detailsQuery.refetch(),
        page: filters.page,
        pageSize: filters.page_size,
        totalRecords: detailsQuery.data?.meta?.total_records ?? 0,
        onPageChange: (page) => setFilter('page', page),
        onPageSizeChange: (pageSize) => {
          setFilter('page_size', pageSize);
          setFilter('page', 1);
        },
      }}
    >
      <MiniListTable title={t('radiology.pendingReports')} rows={pendingQuery.data ?? []} columns={pendingColumns} loading={pendingQuery.isLoading} />
    </DashboardShell>
  );
}
