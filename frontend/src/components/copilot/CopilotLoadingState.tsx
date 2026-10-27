import { Avatar, Box, Paper, Skeleton, Stack } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useTranslation } from 'react-i18next';

export default function CopilotLoadingState() {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ maxWidth: '85%' }}>
      <Avatar sx={{ bgcolor: 'var(--hap-primary)', width: 32, height: 32 }}>
        <SmartToyOutlinedIcon fontSize="small" />
      </Avatar>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 240 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'var(--hap-primary)',
              animation: 'hap-pulse 1.2s ease-in-out infinite',
              '@keyframes hap-pulse': {
                '0%, 100%': { opacity: 0.3 },
                '50%': { opacity: 1 },
              },
            }}
          />
          <Box
            component="span"
            sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}
          >
            {t('copilot.thinking')}
          </Box>
        </Box>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="rounded" height={80} sx={{ mt: 1 }} />
      </Paper>
    </Stack>
  );
}
