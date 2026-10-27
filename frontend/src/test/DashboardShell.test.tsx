import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import KpiGrid from '@/components/dashboard/KpiGrid';
import DashboardShell from '@/components/dashboard/DashboardShell';
import VitalSignsGrid from '@/components/product/VitalSignsGrid';
import type { KPICardData } from '@/types/api';

const theme = createTheme();

function withProviders(children: React.ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </I18nextProvider>
  );
}

const sampleKpis: KPICardData[] = [
  { key: 'total_visits', label: 'Total Visits', value: 120, format: 'number' },
  { key: 'avg_wait', label: 'Avg Wait', value: 24, unit: 'min', format: 'number' },
];

describe('KpiGrid', () => {
  it('renders a KPICard for every item', () => {
    render(withProviders(<KpiGrid kpis={sampleKpis} />));
    expect(screen.getByTestId('kpi-card-total_visits')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-card-avg_wait')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading', () => {
    const { container } = render(withProviders(<KpiGrid loading />));
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders empty state when there are no kpis', () => {
    render(withProviders(<KpiGrid kpis={[]} />));
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

describe('VitalSignsGrid', () => {
  it('renders vital sign cards for each kpi', () => {
    render(withProviders(<VitalSignsGrid kpis={sampleKpis} />));
    expect(screen.getByTestId('vital-signs-grid')).toBeInTheDocument();
    expect(screen.getByText(/total visits/i)).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });
});

describe('DashboardShell', () => {
  it('keeps page chrome and shows inline error with retry (never blanks the page)', () => {
    const onRetry = vi.fn();
    render(
      withProviders(
        <DashboardShell
          title="Emergency Department"
          subtitle="ED analytics"
          isError
          errorMessage="Unable to load this section"
          onRetry={onRetry}
          charts={[
            {
              key: 'trend',
              title: 'Visits Trend',
              error: true,
              onRetry,
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText('Emergency Department')).toBeInTheDocument();
    expect(screen.getByText('ED analytics')).toBeInTheDocument();
    expect(screen.getAllByText('Unable to load this section').length).toBeGreaterThan(0);
    expect(screen.getByTestId('vital-signs-grid')).toBeInTheDocument();
    expect(screen.getByText('Visits Trend')).toBeInTheDocument();
    screen.getAllByRole('button', { name: /retry/i })[0].click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders vital signs and charts when not loading or errored', () => {
    render(
      withProviders(
        <DashboardShell
          title="Emergency Department"
          kpis={sampleKpis}
          charts={[
            {
              key: 'trend',
              title: 'Visits Trend',
              payload: {
                chart_type: 'line',
                categories: ['Mon', 'Tue'],
                series: [{ name: 'Visits', data: [10, 20] }],
              },
            },
          ]}
        />,
      ),
    );
    expect(screen.getByTestId('vital-signs-grid')).toBeInTheDocument();
    expect(screen.getByText('Visits Trend')).toBeInTheDocument();
  });

  it('renders unauthorized state when flagged', () => {
    render(withProviders(<DashboardShell title="Restricted" isUnauthorized />));
    expect(screen.getByTestId('unauthorized-state')).toBeInTheDocument();
  });
});
