import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface ContributingFactor {
  factor?: string;
  feature_name?: string;
  direction?: string;
  contribution?: number | string;
  evidence?: string;
}

interface ContributingFactorsPanelProps {
  factors: ContributingFactor[] | Record<string, unknown>[];
  title?: string;
}

export default function ContributingFactorsPanel({ factors, title }: ContributingFactorsPanelProps) {
  const { t } = useTranslation();

  if (!factors?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('clinicalAi.noContributingFactors')}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title ?? t('clinicalAi.contributingFactors')}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        {t('clinicalAi.contributingFactorsNote')}
      </Typography>
      <List dense disablePadding>
        {factors.map((f, idx) => {
          const name = String(f.factor ?? f.feature_name ?? '—');
          const direction = f.direction ? ` (${String(f.direction)})` : '';
          const contrib = f.contribution != null ? ` · ${Number(f.contribution).toFixed(2)}` : '';
          const evidence = f.evidence ? String(f.evidence) : undefined;
          return (
            <ListItem key={idx} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={`${name}${direction}${contrib}`}
                secondary={evidence}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
