import { describe, expect, it } from 'vitest';
import { HOSPITALS, YEARS } from '@/showcase/engine';
import { scenarioFor } from '@/showcase/facts';
import { acuityByPeriod, arrivalHeatmap, arrivalModes, arrivalsByDay, arrivalsByHour, boardingCount, denialReasons, monthlyBoarding, receivableAging, staffingByService, theatres, waitBins, wards } from './derived';

describe('derived allocations', () => {
  it('keeps every allocation inside the hospital total', () => {
    for (const hospital of HOSPITALS) {
      for (const year of YEARS) {
        const fact = scenarioFor(hospital.code, year).focus;
        expect(arrivalsByHour(hospital.code, year).reduce((sum, value) => sum + value, 0)).toBe(fact.edArrivals);
        expect(arrivalHeatmap(hospital.code, year).flat().reduce((sum, value) => sum + value, 0)).toBe(fact.edArrivals);
        const ward = wards(hospital.code, year);
        expect(ward.reduce((sum, item) => sum + item.staffed, 0)).toBe(fact.staffedBeds);
        expect(ward.reduce((sum, item) => sum + item.occupied, 0)).toBe(fact.occupiedBeds);
        expect(ward.reduce((sum, item) => sum + item.blocked, 0)).toBe(fact.blockedBeds);
        expect(ward.reduce((sum, item) => sum + item.available, 0)).toBe(fact.availableBeds);
        expect(ward.every((item) => item.occupied + item.available + item.blocked === item.staffed)).toBe(true);
        expect(theatres(hospital.code, year).reduce((sum, item) => sum + item.completed, 0)).toBe(fact.surgCompleted);
        expect(denialReasons(hospital.code, year).reduce((sum, item) => sum + item.count, 0)).toBe(fact.claimsDenied);
        expect(receivableAging(hospital.code, year).reduce((sum, item) => sum + item.amount, 0)).toBe(fact.outstanding);
        expect(waitBins(hospital.code, year).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
        const staff = staffingByService(hospital.code, year);
        expect(staff.reduce((sum, item) => sum + item.required, 0)).toBe(Math.round(fact.requiredFte));
        expect(staff.reduce((sum, item) => sum + item.filled, 0)).toBe(Math.round(fact.filledFte));
        expect(arrivalsByDay(hospital.code, year).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
        expect(arrivalModes(hospital.code, year).reduce((sum, item) => sum + item.count, 0)).toBe(fact.edArrivals);
        expect(acuityByPeriod(hospital.code, year).flatMap((item) => item.values).reduce((sum, value) => sum + value, 0)).toBe(fact.edArrivals);
        expect(monthlyBoarding(hospital.code, year).reduce((sum, value) => sum + value, 0)).toBe(boardingCount(hospital.code, year));
      }
    }
  });
});
