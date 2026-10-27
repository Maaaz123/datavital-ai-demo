import { Alert, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ClinicalSafetyBanner() {
  const { i18n, t } = useTranslation();
  const showAr = i18n.language === 'ar';

  return (
    <Alert severity="warning" sx={{ mb: 2 }} data-testid="clinical-safety-banner">
      <Typography variant="body2">{t('clinicalAi.safetyBanner')}</Typography>
      {showAr && (
        <Typography variant="body2" sx={{ mt: 1, direction: 'rtl' }}>
          {t('clinicalAi.safetyBannerAr')}
        </Typography>
      )}
    </Alert>
  );
}
