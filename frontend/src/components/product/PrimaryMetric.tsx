import { Box, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { brand, cssVar, severityCssVar } from '@/design-system/colors';
import { typographySx } from '@/design-system/typography';
import TrendIndicator from '@/components/ux/TrendIndicator';
import AnimatedNumber from '@/components/motion/AnimatedNumber';
import type { KPICardData } from '@/types/api';
import { localizeKpiLabel } from '@/i18n/localize';
import { formatKpiValue } from '@/utils/formatKpiValue';

function accent(severity?: string | null, dataStatus?: string | null): string {
  if (dataStatus === 'unavailable') return cssVar(severityCssVar.inactive);
  if (severity === 'critical') return cssVar(severityCssVar.critical);
  if (severity === 'warning') return cssVar(severityCssVar.warning);
  if (severity === 'healthy') return cssVar(severityCssVar.healthy);
  return brand.primaryBlue;
}

interface PrimaryMetricProps {
  kpi: KPICardData;
  onClick?: () => void;
}

/** Dominant operational metric — one per page opening. */
export function PrimaryMetric({ kpi, onClick }: PrimaryMetricProps) {
  const { t } = useTranslation();
  const label = localizeKpiLabel(kpi, t);
  const tip = [kpi.tooltip, kpi.formula, kpi.unavailable_reason].filter(Boolean).join('\n');
  const numeric = typeof kpi.value === 'number' ? kpi.value : Number(kpi.value);
  const canAnimate =
    kpi.data_status !== 'unavailable' && kpi.data_status !== 'partial' && Number.isFinite(numeric);
  const bar = accent(kpi.severity, kpi.data_status);

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: brand.surface,
        border: `1px solid ${brand.border}`,
        boxShadow: brand.shadowSoft,
        borderLeft: `4px solid ${bar}`,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': onClick
          ? { transform: 'translateY(-2px)', boxShadow: brand.shadowCard }
          : undefined,
      }}
      data-testid={`primary-metric-${kpi.key}`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Typography sx={{ ...typographySx('kpiLabel'), color: brand.textSecondary }}>{label}</Typography>
        {tip ? (
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: brand.textMuted }} />
          </Tooltip>
        ) : null}
      </Stack>
      <Box sx={{ mt: 1.5, mb: 1 }}>
        {canAnimate ? (
          <AnimatedNumber
            value={numeric}
            format={kpi.format === 'percent' ? 'percent' : kpi.format === 'currency' ? 'currency' : 'decimal'}
            decimals={kpi.format === 'currency' ? 0 : 1}
            currency="SAR"
            suffix={
              kpi.format === 'percent' || kpi.unit === '%' || kpi.format === 'currency'
                ? ''
                : kpi.unit
                  ? ` ${kpi.unit}`
                  : ''
            }
            sx={{ ...typographySx('kpiValue'), color: brand.deepNavy }}
          />
        ) : (
          <Typography sx={{ ...typographySx('kpiValue'), color: brand.deepNavy, fontSize: 18, lineHeight: 1.25 }}>
            {formatKpiValue(kpi)}
          </Typography>
        )}
      </Box>
      {kpi.trend != null && Number.isFinite(Number(kpi.trend)) && kpi.data_status !== 'unavailable' && (
        <TrendIndicator
          direction={kpi.trend_direction === 'down' ? 'down' : kpi.trend_direction === 'stable' ? 'flat' : 'up'}
          value={kpi.trend}
          isImprovement={kpi.is_improvement}
        />
      )}
    </Box>
  );
}

interface SupportingMetricProps {
  kpi: KPICardData;
  onClick?: () => void;
}

export function SupportingMetric({ kpi, onClick }: SupportingMetricProps) {
  const { t } = useTranslation();
  const label = localizeKpiLabel(kpi, t);
  const tip = [kpi.tooltip, kpi.formula, kpi.unavailable_reason].filter(Boolean).join('\n');
  const numeric = typeof kpi.value === 'number' ? kpi.value : Number(kpi.value);
  const canAnimate = kpi.data_status !== 'unavailable' && kpi.data_status !== 'partial' && Number.isFinite(numeric);

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      sx={{
        p: 1.75,
        borderRadius: 2.5,
        bgcolor: brand.surfaceMuted,
        border: `1px solid ${brand.border}`,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 160ms ease',
        '&:hover': onClick ? { bgcolor: brand.surfaceSoft } : undefined,
      }}
      data-testid={`supporting-metric-${kpi.key}`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={0.5}>
        <Typography sx={{ ...typographySx('kpiLabel'), color: brand.textMuted }} noWrap title={label}>
          {label}
        </Typography>
        {tip ? (
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: brand.textMuted }} />
          </Tooltip>
        ) : null}
      </Stack>
      <Box sx={{ mt: 0.75 }}>
        {canAnimate ? (
          <AnimatedNumber
            value={numeric}
            format={kpi.format === 'percent' ? 'percent' : kpi.format === 'currency' ? 'currency' : 'decimal'}
            decimals={kpi.format === 'currency' ? 0 : 1}
            currency="SAR"
            suffix={
              kpi.format === 'percent' || kpi.unit === '%' || kpi.format === 'currency'
                ? ''
                : kpi.unit
                  ? ` ${kpi.unit}`
                  : ''
            }
            sx={{ ...typographySx('kpiValueCompact'), color: brand.textPrimary }}
          />
        ) : (
          <Typography sx={{ ...typographySx('kpiValueCompact'), fontSize: 13, lineHeight: 1.3 }}>
            {formatKpiValue(kpi)}
          </Typography>
        )}
      </Box>
      {kpi.trend != null && Number.isFinite(Number(kpi.trend)) && kpi.data_status !== 'unavailable' && (
        <Box sx={{ mt: 0.5 }}>
          <TrendIndicator
            direction={kpi.trend_direction === 'down' ? 'down' : kpi.trend_direction === 'stable' ? 'flat' : 'up'}
            value={kpi.trend}
            isImprovement={kpi.is_improvement}
          />
        </Box>
      )}
    </Box>
  );
}
