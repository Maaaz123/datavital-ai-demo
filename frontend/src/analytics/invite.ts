/**
 * Opaque invitation token handling.
 * Tokens are cryptographically random; the public app never embeds the client registry.
 * Presence of ?invite= is attribution only — not proof of the intended client's identity.
 */

import type { InvitationAttribution } from './events';
import { stripSensitiveParamsFromLocation } from './privacy';

const INVITE_SESSION_KEY = 'datavital-invite-attr-v1';
/** Opaque tokens: 22–64 url-safe base64 / hex chars. */
export const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

export type InviteCapture = {
  rawToken: string | null;
  attribution: InvitationAttribution;
};

export function isWellFormedInviteToken(token: string): boolean {
  return INVITE_TOKEN_RE.test(token.trim());
}

/** Hash-like short id for analytics properties (never store PII mapping client-side). */
export async function opaqueInviteId(token: string): Promise<string> {
  const data = new TextEncoder().encode(`datavital-invite:${token.trim()}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
  }
  // Fallback for non-subtle environments (tests): non-cryptographic truncation marker.
  return `inv_${token.trim().slice(0, 12)}`;
}

export function readInviteFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const token = params.get('invite');
  if (!token) return null;
  return isWellFormedInviteToken(token) ? token.trim() : null;
}

export function loadStoredAttribution(): InvitationAttribution | null {
  try {
    const raw = sessionStorage.getItem(INVITE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InvitationAttribution;
    if (typeof parsed.invite_id === 'string' || parsed.invite_id === null) {
      return {
        invite_id: parsed.invite_id,
        invite_verified: parsed.invite_verified === true,
        identity_verified: false,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function storeAttribution(attr: InvitationAttribution): void {
  try {
    sessionStorage.setItem(INVITE_SESSION_KEY, JSON.stringify(attr));
  } catch {
    /* ignore */
  }
}

/**
 * Capture invite from URL, strip token from address bar, return attribution.
 * Server verification is optional via inviteApiBase.
 */
export async function captureInviteFromLocation(args: {
  search?: string;
  inviteApiBase?: string | null;
}): Promise<InviteCapture> {
  const search = args.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const rawToken = readInviteFromSearch(search);
  // Always strip secrets from the visible URL even when analytics is disabled.
  if (typeof window !== 'undefined') {
    stripSensitiveParamsFromLocation(search);
  }

  if (!rawToken) {
    const stored = loadStoredAttribution();
    return {
      rawToken: null,
      attribution: stored ?? {
        invite_id: null,
        invite_verified: false,
        identity_verified: false,
      },
    };
  }

  const invite_id = await opaqueInviteId(rawToken);
  let invite_verified = false;

  if (args.inviteApiBase) {
    try {
      const res = await fetch(
        `${args.inviteApiBase.replace(/\/$/, '')}/v1/invites/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken }),
          credentials: 'omit',
        },
      );
      if (res.ok) {
        const body = (await res.json()) as { valid?: boolean };
        invite_verified = body.valid === true;
      }
    } catch {
      invite_verified = false;
    }
  }

  const attribution: InvitationAttribution = {
    invite_id,
    invite_verified,
    identity_verified: false,
  };
  storeAttribution(attribution);
  return { rawToken, attribution };
}

/** Cryptographically random invite token for server-side / CLI generation. */
export function generateInviteToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // base64url without padding
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  if (typeof btoa === 'function') {
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
