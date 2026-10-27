/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Tooltip,
  Stack,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  fetchBedsSummary,
  fetchBedsStatus,
  fetchBedsByHospital,
  fetchBedsByWard,
  fetchHourlyOccupancy,
  fetchOperationalLists,
} from '@/api/beds';
import { useFilterStore } from '@/store/filterStore';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { bedStatusColors } from '@/theme';
import type { BedStatusItem } from '@/types/api';
import { DomainPageHeader, PilotWorkspace, VitalSignsGrid, ChartSection } from '@/components/product';
import AnimatedSection from '@/components/motion/AnimatedSection';
import { localizeDataLabel } from '@/i18n/localize';
import { DEFAULT_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<Record<string, unknown>>();

function OperationalTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Record<string, unknown>[];
  columns: ColumnDef<Record<string, any>, unknown>[];
}) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!rows.length) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle2', fontSize: 13 }} sx={{ py: 1, px: 1.5, '& .MuiCardHeader-action': { m: 0 } }} />
      <CardContent sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} titleTypographyProps={{ variant: 'subtitle2', fontSize: 13 }} sx={{ py: 1, px: 1.5, '& .MuiCardHeader-action': { m: 0 } }} />
      <CardContent sx={{ overflowX: 'auto', p: 1, pt: 0 }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <Box
                    component="th"
                    key={header.id}
                    sx={{ textAlign: 'left', py: 0.75, px: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 600 }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Box>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.slice(0, 8).map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Box
                    component="td"
                    key={cell.id}
                    sx={{ py: 0.75, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Box>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BedsDashboard() {
  const { t, i18n } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const summaryQuery = useQuery({
    queryKey: ['beds-summary', filters],
    queryFn: () => fetchBedsSummary(filters),
  });

  const statusQuery = useQuery({
    queryKey: ['beds-status', filters],
    queryFn: () => fetchBedsStatus(filters),
  });

  const byHospitalQuery = useQuery({
    queryKey: ['beds-by-hospital', filters],
    queryFn: () => fetchBedsByHospital(filters),
  });

  const byWardQuery = useQuery({
    queryKey: ['beds-by-ward', filters],
    queryFn: () => fetchBedsByWard(filters),
  });

  const hourlyQuery = useQuery({
    queryKey: ['beds-hourly', filters],
    queryFn: () => fetchHourlyOccupancy(filters),
  });

  const listsQuery = useQuery({
    queryKey: ['beds-lists', filters],
    queryFn: () => fetchOperationalLists(filters),
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) {
      markRefreshed();
    }
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const beds = useMemo(() => {
    const rows = statusQuery.data?.data;
    return Array.isArray(rows) ? rows : [];
  }, [statusQuery.data?.data]);

  const boardBeds = useMemo(() => beds.slice(0, 180), [beds]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    beds.forEach((b) => {
      counts[b.bed_status] = (counts[b.bed_status] ?? 0) + 1;
    });
    return counts;
  }, [beds]);

  const cleaningCols = useMemo(
    () => [
      columnHelper.accessor('bed_code', { header: t('data.columns.bed') }),
      columnHelper.accessor('ward_name', {
        header: t('data.columns.ward'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
      columnHelper.accessor('hospital_name', {
        header: t('data.columns.hospital'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
    ],
    [t, i18n.language],
  );

  const awaitingCols = useMemo(
    () => [
      columnHelper.accessor('patient_key', { header: t('data.columns.patient') }),
      columnHelper.accessor('hospital_name', {
        header: t('data.columns.hospital'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
      columnHelper.accessor('waiting_hours', { header: t('data.columns.hours') }),
    ],
    [t, i18n.language],
  );

  const dischargeCols = useMemo(
    () => [
      columnHelper.accessor('patient_key', { header: t('data.columns.patient') }),
      columnHelper.accessor('ward_name', {
        header: t('data.columns.ward'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
      columnHelper.accessor('bed_code', { header: t('data.columns.bed') }),
    ],
    [t, i18n.language],
  );

  const kpis = useMemo(() => {
    if (summaryQuery.isError) return DEFAULT_UNAVAILABLE_KPIS;
    const rows = summaryQuery.data?.data;
    return Array.isArray(rows) && rows.length > 0 ? rows : summaryQuery.isPending ? [] : DEFAULT_UNAVAILABLE_KPIS;
  }, [summaryQuery.data?.data, summaryQuery.isError, summaryQuery.isPending]);

  const lists = listsQuery.data;
  const { situationSummary, insightPanel } = useDomainSituation(
    summaryQuery.isError ? undefined : kpis,
    'beds',
  );

  return (
    <PilotWorkspace>
      <AnimatedSection>
        <DomainPageHeader
          eyebrow="CAPACITY / BED MANAGEMENT"
          title={t('beds.title')}
          subtitle={t('beds.subtitle')}
          onRefresh={() => summaryQuery.refetch()}
          refreshing={summaryQuery.isFetching}
        />
      </AnimatedSection>

      {summaryQuery.isError ? (
        <AnimatedSection delay={0.02}>
          <ErrorState variant="inline" onRetry={() => summaryQuery.refetch()} />
        </AnimatedSection>
      ) : null}

      {(situationSummary || insightPanel) && (
        <AnimatedSection delay={0.04}>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {situationSummary}
            {insightPanel}
          </Box>
        </AnimatedSection>
      )}

      <AnimatedSection delay={0.06}>
        {summaryQuery.isPending && kpis.length === 0 ? (
          <LoadingSkeleton variant="kpi" />
        ) : (
          <VitalSignsGrid kpis={kpis} />
        )}
      </AnimatedSection>

      <AnimatedSection delay={0.08} onceInView>
        <ChartSection
          elevated
          title={t('beds.bedBoard')}
          subtitle={Object.entries(statusCounts)
            .map(([status, count]) => `${t(`beds.status.${status}`, status)}: ${count}`)
            .join(' · ')}
          height={360}
          loading={statusQuery.isLoading}
          error={statusQuery.isError}
          onRetry={() => statusQuery.refetch()}
          actions={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.entries(statusCounts).map(([status, count]) => (
                <Chip
                  key={status}
                  size="small"
                  label={`${t(`beds.status.${status}`, status)}: ${count}`}
                  sx={{ bgcolor: bedStatusColors[status] ?? '#94a3b8', color: '#fff' }}
                />
              ))}
            </Stack>
          }
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 1,
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            {boardBeds.map((bed: BedStatusItem) => (
              <Tooltip
                key={bed.bed_key}
                title={`${bed.bed_code} — ${localizeDataLabel(bed.ward_name, t, i18n.language)} (${localizeDataLabel(bed.hospital_name, t, i18n.language)})`}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    textAlign: 'center',
                    bgcolor: bedStatusColors[bed.bed_status] ?? 'var(--hap-inactive)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    minHeight: 56,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'default',
                    opacity: bed.bed_status === 'maintenance' ? 0.6 : 1,
                  }}
                >
                  <Box>{bed.bed_code}</Box>
                  <Box sx={{ opacity: 0.85, fontSize: '0.65rem' }}>
                    {t(`beds.status.${bed.bed_status}`, bed.bed_status)}
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </ChartSection>
      </AnimatedSection>

      <AnimatedSection delay={0.1} onceInView>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ChartSection
            title={t('beds.byHospital')}
            height={280}
            loading={byHospitalQuery.isLoading}
            error={byHospitalQuery.isError}
            onRetry={() => byHospitalQuery.refetch()}
          >
            <EChart payload={byHospitalQuery.data} height={280} />
          </ChartSection>
          <ChartSection
            title={t('beds.byWard')}
            height={280}
            loading={byWardQuery.isLoading}
            error={byWardQuery.isError}
            onRetry={() => byWardQuery.refetch()}
          >
            <EChart payload={byWardQuery.data} height={280} />
          </ChartSection>
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <ChartSection
              elevated
              title={t('beds.hourlyOccupancy')}
              height={280}
              loading={hourlyQuery.isLoading}
              error={hourlyQuery.isError}
              onRetry={() => hourlyQuery.refetch()}
            >
              <EChart payload={hourlyQuery.data} height={280} />
            </ChartSection>
          </Box>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.12} onceInView>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>
            <OperationalTable
              title={t('beds.awaitingCleaning')}
              rows={Array.isArray(lists?.awaiting_cleaning) ? lists.awaiting_cleaning : []}
              columns={cleaningCols}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <OperationalTable
              title={t('beds.awaitingAdmission')}
              rows={Array.isArray(lists?.awaiting_admission) ? lists.awaiting_admission : []}
              columns={awaitingCols}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <OperationalTable
              title={t('beds.awaitingTransfer')}
              rows={Array.isArray(lists?.awaiting_transfer) ? lists.awaiting_transfer : []}
              columns={awaitingCols}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <OperationalTable
              title={t('beds.expectedDischarges')}
              rows={Array.isArray(lists?.expected_discharges) ? lists.expected_discharges : []}
              columns={dischargeCols}
            />
          </Grid>
        </Grid>
      </AnimatedSection>
    </PilotWorkspace>
  );
}
