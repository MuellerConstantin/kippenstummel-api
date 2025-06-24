import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { IdentRemovedEvent } from 'src/ident/events';
import { PiiToken } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class IdentRemovedEventSubscriber {
  constructor(
    @InjectModel(PiiToken.name) private readonly piiTokenModel: Model<PiiToken>,
  ) {}

  @OnEvent('ident-removed')
  async handleIdentRemoved(payload: IdentRemovedEvent) {
    const identity = payload.identity;

    /*
     * For GDPR-compliant deletion, the PII tokens used to translate events in
     * the Event Store must be deleted. After that, the events in the Event Store
     * are completely anonymized without any further processing.
     */

    await this.piiTokenModel.deleteMany({ authority: identity });
  }
}
