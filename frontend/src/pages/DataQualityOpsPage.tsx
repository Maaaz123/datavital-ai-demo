import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchOpsDqEvidence, fetchOpsDqOverview, fetchOpsDqRules } from '@/api/opsDemo';
import KPICard from '@/components/common/KPICard';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import EChart from '@/components/charts/EChart';
import CompactPageHeader from '@/components/layout/CompactPageHeader';
import type { ChartPayload } from '@/types/api';

const severityColor: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

export default function DataQualityOpsPage() {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [facility, setFacility] = useState('');
  const [selectedRun, setSelectedRun] = useState<number | null>(null);

  const overviewQ = useQuery({ queryKey: ['ops-dq-overview'], queryFn: fetchOpsDqOverview });
  const rulesQ = useQuery({
    queryKey: ['ops-dq-rules', domain, severity, status, facility],
    queryFn: () =>
      fetchOpsDqRules({
        domain: domain || undefined,
        severity: severity || undefined,
        status: status || undefined,
        facility: facility || undefined,
        page: 1,
        page_size: 50,
      }),
  });
  const evidenceQ = useQuery({
    queryKey: ['ops-dq-evidence', selectedRun],
    queryFn: () => fetchOpsDqEvidence(selectedRun!),
    enabled: selectedRun != null,
  });

  const dimChart: ChartPayload | undefined = useMemo(() => {
    const rows = overviewQ.data?.dimensions ?? [];
    if (!rows.length) return undefined;
    return {
      chart_type: 'bar',
      categories: rows.map((r) => String(r.dimension)),
      series: [{ name: 'Score', data: rows.map((r) => Number(r.score ?? 0)) }],
    };
  }, [overviewQ.data?.dimensions]);

  const hospitalChart: ChartPayload | undefined = useMemo(() => {
    const rows = overviewQ.data?.by_hospital ?? [];
    if (!rows.length) return undefined;
    return {
      chart_type: 'bar',
      categories: rows.map((r) => String(r.facility_name)),
      series: [{ name: 'Score', data: rows.map((r) => Number(r.score ?? 0)) }],
    };
  }, [overviewQ.data?.by_hospital]);

  const domainChart: ChartPayload | undefined = useMemo(() => {
    const rows = overviewQ.data?.by_domain ?? [];
    if (!rows.length) return undefined;
    return {
      chart_type: 'bar',
      categories: rows.map((r) => String(r.domain)),
      series: [{ name: 'Score', data: rows.map((r) => Number(r.score ?? 0)) }],
    };
  }, [overviewQ.data?.by_domain]);

  const facilities = (overviewQ.data?.by_hospital ?? []).map((r) => String(r.facility_name));
  const domains = (overviewQ.data?.by_domain ?? []).map((r) => String(r.domain));

  return (
    <Box>
      <CompactPageHeader title={t('opsDemo.dqTitle')} subtitle={t('opsDemo.dqSubtitle')} />
      {overviewQ.isLoading ? (
        <LoadingSkeleton />
      ) : overviewQ.isError ? (
        <ErrorState variant="inline" onRetry={() => overviewQ.refetch()} />
      ) : !overviewQ.data?.ready ? (
        <Alert severity="warning">{t('opsDemo.notReady')}</Alert>
      ) : (
        <>
      <Grid container spacing={1.5} mb={2}>
        {(overviewQ.data.kpis ?? []).map((kpi) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.key}>
            <KPICard kpi={kpi} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={4}><Card><CardHeader title={t('opsDemo.dimensions')} /><CardContent><EChart payload={dimChart} height={280} /></CardContent></Card></Grid>
        <Grid item xs={12} md={4}><Card><CardHeader title={t('opsDemo.byHospital')} /><CardContent><EChart payload={hospitalChart} height={280} /></CardContent></Card></Grid>
        <Grid item xs={12} md={4}><Card><CardHeader title={t('opsDemo.byDomain')} /><CardContent><EChart payload={domainChart} height={280} /></CardContent></Card></Grid>
        <Grid item xs={12}><Card><CardHeader title={t('opsDemo.trend12m')} /><CardContent><EChart payload={overviewQ.data.trend_12m} height={300} /></CardContent></Card></Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardHeader title={t('opsDemo.failedRules')} />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('app.hospital')}</InputLabel>
              <Select label={t('app.hospital')} value={facility} onChange={(e) => setFacility(e.target.value)}>
                <MenuItem value="">{t('app.all')}</MenuItem>
                {facilities.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('opsDemo.domain')}</InputLabel>
              <Select label={t('opsDemo.domain')} value={domain} onChange={(e) => setDomain(e.target.value)}>
                <MenuItem value="">{t('app.all')}</MenuItem>
                {domains.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('opsDemo.severity')}</InputLabel>
              <Select label={t('opsDemo.severity')} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <MenuItem value="">{t('app.all')}</MenuItem>
                <MenuItem value="critical">critical</MenuItem>
                <MenuItem value="warning">warning</MenuItem>
                <MenuItem value="info">info</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('opsDemo.status')}</InputLabel>
              <Select label={t('opsDemo.status')} value={status} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">{t('app.all')}</MenuItem>
                <MenuItem value="open">open</MenuItem>
                <MenuItem value="resolved">resolved</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('opsDemo.rule')}</TableCell>
                <TableCell>{t('opsDemo.dimension')}</TableCell>
                <TableCell>{t('opsDemo.table')}</TableCell>
                <TableCell>{t('opsDemo.column')}</TableCell>
                <TableCell>{t('opsDemo.severity')}</TableCell>
                <TableCell align="right">{t('opsDemo.failed')}</TableCell>
                <TableCell align="right">{t('opsDemo.failurePct')}</TableCell>
                <TableCell>{t('opsDemo.owner')}</TableCell>
                <TableCell>{t('opsDemo.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rulesQ.data?.data ?? []).map((row) => (
                <TableRow
                  key={String(row.run_id)}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedRun(Number(row.run_id))}
                >
                  <TableCell>{String(row.rule_id)}</TableCell>
                  <TableCell>{String(row.dimension)}</TableCell>
                  <TableCell>{String(row.table_name)}</TableCell>
                  <TableCell>{String(row.column_name ?? '—')}</TableCell>
                  <TableCell><Chip size="small" color={severityColor[String(row.severity)] ?? 'default'} label={String(row.severity)} /></TableCell>
                  <TableCell align="right">{Number(row.records_failed ?? 0) + Number(row.records_warning ?? 0)}</TableCell>
                  <TableCell align="right">{Number(row.failure_pct ?? 0).toFixed(2)}%</TableCell>
                  <TableCell>{String(row.owner)}</TableCell>
                  <TableCell>{String(row.resolution_status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t('opsDemo.freshness')} />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('opsDemo.rule')}</TableCell>
                <TableCell>{t('opsDemo.table')}</TableCell>
                <TableCell>{t('opsDemo.status')}</TableCell>
                <TableCell>{t('opsDemo.failurePct')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(overviewQ.data.freshness ?? []).map((row) => (
                <TableRow key={String(row.rule_id)}>
                  <TableCell>{String(row.rule_id)}</TableCell>
                  <TableCell>{String(row.table_name)}</TableCell>
                  <TableCell>{String(row.status)}</TableCell>
                  <TableCell>{Number(row.failure_pct ?? 0).toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selectedRun != null} onClose={() => setSelectedRun(null)} maxWidth="md" fullWidth>
        <DialogTitle>{t('opsDemo.evidence')}</DialogTitle>
        <DialogContent>
          {evidenceQ.isLoading && <Typography>{t('app.refresh')}…</Typography>}
          {evidenceQ.data && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {String((evidenceQ.data.rule as Record<string, unknown> | undefined)?.rule_id ?? '')} ·{' '}
                {String((evidenceQ.data.rule as Record<string, unknown> | undefined)?.facility_name ?? '')}
              </Typography>
              <Typography variant="subtitle2">{t('opsDemo.sampleRecords')}</Typography>
              <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto', fontSize: 12 }}>
                {JSON.stringify(evidenceQ.data.evidence ?? [], null, 2)}
              </Box>
              <Typography variant="subtitle2">{t('opsDemo.quarantine')}</Typography>
              <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto', fontSize: 12 }}>
                {JSON.stringify(evidenceQ.data.quarantine ?? [], null, 2)}
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </Box>
  );
}
