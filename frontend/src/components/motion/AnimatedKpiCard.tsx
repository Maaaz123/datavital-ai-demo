import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { kpiItemVariants, kpiStaggerContainer, motionDurations, motionEasings } from '@/design-system/motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { useDataChangeHighlight } from '@/hooks/useReducedMotionPreference';
import { cssVar, cssVarNames } from '@/design-system/colors';

interface AnimatedKpiCardProps {
  children: ReactNode;
  changeKey?: string | number;
  index?: number;
}

export default function AnimatedKpiCard({ children, changeKey, index = 0 }: AnimatedKpiCardProps) {
  const reduced = useReducedMotionPreference();
  const highlight = useDataChangeHighlight(changeKey ?? '', 700);

  return (
    <Box
      component={motion.div}
      variants={kpiItemVariants}
      initial={reduced ? false : 'initial'}
      animate="animate"
      transition={{
        duration: reduced ? 0 : motionDurations.standard,
        ease: motionEasings.enter,
        delay: reduced ? 0 : 0.05 + index * 0.055,
      }}
      sx={{
        height: '100%',
        minWidth: 0,
        borderRadius: 1,
        outline: highlight ? `2px solid ${cssVar(cssVarNames.primary)}` : '2px solid transparent',
        outlineOffset: 0,
        transition: reduced ? undefined : 'outline-color 0.45s ease',
      }}
    >
      {children}
    </Box>
  );
}

/** Parent stagger wrapper for KPI rows. */
export function AnimatedKpiRow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPreference();
  if (reduced) return <>{children}</>;
  return (
    <Box
      component={motion.div}
      variants={kpiStaggerContainer}
      initial="initial"
      animate="animate"
      sx={{ display: 'contents' }}
    >
      {children}
    </Box>
  );
}
