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
  fetchSurgerySummary,
  fetchSurgeryTrends,
  fetchSurgeryBreakdown,
  fetchSurgeryStatusDistribution,
  fetchSurgeryDetails,
  fetchTodaySchedule,
} from '@/api/surgery';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatMinutes, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function SurgeryDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['surgery-summary', filters], queryFn: () => fetchSurgerySummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['surgery-trends', filters], queryFn: () => fetchSurgeryTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['surgery-breakdown', filters], queryFn: () => fetchSurgeryBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['surgery-status', filters], queryFn: () => fetchSurgeryStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['surgery-details', filters], queryFn: () => fetchSurgeryDetails(filters) });
  const scheduleQuery = useQuery({ queryKey: ['surgery-schedule', filters], queryFn: () => fetchTodaySchedule(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('surgery-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'cases', title: t('surgery.casesTrend'), payload: trends?.cases_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'cancellation', title: t('surgery.cancellationTrend'), payload: trends?.cancellation_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'duration', title: t('surgery.durationTrend'), payload: trends?.duration_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('surgery.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('surgery.statusDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch(), span: 4 },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('surgery_key', { header: t('surgery.table.case') }),
    columnHelper.accessor('surgery_status', { header: t('surgery.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> },),
    columnHelper.accessor('is_emergency', {
      header: t('surgery.table.emergency'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="error" label={t('surgery.table.emergency')} /> : '—'),
    }),
    columnHelper.accessor('scheduled_start', { header: t('surgery.table.scheduledStart'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('duration_minutes', { header: t('surgery.table.duration'), cell: (info) => formatMinutes(info.getValue()) }),
    columnHelper.accessor('or_room', { header: t('surgery.table.orRoom'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('surgery.table.surgeon'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('surgery.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const scheduleColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('scheduled_start', { header: t('surgery.table.scheduledStart'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('or_room', { header: t('surgery.table.orRoom'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('surgery.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('procedure_name', { header: t('surgery.table.procedure'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('surgeon', { header: t('surgery.table.surgeon'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('status', { header: t('surgery.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> },),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'surgery');

  return (
    <DashboardShell<DataRow>
      title={t('surgery.title')}
      subtitle={t('surgery.subtitle')}
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
        title: t('surgery.detailsTable'),
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
      <MiniListTable title={t('surgery.todaySchedule')} rows={scheduleQuery.data ?? []} columns={scheduleColumns} loading={scheduleQuery.isLoading} maxRows={15} />
    </DashboardShell>
  );
}
