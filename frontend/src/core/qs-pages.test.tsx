import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForQsScreen, QS_KPI_OWNERS, type QsScreenId } from './qualitySafetyOwnership';

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

const SCREENS: Array<[string, QsScreenId]> = [
  ['/quality', 'command'],
  ['/quality/incidents', 'incidents'],
  ['/quality/infections', 'infections'],
  ['/quality/prevention', 'prevention'],
  ['/quality/outcomes', 'outcomes'],
  ['/quality/actions', 'actions'],
  ['/quality/optimization', 'optimization'],
];

describe('Quality & Safety pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders seven screens with owned KPIs, charts, and the QS ribbon', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('qs-ribbon')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length, path).toBeGreaterThanOrEqual(2);
      expect(document.querySelectorAll('[data-chart-state="invalid"]').length, path).toBe(0);
      for (const owner of ownersForQsScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).toMatch(/\d/);
        expect(screen.getByTestId(`value-${owner.id}`).textContent, `${path} ${owner.id}`).not.toMatch(/NaN|undefined/);
      }
      view.unmount();
    }
  });

  it('renders each owned KPI value exactly once per screen and on no other screen', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      const owned = new Set(ownersForQsScreen(screenId).map((owner) => owner.id));
      for (const owner of QS_KPI_OWNERS) {
        const count = screen.queryAllByTestId(`value-${owner.id}`).length;
        expect(count, `${path} ${owner.id}`).toBe(owned.has(owner.id) ? 1 : 0);
      }
      view.unmount();
    }
  });

  it('shows the synthetic-data disclosure and SIR unavailability on command', () => {
    renderAt('/quality');
    expect(screen.getByTestId('qs-disclosure').textContent).toMatch(/not a diagnostic system/i);
    expect(screen.getByTestId('qs-disclosure').textContent).toMatch(/SIR/i);
    expect(document.body.textContent).toMatch(/device-day|not certified NHSN/i);
  });

  it('opens Vital Assist with Quality & Safety scope and clinical-governance limits', () => {
    renderAt('/quality/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Quality & Safety/);
    expect(document.body.textContent).toMatch(/Quality & Safety Optimization & What-If/);
    expect(document.body.textContent).toMatch(/Quality & Safety Decision Support/);
    fireEvent.click(screen.getByRole('tab', { name: 'Decide' }));
    fireEvent.click(screen.getByRole('tab', { name: '4. Recommendation' }));
    expect(document.body.textContent).toMatch(/AI does not diagnose, order isolation, or close CAPA alone/i);
  });
});
