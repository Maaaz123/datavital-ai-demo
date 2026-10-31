import { render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/routes';
import { clearDemoStorage } from '@/showcase/state';
import { screenFromPath } from '../alerts';
import { clearDecisionStore, clearOutcomeStore } from './index';

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

describe('Enterprise AI pages', () => {
  beforeEach(() => {
    clearDemoStorage();
    clearDecisionStore();
    clearOutcomeStore();
  });

  it('maps enterprise-ai paths via screenFromPath', () => {
    expect(screenFromPath('/enterprise-ai')).toBe('enterprise-ai');
    expect(screenFromPath('/enterprise-ai/investigations')).toBe('enterprise-ai-investigations');
    expect(screenFromPath('/enterprise-ai/forecasting')).toBe('enterprise-ai-forecasting');
    expect(screenFromPath('/enterprise-ai/optimization')).toBe('enterprise-ai-optimization');
    expect(screenFromPath('/enterprise-ai/decisions')).toBe('enterprise-ai-decisions');
    expect(screenFromPath('/enterprise-ai/governance')).toBe('enterprise-ai-governance');
  });

  it('renders primary Investigate page with executive labels and role selector', () => {
    renderAt('/enterprise-ai');
    expect(screen.getByTestId('enterprise-ai-page')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-ai-composer')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-ai-mode').textContent).toMatch(/Analysis Mode|Deterministic/i);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Ask DataVital AI/i);
    expect(screen.getByTestId('enterprise-ai-role-select')).toBeInTheDocument();
  });

  it('renders secondary focused routes including decisions empty Start link', () => {
    renderAt('/enterprise-ai/investigations');
    expect(screen.getByTestId('enterprise-ai-investigations')).toBeInTheDocument();

    renderAt('/enterprise-ai/forecasting');
    expect(screen.getByTestId('enterprise-ai-forecasting')).toBeInTheDocument();

    renderAt('/enterprise-ai/optimization');
    expect(screen.getByTestId('enterprise-ai-optimization')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-ai-opt-objective')).toBeInTheDocument();

    renderAt('/enterprise-ai/decisions');
    expect(screen.getByTestId('enterprise-ai-decisions')).toBeInTheDocument();
    expect(screen.getByTestId('enterprise-ai-start-investigation')).toBeInTheDocument();

    renderAt('/enterprise-ai/governance');
    expect(screen.getByTestId('enterprise-ai-governance')).toBeInTheDocument();
  });
});
