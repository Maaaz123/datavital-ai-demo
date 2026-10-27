import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import WorkforceDashboard from '@/pages/WorkforceDashboard';
import WorkforceEmployeeProfilePage from '@/pages/WorkforceEmployeeProfilePage';

vi.mock('@/components/charts/EChart', () => ({
  default: () => <div data-testid="echart-stub" />,
}));

vi.mock('@/components/workforce/WorkforceHorizontalBarChart', () => ({
  default: () => <div data-testid="wf-hbar-stub" />,
}));

const theme = createTheme();

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/workforce" element={<WorkforceDashboard />} />
              <Route path="/workforce/employees/:id" element={<WorkforceEmployeeProfilePage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('WorkforceDashboard', () => {
  it('renders pilot introduction and vital signs', async () => {
    renderAt('/workforce');
    expect(await screen.findByRole('heading', { name: /Workforce Performance & Credentialing/i })).toBeInTheDocument();
    expect(screen.getByText(/Workforce Intelligence/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('vital-signs-grid')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/overall target achievement/i).length).toBeGreaterThan(0);
  });

  it('renders employee table rows', async () => {
    renderAt('/workforce');
    expect(await screen.findByText('Sara Al-Harbi')).toBeInTheDocument();
    expect(screen.getByText('WF-1001')).toBeInTheDocument();
  });

  it('shows AI workforce brief limitation for demo data', async () => {
    renderAt('/workforce');
    expect(await screen.findByTestId('ai-executive-brief')).toBeInTheDocument();
    expect(screen.getByText(/Demo adapter only/i)).toBeInTheDocument();
  });
});

describe('WorkforceEmployeeProfilePage', () => {
  it('shows profile tabs for known employee', async () => {
    renderAt('/workforce/employees/emp-1001');
    expect(await screen.findByRole('heading', { name: 'Sara Al-Harbi' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Performance/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Targets/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Licenses/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to Workforce/i)).toBeInTheDocument();
  });

  it('shows error state for missing employee', async () => {
    renderAt('/workforce/employees/missing-id');
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });
});
