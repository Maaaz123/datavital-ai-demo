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
  fetchDiagnosesSummary,
  fetchDiagnosesTrends,
  fetchDiagnosesBreakdown,
  fetchDiagnosesStatusDistribution,
  fetchDiagnosesDetails,
  fetchTopDiagnosesList,
  fetchComorbidity,
} from '@/api/diagnoses';
import type { DataRow } from '@/types/api';
import { formatDate, formatNumber, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function DiagnosesDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['diagnoses-summary', filters], queryFn: () => fetchDiagnosesSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['diagnoses-trends', filters], queryFn: () => fetchDiagnosesTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['diagnoses-breakdown', filters], queryFn: () => fetchDiagnosesBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['diagnoses-status', filters], queryFn: () => fetchDiagnosesStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['diagnoses-details', filters], queryFn: () => fetchDiagnosesDetails(filters) });
  const topQuery = useQuery({ queryKey: ['diagnoses-top', filters], queryFn: () => fetchTopDiagnosesList(filters, 10) });
  const comorbidityQuery = useQuery({ queryKey: ['diagnoses-comorbidity', filters], queryFn: () => fetchComorbidity(filters, 15) });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('diagnoses-') });
    markRefreshed();
  };

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'trend', title: t('diagnoses.diagnosesTrend'), payload: trends?.diagnoses_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(), span: 12 },
    { key: 'breakdown', title: t('diagnoses.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('diagnoses.typeDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
    { key: 'comorbidity', title: t('diagnoses.comorbidity'), payload: comorbidityQuery.data, loading: comorbidityQuery.isLoading, error: comorbidityQuery.isError, onRetry: () => comorbidityQuery.refetch(), span: 12, height: 360 },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('diagnosis_code', { header: t('diagnoses.table.code'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('diagnosis_description', { header: t('diagnoses.table.description'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('diagnosis_type', { header: t('diagnoses.table.type'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> },),
    columnHelper.accessor('is_chronic', {
      header: t('diagnoses.table.chronic'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="warning" label={t('diagnoses.table.chronic')} /> : '—'),
    }),
    columnHelper.accessor('diagnosed_on', { header: t('diagnoses.table.diagnosedOn'), cell: (info) => formatDate(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('diagnoses.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('patient_name', { header: t('diagnoses.table.patient'), cell: (info) => fallback(info.getValue()) }),
  ];

  const topColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('diagnosis_code', { header: t('diagnoses.table.code'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('diagnosis_description', { header: t('diagnoses.table.description'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('diagnosis_count', { header: t('diagnoses.table.count'), cell: (info) => formatNumber(info.getValue()) }),
    columnHelper.accessor('is_chronic', {
      header: t('diagnoses.table.chronic'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="warning" label={t('diagnoses.table.chronic')} /> : '—'),
    }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'diagnoses');

  return (
    <DashboardShell<DataRow>
      title={t('diagnoses.title')}
      subtitle={t('diagnoses.subtitle')}
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
        title: t('diagnoses.detailsTable'),
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
      <MiniListTable title={t('diagnoses.topDiagnoses')} rows={topQuery.data ?? []} columns={topColumns} loading={topQuery.isLoading} maxRows={10} />
    </DashboardShell>
  );
}
