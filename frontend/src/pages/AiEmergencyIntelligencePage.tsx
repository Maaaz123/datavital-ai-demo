import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchEdBottlenecks, fetchEdCrowding, fetchEdRecommendations, fetchEdWaiting, runEdPrediction } from '@/api/ai';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { PageHeader, SituationSummary } from '@/components/ux';
import type { ChartPayload } from '@/types/api';
import { localizeDataLabel } from '@/i18n/localize';

export default function AiEmergencyIntelligencePage() {
  const { t, i18n } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const crowdQ = useQuery({ queryKey: ['ai-ed-crowd', filters], queryFn: () => fetchEdCrowding(filters) });
  const waitQ = useQuery({ queryKey: ['ai-ed-wait', filters], queryFn: () => fetchEdWaiting(filters) });
  const bottleQ = useQuery({ queryKey: ['ai-ed-bottle', filters], queryFn: () => fetchEdBottlenecks(filters) });
  const recQ = useQuery({ queryKey: ['ai-ed-recs', filters], queryFn: () => fetchEdRecommendations(filters) });
  const runMut = useMutation({ mutationFn: runEdPrediction, onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-ed-crowd'] }) });

  const h4 = (crowdQ.data ?? []).filter((p) => Number(p.horizon_hours) === 4);
  const chart: ChartPayload | undefined = useMemo(() => {
    if (!h4.length) return undefined;
    return {
      chart_type: 'bar',
      title: t('aiEd.crowdingChart'),
      categories: h4.map((p) => String(p.hospital_name)),
      series: [{ name: t('aiEd.crowdingScore'), data: h4.map((p) => Number(p.crowding_score)) }],
    };
  }, [h4, t]);

  const crowdSituation = useMemo(() => {
    if (!h4.length) return null;
    const highest = h4.reduce((best, p) => {
      const ranks: Record<string, number> = { critical: 3, high: 2, warning: 2, moderate: 1, low: 0 };
      const score = ranks[String(p.crowding_level).toLowerCase()] ?? 0;
      const bestScore = ranks[String(best.crowding_level).toLowerCase()] ?? 0;
      return score > bestScore ? p : best;
    });
    const severity = String(highest.crowding_level).toLowerCase() === 'critical' ? 'critical' : 'warning';
    return {
      text: `${String(highest.hospital_name)} — ${t('aiEd.crowdingLevel', { defaultValue: 'Crowding level' })}: ${String(highest.crowding_level)}`,
      severity: severity as 'critical' | 'warning',
    };
  }, [h4, t]);


  return (
    <Box>
      <PageHeader
        title={t('aiEd.title')}
        description={t('aiEd.subtitle')}
        actions={
          <Button variant="contained" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {t('aiEd.runPrediction')}
          </Button>
        }
      />
      {crowdQ.isLoading ? (
        <LoadingSkeleton />
      ) : crowdQ.isError ? (
        <ErrorState variant="inline" onRetry={() => crowdQ.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>{t('aiEd.advisory')}</Alert>
      {crowdSituation && (
        <Box sx={{ mb: 2 }}>
          <SituationSummary text={crowdSituation.text} severity={crowdSituation.severity} />
        </Box>
      )}
      <Grid container spacing={2} mb={2}>
        {h4.slice(0, 4).map((p) => (
          <Grid item xs={12} sm={6} md={3} key={String(p.prediction_id)}>
            <Card>
              <CardContent>
                <Typography variant="overline">{String(p.hospital_name)}</Typography>
                <Typography variant="h4">{Number(p.crowding_score).toFixed(0)}</Typography>
                <Chip label={String(p.crowding_level)} color={String(p.crowding_level) === 'critical' ? 'error' : 'warning'} size="small" />
                <Typography variant="caption" display="block" mt={1}>wait {Number(p.predicted_wait).toFixed(0)}m · census {Number(p.predicted_census).toFixed(0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Card><CardHeader title={t('aiEd.crowdingChart')} /><CardContent><EChart payload={chart} /></CardContent></Card></Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiEd.waitingTime')} />
            <CardContent>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('data.columns.hospital')}</TableCell><TableCell>{t('data.columns.metric')}</TableCell><TableCell>{t('data.columns.minutes')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {(waitQ.data ?? []).slice(0, 12).map((w) => (
                    <TableRow key={String(w.prediction_id)}><TableCell>{localizeDataLabel(String(w.hospital_name), t, i18n.language)}</TableCell><TableCell>{String(w.metric_code)}</TableCell><TableCell>{Number(w.predicted_minutes).toFixed(1)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiEd.bottlenecks')} />
            <CardContent>
              {(bottleQ.data ?? []).map((b) => (
                <Box key={String(b.bottleneck_id)} mb={1}>
                  <Typography fontWeight={600}>{localizeDataLabel(String(b.bottleneck_type), t, i18n.language)} · {localizeDataLabel(String(b.hospital_name), t, i18n.language)}</Typography>
                  <Typography variant="body2" color="text.secondary">{String(b.evidence)}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiEd.recommendations')} />
            <CardContent>
              <Alert severity="warning" sx={{ mb: 1 }}>{recQ.data?.note}</Alert>
              {(recQ.data?.items ?? []).map((r) => (
                <Box key={String(r.recommendation_id)} mb={1}>
                  <Typography fontWeight={600}>{String(r.title)}</Typography>
                  <Typography variant="body2">{String(r.rationale)}</Typography>
                </Box>
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