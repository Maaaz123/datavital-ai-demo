import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForPharmScreen, type PharmacyScreenId } from './pharmacyOwnership';

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

const SCREENS: Array<[string, PharmacyScreenId]> = [
  ['/pharmacy', 'command'],
  ['/pharmacy/dispensing', 'dispensing'],
  ['/pharmacy/inventory', 'inventory'],
  ['/pharmacy/safety', 'safety'],
  ['/pharmacy/cost', 'cost'],
  ['/pharmacy/optimization', 'optimization'],
];

describe('Pharmacy pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders six screens with owned KPIs, charts, and the Pharmacy navigation group', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      for (const owner of ownersForPharmScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent).toMatch(/\d/);
      }
      expect(screen.getByTestId('rx-ribbon')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('opens Vital Assist with Pharmacy scope and the management-only statement', () => {
    renderAt('/pharmacy/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Pharmacy/);
    expect(document.body.textContent).toMatch(/AI does not change pharmacy schedules alone/i);
  });
});
