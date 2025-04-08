import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate } from '../models';
import { CvmEventStoreRepository } from '../repositories';
import { Cvm } from '../repositories/schemas';

const NEARBY_RADIUS_IN_METERS = 10;

export class RegisterCvmCommand implements ICommand {
  constructor(
    public readonly longitude: number,
    public readonly latitude: number,
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
      );
      await this.cvmEventStoreRepository.save(aggregate);
    }
  }
}
