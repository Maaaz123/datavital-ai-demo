import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface OverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, finalAction: string) => void;
  loading?: boolean;
}

export default function OverrideDialog({ open, onClose, onConfirm, loading }: OverrideDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [finalAction, setFinalAction] = useState('dismissed');

  const handleClose = () => {
    setReason('');
    setFinalAction('dismissed');
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim(), finalAction);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('clinicalAi.overrideTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            size="small"
            label={t('clinicalAi.finalAction')}
            value={finalAction}
            onChange={(e) => setFinalAction(e.target.value)}
            fullWidth
          >
            <MenuItem value="dismissed">{t('clinicalAi.overrideActions.dismissed')}</MenuItem>
            <MenuItem value="escalated">{t('clinicalAi.overrideActions.escalated')}</MenuItem>
            <MenuItem value="accepted">{t('clinicalAi.overrideActions.accepted')}</MenuItem>
          </TextField>
          <TextField
            size="small"
            label={t('clinicalAi.overrideReason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={3}
            required
            fullWidth
            error={!reason.trim()}
            helperText={!reason.trim() ? t('clinicalAi.overrideReasonRequired') : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('app.no')}</Button>
        <Button variant="contained" color="warning" onClick={handleConfirm} disabled={loading || !reason.trim()}>
          {t('clinicalAi.confirmOverride')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
