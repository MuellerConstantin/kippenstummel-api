import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isWithinServiceArea } from 'src/lib';

@ValidatorConstraint({ name: 'IsWithinServiceArea', async: false })
export class IsWithinServiceAreaConstraint
  implements ValidatorConstraintInterface
{
  /**
   * Checks the coordinate formed by the two sibling properties named in the
   * constraint arguments, as `[longitude, latitude]`.
   *
   * Neither half is the offending one — Paris falls outside on its longitude,
   * Rome on its latitude, and a swapped pair on both — so the constraint sits
   * on both properties and reads them off the object rather than validating
   * whichever value it happens to be attached to.
   *
   * The properties are named rather than assumed, so a payload carrying more
   * than one coordinate can constrain exactly the one that describes a machine:
   * a reposition also reports where the editor stands, and the coverage does
   * not apply to that.
   */
  validate(value: any, args: ValidationArguments) {
    const { longitude, latitude } =
      IsWithinServiceAreaConstraint.getCoordinate(args);

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return false;
    }

    return isWithinServiceArea(longitude, latitude);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return 'coordinate lies outside the covered service area';
  }

  private static getCoordinate(args: ValidationArguments): {
    longitude: unknown;
    latitude: unknown;
  } {
    const [longitudeProperty, latitudeProperty] = args.constraints as [
      string,
      string,
    ];
    const object = args.object as Record<string, unknown>;

    return {
      longitude: object[longitudeProperty],
      latitude: object[latitudeProperty],
    };
  }
}
