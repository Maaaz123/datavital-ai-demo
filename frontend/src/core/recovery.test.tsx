import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDemoStorage } from '@/showcase/state';
import { routes } from '@/routes';
import { BOARD_TABS } from './boards';

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

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
}

describe('command center recovery', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('uses a scorecard ribbon and drops the four KPI towers', () => {
    renderAt('/');
    expect(screen.getByTestId('command-ribbon')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Demand' })).not.toBeInTheDocument();
    expect(document.querySelector('.gc-kpi-groups')).toBeNull();
    expect(screen.getByText('98,752')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(4);
  });

  it('changes the command center when hospital, year, or service changes', () => {
    renderAt('/');
    const ribbon = screen.getByTestId('command-ribbon');
    const north = ribbon.textContent;
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H2' } });
    expect(ribbon.textContent).not.toBe(north);
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
    expect(screen.queryByText('98,752')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'Pharmacy' } });
    expect(screen.queryByText('98,752')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Medication orders/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Door-to-provider wait/i)).not.toBeInTheDocument();
  });

  it('keeps pharmacy alerts off the emergency board and rejects an unknown dashboard', () => {
    const emergency = renderAt('/board/emergency/triage');
    expect(screen.queryByText('Dashboard not found')).not.toBeInTheDocument();
    expect(screen.queryByText(/Medication orders not dispensed/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Door-to-provider wait|Boarding beyond 4 hours|No open Emergency alert/i).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-chart-state="ok"]').length).toBeGreaterThanOrEqual(2);
    emergency.unmount();
    const pharmacy = renderAt('/board/pharmacy/medication-flow');
    expect(screen.queryByText(/Door-to-provider wait/i)).not.toBeInTheDocument();
    pharmacy.unmount();
    renderAt('/board/not-a-domain/missing');
    expect(screen.getByRole('heading', { name: 'Workspace not found' })).toBeInTheDocument();
  });

  it('gives every published department tab a real chart configuration', () => {
    for (const [domain, tabs] of Object.entries(BOARD_TABS)) {
      for (const tab of tabs) {
        if (tab.story) continue;
        const view = renderAt(`/board/${domain}/${slug(tab.label)}`);
        expect(screen.queryByText('Dashboard not found'), `${domain}/${tab.label}`).not.toBeInTheDocument();
        expect(screen.queryByText('No extra view'), `${domain}/${tab.label}`).not.toBeInTheDocument();
        expect(document.querySelectorAll('[data-chart-state="ok"]').length, `${domain}/${tab.label}`).toBeGreaterThanOrEqual(2);
        view.unmount();
      }
    }
  });
});
