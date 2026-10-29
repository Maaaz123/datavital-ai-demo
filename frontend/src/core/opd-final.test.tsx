import { render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { buildOpdView } from './opdView';
import { runWhatIf } from '@/showcase/whatIf';
import { alertsFor } from './alerts';

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

describe('Outpatient final acceptance', () => {
  it('reconciles visit identities and specialty shares', () => {
    const view = buildOpdView('H1', 2026, 'year');
    expect(view.newVisits + view.followUpVisits).toBe(view.visits);
    expect(view.completed + view.incomplete).toBe(view.visits);
    expect(view.specialties.reduce((sum, item) => sum + item.visits, 0)).toBe(view.visits);
    expect(view.specialties.reduce((sum, item) => sum + item.pendingActions, 0)).toBe(view.outstandingActions);
    expect(view.specialties.reduce((sum, item) => sum + item.delayContribution, 0)).toBe(view.exceedingWait);
    expect(view.monthlyVisits.reduce((sum, value) => sum + value, 0)).toBe(view.visits);
    expect(view.visitsByDay.reduce((sum, item) => sum + item.count, 0)).toBe(view.visits);
  });

  it('keeps quarterly visits inside the annual total', () => {
    const year = buildOpdView('H1', 2026, 'year');
    const quarters = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((period) => buildOpdView('H1', 2026, period));
    expect(quarters.reduce((sum, item) => sum + item.visits, 0)).toBe(year.visits);
  });

  it('renders all three OPD screens', async () => {
    renderAt('/outpatient');
    expect(await screen.findByRole('heading', { name: 'Outpatient Performance Overview' })).toBeInTheDocument();
    expect(screen.getAllByText(/Outpatient visits over time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Visits by clinical specialty/i).length).toBeGreaterThan(0);

    renderAt('/outpatient/flow');
    expect(await screen.findByRole('heading', { name: 'Clinic Waiting & Patient Flow' })).toBeInTheDocument();
    expect(screen.getAllByText(/Waiting time by specialty/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Delay contribution by clinic/i).length).toBeGreaterThan(0);

    renderAt('/outpatient/quality');
    expect(await screen.findByRole('heading', { name: 'Outpatient Quality & Follow-up' })).toBeInTheDocument();
    expect(screen.getAllByText(/Documentation completion trend/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending clinical actions by specialty/i).length).toBeGreaterThan(0);
  });

  it('supports six outpatient what-if sketches', () => {
    const kinds = ['opd-demand-up', 'opd-wait-down', 'opd-consult-down', 'opd-util-up', 'opd-doc-down', 'opd-referral-down'] as const;
    for (const kind of kinds) {
      const result = runWhatIf('Outpatient', 'H1', 2026, { kind, amount: 0.15 }, 'year');
      expect(result.current).toBeTruthy();
      expect(result.estimated).toBeTruthy();
      expect(result.assumptions.toLowerCase()).toMatch(/illustrative|assum|not a|baseline|forecast/);
    }
  });

  it('raises outpatient alerts from clinic wait KPIs', () => {
    const alerts = alertsFor('H1', 2026).filter((alert) => alert.department === 'Outpatient');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some((alert) => /wait|session|clinic/i.test(alert.title))).toBe(true);
  });
});
