import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import {
  fetchEmployeeAudit,
  fetchEmployeeCredentials,
  fetchEmployeeLicenses,
  fetchEmployeePerformanceSummary,
  fetchEmployeeTargets,
  fetchEmployeeTrend,
  fetchWorkforceEmployee,
} from '@/api/workforce';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import DetailDataTable from '@/components/dashboard/DetailDataTable';
import AnimatedSection from '@/components/motion/AnimatedSection';
import WorkforceStatusChip from '@/components/workforce/WorkforceStatusChip';
import {
  PageIntroduction,
  VitalSignsGrid,
  PilotWorkspace,
  ChartSection,
} from '@/components/product';
import type { KPICardData } from '@/types/api';
import type { Credential, EmployeeTarget, ProfessionalLicense, WorkforceAuditEvent } from '@/types/workforce';
import { layoutDensity } from '@/design-system/layout';
import { brand } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';

const targetHelper = createColumnHelper<EmployeeTarget>();
const licenseHelper = createColumnHelper<ProfessionalLicense>();
const credHelper = createColumnHelper<Credential>();
const auditHelper = createColumnHelper<WorkforceAuditEvent>();

export default function WorkforceEmployeeProfilePage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const empQuery = useQuery({
    queryKey: ['workforce-employee', id],
    queryFn: () => fetchWorkforceEmployee(id),
    enabled: Boolean(id),
  });
  const summaryQuery = useQuery({
    queryKey: ['workforce-employee-summary', id],
    queryFn: () => fetchEmployeePerformanceSummary(id),
    enabled: Boolean(id),
  });
  const targetsQuery = useQuery({
    queryKey: ['workforce-employee-targets', id],
    queryFn: () => fetchEmployeeTargets(id),
    enabled: Boolean(id),
  });
  const licensesQuery = useQuery({
    queryKey: ['workforce-employee-licenses', id],
    queryFn: () => fetchEmployeeLicenses(id),
    enabled: Boolean(id),
  });
  const credsQuery = useQuery({
    queryKey: ['workforce-employee-creds', id],
    queryFn: () => fetchEmployeeCredentials(id),
    enabled: Boolean(id),
  });
  const auditQuery = useQuery({
    queryKey: ['workforce-employee-audit', id],
    queryFn: () => fetchEmployeeAudit(id),
    enabled: Boolean(id),
  });
  const trendQuery = useQuery({
    queryKey: ['workforce-employee-trend', id],
    queryFn: () => fetchEmployeeTrend(id),
    enabled: Boolean(id),
  });

  const emp = empQuery.data?.data;
  const summary = summaryQuery.data?.data;

  const metricBand = useMemo(() => {
    if (!summary) return null;
    const primary: KPICardData = {
      key: 'overall_target_achievement',
      label: t('workforce.overallTargetAchievement'),
      value: summary.overall_achievement_pct ?? '—',
      unit: '%',
      format: 'percent',
      severity:
        summary.performance_status === 'below_target'
          ? 'critical'
          : summary.performance_status === 'at_risk'
            ? 'warning'
            : 'healthy',
      data_status: summary.data_status,
      previous_value: summary.previous_period_achievement_pct,
    };
    const supporting: KPICardData[] = [
      {
        key: 'targets_achieved',
        label: t('workforce.targetsAchieved'),
        value: summary.targets_achieved,
        format: 'number',
        severity: 'healthy',
        data_status: 'available',
      },
      {
        key: 'targets_at_risk',
        label: t('workforce.targetsAtRisk'),
        value: summary.targets_at_risk,
        format: 'number',
        severity: summary.targets_at_risk > 0 ? 'warning' : 'healthy',
        data_status: 'available',
      },
      {
        key: 'credentials_action',
        label: t('workforce.credentialsRequiringAction'),
        value: (credsQuery.data?.data ?? []).filter((c) =>
          ['action_required', 'incomplete', 'expired', 'unverified'].includes(c.status),
        ).length,
        format: 'number',
        severity: 'warning',
        data_status: 'available',
      },
      {
        key: 'attendance',
        label: t('workforce.attendance'),
        value: summary.attendance_rate ?? '—',
        unit: summary.attendance_rate != null ? '%' : undefined,
        format: 'percent',
        severity: 'info',
        data_status: summary.attendance_rate == null ? 'unavailable' : 'available',
      },
    ];
    return { primary, supporting };
  }, [credsQuery.data?.data, summary, t]);

  const targetColumns = useMemo(
    () => [
      targetHelper.accessor('target_name', { header: t('workforce.targetName') }),
      targetHelper.accessor('target_value', { header: t('workforce.target') }),
      targetHelper.accessor('actual_value', {
        header: t('workforce.actual'),
        cell: (i) => i.getValue() ?? '—',
      }),
      targetHelper.accessor('achievement_pct', {
        header: t('workforce.achievement'),
        cell: (i) => (i.getValue() != null ? `${Number(i.getValue()).toFixed(1)}%` : '—'),
      }),
      targetHelper.accessor('weight', {
        header: t('workforce.weight'),
        cell: (i) => `${Math.round(Number(i.getValue()) * 100)}%`,
      }),
      targetHelper.accessor('direction', {
        header: t('workforce.direction'),
        cell: (i) => t(`workforce.direction_${i.getValue()}`),
      }),
      targetHelper.accessor('status', {
        header: t('workforce.performanceStatus'),
        cell: (i) => <WorkforceStatusChip status={i.getValue()} />,
      }),
      targetHelper.accessor('data_source', { header: t('workforce.dataSource') }),
      targetHelper.accessor('last_updated', {
        header: t('workforce.lastUpdated'),
        cell: (i) => dayjs(i.getValue()).format('DD MMM YYYY'),
      }),
    ] as ColumnDef<EmployeeTarget>[],
    [t],
  );

  const licenseColumns = useMemo(
    () => [
      licenseHelper.accessor('license_type', { header: t('workforce.licenseType') }),
      licenseHelper.accessor('license_number', {
        header: t('workforce.licenseNumber'),
        cell: (i) => i.getValue() ?? '—',
      }),
      licenseHelper.accessor('issuing_authority', {
        header: t('workforce.licensingAuthority'),
        cell: (i) => i.getValue() ?? '—',
      }),
      licenseHelper.accessor('expiry_date', {
        header: t('workforce.licenseExpiry'),
        cell: (i) => (i.getValue() ? dayjs(i.getValue()).format('DD MMM YYYY') : '—'),
      }),
      licenseHelper.accessor('days_until_expiry', {
        header: t('workforce.expiryCountdown'),
        cell: (i) => (i.getValue() != null ? String(i.getValue()) : '—'),
      }),
      licenseHelper.accessor('derived_status', {
        header: t('workforce.licenseStatus'),
        cell: (i) => <WorkforceStatusChip status={String(i.getValue() ?? 'missing')} />,
      }),
      licenseHelper.accessor('verification_status', {
        header: t('workforce.verificationState'),
      }),
      licenseHelper.accessor('renewal_status', {
        header: t('workforce.renewalState'),
        cell: (i) => t(`workforce.renewal.${i.getValue()}`, { defaultValue: String(i.getValue()) }),
      }),
      licenseHelper.accessor('renewal_owner', {
        header: t('workforce.responsibleOwner'),
        cell: (i) => i.getValue() ?? '—',
      }),
      licenseHelper.accessor('document_reference', {
        header: t('workforce.documentReference'),
        cell: (i) => i.getValue() ?? '—',
      }),
    ] as ColumnDef<ProfessionalLicense>[],
    [t],
  );

  const credColumns = useMemo(
    () => [
      credHelper.accessor('credential_name', { header: t('workforce.credentialName') }),
      credHelper.accessor('credential_type', { header: t('workforce.credentialType') }),
      credHelper.accessor('mandatory', {
        header: t('workforce.mandatory'),
        cell: (i) => (i.getValue() ? t('app.yes') : t('app.no')),
      }),
      credHelper.accessor('status', {
        header: t('workforce.credentialStatus'),
        cell: (i) => <WorkforceStatusChip status={i.getValue()} />,
      }),
      credHelper.accessor('verification_status', { header: t('workforce.verificationState') }),
      credHelper.accessor('owner', {
        header: t('workforce.responsibleOwner'),
        cell: (i) => i.getValue() ?? '—',
      }),
      credHelper.accessor('document_reference', {
        header: t('workforce.documentReference'),
        cell: (i) => i.getValue() ?? '—',
      }),
      credHelper.accessor('expiry_date', {
        header: t('workforce.licenseExpiry'),
        cell: (i) => (i.getValue() ? dayjs(i.getValue()).format('DD MMM YYYY') : '—'),
      }),
    ] as ColumnDef<Credential>[],
    [t],
  );

  const auditColumns = useMemo(
    () => [
      auditHelper.accessor('occurred_at', {
        header: t('workforce.eventTime'),
        cell: (i) => dayjs(i.getValue()).format('DD MMM YYYY HH:mm'),
      }),
      auditHelper.accessor('event_type', { header: t('workforce.eventType') }),
      auditHelper.accessor('summary', { header: t('workforce.eventSummary') }),
      auditHelper.accessor('actor', {
        header: t('workforce.actor'),
        cell: (i) => i.getValue() ?? '—',
      }),
    ] as ColumnDef<WorkforceAuditEvent>[],
    [t],
  );

  if (!id) {
    return <ErrorState message={t('workforce.employeeNotFound')} />;
  }

  const categoryChart = (() => {
    const targets = targetsQuery.data?.data ?? [];
    const byCat = new Map<string, number[]>();
    for (const tg of targets) {
      if (tg.achievement_pct == null) continue;
      const list = byCat.get(tg.category) ?? [];
      list.push(tg.achievement_pct);
      byCat.set(tg.category, list);
    }
    const categories = [...byCat.keys()];
    return {
      chart_type: 'bar',
      categories,
      series: [
        {
          name: t('workforce.achievement'),
          data: categories.map((c) => {
            const vals = byCat.get(c) ?? [];
            return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
          }),
        },
      ],
    };
  })();

  return (
    <PilotWorkspace>
      <AnimatedSection>
        <PageIntroduction
          eyebrow={t('workforce.eyebrow')}
          title={emp?.full_name ?? t('workforce.title')}
          purpose={
            emp
              ? `${emp.job_title} · ${emp.department_name} · ${emp.facility_name}`
              : t('workforce.purpose')
          }
          context={
            emp ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`${t('workforce.employeeId')}: ${emp.employee_code}`} />
                <Chip size="small" label={emp.specialty_label} />
                {emp.manager_name ? <Chip size="small" label={`${t('workforce.manager')}: ${emp.manager_name}`} /> : null}
                <WorkforceStatusChip status={emp.employment_status} />
                <WorkforceStatusChip status={emp.performance_status} />
                <WorkforceStatusChip status={emp.credential_status} />
              </Stack>
            ) : undefined
          }
          actions={
            <Button
              component={RouterLink}
              to="/workforce"
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              size="small"
            >
              {t('workforce.backToWorkforce')}
            </Button>
          }
        />
      </AnimatedSection>

      {empQuery.isLoading ? (
        <LoadingSkeleton />
      ) : empQuery.isError || !emp ? (
        <ErrorState
          variant="inline"
          message={t('workforce.employeeNotFound')}
          onRetry={() => empQuery.refetch()}
        />
      ) : (
        <>
      {metricBand ? (
        <AnimatedSection delay={0.05}>
          <VitalSignsGrid kpis={[metricBand.primary, ...metricBand.supporting]} />
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={0.08}>
        <Box
          sx={{
            borderRadius: 3,
            bgcolor: brand.surface,
            border: `1px solid ${brand.border}`,
            px: { xs: 1, md: 2 },
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label={t('workforce.profileTabs')}
          >
            <Tab label={t('workforce.tabs.performance')} />
            <Tab label={t('workforce.tabs.targets')} />
            <Tab label={t('workforce.tabs.licenses')} />
            <Tab label={t('workforce.tabs.training')} />
            <Tab label={t('workforce.tabs.audit')} />
          </Tabs>
        </Box>
      </AnimatedSection>

      {tab === 0 && (
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
              title={t('workforce.charts.employeeTrend')}
              subtitle={t('workforce.charts.employeeTrendSubtitle')}
              height={layoutDensity.chartMain}
            >
              <EChart payload={trendQuery.data?.data} height={layoutDensity.chartMain} loading={trendQuery.isLoading} />
            </ChartSection>
            <ChartSection
              title={t('workforce.charts.byCategory')}
              subtitle={t('workforce.charts.byCategorySubtitle')}
              height={layoutDensity.chartMain}
            >
              <EChart payload={categoryChart} height={layoutDensity.chartMain} />
            </ChartSection>
          </Box>
          {summary?.previous_period_achievement_pct != null && summary.overall_achievement_pct != null ? (
            <Typography sx={{ ...typographySx('supporting'), color: brand.textSecondary, mt: 2 }}>
              {t('workforce.previousComparison', {
                current: summary.overall_achievement_pct.toFixed(1),
                previous: summary.previous_period_achievement_pct.toFixed(1),
              })}
            </Typography>
          ) : null}
        </AnimatedSection>
      )}

      {tab === 1 && (
        <AnimatedSection delay={0.1}>
          <DetailDataTable
            title={t('workforce.tabs.targets')}
            data={targetsQuery.data?.data ?? []}
            columns={targetColumns}
            loading={targetsQuery.isLoading}
            emptyMessage={t('workforce.emptyTargets')}
          />
        </AnimatedSection>
      )}

      {tab === 2 && (
        <AnimatedSection delay={0.1}>
          <DetailDataTable
            title={t('workforce.tabs.licenses')}
            data={licensesQuery.data?.data ?? []}
            columns={licenseColumns}
            loading={licensesQuery.isLoading}
            emptyMessage={t('workforce.emptyLicenses')}
          />
          <Typography sx={{ ...typographySx('metadata'), color: brand.textMuted, mt: 1.5 }}>
            {t('workforce.documentPrivacyNote')}
          </Typography>
        </AnimatedSection>
      )}

      {tab === 3 && (
        <AnimatedSection delay={0.1}>
          <DetailDataTable
            title={t('workforce.tabs.training')}
            data={credsQuery.data?.data ?? []}
            columns={credColumns}
            loading={credsQuery.isLoading}
            emptyMessage={t('workforce.emptyCredentials')}
          />
        </AnimatedSection>
      )}

      {tab === 4 && (
        <AnimatedSection delay={0.1}>
          <DetailDataTable
            title={t('workforce.tabs.audit')}
            data={auditQuery.data?.data ?? []}
            columns={auditColumns}
            loading={auditQuery.isLoading}
            emptyMessage={t('workforce.emptyAudit')}
          />
        </AnimatedSection>
      )}
        </>
      )}
    </PilotWorkspace>
  );
}
