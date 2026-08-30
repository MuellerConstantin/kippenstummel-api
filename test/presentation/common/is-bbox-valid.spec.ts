import { ValidationArguments } from 'class-validator';
import { IsBBoxValidConstraint } from 'src/presentation/common/controllers/dtos/validation/is-bbox-valid';

// The constraint reads the corners and the zoom off the sibling properties
// named in its arguments, so the value passed to validate() is irrelevant.
function check(bottomLeft: string, topRight: string, zoom: number): boolean {
  const constraint = new IsBBoxValidConstraint();
  const args = {
    object: { bottomLeft, topRight, zoom },
    constraints: ['bottomLeft', 'topRight', 'zoom'],
  } as unknown as ValidationArguments;

  return constraint.validate(null, args);
}

describe('IsBBoxValidConstraint', () => {
  it('Should read the viewport from the named properties', () => {
    const constraint = new IsBBoxValidConstraint();
    const args = {
      object: { swLeft: '48.0,8.0', neRight: '48.1,8.1', level: 12 },
      constraints: ['swLeft', 'neRight', 'level'],
    } as unknown as ValidationArguments;

    expect(constraint.validate(null, args)).toBe(true);
  });

  it('Should abstain when the viewport is not fully formed, leaving the format checks to report', () => {
    const constraint = new IsBBoxValidConstraint();
    const args = {
      object: {},
      constraints: ['bottomLeft', 'topRight', 'zoom'],
    } as unknown as ValidationArguments;

    expect(constraint.validate(null, args)).toBe(true);
  });

  // The edge budget is a viewport allowance in kilometres: 5 km at zoom 18,
  // doubling for every level zoomed out. Expressed in degrees of latitude for
  // the cases below, which all use a north-south edge.
  const maxEdge = (zoom: number) => (5 * Math.pow(2, 18 - zoom)) / 111.32;

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

    expect(check('48.0,8.0', `${48 + edge},8.01`, 10)).toBe(true);
  });

  it('Should reject a box just over the limit', () => {
    const edge = maxEdge(10) * 1.001;

    expect(check('48.0,8.0', `${48 + edge},8.01`, 10)).toBe(false);
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

  it('Should cap the box at a viewport sized area on the highest zoom level', () => {
    // ~4.5 km tall, within the 5 km budget at zoom 18.
    expect(check('48.0,8.0', '48.04,8.04', 18)).toBe(true);

    // ~56 km tall. Below the previous limit of 0.586 degrees, so this used to
    // be accepted, and is what made bulk extraction of the dataset cheap.
    expect(check('48.0,8.0', '48.5,8.5', 18)).toBe(false);
  });

  it('Should allow a wider span east to west than north to south', () => {
    // At 60 degrees north a degree of longitude covers roughly half of what a
    // degree of latitude covers, so the same budget permits twice the span.
    expect(check('60.0,10.0', '60.02,10.07', 18)).toBe(true);
    expect(check('60.0,10.0', '60.07,10.02', 18)).toBe(false);
  });
});
