import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { IdentService } from 'src/common/services';
import { constants } from 'src/lib';

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
    public readonly identity: string,
  ) {}
}

@CommandHandler(RegisterCvmCommand)
export class RegisterCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    private readonly identService: IdentService,
  ) {}

  async execute(command: RegisterCvmCommand): Promise<void> {
    const result = await this.cvmModel
      .findOne({
        position: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [command.longitude, command.latitude],
            },
            $maxDistance: constants.SAME_CVM_RADIUS,
          },
        },
      })
      .exec();

    const credibility = await this.identService.getIdentityCredibility(
      command.identity,
    );

    if (!result) {
      const aggregate = CvmAggregate.register(
        command.longitude,
        command.latitude,
        credibility,
        command.identity,
      );
      await this.cvmEventStoreRepository.save(aggregate);

      await this.tileComputationQueue.add('recompute', {
        positions: [
          {
            longitude: command.longitude,
            latitude: command.latitude,
          },
        ],
      });

      await this.credibilityComputationQueue.add('recompute', {
        identity: command.identity,
        position: {
          longitude: command.longitude,
          latitude: command.latitude,
        },
        action: 'registration',
      });
    } else {
      const aggregate = (await this.cvmEventStoreRepository.load(
        CvmId.from(result.aggregate_id),
      ))!;
      aggregate.upvote(command.identity, credibility);

      await this.cvmEventStoreRepository.save(aggregate);

      await this.credibilityComputationQueue.add('recompute', {
        identity: command.identity,
        position: {
          longitude: command.longitude,
          latitude: command.latitude,
        },
        action: 'upvote',
      });
    }
  }
}
