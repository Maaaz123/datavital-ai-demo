import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ClinicalEvidencePanelProps {
  evidence: (string | Record<string, unknown>)[];
  title?: string;
}

export default function ClinicalEvidencePanel({ evidence, title }: ClinicalEvidencePanelProps) {
  const { t } = useTranslation();

  if (!evidence?.length) {
    return <Typography variant="body2" color="text.secondary">{t('clinicalAi.noEvidence')}</Typography>;
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title ?? t('clinicalAi.supportingEvidence')}
      </Typography>
      <List dense disablePadding>
        {evidence.map((item, idx) => {
          const primary = typeof item === 'string' ? item : String(item.evidence ?? item.text ?? item.description ?? '—');
          const secondary = typeof item === 'object' && item != null && 'source' in item ? String(item.source) : undefined;
          return (
            <ListItem key={idx} disableGutters>
              <ListItemText primary={primary} secondary={secondary} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
