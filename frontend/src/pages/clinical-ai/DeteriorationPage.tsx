import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
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
  acknowledgeDeteriorationPrediction,
  fetchDeteriorationCurrentRisk,
  fetchDeteriorationHighRiskPatients,
  fetchDeteriorationModelPerformance,
  fetchDeteriorationPatient,
  fetchDeteriorationWardSummary,
  overrideDeteriorationPrediction,
  reviewDeteriorationPrediction,
  runDeteriorationPrediction,
} from '@/api/clinicalAi';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';
import {
  AlertAcknowledgement,
  ClinicalAIPageHeader,
  ClinicalReviewForm,
  ClinicalSafetyBanner,
  ContributingFactorsPanel,
  LaboratoryTrend,
  MissingDataPanel,
  ModelLimitationsPanel,
  ModelPerformancePanel,
  OverrideDialog,
  PatientRiskCard,
  PatientVitalTrend,
  PredictionTimeline,
} from '@/components/clinical-ai';

function riskHeatColor(score: number): string {
  if (score >= 0.85) return 'error.main';
  if (score >= 0.7) return 'warning.main';
  if (score >= 0.45) return 'warning.light';
  return 'success.light';
}

export default function DeteriorationPage() {
  const { t } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const riskQ = useQuery({ queryKey: ['cai-det-risk', filters], queryFn: () => fetchDeteriorationCurrentRisk(filters) });
  const wardQ = useQuery({ queryKey: ['cai-det-ward', filters], queryFn: () => fetchDeteriorationWardSummary(filters) });
  const highQ = useQuery({ queryKey: ['cai-det-high', filters], queryFn: () => fetchDeteriorationHighRiskPatients(filters) });
  const perfQ = useQuery({ queryKey: ['cai-det-perf'], queryFn: fetchDeteriorationModelPerformance });
  const patientQ = useQuery({
    queryKey: ['cai-det-patient', selectedId],
    queryFn: () => fetchDeteriorationPatient(selectedId!),
    enabled: !!selectedId,
  });

  const runMut = useMutation({
    mutationFn: () => runDeteriorationPrediction(filters),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cai-det-risk'] });
      qc.invalidateQueries({ queryKey: ['cai-det-ward'] });
      qc.invalidateQueries({ queryKey: ['cai-det-high'] });
    },
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      reviewDeteriorationPrediction(id, { review_status: status, notes: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-det-high'] }),
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => acknowledgeDeteriorationPrediction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-det-high'] }),
  });

  const overrideMut = useMutation({
    mutationFn: ({ id, reason, action }: { id: string; reason: string; action: string }) =>
      overrideDeteriorationPrediction(id, { reason, final_action: action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-det-high'] }),
  });

  const summary = useMemo(() => riskQ.data ?? {}, [riskQ.data]);
  const kpis: KPICardData[] = useMemo(
    () => [
      { key: 'high', label: t('clinicalDeterioration.highRiskCount'), value: Number(summary.high_risk_count ?? 0), severity: 'warning' },
      { key: 'critical', label: t('clinicalDeterioration.criticalCount'), value: Number(summary.critical_risk_count ?? 0), severity: 'critical' },
      { key: 'worsening', label: t('clinicalDeterioration.worseningCount'), value: Number(summary.worsening_count ?? 0), severity: 'warning' },
      { key: 'missing', label: t('clinicalDeterioration.missingVitalsCount'), value: Number(summary.missing_vitals_count ?? 0), severity: 'info' },
    ],
    [summary, t],
  );

  const highRisk = highQ.data ?? [];
  const selected = highRisk.find((p) => String(p.prediction_id ?? p.patient_key) === selectedId);
  const detail = patientQ.data ?? selected ?? {};
  const factors = (detail.contributing_factors ?? detail.main_factors ?? []) as Record<string, unknown>[];
  const missing = (detail.missing_data ?? detail.missing_indicators ?? []) as (string | Record<string, unknown>)[];
  const limitations = (detail.model_limitations ?? detail.limitations ?? []) as (string | Record<string, unknown>)[];
  const vitals = (detail.vital_trends ?? detail.vitals ?? []) as Record<string, unknown>[];
  const labs = (detail.laboratory_trends ?? detail.labs ?? []) as Record<string, unknown>[];
  const timeline = (detail.prediction_timeline ?? detail.predictions ?? []) as Record<string, unknown>[];


  return (
    <Box>
      <ClinicalAIPageHeader
        title={t('clinicalDeterioration.title')}
        subtitle={t('clinicalDeterioration.subtitle')}
        actions={
          <Button variant="contained" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {t('clinicalDeterioration.runPrediction')}
          </Button>
        }
      />
      <ClinicalSafetyBanner />
      {riskQ.isLoading ? (
        <LoadingSkeleton />
      ) : riskQ.isError ? (
        <ErrorState variant="inline" onRetry={() => riskQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.key}>
            <KPICard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalDeterioration.wardHeatmap')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('clinicalDeterioration.ward')}</TableCell>
                    <TableCell>{t('clinicalDeterioration.hospital')}</TableCell>
                    <TableCell align="right">{t('clinicalDeterioration.avgRisk')}</TableCell>
                    <TableCell align="right">{t('clinicalDeterioration.highRisk')}</TableCell>
                    <TableCell align="right">{t('clinicalDeterioration.critical')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(wardQ.data ?? []).map((w, idx) => {
                    const avg = Number(w.avg_risk_score ?? w.average_risk ?? 0);
                    return (
                      <TableRow key={idx} sx={{ bgcolor: `${riskHeatColor(avg)}22` }}>
                        <TableCell>{String(w.ward_name ?? '—')}</TableCell>
                        <TableCell>{String(w.hospital_name ?? '—')}</TableCell>
                        <TableCell align="right">{(avg * 100).toFixed(0)}%</TableCell>
                        <TableCell align="right">{Number(w.high_risk_count ?? 0)}</TableCell>
                        <TableCell align="right">{Number(w.critical_risk_count ?? 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('clinicalDeterioration.highRiskList')} />
            <CardContent>
              <Stack spacing={1}>
                {highRisk.slice(0, 20).map((p) => {
                  const id = String(p.prediction_id ?? p.patient_key);
                  return (
                    <Box key={id} display="flex" alignItems="center" gap={1}>
                      <Box flex={1}>
                        <PatientRiskCard
                          patient={p}
                          selected={selectedId === id}
                          onSelect={() => setSelectedId(id)}
                        />
                      </Box>
                      <AlertAcknowledgement
                        acknowledged={Boolean(p.acknowledged_at ?? p.is_acknowledged)}
                        loading={ackMut.isPending}
                        onAcknowledge={() => ackMut.mutate(id)}
                      />
                    </Box>
                  );
                })}
                {!highRisk.length && <Typography color="text.secondary">{t('app.noData')}</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalDeterioration.patientDetail')} />
            <CardContent>
              {!selectedId ? (
                <Typography color="text.secondary">{t('clinicalDeterioration.selectPatient')}</Typography>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" color="warning.main">
                    {t('clinicalDeterioration.highRiskAdvisory')}
                  </Typography>
                  <ContributingFactorsPanel factors={factors} />
                  <MissingDataPanel items={missing} />
                  <ModelLimitationsPanel limitations={limitations} />
                  <ClinicalReviewForm
                    loading={reviewMut.isPending}
                    onSubmit={(status, note) => reviewMut.mutate({ id: selectedId, status, note })}
                  />
                  <Button size="small" color="warning" onClick={() => setOverrideOpen(true)}>
                    {t('clinicalAi.overrideTitle')}
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>

          {selectedId && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardHeader title={t('clinicalDeterioration.predictionTimeline')} />
                <CardContent><PredictionTimeline predictions={timeline} /></CardContent>
              </Card>
              <Card sx={{ mb: 2 }}>
                <CardHeader title={t('clinicalDeterioration.vitalTrend')} />
                <CardContent><PatientVitalTrend vitals={vitals} /></CardContent>
              </Card>
              <Card>
                <CardHeader title={t('clinicalDeterioration.labTrend')} />
                <CardContent><LaboratoryTrend labs={labs} /></CardContent>
              </Card>
            </>
          )}
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalDeterioration.modelPerformance')} />
            <CardContent>
              <ModelPerformancePanel rows={perfQ.data ?? []} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <OverrideDialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        loading={overrideMut.isPending}
        onConfirm={(reason, action) => {
          if (selectedId) overrideMut.mutate({ id: selectedId, reason, action });
        }}
      />
        </>
      )}
    </Box>
  );
}
