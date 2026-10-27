/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useEffect, useMemo } from 'react';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import {
  fetchRcmSummary,
  fetchRcmTrends,
  fetchRcmBreakdown,
  fetchRcmStatusDistribution,
  fetchDeniedClaims,
  fetchEligibilityBreakdown,
  fetchPreauthBreakdown,
  fetchDenialReasons,
  fetchLeakageExceptions,
  downloadRcmExport,
} from '@/api/rcm';
import MiniListTable from '@/components/dashboard/MiniListTable';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import AnimatedSection from '@/components/motion/AnimatedSection';
import {
  PageIntroduction,
  VitalSignsGrid,
  PilotWorkspace,
  ChartSection,
  AIExecutiveBrief,
} from '@/components/product';
import { useFilterStore } from '@/store/filterStore';
import { buildSituationFromKpis } from '@/utils/situationFromKpis';
import { DEFAULT_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import { buildDenialParetoHeadline, buildTrendHeadline } from '@/utils/chartHeadlines';
import { layoutDensity } from '@/design-system/layout';
import { brand } from '@/design-system/colors';
import type { ChartPayload, DataRow, KPICardData } from '@/types/api';
import { localizeKpis } from '@/i18n/localize';
import { formatDate, formatCurrency, fallback } from '@/utils/format';

const columnHelper = createColumnHelper<DataRow>();

const RCM_ORDER = [
  'net_billed',
  'gross_charges',
  'billed_amount',
  'net_revenue',
  'paid',
  'paid_amount',
  'collections',
  'outstanding',
  'outstanding_amount',
  'collection_rate',
  'denial_rate',
  'claim_denial_rate',
] as const;

function pickRcmMetrics(kpis: KPICardData[]): { primary: KPICardData; supporting: KPICardData[] } | null {
  if (!kpis.length) return null;
  const byKey = new Map(kpis.map((k) => [k.key, k]));
  const ordered: KPICardData[] = [];
  for (const key of RCM_ORDER) {
    const hit = byKey.get(key);
    if (hit && !ordered.find((o) => o.key === hit.key)) ordered.push(hit);
  }
  for (const k of kpis) {
    if (!ordered.find((o) => o.key === k.key)) ordered.push(k);
  }

  // Lead with collection rate or net billed — financial value first.
  const primary =
    ordered.find((k) => k.key === 'collection_rate') ??
    ordered.find((k) => ['net_billed', 'gross_charges', 'billed_amount', 'net_revenue'].includes(k.key)) ??
    ordered[0];
  const supporting = ordered.filter((k) => k.key !== primary.key).slice(0, 4);
  return { primary, supporting };
}

function extractSeries(payload?: ChartPayload | null, seriesIndex = 0): number[] | undefined {
  const data = payload?.series?.[seriesIndex]?.data;
  return Array.isArray(data) ? (data as number[]) : undefined;
}

function denialRowsFromChart(payload?: ChartPayload | null): Array<{ reason?: string; amount?: number }> {
  if (!payload?.categories?.length || !payload.series?.[0]?.data) return [];
  return payload.categories.map((cat, i) => ({
    reason: String(cat),
    amount: Number(payload.series![0].data[i] ?? 0),
  }));
}

export default function RcmDashboard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const filters = useFilterStore((s) => s.filters);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);

  const summaryQuery = useQuery({ queryKey: ['rcm-summary', filters], queryFn: () => fetchRcmSummary(filters) });
  const trendsQuery = useQuery({ queryKey: ['rcm-trends', filters], queryFn: () => fetchRcmTrends(filters) });
  const breakdownQuery = useQuery({ queryKey: ['rcm-breakdown', filters], queryFn: () => fetchRcmBreakdown(filters) });
  const statusQuery = useQuery({
    queryKey: ['rcm-status', filters],
    queryFn: () => fetchRcmStatusDistribution(filters),
  });
  const deniedQuery = useQuery({ queryKey: ['rcm-denied', filters], queryFn: () => fetchDeniedClaims(filters) });
  const eligQuery = useQuery({ queryKey: ['rcm-elig', filters], queryFn: () => fetchEligibilityBreakdown(filters) });
  const preauthQuery = useQuery({
    queryKey: ['rcm-preauth', filters],
    queryFn: () => fetchPreauthBreakdown(filters),
  });
  const denialReasonQuery = useQuery({
    queryKey: ['rcm-denial-reasons', filters],
    queryFn: () => fetchDenialReasons(filters),
  });
  const leakageQuery = useQuery({
    queryKey: ['rcm-leakage', filters],
    queryFn: () => fetchLeakageExceptions(filters),
  });

  useEffect(() => {
    if (summaryQuery.data?.generated_at) markRefreshed();
  }, [summaryQuery.data?.generated_at, markRefreshed]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('rcm-') });
    markRefreshed();
  };

  const kpis = useMemo(() => localizeKpis(summaryQuery.data?.data ?? [], t), [summaryQuery.data?.data, t]);
  const metricBand = useMemo(() => {
    if (summaryQuery.isError || (!summaryQuery.isLoading && kpis.length === 0)) {
      return pickRcmMetrics(DEFAULT_UNAVAILABLE_KPIS);
    }
    return pickRcmMetrics(kpis) ?? pickRcmMetrics(DEFAULT_UNAVAILABLE_KPIS);
  }, [summaryQuery.isError, summaryQuery.isLoading, kpis]);
  const situation = useMemo(
    () => buildSituationFromKpis(kpis, { domain: 'rcm', locale: i18n.language }),
    [kpis, i18n.language],
  );

  const trends = trendsQuery.data as Record<string, ChartPayload | undefined> | undefined;
  const billedPaid = trends?.billed_paid_outstanding_trend || trends?.revenue_trend;
  const denialHeadline = buildDenialParetoHeadline(denialRowsFromChart(denialReasonQuery.data));
  const collectionHeadline = buildTrendHeadline({
    label: 'Collections',
    values: extractSeries(billedPaid, 1) ?? extractSeries(billedPaid, 0),
    higherIsBetter: true,
  });

  const deniedColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('claim_number', {
      header: t('rcm.table.claim'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('payer_name', {
      header: t('rcm.table.payer'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('denial_reason', {
      header: t('rcm.table.denialReason'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('denied_amount', {
      header: t('rcm.table.deniedAmount'),
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('denied_on', {
      header: t('rcm.table.deniedOn'),
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  const leakageColumns: ColumnDef<DataRow, any>[] = [
    columnHelper.accessor('claim_number', {
      header: t('rcm.table.claim'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('hospital_name', {
      header: t('common.facility', { defaultValue: 'Facility' }),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('payer_name', {
      header: t('rcm.table.payer'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('claim_status', {
      header: t('rcm.table.status'),
      cell: (info) => fallback(info.getValue()),
    }),
    columnHelper.accessor('outstanding_amount', {
      header: t('rcm.table.outstanding'),
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('denied_amount', {
      header: t('rcm.table.deniedAmount'),
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('denial_reason_code', {
      header: t('rcm.table.denialReason'),
      cell: (info) => fallback(info.getValue()),
    }),
  ];

  return (
    <PilotWorkspace>
      <AnimatedSection>
        <PageIntroduction
          eyebrow={t('rcm.financialValue', { defaultValue: 'Financial Performance' })}
          title={t('rcm.title')}
          purpose={situation?.text ?? t('rcm.subtitle')}
          context={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                onClick={() => downloadRcmExport(filters)}
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
          <VitalSignsGrid kpis={[metricBand.primary, ...metricBand.supporting]} />
        ) : null}
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(0, 0.85fr)' },
            gap: 2,
          }}
        >
          <ChartSection
            elevated
            title={t('rcm.billedPaidOutstanding', { defaultValue: 'Billed versus Paid' })}
            subtitle={t('rcm.primaryFinancial', { defaultValue: 'Outstanding and denied values in context' })}
            headline={collectionHeadline}
            height={layoutDensity.chartMain}
            loading={trendsQuery.isLoading}
            error={trendsQuery.isError}
            onRetry={() => trendsQuery.refetch()}
          >
            <EChart payload={billedPaid} height={layoutDensity.chartMain} />
          </ChartSection>
          <ChartSection
            title={t('rcm.claimsFunnel')}
            subtitle={t('rcm.funnelStory', { defaultValue: 'Submitted → Adjudicated → Approved → Paid' })}
            height={layoutDensity.chartMain}
            loading={statusQuery.isLoading}
            error={statusQuery.isError}
            onRetry={() => statusQuery.refetch()}
          >
            <EChart payload={statusQuery.data} height={layoutDensity.chartMain} />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.14} onceInView>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ChartSection
            title={t('rcm.deniedByReason', { defaultValue: 'Denial Pareto' })}
            subtitle={t('rcm.denialConcentration', { defaultValue: 'Ranked by denied amount' })}
            headline={denialHeadline}
            height={layoutDensity.chartCompact}
            loading={denialReasonQuery.isLoading}
            error={denialReasonQuery.isError}
            onRetry={() => denialReasonQuery.refetch()}
          >
            <EChart payload={denialReasonQuery.data} height={layoutDensity.chartCompact} />
          </ChartSection>
          <ChartSection
            title={t('rcm.payerBreakdown')}
            subtitle={t('rcm.payerPerformance', { defaultValue: 'Payer performance comparison' })}
            height={layoutDensity.chartCompact}
            loading={breakdownQuery.isLoading}
            error={breakdownQuery.isError}
            onRetry={() => breakdownQuery.refetch()}
          >
            <EChart payload={breakdownQuery.data} height={layoutDensity.chartCompact} />
          </ChartSection>
          <ChartSection
            title={t('rcm.eligibilityOutcomes', { defaultValue: 'Eligibility outcomes' })}
            height={layoutDensity.chartCompact}
            loading={eligQuery.isLoading}
            error={eligQuery.isError}
            onRetry={() => eligQuery.refetch()}
          >
            <EChart payload={eligQuery.data} height={layoutDensity.chartCompact} />
          </ChartSection>
          <ChartSection
            title={t('rcm.preauthStatus', { defaultValue: 'Pre-authorization outcomes' })}
            height={layoutDensity.chartCompact}
            loading={preauthQuery.isLoading}
            error={preauthQuery.isError}
            onRetry={() => preauthQuery.refetch()}
          >
            <EChart payload={preauthQuery.data} height={layoutDensity.chartCompact} />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.18} onceInView>
        <Typography sx={{ fontSize: 15, fontWeight: 650, color: brand.deepNavy, mb: 1.5 }}>
          {t('rcm.followUps', { defaultValue: 'Revenue leakage & recommended follow-ups' })}
        </Typography>
        <Stack spacing={2}>
          {leakageQuery.isError ? (
            <ErrorState variant="compact" onRetry={() => leakageQuery.refetch()} />
          ) : (
            <MiniListTable
              title={t('rcm.leakageExceptions', { defaultValue: 'Revenue leakage / exceptions' })}
              rows={leakageQuery.data ?? []}
              columns={leakageColumns}
              loading={leakageQuery.isLoading}
              maxRows={12}
            />
          )}
          {deniedQuery.isError ? (
            <ErrorState variant="compact" onRetry={() => deniedQuery.refetch()} />
          ) : (
            <MiniListTable
              title={t('rcm.deniedClaims')}
              rows={deniedQuery.data ?? []}
              columns={deniedColumns}
              loading={deniedQuery.isLoading}
              maxRows={12}
            />
          )}
        </Stack>
      </AnimatedSection>

      {situation ? (
        <AnimatedSection delay={0.22} onceInView>
          <AIExecutiveBrief
            title={t('ux.insightTitle')}
            whatChanged={denialHeadline ?? situation.observedFact}
            whyItMatters={situation.text}
            evidence={kpis.slice(0, 4).map((k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''}`)}
            limitation={situation.possibleExplanation}
            followUp={situation.recommendedAction}
            relatedHref="/rcm"
            relatedLabel={t('rcm.leakageExceptions', { defaultValue: 'Review leakage exceptions' })}
          />
        </AnimatedSection>
      ) : null}
    </PilotWorkspace>
  );
}
