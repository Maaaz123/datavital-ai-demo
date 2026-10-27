import { useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ClinicalReviewFormProps {
  onSubmit: (status: string, note: string) => void;
  loading?: boolean;
  statusOptions?: string[];
}

const DEFAULT_STATUSES = ['pending', 'in_review', 'reviewed', 'escalated', 'rejected'];

export default function ClinicalReviewForm({ onSubmit, loading, statusOptions = DEFAULT_STATUSES }: ClinicalReviewFormProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('reviewed');
  const [note, setNote] = useState('');

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(status, note); }}>
      <Stack spacing={2}>
        <TextField
          select
          size="small"
          label={t('clinicalAi.reviewStatus')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          fullWidth
        >
          {statusOptions.map((s) => (
            <MenuItem key={s} value={s}>{t(`clinicalAi.reviewStatuses.${s}`, s)}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label={t('clinicalAi.clinicalNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={loading}>
          {t('clinicalAi.submitReview')}
        </Button>
      </Stack>
    </Box>
  );
}
