export interface BehaviourInfo {
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
  registrations: {
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

  return score;
}

export function evalUnrealisticMovementCountPenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 40;
  const count = info.unrealisticMovementCount;
  return -Math.min(Math.round(Math.pow(count, 2)), MAX_PENALTY);
}

export function evalInteractionFrequencyPenalty(info: BehaviourInfo) {
  const interval = info.averageInteractionInterval;
  const MAX_PENALTY = 25;
  const MIN_INTERVAL = 5 * 1000; // 5 seconds
  const MAX_INTERVAL = 3 * 60 * 1000; // 3 minutes

  // Requires at least two staggered interactions
  if (interval === 0) return 0;

  if (interval < MIN_INTERVAL) return -MAX_PENALTY;

  if (interval >= MAX_INTERVAL) return 0;

  const ratio = (MAX_INTERVAL - interval) / (MAX_INTERVAL - MIN_INTERVAL);
  return -Math.round(ratio * MAX_PENALTY);
}

export function evalVotingBiasPenalty(info: BehaviourInfo) {
  const MAX_PENALTY = 20;

  if (info.voting.totalCount < 10) return 0;

  const ratio = info.voting.upvoteCount / info.voting.totalCount;
  const bias = Math.abs(0.5 - ratio);

  return -Math.round(Math.pow(bias * 2, 2) * MAX_PENALTY);
}

export function evalNoVotePenalty(info: BehaviourInfo) {
  if (info.registrations.totalCount >= 5 && info.voting.totalCount === 0) {
    const excess = info.registrations.totalCount - 5;
    return -15 - Math.min(excess * 2, 10);
  }

  return 0;
}

export function evalRegistrationAbusePenalty(info: BehaviourInfo) {
  return -penaltyForAverageInterval(
    info.registrations.averageRegistrationInterval,
    info.registrations.totalCount,
    5 * 60 * 1000,
    20,
  );
}

export function evalVotingAbusePenalty(info: BehaviourInfo) {
  return -penaltyForAverageInterval(
    info.voting.averageVotingInterval,
    info.voting.totalCount,
    5 * 60 * 1000,
    20,
  );
}

export function evalInactivePenalty(info: BehaviourInfo) {
  const total = info.voting.totalCount + info.registrations.totalCount;

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

export function penaltyForAverageInterval(
  interval: number,
  count: number,
  minInterval: number,
  penaltyCap: number,
): number {
  if (count < 5) return 0;
  const severity = Math.max(0, 1 - interval / minInterval);
  const scaling = Math.min(1, Math.log(count + 1) / Math.log(50));
  return Math.round(penaltyCap * severity * scaling);
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
    info.registrations.totalCount / issuedNDaysAgo;

  if (averageRegistrationsPerDay < 0.25) return 0;

  return -Math.round(Math.pow(averageRegistrationsPerDay, 2) * 10);
}
