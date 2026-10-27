import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { useDomainSituation } from '@/hooks/useDomainSituation';
import { buildSituationFromKpis } from '@/utils/situationFromKpis';
import type { KPICardData } from '@/types/api';

const theme = createTheme();

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </I18nextProvider>
  );
}

const sampleKpis: KPICardData[] = [
  { key: 'total_visits', label: 'Total Visits', value: 120, format: 'number', severity: 'healthy' },
  {
    key: 'avg_wait',
    label: 'Avg Wait',
    value: 45,
    unit: 'min',
    format: 'number',
    severity: 'critical',
    trend: 12,
    trend_direction: 'up',
  },
  { key: 'lwbs_rate', label: 'LWBS Rate', value: 3.2, format: 'percent', severity: 'warning' },
];

describe('buildSituationFromKpis', () => {
  it('returns null when kpis are empty or undefined', () => {
    expect(buildSituationFromKpis(undefined, { domain: 'emergency' })).toBeNull();
    expect(buildSituationFromKpis([], { domain: 'emergency' })).toBeNull();
  });

  it('prioritizes critical KPIs in the situation text', () => {
    const result = buildSituationFromKpis(sampleKpis, { domain: 'emergency', locale: 'en' });
    expect(result).not.toBeNull();
    expect(result!.text).toContain('Avg Wait');
    expect(result!.text).toContain('45');
    expect(result!.severity).toBe('critical');
    expect(result!.observedFact).toBeTruthy();
    expect(result!.recommendedAction).toContain('critical');
  });

  it('includes secondary KPI context in the situation text', () => {
    const result = buildSituationFromKpis(sampleKpis, { domain: 'emergency', locale: 'en' });
    expect(result!.text).toContain('Total Visits');
    expect(result!.text).toContain('120');
  });
});

describe('useDomainSituation', () => {
  it('returns situation and insight panels when KPIs are present', () => {
    const { result } = renderHook(() => useDomainSituation(sampleKpis, 'emergency'), { wrapper });
    expect(result.current.situationSummary).not.toBeNull();
    expect(result.current.insightPanel).not.toBeNull();
  });

  it('returns null panels when KPIs are missing', () => {
    const { result } = renderHook(() => useDomainSituation(undefined, 'emergency'), { wrapper });
    expect(result.current.situationSummary).toBeNull();
    expect(result.current.insightPanel).toBeNull();
  });
});
