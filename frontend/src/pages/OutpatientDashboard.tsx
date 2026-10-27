/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Chip } from '@mui/material';
import DashboardShell from '@/components/dashboard/DashboardShell';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import {
  fetchOutpatientSummary,
  fetchOutpatientTrends,
  fetchOutpatientBreakdown,
  fetchOutpatientStatusDistribution,
  fetchOutpatientDetails,
} from '@/api/outpatient';
import type { DataRow } from '@/types/api';
import { formatDateTime, formatMinutes, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function OutpatientDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['outpatient-summary', filters], queryFn: () => fetchOutpatientSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['outpatient-trends', filters], queryFn: () => fetchOutpatientTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['outpatient-breakdown', filters], queryFn: () => fetchOutpatientBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['outpatient-status', filters], queryFn: () => fetchOutpatientStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['outpatient-details', filters], queryFn: () => fetchOutpatientDetails(filters) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('outpatient-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'visits', title: t('outpatient.visitsTrend'), payload: trends?.visits_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'consultation', title: t('outpatient.consultationTimeTrend'), payload: trends?.consultation_time_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'breakdown', title: t('outpatient.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('outpatient.visitTypeDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('encounter_id', { header: t('outpatient.table.encounter') }),
    columnHelper.accessor('visit_ts', { header: t('outpatient.table.visitTime'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('consultation_minutes', { header: t('outpatient.table.consultation'), cell: (info) => formatMinutes(info.getValue()) }),
    columnHelper.accessor('is_new_patient', {
      header: t('outpatient.table.patientType'),
      cell: (info) => <Chip size="small" color={info.getValue() ? 'info' : 'default'} label={info.getValue() ? t('outpatient.newPatient') : t('outpatient.returningPatient')} />,
    }),
    columnHelper.accessor('hospital_name', { header: t('outpatient.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('outpatient.table.department'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('outpatient.table.provider'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('outpatient.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'outpatient');

  return (
    <DashboardShell<DataRow>
      title={t('outpatient.title')}
      subtitle={t('outpatient.subtitle')}
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
        title: t('outpatient.detailsTable'),
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
    />
  );
}
