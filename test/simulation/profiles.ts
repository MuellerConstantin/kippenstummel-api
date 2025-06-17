import * as crypto from 'crypto';
import { BehaviourInfo } from 'src/lib/credibility';

function nowMinusDays(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function nowMinusMinutes(mins: number): number {
  return Date.now() - mins * 60 * 1000;
}

function randomPositionNearby(
  base: { lat: number; lon: number },
  kmRadius: number,
) {
  const dx = (Math.random() - 0.5) * (kmRadius / 111);
  const dy = (Math.random() - 0.5) * (kmRadius / 111);
  return {
    latitude: base.lat + dx,
    longitude: base.lon + dy,
  };
}

function randomPositionWorldwide() {
  return {
    latitude: -90 + Math.random() * 180,
    longitude: -180 + Math.random() * 360,
  };
}

export function generateNormalBehaviour(): BehaviourInfo {
  const issuedNDaysAgo = crypto.randomInt(14, 1000);
  const issuedAt = nowMinusDays(issuedNDaysAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(10, 30) / 100;
  const voteInteractions = Math.round(
    voteInteractionAveragePerDay * issuedNDaysAgo,
  );

  const voteRatio = crypto.randomInt(40, 60) / 100;
  const upvoteCount = Math.round(voteInteractions * voteRatio);
  const downvoteCount = voteInteractions - upvoteCount;

  const registrationInteractionsAveragePerDay = crypto.randomInt(1, 15) / 100;
  const registrationInteractions = Math.round(
    registrationInteractionsAveragePerDay * issuedNDaysAgo,
  );

  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(
    1000 * 60 * 60,
    1000 * 60 * 60 * 24 * 7,
  );
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const averageRegistrationInterval = crypto.randomInt(
    1000 * 60 * 60 * 24,
    1000 * 60 * 60 * 24 * 14,
  );
  const averageVotingInterval = crypto.randomInt(
    1000 * 60 * 60,
    1000 * 60 * 60 * 24 * 7,
  );

  return {
    credibility: 0,
    issuedAt: new Date(issuedAt),
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 2),
    unrealisticMovementCount: 0,
    voting: {
      totalCount: voteInteractions,
      upvoteCount,
      downvoteCount,
      lastVotedAt: new Date(lastInteractionAt),
      averageVotingInterval,
    },
    registration: {
      totalCount: registrationInteractions,
      lastRegistrationAt: new Date(lastInteractionAt),
      averageRegistrationInterval,
    },
  };
}

export function generateNewbieBehaviour(): BehaviourInfo {
  const issuedNMinutesAgo = crypto.randomInt(10, 20160);
  const issuedNDaysAgo = Math.floor(issuedNMinutesAgo / (24 * 60));
  const issuedAt = nowMinusMinutes(issuedNMinutesAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(10, 20) / 100;
  const voteInteractions =
    Math.round(voteInteractionAveragePerDay * issuedNDaysAgo) +
    crypto.randomInt(0, 2);

  const voteRatio = crypto.randomInt(40, 60) / 100;
  const upvoteCount = Math.round(voteInteractions * voteRatio);
  const downvoteCount = voteInteractions - upvoteCount;

  const registrationInteractionsAveragePerDay = crypto.randomInt(1, 5) / 100;
  const registrationInteractions =
    Math.round(registrationInteractionsAveragePerDay * issuedNDaysAgo) +
    crypto.randomInt(0, 1);

  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const averageRegistrationInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);
  const averageVotingInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);

  return {
    credibility: 0,
    issuedAt: new Date(issuedAt),
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 2),
    unrealisticMovementCount: 0,
    voting: {
      totalCount: voteInteractions,
      upvoteCount,
      downvoteCount,
      lastVotedAt: new Date(lastInteractionAt),
      averageVotingInterval,
    },
    registration: {
      totalCount: registrationInteractions,
      lastRegistrationAt: new Date(lastInteractionAt),
      averageRegistrationInterval,
    },
  };
}

export function generatePowerBehaviour(): BehaviourInfo {
  const issuedNDaysAgo = crypto.randomInt(25, 1000);
  const issuedAt = nowMinusDays(issuedNDaysAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(30, 75) / 100;
  const voteInteractions = Math.round(
    voteInteractionAveragePerDay * issuedNDaysAgo,
  );

  const voteRatio = crypto.randomInt(35, 65) / 100;
  const upvoteCount = Math.round(voteInteractions * voteRatio);
  const downvoteCount = voteInteractions - upvoteCount;

  const registrationInteractionsAveragePerDay = crypto.randomInt(5, 25) / 100;
  const registrationInteractions = Math.round(
    registrationInteractionsAveragePerDay * issuedNDaysAgo,
  );

  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const averageRegistrationInterval = crypto.randomInt(
    1000 * 60 * 60 * 24 * 2,
    1000 * 60 * 60 * 24 * 7,
  );
  const averageVotingInterval = crypto.randomInt(
    1000 * 60 * 60 * 24,
    1000 * 60 * 60 * 24 * 4,
  );

  return {
    credibility: 0,
    issuedAt: new Date(issuedAt),
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 2),
    unrealisticMovementCount: 0,
    voting: {
      totalCount: voteInteractions,
      upvoteCount,
      downvoteCount,
      lastVotedAt: new Date(lastInteractionAt),
      averageVotingInterval,
    },
    registration: {
      totalCount: registrationInteractions,
      lastRegistrationAt: new Date(lastInteractionAt),
      averageRegistrationInterval,
    },
  };
}

