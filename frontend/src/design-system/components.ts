import type { SxProps, Theme } from '@mui/material';
import { cssVar, cssVarNames } from './colors';
import { layoutDensity } from './layout';
import { spacing } from './spacing';

export const borderRadius = layoutDensity.borderRadius;

export const pageGutter: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2, lg: 2.5 },
  py: { xs: 1.5, sm: 1.75 },
};

/** Flat bordered panel — prefer over nested shadow cards */
export const sectionPanel: SxProps<Theme> = {
  bgcolor: cssVar(cssVarNames.bgPaper),
  border: `1px solid ${cssVar(cssVarNames.border)}`,
  borderRadius: `${borderRadius}px`,
  boxShadow: 'none',
  p: `${layoutDensity.cardPadding}px`,
};

export const quietBorder: SxProps<Theme> = {
  border: `1px solid ${cssVar(cssVarNames.border)}`,
};

export const panelHeader: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: `${spacing[2]}px`,
  mb: `${spacing[2]}px`,
};

export const denseSectionGap = layoutDensity.sectionGap / 8;
