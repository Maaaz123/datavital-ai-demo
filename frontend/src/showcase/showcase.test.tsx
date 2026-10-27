import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDemoStorage } from '@/showcase/state';
import { EXTENSIONS, SCREENS, TOUR } from '@/showcase/catalog';
import { KPIS, USE_CASES, demoValue, findKpi } from '@/showcase/engine';
import {
  AssistantPage,
  CatalogPage,
  ComparePage,
  CoveragePage,
  ExperiencePage,
  HomePage,
  KpiPage,
  ScreenPage,
  ShowcaseApp,
  TourPage,
} from '@/showcase/ShowcaseApp';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/showcase" element={<ShowcaseApp />}>
          <Route index element={<HomePage />} />
          <Route path="tour" element={<TourPage />} />
          <Route path="screens/:screenId" element={<ScreenPage source="screen" />} />
          <Route path="extensions/:screenId" element={<ScreenPage source="extension" />} />
          <Route path="kpis/:metricKey" element={<KpiPage />} />
          <Route path="experience" element={<ExperiencePage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="coverage" element={<CoveragePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('marketing demo coverage', () => {
  beforeEach(() => {
    clearDemoStorage();
  });
  it('maps every required screen, extension, KPI family, and use case', () => {
    expect(SCREENS).toHaveLength(39);
    expect(new Set(SCREENS.map((item) => item.id)).size).toBe(39);
    expect(EXTENSIONS).toHaveLength(14);
    expect(USE_CASES).toHaveLength(37);
    expect(KPIS.filter((item) => item.origin === 'catalog')).toHaveLength(192);
    expect(KPIS.filter((item) => item.origin === 'registry')).toHaveLength(188);
    expect(KPIS.filter((item) => item.origin === 'demo_assumption').length).toBeGreaterThan(0);
    expect(TOUR).toHaveLength(10);
  });

  it('keeps synthetic values deterministic and filter-sensitive', () => {
    const kpi = findKpi('kpi_ed_avg_los_hours');
    expect(kpi).toBeTruthy();
    const north = demoValue(kpi!, 'H1', 2026, 'Emergency');
    expect(demoValue(kpi!, 'H1', 2026, 'Emergency')).toBe(north);
    expect(demoValue(kpi!, 'H2', 2026, 'Emergency')).not.toBe(north);
    expect(demoValue(kpi!, 'H1', 2025, 'Emergency')).not.toBe(north);
  });

  it('renders the public home, a screen, and the disclosure', () => {
    renderAt('/showcase');
    expect(screen.getByRole('status').textContent).toMatch(/synthetic data and simulated AI/i);
    expect(screen.getByRole('heading', { level: 1, name: 'DataVital AI' })).toBeInTheDocument();
  });

  it('updates a visible KPI when the hospital filter changes', () => {
    renderAt('/showcase/screens/emergency');
    fireEvent.click(screen.getByRole('button', { name: /Show all/ }));
    const value = screen.getByTestId('value-kpi_ed_avg_los_hours');
    const before = value.textContent;
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    expect(value.textContent).not.toBe(before);
  });

  it('walks the seven simulated stages and records a demo approval', () => {
    renderAt('/showcase/kpis/kpi_ed_avg_los_hours');
    expect(screen.getByRole('tab', { name: /1\. KPI/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /3\. Root cause/ }));
    expect(screen.getByText(/not proven causes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /4\. Prediction/ }));
    expect(screen.getByText(/Not a validated model/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /6\. Approval/ }));
    fireEvent.click(screen.getByRole('button', { name: /Approve simulated action/ }));
    expect(screen.getByText(/Recorded: approved/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /7\. Outcome/ }));
    expect(screen.getByText(/not a measured hospital result/i)).toBeInTheDocument();
  });

  it('uses a cohort review instead of an individual prediction for mortality', () => {
    renderAt('/showcase/kpis/kpi_mortality_event_volume');
    fireEvent.click(screen.getByRole('tab', { name: /4\. Prediction/ }));
    expect(screen.getByText(/not given an individual patient prediction/i)).toBeInTheDocument();
  });

  it('advances a patient-experience case and switches to Arabic RTL', () => {
    renderAt('/showcase/experience');
    fireEvent.click(screen.getAllByRole('button', { name: 'Advance' })[0]);
    expect(screen.getByText(/PX-2401/).textContent).toMatch(/reviewing/);
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.querySelector('.sx-shell')).toHaveAttribute('dir', 'rtl');
  });

  it('answers from the selected hospital without a live model', () => {
    renderAt('/showcase/assistant');
    expect(screen.getByRole('heading', { level: 2, name: /Emergency time at Demo General North in 2026/ })).toBeInTheDocument();
    expect(screen.getByText(/Simulated approval/)).toBeInTheDocument();
  });
});
