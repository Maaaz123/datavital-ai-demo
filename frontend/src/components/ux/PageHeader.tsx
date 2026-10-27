import type { ReactNode } from 'react';
import { Box, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import { typographySx } from '@/design-system/typography';

export interface PageHeaderAction {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  lastRefresh?: string | null;
  freshnessBadge?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  secondaryActions?: PageHeaderAction[];
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  lastRefresh,
  freshnessBadge,
  onRefresh,
  refreshing,
  secondaryActions,
  actions,
}: PageHeaderProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
      }}
      data-testid="page-header"
    >
      <Box>
        <Typography sx={typographySx('pageTitle')} gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        )}
        {lastRefresh && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Last refresh: {lastRefresh}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {freshnessBadge}
        {actions}
        {onRefresh && (
          <Tooltip title="Refresh data">
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={refreshing}
                color="primary"
                aria-label="Refresh data"
                data-testid="page-header-refresh"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {secondaryActions && secondaryActions.length > 0 && (
          <>
            <IconButton
              aria-label="More actions"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              data-testid="page-header-overflow"
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              {secondaryActions.map((action) => (
                <MenuItem
                  key={action.key}
                  disabled={action.disabled}
                  onClick={() => {
                    setMenuAnchor(null);
                    action.onClick();
                  }}
                >
                  {action.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Stack>
    </Box>
  );
}
