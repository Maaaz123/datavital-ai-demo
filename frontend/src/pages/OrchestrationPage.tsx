import { Alert, Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchOpsOrchestration } from '@/api/opsDemo';
import KPICard from '@/components/common/KPICard';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import CompactPageHeader from '@/components/layout/CompactPageHeader';
import { formatDateTime } from '@/utils/format';

export default function OrchestrationPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['ops-orch'], queryFn: fetchOpsOrchestration });
  const data = q.data;

  return (
    <Box>
      <CompactPageHeader title={t('opsDemo.orchTitle')} subtitle={t('opsDemo.orchSubtitle')} />
      {q.isLoading ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState variant="inline" onRetry={() => q.refetch()} />
      ) : !data ? (
        <ErrorState variant="inline" onRetry={() => q.refetch()} />
      ) : (
        <>
{data.disclaimer && <Alert severity="info" sx={{ mb: 2 }}>{data.disclaimer}</Alert>}
      <Grid container spacing={1.5} mb={2}>
        {(data.kpis ?? []).map((kpi) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title={t('opsDemo.latestRun')} />
            <CardContent>
              {data.latest_run ? (
                <Stack spacing={1}>
                  <Typography variant="h6">{String(data.latest_run.job_name)}</Typography>
                  <Chip size="small" color={data.latest_run.status === 'success' ? 'success' : 'error'} label={String(data.latest_run.status)} sx={{ width: 'fit-content' }} />
                  <Typography variant="body2">{t('opsDemo.started')}: {formatDateTime(data.latest_run.started_at as string)}</Typography>
                  <Typography variant="body2">{t('opsDemo.finished')}: {formatDateTime(data.latest_run.finished_at as string)}</Typography>
                  <Typography variant="body2">{String(data.latest_run.summary ?? '')}</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('opsDemo.dependencies')}</Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {(data.dependencies ?? []).map((d) => <Chip key={d} size="small" label={d} />)}
                  </Stack>
                </Stack>
              ) : (
                <Typography color="text.secondary">—</Typography>
              )}
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}><CardHeader title={t('opsDemo.runHistory')} /><CardContent><EChart payload={data.history_trend} height={240} /></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('opsDemo.steps')} />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>{t('opsDemo.step')}</TableCell>
                    <TableCell>{t('opsDemo.status')}</TableCell>
                    <TableCell align="right">{t('opsDemo.in')}</TableCell>
                    <TableCell align="right">{t('opsDemo.out')}</TableCell>
                    <TableCell align="right">{t('opsDemo.failed')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.steps ?? []).map((s) => (
                    <TableRow key={String(s.step_order)}>
                      <TableCell>{Number(s.step_order)}</TableCell>
                      <TableCell>{String(s.step_name)}</TableCell>
                      <TableCell><Chip size="small" color={s.status === 'success' ? 'success' : 'warning'} label={String(s.status)} /></TableCell>
                      <TableCell align="right">{Number(s.records_in ?? 0)}</TableCell>
                      <TableCell align="right">{Number(s.records_out ?? 0)}</TableCell>
                      <TableCell align="right">{Number(s.records_failed ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}>
            <CardHeader title={t('opsDemo.recentRuns')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('opsDemo.job')}</TableCell>
                    <TableCell>{t('opsDemo.status')}</TableCell>
                    <TableCell>{t('opsDemo.started')}</TableCell>
                    <TableCell align="right">{t('opsDemo.duration')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.runs ?? []).slice(0, 12).map((r) => (
                    <TableRow key={String(r.orch_run_id)}>
                      <TableCell>{String(r.job_name)}</TableCell>
                      <TableCell><Chip size="small" color={r.status === 'success' ? 'success' : 'error'} label={String(r.status)} /></TableCell>
                      <TableCell>{formatDateTime(r.started_at as string)}</TableCell>
                      <TableCell align="right">{Number(r.duration_seconds ?? 0)}s</TableCell>
                    </TableRow>
                  ))}
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