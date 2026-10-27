import { Chip, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

interface DataFreshnessBadgeProps {
  generatedAt?: string | null;
}

export default function DataFreshnessBadge({ generatedAt }: DataFreshnessBadgeProps) {
  const { t } = useTranslation();
  if (!generatedAt) return null;

  const generated = dayjs(generatedAt);
  if (!generated.isValid()) return null;

  const ageHours = dayjs().diff(generated, 'hour');
  const isStale = ageHours > 24;

  return (
    <Tooltip title={generated.format('YYYY-MM-DD HH:mm:ss')}>
      <Chip
        size="small"
        variant="outlined"
        icon={<AccessTimeIcon fontSize="small" />}
        label={`${t('dashboard.dataAsOf')} ${generated.format('MMM D, HH:mm')}`}
        color={isStale ? 'warning' : 'default'}
        sx={{ borderRadius: 1.5 }}
      />
    </Tooltip>
  );
}
