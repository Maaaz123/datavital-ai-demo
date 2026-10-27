/**
 * Centralized responsive breakpoints for the hospital platform.
 * Mobile-first: components default to mobile styles, then enhance with min-width queries.
 */
export const breakpoints = {
  /** Mobile Small: 320–374 */
  mobileSm: 320,
  /** Mobile: 375–599 */
  mobile: 375,
  /** Tablet Portrait: 600–899 */
  tablet: 600,
  /** Tablet Landscape: 900–1199 */
  tabletLandscape: 900,
  /** Desktop: 1200–1599 */
  desktop: 1200,
  /** Large Desktop: 1600–1919 */
  largeDesktop: 1600,
  /** Command Center wall displays: 1920+ */
  commandCenter: 1920,
  /** Ultra-wide / 4K ops boards */
  ultraWide: 2560,
} as const;

/** MUI-compatible theme breakpoints (aliases) */
export const muiBreakpoints = {
  xs: 0,
  sm: breakpoints.tablet,
  md: breakpoints.tabletLandscape,
  lg: breakpoints.desktop,
  xl: breakpoints.largeDesktop,
} as const;

export type BreakpointName = keyof typeof breakpoints;

export const breakpointUp = (name: BreakpointName): string =>
  `@media (min-width: ${breakpoints[name]}px)`;

export const breakpointDown = (name: BreakpointName): string =>
  `@media (max-width: ${breakpoints[name] - 0.05}px)`;

export const breakpointBetween = (min: BreakpointName, max: BreakpointName): string =>
  `@media (min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 0.05}px)`;

/** Dashboard grid column counts by viewport band */
export const dashboardColumns = {
  mobileSm: 1,
  mobile: 1,
  tablet: 2,
  tabletLandscape: 3,
  desktop: 4,
  largeDesktop: 5,
  commandCenter: 6,
} as const;

/** Minimum touch target (px) for interactive controls */
export const TOUCH_TARGET_MIN = 44;

/** Viewport presets used by automated responsive tests */
export const testViewports = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-8', width: 375, height: 667 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'iphone-14-pro-max', width: 430, height: 932 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'ipad-air', width: 820, height: 1180 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'fhd', width: 1920, height: 1080 },
  { name: 'qhd', width: 2560, height: 1440 },
] as const;
