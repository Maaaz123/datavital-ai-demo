import { Alert, Box, Button, Card, CardContent, Chip, Grid, Link, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchOpsAiInsights } from '@/api/opsDemo';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import CompactPageHeader from '@/components/layout/CompactPageHeader';
import { formatDateTime } from '@/utils/format';

const sevColor: Record<string, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

export default function AiInsightsPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['ops-ai-insights'], queryFn: fetchOpsAiInsights });
  const insights = q.data?.insights ?? [];

  return (
    <Box>
      <CompactPageHeader
        title={t('opsDemo.insightsTitle')}
        subtitle={t('opsDemo.insightsSubtitle')}
        actions={
          <Button variant="outlined" size="small" onClick={() => q.refetch()} disabled={q.isFetching}>
            {t('opsDemo.insightsRefresh')}
          </Button>
        }
      />
      {q.isLoading ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState variant="inline" onRetry={() => q.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>{t('opsDemo.insightsDisclaimer')}</Alert>
      {!insights.length ? (
        <Alert severity="warning" sx={{ mb: 2 }}>{t('opsDemo.insightsEmpty')}</Alert>
      ) : null}
      <Grid container spacing={2}>
        {insights.map((ins) => (
          <Grid item xs={12} md={6} key={String(ins.insight_id)}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip size="small" color={sevColor[String(ins.severity)] ?? 'info'} label={String(ins.severity)} />
                  <Typography variant="caption">{formatDateTime(ins.generated_at as string)}</Typography>
                </Stack>
                <Typography variant="h6" gutterBottom>{String(ins.metric_name)}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {String(ins.facility_name ?? 'Network')} · {String(ins.domain ?? '—')}
                </Typography>
                <Typography variant="body2" mb={1}>
                  <strong>{t('opsDemo.current')}:</strong> {Number(ins.current_value ?? 0).toFixed(2)}{' '}
                  <strong>{t('opsDemo.baseline')}:</strong> {Number(ins.baseline_value ?? 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" mb={1}><strong>{t('opsDemo.evidence')}:</strong> {String(ins.evidence)}</Typography>
                <Typography variant="body2" mb={1}><strong>{t('opsDemo.dataSource')}:</strong> {String(ins.data_source)}</Typography>
                <Typography variant="body2" mb={1}><strong>{t('ux.recommendedAction')}:</strong> {String(ins.recommended_action)}</Typography>
                {ins.related_rule_id ? (
                  <Link component={RouterLink} to="/data-quality" variant="body2">
                    {t('opsDemo.relatedRule')}: {String(ins.related_rule_id)}
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
        </>
      )}
    </Box>
  );
}