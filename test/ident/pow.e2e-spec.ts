process.env.MONGO_URI = globalThis.__MONGO_URI__ as string;
process.env.REDIS_URI = globalThis.__REDIS_URI__ as string;

import { default as request } from 'supertest';
import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Connection } from 'mongoose';
import { Redis } from 'ioredis';
import { getConnectionToken } from '@nestjs/mongoose';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppModule } from 'src/app.module';
import {
  ApiExceptionFilter,
  DefaultExceptionFilter,
  HttpExceptionFilter,
} from 'src/presentation/common/controllers';
import { getQueueToken } from '@nestjs/bullmq';
import { TileComputationConsumer } from 'src/worker/services';
import { CredibilityComputationConsumer } from 'src/core/ident/services';
import { KarmaComputationConsumer } from 'src/core/ident/services';
import { CvmImportConsumer } from 'src/worker/services';
import { JobManagementConsumer } from 'src/infrastructure/scheduling/services';
import { CvmManagementConsumer } from 'src/core/cvm/services';

describe('PoW', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let cacheConnection: Cache;
  let redisConnection: Redis;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('tile-computation'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(getQueueToken('credibility-computation'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(getQueueToken('karma-computation'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(getQueueToken('cvm-import'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(getQueueToken('job-management'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(getQueueToken('cvm-management'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
        upsertJobScheduler: jest.fn(),
      })
      .overrideProvider(TileComputationConsumer)
      .useValue({})
      .overrideProvider(CredibilityComputationConsumer)
      .useValue({})
      .overrideProvider(KarmaComputationConsumer)
      .useValue({})
      .overrideProvider(CvmImportConsumer)
      .useValue({})
      .overrideProvider(JobManagementConsumer)
      .useValue({})
      .overrideProvider(CvmManagementConsumer)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();

    const defaultExceptionFilter = app.get(DefaultExceptionFilter);
    const httpExceptionFilter = app.get(HttpExceptionFilter);
    const apiExceptionFilter = app.get(ApiExceptionFilter);
    const validationPipe = app.get(ValidationPipe);

    app.useGlobalFilters(
      defaultExceptionFilter,
      httpExceptionFilter,
      apiExceptionFilter,
    );
    app.useGlobalPipes(validationPipe);

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });

    await app.init();

    mongoConnection = app.get(getConnectionToken());
    cacheConnection = app.get<Cache>(CACHE_MANAGER);
    redisConnection = new Redis(globalThis.__REDIS_URI__ as string);
  }, 60000);

  it('get', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .get('/api/v1/pow')
      .expect(200)
      .expect((res) => {
        if (!res.headers['x-pow']) {
          throw new Error('"X-PoW" header is missing');
        }
      });
  });

  afterEach(async () => {
    await mongoConnection.db!.dropDatabase();
    await cacheConnection.clear();
    await redisConnection.flushall();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (redisConnection) await redisConnection.quit();
  });
});
