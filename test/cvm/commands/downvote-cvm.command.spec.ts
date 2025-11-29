import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import {
  DownvoteCvmCommandHandler,
  DownvoteCvmCommand,
} from 'src/core/cvm/commands';
import { CvmEventStoreRepository } from 'src/core/cvm/repositories/cvm.es-repository';
import { getModelToken } from '@nestjs/mongoose';
import { CvmAggregate, CvmId } from 'src/core/cvm/models';
import { Vote, VoteDocument } from 'src/core/cvm/repositories';
import { NotFoundError, OutOfReachError } from 'src/lib/models';

describe('RegisterCvmCommandHandler', () => {
  let module: TestingModule;
  let handler: DownvoteCvmCommandHandler;
  let voteModel: Model<VoteDocument>;
  let eventRepository: CvmEventStoreRepository;
  let aggregate: CvmAggregate;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DownvoteCvmCommandHandler,
        { provide: getModelToken(Vote.name), useValue: Model },
        {
          provide: CvmEventStoreRepository,
          useValue: { save: jest.fn(), load: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(DownvoteCvmCommandHandler);
    voteModel = module.get<Model<VoteDocument>>(getModelToken(Vote.name));
    eventRepository = module.get(CvmEventStoreRepository);

    aggregate = new CvmAggregate();
    aggregate.id = CvmId.from('8eadee97-4ba8-47ee-a24b-246166a55966');
    aggregate.imported = false;
    aggregate.markedForDeletion = false;
    aggregate.markedForDeletionAt = undefined;
    aggregate.score = 6;
    aggregate.version = 0;
    aggregate.recentReports = [];
    aggregate.latitude = 49.0092;
    aggregate.longitude = 8.40395;
  });

  it('Should downvote successfully', async () => {
    // Simulates a Voter 25 meters away
    const command = new DownvoteCvmCommand(
      '8eadee97-4ba8-47ee-a24b-246166a55966',
      8.40395,
      49.0094245,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    jest.spyOn(voteModel, 'aggregate').mockResolvedValue([]);

    const loadSpy = jest
      .spyOn(eventRepository, 'load')
      .mockResolvedValue(aggregate);

    const saveSpy = jest
      .spyOn(eventRepository, 'save')
      .mockResolvedValue(undefined);

    await handler.execute(command);

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('Should do nothing because of recent vote for the CVM', async () => {
    // Simulates a Voter 25 meters away
    const command = new DownvoteCvmCommand(
      '8eadee97-4ba8-47ee-a24b-246166a55966',
      8.40395,
      49.0094245,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    jest
      .spyOn(voteModel, 'aggregate')
      .mockResolvedValue([{ _id: '20718133-9c8d-45bb-b3e5-6462827e77ae' }]);

    const loadSpy = jest
      .spyOn(eventRepository, 'load')
      .mockResolvedValue(aggregate);

    await handler.execute(command);

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(eventRepository, 'save')).not.toHaveBeenCalled();
  });

  it('Should reject because voter is out of reach', async () => {
    // Simulates a Voter 75 meters away
    const command = new DownvoteCvmCommand(
      '8eadee97-4ba8-47ee-a24b-246166a55966',
      8.40395,
      49.009874,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    const loadSpy = jest
      .spyOn(eventRepository, 'load')
      .mockResolvedValue(aggregate);

    await expect(handler.execute(command)).rejects.toThrow(OutOfReachError);

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(eventRepository, 'save')).not.toHaveBeenCalled();
  });

  it('Should reject because CVM is not found by ID', async () => {
    // Simulates a Voter 25 meters away
    const command = new DownvoteCvmCommand(
      '0fb0d861-5840-4337-9c0f-f696fb6956ca',
      8.40395,
      49.0094245,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    const loadSpy = jest
      .spyOn(eventRepository, 'load')
      .mockResolvedValue(undefined);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundError);

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(eventRepository, 'save')).not.toHaveBeenCalled();
  });
});
