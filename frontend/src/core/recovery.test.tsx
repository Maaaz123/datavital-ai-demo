import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { scenarioFor, wardRows } from '@/showcase/facts';
import { BEDS_AI_CASES, bedsIndicatorsFor, type BedsScopeInput } from './bedsScope';

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

describe('three beds pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('opens Beds Overview and only three primary links', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Beds Overview' })).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(/Illustrative hospital data/i);
    expect(screen.getAllByText('420').length).toBeGreaterThan(0);
    const links = [...document.querySelectorAll('.gc-nav a')];
    expect(links.map((item) => item.getAttribute('title'))).toEqual(['Beds Overview', 'Allocation & Turnover', 'Capacity Planning']);
    expect(links).toHaveLength(3);
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/Medication orders|Door-to-Provider|ESI-1/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vital Assist' })).toBeInTheDocument();
  });

  it('updates capacity when the hospital, year, or period changes', () => {
    renderAt('/');
    const ribbon = screen.getByTestId('beds-ribbon');
    const north = ribbon.textContent;
    openFilters();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    expect(ribbon.textContent).not.toBe(north);
    expect(screen.getAllByText('510').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'Q1' } });
    expect(document.querySelector('[data-chart-state="ok"]')).toBeTruthy();
  });

  it('opens a KPI detail and investigates a chart in the copilot', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /Operational Beds/ }));
    expect(screen.getByTestId('kpi-detail').textContent).toMatch(/operational/i);
    fireEvent.click(screen.getByRole('button', { name: 'Investigate Occupied beds trend' }));
    expect(screen.getByRole('heading', { name: 'Vital Assist' })).toBeInTheDocument();
    expect(document.querySelector('.gc-assist-chip-focus')?.textContent).toMatch(/Occupied beds trend/);
    expect(screen.getByText(/open alert/i)).toBeInTheDocument();
    expect(screen.queryByText(/Medication orders|Door-to-provider wait/i)).not.toBeInTheDocument();
  });

  it('renders the other two pages with charts', () => {
    for (const path of ['/beds/placement', '/beds/capacity']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText(/Medication orders|Left Without Being Seen/i)).not.toBeInTheDocument();
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

  it('sends legacy public routes back to Beds Overview', () => {
    for (const path of ['/dashboard', '/story/pharmacy', '/board/pharmacy/medication-flow', '/kpis', '/present', '/intelligence', '/emergency/flow', '/emergency/ai']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: 'Beds Overview' }), path).toBeInTheDocument();
      expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('reconciles bed identities for North 2026', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const months = scenarioFor('H1', 2026).months;
    expect(fact.occupiedBeds + fact.availableBeds + fact.blockedBeds).toBe(fact.staffedBeds);
    expect(fact.icuOccupied + fact.icuAvailable + fact.icuBlocked).toBe(fact.icuStaffed);
    expect(fact.staffedBeds).toBe(420);
    const wards = wardRows(fact);
    expect(wards.reduce((sum, ward) => sum + ward.staffed, 0)).toBe(fact.staffedBeds);
    expect(wards.reduce((sum, ward) => sum + ward.occupied, 0)).toBe(fact.occupiedBeds);
    expect(wards.reduce((sum, ward) => sum + ward.blocked, 0)).toBe(fact.blockedBeds);
    expect(wards.reduce((sum, ward) => sum + ward.available, 0)).toBe(fact.availableBeds);
    const quarterOcc = months.slice(0, 3).reduce((sum, month) => sum + month.occupiedBeds, 0) / 3;
    expect(quarterOcc).toBeGreaterThan(0);
  });

  it('keeps the 36 bed indicators and leaves unsupported clocks blank', () => {
    const input: BedsScopeInput = {
      licensed: null,
      physical: null,
      operational: 40,
      occupied: 37,
      vacant: 2,
      blocked: 1,
      days: 365,
      admissions: 100,
      discharges: 98,
      transfersIn: 4,
      transfersOut: 3,
      pendingRequests: 6,
      unallocated: 4,
      assignmentMedianMin: 48,
      assignmentP90Min: null,
      assignmentCompleted: 97,
      assignmentCancelled: 3,
      cleaningAwaiting: 1,
      maintenanceAwaiting: 0,
      cleaningTurnaroundMin: null,
      vacancyDurationHours: null,
      dischargeToReadyMin: null,
      occupationDurationDays: 4.2,
      reassignmentRate: null,
      expectedReleases: 3,
      expectedDemand: 4,
      projectedAvailable: 1,
      shortfall: 4,
      forecastAccuracy: null,
      wards: [{ id: 'Medicine', staffed: 40, occupied: 37, available: 2, blocked: 1 }],
      bedTypes: [
        { id: 'General', staffed: 34, occupied: 31, available: 2, blocked: 1 },
        { id: 'ICU', staffed: 6, occupied: 6, available: 0, blocked: 0 },
      ],
    };
    const rows = bedsIndicatorsFor(input);
    expect(rows).toHaveLength(36);
    expect(new Set(rows.map((row) => `${row.domain}:${row.name}`)).size).toBe(36);
    expect(BEDS_AI_CASES).toHaveLength(10);
    expect(rows.filter((row) => row.domain === 'Bed Inventory & Availability')).toHaveLength(6);
    expect(rows.filter((row) => row.domain === 'Capacity Planning')).toHaveLength(6);
    expect(rows.find((row) => row.name === 'Licensed Beds')?.value).toBe('Not in scenario');
    expect(rows.find((row) => row.name === 'Bed Assignment Time — P90')?.value).toBe('Not in scenario');
    expect(rows.find((row) => row.name === 'Current Bed Occupancy Rate')?.method).toMatch(/point-in-time|snapshot/i);
    expect(rows.find((row) => row.name === 'Operational Beds')?.method).toMatch(/Physical presence alone does not make a bed operational/i);
    expect(rows.some((row) => /emergency|workforce|experience|revenue|laboratory/i.test(row.domain))).toBe(false);
  });

  it('keeps emergency wait and staffing off the beds pages', () => {
    const capacity = renderAt('/beds/capacity');
    expect(screen.getByRole('heading', { level: 1, name: 'Capacity Planning' })).toBeInTheDocument();
    expect(screen.queryByText(/Door-to-Provider|Left Without Being Seen|staffing gap|Patient Experience/i)).not.toBeInTheDocument();
    expect(screen.getByText(/AI use cases/i)).toBeInTheDocument();
    capacity.unmount();
    const redirected = renderAt('/emergency/quality');
    expect(screen.getByRole('heading', { level: 1, name: 'Beds Overview' })).toBeInTheDocument();
    redirected.unmount();
  });
});
