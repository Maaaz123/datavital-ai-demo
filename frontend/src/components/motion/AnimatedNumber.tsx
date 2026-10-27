import { useEffect, useRef, useState } from 'react';
import { Typography, type TypographyProps } from '@mui/material';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { motionDurations } from '@/design-system/motion';

type NumberFormat = 'integer' | 'decimal' | 'percent' | 'currency' | 'duration' | 'compact';

interface AnimatedNumberProps extends Omit<TypographyProps, 'children'> {
  value: number;
  format?: NumberFormat;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  currency?: string;
}

function formatValue(
  value: number,
  format: NumberFormat,
  decimals: number,
  prefix: string,
  suffix: string,
  currency: string,
): string {
  if (format === 'percent') {
    return `${prefix}${value.toFixed(decimals)}%${suffix}`;
  }
  if (format === 'currency') {
    return `${prefix}${new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
    }).format(value)}${suffix}`;
  }
  if (format === 'compact') {
    return `${prefix}${new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: decimals }).format(value)}${suffix}`;
  }
  if (format === 'duration') {
    const mins = Math.round(value);
    if (mins < 60) return `${prefix}${mins} min${suffix}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${prefix}${h}h ${m}m${suffix}`;
  }
  if (format === 'integer') {
    return `${prefix}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value))}${suffix}`;
  }
  return `${prefix}${new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(value)}${suffix}`;
}

/** Animate numeric KPI values on load/refresh; skip tween when reduced-motion. */
export default function AnimatedNumber({
  value,
  format = 'decimal',
  decimals = 1,
  prefix = '',
  suffix = '',
  currency = 'SAR',
  ...typographyProps
}: AnimatedNumberProps) {
  const reduced = useReducedMotionPreference();
  const isTest = import.meta.env.MODE === 'test';
  const skipTween = reduced || isTest;
  const [display, setDisplay] = useState(() => (skipTween ? value : 0));
  const fromRef = useRef(skipTween ? value : 0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (skipTween || Number.isNaN(value)) {
      setDisplay(value);
      fromRef.current = value;
      mountedRef.current = true;
      return;
    }

    // First paint: count up from 0. Later updates: tween from previous value.
    const from = mountedRef.current ? fromRef.current : 0;
    mountedRef.current = true;
    fromRef.current = from;
    setDisplay(from);

    const start = performance.now();
    const duration = motionDurations.dataEmphasize * 1000;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        setDisplay(value);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, skipTween]);

  return (
    <Typography {...typographyProps} component="span">
      {formatValue(display, format, decimals, prefix, suffix, currency)}
    </Typography>
  );
}
