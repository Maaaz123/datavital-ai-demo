import { Box, Typography, Button, Alert, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  /** Optional non-technical message. Technical details must never be passed here. */
  message?: string;
  onRetry?: () => void;
  /** `inline` / `compact` keep page chrome visible; never blank the whole route. */
  variant?: 'page' | 'inline' | 'compact';
}

export default function ErrorState({ message, onRetry, variant = 'inline' }: ErrorStateProps) {
  const { t } = useTranslation();
  const title = t('app.sectionUnavailable', { defaultValue: 'Unable to load this section' });

  if (variant === 'compact') {
    return (
      <Stack
        data-testid="error-state-compact"
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="center"
        sx={{ py: 3, px: 1.5, minHeight: 120 }}
      >
        <ErrorOutlineIcon color="action" fontSize="small" />
        <Typography variant="body2" color="text.secondary">
          {message || title}
        </Typography>
        {onRetry ? (
          <Button size="small" variant="text" onClick={onRetry}>
            {t('app.retry')}
          </Button>
        ) : null}
      </Stack>
    );
  }

  return (
    <Box
      data-testid="error-state"
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={variant === 'page' ? 4 : 2}
      px={2}
    >
      <Alert
        severity="warning"
        icon={<ErrorOutlineIcon />}
        sx={{ maxWidth: variant === 'page' ? 480 : '100%', width: '100%' }}
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              {t('app.retry')}
            </Button>
          ) : undefined
        }
      >
        <Typography variant="subtitle2">{message || title}</Typography>
      </Alert>
    </Box>
  );
}
