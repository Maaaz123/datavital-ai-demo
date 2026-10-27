import { describe, it, expect } from 'vitest';
import { buildAppBreadcrumbs } from '@/utils/appBreadcrumbs';

const routeLabels: Record<string, string> = {
  workforce: 'nav.workforce',
  employees: 'nav.workforceEmployee',
};

const t = (key: string, options?: { defaultValue?: string }) => {
  const map: Record<string, string> = {
    'nav.workforce': 'Workforce Performance & Credentialing',
    'nav.workforceCrumb': 'Workforce',
    'nav.workforceEmployee': 'Employee profile',
  };
  return map[key] ?? options?.defaultValue ?? key;
};

describe('buildAppBreadcrumbs', () => {
  it('collapses workforce employee profile to Workforce → Employee profile', () => {
    const crumbs = buildAppBreadcrumbs('/workforce/employees/emp-1001', t, routeLabels);
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0]).toMatchObject({ label: 'Workforce', path: '/workforce', last: false });
    expect(crumbs[1]).toMatchObject({
      label: 'Employee profile',
      path: '/workforce/employees/emp-1001',
      last: true,
    });
  });

  it('does not expose raw unknown employee ids in the chrome', () => {
    const crumbs = buildAppBreadcrumbs('/workforce/employees/unknown-id', t, routeLabels);
    expect(crumbs.map((c) => c.label)).toEqual(['Workforce', 'Employee profile']);
    expect(crumbs.some((c) => c.label.includes('unknown'))).toBe(false);
  });

  it('keeps workforce root as a single title crumb', () => {
    const crumbs = buildAppBreadcrumbs('/workforce', t, routeLabels);
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].label).toBe('Workforce Performance & Credentialing');
    expect(crumbs[0].last).toBe(true);
  });
});
