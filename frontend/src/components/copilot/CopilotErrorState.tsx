import { Avatar, Button, Paper, Stack, Typography } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from 'react-i18next';

interface CopilotErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function CopilotErrorState({ message, onRetry }: CopilotErrorStateProps) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ maxWidth: '85%' }}>
      <Avatar sx={{ bgcolor: 'var(--hap-critical)', width: 32, height: 32 }}>
        <SmartToyOutlinedIcon fontSize="small" />
      </Avatar>
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 240, borderColor: 'var(--hap-critical)' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={message ? 0.5 : 0}>
          <ErrorOutlineIcon color="error" fontSize="small" />
          <Typography variant="subtitle2" color="error">
            {t('copilot.error')}
          </Typography>
        </Stack>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: onRetry ? 1.5 : 0 }}>
            {message}
          </Typography>
        )}
        {onRetry && (
          <Button size="small" startIcon={<ReplayIcon />} onClick={onRetry} color="error" variant="outlined">
            {t('copilot.retry')}
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
