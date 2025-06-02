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
  const issuedAt = nowMinusDays(crypto.randomInt(3, 10));
  const voteInteractions = crypto.randomInt(10, 50);
  const registrationInteractions = crypto.randomInt(0, 10);
  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(30_000, 120_000);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 60,
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 2),
    unrealisticMovementCount: 0,
    voting: {
      totalCount: voteInteractions,
      upvoteCount: Math.floor(voteInteractions * 0.7),
      downvoteCount: Math.floor(voteInteractions * 0.3),
    },
    registrations: {
      totalCount: registrationInteractions,
    },
  };
}

export function generateMaliciousRegistrationIdent(): IdentInfo {
  const issuedAt = nowMinusMinutes(crypto.randomInt(2, 10));
  const voteInteractions = crypto.randomInt(10, 50);
  const registrationInteractions = crypto.randomInt(50, 500);
  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(200, 15_000);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 20,
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionWorldwide(),
    unrealisticMovementCount: crypto.randomInt(5, 20),
    voting: {
      totalCount: voteInteractions,
      upvoteCount: Math.floor(voteInteractions * 0.7),
      downvoteCount: Math.floor(voteInteractions * 0.3),
    },
    registrations: {
      totalCount: registrationInteractions,
    },
  };
}

export function generateMaliciousVotingIdent(): IdentInfo {
  const issuedAt = nowMinusMinutes(crypto.randomInt(2, 10));
  const voteInteractions = crypto.randomInt(100, 750);
  const registrationInteractions = crypto.randomInt(0, 5);
  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(200, 15_000);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;
  const upvoteSpam = Math.random() > 0.5;

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 20,
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionWorldwide(),
    unrealisticMovementCount: crypto.randomInt(5, 30),
    voting: {
      totalCount: voteInteractions,
      upvoteCount: Math.floor(voteInteractions * (upvoteSpam ? 0.9 : 0.1)),
      downvoteCount: Math.floor(voteInteractions * (upvoteSpam ? 0.1 : 0.9)),
    },
    registrations: {
      totalCount: registrationInteractions,
    },
  };
}

export function generatePowerIdent(): IdentInfo {
  const issuedAt = nowMinusDays(crypto.randomInt(10, 40));
  const voteInteractions = crypto.randomInt(100, 500);
  const registrationInteractions = crypto.randomInt(10, 50);
  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(20_000, 60_000);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 75,
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 5),
    unrealisticMovementCount: crypto.randomInt(0, 2),
    voting: {
      totalCount: voteInteractions,
      upvoteCount: Math.floor(voteInteractions * 0.5),
      downvoteCount: Math.floor(voteInteractions * 0.5),
    },
    registrations: {
      totalCount: registrationInteractions,
    },
  };
}

export function generateNewbieIdent(): IdentInfo {
  const issuedAt = nowMinusMinutes(crypto.randomInt(10, 1920));
  const voteInteractions = crypto.randomInt(1, 10);
  const registrationInteractions = crypto.randomInt(0, 2);
  const totalInteractions = voteInteractions + registrationInteractions;
  const averageInterval = crypto.randomInt(60_000, 150_000);
  const lastInteractionAt = issuedAt + totalInteractions * averageInterval;

  return {
    identity: crypto.randomUUID(),
    issuedAt: new Date(issuedAt),
    credibility: 32,
    lastInteractionAt: new Date(lastInteractionAt),
    averageInteractionInterval: averageInterval,
    lastInteractionPosition: randomPositionNearby({ lat: 48.1, lon: 11.6 }, 2),
    unrealisticMovementCount: 0,
    voting: {
      totalCount: voteInteractions,
      upvoteCount: Math.floor(voteInteractions * 0.9),
      downvoteCount: Math.floor(voteInteractions * 0.1),
    },
    registrations: {
      totalCount: registrationInteractions,
    },
  };
}
