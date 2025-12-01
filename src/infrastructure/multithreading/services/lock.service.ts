import { Injectable, Inject, Logger } from '@nestjs/common';
import Redlock from 'redlock';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);

  constructor(
    @Inject('MULTITHREADING_REDLOCK')
    private readonly redlock: Redlock,
  ) {}

  async withLock<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.logger.debug(`Acquiring lock for key="${key}" (ttl=${ttl})`);
    const lock = await this.redlock.lock(key, ttl);

    try {
      return await fn();
    } finally {
      try {
        await lock.unlock();
        this.logger.debug(`Released lock for key="${key}"`);
      } catch (err) {
        this.logger.warn(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to unlock key="${key}". Lock will expire automatically. Reason: ${err?.message ?? err}`,
        );
      }
    }
  }

  async withLocks<T>(
    keys: string[],
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const keyList = keys.join(', ');
    this.logger.debug(
      `Acquiring multi-lock for keys=[${keyList}] (ttl=${ttl})`,
    );
    const lock = await this.redlock.lock(keys, ttl);

    try {
      return await fn();
    } finally {
      try {
        await lock.unlock();
        this.logger.debug(`Released multi-lock for keys=[${keyList}]`);
      } catch (err) {
        this.logger.warn(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to unlock multi-lock keys=[${keyList}]. Lock will expire automatically. Reason: ${err?.message ?? err}`,
        );
      }
    }
  }
}
