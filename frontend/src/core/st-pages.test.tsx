import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForStScreen, ST_KPI_OWNERS, type StScreenId } from './strategyOwnership';

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

const SCREENS: Array<[string, StScreenId]> = [
  ['/strategy', 'command'],
  ['/strategy/workforce', 'workforce'],
  ['/strategy/equipment', 'equipment'],
  ['/strategy/capacity', 'capacity'],
  ['/strategy/service-lines', 'service-lines'],
  ['/strategy/cost-efficiency', 'cost-efficiency'],
  ['/strategy/expansion', 'expansion'],
  ['/strategy/optimization', 'optimization'],
];

describe('Strategy pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders eight screens with owned KPIs, charts, and the ST ribbon', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('st-ribbon')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length, path).toBeGreaterThanOrEqual(2);
      expect(document.querySelectorAll('[data-chart-state="invalid"]').length, path).toBe(0);
      for (const owner of ownersForStScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).toMatch(/\d/);
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).not.toMatch(/NaN|undefined/);
      }
      view.unmount();
    }
  });

  it('renders each owned KPI value exactly once per screen and on no other screen', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      const owned = new Set(ownersForStScreen(screenId).map((owner) => owner.id));
      for (const owner of ST_KPI_OWNERS) {
        const count = screen.queryAllByTestId(`value-${owner.id}`).length;
        expect(count, `${path} ${owner.id}`).toBe(owned.has(owner.id) ? 1 : 0);
      }
      view.unmount();
    }
  });

  it('shows the synthetic-data disclosure and contribution discipline on command', () => {
    renderAt('/strategy');
    expect(screen.getByTestId('st-disclosure').textContent).toMatch(/Contribution Margin = Recognized Net Revenue − Eligible Direct Costs/i);
    expect(screen.getByTestId('st-disclosure').textContent).toMatch(/CM ≠ net profit|not net profit/i);
    expect(document.body.textContent).toMatch(/Revenue ≠ profit|revenue ≠ profit/i);
  });

  it('opens Vital Assist with Strategy scope and capital limits', () => {
    renderAt('/strategy/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Strategy/);
    expect(document.body.textContent).toMatch(/Strategic Optimization & What-If|Strategic Optimization & What-if/);
    expect(document.body.textContent).toMatch(/Strategy Decision Support/);
    fireEvent.click(screen.getByRole('tab', { name: 'Decide' }));
    fireEvent.click(screen.getByRole('tab', { name: '4. Recommendation' }));
    expect(document.body.textContent).toMatch(/AI does not approve CapEx|change rosters|reallocate staff alone/i);
  });
});
