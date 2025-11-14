const MIN_CVM_SCORE = -10;
const MAX_CVM_SCORE = 10;
const DEFAULT_CVM_VOTE_IMPACT = 1;
const MIN_TILE_ZOOM = 8;
const MAX_TILE_ZOOM = 18;
const DYNAMIC_CLUSTERING_ZOOM_LIMIT = 12;

/**
 * Rules for the registration cooldown period in minutes based on credibility.
 */
const REGISTRATION_COOLDOWN_RULES: {
  max: number;
  min: number;
  period: number;
}[] = [
  { min: 0, max: 25, period: 90 },
  { min: 26, max: 50, period: 60 },
  { min: 51, max: 75, period: 10 },
  { min: 76, max: 100, period: 5 },
];

/**
 * Retrieves the registration cooldown period in minutes based on credibility.
 *
 * @param credibility The credibility of the user.
 * @returns The registration cooldown period in minutes.
 */
function getRegistrationCooldownByCredibility(credibility: number) {
  return (
    REGISTRATION_COOLDOWN_RULES.find(
      (rule) => credibility >= rule.min && credibility <= rule.max,
    )?.period ?? 30
  );
}

/**
 * Rules for the registration limit per day based on credibility.
 */
const REGISTRATION_LIMIT_RULES: {
  max: number;
  min: number;
  count: number;
}[] = [
  { min: 0, max: 25, count: 1 },
  { min: 26, max: 50, count: 3 },
  { min: 51, max: 75, count: 5 },
  { min: 76, max: 100, count: 8 },
];

/**
 * Retrieves the registration limit per day based on credibility.
 *
 * @param credibility The credibility of the user.
 * @returns The registration limit per day.
 */
function getRegistrationLimitByCredibility(credibility: number) {
  return (
    REGISTRATION_LIMIT_RULES.find(
      (rule) => credibility >= rule.min && credibility <= rule.max,
    )?.count ?? 1
  );
}

/**
 * Rules for the reposition cooldown period in minutes based on credibility.
 */
const REPOSITION_COOLDOWN_RULES: {
  max: number;
  min: number;
  period: number;
}[] = [
  { min: 0, max: 25, period: 120 },
  { min: 26, max: 50, period: 90 },
  { min: 51, max: 75, period: 30 },
  { min: 76, max: 100, period: 10 },
];

/**
 * Retrieves the reposition cooldown period in minutes based on credibility.
 *
 * @param credibility The credibility of the user.
 * @returns The registration cooldown period in minutes.
 */
function getRepositionCooldownByCredibility(credibility: number) {
  return (
    REPOSITION_COOLDOWN_RULES.find(
      (rule) => credibility >= rule.min && credibility <= rule.max,
    )?.period ?? 30
  );
}

/**
 * Rules for the reposition limit per day based on credibility.
 */
const REPOSITION_LIMIT_RULES: {
  max: number;
  min: number;
  count: number;
}[] = [
  { min: 0, max: 25, count: 0 },
  { min: 26, max: 50, count: 1 },
  { min: 51, max: 75, count: 2 },
  { min: 76, max: 100, count: 5 },
];

/**
 * Retrieves the reposition limit per day based on credibility.
 *
 * @param credibility The credibility of the user.
 * @returns The registration limit per day.
 */
function getRepositionLimitByCredibility(credibility: number) {
  return (
    REPOSITION_LIMIT_RULES.find(
      (rule) => credibility >= rule.min && credibility <= rule.max,
    )?.count ?? 1
  );
}

/**
 * The number of days a CVM is considered "recently reported" if a report is made.
 */
const RECENTLY_REPORTED_PERIOD = 7;

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
const NEARBY_CVM_RADIUS = 0.05;

/**
 * The number of days a CVM with a negative score must remain below the threshold to be deleted.
 */
const CVM_SCORE_BELOW_DELETE_THRESHOLD_PERIOD = 7;

export {
  DEFAULT_CVM_VOTE_IMPACT,
  MIN_CVM_SCORE,
  MAX_CVM_SCORE,
  MIN_TILE_ZOOM,
  MAX_TILE_ZOOM,
  DYNAMIC_CLUSTERING_ZOOM_LIMIT,
  SAME_CVM_RADIUS,
  NEARBY_CVM_RADIUS,
  CVM_VOTE_DELAY,
  CVM_REPOSITION_DELAY,
  NEARBY_REPOSITION_RADIUS,
  CVM_REPORT_DELAY,
  RECENTLY_REPORTED_PERIOD,
  CVM_SCORE_BELOW_DELETE_THRESHOLD_PERIOD,
  getRegistrationCooldownByCredibility,
  getRegistrationLimitByCredibility,
  getRepositionCooldownByCredibility,
  getRepositionLimitByCredibility,
};
