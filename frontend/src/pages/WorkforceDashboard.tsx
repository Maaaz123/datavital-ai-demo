import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import {
  buildDeterministicWorkforceBrief,
  departmentAchievementChart,
  fetchDepartmentAchievement,
  fetchLicenseBandCounts,
  fetchPerformanceDistribution,
  fetchSpecialtyAchievement,
  fetchWorkforceEmployees,
  fetchWorkforceKpis,
  fetchWorkforcePriorities,
  fetchWorkforceSummary,
  fetchWorkforceTrend,
  licenseBandChart,
  performanceDistributionChart,
  specialtyAchievementChart,
} from '@/api/workforce';
import AskCopilotButton from '@/components/copilot/AskCopilotButton';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import DetailDataTable from '@/components/dashboard/DetailDataTable';
import AnimatedSection from '@/components/motion/AnimatedSection';
import WorkforceFilterBar from '@/components/workforce/WorkforceFilterBar';
import WorkforceHorizontalBarChart from '@/components/workforce/WorkforceHorizontalBarChart';
import WorkforceStatusChip from '@/components/workforce/WorkforceStatusChip';
import {
  PageIntroduction,
  VitalSignsGrid,
  PilotWorkspace,
  ChartSection,
  DecisionPriorityList,
  AIExecutiveBrief,
  DataFreshnessIndicator,
  type DecisionPriority,
  type FreshnessStatus,
} from '@/components/product';
import { useFilterStore } from '@/store/filterStore';
import { DEFAULT_UNAVAILABLE_KPIS } from '@/utils/unavailableKpis';
import { layoutDensity } from '@/design-system/layout';
import { brand } from '@/design-system/colors';
import type { WorkforceEmployeeListItem, WorkforceFilters } from '@/types/workforce';

const columnHelper = createColumnHelper<WorkforceEmployeeListItem>();

function freshnessFromHealth(pct: number | null): { status: FreshnessStatus; label: string } {
  if (pct == null || !Number.isFinite(pct)) return { status: 'unknown', label: 'Data health unknown' };
  if (pct >= 90) return { status: 'healthy', label: `Data health ${pct.toFixed(0)}%` };
  if (pct >= 75) return { status: 'warning', label: `Data health ${pct.toFixed(0)}%` };
  return { status: 'critical', label: `Data health ${pct.toFixed(0)}%` };
}

