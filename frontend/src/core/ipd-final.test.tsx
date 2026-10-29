import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { HOSPITALS } from '@/showcase/engine';
import { answerQuestion } from '@/showcase/assistant';
import { clearDemoStorage } from '@/showcase/state';
import { runWhatIf } from '@/showcase/whatIf';
import { routes } from '@/routes';
import { buildIpdView } from './ipdView';
import { IPD_AI_CASES, ipdDocScenario, ipdIndicatorsFor, longStayRateFromP90, specialtyReadmitShare, type IpdScopeInput } from './ipdScope';

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

function baseInput(overrides: Partial<IpdScopeInput> = {}): IpdScopeInput {
  const docs = ipdDocScenario({ hospital: 'H1', occupiedBeds: 337, staffedBeds: 420 });
  return {
    admissions: 31474,
    census: 337,
    discharges: 31400,
    deaths: 210,
    edAdmitted: 11855,
    directAdmissions: 17573,
    transfersIn: 1416,
    transfersOut: 1200,
    losAvg: 4.4,
    losMedian: 4.1,
    losP90: 7.2,
    longStayCount: 3800,
    longStayRate: 0.12,
    expectedDischarges: 86,
    readyNotDischarged: 27,
    delayedDischargeRate: 0.08,
    readmit7: 0.018,
    readmit30: 0.102,
    amaRate: 0.018,
    specialties: [
      { id: 'Medicine', admissions: 8813, discharges: 8792, los: 4.3 },
      { id: 'Surgery', admissions: 6924, discharges: 6908, los: 4.5 },
    ],
    sources: [
      { id: 'From emergency', count: 11855 },
      { id: 'Elective / direct', count: 17573 },
      { id: 'Transfer in', count: 1416 },
      { id: 'Other', count: 630 },
    ],
    destinations: [
      { id: 'Home', count: 27000 },
      { id: 'Transfer out', count: 1200 },
      { id: 'Rehab / step-down', count: 2200 },
      { id: 'Left against medical advice', count: 1000 },
    ],
    oeLos: null,
    delayP50: null,
    delayP90: null,
    cancelRate: null,
    ...docs,
    ...overrides,
  };
}

