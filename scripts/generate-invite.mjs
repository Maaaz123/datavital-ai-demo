#!/usr/bin/env node
/**
 * Operator CLI — generate a cryptographically random invite token + link.
 * Does NOT write a public registry into the GitHub Pages bundle.
 * Persist rows only in the private server-side registry (see docs/client-engagement/).
 *
 * Usage:
 *   node scripts/generate-invite.mjs --org "Acme Hospital" --name "Dr. Smith" --country SA
 */
import { randomBytes } from 'node:crypto';

function parseArgs(argv) {
  const out = { org: '', name: '', country: '', base: 'https://demo.datavital.io/enterprise-ai' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--org' && next) { out.org = next; i += 1; }
    else if (a === '--name' && next) { out.name = next; i += 1; }
    else if (a === '--country' && next) { out.country = next; i += 1; }
    else if (a === '--base' && next) { out.base = next; i += 1; }
  }
  return out;
}

function token() {
  return randomBytes(24).toString('base64url');
}

const args = parseArgs(process.argv);
const invite = token();
const invitationId = `inv_${randomBytes(8).toString('hex')}`;
const createdAt = new Date().toISOString();
const link = `${args.base}?invite=${invite}`;

const row = {
  invitation_id: invitationId,
  token_plaintext_once: invite,
  token_note: 'Store only a server-side hash of the token in the private registry. Show plaintext once to the operator.',
  client_name: args.name || null,
  organization: args.org || null,
  country: args.country || null,
  status: 'active',
  created_at: createdAt,
  invitation_link: link,
  attribution_warning: 'A forwarded link is not proof that the intended client visited.',
};

process.stdout.write(`${JSON.stringify(row, null, 2)}\n`);
process.stderr.write(
  '\nPersist this row in the PRIVATE invite registry API — never commit plaintext tokens to the public repo.\n',
);
