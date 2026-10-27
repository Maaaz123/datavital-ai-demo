import { Box, Button, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import { brand } from '@/design-system/colors';

interface UnauthorizedStateProps {
  message?: string;
  onBack?: () => void;
}

/** Clear unauthorized/empty-permission state for product surfaces. */
export default function UnauthorizedState({ message, onBack }: UnauthorizedStateProps) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="unauthorized-state"
      role="status"
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        borderRadius: 3,
        border: `1px solid ${brand.border}`,
        bgcolor: 'background.paper',
      }}
    >
      <LockOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1.5 }} />
      <Typography sx={{ fontWeight: 750, fontSize: 18, mb: 1 }}>
        {t('app.unauthorizedTitle', { defaultValue: 'Access restricted' })}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 13, maxWidth: 420, mx: 'auto', mb: 2 }}>
        {message ??
          t('app.unauthorizedBody', {
            defaultValue: 'You do not have permission to view this workspace.',
          })}
      </Typography>
      {onBack ? (
        <Button variant="outlined" onClick={onBack}>
          {t('app.back', { defaultValue: 'Back' })}
        </Button>
      ) : null}
    </Box>
  );
}
