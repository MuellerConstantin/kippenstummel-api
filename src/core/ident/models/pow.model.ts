import { MalformedPoWStampError } from 'src/lib/models';

export class PoWStamp {
  private readonly _difficulty: number;
  private readonly _expiresAt: Date;
  private readonly _algorithm: string;
  private readonly _nonce: string;
  private readonly _counter?: number;

  constructor(
    difficulty: number,
    expiresAt: Date,
    algorithm: string,
    nonce: string,
    counter?: number,
  ) {
    this._difficulty = difficulty;
    this._expiresAt = expiresAt;
    this._algorithm = algorithm;
    this._nonce = nonce;
    this._counter = counter;
  }

  public get difficulty(): number {
    return this._difficulty;
  }

  public get expiresAt(): Date {
    return this._expiresAt;
  }

  public get algorithm(): string {
    return this._algorithm;
  }

  public get nonce(): string {
    return this._nonce;
  }

  public get counter(): number | undefined {
    return this._counter;
  }

  public get isSolved(): boolean {
    return this._counter !== undefined;
  }

  public toString(): string {
    return this.toStamp();
  }

  protected static formatTimestamp(timestamp: Date) {
    return timestamp.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  protected static parseTimestamp(timestamp: string) {
    return new Date(
      `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}Z`,
    );
  }

  public toStamp(): string {
    return `${this._difficulty}:${PoWStamp.formatTimestamp(this._expiresAt)}:${this._algorithm}:${this._nonce}${this._counter ? `:${this._counter}` : ''}`;
  }

  public static fromStamp(stamp: string): PoWStamp {
    const [difficulty, timestamp, algorithm, nonce, counter] = stamp.split(':');

    if (!difficulty || !timestamp || !algorithm || !nonce) {
      throw new MalformedPoWStampError();
    }

    if (isNaN(Number(difficulty))) {
      throw new MalformedPoWStampError();
    }

    if (counter && isNaN(Number(counter))) {
      throw new MalformedPoWStampError();
    }

    if (
      !/^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)([0-5]\d)$/.test(
        timestamp,
      )
    ) {
      throw new MalformedPoWStampError();
    }

    const expiresAt = PoWStamp.parseTimestamp(timestamp);

    if (expiresAt instanceof Date && isNaN(expiresAt.getTime())) {
      throw new MalformedPoWStampError();
    }

    return new PoWStamp(
      Number(difficulty),
      expiresAt,
      algorithm,
      nonce,
      counter ? Number(counter) : undefined,
    );
  }
}
