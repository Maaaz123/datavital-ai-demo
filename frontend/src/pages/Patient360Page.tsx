/* eslint-disable @typescript-eslint/no-explicit-any -- TanStack ColumnDef value generics */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import KpiGrid from '@/components/dashboard/KpiGrid';
import DetailDataTable from '@/components/dashboard/DetailDataTable';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/ux';
import { useFilterStore } from '@/store/filterStore';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import { fetchPatient360, fetchPatientTimeline } from '@/api/patients';
import type { KPICardData, TimelineEvent } from '@/types/api';
import { formatDate, formatDateTime, formatCurrency, fallback } from '@/utils/format';
import { localizeDataLabel } from '@/i18n/localize';

const columnHelper = createColumnHelper<TimelineEvent>();

const touchSx = { minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN };
const accordionSummarySx = { minHeight: TOUCH_TARGET_MIN, '& .MuiAccordionSummary-content': { my: 1 } };

export default function Patient360Page() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patientId } = useParams<{ patientId: string }>();
  const filters = useFilterStore((s) => s.filters);
  const { isMobile } = useResponsiveLayout();
  const [tab, setTab] = useState(0);

  const timelineColumns = useMemo<ColumnDef<TimelineEvent, any>[]>(
    () => [
      columnHelper.accessor('event_ts', {
        header: t('data.columns.dateTime'),
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor('event_type', {
        header: t('data.columns.type'),
        cell: (info) => <Chip size="small" label={fallback(info.getValue())} />,
      }),
      columnHelper.accessor('event_subtype', {
        header: t('data.columns.detail'),
        cell: (info) => fallback(info.getValue()),
      }),
      columnHelper.accessor('event_status', {
        header: t('data.columns.status'),
        cell: (info) => fallback(info.getValue()),
      }),
      columnHelper.accessor('hospital_name', {
        header: t('data.columns.hospital'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
      columnHelper.accessor('department_name', {
        header: t('data.columns.department'),
        cell: (info) => localizeDataLabel(String(info.getValue() ?? ''), t, i18n.language),
      }),
    ],
    [t, i18n.language],
  );
  const [expanded, setExpanded] = useState<string | false>('priority');

  const id = Number(patientId);

  const profileQuery = useQuery({
    queryKey: ['patient-360', id, filters],
    queryFn: () => fetchPatient360(id, filters),
    enabled: Number.isFinite(id),
  });

  const timelineQuery = useQuery({
    queryKey: ['patient-timeline', id, filters],
    queryFn: () => fetchPatientTimeline(id, filters),
    enabled: Number.isFinite(id),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'patient-360' || q.queryKey[0] === 'patient-timeline' });
  };

  const timeline = useMemo(() => timelineQuery.data ?? [], [timelineQuery.data]);
  const encounters = useMemo(() => timeline.filter((e) => e.event_type === 'encounter'), [timeline]);
  const labs = useMemo(() => timeline.filter((e) => e.event_type === 'laboratory'), [timeline]);
  const meds = useMemo(() => timeline.filter((e) => e.event_type === 'medication'), [timeline]);

  const patient = profileQuery.data;
  const kpis: KPICardData[] = useMemo(() => {
    if (!patient) return [];
    return [
      { key: 'total_encounters', label: t('patient360.kpi.totalEncounters'), value: patient.total_encounters ?? 0 },
      { key: 'emergency_encounters', label: t('patient360.kpi.emergencyEncounters'), value: patient.emergency_encounters ?? 0 },
      { key: 'inpatient_encounters', label: t('patient360.kpi.inpatientEncounters'), value: patient.inpatient_encounters ?? 0 },
      { key: 'outpatient_encounters', label: t('patient360.kpi.outpatientEncounters'), value: patient.outpatient_encounters ?? 0 },
      { key: 'distinct_diagnoses', label: t('patient360.kpi.distinctDiagnoses'), value: patient.distinct_diagnoses ?? 0 },
      { key: 'total_claims', label: t('patient360.kpi.totalClaims'), value: patient.total_claims ?? 0 },
      {
        key: 'lifetime_net_revenue',
        label: t('patient360.kpi.lifetimeRevenue'),
        value: patient.lifetime_net_revenue ?? 0,
        format: 'currency',
        unit: 'SAR',
      },
      {
        key: 'chronic',
        label: t('patient360.kpi.chronicStatus'),
        value: patient.has_chronic_condition ? t('patient360.yes') : t('patient360.no'),
        severity: patient.has_chronic_condition ? 'warning' : 'healthy',
      },
    ];
  }, [patient, t]);

  const priorityKpis = useMemo(() => {
    if (!patient) return [];
    const items: KPICardData[] = [];
    if (patient.is_high_utilizer) {
      items.push({
        key: 'high_utilizer',
        label: t('patient360.highUtilizer'),
        value: t('patient360.yes'),
        severity: 'critical',
      });
    }
    if (patient.has_chronic_condition) {
      items.push({
        key: 'chronic',
        label: t('patient360.chronic'),
        value: t('patient360.yes'),
        severity: 'warning',
      });
    }
    if ((patient.emergency_encounters ?? 0) > 0) {
      items.push({
        key: 'emergency_encounters',
        label: t('patient360.kpi.emergencyEncounters'),
        value: patient.emergency_encounters ?? 0,
        severity: 'warning',
      });
    }
    if ((patient.inpatient_encounters ?? 0) > 0) {
      items.push({
        key: 'inpatient_encounters',
        label: t('patient360.kpi.inpatientEncounters'),
        value: patient.inpatient_encounters ?? 0,
      });
    }
    return items;
  }, [patient, t]);

  const demographicsCard = patient ? (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {t('patient360.demographics')}
        </Typography>
        <Stack spacing={0.5}>
          <Typography variant="body2">{t('patient360.nationality')}: {fallback(patient.nationality)}</Typography>
          <Typography variant="body2">{t('patient360.bloodGroup')}: {fallback(patient.blood_group)}</Typography>
          <Typography variant="body2">
            {t('patient360.firstEncounter')}: {formatDate(patient.first_encounter_at)}
          </Typography>
          <Typography variant="body2">
            {t('patient360.lastEncounter')}: {formatDate(patient.last_encounter_at)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  ) : null;

  const utilizationCard = patient ? (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {t('patient360.utilization')}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {patient.has_chronic_condition && <Chip color="warning" label={t('patient360.chronic')} />}
          {patient.is_high_utilizer && <Chip color="error" label={t('patient360.highUtilizer')} />}
          {!patient.has_chronic_condition && !patient.is_high_utilizer && (
            <Chip color="success" label={t('patient360.standard')} />
          )}
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t('patient360.lifetimeRevenue')}: {formatCurrency(patient.lifetime_net_revenue)}
        </Typography>
      </CardContent>
    </Card>
  ) : null;

  if (!Number.isFinite(id)) {
    return <ErrorState message={t('patient360.invalidId')} />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          py: 1,
          mb: 2,
          borderBottom: '1px solid var(--hap-border)',
        }}
      >
        <Tooltip title={t('patient360.back')}>
          <IconButton onClick={() => navigate('/patients')} sx={touchSx}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} noWrap>
            {profileQuery.isLoading ? t('app.noData') : patient?.full_name ?? t('patient360.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {t('patient360.mrn')}: {fallback(patient?.mrn)} · {t('patient360.dob')}: {formatDate(patient?.date_of_birth)} ·{' '}
            {fallback(patient?.gender)} · {fallback(patient?.age_group)}
          </Typography>
        </Box>
        {patient?.is_high_utilizer && (
          <StatusBadge status="critical" label={t('patient360.highUtilizer')} />
        )}
        <Tooltip title={t('app.refresh')}>
          <IconButton onClick={handleRefresh} color="primary" sx={touchSx}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {profileQuery.isLoading ? (
        <LoadingSkeleton />
      ) : profileQuery.isError ? (
        <ErrorState variant="inline" onRetry={() => profileQuery.refetch()} />
      ) : !patient ? (
        <ErrorState variant="inline" message={t('patient360.notFound')} />
      ) : isMobile ? (
        <Stack spacing={1}>
          {priorityKpis.length > 0 && (
            <Accordion
              expanded={expanded === 'priority'}
              onChange={(_, isExp) => setExpanded(isExp ? 'priority' : false)}
              disableGutters
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <Typography variant="subtitle2">{t('responsive.priorityInfo')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <KpiGrid kpis={priorityKpis} />
              </AccordionDetails>
            </Accordion>
          )}

          {meds.length > 0 && (
            <Accordion
              expanded={expanded === 'meds'}
              onChange={(_, isExp) => setExpanded(isExp ? 'meds' : false)}
              disableGutters
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <Typography variant="subtitle2">{t('patient360.tabs.meds')}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <DetailDataTable
                  title={t('patient360.tabs.meds')}
                  data={meds}
                  columns={timelineColumns}
                  loading={timelineQuery.isLoading}
                  emptyMessage={t('patient360.noMeds')}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {encounters.length > 0 && (
            <Accordion
              expanded={expanded === 'encounters'}
              onChange={(_, isExp) => setExpanded(isExp ? 'encounters' : false)}
              disableGutters
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <Typography variant="subtitle2">{t('patient360.tabs.encounters')}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <DetailDataTable
                  title={t('patient360.tabs.encounters')}
                  data={encounters}
                  columns={timelineColumns}
                  loading={timelineQuery.isLoading}
                  emptyMessage={t('patient360.noEncounters')}
                />
              </AccordionDetails>
            </Accordion>
          )}

          <Accordion
            expanded={expanded === 'overview'}
            onChange={(_, isExp) => setExpanded(isExp ? 'overview' : false)}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
              <Typography variant="subtitle2">{t('patient360.tabs.overview')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <KpiGrid kpis={kpis} />
            </AccordionDetails>
          </Accordion>

          {labs.length > 0 && (
            <Accordion
              expanded={expanded === 'labs'}
              onChange={(_, isExp) => setExpanded(isExp ? 'labs' : false)}
              disableGutters
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <Typography variant="subtitle2">{t('patient360.tabs.labs')}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <DetailDataTable
                  title={t('patient360.tabs.labs')}
                  data={labs}
                  columns={timelineColumns}
                  loading={timelineQuery.isLoading}
                  emptyMessage={t('patient360.noLabs')}
                />
              </AccordionDetails>
            </Accordion>
          )}

          <Accordion
            expanded={expanded === 'timeline'}
            onChange={(_, isExp) => setExpanded(isExp ? 'timeline' : false)}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
              <Typography variant="subtitle2">{t('patient360.tabs.timeline')}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <DetailDataTable
                title={t('patient360.tabs.timeline')}
                data={timeline}
                columns={timelineColumns}
                loading={timelineQuery.isLoading}
                emptyMessage={t('patient360.noTimeline')}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === 'details'}
            onChange={(_, isExp) => setExpanded(isExp ? 'details' : false)}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
              <Typography variant="subtitle2">{t('patient360.demographics')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {demographicsCard}
                {utilizationCard}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={t('patient360.tabs.overview')} />
            <Tab label={t('patient360.tabs.encounters')} />
            <Tab label={t('patient360.tabs.labs')} />
            <Tab label={t('patient360.tabs.meds')} />
            <Tab label={t('patient360.tabs.timeline')} />
          </Tabs>

          {tab === 0 && (
            <Box display="flex" flexDirection="column" gap={3}>
              <KpiGrid kpis={kpis} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {demographicsCard}
                </Grid>
                <Grid item xs={12} md={6}>
                  {utilizationCard}
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 1 && (
            <DetailDataTable
              title={t('patient360.tabs.encounters')}
              data={encounters}
              columns={timelineColumns}
              loading={timelineQuery.isLoading}
              emptyMessage={t('patient360.noEncounters')}
            />
          )}

          {tab === 2 && (
            <DetailDataTable
              title={t('patient360.tabs.labs')}
              data={labs}
              columns={timelineColumns}
              loading={timelineQuery.isLoading}
              emptyMessage={t('patient360.noLabs')}
            />
          )}

          {tab === 3 && (
            <DetailDataTable
              title={t('patient360.tabs.meds')}
              data={meds}
              columns={timelineColumns}
              loading={timelineQuery.isLoading}
              emptyMessage={t('patient360.noMeds')}
            />
          )}

          {tab === 4 && (
            <DetailDataTable
              title={t('patient360.tabs.timeline')}
              data={timeline}
              columns={timelineColumns}
              loading={timelineQuery.isLoading}
              emptyMessage={t('patient360.noTimeline')}
            />
          )}
        </>
      )}
    </Box>
  );
}
