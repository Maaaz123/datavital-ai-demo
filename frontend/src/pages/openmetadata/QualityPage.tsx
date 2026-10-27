import {
  Alert,
  Box,
  Button,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getOpenMetadataFeaturedAssets } from '@/api/openMetadata';
import OpenMetadataSummaryPanel from '@/components/openmetadata/OpenMetadataSummaryPanel';
import { dataPlatformUrls, openMetadataUiIntegrationEnabled } from '@/config/dataPlatform';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';

export default function QualityPage() {
  const { t } = useTranslation();
  const featuredQ = useQuery({
    queryKey: ['om-featured-assets'],
    queryFn: getOpenMetadataFeaturedAssets,
    enabled: openMetadataUiIntegrationEnabled,
  });

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('openMetadata.quality.title')}
          </Typography>
          <Typography color="text.secondary">{t('openMetadata.quality.subtitle')}</Typography>
        </Box>
        <Button
          component="a"
          href={dataPlatformUrls.openMetadata}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
        >
          {t('openMetadata.openConsole')}
        </Button>
      </Stack>

      {!openMetadataUiIntegrationEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('openMetadata.integrationDisabled')}
        </Alert>
      )}

      {featuredQ.isLoading && <LoadingSkeleton variant="kpi" />}
      {featuredQ.isError && (
        <ErrorState
          variant="inline"
          message={t('openMetadata.quality.loadFailed')}
          onRetry={() => featuredQ.refetch()}
        />
      )}

      <Grid container spacing={2}>
        {(featuredQ.data?.assets ?? []).map((asset) => (
          <Grid item xs={12} md={6} key={asset.fqn}>
            <OpenMetadataSummaryPanel fqn={asset.fqn} compact />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
