import { Box, Stack, Typography } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useTranslation } from 'react-i18next';
import SuggestedQuestions from './SuggestedQuestions';

interface CopilotEmptyStateProps {
  suggestions: string[];
  onSelectSuggestion: (question: string) => void;
  suggestionsLoading?: boolean;
  horizontalScroll?: boolean;
}

export default function CopilotEmptyState({
  suggestions,
  onSelectSuggestion,
  suggestionsLoading,
  horizontalScroll,
}: CopilotEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} py={6} px={2} textAlign="center">
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'var(--hap-primary)',
          color: '#fff',
          mb: 2,
        }}
      >
        <SmartToyOutlinedIcon fontSize="large" />
      </Box>
      <Typography variant="h5" gutterBottom>
        {t('copilot.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={480} mb={3}>
        {t('copilot.subtitle')}
      </Typography>
      {!suggestionsLoading && suggestions.length > 0 && (
        <Stack alignItems="center" maxWidth={640}>
          <SuggestedQuestions
            title={t('copilot.suggestions')}
            questions={suggestions}
            onSelect={onSelectSuggestion}
            horizontalScroll={horizontalScroll}
          />
        </Stack>
      )}
    </Box>
  );
}
