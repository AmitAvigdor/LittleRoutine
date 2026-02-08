import { describe, it, expect } from 'vitest';
import { convertWeight, convertLength, formatWeight, formatLength } from './growth';

describe('growth helpers', () => {
  it('converts weight between lbs and kg', () => {
    expect(convertWeight(10, 'lbs', 'kg')).toBeCloseTo(4.53592, 5);
    expect(convertWeight(10, 'kg', 'lbs')).toBeCloseTo(22.0462, 4);
    expect(convertWeight(10, 'lbs', 'lbs')).toBe(10);
  });

  it('converts length between in and cm', () => {
    expect(convertLength(10, 'in', 'cm')).toBeCloseTo(25.4, 4);
    expect(convertLength(10, 'cm', 'in')).toBeCloseTo(3.937, 3);
    expect(convertLength(10, 'cm', 'cm')).toBe(10);
  });

  it('formats weight for lbs and kg', () => {
    expect(formatWeight(10, 'lbs')).toBe('10 lbs');
    expect(formatWeight(10.5, 'lbs')).toBe('10 lbs 8 oz');
    expect(formatWeight(3.14159, 'kg')).toBe('3.14 kg');
  });

  it('formats length for inches and cm', () => {
    expect(formatLength(10, 'in')).toBe('10.0 in');
    expect(formatLength(10, 'cm')).toBe('10.0 cm');
  });
});
