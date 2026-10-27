import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import {
  StatusBadge,
  SituationSummary,
  InsightPanel,
} from '@/components/ux';

const theme = createTheme();

function withProviders(children: React.ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </I18nextProvider>
  );
}

describe('StatusBadge', () => {
  it('renders status label with accessible role', () => {
    render(withProviders(<StatusBadge status="healthy" />));
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: healthy');
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(withProviders(<StatusBadge status="warning" label="Elevated wait times" />));
    expect(screen.getByText('Elevated wait times')).toBeInTheDocument();
  });
});

describe('SituationSummary', () => {
  it('renders summary text', () => {
    render(
      withProviders(
        <SituationSummary text="Emergency department volume is 12% above forecast." severity="info" />,
      ),
    );
    expect(screen.getByTestId('situation-summary')).toBeInTheDocument();
    expect(
      screen.getByText('Emergency department volume is 12% above forecast.'),
    ).toBeInTheDocument();
  });

  it('returns null when no content', () => {
    const { container } = render(withProviders(<SituationSummary />));
    expect(container.firstChild).toBeNull();
  });
});

describe('InsightPanel', () => {
  it('renders insight sections', () => {
    render(
      withProviders(
        <InsightPanel
          observedFact="ICU census rose 8% overnight."
          possibleExplanation="Post-surgical admissions exceeded discharges."
          recommendedAction="Review transfer queue and staffing coverage."
        />,
      ),
    );
    expect(screen.getByTestId('insight-panel')).toBeInTheDocument();
    expect(screen.getByText('Observed fact')).toBeInTheDocument();
    expect(screen.getByText('ICU census rose 8% overnight.')).toBeInTheDocument();
    expect(screen.getByText('Possible explanation')).toBeInTheDocument();
    expect(screen.getByText('Recommended action')).toBeInTheDocument();
  });
});
