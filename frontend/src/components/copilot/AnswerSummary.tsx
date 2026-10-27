import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { useTranslation } from 'react-i18next';
import type { CopilotAnswer } from '@/types/copilot';

interface AnswerSummaryProps {
  answer: CopilotAnswer;
}

export default function AnswerSummary({ answer }: AnswerSummaryProps) {
  const { t } = useTranslation();

  return (
    <Box>
      {answer.title && (
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {answer.title}
        </Typography>
      )}
      {answer.summary && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: answer.insights?.length || answer.recommended_actions?.length ? 1.5 : 0 }}>
          {answer.summary}
        </Typography>
      )}

      {answer.insights?.length > 0 && (
        <Box sx={{ mb: answer.recommended_actions?.length ? 1.5 : 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {t('copilot.insights')}
          </Typography>
          <List dense disablePadding>
            {answer.insights.map((insight, idx) => (
              <ListItem key={idx} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.4 }}>
                  <LightbulbOutlinedIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText primary={insight} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {answer.recommended_actions?.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {t('copilot.recommendedActions')}
          </Typography>
          <List dense disablePadding>
            {answer.recommended_actions.map((action, idx) => (
              <ListItem key={idx} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.4 }}>
                  <TaskAltOutlinedIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary={action} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
