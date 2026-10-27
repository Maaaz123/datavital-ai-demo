/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Button, Chip } from '@mui/material';
import DashboardShell from '@/components/dashboard/DashboardShell';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import { useHasPermission } from '@/hooks/usePermission';
import {
  fetchPatientsSummary,
  fetchPatientsTrends,
  fetchPatientsBreakdown,
  fetchPatientsStatusDistribution,
  searchPatients,
} from '@/api/patients';
import type { ChartPayload, KPICardData, PatientSearchResult } from '@/types/api';
import { formatDate, fallback } from '@/utils/format';
import { isAxiosError } from 'axios';

const columnHelper = createColumnHelper<PatientSearchResult>();

function findKpi(kpis: KPICardData[] | undefined, key: string): number {
  const kpi = kpis?.find((k) => k.key === key);
  return kpi ? Number(kpi.value) || 0 : 0;
}

export default function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const [search, setSearch] = useState(filters.search ?? '');
  const canViewPatients = useHasPermission('patient.view');

  const summaryQuery = useQuery({
    queryKey: ['patients-summary', filters],
    queryFn: () => fetchPatientsSummary(filters),
    enabled: canViewPatients,
  });
  const trendsQuery = useQuery({
    queryKey: ['patients-trends', filters],
    queryFn: () => fetchPatientsTrends(filters),
    enabled: canViewPatients,
  });
  const breakdownQuery = useQuery({
    queryKey: ['patients-breakdown', filters],
    queryFn: () => fetchPatientsBreakdown(filters),
    enabled: canViewPatients,
  });
  const statusQuery = useQuery({
    queryKey: ['patients-status', filters],
    queryFn: () => fetchPatientsStatusDistribution(filters),
    enabled: canViewPatients,
  });
  const searchQuery = useQuery({
    queryKey: ['patients-search', filters, search],
    queryFn: () => searchPatients(filters, search),
    enabled: canViewPatients,
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('patients-') });
    markRefreshed();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setFilter('page', 1);
  };

  const kpis = summaryQuery.data?.data;
  const avgEncountersGauge = useMemo<ChartPayload | null>(() => {
    if (!kpis) return null;
    const avg = findKpi(kpis, 'avg_encounters');
    return {
      chart_type: 'gauge',
      categories: [t('patients.avgEncountersGauge')],
      series: [{ name: t('patients.avgEncountersGauge'), data: [Math.round(avg * 10) / 10] }],
      meta: { max: 20, min: 0 },
    };
  }, [kpis, t]);

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'newPatients', title: t('patients.newPatientsTrend'), payload: trends?.new_patients_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(), span: 8 },
    { key: 'gauge', title: t('patients.avgEncountersGauge'), payload: avgEncountersGauge, loading: summaryQuery.isLoading, error: summaryQuery.isError, onRetry: () => summaryQuery.refetch(), span: 4 },
    { key: 'breakdown', title: t('patients.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('patients.segmentDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
  ];

  const searchColumns: ColumnDef<PatientSearchResult, any>[] = [
    columnHelper.accessor('mrn', { header: t('patients.table.mrn'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('full_name', { header: t('patients.table.name'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('gender', { header: t('patients.table.gender'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('age_group', { header: t('patients.table.ageGroup'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('total_encounters', { header: t('patients.table.encounters'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('has_chronic_condition', {
      header: t('patients.table.chronic'),
      cell: (info) => (info.getValue() ? <Chip size="small" color="warning" label={t('patients.table.chronic')} /> : '—'),
    }),
    columnHelper.accessor('last_encounter_at', { header: t('patients.table.lastEncounter'), cell: (info) => formatDate(info.getValue()) }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <Button size="small" variant="outlined" onClick={() => navigate(`/patients/${info.row.original.patient_key}`)}>
          {t('patients.viewProfile')}
        </Button>
      ),
    }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(kpis, 'patients');

  const unauthorized =
    !canViewPatients ||
    (isAxiosError(summaryQuery.error) && summaryQuery.error.response?.status === 403);

  return (
    <DashboardShell<PatientSearchResult>
      title={t('patients.title')}
      subtitle={t('patients.subtitle')}
      onRefresh={handleRefresh}
      generatedAt={summaryQuery.data?.generated_at}
      isLoading={summaryQuery.isLoading}
      isError={summaryQuery.isError && !unauthorized}
      isUnauthorized={unauthorized}
      onRetry={() => summaryQuery.refetch()}
      kpis={kpis}
      situationSummary={situationSummary}
      insightPanel={insightPanel}
      charts={charts}
      detailTable={{
        title: t('patients.searchResults'),
        data: searchQuery.data?.data ?? [],
        columns: searchColumns,
        loading: searchQuery.isLoading,
        error: searchQuery.isError,
        onRetry: () => searchQuery.refetch(),
        page: filters.page,
        pageSize: filters.page_size,
        totalRecords: searchQuery.data?.meta?.total_records ?? 0,
        onPageChange: (page) => setFilter('page', page),
        onPageSizeChange: (pageSize) => {
          setFilter('page_size', pageSize);
          setFilter('page', 1);
        },
        search,
        onSearchChange: handleSearchChange,
        emptyMessage: t('patients.noResults'),
      }}
    />
  );
}
