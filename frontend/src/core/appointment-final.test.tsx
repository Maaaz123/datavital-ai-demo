import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { NAV_DOMAINS } from './nav';

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
  const ribbon = screen.getByTestId('appt-ribbon');
  return within(ribbon).getAllByRole('button').map((button) => button.querySelector('span')?.textContent?.trim() ?? '');
}

function ribbonDeltas(path: string) {
  renderAt(path);
  const ribbon = screen.getByTestId('appt-ribbon');
  return within(ribbon).getAllByRole('button').map((button) => button.querySelector('em')?.textContent?.trim() ?? '');
}

const SHORT_TITLE_MAX = 22;

describe('Appointments final acceptance', () => {
  it('exposes four appointment screens with approved titles', () => {
    const domain = NAV_DOMAINS.find((item) => item.id === 'appointments');
    expect(domain?.screens.map((screen) => screen.title)).toEqual([
      'Appointment Command Center',
      'Appointment Access & Capacity',
      'Attendance & No-show Intelligence',
      'Slot Recovery & Optimization',
    ]);
    expect(domain?.screens.map((screen) => screen.to)).toEqual([
      '/appointments',
      '/appointments/access',
      '/appointments/attendance',
      '/appointments/recovery',
    ]);
  });

  it('renders Appointment Command Center without duplicate lead-time chart', async () => {
    renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Appointment Command Center' })).toBeInTheDocument();
    const titles = ribbonTitles('/appointments');
    expect(titles).toContain('Scheduled');
    expect(titles).not.toContain('Scheduled Appointments');
    expect(titles).not.toContain('No-show Count');
    expect(screen.getAllByText(/Demand vs Bookings|Appointment Outcomes|Bookings by Specialty/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Booking Lead Time Trend')).not.toBeInTheDocument();
  });

  it('renders Appointment Access & Capacity with short titles and owned lead-time chart', async () => {
    renderAt('/appointments/access');
    expect(await screen.findByRole('heading', { name: 'Appointment Access & Capacity' })).toBeInTheDocument();
    const titles = ribbonTitles('/appointments/access');
    expect(titles).toContain('Median Lead Time');
    expect(titles).toContain('3rd Next Available');
    expect(titles).toContain('Unbooked Slots');
    expect(titles).not.toContain('Booked Slots');
    expect(titles).not.toContain('Third Next Available Appointment');
    expect(screen.getAllByText(/Lead Time Trend|Booked vs Unbooked|7-Day Open Slots/i).length).toBeGreaterThan(0);
  });

  it('renders Attendance & No-show without Command-owned headline duplicates', async () => {
    renderAt('/appointments/attendance');
    expect(await screen.findByRole('heading', { name: 'Attendance & No-show Intelligence' })).toBeInTheDocument();
    const titles = ribbonTitles('/appointments/attendance');
    expect(titles).toContain('No-show Count');
    expect(titles).toContain('Lost Slots');
    expect(titles).not.toContain('Attendance Rate');
    expect(titles).not.toContain('Cancellation Rate');
    expect(titles).not.toContain('Rescheduled');
    expect(titles).not.toContain('Unscheduled Demand');
    expect(screen.getAllByText(/No-show Trend|Cancellations by Notice|Reminders vs Attendance/i).length).toBeGreaterThan(0);
  });

  it('renders Slot Recovery without Access fill/unbooked headline duplicates', async () => {
    renderAt('/appointments/recovery');
    expect(await screen.findByRole('heading', { name: 'Slot Recovery & Optimization' })).toBeInTheDocument();
    const titles = ribbonTitles('/appointments/recovery');
    expect(titles).toContain('Released Slots');
    expect(titles).toContain('Rebooked Slots');
    expect(titles).toContain('Potential Recoveries');
    expect(titles).not.toContain('Slot Fill Rate');
    expect(titles).not.toContain('Unbooked Slots');
    expect(screen.getAllByText(/Released vs Rebooked|Recovery Rate Trend|Current vs Scenario Fill/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cancellations by Lead Time/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Recovery Opportunities by Lead Time')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Increase reminder coverage|Activate eligible waitlist|Release unused reserved/i).length).toBeGreaterThan(0);
  });
});

describe('Appointments KPI deduplication and text fit', () => {
  it('keeps short display titles within two-line budget', () => {
    const paths = ['/appointments', '/appointments/access', '/appointments/attendance', '/appointments/recovery'];
    for (const path of paths) {
      const titles = ribbonTitles(path);
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) {
        expect(title.length, `${path} title "${title}"`).toBeLessThanOrEqual(SHORT_TITLE_MAX);
        expect(title).not.toMatch(/Third Next Available Appointment|Slots Lost to No-shows|Estimated Additional Recoveries/);
      }
    }
  });

  it('formats comparison labels without truncated baseline wording', () => {
    const paths = ['/appointments', '/appointments/access', '/appointments/attendance', '/appointments/recovery'];
    for (const path of paths) {
      for (const delta of ribbonDeltas(path)) {
        expect(delta, `${path} delta "${delta}"`).not.toMatch(/vs bas|vs baseline|Scenario share|Specialty max/i);
        expect(delta.length, `${path} delta "${delta}"`).toBeLessThanOrEqual(16);
        expect(/^(No change|Illustrative|[+\−−-]\d+\.\d+% YoY|[+\−−-]\d+\.\d+ pts|[A-Za-z0-9 ./+-]+)$/.test(delta) || delta.length <= 16).toBe(true);
      }
    }
  });

  it('does not repeat headline KPI display titles across screens without ownership', () => {
    const command = new Set(ribbonTitles('/appointments'));
    const access = new Set(ribbonTitles('/appointments/access'));
    const attendance = new Set(ribbonTitles('/appointments/attendance'));
    const recovery = new Set(ribbonTitles('/appointments/recovery'));

    expect([...command].filter((title) => access.has(title))).toEqual([]);
    expect([...command].filter((title) => recovery.has(title))).toEqual([]);
    expect(attendance.has('Attendance Rate')).toBe(false);
    expect(attendance.has('Cancellation Rate')).toBe(false);
    expect(recovery.has('Slot Fill Rate')).toBe(false);
    expect(recovery.has('Unbooked Slots')).toBe(false);
    // No-show Rate is intentionally shared as the attendance-loss primary signal
    expect(command.has('No-show Rate') && attendance.has('No-show Rate')).toBe(true);
  });

  it('opens KPI detail with full business name for short display titles', async () => {
    renderAt('/appointments/access');
    const ribbon = await screen.findByTestId('appt-ribbon');
    fireEvent.click(within(ribbon).getByText('3rd Next Available'));
    const detail = await screen.findByTestId('kpi-detail');
    expect(within(detail).getByRole('heading', { name: 'Third Next Available Appointment' })).toBeInTheDocument();
    expect(within(detail).getByText(/Illustrative schedule/i)).toBeInTheDocument();
  });
});
