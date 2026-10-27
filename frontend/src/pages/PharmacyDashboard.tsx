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
  fetchPharmacySummary,
  fetchPharmacyTrends,
  fetchPharmacyBreakdown,
  fetchPharmacyStatusDistribution,
  fetchPharmacyDetails,
  fetchLowStock,
  fetchPendingOrders,
} from '@/api/pharmacy';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatMinutes, formatNumber, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function PharmacyDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['pharmacy-summary', filters], queryFn: () => fetchPharmacySummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['pharmacy-trends', filters], queryFn: () => fetchPharmacyTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['pharmacy-breakdown', filters], queryFn: () => fetchPharmacyBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['pharmacy-status', filters], queryFn: () => fetchPharmacyStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['pharmacy-details', filters], queryFn: () => fetchPharmacyDetails(filters) });
  const lowStockQuery = useQuery({ queryKey: ['pharmacy-low-stock', filters], queryFn: () => fetchLowStock(filters) });
  const pendingQuery = useQuery({ queryKey: ['pharmacy-pending', filters], queryFn: () => fetchPendingOrders(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('pharmacy-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'orders', title: t('pharmacy.ordersTrend'), payload: trends?.orders_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'dispense', title: t('pharmacy.dispenseTimeTrend'), payload: trends?.dispense_time_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'highRisk', title: t('pharmacy.highRiskTrend'), payload: trends?.high_risk_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('pharmacy.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('pharmacy.orderStatusDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch(), span: 4 },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('medication_name', { header: t('pharmacy.table.medication'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('order_status', { header: t('pharmacy.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> }),
    columnHelper.accessor('ordered_at', { header: t('pharmacy.table.ordered'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('dispensed_at', { header: t('pharmacy.table.dispensed'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('is_high_risk', {
      header: t('pharmacy.table.highRisk'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="warning" label={t('pharmacy.table.highRisk')} /> : '—'),
    }),
    columnHelper.accessor('hospital_name', { header: t('pharmacy.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('pharmacy.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const lowStockColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('medication_name', { header: t('pharmacy.table.medication'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('current_stock', { header: t('pharmacy.table.currentStock'), cell: (info) => formatNumber(info.getValue()) }),
    columnHelper.accessor('days_of_supply', { header: t('pharmacy.table.daysOfSupply'), cell: (info) => formatNumber(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('pharmacy.table.hospital'), cell: (info) => fallback(info.getValue()) }),
  ];

  const pendingColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('pharmacy.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('medication_name', { header: t('pharmacy.table.medication'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hours_pending', { header: t('pharmacy.table.hoursPending'), cell: (info) => formatMinutes(info.getValue()) }),
    columnHelper.accessor('priority', { header: t('pharmacy.table.priority'), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'pharmacy');

  return (
    <DashboardShell<DataRow>
      title={t('pharmacy.title')}
      subtitle={t('pharmacy.subtitle')}
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
        title: t('pharmacy.detailsTable'),
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
          <MiniListTable title={t('pharmacy.lowStock')} rows={lowStockQuery.data ?? []} columns={lowStockColumns} loading={lowStockQuery.isLoading} />
        </Grid>
        <Grid item xs={12} md={6}>
          <MiniListTable title={t('pharmacy.pendingOrders')} rows={pendingQuery.data ?? []} columns={pendingColumns} loading={pendingQuery.isLoading} />
        </Grid>
      </Grid>
    </DashboardShell>
  );
}
