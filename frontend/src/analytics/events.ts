/**
 * Allowlisted engagement events for DataVital AI demo analytics.
 */

export const ENGAGEMENT_EVENTS = {
  invitation_opened: 'demo_invitation_opened',
  session_started: 'demo_session_started',
  /** Prefer PostHog `$pageview` for SPA transitions; keep alias for docs. */
  page_viewed: '$pageview',
  domain_viewed: 'demo_domain_viewed',
  /** Legacy alias retained for older docs/tests. */
  domain_visited: 'demo_domain_viewed',
  feature_explored: 'demo_feature_explored',
  demo_interaction: 'demo_feature_explored',
  return_visit: 'demo_return_visit',
  last_activity: 'demo_last_activity',
  consent_updated: 'demo_consent_updated',
} as const;

export type EngagementEventName = (typeof ENGAGEMENT_EVENTS)[keyof typeof ENGAGEMENT_EVENTS] | '$pageview' | '$pageleave';

export type InvitationAttribution = {
  invite_id: string | null;
  invite_verified: boolean;
  identity_verified: false;
};

export const EVENT_DICTIONARY: Record<
  string,
  { description: string; allowed_properties: string[]; forbidden: string[]; dedupe: string }
> = {
  $pageview: {
    description: 'SPA route pageview (manual; autocapture pageviews off).',
    allowed_properties: ['path', '$pathname', 'domain_id', 'domain_name', 'demo_build_id', 'invite_id', 'invite_verified', 'identity_verified'],
    forbidden: ['question', 'invite_token', 'email'],
    dedupe: 'path+timestamp guard in routeTracking (300ms)',
  },
  $pageleave: {
    description: 'Page leave when supported by SDK.',
    allowed_properties: ['path', '$pathname', 'demo_build_id', 'invite_id'],
    forbidden: ['question'],
    dedupe: 'SDK-managed',
  },
  demo_session_started: {
    description: 'First consented session boot per browser tab session.',
    allowed_properties: ['invite_id', 'invite_verified', 'identity_verified', 'session_id', 'demo_build_id'],
    forbidden: ['client_name', 'organization'],
    dedupe: 'sessionBooted ref once per mount',
  },
  demo_domain_viewed: {
    description: 'First view of a healthcare nav domain in the session.',
    allowed_properties: ['domain_id', 'domain_name', 'route_path', 'demo_build_id', 'invite_id', 'invite_verified', 'identity_verified'],
    forbidden: ['question'],
    dedupe: 'domainsSeen Set per session',
  },
  demo_feature_explored: {
    description: 'Coarse non-sensitive feature exploration (nav/filter/cta).',
    allowed_properties: ['interaction_type', 'control_id', 'route_path', 'demo_build_id', 'invite_id'],
    forbidden: ['question', 'message', 'user_input'],
    dedupe: 'caller-throttled',
  },
  demo_invitation_opened: {
    description: 'Landing with ?invite= (token stripped before capture).',
    allowed_properties: ['invite_id', 'invite_verified', 'identity_verified', 'path', 'demo_build_id'],
    forbidden: ['client_name', 'organization', 'email', 'token'],
    dedupe: 'once per invite capture in session',
  },
  demo_return_visit: {
    description: 'Anonymous visit count > 1.',
    allowed_properties: ['prior_session_count', 'invite_id', 'invite_verified', 'identity_verified', 'demo_build_id'],
    forbidden: ['email'],
    dedupe: 'once per session boot when visits>1',
  },
  demo_last_activity: {
    description: 'Throttled activity heartbeat.',
    allowed_properties: ['path', 'invite_id', 'demo_build_id'],
    forbidden: ['question'],
    dedupe: '60s throttle',
  },
  demo_consent_updated: {
    description: 'Analytics consent granted or denied.',
    allowed_properties: ['consent', 'demo_build_id'],
    forbidden: ['email'],
    dedupe: 'on user action',
  },
};
