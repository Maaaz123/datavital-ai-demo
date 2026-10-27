import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NetworkStatusBanner from '@/components/shell/NetworkStatusBanner';

interface OfflineAppShellProps {
  children: ReactNode;
}

/**
 * Wraps the app with network awareness. When offline with a cached shell,
 * surfaces a clear warning that clinical data is unavailable — never implies stale PHI is current.
 */
export default function OfflineAppShell({ children }: OfflineAppShellProps) {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [shellCached, setShellCached] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then(() => setShellCached(true))
      .catch(() => setShellCached(false));
  }, []);

  const showClinicalWarning = offline && shellCached;

  return (
    <>
      {showClinicalWarning && (
        <Box
          component="div"
          role="status"
          aria-live="polite"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.snackbar + 2,
            width: '100%',
          }}
        >
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {t('network.offline')} — {t('network.staleWarning')}
          </Alert>
        </Box>
      )}
      {children}
      <NetworkStatusBanner />
    </>
  );
}
