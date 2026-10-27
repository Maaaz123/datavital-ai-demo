import { useMemo } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useTranslation } from 'react-i18next';
import EChart from '@/components/charts/EChart';
import type { ChartPayload } from '@/types/api';
import type { CopilotVisualization } from '@/types/copilot';

interface ResultChartProps {
  visualization: CopilotVisualization;
  onAskAboutChart?: () => void;
}

function toChartPayload(visualization: CopilotVisualization): ChartPayload | null {
  if (!visualization.categories || !visualization.series) return null;
  return {
    chart_type: visualization.type,
    categories: visualization.categories,
    series: visualization.series,
    meta: visualization.meta,
  };
}

export default function ResultChart({ visualization, onAskAboutChart }: ResultChartProps) {
  const { t } = useTranslation();
  const payload = useMemo(() => toChartPayload(visualization), [visualization]);

  if (!payload) return null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {t('copilot.chart')}
        </Typography>
        {onAskAboutChart && (
          <Tooltip title={t('copilot.askAboutChart')}>
            <IconButton size="small" onClick={onAskAboutChart}>
              <AutoAwesomeOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <EChart payload={payload} title={visualization.title} height={300} />
    </Box>
  );
}
