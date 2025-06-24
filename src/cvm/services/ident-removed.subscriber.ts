import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { IdentRemovedEvent } from 'src/ident/events';
import { Cvm, Vote } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class IdentRemovedEventSubscriber {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  @OnEvent('ident-removed')
  async handleIdentRemoved(payload: IdentRemovedEvent) {
    const identity = payload.identity;

    /*
     * For GDPR-compliant deletion, the occurrence of the identity must be
     * blacked out from all processes, as otherwise conclusions
     * about a movement profile would theoretically be possible.
     */

    await this.cvmModel.updateMany(
      { registeredBy: identity },
      { $unset: { registeredBy: '' } },
    );

    await this.voteModel.updateMany({ identity }, { $unset: { identity: '' } });
  }
}
