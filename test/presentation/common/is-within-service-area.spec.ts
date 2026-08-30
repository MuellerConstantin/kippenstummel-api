import { ValidationArguments } from 'class-validator';
import { IsWithinServiceAreaConstraint } from 'src/presentation/common/controllers/dtos/validation/is-within-service-area';

// The constraint reads the coordinate off the sibling properties named in its
// arguments, so the value passed to validate() is irrelevant — it sits on both
// halves of the pair and behaves identically on either.
function check(
  object: Record<string, unknown>,
  properties: [string, string] = ['longitude', 'latitude'],
): boolean {
  const constraint = new IsWithinServiceAreaConstraint();
  const args = {
    object,
    constraints: properties,
  } as unknown as ValidationArguments;

  return constraint.validate(null, args);
}

describe('IsWithinServiceAreaConstraint', () => {
  it('Should accept a coordinate inside the covered area', () => {
    expect(check({ longitude: 13.405, latitude: 52.52 })).toBe(true);
  });

  it('Should reject a coordinate outside the covered area', () => {
    expect(check({ longitude: 2.3522, latitude: 48.8566 })).toBe(false);
  });

  it('Should read the coordinate from the named properties', () => {
    const object = {
      repositionedLongitude: 13.405,
      repositionedLatitude: 52.52,
      editorLongitude: 2.3522,
      editorLatitude: 48.8566,
    };

    expect(
      check(object, ['repositionedLongitude', 'repositionedLatitude']),
    ).toBe(true);
    expect(check(object, ['editorLongitude', 'editorLatitude'])).toBe(false);
  });

  it('Should reject when either half is missing or not a number', () => {
    expect(check({ longitude: 13.405 })).toBe(false);
    expect(check({ latitude: 52.52 })).toBe(false);
    expect(check({ longitude: '13.405', latitude: 52.52 })).toBe(false);
  });
});
