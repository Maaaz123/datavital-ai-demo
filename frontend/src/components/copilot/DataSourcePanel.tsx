import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { CopilotSource } from '@/types/copilot';

interface DataSourcePanelProps {
  sources: CopilotSource[];
}

export default function DataSourcePanel({ sources }: DataSourcePanelProps) {
  const { t } = useTranslation();

  if (!sources.length) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {t('copilot.dataSource')}:
      </Typography>
      {sources.map((source, idx) => {
        const freshness = source.freshness_at ? dayjs(source.freshness_at) : null;
        return (
          <Tooltip
            key={`${source.model}-${idx}`}
            title={freshness && freshness.isValid() ? `${t('copilot.freshness')}: ${freshness.format('YYYY-MM-DD HH:mm')}` : source.model}
          >
            <Chip
              size="small"
              variant="outlined"
              icon={<StorageOutlinedIcon fontSize="small" />}
              label={
                freshness && freshness.isValid() ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>{source.model}</span>
                    <AccessTimeIcon sx={{ fontSize: 12 }} />
                    <span>{freshness.format('MMM D, HH:mm')}</span>
                  </Stack>
                ) : (
                  source.model
                )
              }
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}
