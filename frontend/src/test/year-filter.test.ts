import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { resolveClientYearWindow, defaultCalendarYear } from '@/utils/yearWindow';
import { formatKpiValue } from '@/utils/formatKpiValue';
import type { KPICardData } from '@/types/api';

describe('yearWindow', () => {
  it('defaults to current calendar year', () => {
    expect(defaultCalendarYear(dayjs('2026-08-09'))).toBe(2026);
  });

  it('builds YTD window for current year', () => {
    const w = resolveClientYearWindow(2026, dayjs('2026-08-09'));
    expect(w.date_from).toBe('2026-01-01');
    expect(w.date_to).toBe('2026-08-09');
    expect(w.label).toBe('2026 YTD');
    expect(w.is_current_year).toBe(true);
  });

  it('builds full-year window for prior year', () => {
    const w = resolveClientYearWindow(2025, dayjs('2026-08-09'));
    expect(w.date_from).toBe('2025-01-01');
    expect(w.date_to).toBe('2025-12-31');
    expect(w.label).toBe('2025');
    expect(w.is_current_year).toBe(false);
  });
});

describe('formatKpiValue year states', () => {
  it('never returns bare em dash for NO_DATA', () => {
    const kpi: KPICardData = {
      key: 'x',
      label: 'X',
      value: null,
      render_state: 'NO_DATA',
      unavailable_reason: 'missing source',
    };
    const formatted = formatKpiValue(kpi);
    expect(formatted).not.toBe('—');
    expect(formatted.toLowerCase()).toContain('no data');
  });

  it('formats VALID_ZERO as 0', () => {
    const kpi: KPICardData = {
      key: 'z',
      label: 'Z',
      value: 0,
      render_state: 'VALID_ZERO',
      data_status: 'available',
    };
    expect(formatKpiValue(kpi)).toMatch(/^0/);
  });
});
