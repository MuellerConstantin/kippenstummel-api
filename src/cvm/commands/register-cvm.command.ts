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

const NEARBY_RADIUS_IN_METERS = 10;

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
    public readonly fingerprint: string,
  ) {}
}

@CommandHandler(RegisterCvmCommand)
export class RegisterCvmCommandHandler implements ICommandHandler {
  constructor(
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
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
        command.fingerprint,
      );
      await this.cvmEventStoreRepository.save(aggregate);
    } else {
      const aggregate = await this.cvmEventStoreRepository.load(
        CvmId.from(result.id),
      );
      aggregate!.upvote(command.fingerprint);

      await this.cvmEventStoreRepository.save(aggregate!);
    }
  }
}
