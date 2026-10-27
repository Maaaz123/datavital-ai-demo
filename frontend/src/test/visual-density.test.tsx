import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import SituationSummary from '@/components/ux/SituationSummary';
import DecisionPriorityList from '@/components/product/DecisionPriorityList';
import { selectExecutivePrimaryKpis, formatQualityPercent } from '@/utils/selectExecutiveKpis';
import { layoutDensity } from '@/design-system/layout';
import { testViewports } from '@/design-system/breakpoints';
import type { KPICardData } from '@/types/api';

const theme = createTheme();

const sampleKpis: KPICardData[] = [
  { key: 'total_beds', label: 'Total Beds', value: 100 },
  { key: 'emergency_visits', label: 'Emergency Visits', value: 40 },
  { key: 'inpatient_admissions', label: 'Inpatient Admissions', value: 20 },
  { key: 'outpatient_visits', label: 'Outpatient Visits', value: 30 },
  { key: 'bed_occupancy_rate', label: 'Bed Occupancy Rate', value: 88, unit: '%', format: 'percent' },
  { key: 'avg_length_of_stay', label: 'Average Length of Stay', value: 4.2, unit: 'days' },
  { key: 'net_revenue', label: 'Net Revenue', value: 1_200_000, format: 'currency' },
  { key: 'claim_denial_rate', label: 'Claim Denial Rate', value: 9.1, unit: '%', format: 'percent', severity: 'warning' },
];

describe('commercial density — executive KPI selection', () => {
  it('selects five commercial primary KPIs with operational health dominant', () => {
    const primary = selectExecutivePrimaryKpis(sampleKpis, { edWaitMinutes: 42 });
    expect(primary).toHaveLength(5);
    expect(primary.map((k) => k.key)).toEqual([
      'operational_health',
      'patient_volume',
      'ed_wait_minutes',
      'net_revenue',
      'claim_denial_rate',
    ]);
    expect(primary[0].value).toBe(88);
    expect(primary[1].value).toBe(90);
    expect(primary[2].value).toBe(42);
  });

  it('never displays absurd quality percentages', () => {
    expect(formatQualityPercent(51002, '%')).toBeNull();
    expect(formatQualityPercent(98.4, '%')).toBe('98.4%');
    expect(formatQualityPercent(0.94)).toBe('94.0%');
  });
});

describe('commercial density — layout tokens', () => {
  it('keeps enterprise spacing within compact bounds', () => {
    expect(layoutDensity.sectionGap).toBeLessThanOrEqual(24);
    expect(layoutDensity.kpiPadding).toBeLessThanOrEqual(18);
    expect(layoutDensity.chartMain).toBeLessThanOrEqual(380);
    expect(layoutDensity.chartCompact).toBeGreaterThanOrEqual(240);
    expect(layoutDensity.chartCompact).toBeLessThanOrEqual(280);
    expect(layoutDensity.headerHeight).toBeLessThanOrEqual(56);
  });
});

describe('commercial density — decision priority compact list', () => {
  it('renders compact priority list without oversized table chrome', () => {
    render(
      <ThemeProvider theme={theme}>
        <DecisionPriorityList
          onNavigate={() => undefined}
          items={[
            {
              id: '1',
              severity: 'critical',
              issue: 'Critical lab pending',
              area: 'Laboratory',
              metricLabel: 'Pending',
              metricValue: '5h',
              changeLabel: '',
              investigation: 'Review queue',
              href: '/laboratory',
            },
          ]}
        />
        <SituationSummary text="Denial rate elevated." severity="warning" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Critical lab pending')).toBeInTheDocument();
    expect(screen.getByTestId('situation-summary')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

/** Visual regression viewport matrix (LTR + RTL documentation for CI). */
describe('visual regression viewports', () => {
  const required = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ];

  it('covers required commercial visual sizes in both directions', () => {
    for (const size of required) {
      const match = testViewports.find((v) => v.width === size.width && v.height === size.height);
      expect(match, `missing viewport ${size.width}x${size.height}`).toBeTruthy();
    }
  });

  it('documents LTR and RTL matrix snapshot', () => {
    const matrix = required.flatMap((v) => [
      { ...v, dir: 'ltr' as const },
      { ...v, dir: 'rtl' as const },
    ]);
    expect(matrix).toMatchSnapshot();
  });
});