export default function WorkforceDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const globalFilters = useFilterStore((s) => s.filters);
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);

  const [localFilters, setLocalFilters] = useState<WorkforceFilters>(() => ({
    facility_key: globalFilters.hospital_key ?? (searchParams.get('department_key') ? null : null),
    department_key: searchParams.get('department_key') ? Number(searchParams.get('department_key')) : null,
    date_from: globalFilters.date_from,
    date_to: globalFilters.date_to,
    page: 1,
    page_size: 10,
    sort_by: 'full_name',
    sort_order: 'asc',
    search: '',
  }));

  const filters = localFilters;

  const summaryQuery = useQuery({
    queryKey: ['workforce-summary', filters],
    queryFn: () => fetchWorkforceSummary(filters),
  });
  const kpisQuery = useQuery({
    queryKey: ['workforce-kpis', filters],
    queryFn: () => fetchWorkforceKpis(filters),
  });
  const deptQuery = useQuery({
    queryKey: ['workforce-dept', filters],
    queryFn: () => fetchDepartmentAchievement(filters),
  });
  const specialtyQuery = useQuery({
    queryKey: ['workforce-specialty', filters],
    queryFn: () => fetchSpecialtyAchievement(filters),
  });
  const distQuery = useQuery({
    queryKey: ['workforce-dist', filters],
    queryFn: () => fetchPerformanceDistribution(filters),
  });
  const licenseQuery = useQuery({
    queryKey: ['workforce-license-bands', filters],
    queryFn: () => fetchLicenseBandCounts(filters),
  });
  const trendQuery = useQuery({
    queryKey: ['workforce-trend', filters],
    queryFn: () => fetchWorkforceTrend(filters),
  });
  const prioritiesQuery = useQuery({
    queryKey: ['workforce-priorities', filters],
    queryFn: () => fetchWorkforcePriorities(filters),
  });
  const employeesQuery = useQuery({
    queryKey: ['workforce-employees', filters],
    queryFn: () => fetchWorkforceEmployees(filters),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('workforce-') });
    markRefreshed();
  };

  const kpis =
    kpisQuery.isError || summaryQuery.isError
      ? DEFAULT_UNAVAILABLE_KPIS
      : (kpisQuery.data?.data ?? []);
  const primary = kpis.find((k) => k.key === 'overall_target_achievement') ?? kpis[0] ?? DEFAULT_UNAVAILABLE_KPIS[0];
  const supporting = kpis.filter((k) => k.key !== primary.key).slice(0, 4);

  const priorities: DecisionPriority[] = useMemo(
    () =>
      (prioritiesQuery.data?.data ?? []).slice(0, 5).map((p) => ({
        id: p.id,
        severity: p.severity,
        issue: p.issue,
        area: `${p.area} · ${p.owner}`,
        metricLabel: p.metricLabel,
        metricValue: p.metricValue,
        changeLabel: p.changeLabel,
        investigation: p.investigation,
        href: p.href,
      })),
    [prioritiesQuery.data?.data],
  );

  const columns = useMemo(
    () =>
      [
      columnHelper.accessor('employee_code', {
        header: t('workforce.employeeId'),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('full_name', {
        header: t('workforce.employeeName'),
        cell: (info) => (
          <Typography fontWeight={600} color={brand.deepNavy}>
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor('facility_name', { header: t('workforce.facility') }),
      columnHelper.accessor('department_name', { header: t('workforce.department') }),
      columnHelper.accessor('specialty_label', { header: t('workforce.specialty') }),
      columnHelper.accessor('job_title', { header: t('workforce.jobTitle') }),
      columnHelper.accessor('manager_name', {
        header: t('workforce.manager'),
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('employment_status', {
        header: t('workforce.employmentStatus'),
        cell: (info) => <WorkforceStatusChip status={info.getValue()} />,
      }),
      columnHelper.accessor('achievement_pct', {
        header: t('workforce.achievement'),
        cell: (info) => (info.getValue() != null ? `${Number(info.getValue()).toFixed(1)}%` : '—'),
      }),
      columnHelper.accessor('performance_status', {
        header: t('workforce.performanceStatus'),
        cell: (info) => <WorkforceStatusChip status={info.getValue()} />,
      }),
      columnHelper.accessor('license_number', {
        header: t('workforce.licenseNumber'),
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('licensing_authority', {
        header: t('workforce.licensingAuthority'),
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('license_expiry_date', {
        header: t('workforce.licenseExpiry'),
        cell: (info) => (info.getValue() ? dayjs(info.getValue()).format('DD MMM YYYY') : '—'),
      }),
      columnHelper.accessor('license_status', {
        header: t('workforce.licenseStatus'),
        cell: (info) => <WorkforceStatusChip status={info.getValue()} />,
      }),
      columnHelper.accessor('credential_status', {
        header: t('workforce.credentialStatus'),
        cell: (info) => <WorkforceStatusChip status={info.getValue()} />,
      }),
      columnHelper.accessor('last_performance_review', {
        header: t('workforce.lastReview'),
        cell: (info) => (info.getValue() ? dayjs(info.getValue()).format('DD MMM YYYY') : '—'),
      }),
      columnHelper.display({
        id: 'actions',
        header: t('workforce.actions'),
        cell: ({ row }) => (
          <Button size="small" onClick={() => navigate(`/workforce/employees/${row.original.id}`)}>
            {t('workforce.viewProfile')}
          </Button>
        ),
      }),
    ] as ColumnDef<WorkforceEmployeeListItem>[],
    [navigate, t],
  );

  const summary = summaryQuery.data?.data;
  const freshness = freshnessFromHealth(summary?.data_health_pct ?? null);
  const brief = summary
    ? buildDeterministicWorkforceBrief(summary, prioritiesQuery.data?.data ?? [])
    : null;

  const facilityLabel = filters.facility_key
    ? t('context.facilityScoped', { defaultValue: 'Selected facility scope' })
    : t('context.allHospitals');

  const kpisLoading = (summaryQuery.isLoading || kpisQuery.isLoading) && !kpisQuery.data && !summaryQuery.isError;

  return (
    <PilotWorkspace>
      <AnimatedSection>
        <PageIntroduction
          eyebrow={t('workforce.eyebrow')}
          title={t('workforce.title')}
          purpose={t('workforce.purpose')}
          context={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={facilityLabel}
                sx={{ bgcolor: brand.surfaceSoft, border: `1px solid ${brand.border}` }}
              />
              {filters.date_from && filters.date_to ? (
                <Chip
                  size="small"
                  label={`${dayjs(filters.date_from).format('DD MMM')} – ${dayjs(filters.date_to).format('DD MMM YYYY')}`}
                  sx={{ bgcolor: brand.surface, border: `1px solid ${brand.border}` }}
                />
              ) : (
                <Chip
                  size="small"
                  label={t('workforce.reportingPeriodDemo')}
                  sx={{ bgcolor: brand.surface, border: `1px solid ${brand.border}` }}
                />
              )}
              <Chip
                size="small"
                label={t('workforce.demoDataBadge')}
                sx={{ bgcolor: brand.surfaceMuted, border: `1px solid ${brand.border}`, color: brand.textMuted }}
              />
            </Stack>
          }
          meta={
            <>
              <DataFreshnessIndicator
                status={freshness.status}
                label={freshness.label}
                detail={t('workforce.dataFreshnessDetail')}
              />
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
              <AskCopilotButton
                domain="workforce"
                question="Summarize workforce performance and credentialing risks for leadership."
                size="small"
                variant="outlined"
              />
            </>
          }
        />
      </AnimatedSection>

      {(summaryQuery.isError || kpisQuery.isError) ? (
        <AnimatedSection delay={0.02}>
          <ErrorState
            variant="inline"
            onRetry={() => {
              void summaryQuery.refetch();
              void kpisQuery.refetch();
            }}
          />
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={0.04}>
        <WorkforceFilterBar value={filters} onChange={setLocalFilters} />
      </AnimatedSection>

      <AnimatedSection delay={0.06}>
        {kpisLoading ? (
          <LoadingSkeleton variant="kpi" />
        ) : (
          <VitalSignsGrid kpis={[primary, ...supporting]} />
        )}
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(0, 0.8fr)' },
            gap: 2,
          }}
        >
          <ChartSection
            elevated
            title={t('workforce.charts.targetByDepartment')}
            subtitle={t('workforce.charts.targetByDepartmentSubtitle')}
            height={layoutDensity.chartMain}
            loading={deptQuery.isLoading}
            error={deptQuery.isError}
            onRetry={() => deptQuery.refetch()}
          >
            <WorkforceHorizontalBarChart
              payload={departmentAchievementChart(deptQuery.data?.data ?? [])}
              height={layoutDensity.chartMain}
            />
          </ChartSection>
          <ChartSection
            title={t('workforce.charts.performanceDistribution')}
            subtitle={t('workforce.charts.performanceDistributionSubtitle')}
            height={layoutDensity.chartMain}
            loading={distQuery.isLoading}
            error={distQuery.isError}
            onRetry={() => distQuery.refetch()}
          >
            <EChart
              payload={performanceDistributionChart(distQuery.data?.data ?? [])}
              height={layoutDensity.chartMain}
            />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.14} onceInView>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ChartSection
            title={t('workforce.charts.targetBySpecialty')}
            subtitle={t('workforce.charts.targetBySpecialtySubtitle')}
            height={layoutDensity.chartCompact}
            loading={specialtyQuery.isLoading}
            error={specialtyQuery.isError}
            onRetry={() => specialtyQuery.refetch()}
          >
            <EChart
              payload={specialtyAchievementChart(specialtyQuery.data?.data ?? [])}
              height={layoutDensity.chartCompact}
            />
          </ChartSection>
          <ChartSection
            title={t('workforce.charts.licenseStatus')}
            subtitle={t('workforce.charts.licenseStatusSubtitle')}
            height={layoutDensity.chartCompact}
            loading={licenseQuery.isLoading}
            error={licenseQuery.isError}
            onRetry={() => licenseQuery.refetch()}
          >
            <EChart
              payload={licenseBandChart(licenseQuery.data?.data ?? [])}
              height={layoutDensity.chartCompact}
            />
          </ChartSection>
          <ChartSection
            title={t('workforce.charts.performanceTrend')}
            subtitle={t('workforce.charts.performanceTrendSubtitle')}
            height={layoutDensity.chartCompact}
            loading={trendQuery.isLoading}
            error={trendQuery.isError}
            onRetry={() => trendQuery.refetch()}
          >
            <EChart payload={trendQuery.data?.data} height={layoutDensity.chartCompact} />
          </ChartSection>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.16} onceInView>
        <Box>
          <DecisionPriorityList
            title={t('workforce.attentionRequired')}
            items={priorities}
            onNavigate={(href) => navigate(href)}
            emptyMessage={t('workforce.noPriorities')}
          />
          {(prioritiesQuery.data?.data?.length ?? 0) > 5 ? (
            <Link
              component="button"
              underline="hover"
              sx={{ mt: 1, fontWeight: 600, fontSize: 13 }}
              onClick={() => setLocalFilters((f) => ({ ...f, performance_status: 'below_target', page: 1 }))}
            >
              {t('workforce.seeAllPriorities')}
            </Link>
          ) : null}
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={0.18} onceInView>
        <DetailDataTable
          title={t('workforce.employeeTable')}
          data={employeesQuery.data?.data ?? []}
          columns={columns}
          loading={employeesQuery.isLoading}
          error={employeesQuery.isError}
          onRetry={() => employeesQuery.refetch()}
          page={filters.page}
          pageSize={filters.page_size}
          totalRecords={employeesQuery.data?.meta?.total_records ?? 0}
          onPageChange={(page) => setLocalFilters((f) => ({ ...f, page }))}
          onPageSizeChange={(page_size) => setLocalFilters((f) => ({ ...f, page_size, page: 1 }))}
          search={filters.search ?? ''}
          onSearchChange={(search) => setLocalFilters((f) => ({ ...f, search, page: 1 }))}
          sortBy={filters.sort_by ?? undefined}
          sortOrder={filters.sort_order ?? undefined}
          onSortChange={(sort_by, sort_order) => setLocalFilters((f) => ({ ...f, sort_by, sort_order }))}
          emptyMessage={t('workforce.emptyEmployees')}
          onRowClick={(row) => navigate(`/workforce/employees/${row.id}`)}
        />
      </AnimatedSection>

      {brief ? (
        <AnimatedSection delay={0.2} onceInView>
          <AIExecutiveBrief
            title={t('workforce.aiBrief')}
            whatChanged={brief.whatChanged}
            whyItMatters={brief.whyItMatters}
            evidence={brief.evidence}
            limitation={brief.limitation}
            followUp={brief.followUp}
            relatedHref={brief.relatedHref}
            relatedLabel={t('workforce.openRelated')}
          />
        </AnimatedSection>
      ) : null}
    </PilotWorkspace>
  );
}
