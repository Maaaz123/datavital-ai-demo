import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircleIcon from '@mui/icons-material/Circle';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { fetchExecutiveSummary } from '@/api/executive';
import { fetchBedsSummary, fetchBedsStatus, fetchOperationalLists } from '@/api/beds';
import { fetchEmergencySummary, fetchEmergencyCurrentPatients } from '@/api/emergency';
import { fetchAlerts } from '@/api/alerts';
import { fetchSurgerySummary } from '@/api/surgery';
import { fetchLaboratorySummary } from '@/api/laboratory';
import { fetchRadiologySummary } from '@/api/radiology';
import { fetchFilterOptions } from '@/api/filters';
import { useFilterStore } from '@/store/filterStore';
import { CommandCenterMode } from '@/components/ux';
import { OpsMetricTile, OpsPanel, OpsBigValue, OpsRow } from '@/components/command-center/OpsPrimitives';
import { ops, opsStatusColor, type OpsStatus } from '@/components/command-center/opsTheme';
import AnimatedSection from '@/components/motion/AnimatedSection';
import { buildSituationFromKpis, mapAlertSeverity } from '@/utils/situationFromKpis';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { localizeKpiLabel, localizeDataLabel } from '@/i18n/localize';
import type { BedStatusItem, KPICardData } from '@/types/api';

const REFRESH_MS = 60_000;
const ROTATION_MS = 30_000;

function formatKpiValue(kpi: KPICardData): string {
  const unit = kpi.unit ? ` ${kpi.unit}` : '';
  if (kpi.format === 'percent' && typeof kpi.value === 'number') {
    return `${kpi.value.toFixed(1)}%`;
  }
  if (typeof kpi.value === 'number') {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(kpi.value) + unit;
  }
  return `${kpi.value}${unit}`;
}

function findKpi(kpis: KPICardData[] | undefined, ...keys: string[]): KPICardData | undefined {
  if (!kpis) return undefined;
  for (const key of keys) {
    const match = kpis.find((k) => k.key.toLowerCase().includes(key.toLowerCase()));
    if (match) return match;
  }
  return undefined;
}

function kpiTone(kpi?: KPICardData): OpsStatus {
  const s = kpi?.severity;
  if (s === 'healthy' || s === 'warning' || s === 'critical' || s === 'info') return s;
  return 'neutral';
}

function bedTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('occup') || s.includes('in_use') || s.includes('busy')) return ops.critical;
  if (s.includes('clean') || s.includes('dirty') || s.includes('turnover')) return ops.warning;
  if (s.includes('avail') || s.includes('empty') || s.includes('ready')) return ops.healthy;
  return ops.info;
}

