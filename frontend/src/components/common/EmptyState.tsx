import { Box, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      px={2}
      textAlign="center"
    >
      <Box color="text.disabled" mb={2} fontSize={48}>
        {icon ?? <InboxOutlinedIcon fontSize="inherit" />}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title ?? t('app.noData')}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" maxWidth={400}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
