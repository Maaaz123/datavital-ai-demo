import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { buildEnterpriseView } from './enterpriseView';
import { screenFromPath } from './alerts';

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

describe('Enterprise integration pages', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('routes /executive and /command to enterprise screens', () => {
    expect(screenFromPath('/executive')).toBe('executive');
    expect(screenFromPath('/command')).toBe('command');
  });

  it('redirects legacy /dashboard to Executive Dashboard', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Executive Dashboard/i);
  });

  it('renders Executive Dashboard with priorities and domain-linked signals', () => {
    renderAt('/executive');
    expect(screen.getByTestId('executive-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-ribbon')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-priorities')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-disclosure').textContent).toMatch(/not a live real-time|Demo Available/i);
    expect(screen.getByTestId('value-ent_operational_occupancy').textContent).toMatch(/\d/);
    expect(screen.getByTestId('value-ent_financial_npr').textContent).toMatch(/SAR/);
  });

  it('renders Hospital Command Center with operational exception tiles', () => {
    renderAt('/command');
    expect(screen.getByTestId('command-center')).toBeInTheDocument();
    expect(screen.getByTestId('command-center-ribbon')).toBeInTheDocument();
    expect(screen.getByTestId('ops-exceptions')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Bed pressure|ED wait|Theatre|Critical stockouts|QS overdue/i);
    expect(document.body.textContent).toMatch(/not.*real-time/i);
  });

  it('composes 3–5 evidence-linked priorities from domain facts', () => {
    const view = buildEnterpriseView('H1', 2026, 'year');
    expect(view.priorities.length).toBeGreaterThanOrEqual(3);
    expect(view.priorities.length).toBeLessThanOrEqual(5);
    expect(view.facts.netPatientRevenue).toBeGreaterThan(0);
  });

  it('opens Vital Assist from the Executive Dashboard', () => {
    renderAt('/executive');
    fireEvent.click(screen.getByRole('button', { name: 'Vital Assist' }));
    expect(document.body.textContent).toMatch(/Enterprise Decision Support|Vital Assist/i);
  });
});