function MiniBedBoard({ beds }: { beds: BedStatusItem[] }) {
  const { t, i18n } = useTranslation();
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    beds.forEach((b) => {
      const key = b.bed_status || 'Unknown';
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [beds]);

  const preview = beds.slice(0, 72);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {Object.entries(counts).map(([status, count]) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircleIcon sx={{ fontSize: 10, color: bedTone(status) }} />
            <Typography sx={{ fontSize: 11, color: ops.textMuted }}>
              {localizeDataLabel(status, t, i18n.language)}:{' '}
              <Box component="span" sx={{ color: ops.text, fontWeight: 700 }}>{count}</Box>
            </Typography>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(10px, 1fr))',
          gap: '3px',
          maxHeight: 88,
          overflow: 'hidden',
        }}
        aria-label={t('commandCenter.panels.bedBoard')}
      >
        {preview.map((bed) => (
          <Tooltip
            key={bed.bed_key}
            title={`${bed.bed_code} · ${localizeDataLabel(bed.bed_status, t, i18n.language)}${bed.ward_name ? ` · ${localizeDataLabel(bed.ward_name, t, i18n.language)}` : ''}`}
          >
            <Box
              sx={{
                width: '100%',
                aspectRatio: '1',
                bgcolor: bedTone(bed.bed_status),
                opacity: 0.9,
                borderRadius: '1px',
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Dense operations wall — distinct from standard dashboards.
 * Status rail → Emergency / Beds / Alerts → Surgery / Lab / Radiology / Flow → Bed board.
 */
export default function CommandCenterPage() {
  const { t, i18n } = useTranslation();
  const { useCommandCenterPriority } = useResponsiveLayout();
  const filters = useFilterStore((s) => s.filters);
  const markRefreshed = useFilterStore((s) => s.markRefreshed);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(true);
  const [clock, setClock] = useState(() => dayjs().format('HH:mm:ss'));

  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const hospitals = useMemo(() => filterOptions?.hospitals ?? [], [filterOptions?.hospitals]);
  const canRotate = hospitals.length > 1 && !filters.hospital_key;

  useEffect(() => {
    const timer = setInterval(() => setClock(dayjs().format('HH:mm:ss')), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!rotationEnabled || !canRotate) return;
    const timer = setInterval(() => {
      setRotationIndex((i) => (i + 1) % hospitals.length);
    }, ROTATION_MS);
    return () => clearInterval(timer);
  }, [rotationEnabled, canRotate, hospitals.length]);

  const effectiveFilters = useMemo(() => {
    if (filters.hospital_key) return filters;
    if (rotationEnabled && canRotate) {
      return { ...filters, hospital_key: hospitals[rotationIndex]?.hospital_key };
    }
    return filters;
  }, [filters, rotationEnabled, canRotate, hospitals, rotationIndex]);

  const currentHospitalName = useMemo(() => {
    if (filters.hospital_key) {
      const name = hospitals.find((h) => h.hospital_key === filters.hospital_key)?.hospital_name;
      return name ? localizeDataLabel(name, t, i18n.language) : undefined;
    }
    if (rotationEnabled && canRotate) {
      const name = hospitals[rotationIndex]?.hospital_name;
      return name ? localizeDataLabel(name, t, i18n.language) : undefined;
    }
    return t('context.allHospitals');
  }, [filters.hospital_key, hospitals, rotationEnabled, canRotate, rotationIndex, t, i18n.language]);

  const queryOpts = { refetchInterval: REFRESH_MS };

  const executiveQuery = useQuery({
    queryKey: ['command-center-executive', effectiveFilters],
    queryFn: () => fetchExecutiveSummary(effectiveFilters),
    ...queryOpts,
  });
  const bedsSummaryQuery = useQuery({
    queryKey: ['command-center-beds-summary', effectiveFilters],
    queryFn: () => fetchBedsSummary(effectiveFilters),
    ...queryOpts,
  });
  const bedsStatusQuery = useQuery({
    queryKey: ['command-center-beds-status', effectiveFilters],
    queryFn: () => fetchBedsStatus(effectiveFilters),
    ...queryOpts,
  });
  const operationalQuery = useQuery({
    queryKey: ['command-center-operational', effectiveFilters],
    queryFn: () => fetchOperationalLists(effectiveFilters),
    ...queryOpts,
  });
  const emergencyQuery = useQuery({
    queryKey: ['command-center-emergency', effectiveFilters],
    queryFn: () => fetchEmergencySummary(effectiveFilters),
    ...queryOpts,
  });
  const edPatientsQuery = useQuery({
    queryKey: ['command-center-ed-patients', effectiveFilters],
    queryFn: () => fetchEmergencyCurrentPatients(effectiveFilters),
    ...queryOpts,
  });
  const alertsQuery = useQuery({
    queryKey: ['command-center-alerts', effectiveFilters],
    queryFn: () => fetchAlerts(effectiveFilters, { status: 'open', severity: 'critical' }),
    ...queryOpts,
  });
  const surgeryQuery = useQuery({
    queryKey: ['command-center-surgery', effectiveFilters],
    queryFn: () => fetchSurgerySummary(effectiveFilters),
    ...queryOpts,
    retry: false,
  });
  const labQuery = useQuery({
    queryKey: ['command-center-lab', effectiveFilters],
    queryFn: () => fetchLaboratorySummary(effectiveFilters),
    ...queryOpts,
    retry: false,
  });
  const radiologyQuery = useQuery({
    queryKey: ['command-center-radiology', effectiveFilters],
    queryFn: () => fetchRadiologySummary(effectiveFilters),
    ...queryOpts,
    retry: false,
  });

  useEffect(() => {
    if (executiveQuery.data?.generated_at) markRefreshed();
  }, [executiveQuery.data?.generated_at, markRefreshed]);

  const executiveKpis = useMemo(() => executiveQuery.data?.data ?? [], [executiveQuery.data?.data]);
  const bedsKpis = bedsSummaryQuery.data?.data ?? [];
  const emergencyKpis = emergencyQuery.data?.data ?? [];
  const surgeryKpis = surgeryQuery.isSuccess ? surgeryQuery.data?.data ?? [] : [];
  const labKpis = labQuery.isSuccess ? labQuery.data?.data ?? [] : [];
  const radKpis = radiologyQuery.isSuccess ? radiologyQuery.data?.data ?? [] : [];

  const situation = useMemo(
    () => buildSituationFromKpis(executiveKpis, { domain: 'operations', locale: i18n.language }),
    [executiveKpis, i18n.language],
  );

  const occupancyKpi = findKpi(bedsKpis, 'occupancy');
  const availableKpi = findKpi(bedsKpis, 'available');
  const occupiedKpi = findKpi(bedsKpis, 'occupied');
  const icuKpi = findKpi(bedsKpis, 'icu');
  const edWaitKpi = findKpi(emergencyKpis, 'wait', 'door');
  const edCrowdingKpi = findKpi(emergencyKpis, 'crowd', 'volume', 'visit');
  const edBoardingKpi = findKpi(emergencyKpis, 'board');
  const surgeryKpi = findKpi(surgeryKpis, 'case', 'schedule', 'util');
  const cancelKpi = findKpi(surgeryKpis, 'cancel');
  const criticalLabKpi = findKpi(labKpis, 'critical');
  const tatLabKpi = findKpi(labKpis, 'tat', 'turnaround', 'pending');
  const pendingRadKpi = findKpi(radKpis, 'pending');
  const reportTatKpi = findKpi(radKpis, 'tat', 'report', 'turnaround');

  const awaitingCount = operationalQuery.data?.awaiting_admission?.length ?? 0;
  const cleaningCount = operationalQuery.data?.awaiting_cleaning?.length ?? 0;
  const transferCount = operationalQuery.data?.awaiting_transfer?.length ?? 0;
  const dischargeCount = operationalQuery.data?.expected_discharges?.length ?? 0;
  const edPatientCount = edPatientsQuery.data?.length ?? 0;
  const openCriticalAlerts = (alertsQuery.data?.data ?? []).slice(0, 10);
  const beds = bedsStatusQuery.data?.data ?? [];

  const overallTone: OpsStatus =
    openCriticalAlerts.length > 3 || awaitingCount > 15
      ? 'critical'
      : openCriticalAlerts.length > 0 || awaitingCount > 5 || (occupancyKpi && Number(occupancyKpi.value) >= 90)
        ? 'warning'
        : 'healthy';

  const refreshAll = () => {
    executiveQuery.refetch();
    bedsSummaryQuery.refetch();
    bedsStatusQuery.refetch();
    operationalQuery.refetch();
    emergencyQuery.refetch();
    alertsQuery.refetch();
    surgeryQuery.refetch();
    labQuery.refetch();
    radiologyQuery.refetch();
  };

  const rail = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(4, minmax(0, 1fr))',
          lg: 'repeat(8, minmax(0, 1fr))',
        },
        gap: '1px',
        bgcolor: ops.border,
        border: `1px solid ${ops.border}`,
        mb: 1.25,
      }}
    >
      <OpsMetricTile
        label={t('commandCenter.panels.hospitalStatus')}
        value={overallTone === 'critical' ? t('alerts.severity.critical') : overallTone === 'warning' ? t('alerts.severity.warning') : t('alerts.severity.healthy')}
        status={overallTone}
        loading={executiveQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.bedOccupancy')}
        value={occupancyKpi ? formatKpiValue(occupancyKpi) : '—'}
        hint={icuKpi ? `ICU ${formatKpiValue(icuKpi)}` : undefined}
        status={kpiTone(occupancyKpi)}
        loading={bedsSummaryQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.edCrowding')}
        value={edCrowdingKpi ? formatKpiValue(edCrowdingKpi) : edPatientCount}
        hint={edWaitKpi ? formatKpiValue(edWaitKpi) : undefined}
        status={kpiTone(edWaitKpi ?? edCrowdingKpi)}
        loading={emergencyQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.awaitingBeds')}
        value={awaitingCount}
        status={awaitingCount > 10 ? 'critical' : awaitingCount > 5 ? 'warning' : 'healthy'}
        loading={operationalQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.expectedDischarges')}
        value={dischargeCount}
        status="info"
        loading={operationalQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.surgery')}
        value={surgeryKpi ? formatKpiValue(surgeryKpi) : '—'}
        status={kpiTone(surgeryKpi)}
        loading={surgeryQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.criticalLab')}
        value={criticalLabKpi ? formatKpiValue(criticalLabKpi) : '—'}
        status={kpiTone(criticalLabKpi)}
        loading={labQuery.isLoading}
      />
      <OpsMetricTile
        label={t('commandCenter.panels.criticalAlerts')}
        value={openCriticalAlerts.length}
        status={openCriticalAlerts.length > 0 ? 'critical' : 'healthy'}
        loading={alertsQuery.isLoading}
      />
    </Box>
  );

  const mainGrid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: useCommandCenterPriority ? '1fr' : 'repeat(12, minmax(0, 1fr))',
        },
        gap: 1,
        alignItems: 'start',
      }}
    >
      {/* Emergency */}
      <OpsPanel
        title={t('commandCenter.panels.emergency', { defaultValue: 'Emergency' })}
        span={useCommandCenterPriority ? undefined : 4}
        loading={emergencyQuery.isLoading}
        badge={
          <Typography sx={{ fontSize: 10, color: opsStatusColor(kpiTone(edWaitKpi)), fontWeight: 700 }}>
            LIVE
          </Typography>
        }
      >
        <OpsBigValue
          value={edPatientCount}
          label={t('emergency.currentPatients', { defaultValue: 'Current census' })}
          status={edPatientCount > 40 ? 'warning' : 'info'}
        />
        <Box sx={{ mt: 1.25 }}>
          <OpsRow
            label={edWaitKpi ? localizeKpiLabel(edWaitKpi, t) : t('commandCenter.waitingTime', { defaultValue: 'Waiting time' })}
            value={edWaitKpi ? formatKpiValue(edWaitKpi) : '—'}
            tone={kpiTone(edWaitKpi)}
          />
          <OpsRow
            label={edCrowdingKpi ? localizeKpiLabel(edCrowdingKpi, t) : t('commandCenter.panels.edCrowding')}
            value={edCrowdingKpi ? formatKpiValue(edCrowdingKpi) : '—'}
            tone={kpiTone(edCrowdingKpi)}
          />
          <OpsRow
            label={edBoardingKpi ? localizeKpiLabel(edBoardingKpi, t) : t('commandCenter.boarding', { defaultValue: 'Boarding' })}
            value={edBoardingKpi ? formatKpiValue(edBoardingKpi) : '—'}
          />
        </Box>
      </OpsPanel>

      {/* Beds / ICU */}
      <OpsPanel
        title={t('commandCenter.panels.bedsIcu', { defaultValue: 'Beds & ICU capacity' })}
        span={useCommandCenterPriority ? undefined : 4}
        loading={bedsSummaryQuery.isLoading}
      >
        <OpsBigValue
          value={occupancyKpi ? formatKpiValue(occupancyKpi) : '—'}
          label={t('commandCenter.panels.bedOccupancy')}
          status={kpiTone(occupancyKpi)}
        />
        <Box sx={{ mt: 1.25 }}>
          <OpsRow label={availableKpi ? localizeKpiLabel(availableKpi, t) : t('data.labels.Available')} value={availableKpi ? formatKpiValue(availableKpi) : '—'} tone="healthy" />
          <OpsRow label={occupiedKpi ? localizeKpiLabel(occupiedKpi, t) : t('data.labels.Occupied')} value={occupiedKpi ? formatKpiValue(occupiedKpi) : '—'} />
          <OpsRow label={icuKpi ? localizeKpiLabel(icuKpi, t) : t('data.labels.ICU')} value={icuKpi ? formatKpiValue(icuKpi) : '—'} tone={kpiTone(icuKpi)} />
          <OpsRow
            label={t('beds.awaitingCleaning', { defaultValue: 'Awaiting cleaning' })}
            value={cleaningCount}
            tone={cleaningCount > 8 ? 'warning' : 'neutral'}
          />
        </Box>
      </OpsPanel>

      {/* Critical alerts — full operational feed */}
      <OpsPanel
        title={t('commandCenter.panels.criticalAlerts')}
        span={useCommandCenterPriority ? undefined : 4}
        loading={alertsQuery.isLoading}
        badge={
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: openCriticalAlerts.length ? ops.critical : ops.healthy }}>
            {openCriticalAlerts.length}
          </Typography>
        }
      >
        <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
        {openCriticalAlerts.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: ops.textMuted }}>{t('app.noData')}</Typography>
        ) : (
          <Stack spacing={0.75}>
            {openCriticalAlerts.map((alert) => (
              <Box
                key={alert.alert_id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                  py: 0.5,
                  borderBottom: `1px solid ${ops.border}`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: opsStatusColor(mapAlertSeverity(alert.severity)),
                    mt: 0.7,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 12.5, color: ops.text, lineHeight: 1.35, fontWeight: 600 }}>
                    {alert.message}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: ops.textDim }}>
                    {[
                      alert.hospital_name ? localizeDataLabel(alert.hospital_name, t, i18n.language) : null,
                      alert.domain ? localizeDataLabel(String(alert.domain), t, i18n.language) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        </Box>
      </OpsPanel>

      {/* Surgery */}
      <OpsPanel title={t('commandCenter.panels.surgery')} span={useCommandCenterPriority ? undefined : 3} loading={surgeryQuery.isLoading}>
        <OpsBigValue value={surgeryKpi ? formatKpiValue(surgeryKpi) : '—'} status={kpiTone(surgeryKpi)} />
        <Box sx={{ mt: 1 }}>
          <OpsRow label={cancelKpi ? localizeKpiLabel(cancelKpi, t) : t('commandCenter.cancelled', { defaultValue: 'Cancelled' })} value={cancelKpi ? formatKpiValue(cancelKpi) : '—'} tone={kpiTone(cancelKpi)} />
        </Box>
      </OpsPanel>

      {/* Laboratory */}
      <OpsPanel title={t('commandCenter.panels.criticalLab')} span={useCommandCenterPriority ? undefined : 3} loading={labQuery.isLoading}>
        <OpsBigValue value={criticalLabKpi ? formatKpiValue(criticalLabKpi) : '—'} status={kpiTone(criticalLabKpi)} />
        <Box sx={{ mt: 1 }}>
          <OpsRow label={tatLabKpi ? localizeKpiLabel(tatLabKpi, t) : t('data.labels.TAT / pending')} value={tatLabKpi ? formatKpiValue(tatLabKpi) : '—'} />
        </Box>
      </OpsPanel>

      {/* Radiology */}
      <OpsPanel
        title={t('commandCenter.panels.radiology', { defaultValue: 'Radiology delays' })}
        span={useCommandCenterPriority ? undefined : 3}
        loading={radiologyQuery.isLoading}
      >
        <OpsBigValue value={pendingRadKpi ? formatKpiValue(pendingRadKpi) : '—'} status={kpiTone(pendingRadKpi)} />
        <Box sx={{ mt: 1 }}>
          <OpsRow label={reportTatKpi ? localizeKpiLabel(reportTatKpi, t) : t('data.labels.Report TAT')} value={reportTatKpi ? formatKpiValue(reportTatKpi) : '—'} />
        </Box>
      </OpsPanel>

      {/* Patient flow bottlenecks */}
      <OpsPanel
        title={t('commandCenter.panels.flow', { defaultValue: 'Patient-flow bottlenecks' })}
        span={useCommandCenterPriority ? undefined : 3}
        loading={operationalQuery.isLoading}
      >
        <OpsRow label={t('beds.awaitingAdmission')} value={awaitingCount} tone={awaitingCount > 10 ? 'critical' : awaitingCount > 5 ? 'warning' : 'healthy'} />
        <OpsRow label={t('beds.awaitingTransfer', { defaultValue: 'Awaiting transfer' })} value={transferCount} tone={transferCount > 5 ? 'warning' : 'neutral'} />
        <OpsRow label={t('beds.awaitingCleaning', { defaultValue: 'Awaiting cleaning' })} value={cleaningCount} tone={cleaningCount > 8 ? 'warning' : 'neutral'} />
        <OpsRow label={t('beds.expectedDischarges')} value={dischargeCount} tone="info" />
      </OpsPanel>

      {/* Bed board preview */}
      <OpsPanel
        title={t('commandCenter.panels.bedBoard')}
        span={useCommandCenterPriority ? undefined : 8}
        loading={bedsStatusQuery.isLoading}
      >
        <MiniBedBoard beds={beds} />
      </OpsPanel>

      <OpsPanel
        title={t('commandCenter.panels.awaitingBeds')}
        span={useCommandCenterPriority ? undefined : 4}
        loading={operationalQuery.isLoading}
      >
        {(operationalQuery.data?.awaiting_admission ?? []).slice(0, 6).length === 0 ? (
          <Typography sx={{ fontSize: 13, color: ops.textMuted }}>—</Typography>
        ) : (
          <Stack spacing={0.5}>
            {(operationalQuery.data?.awaiting_admission ?? []).slice(0, 6).map((row, idx) => (
              <OpsRow
                key={idx}
                label={String(row.patient_name ?? row.mrn ?? row.encounter_id ?? `#${idx + 1}`)}
                value={String(row.waiting_hours != null ? `${row.waiting_hours}h` : row.request_type ?? '—')}
                tone={Number(row.waiting_hours) > 6 ? 'critical' : Number(row.waiting_hours) > 3 ? 'warning' : 'neutral'}
              />
            ))}
          </Stack>
        )}
      </OpsPanel>
    </Box>
  );

  return (
    <CommandCenterMode enabled={fullscreen} onToggle={setFullscreen}>
      <Box sx={{ maxWidth: '100%', pr: { xs: 4, md: 5 } }} data-testid="ops-command-wall">
        <AnimatedSection>
        {/* Ops header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            mb: 1.25,
            pb: 1,
            borderBottom: `1px solid ${ops.border}`,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
              <Typography sx={{ fontSize: { xs: 16, md: 18 }, fontWeight: 750, color: ops.text, letterSpacing: 0.02 }}>
                {t('commandCenter.title')}
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 0.75,
                  py: 0.25,
                  border: `1px solid ${opsStatusColor(overallTone)}`,
                  color: opsStatusColor(overallTone),
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.08,
                }}
              >
                <CircleIcon sx={{ fontSize: 8 }} />
                {i18n.language.toLowerCase().startsWith('ar') ? 'مباشر' : 'LIVE'}
              </Box>
              <Typography sx={{ fontSize: 12, color: ops.textMuted, fontVariantNumeric: 'tabular-nums' }}>{clock}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: ops.textDim, mt: 0.25 }}>
              {t('commandCenter.currentHospital')}: <Box component="span" sx={{ color: ops.text, fontWeight: 600 }}>{currentHospitalName}</Box>
              {executiveQuery.data?.generated_at && (
                <> · {dayjs(executiveQuery.data.generated_at).format('HH:mm')}</>
              )}
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            {canRotate && (
              <FormControlLabel
                control={
                  <Switch
                    checked={rotationEnabled}
                    onChange={(e) => setRotationEnabled(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: ops.teal },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ops.teal },
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: 12, color: ops.textMuted }}>{t('commandCenter.rotation')}</Typography>}
                sx={{ m: 0 }}
              />
            )}
            <Tooltip title={t('app.refresh')}>
              <IconButton
                size="small"
                onClick={refreshAll}
                sx={{ color: ops.text, border: `1px solid ${ops.border}`, borderRadius: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        </AnimatedSection>

        {/* One-line situation — never an empty hero */}
        {situation && (
          <AnimatedSection delay={0.06}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.25,
              py: 0.85,
              mb: 1.25,
              bgcolor: ops.bgElevated,
              border: `1px solid ${ops.border}`,
              borderLeft: `3px solid ${opsStatusColor(situation.severity)}`,
            }}
          >
            <Typography sx={{ fontSize: 13, color: ops.text, lineHeight: 1.4 }}>
              {situation.text}
            </Typography>
          </Box>
          </AnimatedSection>
        )}

        <AnimatedSection delay={0.1}>{rail}</AnimatedSection>
        <AnimatedSection delay={0.16}>{mainGrid}</AnimatedSection>
      </Box>
    </CommandCenterMode>
  );
}
