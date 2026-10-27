import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { getOpenMetadataAssetSummary } from '@/api/openMetadata';
import { openMetadataUiIntegrationEnabled } from '@/config/dataPlatform';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';

interface Props {
  fqn: string;
  title?: string;
  compact?: boolean;
}

export default function OpenMetadataSummaryPanel({ fqn, title, compact = false }: Props) {
  const { t } = useTranslation();
  const enabled = openMetadataUiIntegrationEnabled;
  const q = useQuery({
    queryKey: ['om-asset-summary', fqn],
    queryFn: () => getOpenMetadataAssetSummary(fqn),
    enabled: Boolean(fqn),
  });

  if (!fqn) return null;

  if (!enabled) {
    return (
      <Alert severity="info" sx={{ mb: compact ? 0 : 2 }}>
        {t('openMetadata.integrationDisabled')}
      </Alert>
    );
  }

  if (q.isLoading) return <LoadingSkeleton variant="kpi" />;
  if (q.isError) {
    return (
      <Alert severity="warning" sx={{ mb: compact ? 0 : 2 }}>
        {t('openMetadata.summaryUnavailable', { fqn })}
      </Alert>
    );
  }

  const s = q.data;
  if (!s) return null;

  return (
    <Box
      sx={{
        mb: compact ? 0 : 2,
        p: compact ? 1.5 : 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant={compact ? 'subtitle2' : 'subtitle1'} gutterBottom>
        {title ?? s.name ?? fqn.split('.').pop()}
      </Typography>
      {!compact && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {s.fqn || fqn}
        </Typography>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        {s.owner && <Chip size="small" label={t('openMetadata.owner', { name: s.owner })} />}
        {s.certification && <Chip size="small" color="success" label={s.certification} />}
        {s.contract_status && <Chip size="small" label={t('openMetadata.contract', { status: s.contract_status })} />}
        {s.quality_status && <Chip size="small" label={t('openMetadata.quality', { status: s.quality_status })} />}
        {s.freshness_status && <Chip size="small" label={t('openMetadata.freshness', { status: s.freshness_status })} />}
        {typeof s.failed_tests === 'number' && s.failed_tests > 0 && (
          <Chip size="small" color="error" label={t('openMetadata.failedTests', { count: s.failed_tests })} />
        )}
        {(s.classifications || []).map((c) => (
          <Chip key={c} size="small" variant="outlined" label={c} />
        ))}
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {s.profile_url && (
          <Button
            size="small"
            component={Link}
            href={s.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            {t('openMetadata.openProfile')}
          </Button>
        )}
        {s.lineage_url && (
          <Button
            size="small"
            component={Link}
            href={s.lineage_url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            {t('openMetadata.openLineage')}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
