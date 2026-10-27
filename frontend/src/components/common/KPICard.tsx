import { Card, CardContent, Stack, Typography, Box, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { cssVar, cssVarNames, severityCssVar } from '@/design-system/colors';
import { layoutDensity } from '@/design-system/layout';
import { typographySx } from '@/design-system/typography';
import StatusBadge from '@/components/ux/StatusBadge';
import TrendIndicator from '@/components/ux/TrendIndicator';
import AnimatedNumber from '@/components/motion/AnimatedNumber';
import type { StatusSeverity, TrendDirection } from '@/components/ux/types';
import type { KPICardData } from '@/types/api';
import { localizeKpiLabel } from '@/i18n/localize';

interface KPICardProps {
  kpi: KPICardData;
}

function severityAccent(severity?: string | null, dataStatus?: string | null): string {
  if (dataStatus === 'unavailable') return cssVar(severityCssVar.inactive);
  if (dataStatus === 'partial') return cssVar(severityCssVar.info);
  switch (severity) {
    case 'healthy':
      return cssVar(severityCssVar.healthy);
    case 'warning':
      return cssVar(severityCssVar.warning);
    case 'critical':
      return cssVar(severityCssVar.critical);
    case 'info':
      return cssVar(severityCssVar.info);
    case 'inactive':
      return cssVar(severityCssVar.inactive);
    default:
      return cssVar(cssVarNames.primary);
  }
}

function normalizeStatus(severity?: string | null, dataStatus?: string | null): StatusSeverity | null {
  if (dataStatus === 'unavailable') return 'inactive';
  if (dataStatus === 'partial') return 'info';
  if (
    severity === 'healthy' ||
    severity === 'warning' ||
    severity === 'critical' ||
    severity === 'info' ||
    severity === 'inactive' ||
    severity === 'pending'
  ) {
    return severity;
  }
  return null;
}

function normalizeTrendDirection(direction?: string | null): TrendDirection | null {
  if (direction === 'up' || direction === 'down' || direction === 'flat') return direction;
  if (direction === 'stable') return 'flat';
  return null;
}

function formatStatic(kpi: KPICardData): string {
  const state = (kpi.render_state || '').toUpperCase();
  if (
    state === 'NO_DATA' ||
    state === 'RESTRICTED' ||
    state === 'ERROR' ||
    state === 'MODEL_NOT_ENABLED' ||
    kpi.data_status === 'unavailable' ||
    kpi.value === '—' ||
    kpi.value === '' ||
    kpi.value == null
  ) {
    const reason = (kpi.unavailable_reason || '').trim();
    const label =
      state === 'RESTRICTED'
        ? 'Restricted'
        : state === 'ERROR'
          ? 'Error'
          : state === 'MODEL_NOT_ENABLED'
            ? 'Model not enabled'
            : 'No data';
    return reason ? `${label} — ${reason}` : `${label} — source metric unavailable for this filter set`;
  }
  const val = kpi.value;
  if (kpi.format === 'currency') {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  }
  if (kpi.format === 'percent') {
    return `${val}${kpi.unit === '%' ? '%' : kpi.unit ? ` ${kpi.unit}` : '%'}`;
  }
  const formatted = typeof val === 'number' ? new Intl.NumberFormat().format(val) : String(val);
  return kpi.unit ? `${formatted} ${kpi.unit}` : formatted;
}

/** Compact commercial KPI — consistent height, no giant numbers, no empty footer. */
export default function KPICard({ kpi }: KPICardProps) {
  const { t } = useTranslation();
  const label = localizeKpiLabel(kpi, t);
  const accent = severityAccent(kpi.severity, kpi.data_status);
  const status = normalizeStatus(kpi.severity, kpi.data_status);
  const trend = normalizeTrendDirection(kpi.trend_direction);
  const unavailable = kpi.data_status === 'unavailable';
  const numeric = typeof kpi.value === 'number' ? kpi.value : Number(kpi.value);
  const canAnimate = !unavailable && Number.isFinite(numeric);
  const tip = [kpi.tooltip, kpi.formula, kpi.unavailable_reason].filter(Boolean).join('\n');

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 96,
        maxHeight: 130,
        border: `1px solid ${cssVar(cssVarNames.border)}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: `${layoutDensity.borderRadius}px`,
        boxShadow: 'none',
        bgcolor: cssVar(cssVarNames.bgPaper),
        opacity: unavailable ? 0.85 : 1,
      }}
      data-testid={`kpi-card-${kpi.key}`}
      data-status={kpi.data_status || 'available'}
    >
      <CardContent
        sx={{
          p: `${layoutDensity.kpiPadding}px !important`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={0.5}>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{ ...typographySx('kpiLabel'), color: cssVar(cssVarNames.textSecondary) }}
              noWrap
              title={label}
            >
              {label}
            </Typography>
            {tip ? (
              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>} arrow>
                <InfoOutlinedIcon sx={{ fontSize: 14, color: cssVar(cssVarNames.textSecondary), flexShrink: 0 }} />
              </Tooltip>
            ) : null}
          </Stack>
          {status && (
            <StatusBadge
              status={status}
              label={unavailable ? t('common.unavailable', { defaultValue: 'Unavailable' }) : String(kpi.severity)}
              size="small"
            />
          )}
        </Stack>

        <Box sx={{ mt: 0.25 }}>
          {canAnimate ? (
            <AnimatedNumber
              value={numeric}
              format={
                kpi.format === 'percent'
                  ? 'percent'
                  : kpi.format === 'currency'
                    ? 'currency'
                    : Number.isInteger(numeric)
                      ? 'integer'
                      : 'decimal'
              }
              decimals={kpi.format === 'currency' ? 0 : 1}
              currency="SAR"
              suffix={kpi.format === 'percent' || kpi.unit === '%' ? '' : kpi.unit ? ` ${kpi.unit}` : ''}
              sx={{ ...typographySx('kpiValue') }}
            />
          ) : (
            <Typography sx={typographySx('kpiValue')}>{formatStatic(kpi)}</Typography>
          )}
        </Box>

        {!unavailable && kpi.trend != null && (
          <Box sx={{ mt: 'auto', pt: 0.25 }}>
            {trend ? (
              <TrendIndicator direction={trend} value={kpi.trend} isImprovement={kpi.is_improvement} />
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {kpi.trend > 0 ? '+' : ''}
                {kpi.trend}%
              </Typography>
            )}
            {kpi.previous_value != null && Number.isFinite(Number(kpi.previous_value)) ? (
              <Typography
                variant="caption"
                sx={{ display: 'block', color: cssVar(cssVarNames.textMuted), fontSize: 10, mt: 0.25 }}
              >
                {t('kpi.prevPeriod', { defaultValue: 'Prev' })}:{' '}
                {kpi.format === 'percent'
                  ? `${Number(kpi.previous_value).toFixed(1)}%`
                  : kpi.format === 'currency'
                    ? new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: 'SAR',
                        maximumFractionDigits: 0,
                      }).format(Number(kpi.previous_value))
                    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
                        Number(kpi.previous_value),
                      )}
              </Typography>
            ) : null}
          </Box>
        )}
        {unavailable && kpi.unavailable_reason ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, mt: 'auto' }} noWrap title={kpi.unavailable_reason}>
            {kpi.unavailable_reason}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
