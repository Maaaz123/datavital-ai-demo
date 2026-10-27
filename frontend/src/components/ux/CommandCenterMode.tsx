import type { ReactNode } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { useCallback, useEffect, useState } from 'react';
import { ops } from '@/components/command-center/opsTheme';

interface CommandCenterModeProps {
  children: ReactNode;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

/** Immersive dark operations shell — never reuses light dashboard chrome. */
export default function CommandCenterMode({
  children,
  enabled: controlledEnabled,
  onToggle,
}: CommandCenterModeProps) {
  const [internalEnabled, setInternalEnabled] = useState(false);
  const enabled = controlledEnabled ?? internalEnabled;

  const toggle = useCallback(() => {
    const next = !enabled;
    if (controlledEnabled === undefined) {
      setInternalEnabled(next);
    }
    onToggle?.(next);
  }, [controlledEnabled, enabled, onToggle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enabled) {
        if (controlledEnabled === undefined) {
          setInternalEnabled(false);
        }
        onToggle?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlledEnabled, enabled, onToggle]);

  return (
    <Box
      sx={
        enabled
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: (theme) => theme.zIndex.modal + 1,
              bgcolor: ops.bg,
              color: ops.text,
              overflow: 'auto',
              p: { xs: 1, md: 1.5, xl: 2 },
            }
          : {
              position: 'relative',
              bgcolor: ops.bg,
              color: ops.text,
              minHeight: 'calc(100vh - 120px)',
              mx: { xs: -1.5, md: -2 },
              px: { xs: 1, md: 1.5 },
              py: 1,
              border: `1px solid ${ops.border}`,
            }
      }
      data-testid="command-center-mode"
      data-fullscreen={enabled ? 'true' : 'false'}
    >
      <Tooltip title={enabled ? 'Exit command center (Esc)' : 'Enter full ops wall'}>
        <IconButton
          onClick={toggle}
          aria-label={enabled ? 'Exit command center mode' : 'Enter command center mode'}
          sx={{
            position: 'absolute',
            top: 6,
            insetInlineEnd: 6,
            zIndex: 2,
            color: ops.text,
            bgcolor: ops.bgPanel,
            border: `1px solid ${ops.borderStrong}`,
            width: 36,
            height: 36,
            '&:hover': { bgcolor: ops.bgElevated },
          }}
        >
          {enabled ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      {children}
    </Box>
  );
}
