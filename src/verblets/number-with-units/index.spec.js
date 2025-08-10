import { describe, expect, it, vi } from 'vitest';

import numberWithUnits from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) {
      return { value: 29029, unit: 'feet' };
    }
    if (/speed of light/.test(text)) {
      return { value: 299792458, unit: 'meters per second' };
    }
    if (/temperature/.test(text)) {
      return { value: 98.6, unit: 'Fahrenheit' };
    }
    return { value: undefined, unit: undefined };
  }),
}));

describe('numberWithUnits', () => {
  describe('with valid input', () => {
    it('should extract height measurement from geographic question', async () => {
      const result = await numberWithUnits('What is the height of Everest in feet');
      expect(result?.value).toBe(29029);
      expect(result?.unit).toBe('feet');
    });

    it('should extract speed measurement from physics question', async () => {
      const result = await numberWithUnits('What is the speed of light in meters per second');
      expect(result?.value).toBe(299792458);
      expect(result?.unit).toBe('meters per second');
    });

    it('should extract temperature measurement from medical question', async () => {
      const result = await numberWithUnits('What is normal body temperature in Fahrenheit');
      expect(result?.value).toBe(98.6);
      expect(result?.unit).toBe('Fahrenheit');
    });
  });

  // describe('edge cases', () => {
  //   it('should handle unanswerable questions gracefully', async () => {
  //     const result = await numberWithUnits('What is my age in years');
  //     expect(result?.value).toBeUndefined();
  //     expect(result?.unit).toBeUndefined();
  //   });

  //   it('should handle questions without specific units', async () => {
  //     const result = await numberWithUnits('How tall is Mount Everest');
  //     expect(result?.value).toBeUndefined();
  //     expect(result?.unit).toBeUndefined();
  //   });
  // });
});
