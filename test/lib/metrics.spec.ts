import { calculateEwma } from 'src/lib';

describe('calculateEwma', () => {
  it('Should keep the previous value when alpha is zero', () => {
    expect(calculateEwma(10, 100, 0)).toBe(10);
  });

  it('Should take the current value when alpha is one', () => {
    expect(calculateEwma(10, 100, 1)).toBe(100);
  });

  it('Should land halfway when alpha is a half', () => {
    expect(calculateEwma(10, 20, 0.5)).toBe(15);
  });

  it('Should weight the current value by alpha', () => {
    // 0.2 * 100 + 0.8 * 50
    expect(calculateEwma(50, 100, 0.2)).toBeCloseTo(60, 10);
  });

  it('Should converge towards the current value on repeated application', () => {
    let ewma = 0;

    for (let i = 0; i < 100; i++) {
      ewma = calculateEwma(ewma, 10, 0.3);
    }

    expect(ewma).toBeCloseTo(10, 6);
  });

  it('Should stay put once previous and current agree', () => {
    expect(calculateEwma(42, 42, 0.37)).toBeCloseTo(42, 10);
  });

  it('Should handle negative values', () => {
    expect(calculateEwma(-10, -20, 0.5)).toBe(-15);
  });
});
