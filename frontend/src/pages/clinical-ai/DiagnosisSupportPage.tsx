import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  acceptDiagnosisSuggestion,
  analyzeDiagnosis,
  fetchDiagnosisEncounter,
  fetchDiagnosisModelPerformance,
  fetchDiagnosisPatient,
  feedbackDiagnosisSuggestion,
  rejectDiagnosisSuggestion,
} from '@/api/clinicalAi';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import {
  ClinicalAIPageHeader,
  ClinicalEvidencePanel,
  ClinicalSafetyBanner,
  ConfidenceBadge,
  ContradictoryEvidencePanel,
  MissingDataPanel,
  ModelLimitationsPanel,
  ModelPerformancePanel,
} from '@/components/clinical-ai';

/** Deterministic demo patient with Gold suggestions (evidence-based CDS, not generative LLM). */
const DEMO_PATIENT_ID = '286';

export default function DiagnosisSupportPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [encounterId, setEncounterId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [demoBootstrapped, setDemoBootstrapped] = useState(false);

  const patientQ = useQuery({
    queryKey: ['cai-dx-patient', patientId],
    queryFn: () => fetchDiagnosisPatient(patientId),
    enabled: !!patientId,
  });

  const encounterQ = useQuery({
    queryKey: ['cai-dx-encounter', encounterId],
    queryFn: () => fetchDiagnosisEncounter(encounterId),
    enabled: !!encounterId,
  });

  const perfQ = useQuery({ queryKey: ['cai-dx-perf'], queryFn: fetchDiagnosisModelPerformance });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeDiagnosis({
      patient_id: patientId || undefined,
      encounter_id: encounterId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cai-dx-patient'] });
      qc.invalidateQueries({ queryKey: ['cai-dx-encounter'] });
    },
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptDiagnosisSuggestion(id, { notes: t('clinicalDiagnosis.acceptedForReview') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-dx-patient'] }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectDiagnosisSuggestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-dx-patient'] }),
  });

  const feedbackMut = useMutation({
    mutationFn: (id: string) => feedbackDiagnosisSuggestion(id, { was_clinically_useful: true }),
  });

  const data = encounterQ.data ?? patientQ.data ?? analyzeMut.data ?? {};
  const suggestions = (data.suggestions ?? data.possible_diagnoses ?? []) as Record<string, unknown>[];
  const confirmed = (data.confirmed_diagnoses ?? []) as Record<string, unknown>[];
  const active = suggestions.find((s) => String(s.suggestion_id ?? s.id) === activeId) ?? suggestions[0];

  useEffect(() => {
    if (demoBootstrapped || !patientId) return;
    setDemoBootstrapped(true);
    analyzeMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time demo bootstrap
  }, [patientId, demoBootstrapped]);

  const summaryText = (value: unknown) => {
    const s = value == null ? '' : String(value).trim();
    return s && s.toLowerCase() !== 'null' ? s : '—';
  };

  return (
    <Box>
      <ClinicalAIPageHeader
        title={t('clinicalDiagnosis.title')}
        subtitle={t('clinicalDiagnosis.subtitle')}
        actions={
          <Button
            variant="contained"
            disabled={analyzeMut.isPending || (!patientId && !encounterId)}
            onClick={() => analyzeMut.mutate()}
          >
            {t('clinicalDiagnosis.analyze')}
          </Button>
        }
      />
      <ClinicalSafetyBanner />
      {(patientQ.isLoading || analyzeMut.isPending) && !!patientId && !suggestions.length ? (
        <LoadingSkeleton />
      ) : patientQ.isError ? (
        <ErrorState variant="inline" onRetry={() => patientQ.refetch()} />
      ) : (
        <>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('clinicalDiagnosis.demoBootstrapNotice')}
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              label={t('clinicalDiagnosis.patientId')}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label={t('clinicalDiagnosis.encounterId')}
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <Button variant="outlined" onClick={() => patientId && patientQ.refetch()}>
              {t('clinicalDiagnosis.loadPatient')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalDiagnosis.clinicalSummary')} />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                <strong>{t('clinicalDiagnosis.presentingComplaint')}:</strong>{' '}
                {String(data.presenting_complaint ?? '—')}
              </Typography>
              <Typography variant="subtitle2" mt={2}>{t('clinicalDiagnosis.confirmedDiagnoses')}</Typography>
              {confirmed.length ? confirmed.map((d, i) => (
                <Typography key={i} variant="body2">• {String(d.description ?? d.code ?? '—')}</Typography>
              )) : <Typography variant="body2" color="text.secondary">—</Typography>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('clinicalDiagnosis.possibleDiagnoses')} />
            <CardContent>
              <Stack spacing={1}>
                {suggestions.map((s) => {
                  const id = String(s.suggestion_id ?? s.id ?? Math.random());
                  return (
                    <Box
                      key={id}
                      p={1}
                      border={1}
                      borderColor={activeId === id || (!activeId && s === suggestions[0]) ? 'primary.main' : 'divider'}
                      borderRadius={1}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setActiveId(id)}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {t('clinicalDiagnosis.candidateLabel')}
                      </Typography>
                      <Typography variant="body2">{String(s.diagnosis_description ?? s.candidate ?? '—')}</Typography>
                      {s.confidence != null && <ConfidenceBadge confidence={Number(s.confidence)} band={String(s.confidence_band ?? '')} />}
                    </Box>
                  );
                })}
                {!suggestions.length && <Typography color="text.secondary">{t('clinicalDiagnosis.noSuggestions')}</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {active && (
            <Card sx={{ mb: 2 }}>
              <CardHeader title={String(active.diagnosis_description ?? active.candidate ?? t('clinicalDiagnosis.suggestionDetail'))} />
              <CardContent>
                <Stack spacing={2}>
                  <ClinicalEvidencePanel evidence={(active.supporting_evidence ?? active.evidence_for ?? []) as (string | Record<string, unknown>)[]} />
                  <ContradictoryEvidencePanel evidence={(active.contradictory_evidence ?? active.evidence_against ?? []) as (string | Record<string, unknown>)[]} />
                  <MissingDataPanel items={(active.missing_information ?? active.missing_data ?? []) as (string | Record<string, unknown>)[]} />
                  <ModelLimitationsPanel limitations={(active.model_limitations ?? active.limitations ?? []) as (string | Record<string, unknown>)[]} />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => acceptMut.mutate(String(active.suggestion_id ?? active.id))}
                      disabled={acceptMut.isPending}
                    >
                      {t('clinicalDiagnosis.acceptForReview')}
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => rejectMut.mutate(String(active.suggestion_id ?? active.id))}>
                      {t('clinicalDiagnosis.reject')}
                    </Button>
                    <Button size="small" onClick={() => feedbackMut.mutate(String(active.suggestion_id ?? active.id))}>
                      {t('clinicalDiagnosis.feedback')}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card><CardHeader title={t('clinicalDiagnosis.labSummary')} /><CardContent>
                <Typography variant="body2" color="text.secondary">{summaryText(data.laboratory_summary)}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card><CardHeader title={t('clinicalDiagnosis.radSummary')} /><CardContent>
                <Typography variant="body2" color="text.secondary">{summaryText(data.radiology_summary)}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card><CardHeader title={t('clinicalDiagnosis.medSummary')} /><CardContent>
                <Typography variant="body2" color="text.secondary">{summaryText(data.medication_summary)}</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 2 }}>
            <CardHeader title={t('clinicalDiagnosis.modelPerformance')} />
            <CardContent><ModelPerformancePanel rows={perfQ.data ?? []} /></CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}
