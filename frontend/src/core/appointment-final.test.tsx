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
  it('exposes four appointment screens in navigation', () => {
    const domain = NAV_DOMAINS.find((item) => item.id === 'appointments');
    expect(domain?.screens.map((screen) => screen.to)).toEqual([
      '/appointments',
      '/appointments/access',
      '/appointments/attendance',
      '/appointments/recovery',
    ]);
  });

  it('renders Appointment Command Center', async () => {
    renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Appointment Command Center' })).toBeInTheDocument();
    expect(screen.getByTestId('appt-ribbon')).toBeInTheDocument();
    expect(screen.getAllByText(/Appointment demand over time|Appointment outcomes|Appointments by specialty/i).length).toBeGreaterThan(0);
  });

  it('renders Access & Scheduling Capacity', async () => {
    renderAt('/appointments/access');
    expect(await screen.findByRole('heading', { name: 'Access & Scheduling Capacity' })).toBeInTheDocument();
    expect(screen.getAllByText(/Booking lead time|Third next available|Available vs booked|Specialty access pressure/i).length).toBeGreaterThan(0);
  });

  it('renders Attendance & No-show Intelligence', async () => {
    renderAt('/appointments/attendance');
    expect(await screen.findByRole('heading', { name: 'Attendance & No-show Intelligence' })).toBeInTheDocument();
    expect(screen.getAllByText(/No-show by specialty|Cancellation timing|Lost capacity|Reminder coverage/i).length).toBeGreaterThan(0);
  });

  it('renders Slot Recovery & Optimization', async () => {
    renderAt('/appointments/recovery');
    expect(await screen.findByRole('heading', { name: 'Slot Recovery & Optimization' })).toBeInTheDocument();
    expect(screen.getAllByText(/Released vs recovered|Recovery rate|Waitlist demand|Recoverable capacity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Increase reminder coverage|Activate eligible waitlist|Release unused reserved/i).length).toBeGreaterThan(0);
  });
});
