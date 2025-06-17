import { calculateEwma } from './metrics';

export interface BehaviourInfo {
  credibility: number;
  issuedAt: Date;
  lastInteractionAt?: Date;
  averageInteractionInterval: number;
  lastInteractionPosition?: { longitude: number; latitude: number };
  unrealisticMovementCount: number;
  voting: {
    totalCount: number;
    upvoteCount: number;
    downvoteCount: number;
    lastVotedAt?: Date;
    averageVotingInterval: number;
  };
  registration: {
    totalCount: number;
    lastRegistrationAt?: Date;
    averageRegistrationInterval: number;
  };
}

export function computeCredibility(
  info: BehaviourInfo,
  trace?: Map<string, number>,
): number {
  const rules = new Map<string, (info: BehaviourInfo) => number>();
  let score: number = 100;

  rules.set(
    'unrealisticMovementCountPenalty',
    evalUnrealisticMovementCountPenalty,
  );
  rules.set('interactionFrequencyPenalty', evalInteractionFrequencyPenalty);
  rules.set('votingBiasPenalty', evalVotingBiasPenalty);
  rules.set('noVotePenalty', evalNoVotePenalty);
  rules.set('registrationAbusePenalty', evalRegistrationAbusePenalty);
  rules.set('votingAbusePenalty', evalVotingAbusePenalty);
  rules.set('inactivePenalty', evalInactivePenalty);
  rules.set('identityAgePenalty', evalIdentityAgePenalty);
  rules.set(
    'unrealisticVotingBehaviourPenalty',
    evalUnrealisticVotingBehaviourPenalty,
  );
  rules.set(
    'unrealisticRegistrationBehaviourPenalty',
    evalUnrealisticRegistrationBehaviourPenalty,
  );

  for (const [ruleName, rule] of rules) {
    const delta = rule(info);
    score += delta;

    if (trace) {
      trace.set(ruleName, delta);
    }
  }

  // Normalize final score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Smoothes the score to reduce the impact of outliers
  if (info.credibility > 0) {
    score = Math.round(calculateEwma(score, info.credibility, 0.4));
  }

  return score;
}

export function evalUnrealisticMovementCountPenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 40;
  const count = info.unrealisticMovementCount;
  return -Math.min(Math.round(Math.pow(count, 2)), MAX_PENALTY);
}

export function evalInteractionFrequencyPenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 25;
  const INTERVAL_LIMIT = 1000 * 60 * 60 * 24; // 1 day

  const identityAgeMinutes = (Date.now() - info.issuedAt.getTime()) / 1000 / 60;

  /*
   * Using logistic growth, the penalty is weighted with the age of the identity
   * in order not to unnecessarily penalize new identities for shorter interaction
   * intervals.
   *
   * The logistic function starts near 0 for very new identities, gradually increases,
   * and approaches 1 as the identity gets older. This ensures that penalties for
   * suspicious behavior (like rapid interactions) are minimal during the early phase
   * of an identity's lifetime.
   *
   * The constant 60 represents the inflection point of the curve (in minutes),
   * where the logistic weight is 0.5 — meaning the penalty is applied at half strength
   * when the identity is 30 minutes old. After that, the penalty impact grows rapidly.
   */

  const logisticWeight = 1 / (1 + Math.exp(-0.2 * (identityAgeMinutes - 60)));

  const penalty = penaltyForAverageInterval(
    info.averageInteractionInterval,
    info.voting.totalCount + info.registration.totalCount,
    INTERVAL_LIMIT,
    MAX_PENALTY,
  );

  return -Math.round(logisticWeight * penalty);
}

export function evalVotingBiasPenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 20;

  if (info.voting.totalCount < 10) return 0;

  const ratio = info.voting.upvoteCount / info.voting.totalCount;
  const bias = Math.abs(0.5 - ratio);

  return -Math.round(Math.pow(bias * 2, 2) * MAX_PENALTY);
}

export function evalNoVotePenalty(info: BehaviourInfo) {
  if (info.registration.totalCount >= 5 && info.voting.totalCount === 0) {
    const excess = info.registration.totalCount - 5;
    return -15 - Math.min(excess * 2, 10);
  }

  return 0;
}

export function evalRegistrationAbusePenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 20;
  const INTERVAL_LIMIT = 5 * 60 * 1000; // 5 minutes

  const identityAgeMinutes = (Date.now() - info.issuedAt.getTime()) / 1000 / 60;

  /*
   * Using logistic growth, the penalty is weighted with the age of the identity
   * in order not to unnecessarily penalize new identities for shorter interaction
   * intervals.
   *
   * The logistic function starts near 0 for very new identities, gradually increases,
   * and approaches 1 as the identity gets older. This ensures that penalties for
   * suspicious behavior (like rapid interactions) are minimal during the early phase
   * of an identity's lifetime.
   *
   * The constant 15 represents the inflection point of the curve (in minutes),
   * where the logistic weight is 0.5 — meaning the penalty is applied at half strength
   * when the identity is 30 minutes old. After that, the penalty impact grows rapidly.
   */

  const logisticWeight = 1 / (1 + Math.exp(-0.2 * (identityAgeMinutes - 15)));

  const penalty = penaltyForAverageInterval(
    info.registration.averageRegistrationInterval,
    info.registration.totalCount,
    INTERVAL_LIMIT,
    MAX_PENALTY,
  );

  return -Math.round(logisticWeight * penalty);
}

