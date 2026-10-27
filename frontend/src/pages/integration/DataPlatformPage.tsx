import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import CableOutlinedIcon from '@mui/icons-material/CableOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { dataPlatformUrls } from '@/config/dataPlatform';

type ToolCard = {
  id: 'airbyte' | 'dagster' | 'openMetadata';
  url: string;
  icon: ReactNode;
  roleKey: string;
  descKey: string;
  color: string;
};

const TOOLS: ToolCard[] = [
  {
    id: 'airbyte',
    url: dataPlatformUrls.airbyte,
    icon: <CableOutlinedIcon fontSize="large" />,
    roleKey: 'dataPlatform.tools.airbyte.role',
    descKey: 'dataPlatform.tools.airbyte.description',
    color: 'primary.main',
  },
  {
    id: 'dagster',
    url: dataPlatformUrls.dagster,
    icon: <AccountTreeOutlinedIcon fontSize="large" />,
    roleKey: 'dataPlatform.tools.dagster.role',
    descKey: 'dataPlatform.tools.dagster.description',
    color: 'info.main',
  },
  {
    id: 'openMetadata',
    url: dataPlatformUrls.openMetadata,
    icon: <MenuBookOutlinedIcon fontSize="large" />,
    roleKey: 'dataPlatform.tools.openMetadata.role',
    descKey: 'dataPlatform.tools.openMetadata.description',
    color: 'success.main',
  },
];

export default function DataPlatformPage() {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dataPlatform.title')}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {t('dataPlatform.subtitle')}
      </Typography>

      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            {t('dataPlatform.flowTitle')}
          </Typography>
          <Typography
            component="pre"
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              m: 0,
              color: 'text.secondary',
            }}
          >
            {t('dataPlatform.flowDiagram')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
            <Chip size="small" label={t('dataPlatform.chip.rawOnly')} color="warning" variant="outlined" />
            <Chip size="small" label={t('dataPlatform.chip.orchestrated')} color="info" variant="outlined" />
            <Chip size="small" label={t('dataPlatform.chip.governed')} color="success" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} mb={3}>
        {TOOLS.map((tool) => (
          <Grid item xs={12} md={4} key={tool.id}>
            <Card sx={{ height: '100%', borderTop: 3, borderColor: tool.color }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ color: tool.color, mb: 1 }}>{tool.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {t(`dataPlatform.tools.${tool.id}.name`)}
                </Typography>
                <Typography variant="overline" display="block" color="text.secondary">
                  {t(tool.roleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mt: 1, mb: 2 }}>
                  {t(tool.descKey)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', mb: 1.5 }}>
                  {tool.url}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('dataPlatform.openConsole')}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {t('dataPlatform.quickStartTitle')}
          </Typography>
          <Typography
            component="pre"
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              m: 0,
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {t('dataPlatform.quickStartCommands')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
