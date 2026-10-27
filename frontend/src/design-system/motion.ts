/**
 * Professional healthcare motion tokens.
 * Prefer transform/opacity. Respect prefers-reduced-motion.
 */
export const motionDurations = {
  fast: 0.12,
  standard: 0.2,
  drawer: 0.32,
  page: 0.38,
  dataEmphasize: 0.7,
} as const;

export const motionEasings = {
  enter: [0.22, 1, 0.36, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  emphasis: [0.16, 1, 0.3, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
};

export const motionTokens = {
  durations: motionDurations,
  easings: motionEasings,
} as const;

/** Framer Motion variants — reduce to opacity-only when reduced motion is on. */
export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageVariantsReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const sectionVariants = {
  initial: { opacity: 0.94, y: 4 },
  animate: { opacity: 1, y: 0 },
};

export const kpiStaggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.025, delayChildren: 0.02 },
  },
};

export const kpiItemVariants = {
  initial: { opacity: 0.96, y: 3 },
  animate: { opacity: 1, y: 0 },
};

export const listItemVariants = {
  initial: { opacity: 0.96, y: 3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

export const chartItemVariants = {
  initial: { opacity: 0.94, y: 4 },
  animate: { opacity: 1, y: 0 },
};

export const drawerSlide = (rtl: boolean) => ({
  initial: { x: rtl ? '-100%' : '100%', opacity: 0.96 },
  animate: { x: 0, opacity: 1 },
  exit: { x: rtl ? '-100%' : '100%', opacity: 0.96 },
});

export const bottomSheetVariants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

export const fadeOnly = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
