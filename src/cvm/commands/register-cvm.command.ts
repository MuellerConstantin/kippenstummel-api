import { Logger } from '@nestjs/common';
import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';
import { CvmTileService } from '../services';
import { IdentService } from 'src/common/services';

const NEARBY_RADIUS_IN_METERS = 10;

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
    private readonly cvmTileService: CvmTileService,
    private readonly identService: IdentService,
    private readonly logger: Logger,
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
            $maxDistance: NEARBY_RADIUS_IN_METERS,
          },
        },
      })
      .exec();

    if (!result) {
      const aggregate = CvmAggregate.register(
        command.longitude,
        command.latitude,
        0,
        command.identity,
      );
      await this.cvmEventStoreRepository.save(aggregate);

      this.cvmTileService
        .updateTilesByPosition({
          longitude: aggregate.longitude,
          latitude: aggregate.latitude,
        })
        .catch((err: Error) =>
          this.logger.error('Failed to update tiles', err.stack),
        );

      this.identService
        .updateIdentityInfo(
          command.identity,
          {
            longitude: command.longitude,
            latitude: command.latitude,
          },
          'registration',
        )
        .catch((err: Error) =>
          this.logger.error('Failed to update identity info', err.stack),
        );
    } else {
      const aggregate = (await this.cvmEventStoreRepository.load(
        CvmId.from(result.aggregate_id),
      ))!;
      aggregate.upvote(command.identity);

      await this.cvmEventStoreRepository.save(aggregate);

      this.identService
        .updateIdentityInfo(
          command.identity,
          {
            longitude: command.longitude,
            latitude: command.latitude,
          },
          'upvote',
        )
        .catch((err: Error) =>
          this.logger.error('Failed to update identity info', err.stack),
        );
    }
  }
}
