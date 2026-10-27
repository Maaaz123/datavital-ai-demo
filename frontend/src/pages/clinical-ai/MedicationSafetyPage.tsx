import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  acceptMedicationAlert,
  fetchMedicationAlerts,
  fetchMedicationModelPerformance,
  fetchMedicationOrder,
  overrideMedicationAlert,
  rejectMedicationAlert,
  reviewMedicationOrder,
} from '@/api/clinicalAi';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';
import {
  ClinicalAIPageHeader,
  ClinicalAuditTimeline,
  ClinicalReviewForm,
  ClinicalSafetyBanner,
  ConfidenceBadge,
  MissingDataPanel,
  ModelPerformancePanel,
  OverrideDialog,
} from '@/components/clinical-ai';

function severityColor(sev: string) {
  if (sev === 'critical') return 'error';
  if (sev === 'high') return 'warning';
  return 'default';
}

export default function MedicationSafetyPage() {
  const { t } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const alertsQ = useQuery({ queryKey: ['cai-med-alerts', filters], queryFn: () => fetchMedicationAlerts(filters) });
  const perfQ = useQuery({ queryKey: ['cai-med-perf'], queryFn: fetchMedicationModelPerformance });

  const orderQ = useQuery({
    queryKey: ['cai-med-order', selectedAlert],
    queryFn: async () => {
      const alert = (alertsQ.data ?? []).find((a) => String(a.alert_id) === selectedAlert);
      if (alert?.order_id) return fetchMedicationOrder(String(alert.order_id));
      return null;
    },
    enabled: !!selectedAlert,
  });

  const reviewMut = useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note: string }) =>
      reviewMedicationOrder(orderId, { review_status: status, notes: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-med-alerts'] }),
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptMedicationAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-med-alerts'] }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectMedicationAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-med-alerts'] }),
  });

  const overrideMut = useMutation({
    mutationFn: ({ id, reason, action }: { id: string; reason: string; action: string }) =>
      overrideMedicationAlert(id, { reason, final_action: action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-med-alerts'] }),
  });

  const alerts = alertsQ.data ?? [];
  const active = alerts.find((a) => String(a.alert_id) === selectedAlert);
  const critical = alerts.filter((a) => String(a.severity) === 'critical').length;
  const interactions = alerts.filter((a) => String(a.alert_type).includes('interaction')).length;

  const kpis: KPICardData[] = [
    { key: 'critical', label: t('clinicalMedication.criticalAlerts'), value: critical, severity: 'critical' },
    { key: 'queue', label: t('clinicalMedication.reviewQueue'), value: alerts.filter((a) => !a.review_status).length, severity: 'warning' },
    { key: 'interactions', label: t('clinicalMedication.interactions'), value: interactions, severity: 'info' },
  ];


  return (
    <Box>
      <ClinicalAIPageHeader title={t('clinicalMedication.title')} subtitle={t('clinicalMedication.subtitle')} />
      <ClinicalSafetyBanner />
      {alertsQ.isLoading ? (
        <LoadingSkeleton />
      ) : alertsQ.isError ? (
        <ErrorState variant="inline" onRetry={() => alertsQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={4} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('clinicalMedication.alertQueue')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('clinicalMedication.alertType')}</TableCell>
                    <TableCell>{t('clinicalMedication.medication')}</TableCell>
                    <TableCell>{t('clinicalMedication.severity')}</TableCell>
                    <TableCell>{t('clinicalMedication.evidence')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((a) => {
                    const id = String(a.alert_id);
                    return (
                      <TableRow key={id} hover selected={selectedAlert === id} onClick={() => setSelectedAlert(id)} sx={{ cursor: 'pointer' }}>
                        <TableCell>{String(a.alert_type ?? '—')}</TableCell>
                        <TableCell>{String(a.medication_name ?? a.medication ?? '—')}</TableCell>
                        <TableCell><Chip size="small" label={String(a.severity ?? '—')} color={severityColor(String(a.severity)) as 'error' | 'warning' | 'default'} /></TableCell>
                        <TableCell sx={{ maxWidth: 200 }}><Typography variant="caption" noWrap>{String(a.evidence ?? a.advisory_message ?? '—')}</Typography></TableCell>
                        <TableCell>{a.confidence != null && <ConfidenceBadge confidence={Number(a.confidence)} />}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalMedication.alertDetail')} />
            <CardContent>
              {!active ? (
                <Typography color="text.secondary">{t('clinicalMedication.selectAlert')}</Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body2">{String(active.advisory_message ?? active.evidence ?? t('clinicalMedication.reviewRecommended'))}</Typography>
                  <MissingDataPanel items={(active.missing_data ?? []) as (string | Record<string, unknown>)[]} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={() => acceptMut.mutate(String(active.alert_id))}>{t('clinicalMedication.accept')}</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => rejectMut.mutate(String(active.alert_id))}>{t('clinicalMedication.reject')}</Button>
                    <Button size="small" color="warning" onClick={() => setOverrideOpen(true)}>{t('clinicalAi.overrideTitle')}</Button>
                  </Stack>
                  {orderQ.data && (
                    <ClinicalReviewForm
                      loading={reviewMut.isPending}
                      onSubmit={(status, note) =>
                        reviewMut.mutate({ orderId: String((orderQ.data as Record<string, unknown>).order_id), status, note })
                      }
                    />
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('clinicalMedication.auditHistory')} />
            <CardContent>
              <ClinicalAuditTimeline events={(active?.audit_events ?? []) as Record<string, unknown>[]} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalMedication.modelPerformance')} />
            <CardContent><ModelPerformancePanel rows={perfQ.data ?? []} /></CardContent>
          </Card>
        </Grid>
      </Grid>

      <OverrideDialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        loading={overrideMut.isPending}
        onConfirm={(reason, action) => {
          if (selectedAlert) overrideMut.mutate({ id: selectedAlert, reason, action });
        }}
      />
        </>
      )}
    </Box>
  );
}
