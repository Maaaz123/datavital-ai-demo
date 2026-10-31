import { describe, expect, it } from 'vitest';
import { answerQuestion } from './assistant';
import { scenarioFor } from './facts';
import { parseWhatIfIntent, runWhatIf } from './whatIf';

describe('illustrative what-if scenarios', () => {
  it('parses domain what-if intents without inventing live models', () => {
    expect(parseWhatIfIntent('What could happen if patient arrivals increase by 15%')?.kind).toBe('ed-arrivals-up');
    expect(parseWhatIfIntent('What happens if five blocked beds become available')?.kind).toBe('beds-unblock-5');
    expect(parseWhatIfIntent('What would happen if prolonged stays decreased by 10%')?.kind).toBe('ipd-longstay-down');
    expect(parseWhatIfIntent('What could happen if outpatient arrivals increase by 15%')?.kind).toBe('opd-demand-up');
    expect(parseWhatIfIntent('What if median waiting time fell by 20% for outpatient clinics')?.kind).toBe('opd-wait-down');
    expect(parseWhatIfIntent('Why is emergency waiting time increasing')).toBeNull();
  });

  it('keeps bed unblock math inside the staffed identity', () => {
    const fact = scenarioFor('H1', 2026).focus;
    const result = runWhatIf('Beds', 'H1', 2026, { kind: 'beds-unblock-5', amount: 5 });
    expect(result.estimated).toMatch(/Vacant/);
    expect(result.assumptions).toMatch(/Illustrative|demonstration|assum/i);
    expect(fact.occupiedBeds + fact.availableBeds + fact.blockedBeds).toBe(fact.staffedBeds);
    expect(result.current).toContain(String(fact.availableBeds));
  });

  it('answers what-if questions with the selected hospital figures', () => {
    const ed = answerQuestion('What could happen if patient arrivals increase by 15%?', 'H1', 2026, 'Emergency');
    expect(ed.title).toMatch(/Arrival demand increase|15%/i);
    expect(ed.observation).toMatch(/Current scenario/);
    expect(ed.outcome).toMatch(/Illustrative|Not a validated forecast/i);

    const beds = answerQuestion('What happens if five blocked beds become available?', 'H1', 2026, 'Beds');
    expect(beds.evidence).toMatch(/Estimated outcome/i);
    expect(beds.role).toMatch(/Bed management/i);

    const ipd = answerQuestion('What would happen if prolonged stays decreased by 10%?', 'H1', 2026, 'Inpatient');
    expect(ipd.action).toMatch(/Management implication|long-stay|specialty/i);

    const opd = answerQuestion('What could happen if outpatient arrivals increase by 15%?', 'H1', 2026, 'Outpatient');
    expect(opd.title).toMatch(/Outpatient demand|15%/i);
    expect(opd.outcome).toMatch(/Illustrative|Not a validated forecast/i);
    expect(opd.role).toMatch(/Outpatient operations/i);
  });

  it('does not mix Beds answers into Emergency', () => {
    const answer = answerQuestion('Which wards have the greatest capacity pressure?', 'H1', 2026, 'Emergency');
    expect(answer.title).toMatch(/Outside Emergency|Emergency/i);
    expect(answer.observation + answer.evidence).not.toMatch(/Operational occupancy/i);
  });

  it('keeps Emergency boarding outside Outpatient answers', () => {
    const answer = answerQuestion('How many visits are boarding beyond 4 hours?', 'H1', 2026, 'Outpatient');
    expect(answer.title).toMatch(/Outside Outpatient|Outpatient/i);
    expect(answer.observation + answer.evidence).not.toMatch(/boarding beyond 4 hours/i);
  });

  it('runs enterprise ED congestion scenario comparing ≥2 interventions without summing benefits', () => {
    const intent = parseWhatIfIntent(
      'What if ED congestion is relieved by faster bed assignment versus ICU staffing uplift under financial constraints?',
    );
    expect(intent?.kind).toBe('ent-ed-congestion');
    const result = runWhatIf('Enterprise', 'H1', 2026, intent, 'year');
    expect(result.id).toBe('ent-ed-congestion');
    expect(result.change).toMatch(/Compare two|A\)|B\)/i);
    expect(result.assumptions).toMatch(/must not be summed|not summed/i);
    expect(result.assumptions).toMatch(/does not mutate|Approval does not mutate/i);
    expect(result.estimated).toMatch(/A\)|B\)/);
    expect(result.followUp).toMatch(/ED|occupancy|ICU|contribution/i);

    const a = runWhatIf('Enterprise', 'H1', 2026, { kind: 'ent-ed-congestion', amount: 0.15 }, 'year');
    const b = runWhatIf('Enterprise', 'H1', 2026, { kind: 'ent-ed-congestion', amount: 0.35 }, 'year');
    expect(a.estimated).not.toBe(b.estimated);
  });

  it('grounds Enterprise Assist in hospital/year/period financial and staffing facts', () => {
    const fin = answerQuestion('What is driving net revenue and contribution?', 'H1', 2026, 'Enterprise', 'en', 'year');
    expect(fin.observation).toMatch(/Net patient revenue|NPR|contribution/i);
    expect(fin.evidence).toMatch(/RCM|recognized/i);

    const staff = answerQuestion('What is driving increasing staffing pressure in ICU?', 'H2', 2025, 'Enterprise', 'en', 'Q1');
    expect(staff.observation).toMatch(/ICU|enterprise Strategy gap/i);
    expect(staff.title).toMatch(/2025|Q1|staffing/i);
  });
});
