import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import ResponsiveDashboardGrid from '@/components/responsive/ResponsiveDashboardGrid';
import { mockMatchMediaForWidth } from './matchMedia';

const theme = createTheme();

function withProviders(children: React.ReactNode) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ResponsiveDashboardGrid', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('uses one column on mobile viewports', () => {
    mockMatchMediaForWidth(375);
    render(
      withProviders(
        <ResponsiveDashboardGrid>
          <div>One</div>
          <div>Two</div>
        </ResponsiveDashboardGrid>,
      ),
    );
    const grid = screen.getByTestId('responsive-dashboard-grid');
    expect(grid).toHaveAttribute('data-columns', '1');
  });

  it('uses four columns on desktop viewports', () => {
    mockMatchMediaForWidth(1440);
    render(
      withProviders(
        <ResponsiveDashboardGrid>
          <div>One</div>
          <div>Two</div>
        </ResponsiveDashboardGrid>,
      ),
    );
    const grid = screen.getByTestId('responsive-dashboard-grid');
    expect(grid).toHaveAttribute('data-columns', '4');
  });

  it('honors explicit column override', () => {
    mockMatchMediaForWidth(375);
    render(
      withProviders(
        <ResponsiveDashboardGrid columns={3}>
          <div>One</div>
        </ResponsiveDashboardGrid>,
      ),
    );
    expect(screen.getByTestId('responsive-dashboard-grid')).toHaveAttribute('data-columns', '3');
  });
});
