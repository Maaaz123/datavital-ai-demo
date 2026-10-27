import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

interface SuggestedQuestionsProps {
  title?: string;
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
  horizontalScroll?: boolean;
}

export default function SuggestedQuestions({
  title,
  questions,
  onSelect,
  disabled,
  horizontalScroll,
}: SuggestedQuestionsProps) {
  if (!questions.length) return null;

  return (
    <Box>
      {title && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {title}
        </Typography>
      )}
      <Stack
        direction="row"
        spacing={1}
        flexWrap={horizontalScroll ? 'nowrap' : 'wrap'}
        useFlexGap
        sx={
          horizontalScroll
            ? {
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                pb: 0.5,
                '&::-webkit-scrollbar': { display: 'none' },
              }
            : undefined
        }
      >
        {questions.map((q) => (
          <Chip
            key={q}
            icon={<AutoAwesomeOutlinedIcon fontSize="small" />}
            label={q}
            variant="outlined"
            clickable
            disabled={disabled}
            onClick={() => onSelect(q)}
            sx={{
              mb: horizontalScroll ? 0 : 1,
              maxWidth: horizontalScroll ? 280 : '100%',
              flexShrink: horizontalScroll ? 0 : undefined,
              '& .MuiChip-label': { whiteSpace: horizontalScroll ? 'nowrap' : 'normal' },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
