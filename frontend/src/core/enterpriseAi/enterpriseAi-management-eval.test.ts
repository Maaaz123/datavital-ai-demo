/**
 * 80+ management question pack — intent/focus/scenario checks + sample transcripts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDecisionStore,
  clearOutcomeStore,
  classifyIntent,
  orchestrate,
  resetGateway,
  resetToolSeq,
  resolveFocusFromQuestion,
  selectScenarioFromQuestion,
} from './index';

type MgmtQ = {
  id: string;
  role: string;
  question: string;
  expectFocus?: string;
  expectFocusPrefix?: string;
  expectFocusAnyOf?: string[];
  expectNotFocus?: string;
  expectScenarioId?: string;
  expectNotScenario?: string;
  expectScenarioUnavailable?: boolean;
  expectAmbiguousOrRisk?: boolean;
  expectFlagship?: boolean;
  expectRefuse?: boolean;
  expectPrimaryAnyOf?: string[];
  expectSections?: boolean;
};

type Fixture = { questions: MgmtQ[]; defaultContext: { hospital: string; year: number; period: 'year' } };

function load(): Fixture {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), '../docs/enterprise-ai-management-questions.json'), 'utf8'),
  ) as Fixture;
}

describe('Enterprise AI 80+ management question pack', () => {
  beforeEach(() => {
    resetToolSeq();
    resetGateway();
    clearDecisionStore();
    clearOutcomeStore();
  });

  it('loads at least 80 management questions', () => {
    const fixture = load();
    expect(fixture.questions.length).toBeGreaterThanOrEqual(80);
  });

  it('passes focus/scenario/intent checks for the pack', () => {
    const fixture = load();
    const failures: string[] = [];
    const transcripts: { id: string; focus: string | null; scenario: string | null; summary: string }[] = [];

    for (const q of fixture.questions) {
      const focus = resolveFocusFromQuestion(q.question);
      const scenario = selectScenarioFromQuestion(q.question);
      const intent = classifyIntent(q.question);

      if (q.expectRefuse) {
        if (!intent.refused) failures.push(`${q.id}: expected refuse`);
        continue;
      }
      if (intent.refused) {
        failures.push(`${q.id}: unexpected refuse ${intent.refuseReason}`);
        continue;
      }

      if (q.expectFlagship) {
        const answer = orchestrate({
          question: q.question,
          hospital: fixture.defaultContext.hospital,
          year: fixture.defaultContext.year,
          period: fixture.defaultContext.period,
        });
        if (!answer.flagship) failures.push(`${q.id}: expected flagship`);
        if (!answer.executive?.A_executiveSummary) failures.push(`${q.id}: missing executive summary`);
        transcripts.push({
          id: q.id,
          focus: answer.focusMetricId ?? null,
          scenario: answer.scenarioId ?? null,
          summary: answer.summary.slice(0, 180),
        });
        continue;
      }

      if (q.expectAmbiguousOrRisk) {
        if (!(focus.mode === 'clarification' || focus.mode === 'hospital_wide_risk' || focus.focusMetricId == null)) {
          // Allow topic hit if question also names a domain strongly — still must not be silent-only ED for pure overview phrasings.
          if (!/how is hospital|something interesting|top risks|overview|what should i look/i.test(q.question)) {
            /* ok */
          } else if (focus.focusMetricId === 'ed.wait.median_min' && focus.mode === 'topic') {
            failures.push(`${q.id}: ambiguous silently resolved to ED`);
          }
        }
        if (focus.focusMetricId === 'ed.wait.median_min' && /something interesting|how is hospital performing|top risks/i.test(q.question)) {
          failures.push(`${q.id}: silent ED default on ambiguous`);
        }
      }

      if (q.expectFocus && focus.focusMetricId !== q.expectFocus) {
        failures.push(`${q.id}: focus ${focus.focusMetricId} ≠ ${q.expectFocus}`);
      }
      if (q.expectFocusPrefix && !(focus.focusMetricId ?? '').startsWith(q.expectFocusPrefix)) {
        failures.push(`${q.id}: focus ${focus.focusMetricId} missing prefix ${q.expectFocusPrefix}`);
      }
      if (q.expectFocusAnyOf && !q.expectFocusAnyOf.includes(focus.focusMetricId ?? '')) {
        failures.push(`${q.id}: focus ${focus.focusMetricId} not in ${q.expectFocusAnyOf.join('|')}`);
      }
      if (q.expectNotFocus && focus.focusMetricId === q.expectNotFocus) {
        failures.push(`${q.id}: focus unexpectedly ${q.expectNotFocus}`);
      }
      if (q.expectScenarioId && scenario.scenarioId !== q.expectScenarioId) {
        failures.push(`${q.id}: scenario ${scenario.scenarioId} ≠ ${q.expectScenarioId}`);
      }
      if (q.expectNotScenario && scenario.scenarioId === q.expectNotScenario) {
        failures.push(`${q.id}: scenario unexpectedly ${q.expectNotScenario}`);
      }
      if (q.expectScenarioUnavailable && scenario.available) {
        failures.push(`${q.id}: expected unavailable scenario`);
      }
      if (q.expectPrimaryAnyOf && !q.expectPrimaryAnyOf.includes(intent.primary)) {
        failures.push(`${q.id}: primary ${intent.primary} not in ${q.expectPrimaryAnyOf.join('|')}`);
      }
      if (q.expectSections) {
        const answer = orchestrate({
          question: q.question,
          hospital: fixture.defaultContext.hospital,
          year: fixture.defaultContext.year,
          period: fixture.defaultContext.period,
        });
        if (!answer.executive?.A_executiveSummary || !answer.executive.G_followUpMeasurement) {
          failures.push(`${q.id}: missing A–G sections`);
        }
        transcripts.push({
          id: q.id,
          focus: answer.focusMetricId ?? null,
          scenario: answer.scenarioId ?? null,
          summary: answer.summary.slice(0, 180),
        });
      }
    }

    // Sample transcripts for docs evidence (finance, supply, flagship already covered).
    for (const sample of ['M01', 'M06', 'M18']) {
      if (!transcripts.some((t) => t.id === sample)) {
        const q = fixture.questions.find((item) => item.id === sample)!;
        const answer = orchestrate({
          question: q.question,
          hospital: fixture.defaultContext.hospital,
          year: fixture.defaultContext.year,
          period: fixture.defaultContext.period,
        });
        transcripts.push({
          id: sample,
          focus: answer.focusMetricId ?? null,
          scenario: answer.scenarioId ?? null,
          summary: answer.summary.slice(0, 180),
        });
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
    expect(transcripts.length).toBeGreaterThanOrEqual(3);
  });
});
