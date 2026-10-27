import { Alert, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface MissingDataPanelProps {
  items: (string | Record<string, unknown>)[];
}

export default function MissingDataPanel({ items }: MissingDataPanelProps) {
  const { t } = useTranslation();

  if (!items?.length) return null;

  return (
    <Alert severity="warning" sx={{ mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('clinicalAi.missingData')}
      </Typography>
      <List dense disablePadding>
        {items.map((item, idx) => {
          const label = typeof item === 'string' ? item : String(item.field ?? item.name ?? item.label ?? JSON.stringify(item));
          const detail = typeof item === 'object' && item != null && 'detail' in item ? String(item.detail) : undefined;
          return (
            <ListItem key={idx} disableGutters sx={{ py: 0 }}>
              <ListItemText primary={label} secondary={detail} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          );
        })}
      </List>
    </Alert>
  );
}
