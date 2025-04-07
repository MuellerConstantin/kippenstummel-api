import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getInfo', () => {
    it('Should succeed', () => {
      const appController = app.get(AppController);
      expect(appController.getInfo()).toHaveProperty('version');
    });
  });
});
