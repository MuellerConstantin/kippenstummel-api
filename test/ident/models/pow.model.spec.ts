import { MalformedPoWStampError } from 'src/lib/models';
import { PoWStamp } from 'src/core/ident/models';

describe('PoWStamp', () => {
  describe('fromStamp', () => {
    it('Should parse stamp successfully"', () => {
      const rawStamp =
        '20:20250409082325:sha256:acd001cd6286c8c14c5415301f8d9dd7';

      const stamp = PoWStamp.fromStamp(rawStamp);

      expect(stamp).toBeDefined();
      expect(stamp).toHaveProperty('difficulty', 20);
      expect(stamp).toHaveProperty(
        'expiresAt',
        new Date(Date.UTC(2025, 3, 9, 8, 23, 25)),
      );
      expect(stamp).toHaveProperty('algorithm', 'sha256');
      expect(stamp).toHaveProperty('nonce', 'acd001cd6286c8c14c5415301f8d9dd7');
    });

    it('Should throw error when stamp timestamp is malformed"', () => {
      const rawStamp =
        '20:202504082325:sha256:acd001cd6286c8c14c5415301f8d9dd7';

      expect(() => PoWStamp.fromStamp(rawStamp)).toThrow(
        MalformedPoWStampError,
      );
    });

    it('Should throw error when difficulty is malformed"', () => {
      const rawStamp =
        'abc:202504082325:sha256:acd001cd6286c8c14c5415301f8d9dd7';

      expect(() => PoWStamp.fromStamp(rawStamp)).toThrow(
        MalformedPoWStampError,
      );
    });
  });

  describe('toStamp', () => {
    it('Should format stamp successfully"', () => {
      const stamp = new PoWStamp(
        20,
        new Date(Date.UTC(2025, 3, 9, 8, 23, 25)),
        'sha256',
        'acd001cd6286c8c14c5415301f8d9dd7',
      );

      expect(stamp.toStamp()).toBe(
        '20:20250409082325:sha256:acd001cd6286c8c14c5415301f8d9dd7',
      );
    });
  });
});
