import { Alert, Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchClaimsAtRisk, fetchDenialReasons, fetchRevenueLeakage } from '@/api/ai';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import { PageHeader } from '@/components/ux';
import type { ChartPayload } from '@/types/api';
import { localizeDataLabel } from '@/i18n/localize';

export default function AiClaimPreventionPage() {
  const { t, i18n } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const claimsQ = useQuery({ queryKey: ['ai-claims', filters], queryFn: () => fetchClaimsAtRisk(filters) });
  const reasonsQ = useQuery({ queryKey: ['ai-denial-reasons', filters], queryFn: () => fetchDenialReasons(filters) });
  const leakQ = useQuery({ queryKey: ['ai-leakage', filters], queryFn: () => fetchRevenueLeakage(filters) });

  const claims = claimsQ.data?.claims ?? [];
  const atRiskValue = claims.reduce((s, c) => s + Number(c.claim_amount || 0) * Number(c.denial_probability || 0), 0);
  const chart: ChartPayload | undefined = useMemo(() => {
    const rows = reasonsQ.data ?? [];
    if (!rows.length) return undefined;
    return {
      chart_type: 'bar',
      title: t('aiClaim.byReason'),
      categories: rows.map((r) => String(r.predicted_reason).slice(0, 28)),
      series: [{ name: 'Claims', data: rows.map((r) => Number(r.claim_count)) }],
    };
  }, [reasonsQ.data, t]);


  return (
    <Box>
      <PageHeader title={t('aiClaim.title')} description={t('aiClaim.subtitle')} />
      {claimsQ.isLoading ? (
        <LoadingSkeleton />
      ) : claimsQ.isError ? (
        <ErrorState variant="inline" onRetry={() => claimsQ.refetch()} />
      ) : (
        <>
<Alert severity="info" sx={{ mb: 2 }}>{claimsQ.data?.policy}</Alert>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiClaim.claimsAtRisk')}</Typography><Typography variant="h3">{claims.length}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiClaim.valueAtRisk')}</Typography><Typography variant="h3">{atRiskValue.toFixed(0)}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="overline">{t('aiClaim.avgDenialProb')}</Typography><Typography variant="h3">{claims.length ? `${((claims.reduce((s, c) => s + Number(c.denial_probability), 0) / claims.length) * 100).toFixed(0)}%` : '—'}</Typography></CardContent></Card></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}><Card><CardHeader title={t('aiClaim.byReason')} /><CardContent><EChart payload={chart} /></CardContent></Card></Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('aiClaim.claimsTable')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('data.columns.claim')}</TableCell><TableCell>{t('data.columns.payer')}</TableCell><TableCell>{t('data.columns.risk')}</TableCell><TableCell>{t('data.columns.reason')}</TableCell><TableCell>{t('data.columns.action')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {claims.slice(0, 20).map((c) => (
                    <TableRow key={String(c.prediction_id)}>
                      <TableCell>{String(c.claim_id)}</TableCell>
                      <TableCell>{localizeDataLabel(String(c.payer_name), t, i18n.language)}</TableCell>
                      <TableCell><Chip size="small" label={`${localizeDataLabel(String(c.risk_level), t, i18n.language)} ${(Number(c.denial_probability) * 100).toFixed(0)}%`} /></TableCell>
                      <TableCell>{localizeDataLabel(String(c.predicted_reason), t, i18n.language)}</TableCell>
                      <TableCell>{localizeDataLabel(String(c.recommended_action), t, i18n.language)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('aiClaim.leakage')} />
            <CardContent>
              {(leakQ.data ?? []).map((l) => (
                <Stack key={String(l.leakage_id)} direction="row" justifyContent="space-between" mb={1}>
                  <Typography>{String(l.hospital_name)} · {String(l.leakage_type)}</Typography>
                  <Typography fontWeight={600}>{Number(l.estimated_amount).toLocaleString()}</Typography>
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