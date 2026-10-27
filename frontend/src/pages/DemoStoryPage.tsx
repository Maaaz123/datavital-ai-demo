import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchExecutiveSummary } from '@/api/executive';
import { fetchBedsSummary } from '@/api/beds';
import { useFilterStore } from '@/store/filterStore';
import { PageHeader } from '@/components/ux';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';

interface DemoStep {
  path: string;
  titleKey: string;
  narrativeKey: string;
  kpiSource?: 'executive' | 'beds';
}

const DEMO_STEPS: DemoStep[] = [
  { path: '/dashboard', titleKey: 'demo.step1.title', narrativeKey: 'demo.step1.narrative', kpiSource: 'executive' },
  { path: '/alerts', titleKey: 'demo.step2.title', narrativeKey: 'demo.step2.narrative' },
  { path: '/beds', titleKey: 'demo.step3.title', narrativeKey: 'demo.step3.narrative', kpiSource: 'beds' },
  { path: '/ai/emergency-intelligence', titleKey: 'demo.step4.title', narrativeKey: 'demo.step4.narrative' },
  { path: '/copilot', titleKey: 'demo.step5.title', narrativeKey: 'demo.step5.narrative' },
  { path: '/patients', titleKey: 'demo.step6.title', narrativeKey: 'demo.step6.narrative' },
  { path: '/ai/data-quality-agent', titleKey: 'demo.step7.title', narrativeKey: 'demo.step7.narrative' },
  { path: '/integration/data-platform', titleKey: 'demo.step8.title', narrativeKey: 'demo.step8.narrative' },
  { path: '/data/catalog', titleKey: 'demo.step8.title', narrativeKey: 'demo.step8.narrative' },
  { path: '/clinical-ai/governance', titleKey: 'demo.step9.title', narrativeKey: 'demo.step9.narrative' },
  { path: '/command-center', titleKey: 'demo.step10.title', narrativeKey: 'demo.step10.narrative' },
];

function navigateWithFilters(navigate: ReturnType<typeof useNavigate>, path: string) {
  navigate(`${path}${window.location.search}`);
}

export default function DemoStoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useFilterStore((s) => s.filters);
  const [activeStep, setActiveStep] = useState(0);

  const step = DEMO_STEPS[activeStep];

  const executiveQuery = useQuery({
    queryKey: ['demo-executive', filters],
    queryFn: () => fetchExecutiveSummary(filters),
    enabled: step.kpiSource === 'executive',
  });

  const bedsQuery = useQuery({
    queryKey: ['demo-beds', filters],
    queryFn: () => fetchBedsSummary(filters),
    enabled: step.kpiSource === 'beds',
  });

  const kpiPeek = useMemo<KPICardData[]>(() => {
    if (step.kpiSource === 'executive') {
      return (executiveQuery.data?.data ?? []).slice(0, 3);
    }
    if (step.kpiSource === 'beds') {
      return (bedsQuery.data?.data ?? []).slice(0, 3);
    }
    return [];
  }, [step.kpiSource, executiveQuery.data?.data, bedsQuery.data?.data]);

  const isLastStep = activeStep === DEMO_STEPS.length - 1;

  return (
    <Box>
      <PageHeader title={t('demo.title')} description={t('demo.subtitle')} />

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {DEMO_STEPS.map((s, index) => (
          <Step key={s.path} completed={index < activeStep}>
            <StepLabel>{t(s.titleKey)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            {t('demo.stepLabel', { step: activeStep + 1, total: DEMO_STEPS.length })}
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mt: 1 }}>
            {t(step.titleKey)}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {t(step.narrativeKey)}
          </Typography>

          {step.kpiSource && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('demo.liveKpiPeek')}
              </Typography>
              {(step.kpiSource === 'executive' ? executiveQuery.isLoading : bedsQuery.isLoading) ? (
                <Typography variant="body2" color="text.secondary">…</Typography>
              ) : kpiPeek.length > 0 ? (
                <Grid container spacing={2}>
                  {kpiPeek.map((kpi) => (
                    <Grid item xs={12} sm={4} key={kpi.key}>
                      <KPICard kpi={kpi} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('app.noData')}</Typography>
              )}
            </Box>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} flexWrap="wrap">
            <Button
              variant="outlined"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((s) => s - 1)}
            >
              {t('demo.back')}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigateWithFilters(navigate, step.path)}
            >
              {t('demo.openWorkspace')}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                if (isLastStep) {
                  navigateWithFilters(navigate, '/command-center');
                } else {
                  setActiveStep((s) => s + 1);
                }
              }}
            >
              {isLastStep ? t('demo.finish') : t('demo.next')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
