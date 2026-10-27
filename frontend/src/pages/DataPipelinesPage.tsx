import { Alert, Box, Card, CardContent, CardHeader, Chip, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchOpsPipelines } from '@/api/opsDemo';
import KPICard from '@/components/common/KPICard';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import CompactPageHeader from '@/components/layout/CompactPageHeader';
import { formatDateTime } from '@/utils/format';

export default function DataPipelinesPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['ops-pipelines'], queryFn: fetchOpsPipelines });
  const data = q.data;

  return (
    <Box>
      <CompactPageHeader title={t('opsDemo.pipelinesTitle')} subtitle={t('opsDemo.pipelinesSubtitle')} />
      {q.isLoading ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState variant="inline" onRetry={() => q.refetch()} />
      ) : !data ? (
        <ErrorState variant="inline" onRetry={() => q.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>
        {data.disclaimer}
        {' '}
        <Typography component="span" variant="body2">({data.airbyte_runtime} / mode={data.mode})</Typography>
      </Alert>
      <Grid container spacing={1.5} mb={2}>
        {(data.kpis ?? []).map((kpi) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card><CardHeader title={t('opsDemo.syncTrend')} /><CardContent><EChart payload={data.history_trend} height={300} /></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('opsDemo.connections')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('opsDemo.connection')}</TableCell>
                    <TableCell>{t('opsDemo.source')}</TableCell>
                    <TableCell>{t('opsDemo.status')}</TableCell>
                    <TableCell>{t('opsDemo.lastSync')}</TableCell>
                    <TableCell>{t('opsDemo.nextSync')}</TableCell>
                    <TableCell align="right">{t('opsDemo.loaded')}</TableCell>
                    <TableCell align="right">{t('opsDemo.rejected')}</TableCell>
                    <TableCell>{t('opsDemo.dqImpact')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.connections ?? []).map((c) => (
                    <TableRow key={String(c.connection_id)}>
                      <TableCell>{String(c.connection_name)}</TableCell>
                      <TableCell>{String(c.source_system)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={c.status === 'succeeded' ? 'success' : 'error'} label={String(c.status)} />
                      </TableCell>
                      <TableCell>{formatDateTime(c.finished_at as string)}</TableCell>
                      <TableCell>{formatDateTime(c.next_scheduled_at as string)}</TableCell>
                      <TableCell align="right">{Number(c.records_loaded ?? 0)}</TableCell>
                      <TableCell align="right">{Number(c.records_rejected ?? 0)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" component={RouterLink} to="/data-quality" style={{ textDecoration: 'none' }}>
                          {String(c.dq_impact_summary ?? '—')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('opsDemo.failedSyncs')} />
            <CardContent>
              {(data.failed ?? []).length === 0 ? (
                <Typography color="text.secondary">{t('opsDemo.noFailedSyncs')}</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('opsDemo.connection')}</TableCell>
                      <TableCell>{t('opsDemo.error')}</TableCell>
                      <TableCell>{t('opsDemo.retry')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.failed.map((f) => (
                      <TableRow key={String(f.connection_id)}>
                        <TableCell>{String(f.connection_name)}</TableCell>
                        <TableCell>{String(f.error_message ?? '—')}</TableCell>
                        <TableCell>{Number(f.retry_count ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}