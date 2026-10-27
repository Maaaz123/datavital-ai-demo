import { useEffect, useMemo } from 'react';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import {
  fetchEmergencySummary,
  fetchEmergencyTrends,
  fetchEmergencyStatusDistribution,
  fetchEmergencyCurrentPatients,
  fetchEmergencyHourlyVolume,
  fetchEmergencyTriageDistribution,
  fetchEmergencyWaitByTriage,
  fetchEmergencyThresholdExceptions,
  downloadEmergencyExport,
} from '@/api/emergency';
import MiniListTable from '@/components/dashboard/MiniListTable';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import AnimatedSection from '@/components/motion/AnimatedSection';
import {
  PageIntroduction,
  MetricBand,
  PilotWorkspace,
  ChartSection,
  AIExecutiveBrief,
} from '@/components/product';
import { useFilterStore } from '@/store/filterStore';
import { buildSituationFromKpis } from '@/utils/situationFromKpis';
import { EMERGENCY_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import { buildTrendHeadline, buildWaitConcernHeadline } from '@/utils/chartHeadlines';
import { layoutDensity } from '@/design-system/layout';
import { brand } from '@/design-system/colors';
import type { ChartPayload, DataRow, KPICardData } from '@/types/api';
import { localizeKpis } from '@/i18n/localize';
import { formatDateTime, formatMinutes, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

const ED_METRIC_ORDER = [
  'ed_visits',
  'total_visits',
  'visit_count',
  'arrival_to_triage_minutes',
  'avg_arrival_to_triage',
  'door_to_triage_minutes',
  'arrival_to_physician_minutes',
  'avg_wait_minutes',
  'door_to_provider_minutes',
  'ed_los_minutes',
  'avg_los_minutes',
  'admission_rate',
] as const;

const WAIT_KEYS = new Set([
  'avg_wait_minutes',
  'door_to_provider_minutes',
  'arrival_to_physician_minutes',
  'arrival_to_triage_minutes',
  'avg_arrival_to_triage',
  'door_to_triage_minutes',
  'avg_los_minutes',
  'ed_los_minutes',
]);

function pickEdMetrics(kpis: KPICardData[]): { primary: KPICardData; supporting: KPICardData[] } | null {
  if (!kpis.length) return null;
  const byKey = new Map(kpis.map((k) => [k.key, k]));
  const ordered: KPICardData[] = [];
  for (const key of ED_METRIC_ORDER) {
    const hit = byKey.get(key);
    if (hit) ordered.push(hit);
  }
  for (const k of kpis) {
    if (!ordered.find((o) => o.key === k.key)) ordered.push(k);
  }

  const concerning = ordered.find(
    (k) => WAIT_KEYS.has(k.key) && (k.severity === 'critical' || k.severity === 'warning'),
  );
  const primary = concerning ?? ordered.find((k) => WAIT_KEYS.has(k.key)) ?? ordered[0];
  const supporting = ordered.filter((k) => k.key !== primary.key).slice(0, 4);
  return { primary, supporting };
}

function extractSeries(payload?: ChartPayload | null): number[] | undefined {
  const data = payload?.series?.[0]?.data;
  return Array.isArray(data) ? (data as number[]) : undefined;
}

export default function EmergencyDashboard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);

  const summaryQuery = useQuery({
    queryKey: ['emergency-summary', filters],
    queryFn: () => fetchEmergencySummary(filters),
  });
  const trendsQuery = useQuery({
    queryKey: ['emergency-trends', filters],
    queryFn: () => fetchEmergencyTrends(filters),
  });
  const statusQuery = useQuery({
    queryKey: ['emergency-status', filters],
    queryFn: () => fetchEmergencyStatusDistribution(filters),
  });
  const currentQuery = useQuery({
    queryKey: ['emergency-current-patients', filters],
    queryFn: () => fetchEmergencyCurrentPatients(filters),
  });
  const hourlyQuery = useQuery({
    queryKey: ['emergency-hourly', filters],
    queryFn: () => fetchEmergencyHourlyVolume(filters),
  });
  const triageQuery = useQuery({
    queryKey: ['emergency-triage', filters],
    queryFn: () => fetchEmergencyTriageDistribution(filters),
  });
  const waitTriageQuery = useQuery({
    queryKey: ['emergency-wait-triage', filters],
    queryFn: () => fetchEmergencyWaitByTriage(filters),
  });
  const thresholdQuery = useQuery({
    queryKey: ['emergency-threshold', filters],
    queryFn: () => fetchEmergencyThresholdExceptions(filters),
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('emergency-') });
    markRefreshed();
  };

  const kpis = useMemo(
    () => localizeKpis(summaryQuery.data?.data ?? [], t),
    [summaryQuery.data?.data, t],
  );
  const metricBand = useMemo(() => {
    if (summaryQuery.isError || (!summaryQuery.isLoading && kpis.length === 0)) {
      return pickEdMetrics(EMERGENCY_UNAVAILABLE_KPIS);
    }
    return pickEdMetrics(kpis) ?? pickEdMetrics(EMERGENCY_UNAVAILABLE_KPIS);
  }, [summaryQuery.isError, summaryQuery.isLoading, kpis]);
  const situation = useMemo(
    () => buildSituationFromKpis(kpis, { domain: 'emergency', locale: i18n.language }),
    [kpis, i18n.language],
  );

  const trends = trendsQuery.data as Record<string, ChartPayload | undefined> | undefined;
  const waitSeries = extractSeries(trends?.wait_trend || trends?.wait_time_trend);
  const volumeSeries = extractSeries(trends?.visits_by_day || trends?.visits_trend);
  const avgWaitKpi = kpis.find((k) =>
    ['avg_wait_minutes', 'door_to_provider_minutes', 'arrival_to_physician_minutes'].includes(k.key),
  );

  const waitHeadline =
    buildWaitConcernHeadline({
      avgWait: avgWaitKpi && typeof avgWaitKpi.value === 'number' ? avgWaitKpi.value : null,
    }) ??
    buildTrendHeadline({
      label: 'ED waiting time',
      values: waitSeries,
      higherIsBetter: false,
      unit: ' min',
    });

  const volumeHeadline = buildTrendHeadline({
    label: 'ED visit volume',
    values: volumeSeries ?? extractSeries(hourlyQuery.data),
    higherIsBetter: true,
  });

  const currentColumns: ColumnDef<DataRow, unknown>[] = [
    columnHelper.accessor('triage_level', {
      header: t('emergency.table.triage'),
      cell: (info) => `T${fallback(info.getValue())}`,
    }),
    columnHelper.accessor('arrival_ts', {
      header: t('emergency.table.arrival'),
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.accessor('department_name', {
      header: t('emergency.table.department'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('hospital_name', {
      header: t('emergency.table.hospital'),
      cell: (info) => fallback(info.getValue()),
    }),
  ];

  const thresholdColumns: ColumnDef<DataRow, unknown>[] = [
    columnHelper.accessor('encounter_id', {
      header: t('emergency.table.encounter'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('hospital_name', {
      header: t('emergency.table.hospital'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('triage_level', {
      header: t('emergency.table.triage'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('door_to_provider_minutes', {
      header: t('emergency.table.doorToProvider'),
      cell: (info) => formatMinutes(info.getValue()),
    }),
    columnHelper.accessor('los_minutes', {
      header: t('emergency.los', { defaultValue: 'LOS' }),
      cell: (info) => formatMinutes(info.getValue()),
    }),
    columnHelper.accessor('threshold_breached', {
      header: t('emergency.threshold', { defaultValue: 'Threshold' }),
      cell: (info) => fallback(info.getValue()),
    }),
  ];

  return (
    <PilotWorkspace>
      <AnimatedSection>
        <PageIntroduction
          eyebrow={t('emergency.periodBased', { defaultValue: 'Period-Based Metrics' })}
          title={t('emergency.title')}
          purpose={situation?.text ?? t('emergency.subtitle')}
          context={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={t('emergency.periodBased', { defaultValue: 'Period-Based Metrics' })}
                sx={{ bgcolor: brand.surfaceSoft, border: `1px solid ${brand.border}`, fontWeight: 600 }}
              />
              {filters.date_from && filters.date_to ? (
                <Chip
                  size="small"
                  label={`${dayjs(filters.date_from).format('DD MMM')} – ${dayjs(filters.date_to).format('DD MMM YYYY')}`}
                  sx={{ border: `1px solid ${brand.border}` }}
                />
              ) : null}
            </Stack>
          }
          meta={
            <>
              {lastRefreshAt ? (
                <Typography sx={{ fontSize: 12, color: brand.textMuted }}>
                  {t('app.lastRefresh')}: {dayjs(lastRefreshAt).format('HH:mm')}
                </Typography>
              ) : null}
              <Tooltip title={t('app.refresh')}>
                <IconButton size="small" onClick={handleRefresh} aria-label={t('app.refresh')}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={() => downloadEmergencyExport(filters)}
              >
                {t('common.exportCsv', { defaultValue: 'Export CSV' })}
              </Button>
            </>
          }
        />
      </AnimatedSection>

      {summaryQuery.isError ? (
        <AnimatedSection delay={0.02}>
          <ErrorState variant="inline" onRetry={() => summaryQuery.refetch()} />
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={0.05}>
        {summaryQuery.isLoading && !metricBand ? (
          <LoadingSkeleton variant="kpi" />
        ) : metricBand ? (
          <MetricBand primary={metricBand.primary} supporting={metricBand.supporting} />
        ) : null}
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(0, 0.8fr)' },
            gap: 2,
          }}
        >
          <ChartSection
            elevated
            title={t('emergency.hourlyVolume', { defaultValue: 'Hourly patient volume' })}
            subtitle={t('emergency.demandPattern', { defaultValue: 'Demand pattern' })}
            headline={volumeHeadline}
            height={layoutDensity.chartMain}
            loading={hourlyQuery.isLoading || trendsQuery.isLoading}
            error={hourlyQuery.isError && trendsQuery.isError}
            onRetry={() => {
              void hourlyQuery.refetch();
              void trendsQuery.refetch();
            }}
          >
            <EChart
              payload={hourlyQuery.data ?? trends?.visits_by_day ?? trends?.visits_trend}
              height={layoutDensity.chartMain}
            />
          </ChartSection>
          <Stack spacing={2}>
            <ChartSection
              title={t('emergency.triageDistribution', { defaultValue: 'Triage distribution' })}
              subtitle={t('emergency.triagePressure', { defaultValue: 'Triage pressure' })}
              height={layoutDensity.chartCompact - 40}
              loading={triageQuery.isLoading}
              error={triageQuery.isError}
              onRetry={() => triageQuery.refetch()}
            >
              <EChart payload={triageQuery.data} height={layoutDensity.chartCompact - 40} />
            </ChartSection>
            <ChartSection
              title={t('emergency.waitByTriage', { defaultValue: 'Waiting time by triage' })}
              subtitle={t('emergency.waitingPerformance', { defaultValue: 'Waiting-time performance' })}
              headline={waitHeadline}
              height={layoutDensity.chartCompact - 40}
              loading={waitTriageQuery.isLoading}
              error={waitTriageQuery.isError}
              onRetry={() => waitTriageQuery.refetch()}
            >
              <EChart payload={waitTriageQuery.data} height={layoutDensity.chartCompact - 40} />
            </ChartSection>
          </Stack>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.14} onceInView>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ChartSection
            title={t('emergency.visitsTrend')}
            subtitle={t('emergency.dayHourDemand', { defaultValue: 'Daily demand trend' })}
            height={layoutDensity.chartCompact}
            loading={trendsQuery.isLoading}
            error={trendsQuery.isError}
            onRetry={() => trendsQuery.refetch()}
          >
            <EChart payload={trends?.visits_by_day || trends?.visits_trend} height={layoutDensity.chartCompact} />
          </ChartSection>
          <ChartSection
            title={t('emergency.dispositionDistribution')}
            subtitle={t('emergency.disposition', { defaultValue: 'Disposition breakdown' })}
            height={layoutDensity.chartCompact}
            loading={statusQuery.isLoading}
            error={statusQuery.isError}
            onRetry={() => statusQuery.refetch()}
          >
            <EChart payload={statusQuery.data} height={layoutDensity.chartCompact} />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.18} onceInView>
        <Typography sx={{ fontSize: 15, fontWeight: 650, color: brand.deepNavy, mb: 1.5 }}>
          {t('emergency.exceptionsTitle', { defaultValue: 'Exceptions requiring attention' })}
        </Typography>
        <Stack spacing={2}>
          {thresholdQuery.isError ? (
            <ErrorState variant="compact" onRetry={() => thresholdQuery.refetch()} />
          ) : (
            <MiniListTable
              title={t('emergency.thresholdExceptions', { defaultValue: 'Cases exceeding wait-time thresholds' })}
              rows={thresholdQuery.data ?? []}
              columns={thresholdColumns}
              loading={thresholdQuery.isLoading}
              maxRows={12}
            />
          )}
          {currentQuery.isError ? (
            <ErrorState variant="compact" onRetry={() => currentQuery.refetch()} />
          ) : (
            <MiniListTable
              title={`${t('emergency.currentPatients')} — ${t('emergency.demoSnapshot', { defaultValue: 'Demo Snapshot' })}`}
              rows={currentQuery.data ?? []}
              columns={currentColumns}
              loading={currentQuery.isLoading}
              maxRows={12}
            />
          )}
        </Stack>
      </AnimatedSection>

      {situation ? (
        <AnimatedSection delay={0.22} onceInView>
          <AIExecutiveBrief
            title={t('ux.insightTitle')}
            whatChanged={waitHeadline ?? situation.observedFact}
            whyItMatters={situation.text}
            evidence={kpis.slice(0, 4).map((k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''}`)}
            limitation={situation.possibleExplanation}
            followUp={situation.recommendedAction}
            relatedHref="/emergency"
            relatedLabel={t('emergency.thresholdExceptions', { defaultValue: 'Review threshold exceptions' })}
          />
        </AnimatedSection>
      ) : null}
    </PilotWorkspace>
  );
}
