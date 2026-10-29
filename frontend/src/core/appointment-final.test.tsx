import { render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { NAV_DOMAINS } from './nav';

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

  it('renders Appointment Command Center with remapped charts', async () => {
    renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Appointment Command Center' })).toBeInTheDocument();
    expect(screen.getByTestId('appt-ribbon')).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled Appointments').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Appointment Demand vs Bookings|Appointment Outcomes Breakdown|Scheduled Appointments by Specialty/i).length).toBeGreaterThan(0);
  });

  it('renders Appointment Access & Capacity', async () => {
    renderAt('/appointments/access');
    expect(await screen.findByRole('heading', { name: 'Appointment Access & Capacity' })).toBeInTheDocument();
    expect(screen.getAllByText('Median Booking Lead Time').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unbooked Slots').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Booking Lead Time Over Time|Booked vs Unbooked Slots|Next 7-Day Open Slots/i).length).toBeGreaterThan(0);
  });

  it('renders Attendance & No-show Intelligence', async () => {
    renderAt('/appointments/attendance');
    expect(await screen.findByRole('heading', { name: 'Attendance & No-show Intelligence' })).toBeInTheDocument();
    expect(screen.getAllByText('No-show Appointments').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No-show Rate Trend|Cancellations by Notice Period|Reminder Coverage vs Attendance Rate/i).length).toBeGreaterThan(0);
  });

  it('renders Slot Recovery & Optimization with distinct recovery KPIs', async () => {
    renderAt('/appointments/recovery');
    expect(await screen.findByRole('heading', { name: 'Slot Recovery & Optimization' })).toBeInTheDocument();
    expect(screen.getAllByText('Rebooked Released Slots').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estimated Additional Recoveries').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Released vs Rebooked Slots|Slot Recovery Rate Trend|Current vs Scenario Slot Fill Rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Increase reminder coverage|Activate eligible waitlist|Release unused reserved/i).length).toBeGreaterThan(0);
  });
});
