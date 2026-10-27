import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import TrendIndicator from '@/components/ux/TrendIndicator';

const theme = createTheme();

describe('TrendIndicator favorability', () => {
  it('marks unfavorable upward movement (e.g. denial rate)', () => {
    render(
      <ThemeProvider theme={theme}>
        <TrendIndicator direction="up" value={5.2} isImprovement={false} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('trend-indicator-up')).toHaveAttribute('data-improvement', 'false');
  });

  it('marks favorable downward movement (e.g. wait time)', () => {
    render(
      <ThemeProvider theme={theme}>
        <TrendIndicator direction="down" value={-3.1} isImprovement={true} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('trend-indicator-down')).toHaveAttribute('data-improvement', 'true');
  });
});
