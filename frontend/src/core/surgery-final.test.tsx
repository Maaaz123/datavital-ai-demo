import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { NAV_DOMAINS } from './nav';
import { SURGERY_KPI_OWNERS, assertUniqueSurgeryOwnership } from './surgeryOwnership';

function Harness() {
  return useRoutes(routes);
}

function renderAt(path: string) {
  cleanup();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

function ribbonTitles(path: string) {
  renderAt(path);
  const ribbon = screen.getByTestId('surg-ribbon');
  return within(ribbon).getAllByRole('button').map((button) => button.querySelector('span')?.textContent?.trim() ?? '');
}

describe('Surgery final acceptance', () => {
  it('exposes five surgery screens with approved titles', () => {
    const domain = NAV_DOMAINS.find((item) => item.id === 'surgery');
    expect(domain?.screens.map((screen) => screen.title)).toEqual([
      'Surgical Command Center',
      'OR Utilization & Scheduling',
      'Surgical Access & Backlog',
      'Surgical Quality & Safety',
      'Surgical Capacity Optimization',
    ]);
    expect(domain?.screens.map((screen) => screen.to)).toEqual([
      '/surgery',
      '/surgery/or',
      '/surgery/access',
      '/surgery/quality',
      '/surgery/optimization',
    ]);
    expect(NAV_DOMAINS).toHaveLength(16);
    expect(NAV_DOMAINS.reduce((sum, item) => sum + item.screens.length, 0)).toBe(83);
  });

  it('enforces unique primary KPI ownership across Surgery screens', () => {
    expect(assertUniqueSurgeryOwnership()).toEqual([]);
    const command = new Set(ribbonTitles('/surgery'));
    const or = new Set(ribbonTitles('/surgery/or'));
    const access = new Set(ribbonTitles('/surgery/access'));
    const quality = new Set(ribbonTitles('/surgery/quality'));
    const opt = new Set(ribbonTitles('/surgery/optimization'));
    const all = [command, or, access, quality, opt];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        expect([...all[i]].filter((title) => all[j].has(title))).toEqual([]);
      }
    }
    expect(command.has('Bed Occupancy')).toBe(false);
    expect(or.has('Completed Cases')).toBe(false);
    expect(access.has('OR Utilization')).toBe(false);
    expect(opt.has('Surgical Backlog')).toBe(false);
  });

  it('keeps short display titles within the card budget', () => {
    for (const path of ['/surgery', '/surgery/or', '/surgery/access', '/surgery/quality', '/surgery/optimization']) {
      for (const title of ribbonTitles(path)) {
        expect(title.length, `${path} ${title}`).toBeLessThanOrEqual(22);
      }
    }
    for (const owner of SURGERY_KPI_OWNERS) {
      expect(owner.display.length).toBeLessThanOrEqual(22);
    }
  });

  it('renders Surgical Command Center charts without duplicate OR efficiency headlines', async () => {
    renderAt('/surgery');
    expect(await screen.findByRole('heading', { name: 'Surgical Command Center' })).toBeInTheDocument();
    expect(screen.getAllByText('Completed Cases').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Surgical Volume Trend|Scheduled vs Completed|Volume by Specialty/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('OR Utilization')).not.toBeInTheDocument();
  });

  it('renders OR, Access, Quality, and Optimization screens', async () => {
    renderAt('/surgery/or');
    expect(await screen.findByRole('heading', { name: 'OR Utilization & Scheduling' })).toBeInTheDocument();
    expect(screen.getAllByText('OR Utilization').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OR Utilization by Room|First-Case On-Time Trend|Scheduled vs Used Hours/i).length).toBeGreaterThan(0);

    renderAt('/surgery/access');
    expect(await screen.findByRole('heading', { name: 'Surgical Access & Backlog' })).toBeInTheDocument();
    expect(screen.getAllByText('Surgical Backlog').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Waiting List Trend|Backlog by Specialty|Overdue by Specialty/i).length).toBeGreaterThan(0);

    renderAt('/surgery/quality');
    expect(await screen.findByRole('heading', { name: 'Surgical Quality & Safety' })).toBeInTheDocument();
    expect(screen.getAllByText('Checklist Completion').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unplanned Returns Trend|Safety Events by Type/i).length).toBeGreaterThan(0);

    renderAt('/surgery/optimization');
    expect(await screen.findByRole('heading', { name: 'Surgical Capacity Optimization' })).toBeInTheDocument();
    expect(screen.getAllByText('Recoverable Hours').length).toBeGreaterThan(0);
    expect(screen.queryByText('Scenario Improvement')).not.toBeInTheDocument();
    expect(screen.queryByText('Avoidable Delay Hours')).not.toBeInTheDocument();
    expect(screen.queryByText('Delay Reduction Opportunity')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Recoverable Hours by Driver|Current vs Scenario Capacity|Capacity Constraints/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Improve first-case starts|Reduce turnover time/i).length).toBeGreaterThan(0);

    renderAt('/surgery/or');
    expect(screen.queryByText('OR Delay Reasons')).not.toBeInTheDocument();
  });
});
