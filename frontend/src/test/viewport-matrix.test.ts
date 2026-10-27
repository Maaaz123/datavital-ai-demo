import { describe, it, expect } from 'vitest';
import { testViewports } from '@/design-system/breakpoints';

describe('viewport test matrix', () => {
  it('every preset defines width and height', () => {
    for (const viewport of testViewports) {
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
      expect(typeof viewport.width).toBe('number');
      expect(typeof viewport.height).toBe('number');
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
    }
  });

  it('documents the viewport matrix for CI', () => {
    expect(testViewports).toMatchSnapshot();
  });
});
