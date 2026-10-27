import type { SxProps, Theme } from '@mui/material';

export const fontFamily =
  '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const typographyScale = {
  displayTitle: {
    fontFamily,
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
  },
  pageTitle: {
    fontFamily,
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  sectionTitle: {
    fontFamily,
    fontSize: '1rem',
    fontWeight: 650,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
  },
  cardTitle: {
    fontFamily,
    fontSize: '0.9375rem',
    fontWeight: 650,
    lineHeight: 1.35,
  },
  kpiValue: {
    fontFamily,
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  kpiValueCompact: {
    fontFamily,
    fontSize: '1.25rem',
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  kpiLabel: {
    fontFamily,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
    color: 'inherit',
  },
  chartTitle: {
    fontFamily,
    fontSize: '0.9375rem',
    fontWeight: 650,
    lineHeight: 1.3,
  },
  tableHeader: {
    fontFamily,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body: {
    fontFamily,
    fontSize: '0.9375rem',
    fontWeight: 400,
    lineHeight: 1.55,
  },
  supporting: {
    fontFamily,
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  metadata: {
    fontFamily,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.45,
  },
} as const;

export type TypographyToken = keyof typeof typographyScale;

export function typographySx(token: TypographyToken): SxProps<Theme> {
  return typographyScale[token];
}
