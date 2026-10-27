/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Button, Chip, Grid } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DashboardShell from '@/components/dashboard/DashboardShell';
import MiniListTable from '@/components/dashboard/MiniListTable';
import type { ChartGridItem } from '@/components/dashboard/ChartGrid';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { useFilterStore } from '@/store/filterStore';
import {
  fetchAppointmentsSummary,
  fetchAppointmentsTrends,
  fetchAppointmentsBreakdown,
  fetchAppointmentsStatusDistribution,
  fetchAppointmentsDetails,
  fetchAppointmentsToday,
  fetchAvailableSlots,
  fetchClinicUtilization,
  fetchPhysicianNoShow,
  fetchServiceModeDistribution,
  fetchUnderutilizedExceptions,
  downloadAppointmentsExport,
} from '@/api/appointments';
import type { ChartPayload, DataRow } from '@/types/api';
import { formatDateTime, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

export default function AppointmentsDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const setFilter = useFilterStore((s) => s.setFilter);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({ queryKey: ['appointments-summary', filters], queryFn: () => fetchAppointmentsSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['appointments-trends', filters], queryFn: () => fetchAppointmentsTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['appointments-breakdown', filters], queryFn: () => fetchAppointmentsBreakdown(filters) });
  const statusQuery = useQuery({ queryKey: ['appointments-status', filters], queryFn: () => fetchAppointmentsStatusDistribution(filters) });
  const detailsQuery = useQuery({ queryKey: ['appointments-details', filters], queryFn: () => fetchAppointmentsDetails(filters) });
  const todayQuery = useQuery({ queryKey: ['appointments-today', filters], queryFn: () => fetchAppointmentsToday(filters) });
  const slotsQuery = useQuery({ queryKey: ['appointments-slots', filters], queryFn: () => fetchAvailableSlots(filters) });
  const clinicQuery = useQuery({ queryKey: ['appointments-clinic', filters], queryFn: () => fetchClinicUtilization(filters) });
  const physicianQuery = useQuery({ queryKey: ['appointments-physician', filters], queryFn: () => fetchPhysicianNoShow(filters) });
  const modeQuery = useQuery({ queryKey: ['appointments-mode', filters], queryFn: () => fetchServiceModeDistribution(filters) });
  const underutilQuery = useQuery({
    queryKey: ['appointments-underutil', filters],
    queryFn: () => fetchUnderutilizedExceptions(filters),
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('appointments-') });
    markRefreshed();
  };

  const trends = trendsQuery.data as Record<string, ChartPayload | undefined> | undefined;
  const charts: ChartGridItem[] = [
    {
      key: 'volume',
      title: t('appointments.volumeTrend'),
      payload: trends?.appointments_trend || trends?.volume_trend,
      loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(),
    },
    {
      key: 'slots',
      title: t('appointments.slotsTrend', { defaultValue: 'Available vs booked vs blocked slots' }),
      payload: trends?.slots_trend,
      loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(),
    },
    {
      key: 'lead',
      title: t('appointments.leadTimeTrend', { defaultValue: 'Booking lead-time trend' }),
      payload: trends?.lead_time_trend,
      loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch(),
    },
    { key: 'noShow', title: t('appointments.noShowTrend'), payload: trends?.no_show_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    { key: 'wait', title: t('appointments.waitTimeTrend'), payload: trends?.wait_time_trend, loading: trendsQuery.isLoading, error: trendsQuery.isError, onRetry: () => trendsQuery.refetch() },
    {
      key: 'clinic',
      title: t('appointments.clinicUtilization', { defaultValue: 'Slot utilization by clinic' }),
      payload: clinicQuery.data,
      loading: clinicQuery.isLoading, error: clinicQuery.isError, onRetry: () => clinicQuery.refetch(),
    },
    {
      key: 'physician',
      title: t('appointments.physicianNoShow', { defaultValue: 'No-show rate by physician' }),
      payload: physicianQuery.data,
      loading: physicianQuery.isLoading, error: physicianQuery.isError, onRetry: () => physicianQuery.refetch(),
    },
    { key: 'status', title: t('appointments.statusDistribution'), payload: statusQuery.data, loading: statusQuery.isLoading, error: statusQuery.isError, onRetry: () => statusQuery.refetch() },
    {
      key: 'mode',
      title: t('appointments.serviceMode', { defaultValue: 'Appointments by service mode' }),
      payload: modeQuery.data,
      loading: modeQuery.isLoading, error: modeQuery.isError, onRetry: () => modeQuery.refetch(),
    },
    { key: 'breakdown', title: t('appointments.hospitalBreakdown'), payload: breakdownQuery.data, loading: breakdownQuery.isLoading, error: breakdownQuery.isError, onRetry: () => breakdownQuery.refetch() },
  ];

  const detailColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('scheduled_ts', { header: t('appointments.table.scheduled'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('status_name', { header: t('appointments.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> }),
    columnHelper.accessor('hospital_name', { header: t('appointments.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('appointments.table.department'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('appointments.table.provider'), cell: (info) => fallback(info.getValue()) }),
  ];

  const todayColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('scheduled_ts', { header: t('appointments.table.scheduled'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('appointments.table.provider'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('appointments.table.department'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('status', { header: t('appointments.table.status'), cell: (info) => <Chip size="small" label={fallback(info.getValue())} /> }),
  ];

  const slotsColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('slot_start', { header: t('appointments.table.slotStart'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('slot_end', { header: t('appointments.table.slotEnd'), cell: (info) => formatDateTime(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('appointments.table.provider'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('department_name', { header: t('appointments.table.department'), cell: (info) => fallback(info.getValue()) }),
  ];

  const underutilColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('department_name', { header: t('appointments.table.department'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('provider_name', { header: t('appointments.table.provider'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('hospital_name', { header: t('appointments.table.hospital'), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('utilization_rate', { header: t('appointments.utilization', { defaultValue: 'Utilization %' }), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('available_slots', { header: t('appointments.available', { defaultValue: 'Available' }), cell: (info) => fallback(info.getValue()) }),
    columnHelper.accessor('booked_slots', { header: t('appointments.booked', { defaultValue: 'Booked' }), cell: (info) => fallback(info.getValue()) }),
  ];

  const { situationSummary, insightPanel } = useDomainSituation(summaryQuery.data?.data, 'appointments');

  return (
    <DashboardShell<DataRow>
      title={t('appointments.title')}
      subtitle={t('appointments.subtitle')}
      onRefresh={handleRefresh}
      generatedAt={summaryQuery.data?.generated_at}
      headerActions={
        <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => downloadAppointmentsExport(filters)}>
          {t('common.exportCsv', { defaultValue: 'Export CSV' })}
        </Button>
      }
      isLoading={summaryQuery.isLoading}
      isError={summaryQuery.isError}
      onRetry={() => summaryQuery.refetch()}
      kpis={summaryQuery.data?.data}
      situationSummary={situationSummary}
      insightPanel={insightPanel}
      charts={charts}
      detailTable={{
        title: t('appointments.detailsTable'),
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
        emptyMessage: t('common.noData', { defaultValue: 'No appointments match the active filters.' }),
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <MiniListTable title={t('appointments.today')} rows={todayQuery.data ?? []} columns={todayColumns} loading={todayQuery.isLoading} maxRows={12} />
        </Grid>
        <Grid item xs={12} md={6}>
          <MiniListTable title={t('appointments.availableSlots')} rows={slotsQuery.data ?? []} columns={slotsColumns} loading={slotsQuery.isLoading} maxRows={12} />
        </Grid>
        <Grid item xs={12}>
          <MiniListTable
            title={t('appointments.underutilized', { defaultValue: 'Underutilized clinic / physician exceptions' })}
            rows={underutilQuery.data ?? []}
            columns={underutilColumns}
            loading={underutilQuery.isLoading}
            maxRows={12}
          />
        </Grid>
      </Grid>
    </DashboardShell>
  );
}
