import { useEffect, useState } from 'react';
import { Alert, Snackbar, Button, Typography, Stack } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';
import { useFilterStore } from '@/store/filterStore';
import dayjs from 'dayjs';

type ConnState = 'online' | 'offline' | 'reconnecting' | 'slow';

/**
 * Network awareness banner — never implies stale clinical data is current.
 * Does not cache patient/clinical payloads.
 */
export default function NetworkStatusBanner() {
  const { t } = useTranslation();
  const lastRefreshAt = useFilterStore((s) => s.lastRefreshAt);
  const [state, setState] = useState<ConnState>(navigator.onLine ? 'online' : 'offline');
  const [slowHint, setSlowHint] = useState(false);

  useEffect(() => {
    const onOnline = () => setState('reconnecting');
    const onOffline = () => setState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    let slowTimer: number | undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        setSlowHint(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Detect slow: if online event fires, brief reconnecting then online
    const reconnectWatch = () => {
      if (state === 'reconnecting') {
        slowTimer = window.setTimeout(() => setState('online'), 800);
      }
    };
    reconnectWatch();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      if (slowTimer) window.clearTimeout(slowTimer);
    };
  }, [state]);

  useEffect(() => {
    const markSlow = () => setSlowHint(true);
    // Heuristic: long pending fetch via performance (light)
    const timer = window.setInterval(() => {
      if (!navigator.onLine) return;
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const recent = entries.slice(-5).find((e) => e.duration > 8000 && e.name.includes('/api/'));
      if (recent) markSlow();
    }, 10000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  if (state === 'online' && !slowHint) return null;

  const severity = state === 'offline' ? 'error' : state === 'reconnecting' ? 'info' : 'warning';
  const message =
    state === 'offline'
      ? t('network.offline')
      : state === 'reconnecting'
        ? t('network.reconnecting')
        : t('network.slow');

  return (
    <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 16, sm: 24 } }}>
      <Alert
        severity={severity}
        icon={state === 'offline' ? <WifiOffIcon /> : <SyncIcon />}
        action={
          state === 'offline' ? (
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              {t('network.retry')}
            </Button>
          ) : undefined
        }
        sx={{ alignItems: 'center', maxWidth: 480 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="body2">{message}</Typography>
          {lastRefreshAt && (
            <Typography variant="caption">
              {t('network.lastSuccessful')}: {dayjs(lastRefreshAt).format('YYYY-MM-DD HH:mm:ss')} —{' '}
              {t('network.staleWarning')}
            </Typography>
          )}
        </Stack>
      </Alert>
    </Snackbar>
  );
}
