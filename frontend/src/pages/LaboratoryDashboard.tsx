/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Chip, Grid } from '@mui/material';
import DashboardShell from '@/components/dashboard/DashboardShell';
import MiniListTable from '@/components/dashboard/MiniListTable';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import {
  fetchLaboratorySummary,
  fetchLaboratoryTrends,
  fetchLaboratoryBreakdown,
  fetchLaboratoryStatusDistribution,
  fetchLaboratoryDetails,
  fetchCriticalResults,
  fetchPendingTests,
} from '@/api/laboratory';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatHours, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function LaboratoryDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['laboratory-summary', filters], queryFn: () => fetchLaboratorySummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['laboratory-trends', filters], queryFn: () => fetchLaboratoryTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['laboratory-breakdown', filters], queryFn: () => fetchLaboratoryBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['laboratory-status', filters], queryFn: () => fetchLaboratoryStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['laboratory-details', filters], queryFn: () => fetchLaboratoryDetails(filters) });
  const criticalQuery = useQuery({ queryKey: ['laboratory-critical', filters], queryFn: () => fetchCriticalResults(filters) });
  const pendingQuery = useQuery({ queryKey: ['laboratory-pending', filters], queryFn: () => fetchPendingTests(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('laboratory-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'orders', title: t('laboratory.ordersTrend'), payload: trends?.orders_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'tat', title: t('laboratory.tatTrend'), payload: trends?.tat_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'critical', title: t('laboratory.criticalTrend'), payload: trends?.critical_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('laboratory.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('laboratory.orderStatusDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch(), span: 4 },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('test_name', { header: t('laboratory.table.test'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('order_status', { header: t('laboratory.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> }),
    columnHelper.accessor('ordered_at', { header: t('laboratory.table.ordered'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('completed_at', { header: t('laboratory.table.completed'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('tat_hours', { header: t('laboratory.table.tat'), cell: (info) => formatHours(info.getValue()) }),
    columnHelper.accessor('is_critical', {
      header: t('laboratory.table.critical'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="error" label={t('laboratory.table.critical')} /> : '—'),
    }),
    columnHelper.accessor('hospital_name', { header: t('laboratory.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('laboratory.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const criticalColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('laboratory.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('test_name', { header: t('laboratory.table.test'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('result_value', { header: t('laboratory.table.result'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('flagged_at', { header: t('laboratory.table.flagged'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('acknowledged', {
      header: t('laboratory.table.acknowledged'),
      cell: (info) => <Chip size="small" color={info.getValue() ? 'success' : 'warning'} label={info.getValue() ? t('app.yes', 'Yes') : t('app.no', 'No')} />,
    }),
  ];

  const pendingColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('laboratory.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('test_name', { header: t('laboratory.table.test'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hours_pending', { header: t('laboratory.table.hoursPending'), cell: (info) => formatHours(info.getValue()) }),
    columnHelper.accessor('priority', { header: t('laboratory.table.priority'), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'laboratory');

  return (
    <DashboardShell<DataRow>
      title={t('laboratory.title')}
      subtitle={t('laboratory.subtitle')}
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
        title: t('laboratory.detailsTable'),
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
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <MiniListTable title={t('laboratory.criticalResults')} rows={criticalQuery.data ?? []} columns={criticalColumns} loading={criticalQuery.isLoading} />
        </Grid>
        <Grid item xs={12} md={6}>
          <MiniListTable title={t('laboratory.pendingTests')} rows={pendingQuery.data ?? []} columns={pendingColumns} loading={pendingQuery.isLoading} />
        </Grid>
      </Grid>
    </DashboardShell>
  );
}
