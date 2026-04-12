import * as fs from 'fs';
import * as path from 'path';
import { registerDecorator, ValidationOptions } from 'class-validator';
import { distance } from 'fastest-levenshtein';

const file = fs.readFileSync(
  path.join(__dirname, '../../../../../assets/badwords.txt'),
  'utf8',
);

const MIN_FUZZY_LENGTH = 5;
const FUZZY_PERCENT = 0.2;

function normalizeWord(input: string): string {
  return input
    .toLowerCase()
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/6/g, 'b')
    .replace(/9/g, 'g')
    .replace(/[^a-z]/g, '');
}

function normalizeWordPhonetic(input: string): string {
  return normalizeWord(input).replace(/z/g, 's').replace(/ph/g, 'f');
}

function deduplicateChars(input: string): string {
  return input.replace(/(.)\1+/g, '$1');
}

function getCandidates(input: string): string[] {
  return [
    ...new Set([
      input.toLowerCase(),
      normalizeWord(input),
      deduplicateChars(normalizeWord(input)),
      deduplicateChars(normalizeWordPhonetic(input)),
    ]),
  ];
}

const blockedTerms = file
  .split(/\r?\n/)
  .map((term) => term.trim())
  .filter(Boolean)
  .map(normalizeWord);

function matchesBlockedTerm(candidate: string, word: string): boolean {
  if (candidate.includes(word)) {
    return true;
  }

  if (word.length < MIN_FUZZY_LENGTH) {
    return false;
  }

  const maxDistance = Math.max(1, Math.floor(word.length * FUZZY_PERCENT));

  for (let length = word.length - 1; length <= word.length + 1; length++) {
    if (length <= 0) {
      continue;
    }

    for (let index = 0; index <= candidate.length - length; index++) {
      const segment = candidate.slice(index, index + length);

      if (distance(segment, word) <= maxDistance) {
        return true;
      }
    }
  }

  return false;
}

function containsBlockedTerm(username: string): boolean {
  const candidates = getCandidates(username);
  return blockedTerms.some((word) =>
    candidates.some((candidate) => matchesBlockedTerm(candidate, word)),
  );
}

export function IsCleanUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCleanUsername',
      target: object.constructor,
      propertyName,
      options: {
        message: 'The username contains invalid terms.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return !containsBlockedTerm(value);
        },
      },
    });
  };
}
