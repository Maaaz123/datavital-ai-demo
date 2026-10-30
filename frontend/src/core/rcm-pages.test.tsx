import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForRcmScreen, RCM_KPI_OWNERS, type RcmScreenId } from './rcmOwnership';

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

const SCREENS: Array<[string, RcmScreenId]> = [
  ['/rcm', 'command'],
  ['/rcm/eligibility', 'eligibility'],
  ['/rcm/billing', 'billing'],
  ['/rcm/claims', 'claims'],
  ['/rcm/collections', 'collections'],
  ['/rcm/leakage', 'leakage'],
  ['/rcm/optimization', 'optimization'],
];

describe('Revenue Cycle pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders seven screens with owned KPIs, charts, and the RCM ribbon', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('rcm-ribbon')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length, path).toBeGreaterThanOrEqual(2);
      expect(document.querySelectorAll('[data-chart-state="invalid"]').length, path).toBe(0);
      for (const owner of ownersForRcmScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).toMatch(/\d/);
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).not.toMatch(/NaN|undefined/);
      }
      view.unmount();
    }
  });

  it('renders each owned KPI value exactly once per screen and on no other screen', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      const owned = new Set(ownersForRcmScreen(screenId).map((owner) => owner.id));
      for (const owner of RCM_KPI_OWNERS) {
        const count = screen.queryAllByTestId(`value-${owner.id}`).length;
        expect(count, `${path} ${owner.id}`).toBe(owned.has(owner.id) ? 1 : 0);
      }
      view.unmount();
    }
  });

  it('shows the synthetic-data disclosure on the command screen', () => {
    renderAt('/rcm');
    expect(screen.getByTestId('rcm-disclosure').textContent).toMatch(/not collected cash/i);
  });

  it('opens Vital Assist with Revenue Cycle scope and the claims / write-off statement', () => {
    renderAt('/rcm/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Revenue Cycle/);
    expect(document.body.textContent).toMatch(/RCM Optimization & What-If/);
    expect(document.body.textContent).toMatch(/Revenue Cycle Decision Support/);
    fireEvent.click(screen.getByRole('tab', { name: 'Decide' }));
    fireEvent.click(screen.getByRole('tab', { name: '4. Recommendation' }));
    expect(document.body.textContent).toMatch(/AI does not submit claims or write off balances alone/i);
  });
});
