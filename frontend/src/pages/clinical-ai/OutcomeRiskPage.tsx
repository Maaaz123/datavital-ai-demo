import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  feedbackOutcomesPrediction,
  fetchOutcomesComplications,
  fetchOutcomesHighRiskPatients,
  fetchOutcomesModelPerformance,
  fetchOutcomesMortality,
  fetchOutcomesPatient,
  fetchOutcomesReadmission,
  reviewOutcomesPrediction,
  runOutcomesPrediction,
} from '@/api/clinicalAi';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import KPICard from '@/components/common/KPICard';
import type { ChartPayload, KPICardData } from '@/types/api';
import {
  ClinicalAIPageHeader,
  ClinicalReviewForm,
  ClinicalSafetyBanner,
  ContributingFactorsPanel,
  MissingDataPanel,
  ModelLimitationsPanel,
  ModelPerformancePanel,
  PatientRiskCard,
} from '@/components/clinical-ai';

export default function OutcomeRiskPage() {
  const { t } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const highQ = useQuery({ queryKey: ['cai-out-high', filters], queryFn: () => fetchOutcomesHighRiskPatients(filters) });
  const readmQ = useQuery({ queryKey: ['cai-out-readm', filters], queryFn: () => fetchOutcomesReadmission(filters) });
  const compQ = useQuery({ queryKey: ['cai-out-comp', filters], queryFn: () => fetchOutcomesComplications(filters) });
  const mortQ = useQuery({ queryKey: ['cai-out-mort', filters], queryFn: () => fetchOutcomesMortality(filters) });
  const perfQ = useQuery({ queryKey: ['cai-out-perf'], queryFn: fetchOutcomesModelPerformance });
  const patientQ = useQuery({
    queryKey: ['cai-out-patient', selectedId],
    queryFn: () => fetchOutcomesPatient(selectedId!),
    enabled: !!selectedId,
  });

  const runMut = useMutation({
    mutationFn: () => runOutcomesPrediction(filters),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cai-out-high'] });
      qc.invalidateQueries({ queryKey: ['cai-out-readm'] });
      qc.invalidateQueries({ queryKey: ['cai-out-comp'] });
      qc.invalidateQueries({ queryKey: ['cai-out-mort'] });
    },
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      reviewOutcomesPrediction(id, { review_status: status, notes: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-out-high'] }),
  });

  const feedbackMut = useMutation({
    mutationFn: (id: string) => feedbackOutcomesPrediction(id, { was_clinically_useful: true }),
  });

  const highRisk = highQ.data ?? [];
  const detail = patientQ.data ?? highRisk.find((p) => String(p.prediction_id ?? p.patient_key) === selectedId) ?? {};

  const readmChart: ChartPayload | undefined = useMemo(() => {
    const dist = (readmQ.data?.distribution ?? readmQ.data?.risk_distribution ?? []) as Record<string, unknown>[];
    if (!dist.length) return undefined;
    return {
      chart_type: 'bar',
      title: t('clinicalOutcomes.readmissionDist'),
      categories: dist.map((d) => String(d.bucket ?? d.category ?? '')),
      series: [{ name: t('clinicalOutcomes.patients'), data: dist.map((d) => Number(d.count ?? 0)) }],
    };
  }, [readmQ.data, t]);

  const compChart: ChartPayload | undefined = useMemo(() => {
    const dist = (compQ.data?.distribution ?? compQ.data?.risk_distribution ?? []) as Record<string, unknown>[];
    if (!dist.length) return undefined;
    return {
      chart_type: 'bar',
      title: t('clinicalOutcomes.complicationDist'),
      categories: dist.map((d) => String(d.bucket ?? d.category ?? '')),
      series: [{ name: t('clinicalOutcomes.patients'), data: dist.map((d) => Number(d.count ?? 0)) }],
    };
  }, [compQ.data, t]);

  const kpis: KPICardData[] = [
    { key: 'high', label: t('clinicalOutcomes.highRiskCount'), value: highRisk.length, severity: 'warning' },
    { key: 'readm30', label: t('clinicalOutcomes.readm30High'), value: Number(readmQ.data?.high_risk_count ?? 0), severity: 'warning' },
    { key: 'mort', label: t('clinicalOutcomes.mortalityHigh'), value: Number(mortQ.data?.high_risk_count ?? 0), severity: 'critical' },
  ];


  return (
    <Box>
      <ClinicalAIPageHeader
        title={t('clinicalOutcomes.title')}
        subtitle={t('clinicalOutcomes.subtitle')}
        actions={
          <Button variant="contained" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {t('clinicalOutcomes.runPrediction')}
          </Button>
        }
      />
      <ClinicalSafetyBanner />
      {highQ.isLoading ? (
        <LoadingSkeleton />
      ) : highQ.isError ? (
        <ErrorState variant="inline" onRetry={() => highQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={4} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalOutcomes.readmissionDist')} />
            <CardContent><EChart payload={readmChart} height={220} /></CardContent>
          </Card>
          <Card>
            <CardHeader title={t('clinicalOutcomes.complicationDist')} />
            <CardContent><EChart payload={compChart} height={220} /></CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('clinicalOutcomes.highRiskPatients')} />
            <CardContent>
              <Stack spacing={1}>
                {highRisk.slice(0, 15).map((p) => {
                  const id = String(p.prediction_id ?? p.patient_key);
                  return (
                    <PatientRiskCard
                      key={id}
                      patient={p}
                      selected={selectedId === id}
                      onSelect={() => setSelectedId(id)}
                    />
                  );
                })}
                {!highRisk.length && <Typography color="text.secondary">{t('app.noData')}</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('clinicalOutcomes.patientSummary')} />
            <CardContent>
              {!selectedId ? (
                <Typography color="text.secondary">{t('clinicalOutcomes.selectPatient')}</Typography>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2"><strong>{t('clinicalOutcomes.outcomeType')}:</strong> {String(detail.outcome_type ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalOutcomes.period')}:</strong> {String(detail.prediction_period ?? '—')}</Typography>
                  <ContributingFactorsPanel factors={(detail.contributing_factors ?? []) as Record<string, unknown>[]} />
                  {Array.isArray(detail.protective_factors) && detail.protective_factors.length > 0 && (
                    <ContributingFactorsPanel
                      factors={(detail.protective_factors ?? []) as Record<string, unknown>[]}
                      title={t('clinicalOutcomes.protectiveFactors')}
                    />
                  )}
                  <MissingDataPanel items={(detail.missing_data ?? []) as (string | Record<string, unknown>)[]} />
                  <ModelLimitationsPanel limitations={(detail.model_limitations ?? []) as (string | Record<string, unknown>)[]} />
                  <ClinicalReviewForm
                    loading={reviewMut.isPending}
                    onSubmit={(status, note) => reviewMut.mutate({ id: selectedId, status, note })}
                  />
                  <Button size="small" onClick={() => feedbackMut.mutate(selectedId)}>{t('clinicalOutcomes.feedback')}</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalOutcomes.modelPerformance')} />
            <CardContent><ModelPerformancePanel rows={perfQ.data ?? []} /></CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}
