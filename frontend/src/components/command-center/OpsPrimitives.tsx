import type { ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ops, opsStatusColor, type OpsStatus } from './opsTheme';

export function OpsMetricTile({
  label,
  value,
  hint,
  status,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: OpsStatus | string | null;
  loading?: boolean;
}) {
  const accent = opsStatusColor(status);
  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        px: 1.25,
        py: 1,
        bgcolor: ops.bgPanel,
        border: `1px solid ${ops.border}`,
        borderLeft: `3px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.35,
        justifyContent: 'center',
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.06,
          textTransform: 'uppercase',
          color: ops.textMuted,
          lineHeight: 1.2,
        }}
        noWrap
        title={label}
      >
        {label}
      </Typography>
      {loading ? (
        <CircularProgress size={16} sx={{ color: ops.teal, my: 0.5 }} />
      ) : (
        <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 700, color: ops.text, lineHeight: 1.1 }} noWrap>
          {value}
        </Typography>
      )}
      {hint && (
        <Typography sx={{ fontSize: 11, color: ops.textDim, lineHeight: 1.2 }} noWrap>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

export function OpsPanel({
  title,
  badge,
  children,
  span,
  loading,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  span?: number;
  loading?: boolean;
}) {
  return (
    <Box
      sx={{
        gridColumn: {
          xs: '1 / -1',
          md: span ? `span ${span}` : 'span 1',
        },
        bgcolor: ops.bgPanel,
        border: `1px solid ${ops.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderBottom: `1px solid ${ops.border}`,
          bgcolor: ops.bgRail,
          minHeight: 36,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.08,
            textTransform: 'uppercase',
            color: ops.textMuted,
          }}
        >
          {title}
        </Typography>
        {badge}
      </Box>
      <Box sx={{ p: 1.25, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={80}>
            <CircularProgress size={22} sx={{ color: ops.teal }} />
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
}

export function OpsBigValue({
  value,
  unit,
  label,
  status,
}: {
  value: ReactNode;
  unit?: string;
  label?: string;
  status?: OpsStatus | string | null;
}) {
  return (
    <Box>
      {label && (
        <Typography sx={{ fontSize: 11, color: ops.textMuted, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 750, color: opsStatusColor(status), lineHeight: 1 }}>
          {value}
        </Typography>
        {unit && (
          <Typography sx={{ fontSize: 13, color: ops.textMuted, fontWeight: 600 }}>{unit}</Typography>
        )}
      </Box>
    </Box>
  );
}

export function OpsRow({ label, value, tone }: { label: string; value: ReactNode; tone?: OpsStatus }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.55,
        borderBottom: `1px solid ${ops.border}`,
        '&:last-child': { borderBottom: 'none' },
        gap: 1,
      }}
    >
      <Typography sx={{ fontSize: 12, color: ops.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: tone ? opsStatusColor(tone) : ops.text }}>{value}</Typography>
    </Box>
  );
}
