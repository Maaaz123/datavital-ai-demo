import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { ownersForPxScreen, type PxScreenId } from './patientExperienceOwnership';

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

const SCREENS: Array<[string, PxScreenId]> = [
  ['/patient-experience', 'command'],
  ['/patient-experience/journey', 'journey'],
  ['/patient-experience/complaints', 'complaints'],
  ['/patient-experience/voice', 'voice'],
  ['/patient-experience/departments', 'departments'],
  ['/patient-experience/optimization', 'optimization'],
];

describe('Patient Experience pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('renders six screens with owned KPIs, charts, and the PX navigation group', () => {
    for (const [path, screenId] of SCREENS) {
      const view = renderAt(path);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
      for (const owner of ownersForPxScreen(screenId)) {
        expect(screen.getByTestId(`value-${owner.id}`).textContent).toMatch(/\d/);
      }
      expect(screen.getByTestId('px-ribbon')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('opens Vital Assist with Patient Experience scope and the management-only statement', () => {
    renderAt('/patient-experience/optimization');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Patient Experience/);
    expect(document.body.textContent).toMatch(/AI does not close complaints(?: or change clinical care)? alone/i);
  });
});
