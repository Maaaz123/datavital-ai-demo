import { vi } from 'vitest';
import { breakpoints } from '@/design-system/breakpoints';

function queryMatchesWidth(query: string, width: number): boolean {
  const maxOnly = query.match(/\(max-width:\s*([\d.]+)px\)/);
  if (maxOnly && !query.includes('min-width')) {
    return width <= Number(maxOnly[1]);
  }

  const minOnly = query.match(/\(min-width:\s*([\d.]+)px\)/);
  if (minOnly && !query.includes('max-width')) {
    return width >= Number(minOnly[1]);
  }

  const between = query.match(
    /\(min-width:\s*([\d.]+)px\)\s*and\s*\(max-width:\s*([\d.]+)px\)/,
  );
  if (between) {
    return width >= Number(between[1]) && width <= Number(between[2]);
  }

  if (query.includes('prefers-reduced-motion: reduce')) {
    return false;
  }
  if (query.includes('orientation: landscape')) {
    return false;
  }
  if (query.includes('hover: none') || query.includes('pointer: coarse')) {
    return false;
  }

  return false;
}

/** Mock window.matchMedia for a given viewport width (and optional feature flags). */
export function mockMatchMediaForWidth(
  width: number,
  options?: { reducedMotion?: boolean; landscape?: boolean; touch?: boolean },
): void {
  const reducedMotion = options?.reducedMotion ?? false;
  const landscape = options?.landscape ?? false;
  const touch = options?.touch ?? width < breakpoints.tablet;

  window.matchMedia = vi.fn().mockImplementation((query: string): MediaQueryList => {
    let matches = queryMatchesWidth(query, width);
    if (query.includes('prefers-reduced-motion: reduce')) {
      matches = reducedMotion;
    } else if (query.includes('orientation: landscape')) {
      matches = landscape;
    } else if (query.includes('hover: none') || query.includes('pointer: coarse')) {
      matches = touch;
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  });
}
