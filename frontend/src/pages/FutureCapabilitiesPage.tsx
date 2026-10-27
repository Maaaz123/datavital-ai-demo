import { Alert, Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CompactPageHeader from '@/components/layout/CompactPageHeader';

const ITEMS = [
  { key: 'om', titleKey: 'opsDemo.futureOmTitle', bodyKey: 'opsDemo.futureOmBody' },
  { key: 'catalog', titleKey: 'opsDemo.futureCatalogTitle', bodyKey: 'opsDemo.futureCatalogBody' },
  { key: 'lineage', titleKey: 'opsDemo.futureLineageTitle', bodyKey: 'opsDemo.futureLineageBody' },
  { key: 'mdm', titleKey: 'opsDemo.futureMdmTitle', bodyKey: 'opsDemo.futureMdmBody' },
  { key: 'predictive', titleKey: 'opsDemo.futurePredictiveTitle', bodyKey: 'opsDemo.futurePredictiveBody' },
];

export default function FutureCapabilitiesPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <CompactPageHeader title={t('opsDemo.futureTitle')} subtitle={t('opsDemo.futureSubtitle')} />
      <Alert severity="info" sx={{ mb: 2 }}>{t('opsDemo.futureBanner')}</Alert>
      <Grid container spacing={2}>
        {ITEMS.map((item) => (
          <Grid item xs={12} md={6} key={item.key}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="overline" color="primary.main">{t('opsDemo.comingSoon')}</Typography>
                  <Typography variant="h6">{t(item.titleKey)}</Typography>
                  <Typography variant="body2" color="text.secondary">{t(item.bodyKey)}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
