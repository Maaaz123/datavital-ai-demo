import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import AnimatedNumber from '@/components/motion/AnimatedNumber';
import { mockMatchMediaForWidth } from './matchMedia';

const theme = createTheme();

describe('AnimatedNumber reduced motion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('shows the final value immediately when reduced motion is preferred', () => {
    mockMatchMediaForWidth(1280, { reducedMotion: true });
    render(
      <ThemeProvider theme={theme}>
        <AnimatedNumber value={1284} format="integer" data-testid="animated-value" />
      </ThemeProvider>,
    );
    expect(screen.getByText('1,284')).toBeInTheDocument();
  });

  it('renders decimal values without crashing under reduced motion', () => {
    mockMatchMediaForWidth(390, { reducedMotion: true });
    render(
      <ThemeProvider theme={theme}>
        <AnimatedNumber value={42.5} format="decimal" decimals={1} />
      </ThemeProvider>,
    );
    expect(screen.getByText('42.5')).toBeInTheDocument();
  });
});
