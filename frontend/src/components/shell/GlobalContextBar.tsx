import type { ReactNode, ReactElement } from 'react';
import { Box, Chip, Stack, Typography, Tooltip } from '@mui/material';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { fetchAvailableYears, fetchFilterOptions } from '@/api/filters';
import { fetchDataQualitySummary } from '@/api/dataQuality';
import { useFilterStore } from '@/store/filterStore';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useHasPermission } from '@/hooks/usePermission';
import { cssVar, cssVarNames } from '@/design-system/colors';
import { layoutDensity } from '@/design-system/layout';
import YearSelector from '@/components/shell/YearSelector';
import { resolveClientYearWindow } from '@/utils/yearWindow';

function ContextChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Tooltip title={`${label}: ${value}`}>
      <Chip
        size="small"
        variant="outlined"
        icon={icon as ReactElement}
        label={
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 600 }} noWrap>
            {value}
          </Typography>
        }
        sx={{
          height: 24,
          borderColor: cssVar(cssVarNames.border),
          bgcolor: 'transparent',
          '& .MuiChip-icon': { ml: 0.5, fontSize: 14 },
          '& .MuiChip-label': { px: 0.75 },
          maxWidth: 200,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

function Sep() {
  return (
    <Typography
      component="span"
      sx={{ color: 'text.disabled', fontSize: 12, mx: 0.5, userSelect: 'none', flexShrink: 0 }}
      aria-hidden
    >
      ·
    </Typography>
  );
}

export default function GlobalContextBar() {
  const { t } = useTranslation();
  const { isMobile } = useResponsiveLayout();
  const filters = useFilterStore((s) => s.filters);
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const { data: yearsMeta } = useQuery({
    queryKey: ['filter-years', filters.hospital_key],
    queryFn: () => fetchAvailableYears({ hospital_key: filters.hospital_key }),
    staleTime: 5 * 60 * 1000,
  });

  const canViewDq = useHasPermission('dashboard.data_quality');
  const dqQuery = useQuery({
    queryKey: ['context-dq', filters.hospital_key, filters.year],
    queryFn: () => fetchDataQualitySummary(filters),
    staleTime: 60_000,
    enabled: canViewDq,
  });

  const orgName =
    options?.organizations.find((o) => o.organization_key === filters.organization_key)?.organization_name ??
    t('context.allOrganizations');
  const hospitalName =
    options?.hospitals.find((h) => h.hospital_key === filters.hospital_key)?.hospital_name ??
    t('context.allHospitals');
  const facilityName =
    options?.facilities.find((f) => f.facility_key === filters.facility_key)?.facility_name ??
    t('context.allFacilities');

  const year = filters.year ?? yearsMeta?.default_year ?? dayjs().year();
  const yearWindow = resolveClientYearWindow(year);
  const periodLabel = yearWindow.is_current_year ? `${year} YTD` : String(year);
  const dateRange =
    filters.date_from && filters.date_to
      ? `${dayjs(filters.date_from).format('DD MMM')} – ${dayjs(filters.date_to).format('DD MMM YYYY')}`
      : periodLabel;

  const dataAsOf = yearsMeta?.latest_available_data_at
    ? dayjs(yearsMeta.latest_available_data_at).format('DD MMM YYYY HH:mm')
    : null;

  const comparisonFrom = filters.date_from
    ? dayjs(filters.date_from)
        .subtract(1, 'year')
        .format('DD MMM')
    : '—';
  const comparisonTo = filters.date_to
    ? dayjs(filters.date_to).subtract(1, 'year').format('DD MMM YYYY')
    : '—';

  const dqKpis = dqQuery.data?.data ?? [];
  const scoreKpi = dqKpis.find((k) => k.key === 'quality_score');
  const totalChecks = dqKpis.find((k) => k.key === 'total_checks');
  const passedChecks = dqKpis.find((k) => k.key === 'passed_checks');

  let dqLabel = t('context.dqUnknown');
  if (totalChecks && passedChecks && Number(totalChecks.value) > 0) {
    const pct = (Number(passedChecks.value) / Number(totalChecks.value)) * 100;
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      dqLabel = `${pct.toFixed(1)}%`;
    }
  } else if (scoreKpi) {
    const n = Number(scoreKpi.value);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      dqLabel = `${n.toFixed(1)}${scoreKpi.unit === '%' || !scoreKpi.unit ? '%' : scoreKpi.unit}`;
    }
  } else if (dqQuery.isLoading) {
    dqLabel = '…';
  }

  const lastRefresh = lastRefreshAt ? dayjs(lastRefreshAt).format('HH:mm:ss') : t('context.notYet');

  const desktopTooltip = [
    `${t('app.organization')}: ${orgName}`,
    `${t('app.facility')}: ${facilityName}`,
    `${t('app.year', { defaultValue: 'Year' })}: ${periodLabel}`,
    `${t('context.comparisonPeriod')}: ${comparisonFrom} – ${comparisonTo}`,
    dataAsOf ? `Data as of ${dataAsOf}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const desktopRow = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        fontSize: 12,
        lineHeight: 1,
        minWidth: 0,
        gap: 1,
        width: '100%',
      }}
    >
      <YearSelector compact />
      <Tooltip title={<Box component="span" sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{desktopTooltip}</Box>}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            overflow: 'hidden',
            fontSize: 12,
            lineHeight: 1,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 600 }} noWrap>
            {hospitalName}
          </Typography>
          <Sep />
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
            {periodLabel}
          </Typography>
          <Sep />
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
            {dateRange}
          </Typography>
          {dataAsOf ? (
            <>
              <Sep />
              <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                Data as of {dataAsOf}
              </Typography>
            </>
          ) : null}
          <Sep />
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
            {t('app.lastRefresh')}: {lastRefresh}
          </Typography>
          <Sep />
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
            {t('context.dataQuality')}: {dqLabel}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );

  const mobileChips = (
    <>
      <YearSelector compact />
      <ContextChip icon={<LocalHospitalOutlinedIcon />} label={t('app.hospital')} value={hospitalName} />
      <ContextChip icon={<DateRangeOutlinedIcon />} label={t('context.dateRange')} value={periodLabel} />
      <ContextChip icon={<UpdateOutlinedIcon />} label={t('app.lastRefresh')} value={lastRefresh} />
      <ContextChip icon={<VerifiedOutlinedIcon />} label={t('context.dataQuality')} value={dqLabel} />
    </>
  );

  return (
    <Box
      role="region"
      aria-label={t('context.ariaLabel')}
      data-testid="global-context-bar"
      sx={{
        px: { xs: 1.5, md: 2 },
        py: 0.75,
        minHeight: layoutDensity.contextBarHeight,
        borderBottom: `1px solid ${cssVar(cssVarNames.border)}`,
        bgcolor: cssVar(cssVarNames.bgPaper),
        // Do not clip the Year selector; allow horizontal scroll on narrow viewports.
        overflowX: 'auto',
        overflowY: 'visible',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {isMobile ? (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            flexWrap: 'nowrap',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            alignItems: 'center',
            width: '100%',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {mobileChips}
        </Stack>
      ) : (
        desktopRow
      )}
    </Box>
  );
}
