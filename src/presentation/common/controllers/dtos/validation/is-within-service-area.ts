import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  isValidLatitude,
  isValidLongitude,
  isWithinServiceArea,
} from 'src/lib';

@ValidatorConstraint({ name: 'IsWithinServiceArea', async: false })
export class IsWithinServiceAreaConstraint
  implements ValidatorConstraintInterface
{
  /**
   * Checks the coordinate formed by the two sibling properties named in the
   * constraint arguments, as `[longitude, latitude]`.
   *
   * Neither half is invalid on its own — only the pair can fall outside — so
   * the constraint sits on both properties and reads them off the object
   * rather than validating whichever value it happens to be attached to.
   *
   * The properties are named rather than assumed because a payload may carry
   * more than one coordinate, and only the one describing a machine is
   * constrained.
   *
   * A pair that is not a coordinate at all passes here: the coverage has
   * nothing to say about it, and reporting it as out of area would mask the
   * format error that actually describes the problem.
   */
  validate(value: any, args: ValidationArguments) {
    const { longitude, latitude } =
      IsWithinServiceAreaConstraint.getCoordinate(args);

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      !isValidLongitude(longitude) ||
      !isValidLatitude(latitude)
    ) {
      return true;
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
