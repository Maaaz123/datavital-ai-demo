import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { motionDurations, motionEasings, sectionVariants, fadeOnly } from '@/design-system/motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  /** When true, animate as the section enters the viewport (scroll). */
  onceInView?: boolean;
}

export default function AnimatedSection({ children, delay = 0, onceInView = false }: AnimatedSectionProps) {
  const reduced = useReducedMotionPreference();
  const variants = reduced ? fadeOnly : sectionVariants;

  return (
    <Box
      component={motion.div}
      variants={variants}
      initial="initial"
      animate={onceInView ? undefined : 'animate'}
      whileInView={onceInView ? 'animate' : undefined}
      viewport={onceInView ? { once: true, amount: 0.15, margin: '0px 0px -40px 0px' } : undefined}
      transition={{
        duration: reduced ? motionDurations.fast : motionDurations.standard,
        ease: motionEasings.enter,
        delay: reduced ? 0 : delay,
      }}
      sx={{ width: '100%', minWidth: 0 }}
    >
      {children}
    </Box>
  );
}
