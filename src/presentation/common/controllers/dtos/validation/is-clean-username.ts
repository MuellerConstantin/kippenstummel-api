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
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

const blockedTerms = file
  .split(/\r?\n/)
  .map((term) => term.trim())
  .filter(Boolean)
  .map(normalizeWord);

function containsBlockedTerm(username: string): boolean {
  const normalizedUsername = normalizeWord(username);

  return blockedTerms.some((word) => {
    if (normalizedUsername.includes(word)) return true;

    if (word.length < MIN_FUZZY_LENGTH) return false;

    const maxDistance = Math.max(1, Math.floor(word.length * FUZZY_PERCENT));

    for (let len = word.length - 1; len <= word.length + 1; len++) {
      if (len <= 0) continue;

      for (let i = 0; i <= normalizedUsername.length - len; i++) {
        const segment = normalizedUsername.slice(i, i + len);
        if (distance(segment, word) <= maxDistance) return true;
      }
    }

    return false;
  });
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
