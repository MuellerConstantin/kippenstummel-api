import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IdentRemovedEvent } from 'src/core/ident/events';
import { CvmReadModelSynchronizer } from '../repositories';

@Injectable()
export class IdentRemovedEventSubscriber {
  constructor(
    private readonly cvmReadModelSynchronizer: CvmReadModelSynchronizer,
  ) {}

  @OnEvent('ident-removed')
  async handleIdentRemoved(payload: IdentRemovedEvent) {
    const identity = payload.identity;

    /*
     * For GDPR-compliant deletion, the occurrence of the identity must be
     * blacked out from all processes, as otherwise conclusions
     * about a movement profile would theoretically be possible.
     */

    await this.cvmReadModelSynchronizer.applyCreatorRemove(identity);
  }
}
