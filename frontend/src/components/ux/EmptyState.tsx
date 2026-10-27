import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';
import BaseEmptyState from '@/components/common/EmptyState';
import { sectionPanel } from '@/design-system/components';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <Box sx={sectionPanel} data-testid="ux-empty-state">
      <BaseEmptyState title={title} description={description} icon={icon} />
      {(onAction || onSecondaryAction) && (
        <Box display="flex" justifyContent="center" gap={1.5} mt={2}>
          {onAction && actionLabel && (
            <Button variant="contained" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button variant="outlined" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
