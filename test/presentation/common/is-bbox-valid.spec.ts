import { ValidationArguments } from 'class-validator';
import { IsBBoxValidConstraint } from 'src/presentation/common/controllers/dtos/validation/is-bbox-valid';

// The constraint reads bottomLeft/topRight/zoom off the sibling properties of
// the validated object, so the value passed to validate() is irrelevant.
function check(bottomLeft: string, topRight: string, zoom: number): boolean {
  const constraint = new IsBBoxValidConstraint();
  const args = {
    object: { bottomLeft, topRight, zoom },
  } as unknown as ValidationArguments;

  return constraint.validate(null, args);
}

describe('IsBBoxValidConstraint', () => {
  // The limit is 360 * 0.7^zoom degrees per edge.
  const maxEdge = (zoom: number) => 360 * Math.pow(0.7, zoom);

  it('Should accept a box well inside the limit for its zoom level', () => {
    expect(check('48.0,8.0', '48.1,8.1', 12)).toBe(true);
  });

  it('Should reject a box wider than the limit', () => {
    const tooWide = maxEdge(12) * 2;

    expect(check('48.0,8.0', `48.01,${8.0 + tooWide}`, 12)).toBe(false);
  });

  it('Should reject a box taller than the limit', () => {
    const tooTall = maxEdge(12) * 2;

    expect(check('48.0,8.0', `${48.0 + tooTall},8.01`, 12)).toBe(false);
  });

  it('Should allow a box just under the limit', () => {
    // Not testing the exact boundary: the edge is reconstructed by subtracting
    // two decimal strings, so the comparison sits inside floating point noise.
    const edge = maxEdge(10) * 0.999;

    expect(check('48.0,8.0', `${48 + edge},${8 + edge}`, 10)).toBe(true);
  });

  it('Should reject a box just over the limit', () => {
    const edge = maxEdge(10) * 1.001;

    expect(check('48.0,8.0', `${48 + edge},${8 + edge}`, 10)).toBe(false);
  });

  it('Should grow stricter as the zoom level increases', () => {
    // A box that passes at zoom 8 must fail once you zoom far enough in.
    const box: [string, string] = ['48.0,8.0', '49.0,9.0'];

    expect(check(...box, 8)).toBe(true);
    expect(check(...box, 18)).toBe(false);
  });

  it('Should accept a degenerate box of zero size', () => {
    expect(check('48.0,8.0', '48.0,8.0', 18)).toBe(true);
  });

  it('Should accept an inverted box, since only the signed extent is checked', () => {
    // topRight south-west of bottomLeft yields negative width and height,
    // which are never greater than the limit. Documented, not endorsed.
    expect(check('49.0,9.0', '48.0,8.0', 18)).toBe(true);
  });
});
