import { Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { cssVar, cssVarNames } from '@/design-system/colors';
import type { TrendDirection } from './types';

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number | string | null;
  label?: string;
  /**
   * When provided, colors by business favorability (not raw up/down).
   * True = favorable change (green); false = unfavorable (red).
   */
  isImprovement?: boolean | null;
  /** @deprecated Prefer isImprovement. When true, upward movement is treated as good. */
  positiveIsGood?: boolean;
}

function trendColor(
  direction: TrendDirection,
  isImprovement?: boolean | null,
  positiveIsGood?: boolean,
): string {
  if (direction === 'flat') return cssVar(cssVarNames.inactive);
  if (isImprovement != null) {
    return isImprovement ? cssVar(cssVarNames.healthy) : cssVar(cssVarNames.critical);
  }
  const isUp = direction === 'up';
  const isGood = positiveIsGood ?? isUp;
  return isGood ? cssVar(cssVarNames.healthy) : cssVar(cssVarNames.critical);
}

export default function TrendIndicator({
  direction,
  value,
  label,
  isImprovement,
  positiveIsGood,
}: TrendIndicatorProps) {
  const color = trendColor(direction, isImprovement, positiveIsGood);
  const Icon =
    direction === 'up' ? TrendingUpIcon : direction === 'down' ? TrendingDownIcon : TrendingFlatIcon;

  const formattedValue =
    value == null
      ? null
      : typeof value === 'number'
        ? `${value > 0 ? '+' : ''}${value}%`
        : String(value);

  const favorLabel =
    isImprovement == null ? null : isImprovement ? 'favorable' : 'unfavorable';

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      aria-label={
        label ??
        `Trend ${direction}${formattedValue ? ` ${formattedValue}` : ''}${favorLabel ? `, ${favorLabel}` : ''}`
      }
      data-testid={`trend-indicator-${direction}`}
      data-improvement={isImprovement == null ? undefined : String(isImprovement)}
    >
      <Icon sx={{ fontSize: 16, color }} aria-hidden />
      {formattedValue && (
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
          {formattedValue}
        </Typography>
      )}
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
    </Stack>
  );
}
