import { useState, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { cssVar, cssVarNames } from '@/design-system/colors';
import { sectionPanel } from '@/design-system/components';
import { typographySx } from '@/design-system/typography';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';
import EmptyState from './EmptyState';
import ErrorState from '@/components/common/ErrorState';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  unit?: string;
  period?: string;
  children?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  error?: boolean;
  onRetry?: () => void;
  dataSource?: string;
  accessibleDescription?: string;
  fullscreenEnabled?: boolean;
}

export default function ChartContainer({
  title,
  subtitle,
  unit,
  period,
  children,
  loading,
  empty,
  emptyMessage,
  error,
  onRetry,
  dataSource,
  accessibleDescription,
  fullscreenEnabled,
}: ChartContainerProps) {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);

  const header = (
    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 28 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={typographySx('chartTitle')} noWrap title={title}>
          {title}
        </Typography>
        {(subtitle || unit || period) && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.3 }}>
            {[subtitle, period, unit].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Box>
      {fullscreenEnabled && !loading && !empty && !error && children && (
        <IconButton
          size="small"
          onClick={() => setFullscreen(true)}
          aria-label={t('responsive.fullscreen')}
          sx={{ width: 32, height: 32 }}
        >
          <FullscreenIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  const body = loading ? (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={180}>
      <CircularProgress size={28} aria-label="Loading chart" />
    </Box>
  ) : error ? (
    <ErrorState variant="compact" onRetry={onRetry} />
  ) : empty ? (
    <EmptyState title={emptyMessage ?? 'No chart data'} />
  ) : (
    children
  );

  return (
    <>
      <Box
        sx={sectionPanel}
        role="figure"
        aria-label={accessibleDescription ?? title}
        data-testid="chart-container"
      >
        {header}
        {body}
        {dataSource && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1.5, pt: 1, borderTop: `1px solid ${cssVar(cssVarNames.border)}` }}
          >
            Source: {dataSource}
          </Typography>
        )}
      </Box>

      <Dialog fullScreen open={fullscreen} onClose={() => setFullscreen(false)}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={() => setFullscreen(false)} aria-label={t('responsive.close')} sx={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 0 }}>{children}</DialogContent>
      </Dialog>
    </>
  );
}
