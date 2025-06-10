import * as crypto from 'crypto';
import { IdentInfo } from 'src/ident/models';

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

export function generateNormalIdent(): IdentInfo {
  const issuedNDaysAgo = crypto.randomInt(3, 500);
  const issuedAt = nowMinusDays(issuedNDaysAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(10, 30) / 100;
  const voteInteractions = Math.round(
    voteInteractionAveragePerDay * issuedNDaysAgo,
  );

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
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 60,
    behaviour: {
      lastInteractionAt: new Date(lastInteractionAt),
      averageInteractionInterval: averageInterval,
      lastInteractionPosition: randomPositionNearby(
        { lat: 48.1, lon: 11.6 },
        2,
      ),
      unrealisticMovementCount: 0,
      voting: {
        totalCount: voteInteractions,
        upvoteCount: Math.floor(voteInteractions * 0.7),
        downvoteCount: Math.floor(voteInteractions * 0.3),
        lastVotedAt: new Date(lastInteractionAt),
        averageVotingInterval,
      },
      registrations: {
        totalCount: registrationInteractions,
        lastRegistrationAt: new Date(lastInteractionAt),
        averageRegistrationInterval,
      },
    },
  };
}

export function generateMaliciousIdent(): IdentInfo {
  const issuedNMinutesAgo = crypto.randomInt(1, 72000);
  const issuedNDaysAgo = Math.round(issuedNMinutesAgo / 60 / 24);
  const issuedAt = nowMinusMinutes(issuedNMinutesAgo);

  const types = ['voteSpam', 'registrationSpam'];
  const type = types[crypto.randomInt(0, 1)];

  let voteInteractionAveragePerDay: number = 0;
  let voteInteractions: number = 0;
  let upvoteCount: number = 0;
  let downvoteCount: number = 0;
  let registrationInteractionsAveragePerDay: number = 0;
  let registrationInteractions: number = 0;

  if (type === 'voteSpam') {
    voteInteractionAveragePerDay = crypto.randomInt(75, 500) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const ratio = crypto.randomInt(0, 100) / 100;
    upvoteCount = Math.floor(voteInteractions * ratio);
    downvoteCount = Math.floor(voteInteractions * (1 - ratio));

    registrationInteractionsAveragePerDay = crypto.randomInt(1, 50) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );
  } else if (type === 'registrationSpam') {
    voteInteractionAveragePerDay = crypto.randomInt(1, 50) / 100;
    voteInteractions = Math.round(
      voteInteractionAveragePerDay * issuedNDaysAgo,
    );

    const ratio = crypto.randomInt(0, 100) / 100;
    upvoteCount = Math.floor(voteInteractions * ratio);
    downvoteCount = Math.floor(voteInteractions * (1 - ratio));

    registrationInteractionsAveragePerDay = crypto.randomInt(75, 500) / 100;
    registrationInteractions = Math.round(
      registrationInteractionsAveragePerDay * issuedNDaysAgo,
    );
  }

  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const averageRegistrationInterval = crypto.randomInt(
    1000 * 10,
    1000 * 60 * 30,
  );
  const averageVotingInterval = crypto.randomInt(1000 * 10, 1000 * 60 * 30);

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 20,
    behaviour: {
      lastInteractionAt: new Date(lastInteractionAt),
      averageInteractionInterval: averageInterval,
      lastInteractionPosition: randomPositionWorldwide(),
      unrealisticMovementCount: crypto.randomInt(50, 100),
      voting: {
        totalCount: voteInteractions,
        upvoteCount,
        downvoteCount,
        lastVotedAt: new Date(lastInteractionAt),
        averageVotingInterval,
      },
      registrations: {
        totalCount: registrationInteractions,
        lastRegistrationAt: new Date(lastInteractionAt),
        averageRegistrationInterval,
      },
    },
  };
}

export function generatePowerIdent(): IdentInfo {
  const issuedNDaysAgo = crypto.randomInt(10, 500);
  const issuedAt = nowMinusDays(issuedNDaysAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(10, 50) / 100;
  const voteInteractions = Math.round(
    voteInteractionAveragePerDay * issuedNDaysAgo,
  );

  const registrationInteractionsAveragePerDay = crypto.randomInt(10, 25) / 100;
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
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 75,
    behaviour: {
      lastInteractionAt: new Date(lastInteractionAt),
      averageInteractionInterval: averageInterval,
      lastInteractionPosition: randomPositionNearby(
        { lat: 48.1, lon: 11.6 },
        5,
      ),
      unrealisticMovementCount: crypto.randomInt(0, 2),
      voting: {
        totalCount: voteInteractions,
        upvoteCount: Math.floor(voteInteractions * 0.5),
        downvoteCount: Math.floor(voteInteractions * 0.5),
        lastVotedAt: new Date(lastInteractionAt),
        averageVotingInterval,
      },
      registrations: {
        totalCount: registrationInteractions,
        lastRegistrationAt: new Date(lastInteractionAt),
        averageRegistrationInterval,
      },
    },
  };
}

export function generateNewbieIdent(): IdentInfo {
  const issuedNMinutesAgo = crypto.randomInt(10, 1920);
  const issuedNDaysAgo = Math.round(issuedNMinutesAgo / 60 / 24);
  const issuedAt = nowMinusMinutes(issuedNMinutesAgo);

  const voteInteractionAveragePerDay = crypto.randomInt(10, 30) / 100;
  const voteInteractions = Math.round(
    voteInteractionAveragePerDay * issuedNDaysAgo,
  );

  const registrationInteractionsAveragePerDay = crypto.randomInt(1, 15) / 100;
  const registrationInteractions = Math.round(
    registrationInteractionsAveragePerDay * issuedNDaysAgo,
  );

  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const averageRegistrationInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);
  const averageVotingInterval = crypto.randomInt(0, 1000 * 60 * 60 * 24);

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 32,
    behaviour: {
      lastInteractionAt: new Date(lastInteractionAt),
      averageInteractionInterval: averageInterval,
      lastInteractionPosition: randomPositionNearby(
        { lat: 48.1, lon: 11.6 },
        2,
      ),
      unrealisticMovementCount: 0,
      voting: {
        totalCount: voteInteractions,
        upvoteCount: Math.floor(voteInteractions * 0.9),
        downvoteCount: Math.floor(voteInteractions * 0.1),
        lastVotedAt: new Date(lastInteractionAt),
        averageVotingInterval: averageVotingInterval,
      },
      registrations: {
        totalCount: registrationInteractions,
        lastRegistrationAt: new Date(lastInteractionAt),
        averageRegistrationInterval: averageRegistrationInterval,
      },
    },
  };
}
