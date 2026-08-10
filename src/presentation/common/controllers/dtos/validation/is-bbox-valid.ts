import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { constants } from 'src/lib';

@ValidatorConstraint({ name: 'IsBBoxValid', async: false })
export class IsBBoxValidConstraint implements ValidatorConstraintInterface {
  validate(obj: any, args: ValidationArguments) {
    const { zoom } = args.object as { zoom: number };
    const bottomLeftCoordinates =
      IsBBoxValidConstraint.getBottomLeftCoordinates(args.object);
    const topRightCoordinates = IsBBoxValidConstraint.getTopRightCoordinates(
      args.object,
    );

    return IsBBoxValidConstraint.isValidBBox(
      bottomLeftCoordinates,
      topRightCoordinates,
      zoom,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return 'bounding box size is too big for the zoom level';
  }

  private static getBottomLeftCoordinates(obj: any): [number, number] {
    const { bottomLeft } = obj as { bottomLeft: string };
    const [latitude, longitude] = bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  private static getTopRightCoordinates(obj: any): [number, number] {
    const { topRight } = obj as { topRight: string };
    const [latitude, longitude] = topRight.split(',').map(Number);
    return [longitude, latitude];
  }

  /**
   * Checks if the bounding box size is valid depending on the zoom level.
   *
   * @param bottomLeft Coordinates of the bottom left corner
   * @param topRight Coordinates of the top right corner
   * @param zoom Current zoom level
   * @returns True if the Bounding Box is valid, false otherwise
   */
  private static isValidBBox(
    bottomLeft: [number, number],
    topRight: [number, number],
    zoom: number,
  ): boolean {
    const bbox = {
      north: topRight[1],
      south: bottomLeft[1],
      east: topRight[0],
      west: bottomLeft[0],
    };

    const maxEdgeKm =
      constants.MAX_VIEWPORT_EDGE_KM *
      Math.pow(2, constants.MAX_TILE_ZOOM - zoom);

    /*
     * A degree of longitude covers less ground the further it sits from the
     * equator, so the edge of the box closest to the equator is the one where
     * it spans the most kilometres. Deriving the conversion from that edge
     * keeps the widest part of the box within budget.
     */
    const referenceLatitude = Math.min(
      Math.abs(bbox.north),
      Math.abs(bbox.south),
    );
    const kmPerDegreeLongitude =
      constants.KM_PER_DEGREE_LATITUDE *
      Math.cos((referenceLatitude * Math.PI) / 180);

    const widthKm = (bbox.east - bbox.west) * kmPerDegreeLongitude;
    const heightKm =
      (bbox.north - bbox.south) * constants.KM_PER_DEGREE_LATITUDE;

    if (widthKm > maxEdgeKm || heightKm > maxEdgeKm) {
      return false;
    }

    return true;
  }
}
