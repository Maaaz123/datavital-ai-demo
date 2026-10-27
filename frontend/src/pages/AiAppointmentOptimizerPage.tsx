import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { applyAppointmentIntervention, fetchClinicDemand, fetchNoShowRisk, fetchWaitlistRecs } from '@/api/ai';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { PageHeader } from '@/components/ux';
import type { ChartPayload } from '@/types/api';
import { localizeDataLabel } from '@/i18n/localize';

export default function AiAppointmentOptimizerPage() {
  const { t, i18n } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const riskQ = useQuery({ queryKey: ['ai-appt-risk', filters], queryFn: () => fetchNoShowRisk(filters) });
  const demandQ = useQuery({ queryKey: ['ai-appt-demand', filters], queryFn: () => fetchClinicDemand(filters) });
  const waitQ = useQuery({ queryKey: ['ai-appt-wait', filters], queryFn: () => fetchWaitlistRecs(filters) });
  const intervene = useMutation({
    mutationFn: applyAppointmentIntervention,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-appt-risk'] }),
  });

  const preds = useMemo(() => riskQ.data?.predictions ?? [], [riskQ.data?.predictions]);
  const high = preds.filter((p) => ['high', 'very_high'].includes(String(p.risk_level)));
  const chart: ChartPayload | undefined = useMemo(() => {
    const buckets = { low: 0, medium: 0, high: 0, very_high: 0 };
    preds.forEach((p) => {
      const k = String(p.risk_level) as keyof typeof buckets;
      if (k in buckets) buckets[k] += 1;
    });
    return {
      chart_type: 'donut',
      title: t('aiAppt.riskDistribution'),
      categories: Object.keys(buckets),
      series: [{ name: 'count', data: Object.values(buckets) }],
    };
  }, [preds, t]);


  return (
    <Box>
      <PageHeader title={t('aiAppt.title')} description={t('aiAppt.subtitle')} />
      {riskQ.isLoading ? (
        <LoadingSkeleton />
      ) : riskQ.isError ? (
        <ErrorState variant="inline" onRetry={() => riskQ.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>{riskQ.data?.policy}</Alert>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiAppt.atRisk')}</Typography><Typography variant="h3">{high.length}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiAppt.avgRisk')}</Typography><Typography variant="h3">{preds.length ? `${((preds.reduce((s, p) => s + Number(p.no_show_probability), 0) / preds.length) * 100).toFixed(0)}%` : '—'}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiAppt.recoverable')}</Typography><Typography variant="h3">{preds.reduce((s, p) => s + Number(p.estimated_slot_value || 0), 0).toFixed(0)}</Typography></CardContent></Card></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}><Card><CardHeader title={t('aiAppt.riskDistribution')} /><CardContent><EChart payload={chart} /></CardContent></Card></Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('aiAppt.highRiskTable')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('data.columns.clinic')}</TableCell><TableCell>{t('data.columns.risk')}</TableCell><TableCell>{t('data.columns.probability')}</TableCell><TableCell>{t('data.columns.intervention')}</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {high.slice(0, 15).map((p) => (
                    <TableRow key={String(p.prediction_id)}>
                      <TableCell>{String(p.clinic_name)}</TableCell>
                      <TableCell><Chip size="small" label={String(p.risk_level)} /></TableCell>
                      <TableCell>{(Number(p.no_show_probability) * 100).toFixed(0)}%</TableCell>
                      <TableCell>{String(p.recommended_intervention)}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => intervene.mutate({ appointment_id: String(p.appointment_id), intervention_type: String(p.recommended_intervention) })}>
                          {t('aiAppt.apply')}
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
            <CardHeader title={t('aiAppt.demand')} />
            <CardContent>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('data.columns.date')}</TableCell><TableCell>{t('data.columns.hospital')}</TableCell><TableCell>{t('data.columns.demand')}</TableCell><TableCell>{t('data.columns.utilization')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {(demandQ.data ?? []).slice(0, 10).map((d) => (
                    <TableRow key={String(d.forecast_id)}><TableCell>{String(d.forecast_date).slice(0, 10)}</TableCell><TableCell>{localizeDataLabel(String(d.hospital_name), t, i18n.language)}</TableCell><TableCell>{Number(d.predicted_demand)}</TableCell><TableCell>{Number(d.utilization_rate)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiAppt.waitlist')} />
            <CardContent>
              {(waitQ.data ?? []).map((w) => (
                <Stack key={String(w.recommendation_id)} direction="row" justifyContent="space-between" mb={1}>
                  <Typography>{String(w.clinic_name)} · score {Number(w.priority_score).toFixed(2)}</Typography>
                  <Chip size="small" label={String(w.status)} />
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