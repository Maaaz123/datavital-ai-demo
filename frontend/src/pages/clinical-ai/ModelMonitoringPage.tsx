import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchMonitoringMetrics, fetchMonitoringOverview } from '@/api/clinicalAi';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import KPICard from '@/components/common/KPICard';
import type { ChartPayload, KPICardData } from '@/types/api';
import { ClinicalAIPageHeader, ClinicalSafetyBanner } from '@/components/clinical-ai';

export default function ModelMonitoringPage() {
  const { t } = useTranslation();

  const overviewQ = useQuery({ queryKey: ['cai-mon-overview'], queryFn: fetchMonitoringOverview });
  const metricsQ = useQuery({ queryKey: ['cai-mon-metrics'], queryFn: fetchMonitoringMetrics });

  const overview = overviewQ.data ?? {};
  const metrics = useMemo(() => metricsQ.data ?? [], [metricsQ.data]);

  const kpis: KPICardData[] = [
    { key: 'availability', label: t('clinicalMonitoring.availability'), value: `${Number(overview.availability_pct ?? 100).toFixed(1)}%`, severity: 'healthy' },
    { key: 'latency', label: t('clinicalMonitoring.avgLatency'), value: `${Number(overview.avg_latency_ms ?? 0).toFixed(0)} ms`, severity: 'info' },
    { key: 'volume', label: t('clinicalMonitoring.predictionVolume'), value: Number(overview.prediction_volume_24h ?? 0), severity: 'info' },
    { key: 'override', label: t('clinicalMonitoring.overrideRate'), value: `${(Number(overview.override_rate ?? 0) * 100).toFixed(1)}%`, severity: 'warning' },
  ];

  const volumeChart: ChartPayload | undefined = useMemo(() => {
    const series = metrics.filter((m) => m.metric_code === 'prediction_volume' || m.metric_name === 'prediction_volume');
    if (!series.length) {
      const byModel = new Map<string, number>();
      metrics.forEach((m) => {
        const code = String(m.model_code ?? 'all');
        byModel.set(code, (byModel.get(code) ?? 0) + Number(m.value ?? 0));
      });
      if (!byModel.size) return undefined;
      return {
        chart_type: 'bar',
        title: t('clinicalMonitoring.volumeByModel'),
        categories: [...byModel.keys()],
        series: [{ name: t('clinicalMonitoring.predictions'), data: [...byModel.values()] }],
      };
    }
    return {
      chart_type: 'line',
      title: t('clinicalMonitoring.predictionVolume'),
      categories: series.map((m) => String(m.recorded_at ?? m.timestamp ?? '')),
      series: [{ name: t('clinicalMonitoring.predictions'), data: series.map((m) => Number(m.value ?? 0)) }],
    };
  }, [metrics, t]);


  return (
    <Box>
      <ClinicalAIPageHeader title={t('clinicalMonitoring.title')} subtitle={t('clinicalMonitoring.subtitle')} />
      <ClinicalSafetyBanner />
      {overviewQ.isLoading ? (
        <LoadingSkeleton />
      ) : overviewQ.isError ? (
        <ErrorState variant="inline" onRetry={() => overviewQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('clinicalMonitoring.predictionVolume')} />
            <CardContent><EChart payload={volumeChart} height={280} /></CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('clinicalMonitoring.driftAlerts')} />
            <CardContent>
              {(overview.drift_alerts as Record<string, unknown>[] ?? []).length ? (
                (overview.drift_alerts as Record<string, unknown>[]).map((d, i) => (
                  <Typography key={i} variant="body2" mb={0.5}>
                    • {String(d.model_code ?? '—')}: {String(d.drift_type ?? d.alert ?? '—')}
                  </Typography>
                ))
              ) : (
                <Typography color="text.secondary">{t('clinicalMonitoring.noDrift')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalMonitoring.metricsTable')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('clinicalMonitoring.model')}</TableCell>
                    <TableCell>{t('clinicalMonitoring.metric')}</TableCell>
                    <TableCell align="right">{t('clinicalMonitoring.value')}</TableCell>
                    <TableCell>{t('clinicalMonitoring.status')}</TableCell>
                    <TableCell>{t('clinicalMonitoring.recordedAt')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.map((m, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{String(m.model_code ?? '—')}</TableCell>
                      <TableCell>{String(m.metric_code ?? m.metric_name ?? '—')}</TableCell>
                      <TableCell align="right">{typeof m.value === 'number' ? Number(m.value).toFixed(4) : String(m.value ?? '—')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={String(m.status ?? 'ok')}
                          color={String(m.status) === 'alert' ? 'error' : String(m.status) === 'warning' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{String(m.recorded_at ?? m.timestamp ?? '—')}</TableCell>
                    </TableRow>
                  ))}
                  {!metrics.length && (
                    <TableRow>
                      <TableCell colSpan={5}><Typography color="text.secondary">{t('app.noData')}</Typography></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}
