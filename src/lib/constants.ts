const MIN_CVM_SCORE = -500;
const MAX_CVM_SCORE = 500;
const MIN_TILE_ZOOM = 12;
const MAX_TILE_ZOOM = 18;

/**
 * The number of days a CVM is considered "recently reported" if a report is made.
 */
const RECENTLY_REPORTED_PERIOD = 7;

/**
 * The maximum number of CVMs a user can register per day.
 */
const MAX_REGISTRATIONS_PER_DAY = 5;

/**
 * The number of days that a user can not vote on a CVM again.
 */
const CVM_VOTE_DELAY = 7;

/**
 * The number of days that a user can not reposition a CVM again.
 */
const CVM_REPOSITION_DELAY = 7;

/**
 * The number of days that a user can not report on a CVM again.
 */
const CVM_REPORT_DELAY = 7;

/**
 * The radius in meters within a CVM can be repositioned.
 */
const NEARBY_REPOSITION_RADIUS = 0.025;

/**
 * The radius in meters where a CVM is considered "same" as another.
 */
const SAME_CVM_RADIUS = 50;

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
  CVM_REPOSITION_DELAY,
  NEARBY_REPOSITION_RADIUS,
  CVM_REPORT_DELAY,
  RECENTLY_REPORTED_PERIOD,
  MAX_REGISTRATIONS_PER_DAY,
};
