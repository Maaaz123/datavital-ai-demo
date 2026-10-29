import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { scenarioFor } from '@/showcase/facts';
import { daysFor, hoursFor, leaveSplit, modesFor } from './derived';
import { AI_CASES, indicatorsFor, type ScopeInput } from './scope';

function Harness() {
  return useRoutes(routes);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

describe('four emergency pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('opens Emergency Overview and only four primary links', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Emergency Overview' })).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(/Illustrative hospital data/i);
    expect(screen.getAllByText('68,372').length).toBeGreaterThan(0);
    const labels = [...document.querySelectorAll('.gc-nav a')].map((item) => item.textContent);
    expect(labels).toEqual(['Overview', 'Patient Flow & Waiting', 'ED Quality & Outcomes', 'ED AI Intelligence']);
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
  });

  it('updates visits when the hospital, year, or period changes', () => {
    renderAt('/');
    const ribbon = screen.getByTestId('ed-ribbon');
    const north = ribbon.textContent;
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    expect(ribbon.textContent).not.toBe(north);
    expect(screen.getByTestId('value-kpi_ed_avg_los_hours').textContent).not.toMatch(/2\.5 hours/);
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
    expect(screen.queryByText('68,372')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'Q1' } });
    expect(screen.queryByText('68,372')).not.toBeInTheDocument();
    expect(document.querySelector('[data-chart-state="ok"]')).toBeTruthy();
  });

  it('opens a KPI detail and investigates a chart in the copilot', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /ED Visits/ }));
    expect(screen.getByTestId('kpi-detail').textContent).toMatch(/ED arrivals/i);
    fireEvent.click(screen.getByRole('button', { name: 'Investigate ED visits trend' }));
    expect(screen.getByRole('heading', { name: 'AI Copilot' })).toBeInTheDocument();
    expect(document.querySelector('.gc-copilot-scope')?.textContent).toMatch(/ED visits trend/);
    expect(screen.getByText(/open Emergency alerts/i)).toBeInTheDocument();
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
  });

  it('renders the other three pages with charts', () => {
    for (const path of ['/emergency/flow', '/emergency/quality', '/emergency/ai']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
      view.unmount();
    }
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('approves an estimate, isolates it by hospital, and restores it', () => {
    renderAt('/emergency/ai');
    fireEvent.click(screen.getByRole('tab', { name: /2\. Investigation/ }));
    expect(screen.getByText(/Compare the median with the P90/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /3\. Prediction/ }));
    expect(screen.getByText(/Not a validated model/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /5\. Approval/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/No illustrative outcome/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /5\. Approval/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/not a measured hospital result/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/Record an approval or rejection/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/Decision: approved/)).toBeInTheDocument();
  });

  it('sends legacy public routes back to Emergency Overview', () => {
    for (const path of ['/dashboard', '/story/pharmacy', '/board/pharmacy/medication-flow', '/kpis', '/present', '/intelligence']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: 'Emergency Overview' }), path).toBeInTheDocument();
      expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('reconciles emergency identities for North 2026', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const months = scenarioFor('H1', 2026).months;
    expect(months.reduce((sum, month) => sum + month.edArrivals, 0)).toBe(fact.edArrivals);
    expect(fact.edAdmitted + fact.edDischarged + fact.edLeft).toBe(fact.edArrivals);
    expect(hoursFor(fact.edArrivals).reduce((sum, value) => sum + value, 0)).toBe(fact.edArrivals);
    expect(daysFor(fact.edArrivals).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
    expect(modesFor(fact.edArrivals).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
    const leave = leaveSplit(fact.edLeft);
    expect(leave.before + leave.after).toBe(fact.edLeft);
    expect(fact.edArrivals - leave.before + leave.after).toBe(fact.edArrivals - leave.before + leave.after);
    expect(fact.occupiedBeds + fact.availableBeds + fact.blockedBeds).toBe(fact.staffedBeds);
    const quarter = months.slice(0, 3).reduce((sum, month) => sum + month.edArrivals, 0);
    expect(quarter).toBeLessThan(fact.edArrivals);
    expect(quarter).toBeGreaterThan(0);
  });

  it('keeps the 30 emergency-visit indicators and leaves unsupported clocks blank', () => {
    const input: ScopeInput = {
      arrivals: 100, admitted: 20, discharged: 78, left: 2, deaths: 1,
      triageCompleted: 99, median: 63.3, p90: 109.4, losMedian: 141, losP90: 233,
      boarding: 2, revisit: 3,
      modes: [{ name: 'Ambulance', count: 18 }],
      acuity: [8, 22, 40, 22, 8],
    };
    const rows = indicatorsFor(input);
    expect(rows).toHaveLength(30);
    expect(new Set(rows.map((row) => `${row.domain}:${row.name}`)).size).toBe(30);
    expect(AI_CASES).toHaveLength(10);
    const disposition = rows.find((row) => row.name === 'Arrival-to-Disposition Decision Time');
    expect(disposition?.value).toBe('Not in scenario');
    expect(disposition?.method).toMatch(/not derived from length of stay/i);
    expect(rows.find((row) => row.name === 'Door-to-Provider Time — Median')?.method).toMatch(/not length of stay/i);
    expect(rows.find((row) => row.name === 'ED Length of Stay — Median')?.method).toMatch(/not separated/i);
    expect(rows.some((row) => /workforce|experience|staffed beds|revenue/i.test(row.domain))).toBe(false);
  });

  it('keeps hospital beds and staffing off the emergency pages', () => {
    const quality = renderAt('/emergency/quality');
    expect(screen.getByRole('heading', { level: 1, name: 'ED Quality & Outcomes' })).toBeInTheDocument();
    expect(screen.getAllByText('0.035%').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Staffed Hospital Beds|staffing gap|Patient Experience/i)).not.toBeInTheDocument();
    quality.unmount();
    const redirected = renderAt('/emergency/capacity-quality');
    expect(screen.getByRole('heading', { level: 1, name: 'ED Quality & Outcomes' })).toBeInTheDocument();
    redirected.unmount();
  });
});
