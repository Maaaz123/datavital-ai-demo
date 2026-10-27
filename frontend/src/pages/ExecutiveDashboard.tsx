import { useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  fetchExecutiveSummary,
  fetchExecutiveTrends,
  fetchEncountersByDomain,
  fetchHospitalComparison,
} from '@/api/executive';
import { fetchAlerts } from '@/api/alerts';
import { fetchDataQualitySummary } from '@/api/dataQuality';
import { useFilterStore } from '@/store/filterStore';
import { useHasPermission } from '@/hooks/usePermission';
import AskCopilotButton from '@/components/copilot/AskCopilotButton';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import AnimatedSection from '@/components/motion/AnimatedSection';
import {
  AIExecutiveBrief,
  ChartSection,
  DataFreshnessIndicator,
  DecisionPriorityList,
  PilotWorkspace,
  type DecisionPriority,
  type FreshnessStatus,
} from '@/components/product';
import { buildSituationFromKpis, deriveOperationalOwner } from '@/utils/situationFromKpis';
import { selectExecutivePrimaryKpis } from '@/utils/selectExecutiveKpis';
import { EXECUTIVE_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import { buildTrendHeadline } from '@/utils/chartHeadlines';
import { layoutDensity } from '@/design-system/layout';
import { brand } from '@/design-system/colors';
import type { AlertItem, KPICardData } from '@/types/api';
import { localizeKpiLabel, localizeKpis } from '@/i18n/localize';
import { formatKpiValue } from '@/utils/formatKpiValue';

function routeForKpi(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('bed') || k.includes('occupancy') || k.includes('operational_health')) return '/beds';
  if (k.includes('ed') || k.includes('emergency') || k.includes('wait')) return '/emergency';
  if (k.includes('revenue') || k.includes('claim') || k.includes('denial')) return '/rcm';
  return '/dashboard';
}

function freshnessFromDq(score: unknown): { status: FreshnessStatus; label: string } {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return { status: 'unknown', label: 'Data health unknown' };
  const pct = n <= 1 ? n * 100 : n;
  if (pct >= 90) return { status: 'healthy', label: `Data health ${pct.toFixed(0)}%` };
  if (pct >= 75) return { status: 'warning', label: `Data health ${pct.toFixed(0)}%` };
  return { status: 'critical', label: `Data health ${pct.toFixed(0)}%` };
}

function severityColor(severity: KPICardData['severity']): string {
  if (severity === 'critical') return brand.critical;
  if (severity === 'warning') return brand.warning;
  if (severity === 'healthy') return brand.positive;
  return brand.primaryBlue;
}

function trendLabel(kpi: KPICardData): string | null {
  if (kpi.trend == null || !Number.isFinite(Number(kpi.trend))) return null;
  const arrow = kpi.trend_direction === 'down' ? '↓' : kpi.trend_direction === 'up' ? '↑' : '→';
  return `${arrow} ${Math.abs(Number(kpi.trend)).toFixed(1)}%`;
}

