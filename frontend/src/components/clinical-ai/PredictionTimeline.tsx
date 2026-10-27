import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RiskScoreBadge from './RiskScoreBadge';
import ConfidenceBadge from './ConfidenceBadge';

interface PredictionTimelineProps {
  predictions: Record<string, unknown>[];
}

export default function PredictionTimeline({ predictions }: PredictionTimelineProps) {
  const { t } = useTranslation();

  if (!predictions?.length) {
    return <Typography variant="body2" color="text.secondary">{t('clinicalAi.noPredictions')}</Typography>;
  }

  return (
    <Stack spacing={1}>
      {predictions.map((p, idx) => (
        <Box
          key={String(p.prediction_id ?? idx)}
          sx={{
            pl: 2,
            borderLeft: 2,
            borderColor: 'divider',
            py: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {String(p.predicted_at ?? p.timestamp ?? '—')}
            {p.horizon_hours != null ? ` · ${p.horizon_hours}h` : null}
            {p.prediction_horizon != null ? ` · ${String(p.prediction_horizon)}` : null}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
            <RiskScoreBadge
              category={String(p.risk_category ?? p.risk_level ?? 'low')}
              score={p.risk_score != null ? Number(p.risk_score) : undefined}
            />
            {p.confidence != null && <ConfidenceBadge confidence={Number(p.confidence)} />}
          </Stack>
          {p.model_version != null && (
            <Typography variant="caption" color="text.secondary" display="block">
              {t('clinicalAi.modelVersion')}: {String(p.model_version)}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
