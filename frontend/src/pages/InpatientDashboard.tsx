/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect, useState } from 'react';
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
  fetchInpatientSummary,
  fetchInpatientTrends,
  fetchInpatientBreakdown,
  fetchInpatientStatusDistribution,
  fetchInpatientDetails,
  fetchExtendedStay,
  fetchCurrentCensus,
} from '@/api/inpatient';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatDays, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function InpatientDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const [search, setSearch] = useState(filters.search ?? '');

  const summaryQuery = useQuery({ queryKey: ['inpatient-summary', filters], queryFn: () => fetchInpatientSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['inpatient-trends', filters], queryFn: () => fetchInpatientTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['inpatient-breakdown', filters], queryFn: () => fetchInpatientBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['inpatient-status', filters], queryFn: () => fetchInpatientStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['inpatient-details', filters], queryFn: () => fetchInpatientDetails(filters) });
  const extendedStayQuery = useQuery({ queryKey: ['inpatient-extended-stay', filters], queryFn: () => fetchExtendedStay(filters) });
  const censusQuery = useQuery({ queryKey: ['inpatient-census', filters], queryFn: () => fetchCurrentCensus(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('inpatient-') });
    markRefreshed();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setFilter('search', value);
    setFilter('page', 1);
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'admissions', title: t('inpatient.admissionsTrend'), payload: trends?.admissions_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'los', title: t('inpatient.losTrend'), payload: trends?.los_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('inpatient.admissionSourceBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('inpatient.dischargeDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('encounter_id', { header: t('inpatient.table.encounter'), enableSorting: false }),
    columnHelper.accessor('admit_ts', { header: t('inpatient.table.admitted'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('discharge_ts', { header: t('inpatient.table.discharged'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('los_days', { header: t('inpatient.table.los'), cell: (info) => formatDays(info.getValue()) }),
    columnHelper.accessor('is_icu', {
      header: t('inpatient.table.icu'),
      enableSorting: false,
      cell: (info) => (info.getValue() ? <Chip size="small" color="error" label="ICU" /> : '—'),
    }),
    columnHelper.accessor('is_readmission', {
      header: t('inpatient.table.readmission'),
      enableSorting: false,
      cell: (info) => (info.getValue() ? <Chip size="small" color="warning" label={t('inpatient.table.readmission')} /> : '—'),
    }),
    columnHelper.accessor('hospital_name', { header: t('inpatient.table.hospital'), enableSorting: false, cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('inpatient.table.department'), enableSorting: false, cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('inpatient.table.patient'), enableSorting: false, cell: (info) => fallback(info.getValue()) }),
  ];

  const extendedStayColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('inpatient.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('los_days', { header: t('inpatient.table.los'), cell: (info) => formatDays(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('inpatient.table.department'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('inpatient.table.hospital'), cell: (info) => fallback(info.getValue()) }),
  ];

  const censusColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('patient_name', { header: t('inpatient.table.patient'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('los_days', { header: t('inpatient.table.los'), cell: (info) => formatDays(info.getValue()) }),
    columnHelper.accessor('ward_name', { header: t('inpatient.table.ward'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('inpatient.table.hospital'), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'inpatient');

  return (
    <DashboardShell<DataRow>
      title={t('inpatient.title')}
      subtitle={t('inpatient.subtitle')}
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
        title: t('inpatient.detailsTable'),
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
        search,
        onSearchChange: handleSearchChange,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order,
        onSortChange: (sortBy, sortOrder) => {
          setFilter('sort_by', sortBy);
          setFilter('sort_order', sortOrder);
        },
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <MiniListTable
            title={t('inpatient.extendedStay')}
            rows={extendedStayQuery.data ?? []}
            columns={extendedStayColumns}
            loading={extendedStayQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MiniListTable
            title={t('inpatient.currentCensus')}
            rows={censusQuery.data ?? []}
            columns={censusColumns}
            loading={censusQuery.isLoading}
          />
        </Grid>
      </Grid>
    </DashboardShell>
  );
}