describe('Inpatient final acceptance', () => {
  beforeEach(() => {
    clearDemoStorage();
  });

  it('fills documentation indicators with constructed scenario values', () => {
    const rows = ipdIndicatorsFor(baseInput());
    expect(rows.find((row) => row.name === 'Care Plan Documentation Rate')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Daily Clinical Review Completion Rate')?.value).toMatch(/%$/);
    expect(rows.find((row) => row.name === 'Median Consultation Response Time')?.value).toMatch(/hours/);
    expect(rows.find((row) => row.name === 'Discharge Summary Completion Rate')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Discharge Medication Reconciliation Completion Rate')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Follow-up Plan Documentation Rate')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Admission Assessment Completion Rate')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Pending Clinical Consultations')?.status).toBe('constructed');
    expect(rows.find((row) => row.name === 'Observed-to-Expected LOS Ratio')?.value).toBe('Not available');
    expect(rows.find((row) => row.name === 'Discharge Delay Duration P50/P90')?.value).toBe('Not available');
    expect(rows.find((row) => row.name === 'Admission Cancellation Rate')?.value).toBe('Not available');
  });

  it('keeps admission sources and destinations reconciling', () => {
    const input = baseInput();
    const sourceSum = input.sources.reduce((sum, item) => sum + item.count, 0);
    const destSum = input.destinations.reduce((sum, item) => sum + item.count, 0);
    expect(sourceSum).toBe(input.admissions);
    expect(destSum).toBe(input.discharges);
  });

  it('keeps specialty readmit catalog tilt aligned with the Outcomes chart formula', () => {
    const input = baseInput();
    const row = ipdIndicatorsFor(input).find((item) => item.name === 'Readmissions by Clinical Specialty');
    expect(row?.method).toMatch(/Severity is not adjusted/i);
    const medicine = input.specialties[0];
    const share = input.readmit30 * (0.75 + (medicine.los / Math.max(input.losMedian, 1)) * 0.2);
    expect(row?.value).toContain('Medicine');
    expect(share).toBeGreaterThan(input.readmit30 * 0.7);
  });

  it('varies documentation scenario by hospital while staying in band', () => {
    for (const hospital of HOSPITALS.map((item) => item.code)) {
      const docs = ipdDocScenario({ hospital, occupiedBeds: 300, staffedBeds: 400 });
      expect(docs.carePlanDocRate).toBeGreaterThan(0.8);
      expect(docs.carePlanDocRate).toBeLessThan(0.97);
      expect(docs.consultResponseHours).toBeGreaterThan(8);
      expect(docs.pendingConsults).toBeGreaterThan(0);
    }
  });

  it('renders Care Progress documentation cards instead of blank Not available strip', () => {
    renderAt('/inpatient/outcomes');
    expect(screen.getByRole('heading', { level: 1, name: 'Care Progress & Outcomes' })).toBeInTheDocument();
    const strip = screen.getByTestId('ipd-doc-progress');
    expect(within(strip).getByText('Care Plan Documentation Rate')).toBeInTheDocument();
    expect(within(strip).getByText('Daily Clinical Review Completion Rate')).toBeInTheDocument();
    expect(within(strip).getByText('Median Consultation Response Time')).toBeInTheDocument();
    expect(within(strip).getByText('Discharge Summary Completion Rate')).toBeInTheDocument();
    expect(within(strip).getByText('Discharge Medication Reconciliation Completion Rate')).toBeInTheDocument();
    expect(within(strip).getByText('Follow-up Plan Documentation Rate')).toBeInTheDocument();
    expect(within(strip).queryByText('Not available')).not.toBeInTheDocument();
    expect(screen.getByText(/AI decision support/i)).toBeInTheDocument();
    expect(IPD_AI_CASES.find((item) => item.id === 'IPD-AI-07')?.analysis).toMatch(/illustrative/i);
  });

  it('renders Snapshot and Stay routes with reconciled copy', () => {
    const snap = renderAt('/inpatient');
    expect(screen.getByRole('heading', { level: 1, name: 'Inpatient Snapshot' })).toBeInTheDocument();
    expect(screen.getByText(/Admission source mix/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Census stays on the ribbon KPI/i).length).toBeGreaterThan(0);
    snap.unmount();

    const stay = renderAt('/inpatient/stay');
    expect(screen.getByRole('heading', { level: 1, name: 'Stay & Discharge' })).toBeInTheDocument();
    expect(screen.getAllByText(/Discharge destinations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Long-stay contribution by specialty/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Discharge summary completion/i).length).toBeGreaterThan(0);
    stay.unmount();
  });

  it('answers Vital Assist documentation questions with scenario rates', () => {
    const answer = answerQuestion('How is care plan documentation performing?', 'H1', 2025, 'Inpatient', 'en');
    expect(answer.observation).toMatch(/Care-plan documentation ~/i);
    expect(answer.evidence).toMatch(/illustrative/i);
    expect(answer.observation).not.toMatch(/not available in this demonstration/i);
  });

  it('keeps buildIpdView sources, destinations, and Other non-zero across hospitals and periods', () => {
    for (const hospital of ['H1', 'H2', 'H3', 'H4', 'H5', 'ALL']) {
      for (const period of ['year', 'Q1', 'Q2', 'Q3', 'Q4'] as const) {
        const view = buildIpdView(hospital, 2025, period);
        const sourceSum = view.sources.reduce((sum, item) => sum + item.count, 0);
        const destSum = view.destinations.reduce((sum, item) => sum + item.count, 0);
        expect(sourceSum).toBe(view.admissions);
        expect(destSum).toBe(view.discharges);
        expect(view.sources.find((item) => item.id === 'Other')?.count ?? 0).toBeGreaterThan(0);
        expect(view.longStayRate).toBe(longStayRateFromP90(view.losP90));
        expect(view.longStayCount).toBe(Math.round(view.discharges * view.longStayRate));
        if (period !== 'year') {
          expect(view.periodLabel).toBe(`${period} 2025`);
          expect(view.admissions).toBeLessThan(buildIpdView(hospital, 2025, 'year').admissions);
        }
      }
    }
  });

  it('aligns specialty readmit chart formula with catalog and Assist period labels', () => {
    const yearView = buildIpdView('H1', 2025, 'year');
    const q1View = buildIpdView('H1', 2025, 'Q1');
    expect(q1View.discharges).not.toBe(yearView.discharges);
    const medicine = yearView.specialties[0];
    const share = specialtyReadmitShare(yearView.readmit30, medicine.los, yearView.losMedian);
    const catalog = ipdIndicatorsFor(baseInput({
      admissions: yearView.admissions,
      discharges: yearView.discharges,
      census: yearView.census,
      losMedian: yearView.losMedian,
      losP90: yearView.losP90,
      losAvg: yearView.losAvg,
      longStayRate: yearView.longStayRate,
      longStayCount: yearView.longStayCount,
      readmit30: yearView.readmit30,
      specialties: yearView.specialties,
      sources: yearView.sources,
      destinations: yearView.destinations,
      carePlanDocRate: yearView.carePlanDocRate,
      dailyReviewRate: yearView.dailyReviewRate,
      consultResponseHours: yearView.consultResponseHours,
      dischargeSummaryRate: yearView.dischargeSummaryRate,
      medRecRate: yearView.medRecRate,
      followUpPlanRate: yearView.followUpPlanRate,
    })).find((item) => item.name === 'Readmissions by Clinical Specialty');
    expect(catalog?.value).toMatch(new RegExp(`Medicine ${(share * 100).toFixed(1)}%`));

    const yearAnswer = answerQuestion('What is the unplanned 30-day readmission rate?', 'H1', 2025, 'Inpatient', 'en', 'year');
    const q1Answer = answerQuestion('What is the unplanned 30-day readmission rate?', 'H1', 2025, 'Inpatient', 'en', 'Q1');
    expect(yearAnswer.title).toMatch(/Full year 2025/);
    expect(q1Answer.title).toMatch(/Q1 2025/);
    expect(q1Answer.evidence).toMatch(/Figures use Q1 2025, not the full-year total/);
    expect(q1Answer.evidence).toContain(q1View.discharges.toLocaleString('en-US'));
    expect(yearAnswer.evidence).toContain(yearView.discharges.toLocaleString('en-US'));

    const q1WhatIf = runWhatIf('Inpatient', 'H1', 2025, null, 'Q1');
    expect(q1WhatIf.current).toMatch(/Q1 2025/);
    expect(q1WhatIf.assumptions).toMatch(/Q1 2025/);
  });

  it('exposes exactly 40 indicators and 12 AI cases with three intentional unavailable rows', () => {
    const rows = ipdIndicatorsFor(baseInput());
    expect(rows).toHaveLength(40);
    expect(IPD_AI_CASES).toHaveLength(12);
    expect(rows.filter((row) => row.status === 'unavailable')).toHaveLength(3);
    expect(rows.filter((row) => row.value === 'Not available').map((row) => row.name).sort()).toEqual([
      'Admission Cancellation Rate',
      'Discharge Delay Duration P50/P90',
      'Observed-to-Expected LOS Ratio',
    ]);
  });

  it('updates inpatient KPIs and documentation when hospital or period changes', () => {
    renderAt('/inpatient/outcomes');
    const ribbon = screen.getByTestId('ipd-ribbon');
    const baseline = ribbon.textContent;
    const strip = screen.getByTestId('ipd-doc-progress').textContent;
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H3' } });
    expect(ribbon.textContent).not.toBe(baseline);
    expect(screen.getByTestId('ipd-doc-progress').textContent).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: 'H1' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'Q1' } });
    expect(ribbon.textContent).not.toBe(baseline);
    expect(screen.getByTestId('ipd-doc-progress').textContent).not.toMatch(/Not available/);
    expect(strip).toMatch(/%|hours/);
    expect(document.querySelector('[data-chart-state="ok"]')).toBeTruthy();
  });
});