export function evalVotingAbusePenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 20;
  const INTERVAL_LIMIT = 5 * 60 * 1000; // 5 minutes

  const identityAgeMinutes = (Date.now() - info.issuedAt.getTime()) / 1000 / 60;

  /*
   * Using logistic growth, the penalty is weighted with the age of the identity
   * in order not to unnecessarily penalize new identities for shorter interaction
   * intervals.
   *
   * The logistic function starts near 0 for very new identities, gradually increases,
   * and approaches 1 as the identity gets older. This ensures that penalties for
   * suspicious behavior (like rapid interactions) are minimal during the early phase
   * of an identity's lifetime.
   *
   * The constant 15 represents the inflection point of the curve (in minutes),
   * where the logistic weight is 0.5 — meaning the penalty is applied at half strength
   * when the identity is 30 minutes old. After that, the penalty impact grows rapidly.
   */

  const logisticWeight = 1 / (1 + Math.exp(-0.2 * (identityAgeMinutes - 15)));

  const penalty = penaltyForAverageInterval(
    info.voting.averageVotingInterval,
    info.voting.totalCount,
    INTERVAL_LIMIT,
    MAX_PENALTY,
  );

  return -Math.round(logisticWeight * penalty);
}

export function evalInactivePenalty(info: BehaviourInfo) {
  const total = info.voting.totalCount + info.registration.totalCount;

  if (total >= 5) return 0;
  return -Math.round((5 - total) * 2);
}

export function evalIdentityAgePenalty(info: BehaviourInfo) {
  const ageMs = Date.now() - info.issuedAt.getTime();
  const DAY = 24 * 60 * 60 * 1000;

  if (ageMs >= 28 * DAY) {
    // Since the 28th day, no penalty
    return 0;
  } else if (ageMs <= 2 * DAY) {
    // Linear penalty between 30 and 40 for the first 2 days
    const ratio = ageMs / (2 * DAY);
    return -Math.round((1 - ratio) * 30 + 10);
  } else {
    // Up to the 28th day linearly decreasing from -10 to 0
    const ratio = (ageMs - 2 * DAY) / (26 * DAY);
    return -Math.round((1 - ratio) * 10);
  }
}

export function evalUnrealisticVotingBehaviourPenalty(info: BehaviourInfo) {
  const ageInDaysRaw =
    (Date.now() - info.issuedAt?.getTime?.()) / (1000 * 60 * 60 * 24);

  const issuedNDaysAgo = Math.max(ageInDaysRaw, 1);

  const averageVotesPerDay = info.voting.totalCount / issuedNDaysAgo;

  if (averageVotesPerDay < 0.5) return 0;

  return -Math.round(Math.pow(averageVotesPerDay, 2) * 10);
}

export function evalUnrealisticRegistrationBehaviourPenalty(
  info: BehaviourInfo,
) {
  const ageInDaysRaw =
    (Date.now() - info.issuedAt?.getTime?.()) / (1000 * 60 * 60 * 24);

  const issuedNDaysAgo = Math.max(ageInDaysRaw, 1);

  const averageRegistrationsPerDay =
    info.registration.totalCount / issuedNDaysAgo;

  if (averageRegistrationsPerDay < 0.25) return 0;

  return -Math.round(Math.pow(averageRegistrationsPerDay, 2) * 10);
}

/**
 * Calculates a behavioral penalty based on how frequently a user interacts.
 *
 * The penalty increases when the average interaction interval is shorter than a defined minimum.
 * It is scaled logarithmically by the number of interactions to ensure more reliable patterns
 * receive stronger penalties, and avoids penalizing users with too few interactions.
 *
 * @param interval - Average time between interactions.
 * @param count - Total number of interactions recorded.
 * @param minInterval - Minimum reasonable interval between actions before it is considered suspicious.
 * @param penaltyCap - Maximum possible penalty.
 * @returns A penalty score between 0 and `penaltyCap`.
 */
function penaltyForAverageInterval(
  interval: number,
  count: number,
  minInterval: number,
  penaltyCap: number,
): number {
  // Avoid penalizing users with too few data points (unreliable pattern)
  if (count < 5) return 0;

  /*
   * Determine severity based on how much the average interval falls below the minimum.
   * If interval >= minInterval, severity is 0 (no penalty); if interval is very short,
   * severity approaches 1.
   */
  const severity = Math.max(0, 1 - interval / minInterval);

  /*
   * Logarithmic scaling: more interactions strengthen the confidence in the user's
   * behavior pattern. Scales from 0 to 1, capping at 50 interactions.
   */
  const scaling = Math.min(1, Math.log(count + 1) / Math.log(50));

  // Final penalty is a product of severity, scaling, and the configured penalty cap
  return Math.round(penaltyCap * severity * scaling);
}
