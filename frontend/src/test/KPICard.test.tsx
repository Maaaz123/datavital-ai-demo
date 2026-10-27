import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import KPICard from '@/components/common/KPICard';
import type { KPICardData } from '@/types/api';

const theme = createTheme();

function renderKPI(kpi: KPICardData) {
  return render(
    <ThemeProvider theme={theme}>
      <KPICard kpi={kpi} />
    </ThemeProvider>,
  );
}

describe('KPICard', () => {
  it('renders label and formatted value', () => {
    const kpi: KPICardData = {
      key: 'total_beds',
      label: 'Total Beds',
      value: 1250,
      format: 'number',
    };
    renderKPI(kpi);
    expect(screen.getByText('Total Beds')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-card-total_beds')).toBeInTheDocument();
  });

  it('renders percent format with unit', () => {
    const kpi: KPICardData = {
      key: 'occupancy_rate',
      label: 'Occupancy Rate',
      value: 87.5,
      unit: '%',
      format: 'percent',
      severity: 'warning',
    };
    renderKPI(kpi);
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('renders currency format', () => {
    const kpi: KPICardData = {
      key: 'net_revenue',
      label: 'Net Revenue',
      value: 1500000,
      format: 'currency',
    };
    renderKPI(kpi);
    expect(screen.getByText(/1[,.]?500[,.]?000|SAR|USD|\$/)).toBeInTheDocument();
  });
});
