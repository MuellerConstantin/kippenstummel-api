import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import {
  RegisterCvmCommandHandler,
  RegisterCvmCommand,
} from 'src/core/cvm/commands';
import { CvmEventStoreRepository } from 'src/core/cvm/repositories/cvm.es-repository';
import { CredibilityService } from 'src/core/ident/services';
import { getModelToken } from '@nestjs/mongoose';
import { CvmAggregate, CvmId } from 'src/core/cvm/models';
import {
  Cvm,
  CvmDocument,
  Vote,
  VoteDocument,
} from 'src/core/cvm/repositories';

describe('RegisterCvmCommandHandler', () => {
  let module: TestingModule;
  let handler: RegisterCvmCommandHandler;
  let cvmModel: Model<CvmDocument>;
  let voteModel: Model<VoteDocument>;
  let eventRepository: CvmEventStoreRepository;
  let credibilityService: CredibilityService;
  let aggregate: CvmAggregate;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RegisterCvmCommandHandler,
        { provide: getModelToken(Cvm.name), useValue: Model },
        { provide: getModelToken(Vote.name), useValue: Model },
        {
          provide: CvmEventStoreRepository,
          useValue: { save: jest.fn(), load: jest.fn() },
        },
        {
          provide: CredibilityService,
          useValue: { getCredibility: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(RegisterCvmCommandHandler);
    cvmModel = module.get<Model<CvmDocument>>(getModelToken(Cvm.name));
    voteModel = module.get<Model<VoteDocument>>(getModelToken(Vote.name));
    eventRepository = module.get(CvmEventStoreRepository);
    credibilityService = module.get(CredibilityService);

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

  it('Should register a new CVM', async () => {
    // Simulates another registration 75 meters away
    const command = new RegisterCvmCommand(
      8.40395,
      49.009874,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    (cvmModel.findOne as any) = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    }));
    jest.spyOn(credibilityService, 'getCredibility').mockResolvedValue(80);
    jest.spyOn(cvmModel, 'countDocuments').mockResolvedValue(0);

    const saveSpy = jest
      .spyOn(eventRepository, 'save')
      .mockResolvedValue(undefined);

    await handler.execute(command);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(eventRepository, 'load')).not.toHaveBeenCalled();
  });

  it('Should upvate existing CVM instead of registering a new one', async () => {
    // Simulates another registration 25 meters away
    const command = new RegisterCvmCommand(
      8.40395,
      49.0094245,
      '20718133-9c8d-45bb-b3e5-6462827e77ae',
    );

    (cvmModel.findOne as any) = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        aggregateId: aggregate.id.value,
      }),
    }));
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
});
