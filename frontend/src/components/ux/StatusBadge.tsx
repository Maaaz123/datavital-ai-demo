import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import { cssVar, severityCssVar } from '@/design-system/colors';
import type { StatusSeverity } from './types';

interface StatusBadgeProps {
  status: StatusSeverity;
  label?: string;
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  StatusSeverity,
  { icon: typeof CheckCircleOutlineIcon; defaultLabel: string; ariaLabel: string }
> = {
  healthy: {
    icon: CheckCircleOutlineIcon,
    defaultLabel: 'Healthy',
    ariaLabel: 'Status: healthy',
  },
  warning: {
    icon: WarningAmberOutlinedIcon,
    defaultLabel: 'Warning',
    ariaLabel: 'Status: warning',
  },
  critical: {
    icon: ErrorOutlineIcon,
    defaultLabel: 'Critical',
    ariaLabel: 'Status: critical',
  },
  info: {
    icon: InfoOutlinedIcon,
    defaultLabel: 'Info',
    ariaLabel: 'Status: informational',
  },
  inactive: {
    icon: RemoveCircleOutlineIcon,
    defaultLabel: 'Inactive',
    ariaLabel: 'Status: inactive',
  },
  pending: {
    icon: HourglassEmptyOutlinedIcon,
    defaultLabel: 'Pending',
    ariaLabel: 'Status: pending',
  },
};

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label ?? config.defaultLabel;
  const color = cssVar(severityCssVar[status === 'pending' ? 'info' : status]);

  return (
    <Box
      component="span"
      role="status"
      aria-label={`${config.ariaLabel}${label ? `: ${label}` : ''}`}
      data-testid={`status-badge-${status}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'small' ? 1 : 1.25,
        py: size === 'small' ? 0.25 : 0.5,
        borderRadius: '6px',
        border: `1px solid ${color}`,
        bgcolor: `${color}14`,
        color,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.4,
        textTransform: 'capitalize',
      }}
    >
      <Icon sx={{ fontSize: size === 'small' ? 14 : 16 }} aria-hidden />
      <Typography component="span" variant="inherit">
        {displayLabel}
      </Typography>
    </Box>
  );
}