function ExecutiveHeader({
  facilityLabel,
  dateLabel,
  freshness,
  lastRefreshAt,
  onRefresh,
}: {
  facilityLabel: string;
  dateLabel?: string;
  freshness: { status: FreshnessStatus; label: string };
  lastRefreshAt: string | null;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, justifyContent: 'space-between' }}>
      <Box>
        <Typography sx={{ color: 'primary.main', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', mb: 0.6 }}>
          DATAVITAL AI / DEMONSTRATION · SYNTHETIC DATA
        </Typography>
        <Typography component="h1" sx={{ color: 'text.primary', fontSize: { xs: 27, md: 32 }, lineHeight: 1.15, fontWeight: 750 }}>
          {t('executive.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.8 }}>
          One operating picture for capacity, flow, quality, workforce and financial performance.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1.5}>
          <Chip size="small" label={facilityLabel} variant="outlined" />
          {dateLabel ? <Chip size="small" label={dateLabel} variant="outlined" /> : null}
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <DataFreshnessIndicator status={freshness.status} label={freshness.label} />
        {lastRefreshAt ? <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{dayjs(lastRefreshAt).format('HH:mm')}</Typography> : null}
        <Tooltip title={t('app.refresh')}>
          <IconButton size="small" onClick={onRefresh} aria-label={t('app.refresh')}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
        <AskCopilotButton domain="executive" question="Summarize today's hospital performance for leadership." size="small" variant="outlined" />
      </Stack>
    </Box>
  );
}

function PulseHero({
  dominant,
  signals,
  insight,
  onOpen,
}: {
  dominant: KPICardData;
  signals: KPICardData[];
  insight?: string;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const numeric = Number(dominant.value);
  const pct = Number.isFinite(numeric) && numeric >= 0 && numeric <= 100 ? numeric : 0;
  const accent = severityColor(dominant.severity);
  return (
    <Box
      data-testid="executive-pulse-hero"
      sx={{
        position: 'relative', overflow: 'hidden', borderRadius: 4, p: { xs: 2.25, md: 3 },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.13 : 0.07)}, ${theme.palette.background.paper} 54%, ${alpha(theme.palette.info.main, 0.08)})`,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : brand.shadowCard,
      }}
    >
      <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', left: -90, top: -120, background: alpha(theme.palette.info.main, 0.08), filter: 'blur(8px)' }} />
      <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(300px, 1fr)', xl: '220px minmax(300px, .9fr) minmax(360px, 1.1fr)' }, gap: { xs: 2.5, md: 3 }, alignItems: 'center' }}>
        <Box sx={{ display: 'grid', placeItems: 'center' }}>
          <Box sx={{ width: 164, height: 164, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(${accent} ${pct * 3.6}deg, ${alpha(theme.palette.text.secondary, 0.12)} 0deg)`, position: 'relative', '&::after': { content: '""', position: 'absolute', inset: 12, borderRadius: '50%', bgcolor: 'background.paper' } }}>
            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 38, fontWeight: 780, lineHeight: 1, color: 'text.primary' }}>{formatKpiValue(dominant)}</Typography>
              <Typography sx={{ mt: 0.8, fontSize: 10, fontWeight: 750, color: accent, letterSpacing: '.08em' }}>HOSPITAL PULSE</Typography>
            </Box>
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 750, letterSpacing: '.08em', color: 'primary.main' }}>OPERATING PICTURE</Typography>
          <Typography sx={{ fontSize: 23, fontWeight: 750, color: 'text.primary', mt: 0.5, mb: 2 }}>Five governed leadership signals</Typography>
          <Stack spacing={1.3}>
            {signals.slice(0, 5).map((kpi) => (
              <Box key={kpi.key} sx={{ display: 'grid', gridTemplateColumns: '110px minmax(80px,1fr) auto', gap: 1, alignItems: 'center' }}>
                <Typography noWrap sx={{ fontSize: 10, fontWeight: 650, color: 'text.secondary', textTransform: 'uppercase' }}>{kpi.label}</Typography>
                <Box sx={{ height: 7, borderRadius: 99, bgcolor: alpha(theme.palette.text.secondary, 0.1), overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: kpi.severity === 'critical' ? '58%' : kpi.severity === 'warning' ? '74%' : '92%', borderRadius: 99, bgcolor: severityColor(kpi.severity) }} />
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 750, color: 'text.primary' }}>{formatKpiValue(kpi)}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1', xl: 'auto' }, pl: { xl: 3 }, borderLeft: { xl: `1px solid ${theme.palette.divider}` } }}>
          <Typography sx={{ fontSize: 10, fontWeight: 750, letterSpacing: '.08em', color: 'primary.main' }}>EXECUTIVE SIGNAL</Typography>
          <Typography sx={{ fontSize: 22, lineHeight: 1.3, fontWeight: 750, color: 'text.primary', mt: 0.7 }}>What leadership needs to know now</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.7, mt: 1 }}>{insight ?? 'Current operational signals are available for the selected period.'}</Typography>
          <Button onClick={onOpen} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1.5, px: 0, fontWeight: 700 }}>Open highest priority</Button>
        </Box>
      </Box>
    </Box>
  );
}

