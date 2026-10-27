import { useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { breakpoints, dashboardColumns, TOUCH_TARGET_MIN } from '@/design-system/breakpoints';

export type LayoutBand =
  | 'mobileSm'
  | 'mobile'
  | 'tablet'
  | 'tabletLandscape'
  | 'desktop'
  | 'largeDesktop'
  | 'commandCenter';

/**
 * Single source of responsive layout decisions for pages and shells.
 * Prefer this over ad-hoc useMediaQuery calls in feature pages.
 */
export function useResponsiveLayout() {
  const theme = useTheme();
  const isMobileSm = useMediaQuery(`(max-width:${breakpoints.mobile - 0.05}px)`);
  const isMobile = useMediaQuery(`(max-width:${breakpoints.tablet - 0.05}px)`);
  const isTablet = useMediaQuery(
    `(min-width:${breakpoints.tablet}px) and (max-width:${breakpoints.tabletLandscape - 0.05}px)`,
  );
  const isTabletLandscape = useMediaQuery(
    `(min-width:${breakpoints.tabletLandscape}px) and (max-width:${breakpoints.desktop - 0.05}px)`,
  );
  const isDesktop = useMediaQuery(
    `(min-width:${breakpoints.desktop}px) and (max-width:${breakpoints.largeDesktop - 0.05}px)`,
  );
  const isLargeDesktop = useMediaQuery(
    `(min-width:${breakpoints.largeDesktop}px) and (max-width:${breakpoints.commandCenter - 0.05}px)`,
  );
  const isCommandCenter = useMediaQuery(`(min-width:${breakpoints.commandCenter}px)`);
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isTouch = useMediaQuery('(hover: none), (pointer: coarse)');

  const band: LayoutBand = useMemo(() => {
    if (isCommandCenter) return 'commandCenter';
    if (isLargeDesktop) return 'largeDesktop';
    if (isDesktop) return 'desktop';
    if (isTabletLandscape) return 'tabletLandscape';
    if (isTablet) return 'tablet';
    if (isMobileSm) return 'mobileSm';
    return 'mobile';
  }, [isCommandCenter, isLargeDesktop, isDesktop, isTabletLandscape, isTablet, isMobileSm]);

  const columns =
    band === 'mobileSm' || band === 'mobile'
      ? dashboardColumns.mobile
      : band === 'tablet'
        ? dashboardColumns.tablet
        : band === 'tabletLandscape'
          ? dashboardColumns.tabletLandscape
          : band === 'desktop'
            ? dashboardColumns.desktop
            : band === 'largeDesktop'
              ? dashboardColumns.largeDesktop
              : dashboardColumns.commandCenter;

  const useMobileNav = isMobile;
  const useCompactFilters = isMobile || isTablet;
  const useTableCards = isMobile || (isTablet && !isLandscape);
  const useCommandCenterPriority = isMobile || isTablet;
  const showEvidenceInline = !isMobile && !isTablet;
  const density: 'compact' | 'comfortable' = isMobile || isTouch ? 'comfortable' : 'compact';

  return {
    band,
    columns,
    isMobileSm,
    isMobile,
    isTablet,
    isTabletLandscape,
    isDesktop,
    isLargeDesktop,
    isCommandCenter,
    isLandscape,
    prefersReducedMotion,
    isTouch,
    useMobileNav,
    useCompactFilters,
    useTableCards,
    useCommandCenterPriority,
    showEvidenceInline,
    density,
    touchTargetMin: TOUCH_TARGET_MIN,
    theme,
  };
}
