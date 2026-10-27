import { useMemo } from 'react';
import {
  Alert,
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
  fetchBedCapacityRisk,
  fetchBedDemandForecast,
  fetchBedModelPerformance,
  fetchBedRecommendations,
  fetchDischargePredictions,
  reviewBedPrediction,
  runBedForecast,
} from '@/api/ai';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { PageHeader, SituationSummary } from '@/components/ux';
import type { ChartPayload } from '@/types/api';
import { localizeDataLabel } from '@/i18n/localize';

export default function AiBedForecastPage() {
  const { t, i18n } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();

  const forecastQ = useQuery({ queryKey: ['ai-bed-forecast', filters], queryFn: () => fetchBedDemandForecast(filters) });
  const riskQ = useQuery({ queryKey: ['ai-bed-risk', filters], queryFn: () => fetchBedCapacityRisk(filters) });
  const dischargeQ = useQuery({ queryKey: ['ai-bed-discharge', filters], queryFn: () => fetchDischargePredictions(filters) });
  const recsQ = useQuery({ queryKey: ['ai-bed-recs', filters], queryFn: () => fetchBedRecommendations(filters) });
  const perfQ = useQuery({ queryKey: ['ai-bed-perf'], queryFn: fetchBedModelPerformance });
  const runMut = useMutation({
    mutationFn: runBedForecast,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-bed-forecast'] });
      qc.invalidateQueries({ queryKey: ['ai-bed-risk'] });
      qc.invalidateQueries({ queryKey: ['ai-bed-discharge'] });
      qc.invalidateQueries({ queryKey: ['ai-bed-recs'] });
    },
  });

  const predictions = useMemo(() => forecastQ.data?.predictions ?? [], [forecastQ.data?.predictions]);
  const h24 = useMemo(
    () => predictions.filter((p) => Number(p.horizon_hours) === 24),
    [predictions],
  );

  const chart: ChartPayload | undefined = useMemo(() => {
    const byHospital = new Map<string, number>();
    h24.forEach((p) => byHospital.set(String(p.hospital_name), Number(p.predicted_occupancy_rate)));
    if (!byHospital.size) return undefined;
    return {
      chart_type: 'bar',
      title: t('aiBeds.occupancyChart'),
      categories: [...byHospital.keys()],
      series: [{ name: t('aiBeds.predictedOccupancy'), data: [...byHospital.values()] }],
    };
  }, [h24, t]);

  const horizonChart: ChartPayload | undefined = useMemo(() => {
    const sample = predictions.filter((p) => String(p.hospital_name) === String(h24[0]?.hospital_name));
    if (!sample.length) return undefined;
    return {
      chart_type: 'line',
      title: t('aiBeds.horizonChart'),
      categories: sample.map((p) => `${p.horizon_hours}h`),
      series: [
        { name: t('aiBeds.predictedOccupied'), data: sample.map((p) => Number(p.predicted_occupied)) },
        { name: t('aiBeds.lowerBound'), data: sample.map((p) => Number(p.lower_bound)) },
        { name: t('aiBeds.upperBound'), data: sample.map((p) => Number(p.upper_bound)) },
      ],
    };
  }, [predictions, h24, t]);

  const forecastSituation = useMemo(() => {
    if (!h24.length) return null;
    const highest = h24.reduce((best, p) => {
      const ranks: Record<string, number> = { critical: 3, high: 2, warning: 2, medium: 1, low: 0 };
      const score = ranks[String(p.risk_level).toLowerCase()] ?? 0;
      const bestScore = ranks[String(best.risk_level).toLowerCase()] ?? 0;
      return score > bestScore ? p : best;
    });
    const severity = String(highest.risk_level).toLowerCase() === 'critical' ? 'critical' : 'warning';
    return {
      text: `${String(highest.hospital_name)} — ${t('aiBeds.capacityRisk')}: ${String(highest.risk_level)}`,
      severity: severity as 'critical' | 'warning',
    };
  }, [h24, t]);


  return (
    <Box>
      <PageHeader
        title={t('aiBeds.title')}
        description={t('aiBeds.subtitle')}
        actions={
          <Button variant="contained" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {t('aiBeds.runForecast')}
          </Button>
        }
      />

      {forecastQ.isLoading ? (
        <LoadingSkeleton />
      ) : forecastQ.isError ? (
        <ErrorState variant="inline" onRetry={() => forecastQ.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>
        {forecastQ.data?.disclaimer || t('aiBeds.disclaimer')}
      </Alert>

      {forecastSituation && (
        <Box sx={{ mb: 2 }}>
          <SituationSummary text={forecastSituation.text} severity={forecastSituation.severity} />
        </Box>
      )}

      <Grid container spacing={2} mb={2}>
        {h24.slice(0, 4).map((p) => (
          <Grid item xs={12} sm={6} md={3} key={String(p.prediction_id)}>
            <Card>
              <CardContent>
                <Typography variant="overline">{String(p.hospital_name)}</Typography>
                <Typography variant="h4">{Number(p.predicted_occupancy_rate).toFixed(1)}%</Typography>
                <Chip size="small" label={String(p.risk_level)} color={String(p.risk_level) === 'critical' ? 'error' : 'warning'} sx={{ mt: 1 }} />
                <Typography variant="caption" display="block" mt={1}>
                  24h · avail {Number(p.predicted_available).toFixed(0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiBeds.occupancyChart')} />
            <CardContent>
              <EChart payload={chart} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiBeds.horizonChart')} />
            <CardContent>
              <EChart payload={horizonChart} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiBeds.dischargeList')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {dischargeQ.data?.disclaimer}
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('aiBeds.ward')}</TableCell>
                    <TableCell>{t('aiBeds.probability')}</TableCell>
                    <TableCell>{t('aiBeds.window')}</TableCell>
                    <TableCell>{t('aiBeds.action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(dischargeQ.data?.predictions ?? []).slice(0, 12).map((row) => (
                    <TableRow key={String(row.prediction_id)}>
                      <TableCell>{String(row.ward_name || '—')}</TableCell>
                      <TableCell>{(Number(row.discharge_probability) * 100).toFixed(0)}%</TableCell>
                      <TableCell>{String(row.window_label)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() =>
                            reviewBedPrediction({
                              entity_id: String(row.prediction_id),
                              review_status: 'reviewed',
                            })
                          }
                        >
                          {t('aiBeds.markReviewed')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiBeds.recommendations')} />
            <CardContent>
              {(recsQ.data ?? []).map((r) => (
                <Box key={String(r.recommendation_id)} mb={1.5}>
                  <Typography fontWeight={600}>{String(r.title)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {String(r.rationale)}
                  </Typography>
                  <Chip size="small" label={`P${r.priority}`} sx={{ mt: 0.5 }} />
                </Box>
              ))}
              {!recsQ.data?.length && <Typography color="text.secondary">{t('aiBeds.noRecommendations')}</Typography>}
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}>
            <CardHeader title={t('aiBeds.modelPerformance')} />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('data.columns.metric')}</TableCell>
                    <TableCell>{t('data.columns.value')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(perfQ.data ?? []).slice(0, 8).map((p, idx) => (
                    <TableRow key={`${p.metric_name}-${idx}`}>
                      <TableCell>{String(p.metric_name)}</TableCell>
                      <TableCell>{Number(p.metric_value).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}>
            <CardHeader title={t('aiBeds.capacityRisk')} />
            <CardContent>
              {(riskQ.data ?? []).slice(0, 8).map((r) => (
                <Stack key={String(r.risk_id)} direction="row" justifyContent="space-between" mb={1}>
                  <Typography>{localizeDataLabel(String(r.hospital_name), t, i18n.language)}</Typography>
                  <Chip size="small" label={`${localizeDataLabel(String(r.risk_level), t, i18n.language)} · ${Number(r.predicted_occupancy).toFixed(0)}%`} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}