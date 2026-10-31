/**
 * Stage 6 — Decision lifecycle.
 * Draft → Under Review → Approved/Rejected/Deferred → In Progress → Completed → Effectiveness Review.
 * Stored in sessionStorage/localStorage clearly labeled demo state.
 * Approval MUST NOT mutate historical KPI facts.
 */
import { resolveMetric } from './metricRegistry';
import type { DecisionOptionSummary, DecisionProposal, DecisionStatus } from './types';
import { createOutcome, getOutcome } from './outcomes';

const STORAGE_KEY = 'datavital.enterpriseAi.decisions.demo';
const STORAGE_LABEL = 'demo-session-state' as const;

let memoryStore: DecisionProposal[] = [];

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    return false;
  }
}

function readStore(): DecisionProposal[] {
  if (!canUseStorage()) return memoryStore;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
      ?? window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryStore;
    const parsed = JSON.parse(raw) as DecisionProposal[];
    memoryStore = parsed;
    return parsed;
  } catch {
    return memoryStore;
  }
}

function writeStore(items: DecisionProposal[]): void {
  memoryStore = items;
  if (!canUseStorage()) return;
  const payload = JSON.stringify(items);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, payload);
    // Mirror to localStorage with explicit demo label prefix in a companion key.
    window.localStorage.setItem(`${STORAGE_KEY}.label`, STORAGE_LABEL);
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    /* ignore quota */
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `dec_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function clearDecisionStore(): void {
  memoryStore = [];
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(`${STORAGE_KEY}.label`);
  } catch {
    /* ignore */
  }
}

export function listDecisions(): DecisionProposal[] {
  return [...readStore()];
}

export function getDecision(id: string): DecisionProposal | undefined {
  return readStore().find((d) => d.id === id);
}

export function createDecisionProposal(input: {
  title: string;
  question: string;
  rationale: string;
  options: DecisionOptionSummary[];
  recommendedOptionId?: string | null;
}): DecisionProposal {
  const proposal: DecisionProposal = {
    id: newId(),
    title: input.title,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: 'Draft',
    question: input.question,
    recommendedOptionId: input.recommendedOptionId ?? input.options[0]?.id ?? null,
    options: input.options,
    rationale: input.rationale,
    storageLabel: STORAGE_LABEL,
  };
  const outcome = createOutcome({
    decisionId: proposal.id,
    expected: input.rationale,
    simulated: input.options.map((o) => o.expectedBenefitNote).join(' | '),
  });
  proposal.outcomeId = outcome.id;
  const items = readStore();
  items.unshift(proposal);
  writeStore(items);
  return proposal;
}

const ALLOWED: Record<DecisionStatus, DecisionStatus[]> = {
  Draft: ['Under Review', 'Rejected', 'Deferred'],
  'Under Review': ['Approved', 'Rejected', 'Deferred', 'Draft'],
  Approved: ['In Progress', 'Deferred'],
  Rejected: ['Draft'],
  Deferred: ['Under Review', 'Draft'],
  'In Progress': ['Completed'],
  Completed: ['Effectiveness Review'],
  'Effectiveness Review': [],
};

/**
 * Transition lifecycle. Approval never mutates historical KPI facts — verified by callers/tests
 * via resolveMetric('rcm.net_patient_revenue') before/after.
 */
export function transitionDecision(
  id: string,
  next: DecisionStatus,
): { ok: boolean; decision?: DecisionProposal; error?: string; nprBefore?: number | null; nprAfter?: number | null } {
  const items = readStore();
  const idx = items.findIndex((d) => d.id === id);
  if (idx < 0) return { ok: false, error: `Unknown decision: ${id}` };
  const current = items[idx]!;
  const allowed = ALLOWED[current.status] ?? [];
  if (!allowed.includes(next)) {
    return { ok: false, error: `Cannot transition ${current.status} → ${next}`, decision: current };
  }

  // Snapshot NPR to prove approval does not mutate history (same hospital/year defaults for demo).
  const nprBefore = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });

  const updated: DecisionProposal = {
    ...current,
    status: next,
    updatedAt: nowIso(),
  };
  items[idx] = updated;
  writeStore(items);

  const nprAfter = resolveMetric('rcm.net_patient_revenue', { hospital: 'H1', year: 2026, period: 'year' });
  return { ok: true, decision: updated, nprBefore, nprAfter };
}

export function approveDecision(id: string) {
  const current = getDecision(id);
  if (!current) return { ok: false as const, error: `Unknown decision: ${id}` };
  if (current.status === 'Draft') {
    const stepped = transitionDecision(id, 'Under Review');
    if (!stepped.ok) return stepped;
  }
  return transitionDecision(id, 'Approved');
}

export function decisionStorageMeta() {
  return {
    key: STORAGE_KEY,
    label: STORAGE_LABEL,
    note: 'Demo decision state only — not a production workflow system. Approval does not mutate domain KPI ledgers.',
  };
}

export function getDecisionOutcome(decisionId: string) {
  const decision = getDecision(decisionId);
  if (!decision?.outcomeId) return null;
  return getOutcome(decision.outcomeId);
}
