/**
 * Stage 6 — Expected vs simulated vs observed outcomes.
 * Observed defaults to "Outcome not yet measured".
 */
import type { OutcomeRecord } from './types';

const STORAGE_KEY = 'datavital.enterpriseAi.outcomes.demo';

let memoryStore: OutcomeRecord[] = [];

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    return false;
  }
}

function readStore(): OutcomeRecord[] {
  if (!canUseStorage()) return memoryStore;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
      ?? window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryStore;
    memoryStore = JSON.parse(raw) as OutcomeRecord[];
    return memoryStore;
  } catch {
    return memoryStore;
  }
}

function writeStore(items: OutcomeRecord[]): void {
  memoryStore = items;
  if (!canUseStorage()) return;
  try {
    const payload = JSON.stringify(items);
    window.sessionStorage.setItem(STORAGE_KEY, payload);
    window.localStorage.setItem(STORAGE_KEY, payload);
    window.localStorage.setItem(`${STORAGE_KEY}.label`, 'demo-session-state');
  } catch {
    /* ignore */
  }
}

export function clearOutcomeStore(): void {
  memoryStore = [];
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createOutcome(input: {
  decisionId: string;
  expected: string;
  simulated: string;
}): OutcomeRecord {
  const record: OutcomeRecord = {
    id: `out_${Math.random().toString(36).slice(2, 10)}`,
    decisionId: input.decisionId,
    expected: input.expected,
    simulated: input.simulated,
    observed: 'Outcome not yet measured',
    observedStatus: 'not_yet_measured',
  };
  const items = readStore();
  items.unshift(record);
  writeStore(items);
  return record;
}

export function getOutcome(id: string): OutcomeRecord | undefined {
  return readStore().find((o) => o.id === id);
}

export function listOutcomes(): OutcomeRecord[] {
  return [...readStore()];
}

export function recordObservedOutcome(id: string, observed: string): OutcomeRecord | undefined {
  const items = readStore();
  const idx = items.findIndex((o) => o.id === id);
  if (idx < 0) return undefined;
  items[idx] = {
    ...items[idx]!,
    observed,
    observedStatus: 'measured',
  };
  writeStore(items);
  return items[idx];
}
