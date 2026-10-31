/**
 * Deterministic Domain 16 evaluation over docs/enterprise-ai-eval-questions.json.
 * Scores tool selection / groundedness / refusal with PASS/FAIL only — no quality %.
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
} from './index';

type EvalQuestion = {
  id: string;
  category: string;
  question: string;
  followUp?: string;
  expectRefuse: boolean;
  expectPrimaryAnyOf?: string[];
  expectFlagship?: boolean;
  requireToolsAnyOf?: string[];
  requireNumericCitation?: boolean;
  requireRefusePattern?: string;
  requireSummaryPatterns?: string[];
  forbidSummaryPatterns?: string[];
  followUpPrimaryAnyOf?: string[];
  followUpRequireToolsAnyOf?: string[];
};

type EvalFixture = {
  questions: EvalQuestion[];
  defaultContext: { hospital: string; year: number; period: 'year' };
};

type CriterionResult = { id: string; criterion: string; pass: boolean; detail: string };

function loadFixture(): EvalFixture {
  const path = resolve(process.cwd(), '../docs/enterprise-ai-eval-questions.json');
  return JSON.parse(readFileSync(path, 'utf8')) as EvalFixture;
}

function evaluateOne(q: EvalQuestion, ctx: EvalFixture['defaultContext']): CriterionResult[] {
  const results: CriterionResult[] = [];
  const push = (criterion: string, pass: boolean, detail: string) => {
    results.push({ id: q.id, criterion, pass, detail });
  };

  const answer = orchestrate({
    question: q.question,
    hospital: ctx.hospital,
    year: ctx.year,
    period: ctx.period,
  });

  push('refuse_match', answer.refused === q.expectRefuse, `refused=${answer.refused} expected=${q.expectRefuse}`);

  if (q.expectRefuse) {
    if (q.requireRefusePattern) {
      const re = new RegExp(q.requireRefusePattern, 'i');
      const text = `${answer.refuseReason ?? ''} ${answer.summary}`;
      push('refuse_reason', re.test(text), text.slice(0, 160));
    }
    push('no_tools_on_refuse', answer.toolResults.length === 0, `tools=${answer.toolResults.length}`);
    return results;
  }

  if (q.expectPrimaryAnyOf?.length) {
    push(
      'primary_intent',
      q.expectPrimaryAnyOf.includes(answer.intent.primary),
      `primary=${answer.intent.primary}`,
    );
  }

  if (q.expectFlagship) {
    push('flagship', answer.flagship === true, `flagship=${String(answer.flagship)}`);
  }

  if (q.requireToolsAnyOf?.length) {
    const used = new Set(answer.toolResults.map((t) => t.toolId));
    const hit = q.requireToolsAnyOf.some((t) => used.has(t as never));
    push('tool_selection', hit, `used=[${[...used].join(',')}]`);
  }

  if (q.requireNumericCitation) {
    const ok = answer.citations.some((c) => c.numericValue != null && c.toolResultId);
    push('numeric_groundedness', ok, `citations=${answer.citations.length}`);
  }

  // Every citation must reference a real tool result id (groundedness).
  const ids = new Set(answer.toolResults.map((t) => t.id));
  const citesOk = answer.citations.every((c) => ids.has(c.toolResultId));
  push('citation_validity', citesOk, `citeOk=${citesOk}`);

  if (q.requireSummaryPatterns?.length) {
    for (const pat of q.requireSummaryPatterns) {
      push(`summary_has:${pat}`, new RegExp(pat, 'i').test(answer.summary), 'summary');
    }
  }
  if (q.forbidSummaryPatterns?.length) {
    for (const pat of q.forbidSummaryPatterns) {
      push(`summary_forbids:${pat}`, !new RegExp(pat, 'i').test(answer.summary), 'summary');
    }
  }

  push('mode_deterministic', answer.mode === 'deterministic', `mode=${answer.mode}`);

  if (q.followUp) {
    const followIntent = classifyIntent(q.followUp);
    if (q.followUpPrimaryAnyOf?.length) {
      push(
        'followup_intent',
        q.followUpPrimaryAnyOf.includes(followIntent.primary),
        `primary=${followIntent.primary}`,
      );
    }
    const follow = orchestrate({
      question: q.followUp,
      hospital: ctx.hospital,
      year: ctx.year,
      period: ctx.period,
    });
    if (q.followUpRequireToolsAnyOf?.length) {
      const used = new Set(follow.toolResults.map((t) => t.toolId));
      const hit = q.followUpRequireToolsAnyOf.some((t) => used.has(t as never));
      push('followup_tools', hit, `used=[${[...used].join(',')}]`);
    }
    push('followup_not_refused', follow.refused === false, `refused=${follow.refused}`);
  }

  return results;
}

describe('Enterprise AI 50-question deterministic evaluation', () => {
  beforeEach(() => {
    resetToolSeq();
    resetGateway();
    clearDecisionStore();
    clearOutcomeStore();
  });

  it('loads exactly 50 questions across required categories', () => {
    const fixture = loadFixture();
    expect(fixture.questions).toHaveLength(50);
    const cats = new Set(fixture.questions.map((q) => q.category));
    for (const required of [
      'financial',
      'ops',
      'cross-domain',
      'ambiguous',
      'missing-data',
      'prompt-injection',
      'unsafe-clinical',
      'unsupported-roi',
      'scenario',
      'multi-turn',
    ]) {
      expect(cats.has(required)).toBe(true);
    }
  });

  it('scores tool selection and groundedness without inventing quality percentages', () => {
    const fixture = loadFixture();
    const all: CriterionResult[] = [];
    for (const q of fixture.questions) {
      all.push(...evaluateOne(q, fixture.defaultContext));
    }

    const passed = all.filter((r) => r.pass).length;
    const failed = all.filter((r) => !r.pass);
    const byQuestion = new Map<string, CriterionResult[]>();
    for (const r of all) {
      const list = byQuestion.get(r.id) ?? [];
      list.push(r);
      byQuestion.set(r.id, list);
    }
    const questionsFullyPass = [...byQuestion.entries()].filter(([, rows]) => rows.every((r) => r.pass)).length;

    // Record deterministic counts only (no invented %).
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        questions: fixture.questions.length,
        criteriaTotal: all.length,
        criteriaPassed: passed,
        criteriaFailed: failed.length,
        questionsFullyPass,
        questionsPartialOrFail: fixture.questions.length - questionsFullyPass,
        failedSample: failed.slice(0, 20),
      }),
    );

    expect(failed, `Failed criteria:\n${failed.map((f) => `${f.id}/${f.criterion}: ${f.detail}`).join('\n')}`).toHaveLength(0);
    expect(questionsFullyPass).toBe(50);
  });
});
