import { Alert, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ContradictoryEvidencePanelProps {
  evidence: (string | Record<string, unknown>)[];
}

export default function ContradictoryEvidencePanel({ evidence }: ContradictoryEvidencePanelProps) {
  const { t } = useTranslation();

  if (!evidence?.length) return null;

  return (
    <Alert severity="warning" sx={{ mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('clinicalAi.contradictoryEvidence')}
      </Typography>
      <List dense disablePadding>
        {evidence.map((item, idx) => {
          const primary = typeof item === 'string' ? item : String(item.evidence ?? item.text ?? item.description ?? '—');
          return (
            <ListItem key={idx} disableGutters sx={{ py: 0 }}>
              <ListItemText primary={primary} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          );
        })}
      </List>
    </Alert>
  );
}
