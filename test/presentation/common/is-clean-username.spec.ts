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

// Terms under five characters go down the anchored path instead of plain
// substring matching, so a shorter sample would exercise different code.
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

  // Ordinary German words that carry a blocked term in the middle. Matching
  // short terms anywhere used to reject all of these.
  it.each([
    ['kippenstummel'],
    ['wanderer'],
    ['zeppelin'],
    ['strasse'],
    ['klasse'],
    ['tasse'],
    ['wasser'],
    ['kasse'],
    ['masse'],
    ['passen'],
    ['eichhoernchen'],
    ['rohheit'],
    ['sternenhimmel'],
    ['wolkenkratzer'],
  ])('Should accept the ordinary word %s', async (username) => {
    await expect(isClean(username)).resolves.toBe(true);
  });

  // Anchoring is deliberately blunt: a short term at the start or end of a
  // name still counts, so these stay blocked. Accepted as the price of
  // catching "assmaster" and "dumbass" without a per-term allow list, and
  // pinned here so the cost stays visible.
  it.each([
    ['fussball'],
    ['handball'],
    ['basketball'],
    ['federball'],
    ['gasse'],
    ['gasthaus'],
    ['siegen'],
    ['heilbronn'],
    ['heilig'],
  ])(
    'Should still reject %s, a known remaining false positive',
    async (username) => {
      await expect(isClean(username)).resolves.toBe(false);
    },
  );

  it.each([
    ['assmaster', 'a short term at the start'],
    ['dumbass', 'a short term at the end'],
    ['nazischwein', 'a short term compounded'],
    ['fickfresse', 'a short term compounded'],
    ['hurensohn', 'a short term compounded'],
    ['arschloch', 'a longer term'],
  ])('Should reject %s (%s)', async (username) => {
    await expect(isClean(username)).resolves.toBe(false);
  });

  // Padding a short term moves it out of the anchored positions, so the
  // candidates include a variant with one repeated-character run removed from
  // either end.
  it.each([
    ['xXnaziXx'],
    ['zzznaziZZZ'],
    ['---nazi---'],
    ['__ass__'],
    ['oooassooo'],
    ['nnnhurennn'],
  ])('Should reject the decorated username %s', async (username) => {
    await expect(isClean(username)).resolves.toBe(false);
  });

  // German words that carry a repeated character at an edge. Stripping the run
  // must not expose a blocked term that was not already there.
  it.each([
    ['aachen'],
    ['fluss'],
    ['kuss'],
    ['schloss'],
    ['schiff'],
    ['kamm'],
    ['anna'],
    ['otto'],
  ])('Should still accept %s', async (username) => {
    await expect(isClean(username)).resolves.toBe(true);
  });

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
