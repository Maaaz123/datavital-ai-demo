import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { getOpenMetadataFeaturedAssets, searchOpenMetadataAssets } from '@/api/openMetadata';
import { openMetadataUiIntegrationEnabled, dataPlatformUrls } from '@/config/dataPlatform';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import ErrorState from '@/components/common/ErrorState';

export default function CatalogPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('*');

  const searchQ = useQuery({
    queryKey: ['om-search', submitted],
    queryFn: () => searchOpenMetadataAssets(submitted, { size: 50 }),
    enabled: openMetadataUiIntegrationEnabled,
  });

  const featuredQ = useQuery({
    queryKey: ['om-featured-assets'],
    queryFn: getOpenMetadataFeaturedAssets,
    enabled: openMetadataUiIntegrationEnabled && Boolean(searchQ.data?.auth_required || (searchQ.data && (searchQ.data.results?.length ?? 0) === 0)),
  });

  const rows = useMemo(() => {
    if ((searchQ.data?.results?.length ?? 0) > 0) return searchQ.data!.results;
    return (featuredQ.data?.assets ?? []).map((a) => ({
      fqn: a.fqn,
      name: a.name || a.fqn.split('.').pop() || a.fqn,
      description: null,
      service: null,
      database: null,
      schema: a.fqn.split('.').slice(-2, -1)[0] ?? null,
      profile_url: a.profile_url || `${dataPlatformUrls.openMetadata}/table/${encodeURIComponent(a.fqn)}`,
      lineage_url: a.lineage_url || `${dataPlatformUrls.openMetadata}/table/${encodeURIComponent(a.fqn)}/lineage`,
    }));
  }, [searchQ.data, featuredQ.data?.assets]);

  const onSearch = () => {
    setSubmitted(query.trim() || '*');
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('openMetadata.catalog.title')}
          </Typography>
          <Typography color="text.secondary">{t('openMetadata.catalog.subtitle')}</Typography>
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

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('openMetadata.catalog.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" onClick={onSearch}>
          {t('openMetadata.catalog.search')}
        </Button>
      </Stack>

      {searchQ.isLoading && <LoadingSkeleton variant="table" />}
      {searchQ.isError && (
        <ErrorState
          variant="inline"
          message={t('openMetadata.catalog.searchFailed')}
          onRetry={() => searchQ.refetch()}
        />
      )}
      {searchQ.data?.auth_required && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {searchQ.data.message || t('openMetadata.catalog.authRequired')}
        </Alert>
      )}

      {searchQ.data && !searchQ.data.auth_required && (
        <Typography variant="body2" color="text.secondary" mb={1}>
          {t('openMetadata.catalog.resultCount', { count: searchQ.data.total })}
        </Typography>
      )}

      {rows.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('openMetadata.catalog.table')}</TableCell>
              <TableCell>{t('openMetadata.catalog.schema')}</TableCell>
              <TableCell>{t('openMetadata.catalog.service')}</TableCell>
              <TableCell align="right">{t('openMetadata.catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.fqn} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.fqn}
                  </Typography>
                </TableCell>
                <TableCell>{row.schema ?? '—'}</TableCell>
                <TableCell>{row.service ?? '—'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" gap={1}>
                    <Button size="small" component={RouterLink} to={`/data/asset?fqn=${encodeURIComponent(row.fqn)}`}>
                      {t('openMetadata.catalog.view')}
                    </Button>
                    <Button size="small" href={row.profile_url} target="_blank" rel="noopener noreferrer">
                      {t('openMetadata.openProfile')}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
