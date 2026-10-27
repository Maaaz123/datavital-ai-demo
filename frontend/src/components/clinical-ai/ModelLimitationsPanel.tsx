import { Alert, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ModelLimitationsPanelProps {
  limitations: (string | Record<string, unknown>)[];
}

export default function ModelLimitationsPanel({ limitations }: ModelLimitationsPanelProps) {
  const { t } = useTranslation();

  if (!limitations?.length) return null;

  return (
    <Alert severity="info" sx={{ mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('clinicalAi.modelLimitations')}
      </Typography>
      <List dense disablePadding>
        {limitations.map((item, idx) => {
          const label = typeof item === 'string' ? item : String(item.limitation ?? item.text ?? item.description ?? '—');
          return (
            <ListItem key={idx} disableGutters sx={{ py: 0 }}>
              <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          );
        })}
      </List>
    </Alert>
  );
}
