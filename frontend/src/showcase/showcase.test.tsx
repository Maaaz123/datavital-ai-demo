import { beforeEach, describe, expect, it } from 'vitest';
import { featuredKpis } from '@/core/stories';
import { clearDemoStorage } from '@/showcase/state';
import { EXTENSIONS, SCREENS, TOUR } from '@/showcase/catalog';
import { KPIS, USE_CASES, findKpi } from '@/showcase/engine';
import { measure } from '@/showcase/measures';

describe('catalog coverage', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('keeps the internal screen, extension, KPI, and use-case catalogs', () => {
    expect(SCREENS).toHaveLength(39);
    expect(new Set(SCREENS.map((item) => item.id)).size).toBe(39);
    expect(EXTENSIONS).toHaveLength(14);
    expect(USE_CASES).toHaveLength(37);
    expect(KPIS.filter((item) => item.origin === 'catalog')).toHaveLength(192);
    expect(KPIS.filter((item) => item.origin === 'registry')).toHaveLength(188);
    expect(KPIS.filter((item) => item.origin === 'demo_assumption')).toHaveLength(35);
    expect(TOUR).toHaveLength(10);
    for (const item of [...SCREENS, ...EXTENSIONS]) {
      for (const key of featuredKpis(item.id)) expect(findKpi(key)?.key).toBe(key);
    }
  });

  it('keeps synthetic values deterministic and filter-sensitive', () => {
    const kpi = findKpi('kpi_ed_avg_los_hours');
    expect(kpi).toBeTruthy();
    const north = measure(kpi!, 'H1', 2026, 'Emergency');
    expect(measure(kpi!, 'H1', 2026, 'Emergency').value).toBe(north.value);
    expect(measure(kpi!, 'H2', 2026, 'Emergency').value).not.toBe(north.value);
    expect(measure(kpi!, 'H1', 2025, 'Emergency').value).not.toBe(north.value);
  });

  it('keeps a nonzero emergency mortality rate visible', () => {
    const item = measure(findKpi('kpi_ed_mortality_rate')!, 'H1', 2026, 'All');
    expect(item.value).toBeGreaterThan(0);
    expect(item.numerator).toBeGreaterThan(0);
    const shown = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(item.value * 100);
    expect(`${shown}%`).not.toBe('0%');
    expect(`${shown}%`).toBe('0.035%');
  });
});
