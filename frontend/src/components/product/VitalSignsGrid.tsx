import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { brand } from '@/design-system/colors';
import type { KPICardData } from '@/types/api';
import { localizeKpiLabel } from '@/i18n/localize';
import { useTranslation } from 'react-i18next';
import { formatKpiValue } from '@/utils/formatKpiValue';

function severityColor(severity: KPICardData['severity']): string {
  if (severity === 'critical') return brand.critical;
  if (severity === 'warning') return brand.warning;
  if (severity === 'healthy') return brand.positive;
  return brand.primaryBlue;
}

function trendLabel(kpi: KPICardData): string | null {
  if (kpi.trend == null || !Number.isFinite(Number(kpi.trend))) return null;
  const arrow = kpi.trend_direction === 'down' ? '↓' : kpi.trend_direction === 'up' ? '↑' : '→';
  return `${arrow} ${Math.abs(Number(kpi.trend)).toFixed(1)}%`;
}

export interface VitalSignsGridProps {
  kpis: KPICardData[];
  onOpen?: (kpi: KPICardData) => void;
  maxItems?: number;
}

/** Compact vital-sign KPI cards from the product redesign. */
export default function VitalSignsGrid({ kpis, onOpen, maxItems = 6 }: VitalSignsGridProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const items = kpis.slice(0, maxItems);
  if (items.length === 0) return null;

  return (
    <Box
      data-testid="vital-signs-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: items.length >= 5 ? 'repeat(3, minmax(0, 1fr))' : `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
          lg: `repeat(${Math.min(items.length, 6)}, minmax(0, 1fr))`,
        },
        gap: 1.5,
      }}
    >
      {items.map((kpi) => {
        const trend = trendLabel(kpi);
        const accent = severityColor(kpi.severity);
        const interactive = Boolean(onOpen);
        return (
          <Box
            key={kpi.key}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onOpen?.(kpi) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpen?.(kpi);
                    }
                  }
                : undefined
            }
            sx={{
              p: 2,
              minHeight: 116,
              cursor: interactive ? 'pointer' : 'default',
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              transition: 'border-color 160ms ease, box-shadow 160ms ease',
              '&:hover': interactive
                ? {
                    borderColor: alpha(accent, 0.45),
                    boxShadow: theme.palette.mode === 'dark' ? 'none' : brand.shadowSoft,
                  }
                : undefined,
              '&:focus-visible': {
                outline: `2px solid ${accent}`,
                outlineOffset: 2,
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                noWrap
                sx={{
                  color: 'text.secondary',
                  fontSize: 10,
                  fontWeight: 750,
                  textTransform: 'uppercase',
                  letterSpacing: '.045em',
                }}
              >
                {localizeKpiLabel(kpi, t)}
              </Typography>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: accent }} />
            </Stack>
            <Typography
              sx={{
                fontSize: 25,
                lineHeight: 1.15,
                fontWeight: 760,
                color: 'text.primary',
                mt: 1.2,
              }}
            >
              {formatKpiValue(kpi)}
            </Typography>
            <Typography
              sx={{
                fontSize: 10,
                color: trend
                  ? kpi.is_improvement === false
                    ? 'error.main'
                    : 'success.main'
                  : 'text.secondary',
                fontWeight: 650,
                mt: 1,
              }}
            >
              {trend ?? t('app.currentPeriod', { defaultValue: 'Current period' })}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
