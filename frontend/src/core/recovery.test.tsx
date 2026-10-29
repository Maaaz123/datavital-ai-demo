import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { scenarioFor, wardRows } from '@/showcase/facts';
import { daysFor, hoursFor, leaveSplit, modesFor } from './derived';
import { BEDS_AI_CASES, bedsIndicatorsFor, type BedsScopeInput } from './bedsScope';
import { IPD_AI_CASES, ipdIndicatorsFor, type IpdScopeInput } from './ipdScope';
import { NAV_DOMAINS } from './nav';
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

  it('opens Emergency Snapshot with grouped domain navigation', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Emergency Snapshot' })).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(/Illustrative hospital data/i);
    expect(screen.getAllByText('68,372').length).toBeGreaterThan(0);
    const links = [...document.querySelectorAll('.gc-nav a')];
    expect(links.map((item) => item.getAttribute('title'))).toEqual([
      'Emergency Snapshot',
      'Waiting & Patient Flow',
      'Safety & Return Visits',
    ]);
    expect(screen.getByRole('button', { name: 'Emergency domain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beds & Capacity domain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inpatient Care domain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outpatient domain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appointments domain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Surgery domain' })).toBeInTheDocument();
    expect(NAV_DOMAINS).toHaveLength(6);
    expect(NAV_DOMAINS.reduce((sum, domain) => sum + domain.screens.length, 0)).toBe(21);
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vital Assist' })).toBeInTheDocument();
  });

  it('opens Bed Status and expands the Beds domain', () => {
    renderAt('/beds');
    expect(screen.getByRole('heading', { level: 1, name: 'Bed Status' })).toBeInTheDocument();
    expect(screen.getAllByText('420').length).toBeGreaterThan(0);
    const links = [...document.querySelectorAll('.gc-nav a')].map((item) => item.getAttribute('title'));
    expect(links).toEqual(expect.arrayContaining(['Bed Status', 'Bed Assignment', 'Bed Capacity Outlook']));
    expect(screen.queryByText(/Door-to-Provider|Left Without Being Seen/i)).not.toBeInTheDocument();
  });

  it('updates visits when the hospital, year, or period changes', () => {
    renderAt('/');
    const ribbon = screen.getByTestId('ed-ribbon');
    const north = ribbon.textContent;
    openFilters();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    expect(ribbon.textContent).not.toBe(north);
    expect(screen.getByTestId('value-kpi_ed_los_median_minutes').textContent).not.toMatch(/2\.5 hours/);
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
    fireEvent.click(screen.getByTestId('ed-ribbon').querySelector('button') as HTMLButtonElement);
    expect(screen.getByTestId('kpi-detail').textContent).toMatch(/Emergency arrivals|visits/i);
    fireEvent.click(screen.getByRole('button', { name: 'Investigate ED visit volume over time' }));
    expect(screen.getByRole('heading', { name: 'Vital Assist' })).toBeInTheDocument();
    expect(document.querySelector('.gc-assist-chip-focus')?.textContent).toMatch(/ED visit volume over time/);
    expect(screen.getByText(/open alert/i)).toBeInTheDocument();
    expect(screen.queryByText(/Medication orders/i)).not.toBeInTheDocument();
  });

  it('renders emergency, beds, inpatient, outpatient, appointments, and surgery child pages with charts', () => {
    for (const path of [
      '/emergency/flow', '/emergency/quality',
      '/beds/placement', '/beds/capacity',
      '/inpatient', '/inpatient/stay', '/inpatient/outcomes',
      '/outpatient', '/outpatient/flow', '/outpatient/quality',
      '/appointments', '/appointments/access', '/appointments/attendance', '/appointments/recovery',
      '/surgery', '/surgery/or', '/surgery/access', '/surgery/quality', '/surgery/optimization',
    ]) {
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
    expect(screen.getByText(/Decision: approved/i)).toBeInTheDocument();
  });

  it('sends legacy public routes back to Emergency Snapshot', () => {
    for (const path of ['/dashboard', '/story/pharmacy', '/board/pharmacy/medication-flow', '/kpis', '/present', '/intelligence', '/emergency/ai']) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: 'Emergency Snapshot' }), path).toBeInTheDocument();
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

  it('keeps emergency, beds, and inpatient indicators honest', () => {
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
    expect(edRows.find((row) => row.name === 'Arrival-to-Disposition Decision Time')?.value).toBe('Not available');
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
    expect(bedRows.find((row) => row.name === 'Licensed Beds')?.value).toBe('Not available');
    expect(bedRows.find((row) => row.name === 'Average Daily Occupancy Rate')?.value).toBe('Not available');
    expect(bedRows.some((row) => /emergency|workforce|experience|revenue/i.test(row.domain))).toBe(false);

    const ipd: IpdScopeInput = {
      admissions: 100, census: 40, discharges: 95, deaths: 2, edAdmitted: 45, directAdmissions: 50,
      transfersIn: 5, transfersOut: 4, losAvg: 4.2, losMedian: 3.8, losP90: 7.1,
      longStayCount: 12, longStayRate: 0.12, expectedDischarges: 3, readyNotDischarged: 4,
      delayedDischargeRate: 0.1, readmit7: 0.03, readmit30: 0.08, amaRate: 0.02,
      specialties: [{ id: 'Medicine', admissions: 40, discharges: 38, los: 4.1 }],
      sources: [{ id: 'From emergency', count: 45 }],
      destinations: [{ id: 'Home', count: 80 }],
      oeLos: null, delayP50: null, delayP90: null, readinessDocRate: null, dischargeSummaryRate: null,
      carePlanDocRate: null, carePlanReviewRate: null, dailyReviewRate: null, consultResponseHours: null,
      pendingConsults: null, milestoneRate: null, admissionAssessmentRate: null, diagnosisDocRate: null,
      dischargeInstructionsRate: null, medRecRate: null, followUpPlanRate: null, cancelRate: null,
    };
    const ipdRows = ipdIndicatorsFor(ipd);
    expect(ipdRows).toHaveLength(40);
    expect(IPD_AI_CASES).toHaveLength(12);
    expect(ipdRows.find((row) => row.name === 'Observed-to-Expected LOS Ratio')?.value).toBe('Not available');
    expect(ipdRows.find((row) => row.name === 'Current Inpatient Census (Patients)')?.method).toMatch(/not a bed occupancy rate/i);
    expect(ipdRows.some((row) => /bed occupancy|workforce|experience|emergency waiting/i.test(row.domain))).toBe(false);
  });

  it('keeps domains separated on their pages', () => {
    const quality = renderAt('/emergency/quality');
    expect(screen.getByRole('heading', { level: 1, name: 'Safety & Return Visits' })).toBeInTheDocument();
    expect(screen.queryByText(/Staffed Hospital Beds|Beds short vs requests|staffing gap/i)).not.toBeInTheDocument();
    quality.unmount();
    const capacity = renderAt('/beds/capacity');
    expect(screen.getByRole('heading', { level: 1, name: 'Bed Capacity Outlook' })).toBeInTheDocument();
    expect(screen.queryByText(/Door-to-Provider|Left Without Being Seen|ESI-1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/AI decision support/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected available in 48 hours/i)).toBeInTheDocument();
    capacity.unmount();
    const ipd = renderAt('/inpatient/outcomes');
    expect(screen.getByRole('heading', { level: 1, name: 'Care Progress & Outcomes' })).toBeInTheDocument();
    expect(screen.queryByText(/Door-to-Provider|Operational bed occupancy|Beds short vs requests/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Inpatient journey/i)).toBeInTheDocument();
    expect(screen.getByTestId('ipd-doc-progress')).toBeInTheDocument();
    expect(screen.queryByText(/Documentation not available here/i)).not.toBeInTheDocument();
    ipd.unmount();
  });
});

