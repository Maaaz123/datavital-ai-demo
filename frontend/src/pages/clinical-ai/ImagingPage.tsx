import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  acceptImagingStudy,
  analyzeImagingStudy,
  fetchImagingCriticalStudies,
  fetchImagingModelPerformance,
  fetchImagingQualityIssues,
  fetchImagingStudy,
  fetchImagingWorklist,
  rejectImagingStudy,
  reviewImagingStudy,
} from '@/api/clinicalAi';
import { useFilterStore } from '@/store/filterStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';
import {
  ClinicalAIPageHeader,
  ClinicalReviewForm,
  ClinicalSafetyBanner,
  ConfidenceBadge,
  ModelLimitationsPanel,
  ModelPerformancePanel,
} from '@/components/clinical-ai';

export default function ImagingPage() {
  const { t } = useTranslation();
  const filters = useFilterStore((s) => s.filters);
  const qc = useQueryClient();
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);

  const worklistQ = useQuery({ queryKey: ['cai-img-worklist', filters], queryFn: () => fetchImagingWorklist(filters) });
  const criticalQ = useQuery({ queryKey: ['cai-img-critical', filters], queryFn: () => fetchImagingCriticalStudies(filters) });
  const qualityQ = useQuery({ queryKey: ['cai-img-quality', filters], queryFn: () => fetchImagingQualityIssues(filters) });
  const perfQ = useQuery({ queryKey: ['cai-img-perf'], queryFn: fetchImagingModelPerformance });
  const studyQ = useQuery({
    queryKey: ['cai-img-study', selectedStudy],
    queryFn: () => fetchImagingStudy(selectedStudy!),
    enabled: !!selectedStudy,
  });

  const analyzeMut = useMutation({
    mutationFn: (id: string) => analyzeImagingStudy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cai-img-study'] }),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note: string }) =>
      reviewImagingStudy(id, { review_status: status, notes: note }),
  });

  const acceptMut = useMutation({ mutationFn: (id: string) => acceptImagingStudy(id) });
  const rejectMut = useMutation({ mutationFn: (id: string) => rejectImagingStudy(id) });

  const worklist = worklistQ.data ?? [];
  const study = studyQ.data ?? worklist.find((s) => String(s.study_id) === selectedStudy) ?? {};

  const kpis: KPICardData[] = [
    { key: 'critical', label: t('clinicalImaging.criticalCount'), value: criticalQ.data?.length ?? 0, severity: 'critical' },
    { key: 'pending', label: t('clinicalImaging.pendingReview'), value: worklist.filter((s) => !s.review_status).length, severity: 'warning' },
    { key: 'quality', label: t('clinicalImaging.qualityIssues'), value: qualityQ.data?.length ?? 0, severity: 'info' },
  ];


  return (
    <Box>
      <ClinicalAIPageHeader title={t('clinicalImaging.title')} subtitle={t('clinicalImaging.subtitle')} />
      <ClinicalSafetyBanner />
      {worklistQ.isLoading ? (
        <LoadingSkeleton />
      ) : worklistQ.isError ? (
        <ErrorState variant="inline" onRetry={() => worklistQ.refetch()} />
      ) : (
        <>


      <Grid container spacing={2} mb={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={4} key={kpi.key}><KPICard kpi={kpi} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={t('clinicalImaging.worklist')} />
            <CardContent sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('clinicalImaging.studyId')}</TableCell>
                    <TableCell>{t('clinicalImaging.modality')}</TableCell>
                    <TableCell>{t('clinicalImaging.priority')}</TableCell>
                    <TableCell>{t('clinicalImaging.possibleFinding')}</TableCell>
                    <TableCell>{t('clinicalImaging.confidence')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {worklist.map((s) => {
                    const id = String(s.study_id);
                    return (
                      <TableRow
                        key={id}
                        hover
                        selected={selectedStudy === id}
                        onClick={() => setSelectedStudy(id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{id}</TableCell>
                        <TableCell>{String(s.modality ?? '—')}</TableCell>
                        <TableCell>
                          <Chip size="small" label={String(s.priority ?? s.study_priority ?? '—')} color={String(s.priority) === 'critical' ? 'error' : 'default'} />
                        </TableCell>
                        <TableCell>{String(s.possible_finding ?? s.ai_finding ?? '—')}</TableCell>
                        <TableCell>
                          {s.confidence != null && <ConfidenceBadge confidence={Number(s.confidence)} />}
                        </TableCell>
                        <TableCell>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); analyzeMut.mutate(id); }}>
                            {t('clinicalImaging.analyze')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t('clinicalImaging.studyDetail')} />
            <CardContent>
              {!selectedStudy ? (
                <Typography color="text.secondary">{t('clinicalImaging.selectStudy')}</Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body2"><strong>{t('clinicalImaging.modality')}:</strong> {String(study.modality ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalImaging.bodyRegion')}:</strong> {String(study.body_region ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalImaging.indication')}:</strong> {String(study.clinical_indication ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalImaging.possibleFinding')}:</strong> {String(study.possible_finding ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalImaging.imageQuality')}:</strong> {String(study.image_quality_score ?? study.quality_warning ?? '—')}</Typography>
                  <Typography variant="body2"><strong>{t('clinicalImaging.modelVersion')}:</strong> {String(study.model_version ?? '—')}</Typography>
                  <ModelLimitationsPanel limitations={(study.model_limitations ?? []) as (string | Record<string, unknown>)[]} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={() => acceptMut.mutate(selectedStudy)}>{t('clinicalImaging.accept')}</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => rejectMut.mutate(selectedStudy)}>{t('clinicalImaging.reject')}</Button>
                  </Stack>
                  <ClinicalReviewForm
                    loading={reviewMut.isPending}
                    onSubmit={(status, note) => reviewMut.mutate({ id: selectedStudy, status, note })}
                  />
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('clinicalImaging.qualityIssues')} />
            <CardContent>
              {(qualityQ.data ?? []).slice(0, 8).map((q, i) => (
                <Typography key={i} variant="body2" mb={0.5}>• {String(q.issue ?? q.quality_warning ?? '—')}</Typography>
              ))}
              {!qualityQ.data?.length && <Typography color="text.secondary">{t('app.noData')}</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('clinicalImaging.modelPerformance')} />
            <CardContent><ModelPerformancePanel rows={perfQ.data ?? []} /></CardContent>
          </Card>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}
