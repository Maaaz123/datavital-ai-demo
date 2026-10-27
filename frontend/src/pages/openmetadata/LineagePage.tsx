import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import OpenMetadataSummaryPanel from '@/components/openmetadata/OpenMetadataSummaryPanel';
import { dataPlatformUrls, openMetadataAssetProfileUrl, openMetadataLineageUrl, openMetadataUiIntegrationEnabled } from '@/config/dataPlatform';

const DEFAULT_FQN = 'hospital-analytics-postgres.hospital_analytics.gold.executive_kpi_daily';

export default function LineagePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('fqn') || DEFAULT_FQN;
  const [input, setInput] = useState(initial);
  const [fqn, setFqn] = useState(initial);

  const applyFqn = () => {
    const next = input.trim();
    if (!next) return;
    setFqn(next);
    setSearchParams({ fqn: next });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('openMetadata.lineage.title')}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {t('openMetadata.lineage.subtitle')}
      </Typography>

      {!openMetadataUiIntegrationEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('openMetadata.integrationDisabled')}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={3}>
        <TextField
          fullWidth
          size="small"
          label={t('openMetadata.lineage.fqnLabel')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFqn()}
        />
        <Button variant="contained" onClick={applyFqn}>
          {t('openMetadata.lineage.load')}
        </Button>
      </Stack>

      <OpenMetadataSummaryPanel fqn={fqn} title={t('openMetadata.lineage.summaryTitle')} />

      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
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
        <Button
          variant="text"
          href={dataPlatformUrls.openMetadata}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
        >
          {t('openMetadata.openConsole')}
        </Button>
      </Stack>
    </Box>
  );
}
