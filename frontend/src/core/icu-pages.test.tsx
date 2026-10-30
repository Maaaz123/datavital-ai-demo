import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForIcuScreen, type IcuScreenId } from './icuOwnership';

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

const SCREENS: Array<[string, IcuScreenId]> = [
  ['/icu', 'command'],
  ['/icu/flow', 'flow'],
  ['/icu/capacity', 'capacity'],
  ['/icu/equipment', 'equipment'],
  ['/icu/quality', 'quality'],
  ['/icu/optimization', 'optimization'],
];

describe('ICU pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders six screens with owned KPIs, charts, and the ICU navigation group', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      for (const owner of ownersForIcuScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent).toMatch(/\d/);
      }
      expect(screen.getByTestId('icu-ribbon')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('opens Vital Assist with ICU scope and the management-only statement', () => {
    renderAt('/icu/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/ICU/);
    expect(document.body.textContent).toMatch(/AI does not discharge or transfer/i);
  });
});
