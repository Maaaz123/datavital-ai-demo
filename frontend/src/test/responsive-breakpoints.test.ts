import { describe, it, expect } from 'vitest';
import { breakpoints, testViewports } from '@/design-system/breakpoints';

const REQUIRED_BREAKPOINTS = [320, 375, 600, 900, 1200, 1600, 1920] as const;

describe('responsive breakpoints', () => {
  it('exposes required breakpoint pixel values', () => {
    expect(breakpoints.mobileSm).toBe(REQUIRED_BREAKPOINTS[0]);
    expect(breakpoints.mobile).toBe(REQUIRED_BREAKPOINTS[1]);
    expect(breakpoints.tablet).toBe(REQUIRED_BREAKPOINTS[2]);
    expect(breakpoints.tabletLandscape).toBe(REQUIRED_BREAKPOINTS[3]);
    expect(breakpoints.desktop).toBe(REQUIRED_BREAKPOINTS[4]);
    expect(breakpoints.largeDesktop).toBe(REQUIRED_BREAKPOINTS[5]);
    expect(breakpoints.commandCenter).toBe(REQUIRED_BREAKPOINTS[6]);
  });

  it('provides at least eleven automated test viewports', () => {
    expect(testViewports.length).toBeGreaterThanOrEqual(11);
  });
});
