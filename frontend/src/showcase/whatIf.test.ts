import { describe, expect, it } from 'vitest';
import { answerQuestion } from './assistant';
import { scenarioFor } from './facts';
import { parseWhatIfIntent, runWhatIf } from './whatIf';

describe('illustrative what-if scenarios', () => {
  it('parses domain what-if intents without inventing live models', () => {
    expect(parseWhatIfIntent('What could happen if patient arrivals increase by 15%')?.kind).toBe('ed-arrivals-up');
    expect(parseWhatIfIntent('What happens if five blocked beds become available')?.kind).toBe('beds-unblock-5');
    expect(parseWhatIfIntent('What would happen if prolonged stays decreased by 10%')?.kind).toBe('ipd-longstay-down');
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
  });

  it('does not mix Beds answers into Emergency', () => {
    const answer = answerQuestion('Which wards have the greatest capacity pressure?', 'H1', 2026, 'Emergency');
    expect(answer.title).toMatch(/Outside Emergency|Emergency/i);
    expect(answer.observation + answer.evidence).not.toMatch(/Operational occupancy/i);
  });
});
