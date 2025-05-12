const MIN_CVM_SCORE = -500;
const MAX_CVM_SCORE = 500;
const MIN_TILE_ZOOM = 12;
const MAX_TILE_ZOOM = 18;
const CVM_VOTE_DELAY = 1_209_600;

/**
 * The radius in meters where a CVM is considered "same" as another.
 */
const SAME_CVM_RADIUS = 10;

/**
 * The radius in kilometers where a CVM is considered "nearby" to an user.
 */
const NEARBY_CVM_RADIUS = 0.5;

export {
  MIN_CVM_SCORE,
  MAX_CVM_SCORE,
  MIN_TILE_ZOOM,
  MAX_TILE_ZOOM,
  SAME_CVM_RADIUS,
  NEARBY_CVM_RADIUS,
  CVM_VOTE_DELAY,
};
