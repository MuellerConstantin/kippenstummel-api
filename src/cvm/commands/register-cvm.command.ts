import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmAggregate, CvmId } from '../models';
import { CvmEventStoreRepository, Cvm } from '../repositories';
import { IdentService } from 'src/ident/services';
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

    const credibility = await this.identService.getCredibility(
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
    } else {
      const aggregate = (await this.cvmEventStoreRepository.load(
        CvmId.from(result.aggregate_id),
      ))!;
      aggregate.upvote(command.identity, credibility);

      await this.cvmEventStoreRepository.save(aggregate);
    }
  }
}
