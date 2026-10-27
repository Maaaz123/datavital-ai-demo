import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchDqAnomalies, fetchDqDomainScores, fetchDqIssues, fetchDqSummary, fetchPipelineHealth, runDqAnalysis } from '@/api/ai';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { PageHeader, SituationSummary } from '@/components/ux';
import type { ChartPayload } from '@/types/api';
import { localizeDataLabel } from '@/i18n/localize';

export default function AiDataQualityAgentPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const summaryQ = useQuery({ queryKey: ['ai-dq-summary'], queryFn: fetchDqSummary });
  const issuesQ = useQuery({ queryKey: ['ai-dq-issues'], queryFn: fetchDqIssues });
  const scoresQ = useQuery({ queryKey: ['ai-dq-scores'], queryFn: fetchDqDomainScores });
  const anomQ = useQuery({ queryKey: ['ai-dq-anom'], queryFn: fetchDqAnomalies });
  const pipeQ = useQuery({ queryKey: ['ai-dq-pipe'], queryFn: fetchPipelineHealth });
  const runMut = useMutation({ mutationFn: runDqAnalysis, onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-dq-summary'] }); qc.invalidateQueries({ queryKey: ['ai-dq-issues'] }); } });

  const chart: ChartPayload | undefined = useMemo(() => {
    const rows = scoresQ.data ?? [];
    if (!rows.length) return undefined;
    return {
      chart_type: 'bar',
      title: t('aiDq.domainScores'),
      categories: rows.map((r) => String(r.domain)),
      series: [{ name: 'Score', data: rows.map((r) => Number(r.overall_score)) }],
    };
  }, [scoresQ.data, t]);

  const dqSituation = useMemo(() => {
    const s = summaryQ.data;
    if (!s) return null;
    const score = Number(s.overall_score ?? 0);
    const critical = Number(s.critical_issues ?? 0);
    const severity = critical > 0 ? 'critical' : score < 80 ? 'warning' : 'info';
    return {
      text: `${t('aiDq.overall')}: ${score.toFixed(1)} · ${t('aiDq.critical')}: ${critical}`,
      severity: severity as 'critical' | 'warning' | 'info',
    };
  }, [summaryQ.data, t]);


  return (
    <Box>
      <PageHeader
        title={t('aiDq.title')}
        description={t('aiDq.subtitle')}
        actions={
          <Button variant="contained" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {t('aiDq.runAnalysis')}
          </Button>
        }
      />
      {summaryQ.isLoading ? (
        <LoadingSkeleton />
      ) : summaryQ.isError ? (
        <ErrorState variant="inline" onRetry={() => summaryQ.refetch()} />
      ) : (
        <>
{dqSituation && (
        <Box sx={{ mb: 2 }}>
          <SituationSummary text={dqSituation.text} severity={dqSituation.severity} />
        </Box>
      )}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiDq.overall')}</Typography><Typography variant="h3">{Number(summaryQ.data?.overall_score ?? 0).toFixed(1)}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiDq.openIssues')}</Typography><Typography variant="h3">{Number(summaryQ.data?.open_issues ?? 0)}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiDq.critical')}</Typography><Typography variant="h3">{Number(summaryQ.data?.critical_issues ?? 0)}</Typography></CardContent></Card></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}><Card><CardHeader title={t('aiDq.domainScores')} /><CardContent><EChart payload={chart} /></CardContent></Card></Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('aiDq.issues')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('data.columns.domain')}</TableCell><TableCell>{t('data.columns.type')}</TableCell><TableCell>{t('data.columns.severity')}</TableCell><TableCell>{t('data.columns.rootCause')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {(issuesQ.data ?? []).slice(0, 15).map((i) => (
                    <TableRow key={String(i.issue_id)}>
                      <TableCell>{localizeDataLabel(String(i.domain), t, i18n.language)}</TableCell>
                      <TableCell>{localizeDataLabel(String(i.issue_type), t, i18n.language)}</TableCell>
                      <TableCell><Chip size="small" label={localizeDataLabel(String(i.severity), t, i18n.language)} color={String(i.severity) === 'high' ? 'error' : 'default'} /></TableCell>
                      <TableCell>{String(i.likely_root_cause || '').slice(0, 80)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiDq.anomalies')} />
            <CardContent>
              {(anomQ.data ?? []).length === 0 && <Typography color="text.secondary">{t('aiDq.noAnomalies')}</Typography>}
              {(anomQ.data ?? []).map((a) => (
                <Alert key={String(a.anomaly_id)} severity="warning" sx={{ mb: 1 }}>{String(a.explanation)}</Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('aiDq.pipelines')} />
            <CardContent>
              {(pipeQ.data ?? []).map((p) => (
                <Stack key={String(p.health_id)} direction="row" justifyContent="space-between" mb={1}>
                  <Typography>{String(p.pipeline_name)}</Typography>
                  <Chip size="small" label={String(p.status)} color={String(p.status) === 'healthy' ? 'success' : 'warning'} />
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