import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { cssVar, cssVarNames, severityCssVar } from '@/design-system/colors';
import type { SituationSeverity } from './types';

interface SituationSummaryProps {
  text?: string;
  children?: ReactNode;
  severity?: SituationSeverity;
}

const severityStyles: Record<
  SituationSeverity,
  { border: string; bg: string; Icon: typeof InfoOutlinedIcon }
> = {
  neutral: {
    border: cssVar(cssVarNames.border),
    bg: cssVar(cssVarNames.bgPaper),
    Icon: InfoOutlinedIcon,
  },
  info: {
    border: cssVar(severityCssVar.info),
    bg: `${cssVar(severityCssVar.info)}0D`,
    Icon: InfoOutlinedIcon,
  },
  warning: {
    border: cssVar(severityCssVar.warning),
    bg: `${cssVar(severityCssVar.warning)}0D`,
    Icon: WarningAmberOutlinedIcon,
  },
  critical: {
    border: cssVar(severityCssVar.critical),
    bg: `${cssVar(severityCssVar.critical)}0D`,
    Icon: ErrorOutlineIcon,
  },
};

export default function SituationSummary({
  text,
  children,
  severity = 'neutral',
}: SituationSummaryProps) {
  const styles = severityStyles[severity];
  const Icon = styles.Icon;
  const content = children ?? text;

  if (!content) return null;

  return (
    <Box
      role="region"
      aria-label="Situation summary"
      data-testid="situation-summary"
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        px: 1.25,
        py: 1,
        minHeight: 120,
        height: '100%',
        borderRadius: '6px',
        border: `1px solid ${styles.border}`,
        bgcolor: styles.bg,
      }}
    >
      <Icon sx={{ mt: 0.15, fontSize: 18, color: styles.border, flexShrink: 0 }} aria-hidden />
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children ? (
          children
        ) : (
          <Typography
            sx={{
              fontSize: 13,
              lineHeight: 1.4,
              color: cssVar(cssVarNames.textPrimary),
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
