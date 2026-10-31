/**
 * Minimal analytics consent banner — reuses MUI Alert + existing chip button classes.
 * Shown only when analytics is configured and consent is unknown. No redesign of app chrome.
 */
import { useEffect, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { resolveAnalyticsConfig } from './config';
import { readConsent, writeConsent, type ConsentState } from './consent';
import { captureAnalyticsEvent, initPosthog } from './posthog';
import { ENGAGEMENT_EVENTS } from './events';
import { clearAnalyticsLocalData } from './client';

type Props = {
  onConsentChange?: (state: ConsentState) => void;
};

export function ConsentBanner({ onConsentChange }: Props) {
  const config = resolveAnalyticsConfig();
  const [consent, setConsent] = useState<ConsentState>(() => readConsent());

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  if (!config.enabled) return null;
  if (consent !== 'unknown') return null;

  const grant = () => {
    writeConsent('granted');
    setConsent('granted');
    initPosthog(config);
    captureAnalyticsEvent(ENGAGEMENT_EVENTS.consent_updated, { consent: 'granted' });
    onConsentChange?.('granted');
  };

  const deny = () => {
    writeConsent('denied');
    setConsent('denied');
    clearAnalyticsLocalData();
    onConsentChange?.('denied');
  };

  return (
    <Box
      component="div"
      role="dialog"
      aria-label="Analytics consent"
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.snackbar + 3,
        pointerEvents: 'none',
      }}
    >
      <Alert
        severity="info"
        sx={{
          borderRadius: 0,
          pointerEvents: 'auto',
          alignItems: 'center',
          py: 1,
        }}
        action={(
          <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
            <button type="button" className="gc-chip-btn is-mute" onClick={deny}>
              Decline
            </button>
            <button type="button" className="gc-chip-btn is-good" onClick={grant}>
              Accept
            </button>
          </Stack>
        )}
      >
        <Typography variant="body2" component="span">
          We use privacy-conscious analytics (PostHog) to understand which demo pages are useful.
          No patient data, prompts, or form inputs are collected. Session replay is off.
        </Typography>
      </Alert>
    </Box>
  );
}

export default ConsentBanner;
