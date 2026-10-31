import { writeFileSync } from 'fs';
import { listMetrics } from '../src/core/enterpriseAi/metricRegistry.ts';

const metrics = listMetrics();
const rows = metrics.map((m) => ({
  id: m.id,
  name: m.name,
  owningDomain: m.owningDomain,
  grain: m.grain,
  numerator: m.numerator,
  denominator: m.denominator,
  unit: m.unit,
  periodSemantics: m.periodSemantics,
  aggregation: m.aggregation,
  dataReadiness: m.dataReadiness,
  qualityNotes: m.qualityNotes.replace(/\n/g, ' '),
}));
const header = Object.keys(rows[0]).join(',');
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [header, ...rows.map((r) => Object.values(r).map(esc).join(','))].join('\n');
writeFileSync('../docs/data-dictionary/enterprise-ai-data-dictionary.csv', csv);
writeFileSync(
  '../docs/data-dictionary/enterprise-ai-data-dictionary.json',
  JSON.stringify({ domain: 'Enterprise AI', count: rows.length, metrics: rows }, null, 2),
);
console.log('wrote', rows.length);
