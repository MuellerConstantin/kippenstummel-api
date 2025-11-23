import * as fs from 'fs';
import * as path from 'path';
import { registerDecorator, ValidationOptions } from 'class-validator';
import { distance } from 'fastest-levenshtein';

const file = fs.readFileSync(
  path.join(__dirname, '../../../../../assets/badwords.txt'),
  'utf8',
);
const blockedTerms = file
  .split(/\r?\n/)
  .map((term) => term.trim())
  .filter(Boolean);

function normalizeUsername(username: string): string {
  // Transform possible leet speak
  return username
    .toLowerCase()
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't');
}

function containsBlockedTerm(username: string): boolean {
  const n = normalizeUsername(username);

  return blockedTerms.some((word) => {
    if (n.includes(word)) return true;

    // sliding window fuzzy match
    for (let index = 0; index <= n.length - word.length; index++) {
      const segment = n.slice(index, index + word.length);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      if (distance(segment, word) <= 1) return true;
    }

    return false;
  });
}

export function IsCleanUsername(validationOptions?: ValidationOptions) {
  return function (obj: object, propertyName: string) {
    registerDecorator({
      name: 'isCleanUsername',
      target: obj.constructor,
      propertyName,
      options: {
        message: 'The username contains invalid terms.',
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          return !containsBlockedTerm(value);
        },
      },
    });
  };
}
