import { Test, TestingModule } from '@nestjs/testing';
import { MatchingController } from './matching.controller';

describe('MatchingController', () => {
  let controller: MatchingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
    }).compile();

    controller = module.get<MatchingController>(MatchingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
