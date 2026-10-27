import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export type RiskCategory = 'low' | 'moderate' | 'high' | 'critical' | 'unable_to_assess' | string;

function riskColor(category: RiskCategory): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (category) {
    case 'low':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'high':
      return 'error';
    case 'critical':
      return 'error';
    case 'unable_to_assess':
      return 'info';
    default:
      return 'default';
  }
}

interface RiskScoreBadgeProps {
  category: RiskCategory;
  score?: number | null;
  size?: 'small' | 'medium';
}

export default function RiskScoreBadge({ category, score, size = 'small' }: RiskScoreBadgeProps) {
  const { t } = useTranslation();
  const label = score != null
    ? `${t(`clinicalAi.risk.${category}`, category)} · ${(score * 100).toFixed(0)}%`
    : t(`clinicalAi.risk.${category}`, category);

  return (
    <Chip
      size={size}
      label={label}
      color={riskColor(category)}
      variant={category === 'unable_to_assess' ? 'outlined' : 'filled'}
      data-testid={`risk-badge-${category}`}
    />
  );
}