function VitalSigns({ kpis, onOpen }: { kpis: KPICardData[]; onOpen: (kpi: KPICardData) => void }) {
  const theme = useTheme();
  return (
    <Box data-testid="executive-vital-signs" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(5,minmax(0,1fr))' }, gap: 1.5 }}>
      {kpis.slice(0, 5).map((kpi) => {
        const trend = trendLabel(kpi);
        const accent = severityColor(kpi.severity);
        return (
          <Box key={kpi.key} role="button" tabIndex={0} onClick={() => onOpen(kpi)} onKeyDown={(e) => e.key === 'Enter' && onOpen(kpi)} sx={{ p: 2, minHeight: 116, cursor: 'pointer', borderRadius: 3, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: alpha(accent, .45), boxShadow: theme.palette.mode === 'dark' ? 'none' : brand.shadowSoft } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography noWrap sx={{ color: 'text.secondary', fontSize: 10, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.045em' }}>{kpi.label}</Typography>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: accent }} />
            </Stack>
            <Typography sx={{ fontSize: 25, lineHeight: 1.15, fontWeight: 760, color: 'text.primary', mt: 1.2 }}>{formatKpiValue(kpi)}</Typography>
            <Typography sx={{ fontSize: 10, color: trend ? (kpi.is_improvement === false ? 'error.main' : 'success.main') : 'text.secondary', fontWeight: 650, mt: 1 }}>{trend ?? 'Current period'}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default function ExecutiveDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);
  const canViewDq = useHasPermission('dashboard.data_quality');

  const summaryQuery = useQuery({
    queryKey: ['executive-summary', filters],
    queryFn: () => fetchExecutiveSummary(filters),
  });
  const trendsQuery = useQuery({
    queryKey: ['executive-trends', filters],
    queryFn: () => fetchExecutiveTrends(filters),
  });
  const domainQuery = useQuery({
    queryKey: ['executive-domain', filters],
    queryFn: () => fetchEncountersByDomain(filters),
  });
  const comparisonQuery = useQuery({
    queryKey: ['executive-comparison', filters],
    queryFn: () => fetchHospitalComparison(filters),
  });
  const alertsQuery = useQuery({
    queryKey: ['executive-alerts', filters],
    queryFn: () => fetchAlerts(filters, { status: 'open' }),
  });
  const dqQuery = useQuery({
    queryKey: ['executive-dq', filters.hospital_key],
    queryFn: () => fetchDataQualitySummary(filters),
    staleTime: 60_000,
    enabled: canViewDq,
  });

  useEffect(() => { if (summaryQuery.data?.generated_at) markRefreshed(); }, [summaryQuery.data?.generated_at, markRefreshed]);
  const handleRefresh = () => { queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('executive-') }); markRefreshed(); };
  const kpis = useMemo(() => localizeKpis(summaryQuery.data?.data ?? [], t), [summaryQuery.data?.data, t]);
  const trends = trendsQuery.data;
  const edWaitPoints = trends?.ed_wait_trend?.series?.[0]?.data;
  const edWaitMinutes = Array.isArray(edWaitPoints) && edWaitPoints.length
    ? Number(edWaitPoints[edWaitPoints.length - 1])
    : null;
  const primaryKpis = useMemo(() => {
    if (summaryQuery.isError || (!summaryQuery.isLoading && kpis.length === 0)) {
      return EXECUTIVE_UNAVAILABLE_KPIS;
    }
    const selected = selectExecutivePrimaryKpis(kpis, { edWaitMinutes });
    return selected.length > 0 ? selected : EXECUTIVE_UNAVAILABLE_KPIS;
  }, [summaryQuery.isError, summaryQuery.isLoading, kpis, edWaitMinutes]);
  const dominant = primaryKpis[0] ?? EXECUTIVE_UNAVAILABLE_KPIS[0];
  const situation = useMemo(() => buildSituationFromKpis(kpis, { domain: 'executive', locale: i18n.language }), [kpis, i18n.language]);

  const priorities = useMemo<DecisionPriority[]>(() => {
    const fromKpis = kpis.filter((k) => k.severity === 'critical' || k.severity === 'warning').slice(0, 4).map((kpi) => ({
      id: `kpi-${kpi.key}`, severity: kpi.severity === 'critical' ? 'critical' as const : 'warning' as const,
      issue: `${localizeKpiLabel(kpi, t)} requires attention`, area: deriveOperationalOwner(kpi.key), metricLabel: localizeKpiLabel(kpi, t), metricValue: formatKpiValue(kpi),
      changeLabel: trendLabel(kpi) ? `${trendLabel(kpi)} vs prior` : undefined,
      investigation: `Review ${deriveOperationalOwner(kpi.key)} ownership and drill into the detailed workspace.`,
      href: `${routeForKpi(kpi.key)}${window.location.search}`,
    }));
    const fromAlerts = (alertsQuery.data?.data ?? []).filter((a) => a.severity === 'critical' || a.severity === 'warning').slice(0, 3).map((alert: AlertItem) => ({
      id: `alert-${alert.alert_id}`, severity: alert.severity === 'critical' ? 'critical' as const : 'warning' as const,
      issue: alert.message, area: alert.hospital_name ?? alert.department_name ?? deriveOperationalOwner(alert.domain), metricLabel: 'Alert', metricValue: alert.severity,
      investigation: 'Open the alerts workspace and assign an operational owner.', href: `/alerts${window.location.search}`,
    }));
    return [...fromKpis, ...fromAlerts].slice(0, 5);
  }, [alertsQuery.data?.data, kpis, t]);

  const occupancySeries = trends?.occupancy_trend?.series?.[0]?.data;
  const volumeSeries = trends?.daily_patient_volume?.series?.[0]?.data;
  const revenueSeries = trends?.revenue_trend?.series?.[0]?.data;
  const performanceHeadline = buildTrendHeadline({ label: 'Hospital occupancy', values: occupancySeries as number[] | undefined, higherIsBetter: false, unit: '%' }) ?? buildTrendHeadline({ label: 'Patient volume', values: volumeSeries as number[] | undefined, higherIsBetter: true });
  const dqKpis = dqQuery.data?.data ?? [];
  const totalChecks = dqKpis.find((k) => k.key === 'total_checks');
  const passedChecks = dqKpis.find((k) => k.key === 'passed_checks');
  const scoreKpi = dqKpis.find((k) => k.key === 'quality_score');
  let dqScore: number | null = totalChecks && passedChecks && Number(totalChecks.value) > 0 ? Number(passedChecks.value) / Number(totalChecks.value) * 100 : null;
  if (dqScore == null && scoreKpi && Number.isFinite(Number(scoreKpi.value))) dqScore = Number(scoreKpi.value) <= 1 ? Number(scoreKpi.value) * 100 : Number(scoreKpi.value);
  const freshness = freshnessFromDq(dqScore);
  const facilityLabel = filters.hospital_key ? t('context.facilityScoped', { defaultValue: 'Selected facility scope' }) : t('context.allHospitals');
  const dateLabel = filters.date_from && filters.date_to ? `${dayjs(filters.date_from).format('DD MMM')} – ${dayjs(filters.date_to).format('DD MMM YYYY')}` : undefined;

  return (
    <PilotWorkspace>
      <AnimatedSection><ExecutiveHeader facilityLabel={facilityLabel} dateLabel={dateLabel} freshness={freshness} lastRefreshAt={lastRefreshAt} onRefresh={handleRefresh} /></AnimatedSection>
      {summaryQuery.isError ? (
        <AnimatedSection delay={0.01}>
          <ErrorState variant="inline" onRetry={() => summaryQuery.refetch()} />
        </AnimatedSection>
      ) : null}
      <AnimatedSection delay={0.025}>
        {summaryQuery.isLoading && !summaryQuery.data ? (
          <LoadingSkeleton variant="kpi" />
        ) : (
          <PulseHero dominant={dominant} signals={primaryKpis} insight={situation?.text} onOpen={() => navigate(priorities[0]?.href ?? '/alerts')} />
        )}
      </AnimatedSection>
      <AnimatedSection delay={0.05}>
        {summaryQuery.isLoading && !summaryQuery.data ? (
          <LoadingSkeleton variant="kpi" />
        ) : (
          <VitalSigns kpis={primaryKpis} onOpen={(kpi) => navigate(`${routeForKpi(kpi.key)}${window.location.search}`)} />
        )}
      </AnimatedSection>

      <AnimatedSection delay={0.075} onceInView>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1.05fr) minmax(0,.95fr)' }, gap: 2 }}>
          <ChartSection
            elevated
            title="Enterprise occupancy trend"
            subtitle="Actual hospital occupancy across the selected period"
            headline={performanceHeadline}
            height={layoutDensity.chartMain}
            loading={trendsQuery.isLoading}
            error={trendsQuery.isError}
            onRetry={() => trendsQuery.refetch()}
          >
            <EChart payload={trends?.occupancy_trend ?? trends?.daily_patient_volume} height={layoutDensity.chartMain} />
          </ChartSection>
          <ChartSection
            elevated
            title="Patient journey mix"
            subtitle="Encounter distribution across care domains"
            height={layoutDensity.chartMain}
            loading={domainQuery.isLoading}
            error={domainQuery.isError}
            onRetry={() => domainQuery.refetch()}
          >
            <EChart payload={domainQuery.data} height={layoutDensity.chartMain} />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.1} onceInView>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.25fr) minmax(320px,.75fr)' }, gap: 2, alignItems: 'stretch' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2 }}>
            <ChartSection
              title="Patient-flow performance"
              subtitle={t('executive.patientVolume')}
              headline={buildTrendHeadline({ label: 'Patient volume', values: volumeSeries as number[] | undefined, higherIsBetter: true })}
              height={layoutDensity.chartCompact}
              loading={trendsQuery.isLoading}
              error={trendsQuery.isError}
              onRetry={() => trendsQuery.refetch()}
            >
              <EChart payload={trends?.daily_patient_volume} height={layoutDensity.chartCompact} />
            </ChartSection>
            <ChartSection
              title="Capacity comparison"
              subtitle={t('executive.hospitalComparison')}
              height={layoutDensity.chartCompact}
              loading={comparisonQuery.isLoading}
              error={comparisonQuery.isError}
              onRetry={() => comparisonQuery.refetch()}
            >
              <EChart payload={comparisonQuery.data} height={layoutDensity.chartCompact} />
            </ChartSection>
          </Box>
          <DecisionPriorityList title="Executive priorities" items={priorities} onNavigate={(href) => navigate(href)} emptyMessage="No critical priorities for the selected filters." />
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.125} onceInView>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) minmax(0,1fr)' }, gap: 2 }}>
          <ChartSection
            title="Revenue bridge"
            subtitle={t('executive.revenueTrend')}
            headline={buildTrendHeadline({ label: 'Revenue', values: revenueSeries as number[] | undefined, higherIsBetter: true })}
            height={layoutDensity.chartCompact}
            loading={trendsQuery.isLoading}
            error={trendsQuery.isError}
            onRetry={() => trendsQuery.refetch()}
          >
            <EChart payload={trends?.revenue_trend} height={layoutDensity.chartCompact} />
          </ChartSection>
          {situation ? <AIExecutiveBrief title={t('executive.insight')} whatChanged={situation.observedFact} whyItMatters={situation.text} evidence={[...primaryKpis.slice(0, 3).map((k) => `${localizeKpiLabel(k, t)}: ${formatKpiValue(k)}`), ...(priorities[0] ? [`Priority: ${priorities[0].issue}`] : [])]} limitation={situation.possibleExplanation} followUp={situation.recommendedAction} relatedHref={priorities[0]?.href ?? '/alerts'} relatedLabel="Open related workspace" /> : (
            <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}><AutoAwesomeOutlinedIcon color="primary" /><Typography sx={{ mt: 1, fontWeight: 700 }}>AI brief will appear when governed signals are available.</Typography></Box>
          )}
        </Box>
      </AnimatedSection>
    </PilotWorkspace>
  );
}
