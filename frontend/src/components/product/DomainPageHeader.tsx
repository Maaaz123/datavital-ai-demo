import type { ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import DataFreshnessIndicator, { type FreshnessStatus } from './DataFreshnessIndicator';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

export interface DomainPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: string[];
  freshness?: { status: FreshnessStatus; label: string };
  lastRefreshAt?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
}

/** Shared product-redesign page header used across all workspaces. */
export default function DomainPageHeader({
  eyebrow = 'DATAVITAL AI / DEMONSTRATION · SYNTHETIC DATA',
  title,
  subtitle,
  chips,
  freshness,
  lastRefreshAt,
  onRefresh,
  refreshing,
  actions,
}: DomainPageHeaderProps) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="domain-page-header"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 2,
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: 'primary.main',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            mb: 0.6,
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          component="h1"
          sx={{
            color: 'text.primary',
            fontSize: { xs: 24, md: 30 },
            lineHeight: 1.15,
            fontWeight: 750,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.8, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        ) : null}
        {chips && chips.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1.5}>
            {chips.map((label) => (
              <Chip key={label} size="small" label={label} variant="outlined" />
            ))}
          </Stack>
        ) : null}
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {freshness ? <DataFreshnessIndicator status={freshness.status} label={freshness.label} /> : null}
        {lastRefreshAt ? (
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{lastRefreshAt}</Typography>
        ) : null}
        {actions}
        {onRefresh ? (
          <Tooltip title={t('app.refresh')}>
            <span>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label={t('app.refresh')}
                sx={{ width: TOUCH_TARGET_MIN - 4, height: TOUCH_TARGET_MIN - 4 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
    </Box>
  );
}
