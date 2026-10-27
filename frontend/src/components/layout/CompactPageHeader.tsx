import type { ReactNode } from 'react';
import { Box, Typography, IconButton, Tooltip, Stack, Menu, MenuItem } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DataFreshnessBadge from '@/components/dashboard/DataFreshnessBadge';
import { TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

interface CompactPageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  generatedAt?: string | null;
  actions?: ReactNode;
  moreActions?: Array<{ label: string; onClick: () => void }>;
}

/** Dense page header — product redesign typography for non-shell surfaces. */
export default function CompactPageHeader({
  title,
  subtitle,
  eyebrow = 'HOSPITAL INTELLIGENCE',
  onRefresh,
  refreshing,
  generatedAt,
  actions,
  moreActions,
}: CompactPageHeaderProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      data-testid="compact-page-header"
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        mb: 2.5,
        pb: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {eyebrow ? (
          <Typography
            sx={{
              color: 'primary.main',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              mb: 0.5,
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 22, md: 28 },
              fontWeight: 750,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              m: 0,
            }}
          >
            {title}
          </Typography>
          <DataFreshnessBadge generatedAt={generatedAt} />
        </Stack>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.6, fontSize: 13, lineHeight: 1.45, maxWidth: 720 }}
            title={subtitle}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
        {actions}
        {onRefresh && (
          <Tooltip title={t('app.refresh')}>
            <span>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={refreshing}
                color="primary"
                data-testid="dashboard-refresh"
                sx={{ width: TOUCH_TARGET_MIN - 4, height: TOUCH_TARGET_MIN - 4 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {moreActions && moreActions.length > 0 && (
          <>
            <IconButton
              size="small"
              aria-label={t('app.moreActions', { defaultValue: 'More actions' })}
              onClick={(e) => setAnchor(e.currentTarget)}
              sx={{ width: TOUCH_TARGET_MIN - 4, height: TOUCH_TARGET_MIN - 4 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              {moreActions.map((item) => (
                <MenuItem
                  key={item.label}
                  onClick={() => {
                    setAnchor(null);
                    item.onClick();
                  }}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Stack>
    </Box>
  );
}
