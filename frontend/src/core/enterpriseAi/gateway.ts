/**
 * Model-service abstraction for Domain 16.
 * Public demo MUST run deterministic. LLM mode is stubbed/disabled unless a secure backend exists.
 * Never place API keys in the frontend.
 */
import type { AiMode } from './types';
import { AI_MODE_DISCLOSURE } from './types';

export type GatewayConfig = {
  mode: AiMode;
  /** When true, llm mode may be selected — still stubbed without a secure backend. */
  llmBackendAvailable: boolean;
};

const DEFAULT: GatewayConfig = {
  mode: 'deterministic',
  llmBackendAvailable: false,
};

let config: GatewayConfig = { ...DEFAULT };

export function getGatewayConfig(): GatewayConfig {
  return { ...config };
}

export function setGatewayMode(mode: AiMode): { ok: boolean; mode: AiMode; message: string } {
  if (mode === 'llm' && !config.llmBackendAvailable) {
    config = { ...config, mode: 'deterministic' };
    return {
      ok: false,
      mode: 'deterministic',
      message:
        'LLM mode disabled: no secure model backend configured. Public demo stays in deterministic tool orchestration. No API keys are stored in the frontend.',
    };
  }
  config = { ...config, mode };
  return {
    ok: true,
    mode: config.mode,
    message: mode === 'deterministic' ? AI_MODE_DISCLOSURE : 'LLM mode enabled via secure backend stub (not used in public demo).',
  };
}

/** Reset for tests. */
export function resetGateway(): void {
  config = { ...DEFAULT };
}

export function resolveActiveMode(): { mode: AiMode; label: string; disclosure: string } {
  const mode: AiMode = config.mode === 'llm' && config.llmBackendAvailable ? 'llm' : 'deterministic';
  if (mode === 'llm') {
    return {
      mode,
      label: 'LLM-assisted (backend)',
      disclosure: 'LLM mode requires a secure backend. Public demo defaults to deterministic.',
    };
  }
  return {
    mode: 'deterministic',
    label: 'Deterministic tool orchestration',
    disclosure: AI_MODE_DISCLOSURE,
  };
}

/**
 * Optional LLM completion stub — always refused unless backend flag is set.
 * Returns null so callers fall through to deterministic tools.
 */
export async function llmComplete(_prompt: string): Promise<null> {
  if (!config.llmBackendAvailable) return null;
  // Secure backend would be invoked here — never call external LLM APIs from the browser.
  return null;
}
