import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { scenarioFor, wardRows } from '@/showcase/facts';
import { daysFor, hoursFor, leaveSplit, modesFor } from './derived';
import { BEDS_AI_CASES, bedsIndicatorsFor, type BedsScopeInput } from './bedsScope';
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

function openFilters() {
  fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
}

describe('emergency and beds domains', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('opens Emergency Overview and keeps both domain links', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Emergency Overview' })).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(/Illustrative hospital data/i);
    expect(screen.getAllByText('68,372').length).toBeGreaterThan(0);
    const links = [...document.querySelectorAll('.gc-nav a')];
    expect(links.map((item) => item.getAttribute('title'))).toEqual([
      'Emergency Overview',
      'Patient Flow & Waiting',
      'ED Quality & Outcomes',
      'Beds Overview',
      'Allocation & Turnover',
      'Capacity Planning',
    ]);
    expect(links).toHaveLength(6);
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vital Assist' })).toBeInTheDocument();
  });

  it('opens Beds Overview without removing Emergency', () => {
    renderAt('/beds');
    expect(screen.getByRole('heading', { level: 1, name: 'Beds Overview' })).toBeInTheDocument();
    expect(screen.getAllByText('420').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Door-to-Provider|ESI-1|Left Without Being Seen/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('.gc-nav a')).toHaveLength(6);
  });

  it('updates visits when the hospital, year, or period changes', () => {
    renderAt('/');
    const ribbon = screen.getByTestId('ed-ribbon');
    const north = ribbon.textContent;
    openFilters();
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
    expect(screen.getByRole('heading', { name: 'Vital Assist' })).toBeInTheDocument();
    expect(document.querySelector('.gc-assist-chip-focus')?.textContent).toMatch(/ED visits trend/);
    expect(screen.getByText(/open alert/i)).toBeInTheDocument();
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
  });

  it('renders emergency and beds child pages with charts', () => {
    for (const path of ['/emergency/flow', '/emergency/quality', '/beds/placement', '/beds/capacity']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
      view.unmount();
    }
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('approves an estimate from the AI icon, isolates it by hospital, and restores it', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Decide' }));
    fireEvent.click(screen.getByRole('tab', { name: /2\. Investigation/ }));
    expect(screen.getByText(/These are not proven causes/i)).toBeInTheDocument();
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
    openFilters();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/Record an approval or rejection/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.click(screen.getByRole('tab', { name: /6\. Outcome/ }));
    expect(screen.getByText(/Decision: approved/)).toBeInTheDocument();
  });

  it('sends legacy public routes back to Emergency Overview', () => {
    for (const path of ['/dashboard', '/story/pharmacy', '/board/pharmacy/medication-flow', '/kpis', '/present', '/intelligence', '/emergency/ai']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: 'Emergency Overview' }), path).toBeInTheDocument();
      expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('reconciles emergency and bed identities for North 2026', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const months = scenarioFor('H1', 2026).months;
    expect(months.reduce((sum, month) => sum + month.edArrivals, 0)).toBe(fact.edArrivals);
    expect(fact.edAdmitted + fact.edDischarged + fact.edLeft).toBe(fact.edArrivals);
    expect(hoursFor(fact.edArrivals).reduce((sum, value) => sum + value, 0)).toBe(fact.edArrivals);
    expect(daysFor(fact.edArrivals).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
    expect(modesFor(fact.edArrivals).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
    const leave = leaveSplit(fact.edLeft);
    expect(leave.before + leave.after).toBe(fact.edLeft);
    expect(fact.occupiedBeds + fact.availableBeds + fact.blockedBeds).toBe(fact.staffedBeds);
    expect(fact.staffedBeds).toBe(420);
    const wards = wardRows(fact);
    expect(wards.reduce((sum, ward) => sum + ward.staffed, 0)).toBe(fact.staffedBeds);
  });

  it('keeps the 30 emergency and 36 beds indicators honest', () => {
    const ed: ScopeInput = {
      arrivals: 100, admitted: 20, discharged: 78, left: 2, deaths: 1,
      triageCompleted: 99, median: 63.3, p90: 109.4, losMedian: 141, losP90: 233,
      boarding: 2, revisit: 3,
      modes: [{ name: 'Ambulance', count: 18 }],
      acuity: [8, 22, 40, 22, 8],
    };
    const edRows = indicatorsFor(ed);
    expect(edRows).toHaveLength(30);
    expect(AI_CASES).toHaveLength(10);
    expect(edRows.find((row) => row.name === 'Arrival-to-Disposition Decision Time')?.value).toBe('Not in scenario');
    expect(edRows.some((row) => /workforce|experience|staffed beds|revenue/i.test(row.domain))).toBe(false);

    const beds: BedsScopeInput = {
      licensed: null, physical: null, operational: 40, occupied: 37, vacant: 2, blocked: 1, days: 365,
      admissions: 100, discharges: 98, transfersIn: 4, transfersOut: 3,
      pendingRequests: 6, unallocated: 4, assignmentMedianMin: 48, assignmentP90Min: null,
      assignmentCompleted: 97, assignmentCancelled: 3, cleaningAwaiting: 1, maintenanceAwaiting: 0,
      cleaningTurnaroundMin: null, vacancyDurationHours: null, dischargeToReadyMin: null,
      occupationDurationDays: 4.2, reassignmentRate: null, expectedReleases: 3, expectedDemand: 4,
      projectedAvailable: 1, shortfall: 4, forecastAccuracy: null,
      wards: [{ id: 'Medicine', staffed: 40, occupied: 37, available: 2, blocked: 1 }],
      bedTypes: [
        { id: 'General', staffed: 34, occupied: 31, available: 2, blocked: 1 },
        { id: 'ICU', staffed: 6, occupied: 6, available: 0, blocked: 0 },
      ],
    };
    const bedRows = bedsIndicatorsFor(beds);
    expect(bedRows).toHaveLength(36);
    expect(BEDS_AI_CASES).toHaveLength(10);
    expect(bedRows.find((row) => row.name === 'Licensed Beds')?.value).toBe('Not in scenario');
    expect(bedRows.some((row) => /emergency|workforce|experience|revenue/i.test(row.domain))).toBe(false);
  });

  it('keeps domains separated on their pages', () => {
    const quality = renderAt('/emergency/quality');
    expect(screen.getByRole('heading', { level: 1, name: 'ED Quality & Outcomes' })).toBeInTheDocument();
    expect(screen.queryByText(/Staffed Hospital Beds|Capacity Shortfall|staffing gap/i)).not.toBeInTheDocument();
    quality.unmount();
    const capacity = renderAt('/beds/capacity');
    expect(screen.getByRole('heading', { level: 1, name: 'Capacity Planning' })).toBeInTheDocument();
    expect(screen.queryByText(/Door-to-Provider|Left Without Being Seen|ESI-1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/AI use cases/i)).toBeInTheDocument();
    expect(screen.getByText(/48h projected available/i)).toBeInTheDocument();
    capacity.unmount();
  });
});

