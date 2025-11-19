import { default as request } from 'supertest';
import { Test } from '@nestjs/testing';
import {
  MongoDBContainer,
  StartedMongoDBContainer,
} from '@testcontainers/mongodb';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
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
  let mongoContainer: StartedMongoDBContainer;
  let redisContainer: StartedRedisContainer;

  beforeAll(async () => {
    const [mongo, redis] = await Promise.all([
      new MongoDBContainer('mongo:8').start(),
      new RedisContainer('redis:8').start(),
    ]);

    mongoContainer = mongo;
    redisContainer = redis;

    process.env.MONGO_URI = mongoContainer.getConnectionString();
    process.env.REDIS_URI = redisContainer.getConnectionUrl();

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
  }, 100000);

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
  }, 100000);

  afterAll(async () => {
    if (app) await app.close();
    if (mongoContainer) await mongoContainer.stop();
    if (redisContainer) await redisContainer.stop();
  });
});