export function generateBotBehaviour(): BehaviourInfo {
  const issuedNMinutesAgo = crypto.randomInt(10, 10080);
  const issuedNDaysAgo = Math.floor(issuedNMinutesAgo / (24 * 60));
  const issuedAt = nowMinusMinutes(issuedNMinutesAgo);

  const type = ['vote', 'registration'][crypto.randomInt(0, 1)];

  const unrealisticMovementCount = crypto.randomInt(50, 750);

  let voteInteractions: number;
  let upvoteCount: number;
  let downvoteCount: number;
  let registrationInteractions: number;
  let totalInteractions: number;
  let averageInterval: number;
  let lastInteractionAt: number;
  let averageRegistrationInterval: number;
  let averageVotingInterval: number;

  if (type === 'vote') {
    const voteInteractionAveragePerDay = crypto.randomInt(100, 1000) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const voteRatio = crypto.randomInt(10, 90) / 100;
    upvoteCount = Math.round(voteInteractions * voteRatio);
    downvoteCount = voteInteractions - upvoteCount;

    const registrationInteractionsAveragePerDay = crypto.randomInt(1, 15) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );

    totalInteractions = voteInteractions + registrationInteractions;
    averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
    lastInteractionAt = issuedAt + totalInteractions * averageInterval;
    averageRegistrationInterval = crypto.randomInt(
      1000 * 60 * 60 * 24,
      1000 * 60 * 60 * 24 * 14,
    );
    averageVotingInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
  } else {
    const voteInteractionAveragePerDay = crypto.randomInt(10, 30) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const voteRatio = crypto.randomInt(40, 60) / 100;
    upvoteCount = Math.round(voteInteractions * voteRatio);
    downvoteCount = voteInteractions - upvoteCount;

    const registrationInteractionsAveragePerDay =
      crypto.randomInt(100, 1000) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );

    totalInteractions = voteInteractions + registrationInteractions;
    averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
    lastInteractionAt = issuedAt + totalInteractions * averageInterval;
    averageRegistrationInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
    averageVotingInterval = crypto.randomInt(
      1000 * 60 * 60,
      1000 * 60 * 60 * 24 * 7,
    );
  }

  return {
    credibility: 0,
    issuedAt: new Date(issuedAt),
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionWorldwide(),
    unrealisticMovementCount,
    voting: {
      totalCount: voteInteractions,
      upvoteCount,
      downvoteCount,
      lastVotedAt: new Date(lastInteractionAt),
      averageVotingInterval,
    },
    registration: {
      totalCount: registrationInteractions,
      lastRegistrationAt: new Date(lastInteractionAt),
      averageRegistrationInterval,
    },
  };
}

export function generateSpamBehaviour(): BehaviourInfo {
  const issuedNMinutesAgo = crypto.randomInt(10, 10080);
  const issuedNDaysAgo = Math.floor(issuedNMinutesAgo / (24 * 60));
  const issuedAt = nowMinusMinutes(issuedNMinutesAgo);

  const type = ['vote', 'registration'][crypto.randomInt(0, 1)];

  const unrealisticMovementCount = crypto.randomInt(0, 100);

  let voteInteractions: number;
  let upvoteCount: number;
  let downvoteCount: number;
  let registrationInteractions: number;
  let totalInteractions: number;
  let averageInterval: number;
  let lastInteractionAt: number;
  let averageRegistrationInterval: number;
  let averageVotingInterval: number;

  if (type === 'vote') {
    const voteInteractionAveragePerDay = crypto.randomInt(100, 250) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const voteRatio = crypto.randomInt(10, 90) / 100;
    upvoteCount = Math.round(voteInteractions * voteRatio);
    downvoteCount = voteInteractions - upvoteCount;

    const registrationInteractionsAveragePerDay = crypto.randomInt(1, 15) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );

    totalInteractions = voteInteractions + registrationInteractions;
    averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
    lastInteractionAt = issuedAt + totalInteractions * averageInterval;
    averageRegistrationInterval = crypto.randomInt(
      1000 * 60 * 60 * 24,
      1000 * 60 * 60 * 24 * 14,
    );
    averageVotingInterval = crypto.randomInt(1000 * 60, 1000 * 60 * 30);
  } else {
    const voteInteractionAveragePerDay = crypto.randomInt(10, 30) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const voteRatio = crypto.randomInt(40, 60) / 100;
    upvoteCount = Math.round(voteInteractions * voteRatio);
    downvoteCount = voteInteractions - upvoteCount;

    const registrationInteractionsAveragePerDay =
      crypto.randomInt(100, 250) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );

    totalInteractions = voteInteractions + registrationInteractions;
    averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
    lastInteractionAt = issuedAt + totalInteractions * averageInterval;
    averageRegistrationInterval = crypto.randomInt(1000 * 60, 1000 * 60 * 30);
    averageVotingInterval = crypto.randomInt(
      1000 * 60 * 60,
      1000 * 60 * 60 * 24 * 7,
    );
  }

  return {
    credibility: 0,
    issuedAt: new Date(issuedAt),
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionWorldwide(),
    unrealisticMovementCount,
    voting: {
      totalCount: voteInteractions,
      upvoteCount,
      downvoteCount,
      lastVotedAt: new Date(lastInteractionAt),
      averageVotingInterval,
    },
    registration: {
      totalCount: registrationInteractions,
      lastRegistrationAt: new Date(lastInteractionAt),
      averageRegistrationInterval,
    },
  };
}
