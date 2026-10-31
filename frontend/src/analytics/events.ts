/**
 * Event dictionary for B2B demo engagement.
 * Do not emit free-text questions, PHI, or invite registry fields.
 */

export const ENGAGEMENT_EVENTS = {
  invitation_opened: 'demo_invitation_opened',
  session_started: 'demo_session_started',
  page_viewed: 'demo_page_viewed',
  domain_visited: 'demo_domain_visited',
  demo_interaction: 'demo_interaction',
  return_visit: 'demo_return_visit',
  last_activity: 'demo_last_activity',
  consent_updated: 'demo_consent_updated',
} as const;

export type EngagementEventName = (typeof ENGAGEMENT_EVENTS)[keyof typeof ENGAGEMENT_EVENTS];

export type InvitationAttribution = {
  /** Opaque invite token hash or truncated id — never the full registry row. */
  invite_id: string | null;
  /** Server verified the token against the private registry. */
  invite_verified: boolean;
  /** Link may have been forwarded; attribution ≠ identity. */
  identity_verified: false;
};

export type PageViewProps = InvitationAttribution & {
  path: string;
  domain_id: string | null;
  screen_title: string | null;
  country_code: string | null;
};

export type InteractionProps = InvitationAttribution & {
  interaction_type: 'nav' | 'filter' | 'cta' | 'assist_open' | 'other';
  path: string;
  /** Never include question text or form field values. */
  control_id?: string;
};

export const EVENT_DICTIONARY: Record<
  EngagementEventName,
  { description: string; allowed_properties: string[]; forbidden: string[] }
> = {
  [ENGAGEMENT_EVENTS.invitation_opened]: {
    description: 'First open of a page that contained ?invite= (token stripped before capture).',
    allowed_properties: ['invite_id', 'invite_verified', 'identity_verified', 'path', 'country_code'],
    forbidden: ['client_name', 'organization', 'email', 'question'],
  },
  [ENGAGEMENT_EVENTS.session_started]: {
    description: 'Anonymous demo session started after consent (or under configured policy).',
    allowed_properties: ['invite_id', 'invite_verified', 'identity_verified', 'session_id', 'country_code'],
    forbidden: ['client_registry', 'question'],
  },
  [ENGAGEMENT_EVENTS.page_viewed]: {
    description: 'SPA route view with sanitized path.',
    allowed_properties: ['path', 'domain_id', 'screen_title', 'invite_id', 'invite_verified', 'identity_verified', 'country_code'],
    forbidden: ['question', 'search_with_invite'],
  },
  [ENGAGEMENT_EVENTS.domain_visited]: {
    description: 'First visit to a nav domain in the session.',
    allowed_properties: ['domain_id', 'path', 'invite_id', 'invite_verified', 'identity_verified'],
    forbidden: ['question'],
  },
  [ENGAGEMENT_EVENTS.demo_interaction]: {
    description: 'Coarse interaction (nav/filter/cta) without content payloads.',
    allowed_properties: ['interaction_type', 'path', 'control_id', 'invite_id', 'invite_verified', 'identity_verified'],
    forbidden: ['question', 'message', 'user_input'],
  },
  [ENGAGEMENT_EVENTS.return_visit]: {
    description: 'Visitor returned after a prior session (anonymous distinct id).',
    allowed_properties: ['invite_id', 'invite_verified', 'prior_session_count', 'identity_verified'],
    forbidden: ['email'],
  },
  [ENGAGEMENT_EVENTS.last_activity]: {
    description: 'Heartbeat / last activity marker (throttled).',
    allowed_properties: ['path', 'invite_id', 'invite_verified', 'identity_verified'],
    forbidden: ['question'],
  },
  [ENGAGEMENT_EVENTS.consent_updated]: {
    description: 'Analytics consent granted or withdrawn.',
    allowed_properties: ['consent', 'identity_verified'],
    forbidden: ['email'],
  },
};
