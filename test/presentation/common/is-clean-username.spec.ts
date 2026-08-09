import * as fs from 'fs';
import * as path from 'path';
import { validate } from 'class-validator';
import { IsCleanUsername } from 'src/presentation/common/controllers/dtos/validation/is-clean-username';

class UsernameDto {
  @IsCleanUsername()
  public username!: unknown;
}

async function isClean(username: unknown): Promise<boolean> {
  const dto = new UsernameDto();
  dto.username = username;

  return (await validate(dto)).length === 0;
}

// The term list is data, not something to duplicate into the test. Pull a
// representative entry from it instead of hardcoding profanity in the repo.
const blockedTerms = fs
  .readFileSync(
    path.resolve(__dirname, '../../../src/assets/badwords.txt'),
    'utf8',
  )
  .split(/\r?\n/)
  .map((term) => term.trim().toLowerCase())
  .filter((term) => /^[a-z]{5,}$/.test(term));

// Fuzzy matching only kicks in from five characters, so a shorter sample would
// exercise a different code path than intended.
const sample = blockedTerms[0];

// Digits that normalizeWord folds back into letters.
const leetify = (word: string) =>
  word
    .replace(/i/g, '1')
    .replace(/e/g, '3')
    .replace(/a/g, '4')
    .replace(/o/g, '0')
    .replace(/s/g, '5');

describe('IsCleanUsername', () => {
  it('Should have found a usable sample term in the asset file', () => {
    expect(blockedTerms.length).toBeGreaterThan(0);
    expect(sample).toMatch(/^[a-z]{5,}$/);
  });

  it.each([['alice'], ['cartographer'], ['mapper42'], ['nachtfalter']])(
    'Should accept the harmless username %s',
    async (username) => {
      await expect(isClean(username)).resolves.toBe(true);
    },
  );

  // Known false positives, pinned so they stay visible. The fuzzy matcher
  // allows a Levenshtein distance of max(1, floor(length * 0.2)), which for a
  // five letter term is 1 -- close enough that ordinary words collide with it.
  // "kippenstummel" trips on the "pens" in kip-pens-tummel, so the project's
  // own name is not a usable username.
  it.each([['kippenstummel'], ['wanderer'], ['zeppelin']])(
    'Should currently reject %s as a false positive',
    async (username) => {
      await expect(isClean(username)).resolves.toBe(false);
    },
  );

  it('Should reject a blocked term', async () => {
    await expect(isClean(sample)).resolves.toBe(false);
  });

  it('Should reject a blocked term in different casing', async () => {
    await expect(isClean(sample.toUpperCase())).resolves.toBe(false);
  });

  it('Should reject a blocked term written in leetspeak', async () => {
    await expect(isClean(leetify(sample))).resolves.toBe(false);
  });

  it('Should reject a blocked term padded with repeated characters', async () => {
    const padded = sample.replace(/^(.)/, '$1$1');

    await expect(isClean(padded)).resolves.toBe(false);
  });

  it('Should reject a blocked term embedded in a longer username', async () => {
    await expect(isClean(`super${sample}fan`)).resolves.toBe(false);
  });

  it('Should reject a blocked term separated by punctuation', async () => {
    // normalizeWord strips everything outside a-z, so separators do not help.
    await expect(isClean(sample.split('').join('.'))).resolves.toBe(false);
  });

  it.each([[42], [null], [undefined], [{}]])(
    'Should reject the non-string value %p',
    async (value) => {
      await expect(isClean(value)).resolves.toBe(false);
    },
  );
});
