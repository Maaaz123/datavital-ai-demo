import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { SituationSummary, StatusBadge, CommandCenterMode, EmptyState } from '@/components/ux';
import { buildSituationFromKpis } from '@/utils/situationFromKpis';
import { routes } from '@/routes';

function wrap(ui: React.ReactElement, lng = 'en') {
  i18n.changeLanguage(lng);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={createTheme()}>
          <MemoryRouter>{ui}</MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('enterprise UX acceptance', () => {
  it('registers command-center and demo routes', () => {
    const paths: string[] = [];
    const walk = (nodes: Array<{ path?: string; children?: unknown[] }> | undefined) => {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.path) paths.push(node.path);
        if (Array.isArray(node.children)) walk(node.children as Array<{ path?: string; children?: unknown[] }>);
      }
    };
    walk(routes as Array<{ path?: string; children?: unknown[] }>);
    // CoreApp children use relative segments; aliases redirect /dashboard → /executive and /command-center → /command
    expect(paths).toEqual(expect.arrayContaining(['command-center', 'command', 'executive', 'dashboard']));
    expect(paths).toContain('/demo');
    expect(paths).toContain('/copilot');
  });

  it('builds situation text from live KPI values without inventing numbers', () => {
    const result = buildSituationFromKpis(
      [{ key: 'occupancy', label: 'Bed Occupancy', value: 91.4, unit: '%', format: 'percent', severity: 'warning', trend: 3.2, trend_direction: 'up' }],
      { domain: 'beds', locale: 'en' },
    );
    expect(result?.text).toContain('91.4');
    expect(result?.text).toContain('Bed Occupancy');
    expect(result?.severity).toBe('warning');
  });

  it('renders StatusBadge with accessible text (not color-only)', () => {
    wrap(<StatusBadge status="critical" label="Critical" />);
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it('RTL situation summary keeps content readable in Arabic', async () => {
    await i18n.changeLanguage('ar');
    const result = buildSituationFromKpis(
      [{ key: 'occupancy', label: 'إشغال الأسرّة', value: 91.4, format: 'percent', severity: 'critical' }],
      { domain: 'beds', locale: 'ar' },
    );
    wrap(<SituationSummary text={result?.text} severity="critical" />, 'ar');
    expect(screen.getByTestId('situation-summary')).toBeInTheDocument();
    expect(screen.getByText(/91.4/)).toBeInTheDocument();
  });

  it('CommandCenterMode exposes fullscreen toggle', () => {
    wrap(
      <CommandCenterMode>
        <div>panel</div>
      </CommandCenterMode>,
    );
    expect(screen.getByTestId('command-center-mode')).toHaveAttribute('data-fullscreen', 'false');
    expect(screen.getByLabelText(/command center/i)).toBeInTheDocument();
  });

  it('EmptyState supports meaningful guidance', () => {
    wrap(
      <EmptyState
        title="No denied claims were found for the selected period."
        description="Try changing the date range or selecting another payer."
      />,
    );
    expect(screen.getByText(/No denied claims/i)).toBeInTheDocument();
    expect(screen.getByText(/Try changing the date range/i)).toBeInTheDocument();
  });
});
