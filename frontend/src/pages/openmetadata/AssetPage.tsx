import { Alert, Box, Button, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import OpenMetadataSummaryPanel from '@/components/openmetadata/OpenMetadataSummaryPanel';
import { openMetadataAssetProfileUrl, openMetadataLineageUrl, openMetadataUiIntegrationEnabled } from '@/config/dataPlatform';

export default function AssetPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const fqn = searchParams.get('fqn')?.trim() ?? '';

  if (!fqn) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('openMetadata.asset.missingFqn')}
        </Alert>
        <Button component={RouterLink} to="/data/catalog" variant="contained">
          {t('openMetadata.catalog.title')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {fqn.split('.').pop()}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {fqn}
      </Typography>

      {!openMetadataUiIntegrationEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('openMetadata.integrationDisabled')}
        </Alert>
      )}

      <OpenMetadataSummaryPanel fqn={fqn} />

      <Button
        sx={{ mr: 1 }}
        variant="outlined"
        href={openMetadataLineageUrl(fqn)}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
      >
        {t('openMetadata.openLineage')}
      </Button>
      <Button
        variant="outlined"
        href={openMetadataAssetProfileUrl(fqn)}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
      >
        {t('openMetadata.openProfile')}
      </Button>
    </Box>
  );
}
