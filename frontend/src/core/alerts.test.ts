import { describe, expect, it } from 'vitest';
import { answerQuestion } from '@/showcase/assistant';
import { HOSPITALS, YEARS } from '@/showcase/engine';
import { alertsFor, badgeCount, visibleAlerts } from './alerts';

describe('deterministic copilot alerts', () => {
  it('builds the same alerts twice and keeps pharmacy off admissions', () => {
    const first = alertsFor('H1', 2026);
    const second = alertsFor('H1', 2026);
    expect(first.map((alert) => alert.id)).toEqual(second.map((alert) => alert.id));
    const pharmacy = visibleAlerts('H1', 2026, 'All', 'pharmacy').alerts;
    expect(pharmacy.length).toBeGreaterThan(0);
    expect(pharmacy.every((alert) => alert.department === 'Pharmacy')).toBe(true);
    expect(pharmacy.every((alert) => alert.kpi.startsWith('kpi_rx_'))).toBe(true);
    expect(pharmacy.map((alert) => `${alert.title} ${alert.evidence}`).join(' ')).not.toMatch(/admission/i);
  });

  it('changes the badge with hospital and department, and ignores dismissed alerts', () => {
    const north = badgeCount('H1', 2026, 'All', {});
    const pharmacy = badgeCount('H1', 2026, 'Pharmacy', {});
    expect(north).toBeGreaterThan(0);
    expect(pharmacy).toBeLessThan(north);
    const occupancy = (code: string) => alertsFor(code, 2026).find((alert) => alert.kpi === 'kpi_bed_occupancy_rate');
    expect(occupancy('H3')?.observed).not.toBe(occupancy('H1')?.observed);
    const sample = alertsFor('H1', 2026).find((alert) => alert.severity !== 'info');
    expect(sample).toBeTruthy();
    expect(badgeCount('H1', 2026, 'All', { [sample!.id]: 'dismissed' })).toBeLessThan(north);
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        for (const alert of alertsFor(hospital.code, year)) {
          expect(alert.id.startsWith(`${hospital.code}|${year}|`)).toBe(true);
          expect(alert.observed.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('answers the prepared questions from the selected scope', () => {
    const denial = answerQuestion('What is the claims denial rate?', 'H1', 2026, 'All');
    expect(denial.title).toMatch(/Demo General North/);
    expect(denial.observation).toMatch(/4\.6%/);
    const priority = answerQuestion('Which alerts are highest priority?', 'H1', 2026, 'All');
    expect(priority.title).toMatch(/Demo General North in 2026/);
    const unsupported = answerQuestion('What is the weather tomorrow?', 'H1', 2026, 'All');
    expect(unsupported.title).toMatch(/outside the simulated set/i);
  });
});
