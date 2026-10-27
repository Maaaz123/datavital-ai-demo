import { Chip, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { brand } from '@/design-system/colors';

export type FreshnessStatus = 'healthy' | 'warning' | 'critical' | 'unknown' | 'stale';

interface DataFreshnessIndicatorProps {
  status: FreshnessStatus;
  label: string;
  detail?: string;
}

const config: Record<
  FreshnessStatus,
  { color: string; icon: typeof CheckCircleOutlineIcon }
> = {
  healthy: { color: brand.positive, icon: CheckCircleOutlineIcon },
  warning: { color: brand.warning, icon: WarningAmberOutlinedIcon },
  critical: { color: brand.critical, icon: ErrorOutlineIcon },
  stale: { color: brand.warning, icon: WarningAmberOutlinedIcon },
  unknown: { color: brand.neutral, icon: HelpOutlineIcon },
};

export default function DataFreshnessIndicator({ status, label, detail }: DataFreshnessIndicatorProps) {
  const { color, icon: Icon } = config[status];
  return (
    <Tooltip title={detail ?? label}>
      <Chip
        size="small"
        icon={<Icon sx={{ fontSize: '16px !important', color: `${color} !important` }} />}
        label={label}
        sx={{
          height: 28,
          fontWeight: 600,
          bgcolor: brand.surface,
          border: `1px solid ${brand.border}`,
          color: brand.textSecondary,
          '& .MuiChip-label': { px: 1 },
        }}
        data-testid="data-freshness"
      />
    </Tooltip>
  );
}
