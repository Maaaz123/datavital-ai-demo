import { useEffect, useState } from 'react';
import { useMediaQuery } from '@mui/material';

/** Respect OS prefers-reduced-motion for animation components. */
export function useReducedMotionPreference(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Briefly highlight UI when a watched value changes (material KPI/alert updates). */
export function useDataChangeHighlight(signal: unknown, durationMs = 700): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const id = window.setTimeout(() => setActive(false), durationMs);
    return () => window.clearTimeout(id);
  }, [signal, durationMs]);

  return active;
}
