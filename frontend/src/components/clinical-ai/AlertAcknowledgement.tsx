import { Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';

interface AlertAcknowledgementProps {
  onAcknowledge: () => void;
  loading?: boolean;
  acknowledged?: boolean;
}

export default function AlertAcknowledgement({ onAcknowledge, loading, acknowledged }: AlertAcknowledgementProps) {
  const { t } = useTranslation();

  if (acknowledged) {
    return (
      <Button size="small" disabled startIcon={<CheckCircleOutlineIcon />} color="success">
        {t('clinicalAi.acknowledged')}
      </Button>
    );
  }

  return (
    <Button size="small" variant="outlined" onClick={onAcknowledge} disabled={loading}>
      {t('clinicalAi.acknowledgeAlert')}
    </Button>
  );
}
