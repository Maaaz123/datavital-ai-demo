import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  activateGovernanceKillSwitch,
  createGovernanceIncident,
  fetchGovernanceBias,
  fetchGovernanceIncidents,
  fetchGovernanceOverview,
  rollbackGovernanceModel,
  updateGovernanceIncident,
} from '@/api/clinicalAi';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';
import {
  BiasMonitoringPanel,
  ClinicalAIPageHeader,
  ClinicalIncidentPanel,
  ClinicalSafetyBanner,
} from '@/components/clinical-ai';

export default function GovernancePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [killOpen, setKillOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [modelCode, setModelCode] = useState('');
  const [reason, setReason] = useState('');
  const [version, setVersion] = useState('');

  const overviewQ = useQuery({ queryKey: ['cai-gov-overview'], queryFn: fetchGovernanceOverview });
  const biasQ = useQuery({ queryKey: ['cai-gov-bias'], queryFn: fetchGovernanceBias });
  const incidentsQ = useQuery({ queryKey: ['cai-gov-incidents'], queryFn: fetchGovernanceIncidents });

  const createMut = useMutation({
    mutationFn: createGovernanceIncident,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-gov-incidents'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string | number; body: Record<string, unknown> }) => updateGovernanceIncident(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-gov-incidents'] }),
  });

  const killMut = useMutation({
    mutationFn: () => activateGovernanceKillSwitch({ model_code: modelCode, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cai-gov-overview'] });
      setKillOpen(false);
      setReason('');
      setModelCode('');
    },
  });

  const rollbackMut = useMutation({
    mutationFn: () => rollbackGovernanceModel({ model_code: modelCode, version, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cai-gov-overview'] });
      setRollbackOpen(false);
      setReason('');
      setModelCode('');
      setVersion('');
    },
  });

  const overview = overviewQ.data ?? {};
  const kpis: KPICardData[] = [
    { key: 'models', label: t('clinicalGovernance.activeModels'), value: Number(overview.active_models ?? 0), severity: 'healthy' },
    { key: 'incidents', label: t('clinicalGovernance.openIncidents'), value: Number(overview.open_incidents ?? 0), severity: 'warning' },
    { key: 'suspended', label: t('clinicalGovernance.suspendedModels'), value: Number(overview.suspended_models ?? 0), severity: 'critical' },
  ];


  return (
    <Box>
      <ClinicalAIPageHeader
        title={t('clinicalGovernance.title')}
        subtitle={t('clinicalGovernance.subtitle')}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" onClick={() => setKillOpen(true)}>
              {t('clinicalGovernance.killSwitch')}
            </Button>
            <Button variant="outlined" color="warning" onClick={() => setRollbackOpen(true)}>
              {t('clinicalGovernance.rollback')}
            </Button>
          </Stack>
        }
      />
      <ClinicalSafetyBanner />
      {overviewQ.isLoading ? (
        <LoadingSkeleton />
      ) : overviewQ.isError ? (
        <ErrorState variant="inline" onRetry={() => overviewQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={4} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>

      {(Boolean(overview.kill_switch_active) || Boolean(overview.any_kill_switch)) && (
        <Alert severity="error" sx={{ mb: 2 }}>{t('clinicalGovernance.killSwitchActive')}</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalGovernance.biasMonitoring')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <BiasMonitoringPanel rows={biasQ.data ?? []} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={t('clinicalGovernance.incidents')} />
            <CardContent>
              <ClinicalIncidentPanel
                incidents={incidentsQ.data ?? []}
                creating={createMut.isPending}
                onCreate={(body) => createMut.mutate(body)}
                onUpdate={(id, body) => updateMut.mutate({ id, body })}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalGovernance.modelRegistry')} />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t('clinicalGovernance.registryNote')}
              </Typography>
              {Array.isArray(overview.models) && (overview.models as Record<string, unknown>[]).map((m, i) => (
                <Typography key={i} variant="body2" mt={1}>
                  {String(m.model_code)} · v{String(m.active_version ?? '—')} · {String(m.status ?? '—')}
                  {m.kill_switch ? ` · ${t('clinicalGovernance.killSwitch')}` : null}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={killOpen} onClose={() => setKillOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('clinicalGovernance.killSwitch')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>{t('clinicalGovernance.killSwitchWarning')}</Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label={t('clinicalGovernance.model')} value={modelCode} onChange={(e) => setModelCode(e.target.value)} fullWidth required />
            <TextField size="small" label={t('clinicalGovernance.reason')} value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} fullWidth required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKillOpen(false)}>{t('app.no')}</Button>
          <Button variant="contained" color="error" disabled={killMut.isPending || !modelCode || !reason} onClick={() => killMut.mutate()}>
            {t('clinicalGovernance.activateKillSwitch')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rollbackOpen} onClose={() => setRollbackOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('clinicalGovernance.rollback')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label={t('clinicalGovernance.model')} value={modelCode} onChange={(e) => setModelCode(e.target.value)} fullWidth required />
            <TextField size="small" label={t('clinicalGovernance.version')} value={version} onChange={(e) => setVersion(e.target.value)} fullWidth required />
            <TextField size="small" label={t('clinicalGovernance.reason')} value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} fullWidth required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackOpen(false)}>{t('app.no')}</Button>
          <Button variant="contained" color="warning" disabled={rollbackMut.isPending || !modelCode || !version || !reason} onClick={() => rollbackMut.mutate()}>
            {t('clinicalGovernance.confirmRollback')}
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
}
