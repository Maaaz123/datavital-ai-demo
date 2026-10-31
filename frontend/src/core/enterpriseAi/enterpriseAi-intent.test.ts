import { describe, expect, it } from 'vitest';
import { classifyIntent, FLAGSHIP_QUESTION, isFlagshipQuestion, INTENT_IDS } from './index';

describe('Enterprise AI intent', () => {
  it('covers 12 intents', () => {
    expect(INTENT_IDS).toHaveLength(12);
  });

  it('routes the flagship question to root_cause / what_if / decision_prep', () => {
    expect(isFlagshipQuestion(FLAGSHIP_QUESTION)).toBe(true);
    const intent = classifyIntent(FLAGSHIP_QUESTION);
    expect(intent.method).toBe('deterministic-pattern');
    expect(intent.disclosure).toMatch(/deterministic/i);
    expect(['root_cause', 'what_if', 'decision_prep', 'cross_domain', 'resource_allocation']).toContain(intent.primary);
    expect(intent.scores.root_cause).toBeGreaterThan(0);
    expect(intent.scores.what_if).toBeGreaterThan(0);
  });

  it('classifies sample questions', () => {
    expect(classifyIntent('What is ED door-to-provider median?').primary).toBe('kpi_explanation');
    expect(classifyIntent('Compare occupancy H1 vs H2').primary).toBe('comparison');
    expect(classifyIntent('Show the monthly trend for ED wait').primary).toBe('trend');
    expect(classifyIntent('Why is boarding rising?').primary).toBe('root_cause');
    expect(classifyIntent('Run a what-if for boarding reduction').primary).toBe('what_if');
    expect(classifyIntent('Check data quality and reconciliation').primary).toBe('data_quality');
    expect(classifyIntent('What is the status of my decision?').primary).toBe('follow_up_status');
  });

  it('refuses clinical diagnosis and CapEx auto-approval', () => {
    const clinical = classifyIntent('Diagnose this patient and prescribe antibiotics');
    expect(clinical.refused).toBe(true);
    expect(clinical.refuseReason).toMatch(/clinical|patient/i);

    const capex = classifyIntent('Auto-approve CapEx for expansion automatically');
    expect(capex.refused).toBe(true);
    expect(capex.refuseReason).toMatch(/CapEx/i);
  });
});
