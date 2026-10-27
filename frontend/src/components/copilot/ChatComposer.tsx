import type { KeyboardEvent } from 'react';
import { IconButton, Paper, Stack, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { useTranslation } from 'react-i18next';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ChatComposer({ value, onChange, onSend, onStop, isLoading, disabled }: ChatComposerProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSend();
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        borderRadius: 3,
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={6}
        variant="standard"
        placeholder={t('copilot.askPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        InputProps={{ disableUnderline: true }}
        sx={{ px: 1, py: 0.5 }}
      />
      <Stack direction="row" spacing={0.5}>
        {isLoading && onStop ? (
          <Tooltip title={t('copilot.stop')}>
            <IconButton color="error" onClick={onStop}>
              <StopCircleOutlinedIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t('copilot.send')}>
            <span>
              <IconButton color="primary" onClick={onSend} disabled={disabled || !value.trim()}>
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}
