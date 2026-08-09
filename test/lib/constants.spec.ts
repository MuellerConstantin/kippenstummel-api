import { constants } from 'src/lib';

const {
  getRegistrationCooldownByCredibility,
  getRegistrationLimitByCredibility,
  getRepositionCooldownByCredibility,
  getRepositionLimitByCredibility,
} = constants;

// All four rule tables use the same credibility bands, so the boundary cases
// are shared. Each band is checked at both of its edges.
describe('credibility rule tables', () => {
  describe('getRegistrationCooldownByCredibility', () => {
    it.each([
      [0, 90],
      [25, 90],
      [26, 60],
      [50, 60],
      [51, 10],
      [75, 10],
      [76, 5],
      [100, 5],
    ])('Should map credibility %i to %i minutes', (credibility, expected) => {
      expect(getRegistrationCooldownByCredibility(credibility)).toBe(expected);
    });
  });

  describe('getRegistrationLimitByCredibility', () => {
    it.each([
      [0, 1],
      [25, 1],
      [26, 3],
      [50, 3],
      [51, 5],
      [75, 5],
      [76, 8],
      [100, 8],
    ])(
      'Should map credibility %i to %i registrations per day',
      (credibility, expected) => {
        expect(getRegistrationLimitByCredibility(credibility)).toBe(expected);
      },
    );
  });

  describe('getRepositionCooldownByCredibility', () => {
    it.each([
      [0, 120],
      [25, 120],
      [26, 90],
      [50, 90],
      [51, 30],
      [75, 30],
      [76, 10],
      [100, 10],
    ])('Should map credibility %i to %i minutes', (credibility, expected) => {
      expect(getRepositionCooldownByCredibility(credibility)).toBe(expected);
    });
  });

  describe('getRepositionLimitByCredibility', () => {
    it.each([
      [0, 0],
      [25, 0],
      [26, 1],
      [50, 1],
      [51, 2],
      [75, 2],
      [76, 5],
      [100, 5],
    ])(
      'Should map credibility %i to %i repositions per day',
      (credibility, expected) => {
        expect(getRepositionLimitByCredibility(credibility)).toBe(expected);
      },
    );
  });

  it('Should grow monotonically in permissiveness across the bands', () => {
    const bands = [0, 26, 51, 76];

    const cooldowns = bands.map(getRegistrationCooldownByCredibility);
    const limits = bands.map(getRegistrationLimitByCredibility);

    expect(cooldowns).toEqual([...cooldowns].sort((a, b) => b - a));
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
  });
});

// The rule tables only cover whole numbers from 0 to 100. Anything else misses
// every band and falls through to the hardcoded default. These tests pin that
// behaviour — see the note in the suite below.
describe('credibility values outside the rule tables', () => {
  it.each([
    ['a fractional value between bands', 25.5],
    ['a negative value', -1],
    ['a value above the maximum', 101],
  ])('Should fall back to the defaults for %s', (_label, credibility) => {
    expect(getRegistrationCooldownByCredibility(credibility)).toBe(30);
    expect(getRegistrationLimitByCredibility(credibility)).toBe(1);
    expect(getRepositionCooldownByCredibility(credibility)).toBe(30);
    expect(getRepositionLimitByCredibility(credibility)).toBe(1);
  });

  // The fallback is more generous than the lowest band, so a credibility that
  // misses the table is rewarded rather than penalised. Documented here so the
  // day someone changes it, this test explains what used to happen.
  it('Should currently treat an off-table value better than the lowest band', () => {
    expect(getRepositionLimitByCredibility(25)).toBe(0);
    expect(getRepositionLimitByCredibility(25.5)).toBe(1);

    expect(getRegistrationCooldownByCredibility(25)).toBe(90);
    expect(getRegistrationCooldownByCredibility(25.5)).toBe(30);
  });
});
