import { useState } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { postFeedback } from '@/api/copilot';
import type { CopilotFeedbackRating } from '@/types/copilot';

interface FeedbackButtonsProps {
  messageId: string;
}

export default function FeedbackButtons({ messageId }: FeedbackButtonsProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<CopilotFeedbackRating | null>(null);

  const mutation = useMutation({
    mutationFn: (rating: CopilotFeedbackRating) => postFeedback(messageId, rating),
    onSuccess: (_data, rating) => setSelected(rating),
  });

  if (selected) {
    return (
      <Typography variant="caption" color="text.secondary">
        {t('copilot.feedbackThanks')}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Tooltip title={t('copilot.feedbackHelpful')}>
        <span>
          <IconButton size="small" disabled={mutation.isPending} onClick={() => mutation.mutate('helpful')}>
            {selected === 'helpful' ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('copilot.feedbackNotHelpful')}>
        <span>
          <IconButton size="small" disabled={mutation.isPending} onClick={() => mutation.mutate('not_helpful')}>
            {selected === 'not_helpful' ? <ThumbDownIcon fontSize="small" /> : <ThumbDownOutlinedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
