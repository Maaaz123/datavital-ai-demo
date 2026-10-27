import { Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  confidence: number;
  band?: string;
}

export default function ConfidenceBadge({ confidence, band }: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  const isLow = confidence < 0.5;
  const pct = (confidence * 100).toFixed(0);
  const label = band
    ? `${t(`clinicalAi.confidence.${band}`, band)} · ${pct}%`
    : `${pct}%`;

  return (
    <Tooltip title={isLow ? t('clinicalAi.lowConfidenceWarning') : ''}>
      <Chip
        size="small"
        label={label}
        color={isLow ? 'warning' : confidence < 0.7 ? 'default' : 'success'}
        variant={isLow ? 'filled' : 'outlined'}
        sx={isLow ? { fontWeight: 700 } : undefined}
        data-testid="confidence-badge"
      />
    </Tooltip>
  );
}
