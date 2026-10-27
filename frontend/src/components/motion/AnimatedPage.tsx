import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { motionDurations, motionEasings, pageVariants, pageVariantsReduced } from '@/design-system/motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface AnimatedPageProps {
  children: ReactNode;
}

/** Subtle route content transition — shell stays stable. */
export default function AnimatedPage({ children }: AnimatedPageProps) {
  const location = useLocation();
  const reduced = useReducedMotionPreference();
  const variants = reduced ? pageVariantsReduced : pageVariants;

  return (
    <AnimatePresence mode="wait">
      <Box
        component={motion.div}
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: reduced ? motionDurations.fast : motionDurations.page,
          ease: motionEasings.enter,
        }}
        sx={{ width: '100%', minWidth: 0 }}
      >
        {children}
      </Box>
    </AnimatePresence>
  );
}
