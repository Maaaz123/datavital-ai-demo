import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForScScreen, SC_KPI_OWNERS, type ScScreenId } from './supplyChainOwnership';

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

const SCREENS: Array<[string, ScScreenId]> = [
  ['/supply-chain', 'command'],
  ['/supply-chain/inventory', 'inventory'],
  ['/supply-chain/procurement', 'procurement'],
  ['/supply-chain/suppliers', 'suppliers'],
  ['/supply-chain/consumption', 'consumption'],
  ['/supply-chain/waste', 'waste'],
  ['/supply-chain/optimization', 'optimization'],
];

describe('Supply Chain pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders seven screens with owned KPIs, charts, and the SC ribbon', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('sc-ribbon')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length, path).toBeGreaterThanOrEqual(2);
      expect(document.querySelectorAll('[data-chart-state="invalid"]').length, path).toBe(0);
      for (const owner of ownersForScScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).toMatch(/\d/);
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).not.toMatch(/NaN|undefined/);
      }
      view.unmount();
    }
  });

  it('renders each owned KPI value exactly once per screen and on no other screen', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      const owned = new Set(ownersForScScreen(screenId).map((owner) => owner.id));
      for (const owner of SC_KPI_OWNERS) {
        const count = screen.queryAllByTestId(`value-${owner.id}`).length;
        expect(count, `${path} ${owner.id}`).toBe(owned.has(owner.id) ? 1 : 0);
      }
      view.unmount();
    }
  });

  it('shows the synthetic-data disclosure and snapshot discipline on command', () => {
    renderAt('/supply-chain');
    expect(screen.getByTestId('sc-disclosure').textContent).toMatch(/period-end snapshot/i);
    expect(screen.getByTestId('sc-disclosure').textContent).toMatch(/Purchase order ≠ receipt ≠ invoice ≠ payment/i);
    expect(document.body.textContent).toMatch(/Days of Supply|forecast daily unit demand/i);
  });

  it('opens Vital Assist with Supply Chain scope and purchasing limits', () => {
    renderAt('/supply-chain/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Supply Chain/);
    expect(document.body.textContent).toMatch(/Supply Optimization & What-If/);
    expect(document.body.textContent).toMatch(/Supply Chain Decision Support/);
    fireEvent.click(screen.getByRole('tab', { name: 'Decide' }));
    fireEvent.click(screen.getByRole('tab', { name: '4. Recommendation' }));
    expect(document.body.textContent).toMatch(/AI does not place purchase orders|change safety stock|approve suppliers alone/i);
  });
});
