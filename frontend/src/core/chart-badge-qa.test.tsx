import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { clearDemoStorage } from '@/showcase/state';
import { routes } from '@/routes';
import { axisMax, CHART_VIEW, lineDomain } from './viz';
import { buildIpdView } from './ipdView';

function renderAt(path: string) {
  clearDemoStorage();
  const App = () => useRoutes(routes);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('chart scale helpers', () => {
  it('keeps bar-friendly axisMax near the peak without forcing 0–100', () => {
    expect(axisMax([4.1, 4.6, 7.6])).toBeLessThanOrEqual(10);
    expect(axisMax([4.1, 4.6, 7.6])).toBeGreaterThanOrEqual(7.6);
    expect(axisMax([800, 600, 400])).toBeLessThanOrEqual(900);
    expect(axisMax([0])).toBe(1);
  });

  it('zooms flat line domains without dropping below a readable span', () => {
    const census = lineDomain([320, 337, 330, 340, 325]);
    expect(census.min).toBeGreaterThan(0);
    expect(census.max - census.min).toBeGreaterThanOrEqual(337 * 0.2);
    expect(census.max).toBeGreaterThanOrEqual(340);

    const deaths = lineDomain([18, 20, 19, 22, 21]);
    expect(deaths.min).toBeGreaterThanOrEqual(0);
    expect(deaths.max).toBeGreaterThanOrEqual(22);
    expect(deaths.max - deaths.min).toBeLessThan(50);

    const varying = lineDomain([10, 80, 40, 120, 60]);
    expect(varying.min).toBe(0);
    expect(varying.max).toBeGreaterThanOrEqual(120);
  });

  it('exports a stable compact chart viewBox contract', () => {
    expect(CHART_VIEW.width).toBe(720);
    expect(CHART_VIEW.compactHeight).toBe(148);
    expect(CHART_VIEW.padL).toBeGreaterThanOrEqual(52);
    expect(CHART_VIEW.padR).toBeGreaterThanOrEqual(12);
  });
});

describe('Inpatient chart data integrity', () => {
  it('keeps split Outcomes series on independent magnitudes', () => {
    const view = buildIpdView('H1', 2025, 'year');
    const readmits = view.monthlyDischarges.map((value) => Math.round(value * view.readmit30));
    const deaths = view.monthlyDeaths;
    const census = view.monthlyCensus;
    const discharges = view.monthlyDischarges;
    expect(Math.max(...readmits)).toBeGreaterThan(Math.max(...deaths) * 5);
    expect(Math.max(...discharges)).toBeGreaterThan(Math.max(...census) * 3);
    expect(lineDomain(deaths).max).toBeLessThan(lineDomain(readmits).max);
    expect(lineDomain(census).max).toBeLessThan(lineDomain(discharges).max);
  });

  it('keeps Snapshot volume bars on comparable lower-volume movements', () => {
    renderAt('/inpatient');
    expect(screen.getByRole('heading', { level: 1, name: 'Inpatient Snapshot' })).toBeInTheDocument();
    expect(screen.getByText(/Inbound vs outbound transfer volume on one shared scale/i)).toBeInTheDocument();
    expect(screen.getAllByText('Non-home episode exits').length).toBeGreaterThan(0);
    expect(screen.queryByText('Episode volume summary')).not.toBeInTheDocument();
  });
});

describe('status badge consistency', () => {
  it('renders availability badges with the shared gc-scope-status class', () => {
    renderAt('/inpatient');
    const badges = document.querySelectorAll('.gc-scope-status');
    expect(badges.length).toBeGreaterThan(2);
    const labels = [...badges].map((node) => node.textContent?.trim());
    expect(labels.some((label) => label === 'Available' || label === 'Estimated')).toBe(true);
    badges.forEach((badge) => {
      expect(badge.classList.contains('gc-scope-status')).toBe(true);
    });
  });

  it('keeps Emergency and Beds indicator badges on the same component family', () => {
    const ed = renderAt('/emergency');
    expect(document.querySelectorAll('.gc-scope-status').length).toBeGreaterThan(0);
    ed.unmount();

    renderAt('/beds');
    expect(document.querySelectorAll('.gc-scope-status').length).toBeGreaterThan(0);
  });

  it('shows Not available badges when blank indicators are revealed', async () => {
    renderAt('/inpatient');
    const toggle = screen.queryByRole('button', { name: /Show indicators not available in this view/i });
    expect(toggle).toBeTruthy();
    toggle!.click();
    await waitFor(() => {
      const blanks = [...document.querySelectorAll('.gc-scope-status')].filter((node) => node.textContent?.trim() === 'Not available');
      expect(blanks.length).toBeGreaterThan(0);
    });
  });
});

describe('Inpatient chart SVG contract on all three screens', () => {
  const screens = [
    { path: '/inpatient', title: 'Inpatient Snapshot', charts: [
      'Inpatient admissions over time',
      'Inpatient volume context',
      'Admissions by specialty',
      'Non-home episode exits',
    ] },
    { path: '/inpatient/stay', title: 'Stay & Discharge', charts: [
      'Median length of stay over time',
      'Length of stay vs review lines',
      'Long-stay contribution by specialty',
      'Length of stay by specialty',
      'Discharge destinations',
      'Expected discharge outlook',
    ] },
    { path: '/inpatient/outcomes', title: 'Care Progress & Outcomes', charts: [
      'Est. 30-day readmissions over time',
      'Inpatient deaths over time',
      '30-day readmissions by specialty',
      'Discharges over time',
      'Inpatient census over time',
    ] },
  ] as const;

  for (const screenDef of screens) {
    it(`renders ${screenDef.title} chart SVGs inside valid viewBoxes`, () => {
      renderAt(screenDef.path);
      expect(screen.getByRole('heading', { level: 1, name: screenDef.title })).toBeInTheDocument();
      for (const name of screenDef.charts) {
        const title = [...document.querySelectorAll('.gc-chart-copy strong')].find((node) => node.textContent?.trim() === name);
        expect(title, name).toBeTruthy();
        const figure = title!.closest('figure') ?? title!.closest('.gc-chart');
        expect(figure, name).toBeTruthy();
        const svg = figure!.querySelector('svg');
        expect(svg, name).toBeTruthy();
        const viewBox = svg!.getAttribute('viewBox') ?? '';
        const parts = viewBox.split(/\s+/).map(Number);
        expect(parts.length).toBe(4);
        expect(parts[0]).toBe(0);
        expect(parts[1]).toBe(0);
        expect(parts[2]).toBe(CHART_VIEW.width);
        expect(parts[3]).toBeGreaterThan(100);
        const yTicks = [...svg!.querySelectorAll('text')].filter((node) => {
          const x = Number(node.getAttribute('x'));
          return node.getAttribute('text-anchor') === 'end' && x <= CHART_VIEW.padL;
        });
        expect(yTicks.length).toBeGreaterThan(0);
        yTicks.forEach((tick) => {
          const x = Number(tick.getAttribute('x'));
          expect(x).toBeGreaterThan(0);
          expect(x).toBeLessThanOrEqual(CHART_VIEW.padL);
        });
      }
    });
  }
});

describe('Outpatient chart SVG contract on all three screens', () => {
  const screens = [
    { path: '/outpatient', title: 'Outpatient Performance Overview', charts: [
      'Outpatient visits over time',
      'Visits by clinical specialty',
      'Clinic activity by day',
      'Completed vs incomplete visits',
      'Clinic session utilization by specialty',
    ] },
    { path: '/outpatient/flow', title: 'Clinic Waiting & Patient Flow', charts: [
      'Waiting time trend',
      'Waiting time by specialty',
      'Arrival demand by hour',
      'Consultation starts by hour',
      'Waiting time distribution',
      'Clinic cycle time by specialty',
      'Patient flow stage volumes',
      'Delay contribution by clinic',
    ] },
    { path: '/outpatient/quality', title: 'Outpatient Quality & Follow-up', charts: [
      'Documentation completion trend',
      'Follow-up recommendations by specialty',
      'Referral status breakdown',
      'Pending clinical actions by specialty',
      'Consultation outcomes',
      'Follow-up coordination trend',
    ] },
  ] as const;

  for (const screenDef of screens) {
    it(`renders ${screenDef.title} chart SVGs inside valid viewBoxes`, () => {
      renderAt(screenDef.path);
      expect(screen.getByRole('heading', { level: 1, name: screenDef.title })).toBeInTheDocument();
      for (const name of screenDef.charts) {
        const title = [...document.querySelectorAll('.gc-chart-copy strong')].find((node) => node.textContent?.trim() === name);
        expect(title, name).toBeTruthy();
        const figure = title!.closest('figure') ?? title!.closest('.gc-chart');
        expect(figure, name).toBeTruthy();
        const svg = figure!.querySelector('svg');
        expect(svg, name).toBeTruthy();
        const viewBox = svg!.getAttribute('viewBox') ?? '';
        const parts = viewBox.split(/\s+/).map(Number);
        expect(parts.length).toBe(4);
        expect(parts[0]).toBe(0);
        expect(parts[1]).toBe(0);
        expect(parts[2]).toBe(CHART_VIEW.width);
        expect(parts[3]).toBeGreaterThan(100);
      }
    });
  }
});
