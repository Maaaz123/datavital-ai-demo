/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Button, Chip, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import DashboardShell from '@/components/dashboard/DashboardShell';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import {
  fetchAlerts,
  fetchAlertsSummary,
  fetchAlertsTrends,
  fetchAlertsBreakdown,
  fetchAlertsStatusDistribution,
  acknowledgeAlert,
  resolveAlert,
} from '@/api/alerts';
import type { AlertItem, ChartPayload, KPICardData } from '@/types/api';
import { formatDateTime, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<AlertItem>();

const severityColor: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const statusColor: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  open: 'error',
  acknowledged: 'warning',
  resolved: 'success',
};

function findKpi(kpis: KPICardData[] | undefined, key: string): number {
  const kpi = kpis?.find((k) => k.key === key);
  return kpi ? Number(kpi.value) || 0 : 0;
}

export default function AlertsDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const [statusFilter, setStatusFilter] = useState<string>('open');

  const summaryQuery = useQuery({ queryKey: ['alerts-summary', filters], queryFn: () => fetchAlertsSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['alerts-trends', filters], queryFn: () => fetchAlertsTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['alerts-breakdown', filters], queryFn: () => fetchAlertsBreakdown(filters) });
  const statusDistQuery = useQuery({ queryKey: ['alerts-status', filters], queryFn: () => fetchAlertsStatusDistribution(filters) });
  const listQuery = useQuery({
    queryKey: ['alerts-list', filters, statusFilter],
    queryFn: () => fetchAlerts(filters, statusFilter === 'all' ? {} : { status: statusFilter }),
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const invalidateAll = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('alerts-') });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => acknowledgeAlert(alertId),
    onSuccess: invalidateAll,
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: number) => resolveAlert(alertId),
    onSuccess: invalidateAll,
  });

  const handleRefresh = () => {
    invalidateAll();
    markRefreshed();
  };

  const kpis = summaryQuery.data?.data;
  const severityMix = useMemo<ChartPayload | null>(() => {
    if (!kpis) return null;
    return {
      chart_type: 'bar',
      categories: [t('alerts.severity.critical'), t('alerts.severity.warning'), t('alerts.severity.info')],
      series: [
        {
          name: t('alerts.openAlerts'),
          data: [findKpi(kpis, 'critical_count'), findKpi(kpis, 'warning_count'), findKpi(kpis, 'info_count')],
        },
      ],
    };
  }, [kpis, t]);

  const trends = trendsQuery.data;
  const charts: ChartGridItem[] = [
    { key: 'trend', title: t('alerts.trend'), payload: trends?.alerts_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(), span: 8 },
    { key: 'severityMix', title: t('alerts.severityMix'), payload: severityMix, loading: summaryQuery.isLoading, error: summaryQuery.isError, onRetry: () => summaryQuery.refetch(), span: 4 },
    { key: 'breakdown', title: t('alerts.domainBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
    { key: 'status', title: t('alerts.statusDistribution'), payload: statusDistQuery.data, loading: statusDistQuery.isLoading, error: statusDistQuery.isError, onRetry: () => statusDistQuery.refetch() },
  ];

  const listColumns: ColumnDef<AlertItem, any>[] = [
    columnHelper.accessor('severity', {
      header: t('alerts.table.severity'),
      cell: (info) => <Chip size="small" color={severityColor[info.getValue()] ?? 'default'} label={fallback(info.getValue())} />,
    }),
    columnHelper.accessor('domain', { header: t('alerts.table.domain'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('message', { header: t('alerts.table.message'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('alerts.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('status', {
      header: t('alerts.table.status'),
      cell: (info) => <Chip size="small" color={statusColor[info.getValue()] ?? 'default'} label={fallback(info.getValue())} />,
    }),
    columnHelper.accessor('created_at', { header: t('alerts.table.createdAt'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.display({
      id: 'actions',
      header: t('alerts.table.actions'),
      cell: (info) => {
        const alert = info.row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={alert.status !== 'open' || acknowledgeMutation.isPending}
              onClick={() => acknowledgeMutation.mutate(alert.alert_id)}
            >
              {t('alerts.acknowledge')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={alert.status === 'resolved' || resolveMutation.isPending}
              onClick={() => resolveMutation.mutate(alert.alert_id)}
            >
              {t('alerts.resolve')}
            </Button>
          </Stack>
        );
      },
    }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(kpis, 'alerts');

  return (
    <DashboardShell<AlertItem>
      title={t('alerts.title')}
      subtitle={t('alerts.subtitle')}
      onRefresh={handleRefresh}
      generatedAt={summaryQuery.data?.generated_at}
      isLoading={summaryQuery.isLoading}
      isError={summaryQuery.isError}
      onRetry={() => summaryQuery.refetch()}
      kpis={kpis}
      situationSummary={situationSummary}
      insightPanel={insightPanel}
      charts={charts}
      headerActions={
        <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)}>
          <ToggleButton value="open">{t('alerts.status.open')}</ToggleButton>
          <ToggleButton value="acknowledged">{t('alerts.status.acknowledged')}</ToggleButton>
          <ToggleButton value="resolved">{t('alerts.status.resolved')}</ToggleButton>
          <ToggleButton value="all">{t('app.all')}</ToggleButton>
        </ToggleButtonGroup>
      }
      detailTable={{
        title: t('alerts.detailsTable'),
        data: listQuery.data?.data ?? [],
        columns: listColumns,
        loading: listQuery.isLoading,
        error: listQuery.isError,
        onRetry: () => listQuery.refetch(),
        page: filters.page,
        pageSize: filters.page_size,
        totalRecords: listQuery.data?.meta?.total_records ?? 0,
        onPageChange: (page) => setFilter('page', page),
        onPageSizeChange: (pageSize) => {
          setFilter('page_size', pageSize);
          setFilter('page', 1);
        },
      }}
    />
  );
}
